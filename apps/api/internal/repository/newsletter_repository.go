package repository

import (
	"database/sql"

	"gastroshop-api/internal/models"
)

type NewsletterRepository struct {
	db *sql.DB
}

func NewNewsletterRepository(db *sql.DB) *NewsletterRepository {
	return &NewsletterRepository{db: db}
}

func (r *NewsletterRepository) Subscribe(email string) error {
	query := `
		INSERT INTO newsletter_subscriptions (email, subscribed, subscribed_at)
		VALUES ($1, true, NOW())
		ON CONFLICT (email) 
		DO UPDATE SET 
			subscribed = true,
			subscribed_at = NOW(),
			unsubscribed_at = NULL,
			updated_at = NOW()
	`
	_, err := r.db.Exec(query, email)
	return err
}

func (r *NewsletterRepository) Unsubscribe(email string) error {
	query := `
		UPDATE newsletter_subscriptions 
		SET subscribed = false, unsubscribed_at = NOW(), updated_at = NOW()
		WHERE email = $1
	`
	result, err := r.db.Exec(query, email)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *NewsletterRepository) IsSubscribed(email string) (bool, error) {
	query := `
		SELECT subscribed
		FROM newsletter_subscriptions
		WHERE email = $1
	`
	var subscribed bool
	err := r.db.QueryRow(query, email).Scan(&subscribed)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return subscribed, nil
}

func (r *NewsletterRepository) GetSubscription(email string) (*models.NewsletterSubscription, error) {
	query := `
		SELECT id, email, subscribed, subscribed_at, unsubscribed_at, created_at, updated_at
		FROM newsletter_subscriptions
		WHERE email = $1
	`
	var sub models.NewsletterSubscription
	var unsubscribedAt sql.NullTime
	err := r.db.QueryRow(query, email).Scan(
		&sub.ID, &sub.Email, &sub.Subscribed, &sub.SubscribedAt, &unsubscribedAt, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if unsubscribedAt.Valid {
		sub.UnsubscribedAt = &unsubscribedAt.Time
	}
	return &sub, nil
}

func (r *NewsletterRepository) GetAllSubscribed() ([]models.NewsletterSubscription, error) {
	query := `
		SELECT id, email, subscribed, subscribed_at, unsubscribed_at, created_at, updated_at
		FROM newsletter_subscriptions
		WHERE subscribed = true
		ORDER BY subscribed_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subscriptions []models.NewsletterSubscription
	for rows.Next() {
		var sub models.NewsletterSubscription
		var unsubscribedAt sql.NullTime
		err := rows.Scan(
			&sub.ID, &sub.Email, &sub.Subscribed, &sub.SubscribedAt, &unsubscribedAt, &sub.CreatedAt, &sub.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if unsubscribedAt.Valid {
			sub.UnsubscribedAt = &unsubscribedAt.Time
		}
		subscriptions = append(subscriptions, sub)
	}
	return subscriptions, nil
}

