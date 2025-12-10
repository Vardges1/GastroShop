package services

import (
	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type EventService struct {
	eventRepo *repository.EventRepository
}

func NewEventService(eventRepo *repository.EventRepository) *EventService {
	return &EventService{eventRepo: eventRepo}
}

func (s *EventService) TrackEvent(userID *int, eventType string, payload map[string]interface{}) error {
	event := &models.Event{
		UserID:  userID,
		Type:    eventType,
		Payload: payload,
	}

	return s.eventRepo.CreateEvent(event)
}

func (s *EventService) GetEventsByType(eventType string, limit int) ([]models.Event, error) {
	return s.eventRepo.GetEventsByType(eventType, limit)
}

func (s *EventService) GetEventsByUserID(userID int, limit int) ([]models.Event, error) {
	return s.eventRepo.GetEventsByUserID(userID, limit)
}
