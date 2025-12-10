package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"testing"

	"gastroshop-api/internal/config"
	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type mockPaymentRepository struct {
	payments      map[string]*models.Payment
	paymentsByOrder map[int]*models.Payment
	createError   error
	getError      error
	updateError   error
}

func newMockPaymentRepository() *mockPaymentRepository {
	return &mockPaymentRepository{
		payments:        make(map[string]*models.Payment),
		paymentsByOrder: make(map[int]*models.Payment),
	}
}

func (m *mockPaymentRepository) CreatePayment(payment *models.Payment) error {
	if m.createError != nil {
		return m.createError
	}
	m.payments[payment.PaymentID] = payment
	if payment.OrderID > 0 {
		m.paymentsByOrder[payment.OrderID] = payment
	}
	return nil
}

func (m *mockPaymentRepository) GetPaymentByPaymentID(paymentID string) (*models.Payment, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.payments[paymentID], nil
}

func (m *mockPaymentRepository) GetPaymentByOrderID(orderID int) (*models.Payment, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.paymentsByOrder[orderID], nil
}

func (m *mockPaymentRepository) UpdatePaymentStatus(paymentID string, status string) error {
	if m.updateError != nil {
		return m.updateError
	}
	if payment, ok := m.payments[paymentID]; ok {
		payment.Status = status
	}
	return nil
}

func (m *mockPaymentRepository) GetPaymentByWebhookEventID(eventID string) (*models.Payment, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	for _, payment := range m.payments {
		if payment.WebhookEventID == eventID {
			return payment, nil
		}
	}
	return nil, nil
}

func (m *mockPaymentRepository) UpdatePaymentWebhookEventID(paymentID string, eventID string) error {
	if m.updateError != nil {
		return m.updateError
	}
	if payment, ok := m.payments[paymentID]; ok {
		payment.WebhookEventID = eventID
	}
	return nil
}

func TestPaymentService_CreatePayment(t *testing.T) {
	cfg := &config.Config{
		PaymentProvider: "mock",
		MockWebhookSecret: "test-secret",
	}
	paymentRepo := newMockPaymentRepository()
	orderRepo := newMockOrderRepository()
	service := NewPaymentService(cfg, paymentRepo, orderRepo)

	order := &models.Order{
		ID:          1,
		AmountCents: 10000,
		Currency:    "RUB",
		Status:      "pending",
		Items: []models.OrderItem{
			{ProductID: 1, Quantity: 2, PriceCents: 5000},
		},
	}
	orderRepo.orders[1] = order

	response, err := service.CreatePayment(order)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if response == nil {
		t.Fatal("expected payment response, got nil")
	}
	if response.PaymentID == "" {
		t.Error("expected payment ID to be set")
	}
	if response.PaymentURL == "" {
		t.Error("expected payment URL to be set")
	}
}

func TestPaymentService_CreatePayment_UnsupportedProvider(t *testing.T) {
	cfg := &config.Config{
		PaymentProvider: "unsupported",
	}
	paymentRepo := newMockPaymentRepository()
	orderRepo := newMockOrderRepository()
	service := NewPaymentService(cfg, paymentRepo, orderRepo)

	order := &models.Order{
		ID:          1,
		AmountCents: 10000,
		Currency:    "RUB",
		Status:      "pending",
	}

	response, err := service.CreatePayment(order)
	if err == nil {
		t.Error("expected error for unsupported provider")
	}
	if response != nil {
		t.Error("expected nil response on error")
	}
}

func TestPaymentService_GetPaymentStatus(t *testing.T) {
	cfg := &config.Config{
		PaymentProvider: "mock",
		MockWebhookSecret: "test-secret",
	}
	paymentRepo := newMockPaymentRepository()
	orderRepo := newMockOrderRepository()
	service := NewPaymentService(cfg, paymentRepo, orderRepo)

	payment := &models.Payment{
		PaymentID:   "test-payment-id",
		OrderID:     1,
		Status:      "succeeded",
		AmountCents: 10000,
		Currency:    "RUB",
	}
	paymentRepo.payments["test-payment-id"] = payment

	status, err := service.GetPaymentStatus("test-payment-id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status == nil {
		t.Fatal("expected status, got nil")
	}
	if status.Status != "succeeded" {
		t.Errorf("expected status 'succeeded', got %q", status.Status)
	}
}

func TestPaymentService_ProcessWebhook(t *testing.T) {
	cfg := &config.Config{
		PaymentProvider: "mock",
		MockWebhookSecret: "test-secret",
	}
	paymentRepo := newMockPaymentRepository()
	orderRepo := newMockOrderRepository()
	service := NewPaymentService(cfg, paymentRepo, orderRepo)

	order := &models.Order{
		ID:          1,
		AmountCents: 10000,
		Status:      "pending",
	}
	orderRepo.orders[1] = order

	payment := &models.Payment{
		PaymentID:   "test-payment-id",
		OrderID:     1,
		Status:      "awaiting_payment",
		AmountCents: 10000,
	}
	paymentRepo.payments["test-payment-id"] = payment

	// Valid webhook payload with correct signature
	payload := []byte(`{"id":"event-123","event":"payment.succeeded","object":{"id":"test-payment-id","status":"succeeded","amount":{"value":"100.00","currency":"RUB"},"metadata":{"order_id":1}}}`)
	mac := hmac.New(sha256.New, []byte("test-secret"))
	mac.Write(payload)
	signature := hex.EncodeToString(mac.Sum(nil))

	webhookData, err := service.ProcessWebhook(payload, signature)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if webhookData == nil {
		t.Fatal("expected webhook data, got nil")
	}

	// Verify payment status updated
	updatedPayment := paymentRepo.payments["test-payment-id"]
	if updatedPayment == nil {
		t.Fatal("payment not found after webhook")
	}
	if updatedPayment.Status != "paid" {
		t.Errorf("expected payment status 'paid', got %q", updatedPayment.Status)
	}

	// Verify order status updated
	updatedOrder := orderRepo.orders[1]
	if updatedOrder.Status != "paid" {
		t.Errorf("expected order status 'paid', got %q", updatedOrder.Status)
	}
}

func TestPaymentService_ProcessWebhook_InvalidSignature(t *testing.T) {
	cfg := &config.Config{
		PaymentProvider: "mock",
		MockWebhookSecret: "test-secret",
	}
	paymentRepo := newMockPaymentRepository()
	orderRepo := newMockOrderRepository()
	service := NewPaymentService(cfg, paymentRepo, orderRepo)

	payload := []byte(`{"event":"payment.succeeded","object":{"id":"test-payment-id","status":"succeeded"}}`)
	invalidSignature := "invalid-signature"

	_, err := service.ProcessWebhook(payload, invalidSignature)
	if err == nil {
		t.Error("expected error for invalid signature")
	}
}

func TestPaymentService_ProcessWebhook_Canceled(t *testing.T) {
	cfg := &config.Config{
		PaymentProvider: "mock",
		MockWebhookSecret: "test-secret",
	}
	paymentRepo := newMockPaymentRepository()
	orderRepo := newMockOrderRepository()
	service := NewPaymentService(cfg, paymentRepo, orderRepo)

	order := &models.Order{
		ID:          1,
		AmountCents: 10000,
		Status:      "pending",
	}
	orderRepo.orders[1] = order

	payment := &models.Payment{
		PaymentID:   "test-payment-id",
		OrderID:     1,
		Status:      "awaiting_payment",
		AmountCents: 10000,
	}
	paymentRepo.payments["test-payment-id"] = payment

	payload := []byte(`{"id":"event-456","event":"payment.canceled","object":{"id":"test-payment-id","status":"canceled","amount":{"value":"100.00","currency":"RUB"},"metadata":{"order_id":1}}}`)
	mac := hmac.New(sha256.New, []byte("test-secret"))
	mac.Write(payload)
	signature := hex.EncodeToString(mac.Sum(nil))

	webhookData, err := service.ProcessWebhook(payload, signature)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if webhookData.Status != "canceled" {
		t.Errorf("expected status 'canceled', got %q", webhookData.Status)
	}

	// Verify order status updated to canceled
	updatedOrder := orderRepo.orders[1]
	if updatedOrder.Status != "canceled" {
		t.Errorf("expected order status 'canceled', got %q", updatedOrder.Status)
	}
}

