package test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"gastroshop-api/internal/config"
	"gastroshop-api/internal/database"
	"gastroshop-api/internal/handlers"
	"gastroshop-api/internal/middleware"
	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
	"gastroshop-api/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var testDB *sql.DB
var testHandlers *handlers.Handlers

func setupTestDB(t *testing.T) {
	// Use test database
	dbURL := "postgres://postgres:postgres@localhost:5432/gastroshop_test?sslmode=disable"
	
	db, err := database.Connect(dbURL)
	if err != nil {
		t.Skipf("Skipping integration test: database not available: %v", err)
		return
	}

	// Run migrations
	if err := database.Migrate(dbURL); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	testDB = db
}

func setupTestHandlers(t *testing.T) {
	if testDB == nil {
		setupTestDB(t)
	}

	// Initialize repositories
	productRepo := repository.NewProductRepository(testDB)
	userRepo := repository.NewUserRepository(testDB)
	tokenRepo := repository.NewTokenRepository(testDB)
	orderRepo := repository.NewOrderRepository(testDB)
	paymentRepo := repository.NewPaymentRepository(testDB)
	regionRepo := repository.NewRegionRepository(testDB)
	eventRepo := repository.NewEventRepository(testDB)

	// Initialize services
	cfg := &config.Config{
		JWTSecret: "test-secret-key-for-integration-tests",
	}
	authService := services.NewAuthService(userRepo, tokenRepo, cfg.JWTSecret)
	productService := services.NewProductService(productRepo)
	orderService := services.NewOrderService(orderRepo, productRepo)
	regionService := services.NewRegionService(regionRepo, productRepo)
	recommendationService := services.NewRecommendationService(productRepo)
	paymentService := services.NewPaymentService(cfg, paymentRepo, orderRepo)
	eventService := services.NewEventService(eventRepo)
	aiService := services.NewAIService(cfg, productRepo)

	// Initialize handlers
	testHandlers = handlers.NewHandlers(
		authService,
		productService,
		orderService,
		regionService,
		recommendationService,
		paymentService,
		eventService,
		aiService,
	)
}

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	router.GET("/health", testHandlers.Health)

	api := router.Group("/api")
	{
		api.GET("/products", testHandlers.GetProducts)
		api.GET("/products/:slug", testHandlers.GetProduct)
		
		auth := api.Group("/auth")
		{
			auth.POST("/register", testHandlers.Register)
			auth.POST("/login", testHandlers.Login)
			auth.POST("/refresh", testHandlers.RefreshToken)
		}

		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(testHandlers.AuthService))
		{
			protected.GET("/auth/me", testHandlers.GetMe)
		}
	}

	return router
}

func TestHealthEndpoint(t *testing.T) {
	setupTestHandlers(t)
	router := setupRouter()

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestRegisterEndpoint(t *testing.T) {
	setupTestHandlers(t)
	router := setupRouter()

	registerReq := models.RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
	}

	jsonData, _ := json.Marshal(registerReq)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated && w.Code != http.StatusOK {
		t.Errorf("expected status 201 or 200, got %d. Body: %s", w.Code, w.Body.String())
	}
}

func TestLoginEndpoint(t *testing.T) {
	setupTestHandlers(t)
	router := setupRouter()

	// First register a user
	registerReq := models.RegisterRequest{
		Email:    "login@example.com",
		Password: "password123",
	}
	jsonData, _ := json.Marshal(registerReq)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Now try to login
	loginReq := models.LoginRequest{
		Email:    "login@example.com",
		Password: "password123",
	}
	jsonData, _ = json.Marshal(loginReq)
	req, _ = http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if response["access_token"] == nil {
		t.Error("expected access_token in response")
	}
	if response["refresh_token"] == nil {
		t.Error("expected refresh_token in response")
	}
}

func TestGetProductsEndpoint(t *testing.T) {
	setupTestHandlers(t)
	router := setupRouter()

	req, _ := http.NewRequest("GET", "/api/products", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var response models.PaginatedResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if response.Items == nil {
		t.Error("expected items in response")
	}
}

func TestGetMeEndpoint_Unauthorized(t *testing.T) {
	setupTestHandlers(t)
	router := setupRouter()

	req, _ := http.NewRequest("GET", "/api/auth/me", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestGetMeEndpoint_Authorized(t *testing.T) {
	setupTestHandlers(t)
	router := setupRouter()

	// Register and login to get token
	registerReq := models.RegisterRequest{
		Email:    "me@example.com",
		Password: "password123",
	}
	jsonData, _ := json.Marshal(registerReq)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	loginReq := models.LoginRequest{
		Email:    "me@example.com",
		Password: "password123",
	}
	jsonData, _ = json.Marshal(loginReq)
	req, _ = http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var loginResponse map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &loginResponse)
	accessToken := loginResponse["access_token"].(string)

	// Now test /auth/me with token
	req, _ = http.NewRequest("GET", "/api/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}
}

