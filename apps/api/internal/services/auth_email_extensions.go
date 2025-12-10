package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"gastroshop-api/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// Extend AuthService with email verification and password reset methods
// These methods are designed to be added to AuthService

// GenerateVerificationToken generates a secure random token for email verification
func GenerateVerificationToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// RegisterWithEmail sends registration email and creates verification token
func (s *AuthService) RegisterWithEmail(email, password string, emailService *EmailService) (*models.User, string, error) {
	user, err := s.Register(email, password)
	if err != nil {
		return nil, "", err
	}

	// Generate verification token
	token, err := GenerateVerificationToken()
	if err != nil {
		return user, "", err
	}

	// Set token expiration (24 hours)
	expiresAt := time.Now().Add(24 * time.Hour)
	if err := s.userRepo.SetEmailVerificationToken(user.ID, token, expiresAt); err != nil {
		return user, "", err
	}

	// Send verification email (don't fail registration if email fails)
	if emailService != nil {
		go func() {
			if err := emailService.SendVerificationEmail(email, token); err != nil {
				// Log error but don't fail registration
			}
		}()
		// Also send welcome email
		go func() {
			emailService.SendRegistrationEmail(email, "")
		}()
	}

	return user, token, nil
}

// VerifyEmail verifies user email using token
func (s *AuthService) VerifyEmail(token string) error {
	// Check if token is valid and not expired
	user, err := s.userRepo.GetUserByVerificationToken(token)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("invalid or expired verification token")
	}

	// Verify email
	if err := s.userRepo.VerifyEmail(token); err != nil {
		return errors.New("failed to verify email")
	}

	return nil
}

// ResendVerificationEmail resends verification email to user
func (s *AuthService) ResendVerificationEmail(userID int, emailService *EmailService) error {
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	// If email already verified, return success
	if user.EmailVerified {
		return nil
	}

	// Generate new verification token
	token, err := GenerateVerificationToken()
	if err != nil {
		return err
	}

	// Set token expiration (24 hours)
	expiresAt := time.Now().Add(24 * time.Hour)
	if err := s.userRepo.SetEmailVerificationToken(user.ID, token, expiresAt); err != nil {
		return err
	}

	// Send verification email (async)
	if emailService != nil {
		go func() {
			emailService.SendVerificationEmail(user.Email, token)
		}()
	}

	return nil
}

// RequestPasswordReset generates password reset token and sends email
func (s *AuthService) RequestPasswordReset(email string, emailService *EmailService) error {
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil {
		return err
	}
	if user == nil {
		// Don't reveal if email exists or not (security best practice)
		return nil
	}

	// Generate reset token
	token, err := GenerateVerificationToken()
	if err != nil {
		return err
	}

	// Set token expiration (24 hours)
	expiresAt := time.Now().Add(24 * time.Hour)
	if err := s.userRepo.SetPasswordResetToken(user.ID, token, expiresAt); err != nil {
		return err
	}

	// Send reset email (async)
	if emailService != nil {
		go func() {
			emailService.SendPasswordResetEmail(email, token)
		}()
	}

	return nil
}

// ResetPassword resets user password using token
func (s *AuthService) ResetPassword(token, newPassword string) error {
	// Validate password
	if err := s.validatePassword(newPassword); err != nil {
		return err
	}

	// Get user by reset token
	user, err := s.userRepo.GetUserByPasswordResetToken(token)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("invalid or expired reset token")
	}

	// Check if token is expired
	if user.PasswordResetTokenExpiresAt != nil && time.Now().After(*user.PasswordResetTokenExpiresAt) {
		return errors.New("reset token has expired")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update password and clear reset token
	if err := s.userRepo.UpdatePassword(user.ID, string(hashedPassword)); err != nil {
		return err
	}

	return nil
}

