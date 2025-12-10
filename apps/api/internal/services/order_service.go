package services

import (
	"errors"

	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type OrderService struct {
	orderRepo   *repository.OrderRepository
	productRepo *repository.ProductRepository
}

func NewOrderService(orderRepo *repository.OrderRepository, productRepo *repository.ProductRepository) *OrderService {
	return &OrderService{
		orderRepo:   orderRepo,
		productRepo: productRepo,
	}
}

func (s *OrderService) CreateOrder(userID *int, items []models.OrderItem, shippingAddress map[string]interface{}) (*models.Order, error) {
	// Validate items and calculate total
	totalCents := 0
	for _, item := range items {
		product, err := s.productRepo.GetProductByID(item.ProductID)
		if err != nil {
			return nil, err
		}
		if product == nil {
			return nil, errors.New("product not found")
		}
		if !product.InStock || product.Quantity < item.Quantity {
			return nil, errors.New("product out of stock or insufficient quantity")
		}

		totalCents += item.PriceCents * item.Quantity
	}

	order := &models.Order{
		UserID:          userID,
		Items:           items,
		AmountCents:     totalCents,
		Currency:        "RUB",
		Status:          "pending",
		ShippingAddress: shippingAddress,
	}

	if err := s.orderRepo.CreateOrder(order); err != nil {
		return nil, err
	}

	return order, nil
}

// DecreaseProductQuantities decreases product quantities when order is paid
func (s *OrderService) DecreaseProductQuantities(orderID int) error {
	order, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return err
	}
	if order == nil {
		return errors.New("order not found")
	}

	for _, item := range order.Items {
		if err := s.productRepo.DecreaseProductQuantity(item.ProductID, item.Quantity); err != nil {
			return err
		}
	}

	return nil
}

func (s *OrderService) GetOrderByID(id int) (*models.Order, error) {
	return s.orderRepo.GetOrderByID(id)
}

func (s *OrderService) UpdateOrderStatus(id int, status string) error {
	return s.orderRepo.UpdateOrderStatus(id, status)
}

func (s *OrderService) UpdateOrderPaymentID(id int, paymentID string) error {
	return s.orderRepo.UpdateOrderPaymentID(id, paymentID)
}

func (s *OrderService) GetOrdersByUserID(userID int) ([]models.Order, error) {
	return s.orderRepo.GetOrdersByUserID(userID)
}

func (s *OrderService) GetAllOrders() ([]models.Order, error) {
	return s.orderRepo.GetAllOrders()
}
