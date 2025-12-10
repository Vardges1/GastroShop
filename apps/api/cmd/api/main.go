package main

import (
	"log"
	"os"

	"gastroshop-api/internal/config"
	"gastroshop-api/internal/database"
	"gastroshop-api/internal/handlers"
	"gastroshop-api/internal/middleware"
	"gastroshop-api/internal/repository"
	"gastroshop-api/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations (skip if SKIP_MIGRATIONS is set)
	if os.Getenv("SKIP_MIGRATIONS") != "true" {
		if err := database.Migrate(cfg.DatabaseURL); err != nil {
			log.Fatal("Failed to run migrations:", err)
		}
	} else {
		log.Println("Migrations skipped (SKIP_MIGRATIONS=true)")
	}

	// Initialize repositories
	productRepo := repository.NewProductRepository(db)
	userRepo := repository.NewUserRepository(db)
	tokenRepo := repository.NewTokenRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	paymentRepo := repository.NewPaymentRepository(db)
	regionRepo := repository.NewRegionRepository(db)
	eventRepo := repository.NewEventRepository(db)

	// Initialize services
	authService := services.NewAuthService(userRepo, tokenRepo, cfg.JWTSecret)
	productService := services.NewProductService(productRepo)
	orderService := services.NewOrderService(orderRepo, productRepo)
	regionService := services.NewRegionService(regionRepo, productRepo)
	recommendationService := services.NewRecommendationService(productRepo)
	paymentService := services.NewPaymentService(cfg, paymentRepo, orderRepo)
	eventService := services.NewEventService(eventRepo)
	aiService := services.NewAIService(cfg, productRepo)

	// Initialize handlers
	apiHandlers := handlers.NewHandlers(
		authService,
		productService,
		orderService,
		regionService,
		recommendationService,
		paymentService,
		eventService,
		aiService,
	)

	// Setup router
	router := setupRouter(apiHandlers, cfg)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func setupRouter(h *handlers.Handlers, cfg *config.Config) *gin.Engine {
	router := gin.Default()

	// CORS configuration
	origin := cfg.CORSOrigin
	if origin == "" {
		origin = "http://localhost:3000"
	}
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{origin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Prometheus middleware (снимает метрики со всех HTTP-запросов)
	router.Use(handlers.MetricsMiddleware())

	// Prometheus metrics
	router.GET("/metrics", h.Metrics)

	// Health check
	router.GET("/health", h.Health)

	// API routes
	api := router.Group("/api")
	{
		// Public routes
		api.GET("/products", h.GetProducts)
		api.GET("/products/:slug", h.GetProduct)
		api.GET("/regions", h.GetRegions)
		api.GET("/regions/:code/products", h.GetRegionProducts)
		api.POST("/recommend", h.GetRecommendations)
		api.POST("/events", h.TrackEvent)
		api.POST("/ai/chat", h.AIChat)

		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", h.Register)
			auth.POST("/login", h.Login)
			auth.POST("/refresh", h.RefreshToken)
			auth.POST("/logout", h.Logout)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(h.AuthService))
		{
			protected.GET("/auth/me", h.GetMe)
			protected.GET("/cart", h.GetCart)
			protected.POST("/cart", h.AddToCart)
			protected.DELETE("/cart/:productId", h.RemoveFromCart)
			protected.GET("/orders", h.GetUserOrders)
			protected.POST("/orders", h.CreateOrder)
		}

		// Admin routes
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(h.AuthService))
		admin.Use(middleware.AdminMiddleware())
		{
			admin.GET("/products", h.AdminGetProducts)
			admin.GET("/products/:id", h.AdminGetProduct)
			admin.POST("/products", h.AdminCreateProduct)
			admin.PUT("/products/:id", h.AdminUpdateProduct)
			admin.PATCH("/products/:id/quantity", h.AdminUpdateProductQuantity)
			admin.DELETE("/products/:id", h.AdminDeleteProduct)
			admin.GET("/orders", h.AdminGetOrders)
			admin.PATCH("/orders/:id/status", h.AdminUpdateOrderStatus)
			admin.GET("/users", h.AdminGetUsers)
			admin.PATCH("/users/:id/role", h.AdminUpdateUserRole)
			admin.PATCH("/users/:id/blocked", h.AdminUpdateUserBlocked)
			admin.GET("/statistics", h.AdminGetStatistics)
		}

		// Payment routes
		payments := api.Group("/payments")
		{
			payments.POST("/create", middleware.AuthMiddleware(h.AuthService), h.CreatePayment)
			payments.POST("/webhook", h.PaymentWebhook)
			payments.GET("/status/:payment_id", h.GetPaymentStatus)
			payments.POST("/mock/complete", h.MockCompletePayment)
		}

		// Webhook routes (separate from payments for better organization)
		webhooks := api.Group("/webhooks")
		{
			webhooks.POST("/yookassa", h.YooKassaWebhook)
		}
	}

	return router
}
