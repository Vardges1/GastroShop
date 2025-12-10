package repository

import (
	"database/sql"
	"fmt"
	"time"

	"gastroshop-api/internal/models"
)

type PaymentRepository struct {
	db *sql.DB
}

func NewPaymentRepository(db *sql.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) CreatePayment(payment *models.Payment) error {
	query := `
		INSERT INTO payments (payment_id, order_id, amount_cents, currency, status, provider, checkout_url, metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`

	now := time.Now()
	err := r.db.QueryRow(
		query,
		payment.PaymentID,
		payment.OrderID,
		payment.AmountCents,
		payment.Currency,
		payment.Status,
		payment.Provider,
		payment.CheckoutURL,
		payment.Metadata,
		now,
		now,
	).Scan(&payment.ID)

	if err != nil {
		return fmt.Errorf("failed to create payment: %v", err)
	}

	payment.CreatedAt = now
	payment.UpdatedAt = now
	return nil
}

func (r *PaymentRepository) GetPaymentByPaymentID(paymentID string) (*models.Payment, error) {
	query := `
		SELECT id, payment_id, order_id, amount_cents, currency, status, provider, checkout_url, webhook_event_id, metadata, created_at, updated_at
		FROM payments
		WHERE payment_id = $1`

	payment := &models.Payment{}
	err := r.db.QueryRow(query, paymentID).Scan(
		&payment.ID,
		&payment.PaymentID,
		&payment.OrderID,
		&payment.AmountCents,
		&payment.Currency,
		&payment.Status,
		&payment.Provider,
		&payment.CheckoutURL,
		&payment.WebhookEventID,
		&payment.Metadata,
		&payment.CreatedAt,
		&payment.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get payment: %v", err)
	}

	return payment, nil
}

func (r *PaymentRepository) UpdatePaymentStatus(paymentID string, status string) error {
	query := `UPDATE payments SET status = $1, updated_at = $2 WHERE payment_id = $3`
	_, err := r.db.Exec(query, status, time.Now(), paymentID)
	if err != nil {
		return fmt.Errorf("failed to update payment status: %v", err)
	}
	return nil
}

func (r *PaymentRepository) UpdatePaymentWebhookEventID(paymentID string, eventID string) error {
	query := `UPDATE payments SET webhook_event_id = $1, updated_at = $2 WHERE payment_id = $3`
	_, err := r.db.Exec(query, eventID, time.Now(), paymentID)
	if err != nil {
		return fmt.Errorf("failed to update payment webhook event id: %v", err)
	}
	return nil
}

func (r *PaymentRepository) GetPaymentsByOrderID(orderID int) ([]models.Payment, error) {
	query := `
		SELECT id, payment_id, order_id, amount_cents, currency, status, provider, checkout_url, webhook_event_id, metadata, created_at, updated_at
		FROM payments
		WHERE order_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(query, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get payments by order id: %v", err)
	}
	defer rows.Close()

	var payments []models.Payment
	for rows.Next() {
		payment := models.Payment{}
		err := rows.Scan(
			&payment.ID,
			&payment.PaymentID,
			&payment.OrderID,
			&payment.AmountCents,
			&payment.Currency,
			&payment.Status,
			&payment.Provider,
			&payment.CheckoutURL,
			&payment.WebhookEventID,
			&payment.Metadata,
			&payment.CreatedAt,
			&payment.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan payment: %v", err)
		}
		payments = append(payments, payment)
	}

	return payments, nil
}

func (r *PaymentRepository) GetPaymentByWebhookEventID(eventID string) (*models.Payment, error) {
	query := `
		SELECT id, payment_id, order_id, amount_cents, currency, status, provider, checkout_url, webhook_event_id, metadata, created_at, updated_at
		FROM payments
		WHERE webhook_event_id = $1`

	payment := &models.Payment{}
	err := r.db.QueryRow(query, eventID).Scan(
		&payment.ID,
		&payment.PaymentID,
		&payment.OrderID,
		&payment.AmountCents,
		&payment.Currency,
		&payment.Status,
		&payment.Provider,
		&payment.CheckoutURL,
		&payment.WebhookEventID,
		&payment.Metadata,
		&payment.CreatedAt,
		&payment.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get payment by webhook event id: %v", err)
	}

	return payment, nil
}
