package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"gastroshop-api/internal/models"
	"gastroshop-api/internal/services"

	"github.com/gin-gonic/gin"
)

// Mock services for testing
type mockAuthService struct {
	registerFunc         func(email, password string) (*models.User, error)
	loginFunc            func(email, password string) (*models.User, string, string, error)
	validateTokenFunc    func(string) (int, error)
	getUserByIDFunc      func(int) (*models.User, error)
	getAllUsersFunc      func() ([]models.User, error)
	updateUserRoleFunc   func(int, string) error
	updateUserBlockedFunc func(int, bool) error
}

func (m *mockAuthService) Register(email, password string) (*models.User, error) {
	if m.registerFunc != nil {
		return m.registerFunc(email, password)
	}
	return &models.User{ID: 1, Email: email, Role: "customer"}, nil
}

func (m *mockAuthService) Login(email, password string) (*models.User, string, string, error) {
	if m.loginFunc != nil {
		return m.loginFunc(email, password)
	}
	return &models.User{ID: 1, Email: email}, "access-token", "refresh-token", nil
}

func (m *mockAuthService) ValidateToken(token string) (int, error) {
	if m.validateTokenFunc != nil {
		return m.validateTokenFunc(token)
	}
	return 1, nil
}

func (m *mockAuthService) GetUserByID(userID int) (*models.User, error) {
	if m.getUserByIDFunc != nil {
		return m.getUserByIDFunc(userID)
	}
	return &models.User{ID: userID, Email: "test@example.com", Role: "customer"}, nil
}

func (m *mockAuthService) GetAllUsers() ([]models.User, error) {
	if m.getAllUsersFunc != nil {
		return m.getAllUsersFunc()
	}
	return []models.User{}, nil
}

func (m *mockAuthService) UpdateUserRole(userID int, role string) error {
	if m.updateUserRoleFunc != nil {
		return m.updateUserRoleFunc(userID, role)
	}
	return nil
}

func (m *mockAuthService) UpdateUserBlocked(userID int, blocked bool) error {
	if m.updateUserBlockedFunc != nil {
		return m.updateUserBlockedFunc(userID, blocked)
	}
	return nil
}

type mockProductService struct {
	getProductsFunc func(map[string]interface{}) ([]models.Product, int, error)
	getProductBySlugFunc func(string) (*models.Product, error)
}

func (m *mockProductService) GetProducts(filters map[string]interface{}) ([]models.Product, int, error) {
	if m.getProductsFunc != nil {
		return m.getProductsFunc(filters)
	}
	return []models.Product{}, 0, nil
}

func (m *mockProductService) GetProductBySlug(slug string) (*models.Product, error) {
	if m.getProductBySlugFunc != nil {
		return m.getProductBySlugFunc(slug)
	}
	return &models.Product{ID: 1, Slug: slug, Title: "Test Product"}, nil
}

func setupTestRouter(h *Handlers) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	api := router.Group("/api")
	{
		api.GET("/products", h.GetProducts)
		api.GET("/products/:slug", h.GetProduct)
		api.GET("/regions", h.GetRegions)
		api.GET("/regions/:code/products", h.GetRegionProducts)
		api.POST("/recommend", h.GetRecommendations)
		api.POST("/events", h.TrackEvent)
		api.POST("/ai/chat", h.AIChat)
		
		auth := api.Group("/auth")
		{
			auth.POST("/register", h.Register)
			auth.POST("/login", h.Login)
			auth.POST("/refresh", h.RefreshToken)
		}
		
		protected := api.Group("/")
		protected.Use(func(c *gin.Context) {
			c.Set("user_id", 1)
			c.Next()
		})
		{
			protected.GET("/auth/me", h.GetMe)
			protected.GET("/orders", h.GetUserOrders)
			protected.POST("/orders", h.CreateOrder)
		}
	}
	
	return router
}

func TestHandlers_Health(t *testing.T) {
	h := &Handlers{}
	router := gin.New()
	router.GET("/health", h.Health)

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestHandlers_Register(t *testing.T) {
	mockAuth := &mockAuthService{}
	mockProduct := &mockProductService{}
	
	h := &Handlers{
		AuthService:    mockAuth,
		ProductService: mockProduct,
	}
	router := setupTestRouter(h)

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

func TestHandlers_Login(t *testing.T) {
	mockAuth := &mockAuthService{}
	mockProduct := &mockProductService{}
	
	h := &Handlers{
		AuthService:    mockAuth,
		ProductService: mockProduct,
	}
	router := setupTestRouter(h)

	loginReq := models.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}
	jsonData, _ := json.Marshal(loginReq)

	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err == nil {
		if response["access_token"] == nil {
			t.Error("expected access_token in response")
		}
	}
}

func TestHandlers_GetProducts(t *testing.T) {
	mockAuth := &mockAuthService{}
	mockProduct := &mockProductService{
		getProductsFunc: func(filters map[string]interface{}) ([]models.Product, int, error) {
			return []models.Product{
				{ID: 1, Title: "Product 1"},
				{ID: 2, Title: "Product 2"},
			}, 2, nil
		},
	}
	
	h := &Handlers{
		AuthService:    mockAuth,
		ProductService: mockProduct,
	}
	router := setupTestRouter(h)

	req, _ := http.NewRequest("GET", "/api/products", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}
}

func TestHandlers_GetProduct(t *testing.T) {
	mockAuth := &mockAuthService{}
	mockProduct := &mockProductService{
		getProductBySlugFunc: func(slug string) (*models.Product, error) {
			return &models.Product{ID: 1, Slug: slug, Title: "Test Product"}, nil
		},
	}
	
	h := &Handlers{
		AuthService:    mockAuth,
		ProductService: mockProduct,
	}
	router := setupTestRouter(h)

	req, _ := http.NewRequest("GET", "/api/products/test-product", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}
}

func TestHandlers_GetMe(t *testing.T) {
	mockAuth := &mockAuthService{
		getUserByIDFunc: func(userID int) (*models.User, error) {
			return &models.User{ID: userID, Email: "test@example.com", Role: "customer"}, nil
		},
	}
	mockProduct := &mockProductService{}
	
	h := &Handlers{
		AuthService:    mockAuth,
		ProductService: mockProduct,
	}
	router := setupTestRouter(h)

	req, _ := http.NewRequest("GET", "/api/auth/me", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}
}

