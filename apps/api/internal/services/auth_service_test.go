package services

import (
	"errors"
	"testing"
	"time"

	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

// RefreshToken type for testing (matches repository.RefreshToken)
type refreshToken struct {
	ID        int
	UserID    int
	Token     string
	ExpiresAt time.Time
	CreatedAt time.Time
	RevokedAt *time.Time
}

// Mock implementations for testing
type mockUserRepository struct {
	users       map[string]*models.User
	usersByID   map[int]*models.User
	allUsers    []models.User
	createError error
	getError    error
	updateError error
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users:     make(map[string]*models.User),
		usersByID: make(map[int]*models.User),
		allUsers:  []models.User{},
	}
}

func (m *mockUserRepository) CreateUser(user *models.User) error {
	if m.createError != nil {
		return m.createError
	}
	user.ID = len(m.users) + 1
	user.CreatedAt = time.Now()
	m.users[user.Email] = user
	m.usersByID[user.ID] = user
	return nil
}

func (m *mockUserRepository) GetUserByEmail(email string) (*models.User, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.users[email], nil
}

func (m *mockUserRepository) GetUserByID(id int) (*models.User, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.usersByID[id], nil
}

func (m *mockUserRepository) GetAllUsers() ([]models.User, error) {
	return m.allUsers, nil
}

func (m *mockUserRepository) UpdateUserRole(id int, role string) error {
	if m.updateError != nil {
		return m.updateError
	}
	if user, ok := m.usersByID[id]; ok {
		user.Role = role
	}
	return nil
}

func (m *mockUserRepository) UpdateUserBlocked(id int, blocked bool) error {
	if m.updateError != nil {
		return m.updateError
	}
	if user, ok := m.usersByID[id]; ok {
		user.Blocked = blocked
	}
	return nil
}

type mockTokenRepository struct {
	tokens      map[string]*repository.RefreshToken
	createError error
	getError    error
	revokeError error
}

func newMockTokenRepository() *mockTokenRepository {
	return &mockTokenRepository{
		tokens: make(map[string]*repository.RefreshToken),
	}
}

func (m *mockTokenRepository) CreateRefreshToken(userID int, token string, expiresAt time.Time) error {
	if m.createError != nil {
		return m.createError
	}
	m.tokens[token] = &repository.RefreshToken{
		UserID:    userID,
		Token:     token,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	}
	return nil
}

func (m *mockTokenRepository) GetRefreshToken(token string) (*repository.RefreshToken, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.tokens[token], nil
}

func (m *mockTokenRepository) RevokeRefreshToken(token string) error {
	if m.revokeError != nil {
		return m.revokeError
	}
	if t, ok := m.tokens[token]; ok {
		now := time.Now()
		t.RevokedAt = &now
	}
	return nil
}

func (m *mockTokenRepository) RevokeAllUserTokens(userID int) error {
	for _, token := range m.tokens {
		if token.UserID == userID {
			now := time.Now()
			token.RevokedAt = &now
		}
	}
	return nil
}

func TestAuthService_Register(t *testing.T) {
	tests := []struct {
		name          string
		email         string
		password      string
		existingUser  *models.User
		expectedError string
	}{
		{
			name:          "successful registration",
			email:         "test@example.com",
			password:       "password123",
			existingUser:  nil,
			expectedError: "",
		},
		{
			name:          "duplicate email",
			email:         "existing@example.com",
			password:       "password123",
			existingUser:  &models.User{Email: "existing@example.com"},
			expectedError: "user with this email already exists",
		},
		{
			name:          "invalid email format",
			email:         "invalid-email",
			password:       "password123",
			expectedError: "invalid email format",
		},
		{
			name:          "password too short",
			email:         "test@example.com",
			password:       "short",
			expectedError: "password must be at least 8 characters long",
		},
		{
			name:          "password without letter",
			email:         "test@example.com",
			password:       "12345678",
			expectedError: "password must contain at least one letter",
		},
		{
			name:          "password without number",
			email:         "test@example.com",
			password:       "password",
			expectedError: "password must contain at least one number",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := newMockUserRepository()
			if tt.existingUser != nil {
				userRepo.users[tt.existingUser.Email] = tt.existingUser
			}

			tokenRepo := newMockTokenRepository()
			authService := NewAuthService(userRepo, tokenRepo, "test-secret")

			user, err := authService.Register(tt.email, tt.password)

			if tt.expectedError != "" {
				if err == nil {
					t.Errorf("expected error %q, got nil", tt.expectedError)
					return
				}
				if err.Error() != tt.expectedError {
					t.Errorf("expected error %q, got %q", tt.expectedError, err.Error())
				}
				if user != nil {
					t.Errorf("expected nil user, got %+v", user)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
					return
				}
				if user == nil {
					t.Error("expected user, got nil")
					return
				}
				if user.Email != tt.email {
					t.Errorf("expected email %q, got %q", tt.email, user.Email)
				}
				if user.PasswordHash == "" {
					t.Error("expected password hash, got empty string")
				}
				if user.Role != "customer" {
					t.Errorf("expected role 'customer', got %q", user.Role)
				}
			}
		})
	}
}

func TestAuthService_Login(t *testing.T) {
	userRepo := newMockUserRepository()
	tokenRepo := newMockTokenRepository()
	authService := NewAuthService(userRepo, tokenRepo, "test-secret")

	// Create a user first
	password := "password123"
	user, err := authService.Register("test@example.com", password)
	if err != nil {
		t.Fatalf("failed to register user: %v", err)
	}

	tests := []struct {
		name          string
		email         string
		password      string
		expectedError string
	}{
		{
			name:          "successful login",
			email:         "test@example.com",
			password:       password,
			expectedError:  "",
		},
		{
			name:          "invalid email",
			email:         "wrong@example.com",
			password:       password,
			expectedError:  "invalid credentials",
		},
		{
			name:          "invalid password",
			email:         "test@example.com",
			password:       "wrongpassword",
			expectedError:  "invalid credentials",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			returnedUser, accessToken, refreshToken, err := authService.Login(tt.email, tt.password)

			if tt.expectedError != "" {
				if err == nil {
					t.Errorf("expected error %q, got nil", tt.expectedError)
					return
				}
				if err.Error() != tt.expectedError {
					t.Errorf("expected error %q, got %q", tt.expectedError, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
					return
				}
				if returnedUser == nil {
					t.Error("expected user, got nil")
					return
				}
				if accessToken == "" {
					t.Error("expected access token, got empty string")
				}
				if refreshToken == "" {
					t.Error("expected refresh token, got empty string")
				}
				if returnedUser.ID != user.ID {
					t.Errorf("expected user ID %d, got %d", user.ID, returnedUser.ID)
				}
			}
		})
	}
}

func TestAuthService_ValidateToken(t *testing.T) {
	userRepo := newMockUserRepository()
	tokenRepo := newMockTokenRepository()
	authService := NewAuthService(userRepo, tokenRepo, "test-secret")

	// Create a user and generate token
	user, err := authService.Register("test@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to register user: %v", err)
	}

	accessToken, err := authService.GenerateAccessToken(user.ID)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	// Test valid token
	userID, err := authService.ValidateToken(accessToken)
	if err != nil {
		t.Errorf("unexpected error validating token: %v", err)
	}
	if userID != user.ID {
		t.Errorf("expected user ID %d, got %d", user.ID, userID)
	}

	// Test invalid token
	_, err = authService.ValidateToken("invalid-token")
	if err == nil {
		t.Error("expected error for invalid token, got nil")
	}

	// Test empty token
	_, err = authService.ValidateToken("")
	if err == nil {
		t.Error("expected error for empty token, got nil")
	}
}

func TestAuthService_UpdateUserRole(t *testing.T) {
	userRepo := newMockUserRepository()
	tokenRepo := newMockTokenRepository()
	authService := NewAuthService(userRepo, tokenRepo, "test-secret")

	user, err := authService.Register("test@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to register user: %v", err)
	}

	tests := []struct {
		name          string
		userID        int
		role          string
		expectedError string
	}{
		{
			name:          "valid role update",
			userID:        user.ID,
			role:          "admin",
			expectedError: "",
		},
		{
			name:          "invalid role",
			userID:        user.ID,
			role:          "invalid",
			expectedError: "invalid role",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := authService.UpdateUserRole(tt.userID, tt.role)

			if tt.expectedError != "" {
				if err == nil {
					t.Errorf("expected error %q, got nil", tt.expectedError)
					return
				}
				if err.Error() != tt.expectedError {
					t.Errorf("expected error %q, got %q", tt.expectedError, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

