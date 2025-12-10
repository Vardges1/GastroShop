package handlers

import (
	"log"
	"net/http"

	"gastroshop-api/internal/models"

	"github.com/gin-gonic/gin"
)

// Email verification handlers

func (h *Handlers) VerifyEmail(c *gin.Context) {
	var req models.VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	if err := h.AuthService.VerifyEmail(req.Token); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully"})
}

func (h *Handlers) ResendVerificationEmail(c *gin.Context) {
	// Get user ID from context (set by AuthMiddleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Invalid user ID"})
		return
	}

	if err := h.AuthService.ResendVerificationEmail(userIDInt, h.EmailService); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification email sent successfully"})
}

func (h *Handlers) RequestPasswordReset(c *gin.Context) {
	var req models.RequestPasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	// Always return success to prevent email enumeration
	if err := h.AuthService.RequestPasswordReset(req.Email, h.EmailService); err != nil {
		log.Printf("Password reset request error: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a password reset link has been sent"})
}

func (h *Handlers) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	if err := h.AuthService.ResetPassword(req.Token, req.Password); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

// Newsletter handlers

func (h *Handlers) NewsletterSubscribe(c *gin.Context) {
	var req models.NewsletterSubscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request"})
		return
	}

	if err := h.NewsletterService.Subscribe(req.Email); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to subscribe"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully subscribed to newsletter"})
}

func (h *Handlers) NewsletterUnsubscribe(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Email is required"})
		return
	}

	if err := h.NewsletterService.Unsubscribe(email); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to unsubscribe"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully unsubscribed from newsletter"})
}

