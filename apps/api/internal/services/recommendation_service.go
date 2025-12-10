package services

import (
	"strings"

	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type RecommendationService struct {
	productRepo *repository.ProductRepository
}

func NewRecommendationService(productRepo *repository.ProductRepository) *RecommendationService {
	return &RecommendationService{productRepo: productRepo}
}

func (s *RecommendationService) GetRecommendations(query string, tags []string) ([]models.Product, error) {
	if query != "" {
		return s.getRecommendationsByQuery(query)
	}
	if len(tags) > 0 {
		return s.productRepo.GetProductsByTags(tags)
	}
	return []models.Product{}, nil
}

func (s *RecommendationService) getRecommendationsByQuery(query string) ([]models.Product, error) {
	// Simple rule-based recommendation system
	// Extract tags from natural language query
	tags := s.extractTagsFromQuery(query)

	// Get products by tags
	products, err := s.productRepo.GetProductsByTags(tags)
	if err != nil {
		return nil, err
	}

	// If no products found by tags, try broader search
	if len(products) == 0 {
		// Search by query text in title/description
		filters := map[string]interface{}{
			"query": query,
		}
		products, err = s.productRepo.GetProducts(filters)
		if err != nil {
			return nil, err
		}
	}

	// If still no products, return popular products as fallback
	if len(products) == 0 {
		filters := map[string]interface{}{
			"page_size": 4,
			"page":      1,
		}
		products, err = s.productRepo.GetProducts(filters)
		if err != nil {
			return nil, err
		}
	}

	// Limit to 4 products
	if len(products) > 4 {
		products = products[:4]
	}

	return products, nil
}

func (s *RecommendationService) extractTagsFromQuery(query string) []string {
	query = strings.ToLower(query)
	var tags []string

	// Food type keywords
	foodTypes := map[string][]string{
		"cheese": {"cheese", "сыр"},
		"ham":    {"ham", "ветчина", "prosciutto"},
		"pasta":  {"pasta", "паста", "макароны"},
		"wine":   {"wine", "вино"},
		"bread":  {"bread", "хлеб"},
		"olive":  {"olive", "оливки"},
	}

	// Texture keywords
	textures := map[string][]string{
		"soft":    {"soft", "мягкий", "creamy", "кремовый"},
		"hard":    {"hard", "твердый", "aged", "выдержанный"},
		"crunchy": {"crunchy", "хрустящий", "crispy"},
		"melty":   {"melty", "плавящийся", "melted"},
	}

	// Flavor keywords
	flavors := map[string][]string{
		"salty":  {"salty", "соленый", "salt"},
		"sweet":  {"sweet", "сладкий", "sugar"},
		"bitter": {"bitter", "горький"},
		"umami":  {"umami", "умами", "savory"},
		"nutty":  {"nutty", "ореховый", "nuts"},
		"fruity": {"fruity", "фруктовый", "fruit"},
		"earthy": {"earthy", "земляной", "mushroomy", "грибной"},
	}

	// Cooking method keywords
	cooking := map[string][]string{
		"grated": {"grated", "тертый", "grating"},
		"melted": {"melted", "расплавленный", "melting"},
		"raw":    {"raw", "сырой", "fresh", "свежий"},
		"cured":  {"cured", "вяленый", "dried"},
	}

	// Check for food types
	for tag, keywords := range foodTypes {
		for _, keyword := range keywords {
			if strings.Contains(query, keyword) {
				tags = append(tags, tag)
				break
			}
		}
	}

	// Check for textures
	for tag, keywords := range textures {
		for _, keyword := range keywords {
			if strings.Contains(query, keyword) {
				tags = append(tags, tag)
				break
			}
		}
	}

	// Check for flavors
	for tag, keywords := range flavors {
		for _, keyword := range keywords {
			if strings.Contains(query, keyword) {
				tags = append(tags, tag)
				break
			}
		}
	}

	// Check for cooking methods
	for tag, keywords := range cooking {
		for _, keyword := range keywords {
			if strings.Contains(query, keyword) {
				tags = append(tags, tag)
				break
			}
		}
	}

	// Special combinations for better recommendations
	if strings.Contains(query, "pasta") || strings.Contains(query, "паста") {
		tags = append(tags, "grated", "hard", "italian", "umami")
	}
	if strings.Contains(query, "seafood") || strings.Contains(query, "морепродукты") {
		tags = append(tags, "salty", "umami")
	}
	if strings.Contains(query, "wine") || strings.Contains(query, "вино") {
		tags = append(tags, "cheese", "fruity", "aged", "soft")
	}
	if strings.Contains(query, "dessert") || strings.Contains(query, "десерт") {
		tags = append(tags, "sweet", "soft", "creamy")
	}
	if strings.Contains(query, "hard") || strings.Contains(query, "твердый") || strings.Contains(query, "выдержанный") {
		tags = append(tags, "aged", "hard", "grated")
	}
	if strings.Contains(query, "soft") || strings.Contains(query, "мягкий") || strings.Contains(query, "кремовый") {
		tags = append(tags, "soft", "creamy", "bloomy")
	}

	// Always add "italian" if mentioned
	if strings.Contains(query, "italian") || strings.Contains(query, "итальянский") || strings.Contains(query, "италия") {
		tags = append(tags, "italian")
	}
	if strings.Contains(query, "french") || strings.Contains(query, "французский") || strings.Contains(query, "франция") {
		tags = append(tags, "french")
	}

	return tags
}
