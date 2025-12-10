package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"gastroshop-api/internal/models"
	"gastroshop-api/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name: "http_request_duration_seconds",
			Help: "Duration of HTTP requests in seconds",
			// Можно настроить buckets при необходимости
			// Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)
)

type Handlers struct {
	AuthService           *services.AuthService
	ProductService        *services.ProductService
	OrderService          *services.OrderService
	RegionService         *services.RegionService
	RecommendationService *services.RecommendationService
	PaymentService        *services.PaymentService
	EventService          *services.EventService
	AIService             *services.AIService
}

func NewHandlers(
	authService *services.AuthService,
	productService *services.ProductService,
	orderService *services.OrderService,
	regionService *services.RegionService,
	recommendationService *services.RecommendationService,
	paymentService *services.PaymentService,
	eventService *services.EventService,
	aiService *services.AIService,
) *Handlers {
	return &Handlers{
		AuthService:           authService,
		ProductService:        productService,
		OrderService:          orderService,
		RegionService:         regionService,
		RecommendationService: recommendationService,
		PaymentService:        paymentService,
		EventService:          eventService,
		AIService:             aiService,
	}
}

func (h *Handlers) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Корректный Prometheus endpoint
func (h *Handlers) Metrics(c *gin.Context) {
	promhttp.Handler().ServeHTTP(c.Writer, c.Request)
}

// Middleware метрик: считает количество и длительность запросов
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		method := c.Request.Method
		endpoint := c.FullPath()
		if endpoint == "" {
			endpoint = c.Request.URL.Path
		}
		status := strconv.Itoa(c.Writer.Status())

		httpRequestsTotal.WithLabelValues(method, endpoint, status).Inc()
		httpRequestDuration.WithLabelValues(method, endpoint).
			Observe(time.Since(start).Seconds())
	}
}

// -------------------- Product handlers --------------------

func (h *Handlers) GetProducts(c *gin.Context) {
	// Parse query parameters
	filters := make(map[string]interface{})

	if query := c.Query("query"); query != "" {
		filters["query"] = query
	}
	if tags := c.QueryArray("tag"); len(tags) > 0 {
		filters["tags"] = tags
	}
	if categories := c.QueryArray("category"); len(categories) > 0 {
		filters["categories"] = categories
	}
	if region := c.Query("region"); region != "" {
		filters["region"] = region
	}
	if priceMin := c.Query("priceMin"); priceMin != "" {
		if val, err := strconv.Atoi(priceMin); err == nil {
			filters["price_min"] = val * 100 // to cents
		}
	}
	if priceMax := c.Query("priceMax"); priceMax != "" {
		if val, err := strconv.Atoi(priceMax); err == nil {
			filters["price_max"] = val * 100 // to cents
		}
	}
	if inStock := c.Query("inStock"); inStock != "" {
		if val, err := strconv.ParseBool(inStock); err == nil {
			filters["in_stock"] = val
		}
	}

	page := 1
	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	filters["page"] = page

	pageSize := 20
	if ps := c.Query("limit"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}
	filters["page_size"] = pageSize

	products, total, err := h.ProductService.GetProducts(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get products"})
		return
	}

	response := models.PaginatedResponse{
		Items:    products,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handlers) GetProduct(c *gin.Context) {
	slug := c.Param("slug")

	product, err := h.ProductService.GetProductBySlug(slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get product"})
		return
	}
	if product == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Product not found"})
		return
	}

	c.JSON(http.StatusOK, product)
}

// -------------------- Region handlers --------------------

func (h *Handlers) GetRegions(c *gin.Context) {
	regions, err := h.RegionService.GetRegions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get regions"})
		return
	}
	c.JSON(http.StatusOK, regions)
}

func (h *Handlers) GetRegionProducts(c *gin.Context) {
	code := c.Param("code")

	products, err := h.RegionService.GetRegionProducts(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get region products"})
		return
	}
	c.JSON(http.StatusOK, products)
}

// -------------------- Auth handlers --------------------

func (h *Handlers) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	user, err := h.AuthService.Register(req.Email, req.Password)
	if err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "invalid credentials" {
			statusCode = http.StatusUnauthorized
		}
		c.JSON(statusCode, models.ErrorResponse{Error: err.Error()})
		return
	}

	// Generate tokens after registration
	accessToken, err := h.AuthService.GenerateAccessToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to generate tokens"})
		return
	}

	refreshToken, expiresAt, err := h.AuthService.GenerateRefreshToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to generate tokens"})
		return
	}

	// Store refresh token in database
	if err := h.AuthService.GetTokenRepo().CreateRefreshToken(user.ID, refreshToken, expiresAt); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to store refresh token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

func (h *Handlers) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	user, accessToken, refreshToken, err := h.AuthService.Login(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

func (h *Handlers) RefreshToken(c *gin.Context) {
	var req models.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	accessToken, refreshToken, err := h.AuthService.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

func (h *Handlers) GetMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "User not authenticated"})
		return
	}

	userIDInt := userID.(int)
	user, err := h.AuthService.GetUserByID(userIDInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get user"})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *Handlers) Logout(c *gin.Context) {
	var req models.LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// If no body provided, try to get refresh token from header
		refreshToken := c.GetHeader("X-Refresh-Token")
		if refreshToken == "" {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Refresh token required"})
			return
		}
		req.RefreshToken = refreshToken
	}

	if err := h.AuthService.Logout(req.RefreshToken); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to logout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// -------------------- Recommendations --------------------

func (h *Handlers) GetRecommendations(c *gin.Context) {
	var req models.RecommendationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	products, err := h.RecommendationService.GetRecommendations(req.Query, req.Tags)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get recommendations"})
		return
	}

	c.JSON(http.StatusOK, products)
}

// -------------------- Cart (упрощённо) --------------------

func (h *Handlers) GetCart(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"items": []interface{}{}})
}

func (h *Handlers) AddToCart(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Item added to cart"})
}

func (h *Handlers) RemoveFromCart(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Item removed from cart"})
}

// -------------------- Orders --------------------

func (h *Handlers) GetUserOrders(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "User not authenticated"})
		return
	}

	userIDInt := userID.(int)
	orders, err := h.OrderService.GetOrdersByUserID(userIDInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get orders"})
		return
	}
	// Ensure orders is always an array, not nil
	if orders == nil {
		orders = []models.Order{}
	}
	c.JSON(http.StatusOK, orders)
}

func (h *Handlers) CreateOrder(c *gin.Context) {
	var req models.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "User not authenticated"})
		return
	}

	userIDInt := userID.(int)
	order, err := h.OrderService.CreateOrder(&userIDInt, req.Items, req.ShippingAddress)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, order)
}

// -------------------- Payments --------------------

func (h *Handlers) CreatePayment(c *gin.Context) {
	var req models.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request: " + err.Error()})
		return
	}

	if req.OrderID <= 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Order ID is required"})
		return
	}

	order, err := h.OrderService.GetOrderByID(req.OrderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get order: " + err.Error()})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Order not found"})
		return
	}

	payment, err := h.PaymentService.CreatePayment(order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create payment: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"payment_id":   payment.PaymentID,
		"payment_url":  payment.PaymentURL,
	})
}

func (h *Handlers) PaymentWebhook(c *gin.Context) {
	payload, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid payload"})
		return
	}

	signature := c.GetHeader("X-Signature")
	if signature == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Missing signature"})
		return
	}

	// Log webhook for debugging
	log.Printf("Received webhook: %s", string(payload))

	webhookData, err := h.PaymentService.ProcessWebhook(payload, signature)
	if err != nil {
		log.Printf("Webhook processing failed: %v", err)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	log.Printf("Webhook processed successfully: %+v", webhookData)
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *Handlers) GetPaymentStatus(c *gin.Context) {
	paymentID := c.Param("payment_id")
	if paymentID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Payment ID is required"})
		return
	}

	status, err := h.PaymentService.GetPaymentStatus(paymentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get payment status"})
		return
	}

	c.JSON(http.StatusOK, status)
}

func (h *Handlers) YooKassaWebhook(c *gin.Context) {
	payload, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid payload"})
		return
	}

	// Get signature from header
	signature := c.GetHeader("X-Signature")
	if signature == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Missing signature"})
		return
	}

	// Process webhook
	webhookData, err := h.PaymentService.ProcessWebhook(payload, signature)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid webhook"})
		return
	}

	// Update order status based on payment status
	switch webhookData.Status {
	case "succeeded":
		err := h.OrderService.UpdateOrderStatus(webhookData.OrderID, "paid")
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update order status"})
			return
		}
		// Decrease product quantities when payment succeeds
		if err := h.OrderService.DecreaseProductQuantities(webhookData.OrderID); err != nil {
			log.Printf("Failed to decrease product quantities: %v", err)
			// Don't fail the webhook, just log the error
		}
	case "canceled":
		err := h.OrderService.UpdateOrderStatus(webhookData.OrderID, "canceled")
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update order status"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Webhook processed successfully"})
}

// -------------------- Events --------------------

func (h *Handlers) TrackEvent(c *gin.Context) {
	var req struct {
		Type    string                 `json:"type" binding:"required"`
		Payload map[string]interface{} `json:"payload"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	var userID *int
	if uid, exists := c.Get("user_id"); exists {
		uidInt := uid.(int)
		userID = &uidInt
	}

	if err := h.EventService.TrackEvent(userID, req.Type, req.Payload); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to track event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event tracked"})
}

// -------------------- AI Assistant --------------------

func (h *Handlers) AIChat(c *gin.Context) {
	var req struct {
		Message             string                 `json:"message" binding:"required"`
		ConversationHistory []services.ChatMessage `json:"conversation_history,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	conversationHistory := req.ConversationHistory
	if conversationHistory == nil {
		conversationHistory = []services.ChatMessage{}
	}

	response, err := h.AIService.ChatWithAI(req.Message, conversationHistory)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to process AI request"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// -------------------- Admin handlers --------------------

func (h *Handlers) AdminGetProducts(c *gin.Context) {
	// Parse query parameters
	filters := make(map[string]interface{})

	if query := c.Query("query"); query != "" {
		filters["query"] = query
	}

	page := 1
	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	filters["page"] = page

	pageSize := 50
	if ps := c.Query("limit"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}
	filters["page_size"] = pageSize

	products, total, err := h.ProductService.GetProducts(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get products"})
		return
	}

	response := models.PaginatedResponse{
		Items:    products,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handlers) AdminGetProduct(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid product ID"})
		return
	}

	product, err := h.ProductService.GetProductByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get product"})
		return
	}
	if product == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Product not found"})
		return
	}

	c.JSON(http.StatusOK, product)
}

func (h *Handlers) AdminCreateProduct(c *gin.Context) {
	var req models.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	// Check if slug already exists
	existing, _ := h.ProductService.GetProductBySlug(req.Slug)
	if existing != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Product with this slug already exists"})
		return
	}

	product := &models.Product{
		Slug:        req.Slug,
		Title:       req.Title,
		Description: req.Description,
		PriceCents:  req.PriceCents,
		Currency:    req.Currency,
		Tags:        req.Tags,
		RegionCode:  req.RegionCode,
		Images:      req.Images,
		Quantity:    req.Quantity,
		InStock:     req.Quantity > 0,
	}

	if product.Currency == "" {
		product.Currency = "RUB"
	}

	if err := h.ProductService.CreateProduct(product); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, product)
}

func (h *Handlers) AdminUpdateProduct(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid product ID"})
		return
	}

	var req models.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	// Get existing product
	existing, err := h.ProductService.GetProductByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get product"})
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Product not found"})
		return
	}

	// Update fields
	if req.Title != nil {
		existing.Title = *req.Title
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.PriceCents != nil {
		existing.PriceCents = *req.PriceCents
	}
	if req.Currency != nil {
		existing.Currency = *req.Currency
	}
	if req.Tags != nil {
		existing.Tags = req.Tags
	}
	if req.RegionCode != nil {
		existing.RegionCode = *req.RegionCode
	}
	if req.Images != nil {
		existing.Images = req.Images
	}
	if req.InStock != nil {
		existing.InStock = *req.InStock
	}
	if req.Quantity != nil {
		existing.Quantity = *req.Quantity
		existing.InStock = existing.Quantity > 0
	}

	if err := h.ProductService.UpdateProduct(id, existing); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update product"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

func (h *Handlers) AdminUpdateProductQuantity(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid product ID"})
		return
	}

	var req models.UpdateProductQuantityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request: " + err.Error()})
		return
	}

	fmt.Printf("DEBUG: AdminUpdateProductQuantity - id: %d, quantity: %d\n", id, req.Quantity)

	// Check if product exists
	existing, err := h.ProductService.GetProductByID(id)
	if err != nil {
		fmt.Printf("DEBUG: AdminUpdateProductQuantity - error checking product: %v\n", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to check product: " + err.Error()})
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Product not found"})
		return
	}

	// Update quantity
	if err := h.ProductService.UpdateProductQuantity(id, req.Quantity); err != nil {
		fmt.Printf("DEBUG: AdminUpdateProductQuantity error: %v\n", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update product quantity: " + err.Error()})
		return
	}

	// Get updated product
	product, err := h.ProductService.GetProductByID(id)
	if err != nil {
		fmt.Printf("DEBUG: AdminUpdateProductQuantity - failed to get updated product: %v\n", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get updated product: " + err.Error()})
		return
	}

	fmt.Printf("DEBUG: AdminUpdateProductQuantity - success, product quantity: %d\n", product.Quantity)
	c.JSON(http.StatusOK, product)
}

func (h *Handlers) AdminDeleteProduct(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid product ID"})
		return
	}

	fmt.Printf("DEBUG: AdminDeleteProduct - id: %d\n", id)

	// Check if product exists before deletion
	existing, err := h.ProductService.GetProductByID(id)
	if err != nil {
		fmt.Printf("DEBUG: AdminDeleteProduct - error checking product: %v\n", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to check product: " + err.Error()})
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Product not found"})
		return
	}

	// Delete the product
	if err := h.ProductService.DeleteProduct(id); err != nil {
		fmt.Printf("DEBUG: AdminDeleteProduct error: %v\n", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to delete product: " + err.Error()})
		return
	}

	fmt.Printf("DEBUG: AdminDeleteProduct - success\n")
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

func (h *Handlers) AdminGetOrders(c *gin.Context) {
	orders, err := h.OrderService.GetAllOrders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get orders"})
		return
	}
	// Ensure orders is always an array, not nil
	if orders == nil {
		orders = []models.Order{}
	}
	c.JSON(http.StatusOK, orders)
}

func (h *Handlers) AdminUpdateOrderStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid order ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	// Validate status
	validStatuses := []string{"pending", "paid", "shipped", "delivered", "canceled"}
	isValid := false
	for _, s := range validStatuses {
		if req.Status == s {
			isValid = true
			break
		}
	}
	if !isValid {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid status"})
		return
	}

	if err := h.OrderService.UpdateOrderStatus(id, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update order status"})
		return
	}

	order, err := h.OrderService.GetOrderByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get updated order"})
		return
	}

	c.JSON(http.StatusOK, order)
}

// -------------------- Admin User Management --------------------

func (h *Handlers) AdminGetUsers(c *gin.Context) {
	users, err := h.AuthService.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *Handlers) AdminUpdateUserRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid user ID"})
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	if err := h.AuthService.UpdateUserRole(id, req.Role); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	user, err := h.AuthService.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get updated user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *Handlers) AdminUpdateUserBlocked(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid user ID"})
		return
	}

	var req struct {
		Blocked bool `json:"blocked" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	if err := h.AuthService.UpdateUserBlocked(id, req.Blocked); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update user"})
		return
	}

	user, err := h.AuthService.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get updated user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// -------------------- Admin Statistics --------------------

func (h *Handlers) AdminGetStatistics(c *gin.Context) {
	// Get date range from query params
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Get all orders
	orders, err := h.OrderService.GetAllOrders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get orders"})
		return
	}

	// Filter orders by date if provided
	var filteredOrders []models.Order
	if startDate != "" && endDate != "" {
		start, _ := time.Parse("2006-01-02", startDate)
		end, _ := time.Parse("2006-01-02", endDate)
		end = end.Add(24 * time.Hour) // Include end date

		for _, order := range orders {
			if order.CreatedAt.After(start) && order.CreatedAt.Before(end) {
				filteredOrders = append(filteredOrders, order)
			}
		}
	} else {
		filteredOrders = orders
	}

	// Calculate statistics
	totalRevenue := 0
	orderCount := 0
	productSales := make(map[int]int) // product_id -> quantity sold

	for _, order := range filteredOrders {
		if order.Status == "paid" || order.Status == "shipped" || order.Status == "delivered" {
			totalRevenue += order.AmountCents
			orderCount++

			for _, item := range order.Items {
				productSales[item.ProductID] += item.Quantity
			}
		}
	}

	// Calculate average order value
	avgOrderValue := 0
	if orderCount > 0 {
		avgOrderValue = totalRevenue / orderCount
	}

	// Get top products
	type ProductSale struct {
		ProductID int
		Quantity  int
		Product   *models.Product
	}

	var topProducts []ProductSale
	for productID, quantity := range productSales {
		product, _ := h.ProductService.GetProductByID(productID)
		if product != nil {
			topProducts = append(topProducts, ProductSale{
				ProductID: productID,
				Quantity:  quantity,
				Product:   product,
			})
		}
	}

	// Sort by quantity
	for i := 0; i < len(topProducts)-1; i++ {
		for j := i + 1; j < len(topProducts); j++ {
			if topProducts[i].Quantity < topProducts[j].Quantity {
				topProducts[i], topProducts[j] = topProducts[j], topProducts[i]
			}
		}
	}

	// Get top 10
	if len(topProducts) > 10 {
		topProducts = topProducts[:10]
	}

	// Sales by day (last 30 days)
	salesByDay := make(map[string]int)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	for _, order := range filteredOrders {
		if order.Status == "paid" || order.Status == "shipped" || order.Status == "delivered" {
			if order.CreatedAt.After(thirtyDaysAgo) {
				dateKey := order.CreatedAt.Format("2006-01-02")
				salesByDay[dateKey] += order.AmountCents
			}
		}
	}

	// Convert to array for frontend
	var salesChartData []map[string]interface{}
	for date, amount := range salesByDay {
		salesChartData = append(salesChartData, map[string]interface{}{
			"date":   date,
			"amount": amount / 100,
		})
	}

	// Sort by date
	for i := 0; i < len(salesChartData)-1; i++ {
		for j := i + 1; j < len(salesChartData); j++ {
			if salesChartData[i]["date"].(string) > salesChartData[j]["date"].(string) {
				salesChartData[i], salesChartData[j] = salesChartData[j], salesChartData[i]
			}
		}
	}

	response := map[string]interface{}{
		"total_revenue":   totalRevenue / 100,
		"order_count":     orderCount,
		"avg_order_value": avgOrderValue / 100,
		"top_products":    topProducts,
		"sales_by_day":    salesChartData,
	}

	c.JSON(http.StatusOK, response)
}

// MockCompletePayment - завершает тестовый платеж (для mock провайдера)
func (h *Handlers) MockCompletePayment(c *gin.Context) {
	var req struct {
		PaymentID string `json:"payment_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	// Получаем платеж из базы через сервис
	payment, err := h.PaymentService.GetPaymentByID(req.PaymentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get payment"})
		return
	}
	if payment == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Payment not found"})
		return
	}

	// Получаем заказ
	order, err := h.OrderService.GetOrderByID(payment.OrderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get order"})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Order not found"})
		return
	}

	// Обновляем статус платежа
	if err := h.PaymentService.UpdatePaymentStatus(req.PaymentID, "paid"); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update payment status"})
		return
	}

	// Обновляем статус заказа
	if err := h.OrderService.UpdateOrderStatus(payment.OrderID, "paid"); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update order status"})
		return
	}

	// Уменьшаем количество товаров на складе
	if err := h.OrderService.DecreaseProductQuantities(payment.OrderID); err != nil {
		log.Printf("Warning: failed to decrease product quantities: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Payment completed successfully",
		"payment_id": req.PaymentID,
		"order_id":   payment.OrderID,
	})
}
