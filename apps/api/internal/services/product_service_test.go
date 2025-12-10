package services

import (
	"testing"

	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

// Mock ProductRepository for testing
type mockProductRepository struct {
	products     map[int]*models.Product
	productsBySlug map[string]*models.Product
	productsByRegion map[string][]models.Product
	productsByTags map[string][]models.Product
	allProducts  []models.Product
	createError  error
	getError     error
	updateError  error
	deleteError  error
}

func newMockProductRepository() *mockProductRepository {
	return &mockProductRepository{
		products:         make(map[int]*models.Product),
		productsBySlug:   make(map[string]*models.Product),
		productsByRegion: make(map[string][]models.Product),
		productsByTags:   make(map[string][]models.Product),
		allProducts:      []models.Product{},
	}
}

func (m *mockProductRepository) GetProducts(filters map[string]interface{}) ([]models.Product, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.allProducts, nil
}

func (m *mockProductRepository) CountProducts(filters map[string]interface{}) (int, error) {
	return len(m.allProducts), nil
}

func (m *mockProductRepository) GetProductBySlug(slug string) (*models.Product, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.productsBySlug[slug], nil
}

func (m *mockProductRepository) GetProductByID(id int) (*models.Product, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.products[id], nil
}

func (m *mockProductRepository) GetProductsByRegion(regionCode string) ([]models.Product, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	return m.productsByRegion[regionCode], nil
}

func (m *mockProductRepository) GetProductsByTags(tags []string) ([]models.Product, error) {
	if m.getError != nil {
		return nil, m.getError
	}
	// Simple mock: return products that match first tag
	if len(tags) > 0 {
		return m.productsByTags[tags[0]], nil
	}
	return []models.Product{}, nil
}

func (m *mockProductRepository) CreateProduct(product *models.Product) error {
	if m.createError != nil {
		return m.createError
	}
	product.ID = len(m.products) + 1
	m.products[product.ID] = product
	m.productsBySlug[product.Slug] = product
	m.allProducts = append(m.allProducts, *product)
	return nil
}

func (m *mockProductRepository) UpdateProduct(id int, product *models.Product) error {
	if m.updateError != nil {
		return m.updateError
	}
	if existing, ok := m.products[id]; ok {
		*existing = *product
		existing.ID = id
		m.productsBySlug[product.Slug] = existing
	}
	return nil
}

func (m *mockProductRepository) UpdateProductQuantity(id int, quantity int) error {
	if m.updateError != nil {
		return m.updateError
	}
	if product, ok := m.products[id]; ok {
		product.Quantity = quantity
	}
	return nil
}

func (m *mockProductRepository) DecreaseProductQuantity(id int, amount int) error {
	if m.updateError != nil {
		return m.updateError
	}
	if product, ok := m.products[id]; ok {
		product.Quantity -= amount
		if product.Quantity < 0 {
			product.Quantity = 0
		}
	}
	return nil
}

func (m *mockProductRepository) DeleteProduct(id int) error {
	if m.deleteError != nil {
		return m.deleteError
	}
	if product, ok := m.products[id]; ok {
		delete(m.products, id)
		delete(m.productsBySlug, product.Slug)
	}
	return nil
}

func TestProductService_GetProducts(t *testing.T) {
	repo := newMockProductRepository()
	service := NewProductService(repo)

	// Add test products
	testProducts := []models.Product{
		{ID: 1, Slug: "product-1", Title: "Product 1", PriceCents: 1000},
		{ID: 2, Slug: "product-2", Title: "Product 2", PriceCents: 2000},
	}
	repo.allProducts = testProducts

	products, total, err := service.GetProducts(map[string]interface{}{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(products) != 2 {
		t.Errorf("expected 2 products, got %d", len(products))
	}
	if total != 2 {
		t.Errorf("expected total 2, got %d", total)
	}
}

func TestProductService_GetProductBySlug(t *testing.T) {
	repo := newMockProductRepository()
	service := NewProductService(repo)

	testProduct := &models.Product{
		ID:    1,
		Slug:  "test-product",
		Title: "Test Product",
		PriceCents: 1000,
	}
	repo.productsBySlug["test-product"] = testProduct

	product, err := service.GetProductBySlug("test-product")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if product == nil {
		t.Fatal("expected product, got nil")
	}
	if product.Slug != "test-product" {
		t.Errorf("expected slug 'test-product', got %q", product.Slug)
	}

	// Test non-existent product
	product, err = service.GetProductBySlug("non-existent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if product != nil {
		t.Error("expected nil for non-existent product")
	}
}

func TestProductService_CreateProduct(t *testing.T) {
	repo := newMockProductRepository()
	service := NewProductService(repo)

	product := &models.Product{
		Slug:       "new-product",
		Title:      "New Product",
		PriceCents: 1500,
		Currency:   "RUB",
	}

	err := service.CreateProduct(product)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if product.ID == 0 {
		t.Error("expected product ID to be set")
	}

	// Verify product was created
	created, err := service.GetProductByID(product.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if created == nil {
		t.Fatal("expected created product, got nil")
	}
	if created.Slug != "new-product" {
		t.Errorf("expected slug 'new-product', got %q", created.Slug)
	}
}

func TestProductService_UpdateProduct(t *testing.T) {
	repo := newMockProductRepository()
	service := NewProductService(repo)

	// Create a product first
	product := &models.Product{
		Slug:       "test-product",
		Title:      "Test Product",
		PriceCents: 1000,
	}
	err := service.CreateProduct(product)
	if err != nil {
		t.Fatalf("failed to create product: %v", err)
	}

	// Update the product
	updatedProduct := &models.Product{
		Title:      "Updated Product",
		PriceCents: 2000,
	}
	err = service.UpdateProduct(product.ID, updatedProduct)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify update
	updated, err := service.GetProductByID(product.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.Title != "Updated Product" {
		t.Errorf("expected title 'Updated Product', got %q", updated.Title)
	}
	if updated.PriceCents != 2000 {
		t.Errorf("expected price 2000, got %d", updated.PriceCents)
	}
}

func TestProductService_UpdateProductQuantity(t *testing.T) {
	repo := newMockProductRepository()
	service := NewProductService(repo)

	product := &models.Product{
		Slug:     "test-product",
		Title:    "Test Product",
		Quantity: 10,
	}
	err := service.CreateProduct(product)
	if err != nil {
		t.Fatalf("failed to create product: %v", err)
	}

	// Update quantity
	err = service.UpdateProductQuantity(product.ID, 20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify update
	updated, err := service.GetProductByID(product.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.Quantity != 20 {
		t.Errorf("expected quantity 20, got %d", updated.Quantity)
	}
}

func TestProductService_DeleteProduct(t *testing.T) {
	repo := newMockProductRepository()
	service := NewProductService(repo)

	product := &models.Product{
		Slug:  "test-product",
		Title: "Test Product",
	}
	err := service.CreateProduct(product)
	if err != nil {
		t.Fatalf("failed to create product: %v", err)
	}

	// Delete product
	err = service.DeleteProduct(product.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify deletion
	deleted, err := service.GetProductByID(product.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if deleted != nil {
		t.Error("expected product to be deleted, but it still exists")
	}
}







