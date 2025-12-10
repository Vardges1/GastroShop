package services

import (
	"errors"
	"testing"

	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type mockOrderRepository struct {
	orders      map[int]*models.Order
	ordersByUser map[int][]models.Order
	createError error
	getError    error
	updateError error
}

func newMockOrderRepository() *mockOrderRepository {
	return &mockOrderRepository{
		orders:       make(map[int]*models.Order),
		ordersByUser: make(map[int][]models.Order),
	}
}

func (m *mockOrderRepository) CreateOrder(order *models.Order) error {
	if m.createError != nil {
		return m.createError
	}
	order.ID = len(m.orders) + 1
	m.orders[order.ID] = order
	if order.UserID != nil {
		m.ordersByUser[*order.UserID] = append(m.ordersByUser[*order.UserID], *order)
	}
	return nil
}

func (m *mockOrderRepository) GetOrderByID(id int) (*models.Order, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.orders[id], nil
}

func (m *mockOrderRepository) UpdateOrderStatus(id int, status string) error {
	if m.updateError != nil {
		return m.updateError
	}
	if order, ok := m.orders[id]; ok {
		order.Status = status
	}
	return nil
}

func (m *mockOrderRepository) UpdateOrderPaymentID(id int, paymentID string) error {
	if m.updateError != nil {
		return m.updateError
	}
	if order, ok := m.orders[id]; ok {
		order.PaymentID = paymentID
	}
	return nil
}

func (m *mockOrderRepository) GetOrdersByUserID(userID int) ([]models.Order, error) {
	return m.ordersByUser[userID], nil
}

func (m *mockOrderRepository) GetAllOrders() ([]models.Order, error) {
	orders := make([]models.Order, 0, len(m.orders))
	for _, order := range m.orders {
		orders = append(orders, *order)
	}
	return orders, nil
}

func TestOrderService_CreateOrder(t *testing.T) {
	orderRepo := newMockOrderRepository()
	productRepo := newMockProductRepository()
	service := NewOrderService(orderRepo, productRepo)

	// Create test product
	testProduct := &models.Product{
		ID:       1,
		InStock:  true,
		Quantity: 10,
		PriceCents: 1000,
	}
	productRepo.products[1] = testProduct

	userID := 1
	items := []models.OrderItem{
		{ProductID: 1, Quantity: 2, PriceCents: 1000},
	}
	shippingAddress := map[string]interface{}{
		"address": "123 Test St",
		"city":    "Test City",
	}

	order, err := service.CreateOrder(&userID, items, shippingAddress)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if order == nil {
		t.Fatal("expected order, got nil")
	}
	if order.AmountCents != 2000 {
		t.Errorf("expected amount 2000, got %d", order.AmountCents)
	}
	if order.Status != "pending" {
		t.Errorf("expected status 'pending', got %q", order.Status)
	}
}

func TestOrderService_CreateOrder_ProductNotFound(t *testing.T) {
	orderRepo := newMockOrderRepository()
	productRepo := newMockProductRepository()
	service := NewOrderService(orderRepo, productRepo)

	userID := 1
	items := []models.OrderItem{
		{ProductID: 999, Quantity: 1, PriceCents: 1000},
	}

	order, err := service.CreateOrder(&userID, items, map[string]interface{}{})
	if err == nil {
		t.Error("expected error for non-existent product")
	}
	if order != nil {
		t.Error("expected nil order on error")
	}
}

func TestOrderService_CreateOrder_OutOfStock(t *testing.T) {
	orderRepo := newMockOrderRepository()
	productRepo := newMockProductRepository()
	service := NewOrderService(orderRepo, productRepo)

	testProduct := &models.Product{
		ID:       1,
		InStock:  false,
		Quantity: 0,
	}
	productRepo.products[1] = testProduct

	userID := 1
	items := []models.OrderItem{
		{ProductID: 1, Quantity: 1, PriceCents: 1000},
	}

	order, err := service.CreateOrder(&userID, items, map[string]interface{}{})
	if err == nil {
		t.Error("expected error for out of stock product")
	}
	if order != nil {
		t.Error("expected nil order on error")
	}
}

func TestOrderService_UpdateOrderStatus(t *testing.T) {
	orderRepo := newMockOrderRepository()
	productRepo := newMockProductRepository()
	service := NewOrderService(orderRepo, productRepo)

	// Create order
	order := &models.Order{
		ID:     1,
		Status: "pending",
	}
	orderRepo.orders[1] = order

	err := service.UpdateOrderStatus(1, "completed")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if order.Status != "completed" {
		t.Errorf("expected status 'completed', got %q", order.Status)
	}
}

func TestOrderService_GetOrdersByUserID(t *testing.T) {
	orderRepo := newMockOrderRepository()
	productRepo := newMockProductRepository()
	service := NewOrderService(orderRepo, productRepo)

	userID := 1
	order := &models.Order{
		ID:     1,
		UserID: &userID,
		Status: "pending",
	}
	orderRepo.orders[1] = order
	orderRepo.ordersByUser[userID] = []models.Order{*order}

	orders, err := service.GetOrdersByUserID(userID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(orders) != 1 {
		t.Errorf("expected 1 order, got %d", len(orders))
	}
}







