package services

import (
	"testing"

	"gastroshop-api/internal/models"
)

func TestRecommendationService_GetRecommendations(t *testing.T) {
	productRepo := newMockProductRepository()
	service := NewRecommendationService(productRepo)

	// Add test products with tags
	products := []models.Product{
		{ID: 1, Title: "Parmesan", Tags: []string{"cheese", "hard", "italian"}},
		{ID: 2, Title: "Camembert", Tags: []string{"cheese", "soft", "french"}},
		{ID: 3, Title: "Gorgonzola", Tags: []string{"cheese", "blue", "italian"}},
	}
	productRepo.allProducts = products

	// Test with tags
	tags := []string{"cheese", "italian"}
	recommendations, err := service.GetRecommendations("", tags)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(recommendations) == 0 {
		t.Error("expected recommendations, got empty")
	}

	// Verify recommendations contain Italian cheeses
	foundItalian := false
	for _, rec := range recommendations {
		if rec.ID == 1 || rec.ID == 3 {
			foundItalian = true
			break
		}
	}
	if !foundItalian {
		t.Error("expected Italian cheese in recommendations")
	}
}

func TestRecommendationService_GetRecommendations_WithQuery(t *testing.T) {
	productRepo := newMockProductRepository()
	service := NewRecommendationService(productRepo)

	products := []models.Product{
		{ID: 1, Title: "Parmesan", Tags: []string{"cheese", "hard"}},
		{ID: 2, Title: "Brie", Tags: []string{"cheese", "soft"}},
	}
	productRepo.allProducts = products

	// Test with query
	query := "hard cheese"
	recommendations, err := service.GetRecommendations(query, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should find products matching query
	if len(recommendations) == 0 {
		t.Error("expected recommendations for query, got empty")
	}
}







