package services

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo   *repository.UserRepository
	tokenRepo  *repository.TokenRepository
	jwtSecret  string
}

func NewAuthService(userRepo *repository.UserRepository, tokenRepo *repository.TokenRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) Register(email, password string) (*models.User, error) {
	// Validate email
	if err := s.validateEmail(email); err != nil {
		return nil, err
	}

	// Validate password
	if err := s.validatePassword(password); err != nil {
		return nil, err
	}

	// Check if user already exists
	existingUser, err := s.userRepo.GetUserByEmail(email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("user with this email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		Role:         "customer",
	}

	if err := s.userRepo.CreateUser(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *AuthService) validateEmail(email string) error {
	email = strings.TrimSpace(email)
	if email == "" {
		return errors.New("email is required")
	}

	// Basic email regex validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return errors.New("invalid email format")
	}

	if len(email) > 255 {
		return errors.New("email is too long")
	}

	return nil
}

func (s *AuthService) validatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters long")
	}

	if len(password) > 72 {
		return errors.New("password is too long")
	}

	// Check for at least one letter and one number
	hasLetter := false
	hasNumber := false
	for _, char := range password {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') {
			hasLetter = true
		}
		if char >= '0' && char <= '9' {
			hasNumber = true
		}
	}

	if !hasLetter {
		return errors.New("password must contain at least one letter")
	}

	if !hasNumber {
		return errors.New("password must contain at least one number")
	}

	return nil
}

func (s *AuthService) Login(email, password string) (*models.User, string, string, error) {
	// Get user by email
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil {
		return nil, "", "", err
	}
	if user == nil {
		return nil, "", "", errors.New("invalid credentials")
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", "", errors.New("invalid credentials")
	}

	// Generate tokens
	accessToken, err := s.GenerateAccessToken(user.ID)
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, expiresAt, err := s.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, "", "", err
	}

	// Store refresh token in database
	if err := s.tokenRepo.CreateRefreshToken(user.ID, refreshToken, expiresAt); err != nil {
		return nil, "", "", err
	}

	return user, accessToken, refreshToken, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (string, string, error) {
	// Check if token exists and is not revoked in database
	storedToken, err := s.tokenRepo.GetRefreshToken(refreshToken)
	if err != nil {
		return "", "", errors.New("invalid refresh token")
	}

	if storedToken == nil {
		return "", "", errors.New("invalid refresh token")
	}

	// Check if token is revoked
	if storedToken.RevokedAt != nil {
		return "", "", errors.New("refresh token has been revoked")
	}

	// Check if token is expired
	if time.Now().After(storedToken.ExpiresAt) {
		return "", "", errors.New("refresh token has expired")
	}

	// Parse and validate refresh token
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("invalid token claims")
	}

	userID, ok := claims["user_id"].(float64)
	if !ok {
		return "", "", errors.New("invalid user ID in token")
	}

	// Verify user ID matches stored token
	if int(userID) != storedToken.UserID {
		return "", "", errors.New("token user mismatch")
	}

	// Generate new access token
	accessToken, err := s.GenerateAccessToken(int(userID))
	if err != nil {
		return "", "", err
	}

	// Generate new refresh token (rotate token for security)
	newRefreshToken, expiresAt, err := s.GenerateRefreshToken(int(userID))
	if err != nil {
		return "", "", err
	}

	// Revoke old token and store new one
	if err := s.tokenRepo.RevokeRefreshToken(refreshToken); err != nil {
		return "", "", err
	}

	if err := s.tokenRepo.CreateRefreshToken(int(userID), newRefreshToken, expiresAt); err != nil {
		return "", "", err
	}

	return accessToken, newRefreshToken, nil
}

func (s *AuthService) GetUserByID(userID int) (*models.User, error) {
	return s.userRepo.GetUserByID(userID)
}

func (s *AuthService) Logout(refreshToken string) error {
	if refreshToken == "" {
		return nil
	}

	return s.tokenRepo.RevokeRefreshToken(refreshToken)
}

func (s *AuthService) LogoutAll(userID int) error {
	return s.tokenRepo.RevokeAllUserTokens(userID)
}

func (s *AuthService) GetTokenRepo() *repository.TokenRepository {
	return s.tokenRepo
}

func (s *AuthService) GetAllUsers() ([]models.User, error) {
	return s.userRepo.GetAllUsers()
}

func (s *AuthService) UpdateUserRole(userID int, role string) error {
	// Validate role
	validRoles := []string{"customer", "admin"}
	isValid := false
	for _, r := range validRoles {
		if role == r {
			isValid = true
			break
		}
	}
	if !isValid {
		return errors.New("invalid role")
	}
	return s.userRepo.UpdateUserRole(userID, role)
}

func (s *AuthService) UpdateUserBlocked(userID int, blocked bool) error {
	return s.userRepo.UpdateUserBlocked(userID, blocked)
}

func (s *AuthService) GenerateAccessToken(userID int) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"type":    "access",
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) GenerateRefreshToken(userID int) (string, time.Time, error) {
	expiresAt := time.Now().Add(time.Hour * 24 * 7) // 7 days
	claims := jwt.MapClaims{
		"user_id": userID,
		"type":    "refresh",
		"exp":     expiresAt.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

func (s *AuthService) ValidateToken(tokenString string) (int, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return 0, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, errors.New("invalid token claims")
	}

	userID, ok := claims["user_id"].(float64)
	if !ok {
		return 0, errors.New("invalid user ID in token")
	}

	return int(userID), nil
}
