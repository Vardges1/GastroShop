package repository

import (
	"database/sql"
	"encoding/json"

	"gastroshop-api/internal/models"
)

type EventRepository struct {
	db *sql.DB
}

func NewEventRepository(db *sql.DB) *EventRepository {
	return &EventRepository{db: db}
}

func (r *EventRepository) CreateEvent(event *models.Event) error {
	payloadJSON, err := json.Marshal(event.Payload)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO events (user_id, type, payload)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`

	return r.db.QueryRow(query, event.UserID, event.Type, payloadJSON).Scan(&event.ID, &event.CreatedAt)
}

func (r *EventRepository) GetEventsByType(eventType string, limit int) ([]models.Event, error) {
	query := `
		SELECT id, user_id, type, payload, created_at
		FROM events
		WHERE type = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(query, eventType, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var event models.Event
		var payloadJSON []byte

		err := rows.Scan(
			&event.ID, &event.UserID, &event.Type, &payloadJSON, &event.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal JSON payload
		if err := json.Unmarshal(payloadJSON, &event.Payload); err != nil {
			return nil, err
		}

		events = append(events, event)
	}

	return events, nil
}

func (r *EventRepository) GetEventsByUserID(userID int, limit int) ([]models.Event, error) {
	query := `
		SELECT id, user_id, type, payload, created_at
		FROM events
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var event models.Event
		var payloadJSON []byte

		err := rows.Scan(
			&event.ID, &event.UserID, &event.Type, &payloadJSON, &event.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal JSON payload
		if err := json.Unmarshal(payloadJSON, &event.Payload); err != nil {
			return nil, err
		}

		events = append(events, event)
	}

	return events, nil
}
