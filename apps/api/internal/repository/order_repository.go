package repository

import (
	"database/sql"
	"encoding/json"

	"gastroshop-api/internal/models"
)

type OrderRepository struct {
	db           *sql.DB
	hasPaymentID *bool // Cache for payment_id column existence
}

func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// checkPaymentIDColumn checks if payment_id column exists in orders table
func (r *OrderRepository) checkPaymentIDColumn() (bool, error) {
	if r.hasPaymentID != nil {
		return *r.hasPaymentID, nil
	}

	var exists bool
	query := `
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_name = 'orders' AND column_name = 'payment_id'
		)
	`
	err := r.db.QueryRow(query).Scan(&exists)
	if err != nil {
		return false, err
	}

	r.hasPaymentID = &exists
	return exists, nil
}

func (r *OrderRepository) CreateOrder(order *models.Order) error {
	itemsJSON, err := json.Marshal(order.Items)
	if err != nil {
		return err
	}

	shippingJSON, err := json.Marshal(order.ShippingAddress)
	if err != nil {
		return err
	}

	hasPaymentID, err := r.checkPaymentIDColumn()
	if err != nil {
		return err
	}

	var query string
	if hasPaymentID {
		query = `
			INSERT INTO orders (user_id, items, amount_cents, currency, status, payment_id, shipping_address)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, created_at
		`
		return r.db.QueryRow(
			query,
			order.UserID,
			itemsJSON,
			order.AmountCents,
			order.Currency,
			order.Status,
			order.PaymentID,
			shippingJSON,
		).Scan(&order.ID, &order.CreatedAt)
	} else {
		query = `
			INSERT INTO orders (user_id, items, amount_cents, currency, status, shipping_address)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, created_at
		`
		return r.db.QueryRow(
			query,
			order.UserID,
			itemsJSON,
			order.AmountCents,
			order.Currency,
			order.Status,
			shippingJSON,
		).Scan(&order.ID, &order.CreatedAt)
	}
}

func (r *OrderRepository) GetOrderByID(id int) (*models.Order, error) {
	hasPaymentID, err := r.checkPaymentIDColumn()
	if err != nil {
		return nil, err
	}

	var query string
	if hasPaymentID {
		query = `
			SELECT id, user_id, items, amount_cents, currency, status, payment_id, shipping_address, created_at
			FROM orders
			WHERE id = $1
		`
	} else {
		query = `
			SELECT id, user_id, items, amount_cents, currency, status, shipping_address, created_at
			FROM orders
			WHERE id = $1
		`
	}

	var order models.Order
	var itemsJSON, shippingJSON []byte

	if hasPaymentID {
		var paymentID sql.NullString
		err = r.db.QueryRow(query, id).Scan(
			&order.ID, &order.UserID, &itemsJSON, &order.AmountCents, &order.Currency,
			&order.Status, &paymentID, &shippingJSON, &order.CreatedAt,
		)
		if err == nil && paymentID.Valid {
			order.PaymentID = paymentID.String
		}
	} else {
		err = r.db.QueryRow(query, id).Scan(
			&order.ID, &order.UserID, &itemsJSON, &order.AmountCents, &order.Currency,
			&order.Status, &shippingJSON, &order.CreatedAt,
		)
	}

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Unmarshal JSON fields
	if err := json.Unmarshal(itemsJSON, &order.Items); err != nil {
		return nil, err
	}

	if err := json.Unmarshal(shippingJSON, &order.ShippingAddress); err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *OrderRepository) UpdateOrderStatus(id int, status string) error {
	query := `UPDATE orders SET status = $1 WHERE id = $2`
	_, err := r.db.Exec(query, status, id)
	return err
}

func (r *OrderRepository) UpdateOrderPaymentID(id int, paymentID string) error {
	hasPaymentID, err := r.checkPaymentIDColumn()
	if err != nil {
		return err
	}
	if !hasPaymentID {
		// Column doesn't exist, try to add it
		alterQuery := `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255)`
		_, err := r.db.Exec(alterQuery)
		if err != nil {
			return err
		}
		// Update cache
		hasPaymentID = true
		r.hasPaymentID = &hasPaymentID
	}

	query := `UPDATE orders SET payment_id = $1 WHERE id = $2`
	_, err = r.db.Exec(query, paymentID, id)
	return err
}

func (r *OrderRepository) GetOrdersByUserID(userID int) ([]models.Order, error) {
	hasPaymentID, err := r.checkPaymentIDColumn()
	if err != nil {
		// Return empty array instead of nil to avoid null in JSON response
		return []models.Order{}, err
	}

	var query string
	if hasPaymentID {
		query = `
			SELECT id, user_id, items, amount_cents, currency, status, payment_id, shipping_address, created_at
			FROM orders
			WHERE user_id = $1
			ORDER BY created_at DESC
		`
	} else {
		query = `
			SELECT id, user_id, items, amount_cents, currency, status, shipping_address, created_at
			FROM orders
			WHERE user_id = $1
			ORDER BY created_at DESC
		`
	}

	rows, err := r.db.Query(query, userID)
	if err != nil {
		// Return empty array instead of nil to avoid null in JSON response
		return []models.Order{}, err
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var order models.Order
		var itemsJSON, shippingJSON []byte

		var err error
		if hasPaymentID {
			var paymentID sql.NullString
			err = rows.Scan(
				&order.ID, &order.UserID, &itemsJSON, &order.AmountCents, &order.Currency,
				&order.Status, &paymentID, &shippingJSON, &order.CreatedAt,
			)
			if err == nil && paymentID.Valid {
				order.PaymentID = paymentID.String
			}
		} else {
			err = rows.Scan(
				&order.ID, &order.UserID, &itemsJSON, &order.AmountCents, &order.Currency,
				&order.Status, &shippingJSON, &order.CreatedAt,
			)
		}
		if err != nil {
			return nil, err
		}

		// Unmarshal JSON fields
		if err := json.Unmarshal(itemsJSON, &order.Items); err != nil {
			return nil, err
		}

		if err := json.Unmarshal(shippingJSON, &order.ShippingAddress); err != nil {
			return nil, err
		}

		orders = append(orders, order)
	}

	return orders, nil
}

func (r *OrderRepository) GetAllOrders() ([]models.Order, error) {
	hasPaymentID, err := r.checkPaymentIDColumn()
	if err != nil {
		// Return empty array instead of nil to avoid null in JSON response
		return []models.Order{}, err
	}

	var query string
	if hasPaymentID {
		query = `
			SELECT id, user_id, items, amount_cents, currency, status, payment_id, shipping_address, created_at
			FROM orders
			ORDER BY created_at DESC
		`
	} else {
		query = `
			SELECT id, user_id, items, amount_cents, currency, status, shipping_address, created_at
			FROM orders
			ORDER BY created_at DESC
		`
	}

	rows, err := r.db.Query(query)
	if err != nil {
		// Return empty array instead of nil to avoid null in JSON response
		return []models.Order{}, err
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var order models.Order
		var itemsJSON, shippingJSON []byte

		var err error
		if hasPaymentID {
			var paymentID sql.NullString
			err = rows.Scan(
				&order.ID, &order.UserID, &itemsJSON, &order.AmountCents, &order.Currency,
				&order.Status, &paymentID, &shippingJSON, &order.CreatedAt,
			)
			if err == nil && paymentID.Valid {
				order.PaymentID = paymentID.String
			}
		} else {
			err = rows.Scan(
				&order.ID, &order.UserID, &itemsJSON, &order.AmountCents, &order.Currency,
				&order.Status, &shippingJSON, &order.CreatedAt,
			)
		}
		if err != nil {
			return nil, err
		}

		// Unmarshal JSON fields
		if err := json.Unmarshal(itemsJSON, &order.Items); err != nil {
			return nil, err
		}

		if err := json.Unmarshal(shippingJSON, &order.ShippingAddress); err != nil {
			return nil, err
		}

		orders = append(orders, order)
	}

	return orders, nil
}
