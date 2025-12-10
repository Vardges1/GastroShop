package models

import (
	"time"
)

type Product struct {
	ID          int       `json:"id" db:"id"`
	Slug        string    `json:"slug" db:"slug"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	PriceCents  int       `json:"price_cents" db:"price_cents"`
	Currency    string    `json:"currency" db:"currency"`
	Tags        []string  `json:"tags" db:"tags"`
	RegionCode  string    `json:"region_code" db:"region_code"`
	Images      []string  `json:"images" db:"images"`
	InStock     bool      `json:"in_stock" db:"in_stock"`
	Quantity    int       `json:"quantity" db:"quantity"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type Region struct {
	Code           string `json:"code" db:"code"`
	Name           string `json:"name" db:"name"`
	GeoJSONFeature string `json:"geojson_feature" db:"geojson_feature"`
}

type User struct {
	ID           int       `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         string    `json:"role" db:"role"`
	Blocked      bool      `json:"blocked" db:"blocked"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type Order struct {
	ID              int                    `json:"id" db:"id"`
	UserID          *int                   `json:"user_id" db:"user_id"`
	Items           []OrderItem            `json:"items" db:"items"`
	AmountCents     int                    `json:"amount_cents" db:"amount_cents"`
	Currency        string                 `json:"currency" db:"currency"`
	Status          string                 `json:"status" db:"status"`
	PaymentID       string                 `json:"payment_id" db:"payment_id"`
	ShippingAddress map[string]interface{} `json:"shipping_address" db:"shipping_address"`
	CreatedAt       time.Time              `json:"created_at" db:"created_at"`
}

type OrderItem struct {
	ProductID  int `json:"product_id"`
	Quantity   int `json:"quantity"`
	PriceCents int `json:"price_cents"`
}

type Event struct {
	ID        int                    `json:"id" db:"id"`
	UserID    *int                   `json:"user_id" db:"user_id"`
	Type      string                 `json:"type" db:"type"`
	Payload   map[string]interface{} `json:"payload" db:"payload"`
	CreatedAt time.Time              `json:"created_at" db:"created_at"`
}

type PaginatedResponse struct {
	Items    interface{} `json:"items"`
	Total    int         `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

type ErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type RecommendationRequest struct {
	Query string   `json:"query"`
	Tags  []string `json:"tags"`
}

type Payment struct {
	ID             int                    `json:"id" db:"id"`
	PaymentID      string                 `json:"payment_id" db:"payment_id"`
	OrderID        int                    `json:"order_id" db:"order_id"`
	AmountCents    int                    `json:"amount_cents" db:"amount_cents"`
	Currency       string                 `json:"currency" db:"currency"`
	Status         string                 `json:"status" db:"status"`
	Provider       string                 `json:"provider" db:"provider"`
	CheckoutURL    string                 `json:"checkout_url" db:"checkout_url"`
	WebhookEventID string                 `json:"webhook_event_id" db:"webhook_event_id"`
	Metadata       map[string]interface{} `json:"metadata" db:"metadata"`
	CreatedAt      time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at" db:"updated_at"`
}

type CreateOrderRequest struct {
	Items           []OrderItem            `json:"items" binding:"required"`
	ShippingAddress map[string]interface{} `json:"shipping_address" binding:"required"`
}

type CreatePaymentRequest struct {
	OrderID     int    `json:"order_id" binding:"required"`
	Amount      int    `json:"amount"` // Optional, will be taken from order if not provided
	Currency    string `json:"currency"`
	Description string `json:"description"`
}

type PaymentWebhookRequest struct {
	Type   string                 `json:"type"`
	Event  string                 `json:"event"`
	Object map[string]interface{} `json:"object"`
}

// Admin request models
type CreateProductRequest struct {
	Slug        string   `json:"slug" binding:"required"`
	Title       string   `json:"title" binding:"required"`
	Description string   `json:"description"`
	PriceCents  int      `json:"price_cents" binding:"required"`
	Currency    string   `json:"currency"`
	Tags        []string `json:"tags"`
	RegionCode  string   `json:"region_code"`
	Images      []string `json:"images"`
	Quantity    int      `json:"quantity"`
}

type UpdateProductRequest struct {
	Title       *string   `json:"title"`
	Description *string   `json:"description"`
	PriceCents  *int      `json:"price_cents"`
	Currency    *string   `json:"currency"`
	Tags        []string  `json:"tags"`
	RegionCode  *string   `json:"region_code"`
	Images      []string  `json:"images"`
	InStock     *bool     `json:"in_stock"`
	Quantity    *int      `json:"quantity"`
}

type UpdateProductQuantityRequest struct {
	Quantity int `json:"quantity" binding:"required"`
}
