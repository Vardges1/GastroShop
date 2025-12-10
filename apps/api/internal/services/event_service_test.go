package services

import (
	"testing"

	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type mockEventRepository struct {
	events      []models.Event
	createError error
}

func newMockEventRepository() *mockEventRepository {
	return &mockEventRepository{
		events: []models.Event{},
	}
}

func (m *mockEventRepository) CreateEvent(event *models.Event) error {
	if m.createError != nil {
		return m.createError
	}
	event.ID = len(m.events) + 1
	m.events = append(m.events, *event)
	return nil
}

func TestEventService_TrackEvent(t *testing.T) {
	eventRepo := newMockEventRepository()
	service := NewEventService(eventRepo)

	userID := 1
	eventType := "product_view"
	payload := map[string]interface{}{
		"product_id": 123,
		"page":       "shop",
	}

	err := service.TrackEvent(&userID, eventType, payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(eventRepo.events) != 1 {
		t.Errorf("expected 1 event, got %d", len(eventRepo.events))
	}

	event := eventRepo.events[0]
	if event.Type != eventType {
		t.Errorf("expected type %q, got %q", eventType, event.Type)
	}
	if *event.UserID != userID {
		t.Errorf("expected user ID %d, got %d", userID, *event.UserID)
	}
}

func TestEventService_TrackEvent_WithoutUserID(t *testing.T) {
	eventRepo := newMockEventRepository()
	service := NewEventService(eventRepo)

	eventType := "page_view"
	payload := map[string]interface{}{}

	err := service.TrackEvent(nil, eventType, payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(eventRepo.events) != 1 {
		t.Errorf("expected 1 event, got %d", len(eventRepo.events))
	}

	event := eventRepo.events[0]
	if event.UserID != nil {
		t.Error("expected nil user ID for anonymous event")
	}
}







