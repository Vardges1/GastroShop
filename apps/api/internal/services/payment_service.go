package services

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"gastroshop-api/internal/config"
	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type PaymentService struct {
	config       *config.Config
	paymentRepo  *repository.PaymentRepository
	orderRepo    *repository.OrderRepository
	userRepo     *repository.UserRepository
	emailService *EmailService
}

func NewPaymentService(cfg *config.Config, paymentRepo *repository.PaymentRepository, orderRepo *repository.OrderRepository) *PaymentService {
	return &PaymentService{
		config:      cfg,
		paymentRepo: paymentRepo,
		orderRepo:   orderRepo,
	}
}

// SetEmailService sets email service for payment notifications
func (s *PaymentService) SetEmailService(emailService *EmailService, userRepo *repository.UserRepository) {
	s.emailService = emailService
	s.userRepo = userRepo
}

type PaymentProvider interface {
	CreatePayment(order *models.Order) (*PaymentResponse, error)
	ValidateWebhook(payload []byte, signature string) (*WebhookData, error)
	GetPaymentStatus(paymentID string) (*PaymentStatus, error)
}

type PaymentResponse struct {
	PaymentURL string `json:"payment_url"`
	PaymentID  string `json:"payment_id"`
}

type WebhookData struct {
	PaymentID string `json:"payment_id"`
	Status    string `json:"status"`
	Amount    int    `json:"amount"`
	OrderID   int    `json:"order_id"`
	EventID   string `json:"event_id"`
}

type PaymentStatus struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Amount struct {
		Value    string `json:"value"`
		Currency string `json:"currency"`
	} `json:"amount"`
	Metadata map[string]interface{} `json:"metadata"`
}

// YooKassa implementation
type YooKassaProvider struct {
	shopID     string
	secretKey  string
	testMode   bool
	webhookURL string
	httpClient *http.Client
}

func NewYooKassaProvider(shopID, secretKey string, testMode bool, webhookURL string) *YooKassaProvider {
	return &YooKassaProvider{
		shopID:     shopID,
		secretKey:  secretKey,
		testMode:   testMode,
		webhookURL: webhookURL,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (p *YooKassaProvider) getAPIURL() string {
	if p.testMode {
		return "https://api.yookassa.ru/v3/payments"
	}
	return "https://api.yookassa.ru/v3/payments"
}

func (p *YooKassaProvider) CreatePayment(order *models.Order) (*PaymentResponse, error) {
	// Create payment request to YooKassa
	type PaymentRequest struct {
		Amount struct {
			Value    string `json:"value"`
			Currency string `json:"currency"`
		} `json:"amount"`
		Confirmation struct {
			Type      string `json:"type"`
			ReturnURL string `json:"return_url"`
		} `json:"confirmation"`
		Description string                 `json:"description"`
		Capture     bool                   `json:"capture"`
		Metadata    map[string]interface{} `json:"metadata"`
		Receipt     *struct {
			Customer struct {
				Email string `json:"email"`
			} `json:"customer"`
			Items []struct {
				Description string `json:"description"`
				Quantity    string `json:"quantity"`
				Amount      struct {
					Value    string `json:"value"`
					Currency string `json:"currency"`
				} `json:"amount"`
				VATCode int `json:"vat_code"`
			} `json:"items"`
		} `json:"receipt,omitempty"`
	}

	amountStr := fmt.Sprintf("%.2f", float64(order.AmountCents)/100.0)
	orderID := fmt.Sprintf("%d", order.ID)

	reqBody := PaymentRequest{
		Amount: struct {
			Value    string `json:"value"`
			Currency string `json:"currency"`
		}{
			Value:    amountStr,
			Currency: "RUB",
		},
		Confirmation: struct {
			Type      string `json:"type"`
			ReturnURL string `json:"return_url"`
		}{
			Type:      "redirect",
			ReturnURL: fmt.Sprintf("https://gastroshop.ru/checkout/success?order_id=%s", orderID),
		},
		Description: fmt.Sprintf("Заказ №%d", order.ID),
		Capture:     true,
		Metadata: map[string]interface{}{
			"order_id": order.ID,
		},
	}

	// Add receipt for Russian tax compliance
	if len(order.Items) > 0 {
		receipt := struct {
			Customer struct {
				Email string `json:"email"`
			} `json:"customer"`
			Items []struct {
				Description string `json:"description"`
				Quantity    string `json:"quantity"`
				Amount      struct {
					Value    string `json:"value"`
					Currency string `json:"currency"`
				} `json:"amount"`
				VATCode int `json:"vat_code"`
			} `json:"items"`
		}{
			Customer: struct {
				Email string `json:"email"`
			}{
				Email: "customer@gastroshop.ru", // You might want to get this from order
			},
			Items: make([]struct {
				Description string `json:"description"`
				Quantity    string `json:"quantity"`
				Amount      struct {
					Value    string `json:"value"`
					Currency string `json:"currency"`
				} `json:"amount"`
				VATCode int `json:"vat_code"`
			}, len(order.Items)),
		}

		for i, item := range order.Items {
			receipt.Items[i] = struct {
				Description string `json:"description"`
				Quantity    string `json:"quantity"`
				Amount      struct {
					Value    string `json:"value"`
					Currency string `json:"currency"`
				} `json:"amount"`
				VATCode int `json:"vat_code"`
			}{
				Description: fmt.Sprintf("Товар %d", item.ProductID),
				Quantity:    fmt.Sprintf("%d", item.Quantity),
				Amount: struct {
					Value    string `json:"value"`
					Currency string `json:"currency"`
				}{
					Value:    fmt.Sprintf("%.2f", float64(item.PriceCents)/100.0),
					Currency: "RUB",
				},
				VATCode: 1, // НДС 20%
			}
		}
		reqBody.Receipt = &receipt
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	req, err := http.NewRequest("POST", p.getAPIURL(), bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(p.shopID+":"+p.secretKey)))
	req.Header.Set("Idempotence-Key", fmt.Sprintf("order_%d_%d", order.ID, time.Now().Unix()))

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("YooKassa API error: %s", string(body))
	}

	var paymentResponse struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		Amount struct {
			Value    string `json:"value"`
			Currency string `json:"currency"`
		} `json:"amount"`
		Confirmation struct {
			Type            string `json:"type"`
			ReturnURL       string `json:"return_url"`
			ConfirmationURL string `json:"confirmation_url"`
		} `json:"confirmation"`
		CreatedAt string                 `json:"created_at"`
		Metadata  map[string]interface{} `json:"metadata"`
	}

	if err := json.Unmarshal(body, &paymentResponse); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	return &PaymentResponse{
		PaymentURL: paymentResponse.Confirmation.ConfirmationURL,
		PaymentID:  paymentResponse.ID,
	}, nil
}

func (p *YooKassaProvider) ValidateWebhook(payload []byte, signature string) (*WebhookData, error) {
	// Validate signature
	if !p.validateSignature(payload, signature) {
		return nil, fmt.Errorf("invalid signature")
	}

	var webhookData struct {
		Type   string `json:"type"`
		Event  string `json:"event"`
		Object struct {
			ID     string `json:"id"`
			Status string `json:"status"`
			Amount struct {
				Value string `json:"value"`
			} `json:"amount"`
			Metadata map[string]interface{} `json:"metadata"`
		} `json:"object"`
	}

	if err := json.Unmarshal(payload, &webhookData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal webhook data: %v", err)
	}

	amount, err := strconv.ParseFloat(webhookData.Object.Amount.Value, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid amount: %v", err)
	}

	orderID := 0
	if orderIDFloat, ok := webhookData.Object.Metadata["order_id"].(float64); ok {
		orderID = int(orderIDFloat)
	}

	return &WebhookData{
		PaymentID: webhookData.Object.ID,
		Status:    webhookData.Object.Status,
		Amount:    int(amount * 100), // Convert to cents
		OrderID:   orderID,
	}, nil
}

func (p *YooKassaProvider) GetPaymentStatus(paymentID string) (*PaymentStatus, error) {
	url := fmt.Sprintf("%s/%s", p.getAPIURL(), paymentID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(p.shopID+":"+p.secretKey)))

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("YooKassa API error: %s", string(body))
	}

	var status PaymentStatus
	if err := json.Unmarshal(body, &status); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	return &status, nil
}

func (p *YooKassaProvider) validateSignature(payload []byte, signature string) bool {
	// YooKassa webhook signature validation
	// The signature should be in format: sha256=<hash>
	if !strings.HasPrefix(signature, "sha256=") {
		return false
	}

	expectedHash := strings.TrimPrefix(signature, "sha256=")

	// Create HMAC-SHA256 hash
	h := hmac.New(sha256.New, []byte(p.secretKey))
	h.Write(payload)
	actualHash := fmt.Sprintf("%x", h.Sum(nil))

	return hmac.Equal([]byte(expectedHash), []byte(actualHash))
}

// CloudPayments implementation (keeping existing)
type CloudPaymentsProvider struct {
	publicID   string
	apiSecret  string
	httpClient *http.Client
}

func NewCloudPaymentsProvider(publicID, apiSecret string) *CloudPaymentsProvider {
	return &CloudPaymentsProvider{
		publicID:   publicID,
		apiSecret:  apiSecret,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (p *CloudPaymentsProvider) CreatePayment(order *models.Order) (*PaymentResponse, error) {
	// CloudPayments API implementation
	paymentID := fmt.Sprintf("cp_%d", order.ID)
	paymentURL := fmt.Sprintf("https://checkout.cloudpayments.ru/pay?publicId=%s&amount=%d&currency=RUB&invoiceId=%d",
		p.publicID, order.AmountCents/100, order.ID)

	return &PaymentResponse{
		PaymentURL: paymentURL,
		PaymentID:  paymentID,
	}, nil
}

func (p *CloudPaymentsProvider) ValidateWebhook(payload []byte, signature string) (*WebhookData, error) {
	// CloudPayments webhook validation
	var webhookData struct {
		InvoiceId string `json:"InvoiceId"`
		Status    string `json:"Status"`
		Amount    string `json:"Amount"`
	}

	if err := json.Unmarshal(payload, &webhookData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal webhook data: %v", err)
	}

	amount, err := strconv.ParseFloat(webhookData.Amount, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid amount: %v", err)
	}

	orderID, err := strconv.Atoi(webhookData.InvoiceId)
	if err != nil {
		return nil, fmt.Errorf("invalid order ID: %v", err)
	}

	return &WebhookData{
		PaymentID: webhookData.InvoiceId,
		Status:    webhookData.Status,
		Amount:    int(amount * 100), // Convert to cents
		OrderID:   orderID,
		EventID:   "", // CloudPayments doesn't provide event ID
	}, nil
}

func (p *CloudPaymentsProvider) GetPaymentStatus(paymentID string) (*PaymentStatus, error) {
	// CloudPayments status check implementation
	return &PaymentStatus{
		ID:     paymentID,
		Status: "unknown",
		Amount: struct {
			Value    string `json:"value"`
			Currency string `json:"currency"`
		}{
			Value:    "0.00",
			Currency: "RUB",
		},
		Metadata: map[string]interface{}{},
	}, nil
}

// MockProvider implementation for testing/demo
type MockProvider struct {
	webhookSecret string
	baseURL       string
}

func NewMockProvider(webhookSecret, baseURL string) *MockProvider {
	return &MockProvider{
		webhookSecret: webhookSecret,
		baseURL:       baseURL,
	}
}

func (p *MockProvider) CreatePayment(order *models.Order) (*PaymentResponse, error) {
	paymentID := fmt.Sprintf("mock_%d_%d", order.ID, time.Now().Unix())
	checkoutURL := fmt.Sprintf("%s/mock-checkout/%s", p.baseURL, paymentID)

	return &PaymentResponse{
		PaymentURL: checkoutURL,
		PaymentID:  paymentID,
	}, nil
}

func (p *MockProvider) ValidateWebhook(payload []byte, signature string) (*WebhookData, error) {
	// Validate signature using HMAC-SHA256
	if !p.validateSignature(payload, signature) {
		return nil, fmt.Errorf("invalid signature")
	}

	var webhookData struct {
		Event  string `json:"event"`
		ID     string `json:"id"`
		Object struct {
			ID     string `json:"id"`
			Status string `json:"status"`
			Amount struct {
				Value    string `json:"value"`
				Currency string `json:"currency"`
			} `json:"amount"`
			Metadata map[string]interface{} `json:"metadata"`
		} `json:"object"`
	}

	if err := json.Unmarshal(payload, &webhookData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal webhook data: %v", err)
	}

	amount, err := strconv.ParseFloat(webhookData.Object.Amount.Value, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid amount: %v", err)
	}

	orderID := 0
	if orderIDFloat, ok := webhookData.Object.Metadata["order_id"].(float64); ok {
		orderID = int(orderIDFloat)
	}

	return &WebhookData{
		PaymentID: webhookData.Object.ID,
		Status:    webhookData.Object.Status,
		Amount:    int(amount * 100), // Convert to cents
		OrderID:   orderID,
		EventID:   webhookData.ID,
	}, nil
}

func (p *MockProvider) GetPaymentStatus(paymentID string) (*PaymentStatus, error) {
	// For mock, we'll return a default status
	return &PaymentStatus{
		ID:     paymentID,
		Status: "awaiting_payment",
		Amount: struct {
			Value    string `json:"value"`
			Currency string `json:"currency"`
		}{
			Value:    "0.00",
			Currency: "RUB",
		},
		Metadata: map[string]interface{}{},
	}, nil
}

func (p *MockProvider) validateSignature(payload []byte, signature string) bool {
	// Create HMAC-SHA256 hash
	h := hmac.New(sha256.New, []byte(p.webhookSecret))
	h.Write(payload)
	expectedHash := fmt.Sprintf("%x", h.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expectedHash))
}

// PaymentService methods
func (s *PaymentService) CreatePayment(order *models.Order) (*PaymentResponse, error) {
	var provider PaymentProvider

	switch s.config.PaymentProvider {
	case "yookassa":
		provider = NewYooKassaProvider(
			s.config.YooKassaShopID,
			s.config.YooKassaSecret,
			s.config.YooKassaTestMode,
			s.config.YooKassaWebhookURL,
		)
	case "cloudpayments":
		provider = NewCloudPaymentsProvider(s.config.CPublicID, s.config.CAPI_SECRET)
	case "mock":
		provider = NewMockProvider(s.config.MockWebhookSecret, "http://localhost:3001")
	default:
		return nil, fmt.Errorf("unsupported payment provider: %s", s.config.PaymentProvider)
	}

	response, err := provider.CreatePayment(order)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment: %v", err)
	}

	// Save payment to database
	payment := &models.Payment{
		PaymentID:   response.PaymentID,
		OrderID:     order.ID,
		AmountCents: order.AmountCents,
		Currency:    "RUB",
		Status:      "awaiting_payment",
		Provider:    s.config.PaymentProvider,
		CheckoutURL: response.PaymentURL,
		Metadata:    map[string]interface{}{"order_id": order.ID},
	}

	if err := s.paymentRepo.CreatePayment(payment); err != nil {
		return nil, fmt.Errorf("failed to save payment: %v", err)
	}

	// Update order with payment_id
	if err := s.orderRepo.UpdateOrderPaymentID(order.ID, response.PaymentID); err != nil {
		log.Printf("Warning: failed to update order payment_id: %v", err)
	}

	return response, nil
}

func (s *PaymentService) ProcessWebhook(payload []byte, signature string) (*WebhookData, error) {
	var provider PaymentProvider

	switch s.config.PaymentProvider {
	case "yookassa":
		provider = NewYooKassaProvider(
			s.config.YooKassaShopID,
			s.config.YooKassaSecret,
			s.config.YooKassaTestMode,
			s.config.YooKassaWebhookURL,
		)
	case "cloudpayments":
		provider = NewCloudPaymentsProvider(s.config.CPublicID, s.config.CAPI_SECRET)
	case "mock":
		baseURL := os.Getenv("BASE_URL")
		if baseURL == "" {
			baseURL = "http://localhost:3001"
		}
		provider = NewMockProvider(s.config.MockWebhookSecret, baseURL)
	default:
		return nil, fmt.Errorf("unsupported payment provider: %s", s.config.PaymentProvider)
	}

	webhookData, err := provider.ValidateWebhook(payload, signature)
	if err != nil {
		return nil, fmt.Errorf("webhook validation failed: %v", err)
	}

	// Check for idempotency - if we've already processed this webhook event
	if webhookData.EventID != "" {
		existingPayment, err := s.paymentRepo.GetPaymentByWebhookEventID(webhookData.EventID)
		if err != nil {
			return nil, fmt.Errorf("failed to check webhook idempotency: %v", err)
		}
		if existingPayment != nil {
			log.Printf("Webhook event %s already processed, skipping", webhookData.EventID)
			return webhookData, nil
		}
	}

	// Get payment by payment_id
	payment, err := s.paymentRepo.GetPaymentByPaymentID(webhookData.PaymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get payment: %v", err)
	}
	if payment == nil {
		return nil, fmt.Errorf("payment not found: %s", webhookData.PaymentID)
	}

	// Update payment status
	var newStatus string
	switch webhookData.Status {
	case "succeeded":
		newStatus = "paid"
	case "canceled":
		newStatus = "canceled"
	default:
		newStatus = webhookData.Status
	}

	if err := s.paymentRepo.UpdatePaymentStatus(webhookData.PaymentID, newStatus); err != nil {
		return nil, fmt.Errorf("failed to update payment status: %v", err)
	}

	// Update webhook event ID for idempotency
	if webhookData.EventID != "" {
		if err := s.paymentRepo.UpdatePaymentWebhookEventID(webhookData.PaymentID, webhookData.EventID); err != nil {
			log.Printf("Warning: failed to update webhook event id: %v", err)
		}
	}

	// Update order status
	var orderStatus string
	switch newStatus {
	case "paid":
		orderStatus = "paid"
	case "canceled":
		orderStatus = "canceled"
	default:
		orderStatus = "pending"
	}

	if err := s.orderRepo.UpdateOrderStatus(payment.OrderID, orderStatus); err != nil {
		log.Printf("Warning: failed to update order status: %v", err)
	}

	// Send email notification if email service is configured
	if s.emailService != nil && s.userRepo != nil {
		go func() {
			order, err := s.orderRepo.GetOrderByID(payment.OrderID)
			if err != nil || order == nil {
				log.Printf("Failed to get order %d for payment email notification: %v", payment.OrderID, err)
				return
			}

			// Only send notification if order has a user
			if order.UserID == nil {
				return
			}

			user, err := s.userRepo.GetUserByID(*order.UserID)
			if err != nil || user == nil {
				log.Printf("Failed to get user %d for payment email notification: %v", *order.UserID, err)
				return
			}

			// Send payment notification email
			if err := s.emailService.SendPaymentNotificationEmail(
				user.Email,
				payment.OrderID,
				webhookData.PaymentID,
				payment.AmountCents/100,
				newStatus,
			); err != nil {
				log.Printf("Failed to send payment notification email: %v", err)
			}
		}()
	}

	log.Printf("Webhook processed successfully: payment %s status changed to %s", webhookData.PaymentID, newStatus)
	return webhookData, nil
}

func (s *PaymentService) GetPaymentStatus(paymentID string) (*PaymentStatus, error) {
	// First try to get from database
	payment, err := s.paymentRepo.GetPaymentByPaymentID(paymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get payment from database: %v", err)
	}
	if payment == nil {
		return nil, fmt.Errorf("payment not found: %s", paymentID)
	}

	// For mock provider, return database status
	if s.config.PaymentProvider == "mock" {
		return &PaymentStatus{
			ID:     paymentID,
			Status: payment.Status,
			Amount: struct {
				Value    string `json:"value"`
				Currency string `json:"currency"`
			}{
				Value:    fmt.Sprintf("%.2f", float64(payment.AmountCents)/100),
				Currency: payment.Currency,
			},
			Metadata: payment.Metadata,
		}, nil
	}

	// For real providers, get status from API
	var provider PaymentProvider
	switch s.config.PaymentProvider {
	case "yookassa":
		provider = NewYooKassaProvider(
			s.config.YooKassaShopID,
			s.config.YooKassaSecret,
			s.config.YooKassaTestMode,
			s.config.YooKassaWebhookURL,
		)
	case "cloudpayments":
		provider = NewCloudPaymentsProvider(s.config.CPublicID, s.config.CAPI_SECRET)
	default:
		return nil, fmt.Errorf("unsupported payment provider: %s", s.config.PaymentProvider)
	}

	return provider.GetPaymentStatus(paymentID)
}

func (s *PaymentService) GetPaymentByID(paymentID string) (*models.Payment, error) {
	return s.paymentRepo.GetPaymentByPaymentID(paymentID)
}

func (s *PaymentService) UpdatePaymentStatus(paymentID string, status string) error {
	// Update payment status
	if err := s.paymentRepo.UpdatePaymentStatus(paymentID, status); err != nil {
		return err
	}

	// Send email notification if email service is configured
	if s.emailService != nil && s.userRepo != nil {
		go func() {
			payment, err := s.paymentRepo.GetPaymentByPaymentID(paymentID)
			if err != nil || payment == nil {
				log.Printf("Failed to get payment %s for email notification: %v", paymentID, err)
				return
			}

			order, err := s.orderRepo.GetOrderByID(payment.OrderID)
			if err != nil || order == nil {
				log.Printf("Failed to get order %d for payment email notification: %v", payment.OrderID, err)
				return
			}

			// Only send notification if order has a user
			if order.UserID == nil {
				return
			}

			user, err := s.userRepo.GetUserByID(*order.UserID)
			if err != nil || user == nil {
				log.Printf("Failed to get user %d for payment email notification: %v", *order.UserID, err)
				return
			}

			// Send payment notification email
			if err := s.emailService.SendPaymentNotificationEmail(
				user.Email,
				payment.OrderID,
				paymentID,
				payment.AmountCents/100,
				status,
			); err != nil {
				log.Printf("Failed to send payment notification email: %v", err)
			}
		}()
	}

	return nil
}
