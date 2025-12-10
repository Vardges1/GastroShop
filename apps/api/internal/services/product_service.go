package services

import (
	"fmt"
	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type ProductService struct {
	productRepo *repository.ProductRepository
}

func NewProductService(productRepo *repository.ProductRepository) *ProductService {
	return &ProductService{productRepo: productRepo}
}

func (s *ProductService) GetProducts(filters map[string]interface{}) ([]models.Product, int, error) {
	fmt.Printf("DEBUG: ProductService.GetProducts called\n")
	products, err := s.productRepo.GetProducts(filters)
	if err != nil {
		fmt.Printf("DEBUG: ProductService.GetProducts error: %v\n", err)
		return nil, 0, err
	}

	fmt.Printf("DEBUG: ProductService.GetProducts - got %d products, now counting\n", len(products))
	total, err := s.productRepo.CountProducts(filters)
	if err != nil {
		fmt.Printf("DEBUG: ProductService.CountProducts error: %v\n", err)
		return nil, 0, err
	}

	fmt.Printf("DEBUG: ProductService.GetProducts - total: %d\n", total)
	return products, total, nil
}

func (s *ProductService) GetProductBySlug(slug string) (*models.Product, error) {
	return s.productRepo.GetProductBySlug(slug)
}

func (s *ProductService) GetProductsByRegion(regionCode string) ([]models.Product, error) {
	return s.productRepo.GetProductsByRegion(regionCode)
}

func (s *ProductService) GetProductsByTags(tags []string) ([]models.Product, error) {
	return s.productRepo.GetProductsByTags(tags)
}

// Admin methods
func (s *ProductService) GetProductByID(id int) (*models.Product, error) {
	return s.productRepo.GetProductByID(id)
}

func (s *ProductService) CreateProduct(product *models.Product) error {
	return s.productRepo.CreateProduct(product)
}

func (s *ProductService) UpdateProduct(id int, product *models.Product) error {
	return s.productRepo.UpdateProduct(id, product)
}

func (s *ProductService) UpdateProductQuantity(id int, quantity int) error {
	return s.productRepo.UpdateProductQuantity(id, quantity)
}

func (s *ProductService) DecreaseProductQuantity(id int, amount int) error {
	return s.productRepo.DecreaseProductQuantity(id, amount)
}

func (s *ProductService) DeleteProduct(id int) error {
	return s.productRepo.DeleteProduct(id)
}
