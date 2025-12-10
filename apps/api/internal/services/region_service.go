package services

import (
	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type RegionService struct {
	regionRepo  *repository.RegionRepository
	productRepo *repository.ProductRepository
}

func NewRegionService(regionRepo *repository.RegionRepository, productRepo *repository.ProductRepository) *RegionService {
	return &RegionService{
		regionRepo:  regionRepo,
		productRepo: productRepo,
	}
}

func (s *RegionService) GetRegions() ([]models.Region, error) {
	return s.regionRepo.GetRegions()
}

func (s *RegionService) GetRegionByCode(code string) (*models.Region, error) {
	return s.regionRepo.GetRegionByCode(code)
}

func (s *RegionService) GetRegionProducts(code string) ([]models.Product, error) {
	return s.productRepo.GetProductsByRegion(code)
}
