package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"gastroshop-api/internal/models"

	"github.com/lib/pq"
)

type ProductRepository struct {
	db *sql.DB
}

func NewProductRepository(db *sql.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) GetProducts(filters map[string]interface{}) ([]models.Product, error) {
	fmt.Printf("DEBUG: GetProducts called with filters: %+v\n", filters)
	fmt.Printf("DEBUG: Database connection: %+v\n", r.db)

	query := `
		SELECT id, slug, title, description, price_cents, currency, tags, region_code, images, in_stock, quantity, created_at
		FROM products
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	// Add filters
	if queryStr, ok := filters["query"].(string); ok && queryStr != "" {
		query += fmt.Sprintf(" AND (title ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+queryStr+"%")
		argIndex++
	}

	// Обработка фильтрации по категориям и тегам
	categoryTagMap := map[string][]string{
		"cheese":      {"cheese"},
		"deli":        {"ham", "cured"},
		"soft-cheese": {"cheese", "soft"},
		"hard-cheese": {"cheese", "hard"},
		"blue-cheese": {"cheese", "blue"},
		"aged-cheese": {"cheese", "aged"},
	}

	if categories, hasCategories := filters["categories"].([]string); hasCategories && len(categories) > 0 {
		// Фильтрация по категориям - каждая категория требует все свои теги
		var categoryConditions []string
		for _, cat := range categories {
			if catTags, exists := categoryTagMap[cat]; exists && len(catTags) > 0 {
				var catPlaceholders []string
				for _, tag := range catTags {
					catPlaceholders = append(catPlaceholders, fmt.Sprintf("$%d", argIndex))
					args = append(args, tag)
					argIndex++
				}
				// Продукт должен содержать все теги категории (используем @> для проверки "содержит все")
				catCondition := fmt.Sprintf("tags @> ARRAY[%s]", strings.Join(catPlaceholders, ","))
				categoryConditions = append(categoryConditions, catCondition)
			}
		}

		if len(categoryConditions) > 0 {
			// Категории объединяются через OR - продукт может соответствовать любой категории
			query += fmt.Sprintf(" AND (%s)", strings.Join(categoryConditions, " OR "))
		}
	}

	// Обычная фильтрация по тегам (если есть теги, не относящиеся к категориям)
	if tags, ok := filters["tags"].([]string); ok && len(tags) > 0 {
		// Исключаем теги, которые уже использованы в категориях
		var regularTags []string
		if categories, hasCategories := filters["categories"].([]string); hasCategories {
			usedInCategories := make(map[string]bool)
			for _, cat := range categories {
				if catTags, exists := categoryTagMap[cat]; exists {
					for _, tag := range catTags {
						usedInCategories[tag] = true
					}
				}
			}
			for _, tag := range tags {
				if !usedInCategories[tag] {
					regularTags = append(regularTags, tag)
				}
			}
		} else {
			regularTags = tags
		}

		if len(regularTags) > 0 {
			placeholders := make([]string, len(regularTags))
			for i, tag := range regularTags {
				placeholders[i] = fmt.Sprintf("$%d", argIndex)
				args = append(args, tag)
				argIndex++
			}
			query += fmt.Sprintf(" AND tags && ARRAY[%s]", strings.Join(placeholders, ","))
		}
	}

	if region, ok := filters["region"].(string); ok && region != "" {
		query += fmt.Sprintf(" AND region_code = $%d", argIndex)
		args = append(args, region)
		argIndex++
	}

	if priceMin, ok := filters["price_min"].(int); ok {
		query += fmt.Sprintf(" AND price_cents >= $%d", argIndex)
		args = append(args, priceMin)
		argIndex++
	}

	if priceMax, ok := filters["price_max"].(int); ok {
		query += fmt.Sprintf(" AND price_cents <= $%d", argIndex)
		args = append(args, priceMax)
		argIndex++
	}

	if inStock, ok := filters["in_stock"].(bool); ok {
		query += fmt.Sprintf(" AND in_stock = $%d", argIndex)
		args = append(args, inStock)
		argIndex++
	}

	// Add pagination
	page := 1
	pageSize := 20
	if p, ok := filters["page"].(int); ok && p > 0 {
		page = p
	}
	if ps, ok := filters["page_size"].(int); ok && ps > 0 {
		pageSize = ps
	}

	offset := (page - 1) * pageSize
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, pageSize, offset)

	fmt.Printf("DEBUG: Executing query: %s\n", query)
	fmt.Printf("DEBUG: With args: %+v\n", args)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		fmt.Printf("DEBUG: Query error: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(
			&p.ID, &p.Slug, &p.Title, &p.Description, &p.PriceCents, &p.Currency,
			pq.Array(&p.Tags), &p.RegionCode, pq.Array(&p.Images), &p.InStock, &p.Quantity, &p.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}

	return products, nil
}

func (r *ProductRepository) GetProductBySlug(slug string) (*models.Product, error) {
	// Try exact match first
	query := `
		SELECT id, slug, title, description, price_cents, currency, tags, region_code, images, in_stock, quantity, created_at
		FROM products
		WHERE LOWER(slug) = LOWER($1)
	`

	var p models.Product
	err := r.db.QueryRow(query, slug).Scan(
		&p.ID, &p.Slug, &p.Title, &p.Description, &p.PriceCents, &p.Currency,
		pq.Array(&p.Tags), &p.RegionCode, pq.Array(&p.Images), &p.InStock, &p.Quantity, &p.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &p, nil
}

func (r *ProductRepository) GetProductsByRegion(regionCode string) ([]models.Product, error) {
	query := `
		SELECT id, slug, title, description, price_cents, currency, tags, region_code, images, in_stock, quantity, created_at
		FROM products
		WHERE region_code = $1 AND in_stock = true
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, regionCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(
			&p.ID, &p.Slug, &p.Title, &p.Description, &p.PriceCents, &p.Currency,
			pq.Array(&p.Tags), &p.RegionCode, pq.Array(&p.Images), &p.InStock, &p.Quantity, &p.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}

	return products, nil
}

func (r *ProductRepository) GetProductsByTags(tags []string) ([]models.Product, error) {
	if len(tags) == 0 {
		return []models.Product{}, nil
	}

	placeholders := make([]string, len(tags))
	args := make([]interface{}, len(tags))
	for i, tag := range tags {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = tag
	}

	query := fmt.Sprintf(`
		SELECT id, slug, title, description, price_cents, currency, tags, region_code, images, in_stock, quantity, created_at
		FROM products
		WHERE tags && ARRAY[%s] AND in_stock = true
		ORDER BY created_at DESC
	`, strings.Join(placeholders, ","))

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(
			&p.ID, &p.Slug, &p.Title, &p.Description, &p.PriceCents, &p.Currency,
			pq.Array(&p.Tags), &p.RegionCode, pq.Array(&p.Images), &p.InStock, &p.Quantity, &p.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}

	return products, nil
}

// GetProductsByTagsRandom returns products matching tags in random order
func (r *ProductRepository) GetProductsByTagsRandom(tags []string, limit int, excludeIDs []int) ([]models.Product, error) {
	if len(tags) == 0 {
		return []models.Product{}, nil
	}

	if limit <= 0 {
		limit = 10
	}

	placeholders := make([]string, len(tags))
	args := make([]interface{}, len(tags))
	for i, tag := range tags {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = tag
	}

	argIndex := len(tags) + 1
	query := fmt.Sprintf(`
		SELECT id, slug, title, description, price_cents, currency, tags, region_code, images, in_stock, quantity, created_at
		FROM products
		WHERE tags && ARRAY[%s] AND in_stock = true
	`, strings.Join(placeholders, ","))

	// Add exclusion of product IDs if provided
	if len(excludeIDs) > 0 {
		excludePlaceholders := make([]string, len(excludeIDs))
		for i, id := range excludeIDs {
			excludePlaceholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, id)
			argIndex++
		}
		query += fmt.Sprintf(" AND id NOT IN (%s)", strings.Join(excludePlaceholders, ","))
	}

	// Order by random for variety
	query += fmt.Sprintf(" ORDER BY RANDOM() LIMIT $%d", argIndex)
	args = append(args, limit)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(
			&p.ID, &p.Slug, &p.Title, &p.Description, &p.PriceCents, &p.Currency,
			pq.Array(&p.Tags), &p.RegionCode, pq.Array(&p.Images), &p.InStock, &p.Quantity, &p.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}

	return products, nil
}

func (r *ProductRepository) CountProducts(filters map[string]interface{}) (int, error) {
	query := "SELECT COUNT(*) FROM products WHERE 1=1"
	args := []interface{}{}
	argIndex := 1

	// Add same filters as GetProducts
	if queryStr, ok := filters["query"].(string); ok && queryStr != "" {
		query += fmt.Sprintf(" AND (title ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+queryStr+"%")
		argIndex++
	}

	// Обработка фильтрации по категориям и тегам (та же логика, что в GetProducts)
	categoryTagMap := map[string][]string{
		"cheese":      {"cheese"},
		"deli":        {"ham", "cured"},
		"soft-cheese": {"cheese", "soft"},
		"hard-cheese": {"cheese", "hard"},
		"blue-cheese": {"cheese", "blue"},
		"aged-cheese": {"cheese", "aged"},
	}

	if categories, hasCategories := filters["categories"].([]string); hasCategories && len(categories) > 0 {
		var categoryConditions []string
		for _, cat := range categories {
			if catTags, exists := categoryTagMap[cat]; exists && len(catTags) > 0 {
				var catPlaceholders []string
				for _, tag := range catTags {
					catPlaceholders = append(catPlaceholders, fmt.Sprintf("$%d", argIndex))
					args = append(args, tag)
					argIndex++
				}
				catCondition := fmt.Sprintf("tags @> ARRAY[%s]", strings.Join(catPlaceholders, ","))
				categoryConditions = append(categoryConditions, catCondition)
			}
		}
		if len(categoryConditions) > 0 {
			query += fmt.Sprintf(" AND (%s)", strings.Join(categoryConditions, " OR "))
		}
	}

	if tags, ok := filters["tags"].([]string); ok && len(tags) > 0 {
		var regularTags []string
		if categories, hasCategories := filters["categories"].([]string); hasCategories {
			usedInCategories := make(map[string]bool)
			for _, cat := range categories {
				if catTags, exists := categoryTagMap[cat]; exists {
					for _, tag := range catTags {
						usedInCategories[tag] = true
					}
				}
			}
			for _, tag := range tags {
				if !usedInCategories[tag] {
					regularTags = append(regularTags, tag)
				}
			}
		} else {
			regularTags = tags
		}

		if len(regularTags) > 0 {
			placeholders := make([]string, len(regularTags))
			for i, tag := range regularTags {
				placeholders[i] = fmt.Sprintf("$%d", argIndex)
				args = append(args, tag)
				argIndex++
			}
			query += fmt.Sprintf(" AND tags && ARRAY[%s]", strings.Join(placeholders, ","))
		}
	}

	if region, ok := filters["region"].(string); ok && region != "" {
		query += fmt.Sprintf(" AND region_code = $%d", argIndex)
		args = append(args, region)
		argIndex++
	}

	if priceMin, ok := filters["price_min"].(int); ok {
		query += fmt.Sprintf(" AND price_cents >= $%d", argIndex)
		args = append(args, priceMin)
		argIndex++
	}

	if priceMax, ok := filters["price_max"].(int); ok {
		query += fmt.Sprintf(" AND price_cents <= $%d", argIndex)
		args = append(args, priceMax)
		argIndex++
	}

	if inStock, ok := filters["in_stock"].(bool); ok {
		query += fmt.Sprintf(" AND in_stock = $%d", argIndex)
		args = append(args, inStock)
		argIndex++
	}

	var count int
	err := r.db.QueryRow(query, args...).Scan(&count)
	return count, err
}

// Admin methods
func (r *ProductRepository) GetProductByID(id int) (*models.Product, error) {
	query := `
		SELECT id, slug, title, description, price_cents, currency, tags, region_code, images, in_stock, quantity, created_at
		FROM products
		WHERE id = $1
	`

	var p models.Product
	err := r.db.QueryRow(query, id).Scan(
		&p.ID, &p.Slug, &p.Title, &p.Description, &p.PriceCents, &p.Currency,
		pq.Array(&p.Tags), &p.RegionCode, pq.Array(&p.Images), &p.InStock, &p.Quantity, &p.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &p, nil
}

func (r *ProductRepository) CreateProduct(product *models.Product) error {
	query := `
		INSERT INTO products (slug, title, description, price_cents, currency, tags, region_code, images, in_stock, quantity)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`
	return r.db.QueryRow(
		query,
		product.Slug,
		product.Title,
		product.Description,
		product.PriceCents,
		product.Currency,
		pq.Array(product.Tags),
		product.RegionCode,
		pq.Array(product.Images),
		product.InStock,
		product.Quantity,
	).Scan(&product.ID, &product.CreatedAt)
}

func (r *ProductRepository) UpdateProduct(id int, product *models.Product) error {
	query := `
		UPDATE products
		SET title = $1, description = $2, price_cents = $3, currency = $4, tags = $5, 
		    region_code = $6, images = $7, in_stock = $8, quantity = $9
		WHERE id = $10
	`
	_, err := r.db.Exec(
		query,
		product.Title,
		product.Description,
		product.PriceCents,
		product.Currency,
		pq.Array(product.Tags),
		product.RegionCode,
		pq.Array(product.Images),
		product.InStock,
		product.Quantity,
		id,
	)
	return err
}

func (r *ProductRepository) UpdateProductQuantity(id int, quantity int) error {
	query := `UPDATE products SET quantity = $1, in_stock = ($1 > 0) WHERE id = $2`
	result, err := r.db.Exec(query, quantity, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("product with id %d not found", id)
	}

	return nil
}

func (r *ProductRepository) DecreaseProductQuantity(id int, amount int) error {
	// Use a subquery to calculate new quantity and update both fields
	query := `
		UPDATE products 
		SET quantity = new_qty,
		    in_stock = (new_qty > 0)
		FROM (SELECT GREATEST(0, quantity - $1) as new_qty FROM products WHERE id = $2) AS subq
		WHERE products.id = $2
	`
	_, err := r.db.Exec(query, amount, id)
	return err
}

func (r *ProductRepository) DeleteProduct(id int) error {
	query := `DELETE FROM products WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("product with id %d not found", id)
	}

	return nil
}
