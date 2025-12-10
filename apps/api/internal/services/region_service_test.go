package services

import (
	"testing"

	"gastroshop-api/internal/models"
)

type mockRegionRepository struct {
	regions      map[string]*models.Region
	allRegions   []models.Region
	getError     error
}

func newMockRegionRepository() *mockRegionRepository {
	return &mockRegionRepository{
		regions:    make(map[string]*models.Region),
		allRegions: []models.Region{},
	}
}

func (m *mockRegionRepository) GetRegions() ([]models.Region, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.allRegions, nil
}

func (m *mockRegionRepository) GetRegionByCode(code string) (*models.Region, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.regions[code], nil
}

func TestRegionService_GetRegions(t *testing.T) {
	regionRepo := newMockRegionRepository()
	productRepo := newMockProductRepository()
	service := NewRegionService(regionRepo, productRepo)

	regions := []models.Region{
		{Code: "IT", Name: "Italy"},
		{Code: "FR", Name: "France"},
	}
	regionRepo.allRegions = regions

	result, err := service.GetRegions()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result) != 2 {
		t.Errorf("expected 2 regions, got %d", len(result))
	}
}

func TestRegionService_GetRegionProducts(t *testing.T) {
	regionRepo := newMockRegionRepository()
	productRepo := newMockProductRepository()
	service := NewRegionService(regionRepo, productRepo)

	region := &models.Region{Code: "IT", Name: "Italy"}
	regionRepo.regions["IT"] = region

	products := []models.Product{
		{ID: 1, RegionCode: "IT", Title: "Italian Product"},
	}
	productRepo.productsByRegion["IT"] = products

	result, err := service.GetRegionProducts("IT")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result) != 1 {
		t.Errorf("expected 1 product, got %d", len(result))
	}
}

