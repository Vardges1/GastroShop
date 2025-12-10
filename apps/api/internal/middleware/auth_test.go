package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"gastroshop-api/internal/models"

	"github.com/gin-gonic/gin"
)

type mockAuthService struct {
	validateTokenFunc func(string) (int, error)
	getUserByIDFunc   func(int) (*models.User, error)
}

func (m *mockAuthService) ValidateToken(token string) (int, error) {
	if m.validateTokenFunc != nil {
		return m.validateTokenFunc(token)
	}
	return 0, nil
}

func (m *mockAuthService) GetUserByID(userID int) (*models.User, error) {
	if m.getUserByIDFunc != nil {
		return m.getUserByIDFunc(userID)
	}
	return &models.User{ID: userID, Role: "customer", Blocked: false}, nil
}

func TestAuthMiddleware_NoHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	mockAuth := &mockAuthService{}
	router.Use(AuthMiddleware(mockAuth))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestAuthMiddleware_InvalidFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	mockAuth := &mockAuthService{}
	router.Use(AuthMiddleware(mockAuth))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "InvalidFormat token")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	mockAuth := &mockAuthService{
		validateTokenFunc: func(token string) (int, error) {
			return 0, errors.New("invalid token")
		},
	}
	router.Use(AuthMiddleware(mockAuth))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	userID := 1
	mockAuth := &mockAuthService{
		validateTokenFunc: func(token string) (int, error) {
			return userID, nil
		},
		getUserByIDFunc: func(id int) (*models.User, error) {
			return &models.User{ID: id, Role: "customer", Blocked: false}, nil
		},
	}
	
	router.Use(AuthMiddleware(mockAuth))
	router.GET("/test", func(c *gin.Context) {
		uid, exists := c.Get("user_id")
		if !exists {
			c.JSON(500, gin.H{"error": "user_id not set"})
			return
		}
		c.JSON(200, gin.H{"user_id": uid})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}
}

func TestAuthMiddleware_BlockedUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	userID := 1
	mockAuth := &mockAuthService{
		validateTokenFunc: func(token string) (int, error) {
			return userID, nil
		},
		getUserByIDFunc: func(id int) (*models.User, error) {
			return &models.User{ID: id, Role: "customer", Blocked: true}, nil
		},
	}
	
	router.Use(AuthMiddleware(mockAuth))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

func TestAdminMiddleware_NoRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(AdminMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

func TestAdminMiddleware_CustomerRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_role", "customer")
		c.Next()
	})
	router.Use(AdminMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

func TestAdminMiddleware_AdminRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_role", "admin")
		c.Next()
	})
	router.Use(AdminMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

