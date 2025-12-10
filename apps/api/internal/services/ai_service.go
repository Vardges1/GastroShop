package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"gastroshop-api/internal/config"
	"gastroshop-api/internal/models"
	"gastroshop-api/internal/repository"
)

type AIService struct {
	config      *config.Config
	productRepo *repository.ProductRepository
	httpClient  *http.Client
}

func NewAIService(cfg *config.Config, productRepo *repository.ProductRepository) *AIService {
	return &AIService{
		config:      cfg,
		productRepo: productRepo,
		httpClient:  &http.Client{Timeout: 60 * time.Second},
	}
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float32       `json:"temperature,omitempty"`
}

type ChatResponse struct {
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type AIResponse struct {
	Message     string           `json:"message"`
	Products    []models.Product `json:"products,omitempty"`
	HasProducts bool             `json:"has_products"`
}

func (s *AIService) ChatWithAI(userMessage string, conversationHistory []ChatMessage) (*AIResponse, error) {
	// Get product catalog for context
	products, productsErr := s.productRepo.GetProducts(map[string]interface{}{
		"page_size": 50,
		"page":      1,
	})
	if productsErr != nil {
		log.Printf("Failed to get products for AI context: %v", productsErr)
		products = []models.Product{}
	}

	// Extract product IDs that were already recommended in conversation history
	excludeProductIDs := s.extractProductIDsFromHistory(conversationHistory)

	// Check if user is asking about previously recommended products or wants additional suggestions
	lastRecommendedProducts := s.extractProductsFromLastResponse(conversationHistory)
	isQuestionAboutPreviousProducts := s.isQuestionAboutPreviousProducts(userMessage)
	isRequestForMoreSuggestions := s.isRequestForMoreSuggestions(userMessage)

	// If user is asking about previous products, use them instead of searching new ones
	var recommendedProducts []models.Product
	if isQuestionAboutPreviousProducts && len(lastRecommendedProducts) > 0 {
		// User wants explanation of previous recommendations
		recommendedProducts = lastRecommendedProducts
		log.Printf("User is asking about previous products, using %d products from last response", len(recommendedProducts))
	} else if isRequestForMoreSuggestions {
		// User wants more suggestions - find different products, excluding previous ones
		log.Printf("User is asking for more suggestions, excluding %d previous products", len(excludeProductIDs))
		// Extract all previously recommended product IDs more thoroughly
		allPreviousIDs := s.extractAllProductIDsFromHistory(conversationHistory)
		recommendedProducts = s.findRelevantProducts(userMessage, allPreviousIDs)
		// If still no products, get random ones excluding previous
		if len(recommendedProducts) == 0 {
			recommendedProducts = s.getRandomDifferentProducts(allPreviousIDs, 4)
		}
	} else {
		// First, find relevant products based on user query with variety
		recommendedProducts = s.findRelevantProducts(userMessage, excludeProductIDs)
	}

	// Build system prompt with product context and selected products
	systemPrompt := s.buildSystemPrompt(products, recommendedProducts)

	// Build messages
	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
	}

	// Add conversation history (limit to last 10 messages to avoid token limits)
	historyStart := 0
	if len(conversationHistory) > 10 {
		historyStart = len(conversationHistory) - 10
	}
	messages = append(messages, conversationHistory[historyStart:]...)

	// Add current user message with context about selected products
	userPrompt := s.buildUserPromptWithProducts(userMessage, recommendedProducts)
	messages = append(messages, ChatMessage{
		Role:    "user",
		Content: userPrompt,
	})

	// If API key is not set, use fallback response
	if s.config.OpenAIAPIKey == "" {
		log.Printf("WARNING: OpenAI API key not set, using fallback response")
		return s.fallbackResponse(userMessage, recommendedProducts, conversationHistory)
	}

	// Call OpenAI API - this is the REAL AI response
	log.Printf("Calling OpenAI API with %d messages, %d recommended products", len(messages), len(recommendedProducts))
	response, err := s.callOpenAI(messages)
	if err != nil {
		log.Printf("OpenAI API error: %v, using fallback", err)
		return s.fallbackResponse(userMessage, recommendedProducts, conversationHistory)
	}

	log.Printf("OpenAI API response received: %d characters", len(response))

	// Remove all ** markdown formatting that AI might add despite instructions
	response = strings.ReplaceAll(response, "**", "")

	// Ensure we always return products if we found them
	if len(recommendedProducts) == 0 {
		// Try to extract from response as fallback
		recommendedProducts = s.extractProductsFromResponse(response, products)
	}

	return &AIResponse{
		Message:     response,
		Products:    recommendedProducts,
		HasProducts: len(recommendedProducts) > 0,
	}, nil
}

func (s *AIService) buildSystemPrompt(allProducts []models.Product, recommendedProducts []models.Product) string {
	prompt := `Ты - профессиональный гастрономический ассистент с глубокими знаниями в кулинарии и гастрономии, работающий в магазине премиальных сыров и деликатесов GastroShop. 

Твоя задача - не просто перечислять продукты, а ДУМАТЬ и АНАЛИЗИРОВАТЬ:
- Понимать СУТЬ запроса клиента, а не только искать ключевые слова
- Анализировать, какие продукты действительно подходят к запросу и ПОЧЕМУ
- Давать УМНЫЕ и ОБОСНОВАННЫЕ рекомендации с детальными объяснениями
- Рассказывать о вкусовых качествах, текстурах и происхождении продуктов
- Предлагать креативные сочетания продуктов

ТЫ НЕ РАБОТАЕШЬ ПО ШАБЛОНАМ! Ты анализируешь каждый запрос индивидуально и даешь персонализированный ответ.

ФОРМАТ ОТВЕТА:
Когда тебе предоставлены продукты для рекомендации, используй следующую структуру:
1. Начни с краткого введения, где ты анализируешь запрос клиента и объясняешь свою логику выбора
2. Для КАЖДОГО продукта укажи:
   - Название продукта (БЕЗ форматирования, просто текст)
   - Детальное объяснение ПОЧЕМУ именно этот продукт подходит (анализируй запрос и связывай с характеристиками продукта)
   - Его ключевые характеристики (вкус, текстура, происхождение) - будь конкретным и разнообразным
   - Как его лучше использовать в контексте запроса клиента
   - С какими блюдами/соусами он сочетается и почему это важно
3. Заверши общим выводом или практическим советом

ФОРМАТИРОВАНИЕ - ЗАПРЕЩЕНО АБСОЛЮТНО:
- ЗАПРЕЩЕНО использовать любые символы ** (двойные звездочки) в тексте
- ЗАПРЕЩЕНО использовать любые символы * (одинарные звездочки) для выделения
- ЗАПРЕЩЕНО использовать _ (подчеркивание) для выделения
- ЗАПРЕЩЕНО использовать # для заголовков
- ЗАПРЕЩЕНО использовать любой markdown или html форматирование
- ВСЕ тексты должны быть в ПРОСТОМ формате, только обычные буквы, цифры, знаки препинания
- Заголовки категорий пиши БЕЗ форматирования, например: "Мягкие сыры:" (БЕЗ **, БЕЗ *, БЕЗ #)
- Названия продуктов пиши БЕЗ форматирования, например: "Brie de Meaux AOP" (БЕЗ **, БЕЗ *, БЕЗ _)

КРИТИЧЕСКИ ВАЖНО:
- Если клиент спрашивает "почему именно эти?", "почему эти продукты?", "почему выбрал именно их?" - это значит, что продукты уже были рекомендованы ранее
- В таком случае тебе нужно ДЕТАЛЬНО объяснить логику выбора КАЖДОГО продукта
- Анализируй изначальный запрос клиента (например, "к супу") и объясняй, почему каждый продукт подходит именно к супу
- НЕ просто перечисляй продукты заново - ОБЪЯСНЯЙ свой выбор!
- Используй нумерованный список для каждого продукта (1., 2., 3., 4.)
- Название продукта должно быть простым текстом БЕЗ форматирования
- Формат: "1. Название продукта: Детальное объяснение..."
- Объяснения должны быть конкретными, аналитическими и РАЗНООБРАЗНЫМИ
- Будь дружелюбным, профессиональным, но при этом демонстрируй глубокие знания
- Варьируй свой стиль ответов - не используй одни и те же шаблоны
- Отвечай на русском языке
- ПОМНИ: НИКАКИХ ** ИЛИ * В ЛЮБОМ МЕСТЕ ТВОЕГО ОТВЕТА!`

	// Use allProducts instead of products
	products := allProducts

	// Add product catalog context
	if len(products) > 0 {
		prompt += "\n\nНаш ассортимент включает:\n"
		productStrs := []string{}
		for i, product := range products {
			if i >= 30 { // Limit to 30 products
				break
			}
			desc := fmt.Sprintf("- %s", product.Title)
			if product.Description != "" {
				desc += fmt.Sprintf(": %s", truncateString(product.Description, 100))
			}
			if len(product.Tags) > 0 {
				desc += fmt.Sprintf(" (теги: %s)", strings.Join(product.Tags, ", "))
			}
			if product.RegionCode != "" {
				desc += fmt.Sprintf(" [%s]", product.RegionCode)
			}
			productStrs = append(productStrs, desc)
		}
		prompt += strings.Join(productStrs, "\n")
	}

	// Add selected products section if we have recommendations
	if len(recommendedProducts) > 0 {
		prompt += "\n\n=== ПРОДУКТЫ ДЛЯ РЕКОМЕНДАЦИИ ===\n"
		prompt += "Следующие продукты из нашего ассортимента подходят под запрос клиента:\n"
		for i, product := range recommendedProducts {
			desc := fmt.Sprintf("%d. %s", i+1, product.Title)
			if product.Description != "" {
				desc += fmt.Sprintf(": %s", truncateString(product.Description, 150))
			}
			if len(product.Tags) > 0 {
				desc += fmt.Sprintf(" (теги: %s)", strings.Join(product.Tags, ", "))
			}
			if product.RegionCode != "" {
				desc += fmt.Sprintf(" [%s]", product.RegionCode)
			}
			prompt += desc + "\n"
		}
		prompt += "\nКРИТИЧЕСКИ ВАЖНО:\n"
		prompt += "- Если клиент задает вопрос про КОНКРЕТНЫЙ продукт (например 'а грана падано?', 'а как насчет пармиджано?'):\n"
		prompt += "  * СНАЧАЛА проверь, есть ли такой продукт в списке выше по названию\n"
		prompt += "  * Если продукт ЕСТЬ в списке - расскажи про него ДЕТАЛЬНО, опиши вкус, текстуру, характеристики\n"
		prompt += "  * Если продукта НЕТ в списке - честно скажи, что его нет в ассортименте, но предложи похожую альтернативу\n"
		prompt += "  * НЕ описывай все продукты подряд, если спросили про конкретный!\n"
		prompt += "- Если клиент спрашивает 'почему именно они?', 'почему эти?', 'почему именно эти продукты?', 'расскажи подробнее' - это КРИТИЧЕСКИ ВАЖНЫЙ вопрос!\n"
		prompt += "  * Клиент хочет понять ЛОГИКУ выбора продуктов, а не просто увидеть список заново\n"
		prompt += "  * Ты ДОЛЖЕН проанализировать изначальный запрос клиента из истории разговора (например, 'к супу', 'к шаурме') и объяснить:\n"
		prompt += "    * Почему каждый продукт подходит именно к этому запросу\n"
		prompt += "    * Какую роль он играет в контексте запроса (например, для супа - как его использовать: натереть сверху, добавить в тарелку, подать отдельно)\n"
		prompt += "    * Какие вкусовые сочетания создаются с этим блюдом\n"
		prompt += "    * Чем каждый продукт уникален и почему он был выбран среди других\n"
		prompt += "  * НЕ перечисляй продукты просто списком - АНАЛИЗИРУЙ и ОБЪЯСНЯЙ!\n"
		prompt += "  * Будь детальным, конкретным и убедительным\n"
		prompt += "- Для ОБЩИХ запросов (не про конкретный продукт) - упомяни КАЖДЫЙ продукт из списка и объясни ПОЧЕМУ он подходит\n"
		prompt += "- Используй формат: '1. Название продукта: Объяснение...' для каждого продукта\n"
		prompt += "- ЗАПРЕЩЕНО абсолютно использовать символы ** или * в любом месте ответа!\n"
		prompt += "- ЗАПРЕЩЕНО использовать любые символы выделения: **, *, _, #\n"
		prompt += "- Названия продуктов пиши ПРОСТЫМ ТЕКСТОМ: '1. Пармиджано Реджано: ...' (БЕЗ звездочек, БЕЗ любого форматирования!)\n"
		prompt += "- Даже если ты хочешь выделить категорию, пиши просто словами БЕЗ символов: 'Мягкие сыры:' (НЕ '**Мягкие сыры**'!)\n"
		prompt += "- Будь конкретным и детальным в объяснениях, варьируй формулировки\n"
		prompt += "- ЕСЛИ в твоем ответе появится хотя бы один символ ** или * - ты НЕВЕРНО выполнил задачу!\n"
	}

	return prompt
}

func (s *AIService) buildUserPromptWithProducts(userMessage string, products []models.Product) string {
	if len(products) > 0 {
		// Check if user is asking about previously recommended products
		messageLower := strings.ToLower(userMessage)
		isQuestionAboutPrevious := s.isQuestionAboutPreviousProducts(userMessage)

		if isQuestionAboutPrevious {
			// User is asking about previously recommended products - THIS IS CRITICAL!
			prompt := fmt.Sprintf("%s\n\nВАЖНО: Клиент задает вопрос про продукты, которые были рекомендованы в ПРЕДЫДУЩЕМ ответе. Это значит, что клиент хочет понять ЛОГИКУ твоего выбора, а не просто увидеть список продуктов заново.\n\n", userMessage)
			prompt += "Вот продукты, которые были рекомендованы:\n"
			for i, p := range products {
				prompt += fmt.Sprintf("%d. %s", i+1, p.Title)
				if p.Description != "" {
					prompt += fmt.Sprintf(": %s", truncateString(p.Description, 150))
				}
				if len(p.Tags) > 0 {
					prompt += fmt.Sprintf(" (теги: %s)", strings.Join(p.Tags, ", "))
				}
				prompt += "\n"
			}
			prompt += "\nТЫ ДОЛЖЕН:\n"
			prompt += "1. Проанализировать изначальный запрос клиента из истории разговора (посмотри предыдущие сообщения)\n"
			prompt += "2. Для КАЖДОГО продукта детально объяснить:\n"
			prompt += "   - Почему именно этот продукт подходит к изначальному запросу (например, 'к супу')\n"
			prompt += "   - Какую роль он играет (как его использовать с этим блюдом: натереть, добавить, подать отдельно)\n"
			prompt += "   - Какие вкусовые сочетания он создает\n"
			prompt += "   - Чем он уникален и почему был выбран среди других продуктов\n"
			prompt += "3. Быть конкретным, убедительным и демонстрировать глубокие знания гастрономии\n"
			prompt += "4. НЕ просто перечислять характеристики - объяснять СВЯЗЬ между запросом и продуктом\n"
			prompt += "5. Использовать разные формулировки для каждого продукта\n\n"
			prompt += "НАЧНИ С АНАЛИЗА изначального запроса, затем объясни каждый продукт детально.\n"
			return prompt
		}

		// Check if user is asking about a specific product (like "а грана падано?")
		isQuestionAboutProduct := strings.HasPrefix(strings.TrimSpace(messageLower), "а ") ||
			strings.Contains(messageLower, "?") ||
			strings.Contains(messageLower, "как") ||
			strings.Contains(messageLower, "что")

		if isQuestionAboutProduct {
			// For specific questions, provide products with context
			prompt := fmt.Sprintf("%s\n\nВот продукты из нашего ассортимента, которые могут быть полезны для ответа:\n", userMessage)
			for i, p := range products {
				prompt += fmt.Sprintf("%d. %s", i+1, p.Title)
				if p.Description != "" {
					prompt += fmt.Sprintf(": %s", truncateString(p.Description, 100))
				}
				prompt += "\n"
			}
			prompt += "\nЕсли клиент спрашивает про конкретный продукт из списка - расскажи про него детально. "
			prompt += "Если продукта нет в списке - честно скажи, что его нет у нас, но предложи похожие альтернативы из списка выше.\n"
			prompt += "Отвечай на конкретный вопрос клиента, а не просто описывай все продукты.\n"
			return prompt
		}

		// For general recommendations
		prompt := fmt.Sprintf("%s\n\nПожалуйста, рекомендую следующие продукты и объясни свой выбор для каждого:\n", userMessage)
		for i, p := range products {
			prompt += fmt.Sprintf("%d. %s\n", i+1, p.Title)
		}
		prompt += "\nДля каждого продукта объясни:\n"
		prompt += "- Почему именно этот продукт подходит под запрос\n"
		prompt += "- Его ключевые характеристики (вкус, текстура, происхождение)\n"
		prompt += "- Как его лучше использовать (натирать, плавить, подавать и т.д.)\n"
		prompt += "- С какими блюдами/соусами он сочетается\n"
		return prompt
	}
	return userMessage
}

// extractProductIDsFromHistory extracts product IDs that were mentioned in conversation history
func (s *AIService) extractProductIDsFromHistory(conversationHistory []ChatMessage) []int {
	var productIDs []int
	seen := make(map[int]bool)

	// Get all products to match against
	allProducts, err := s.productRepo.GetProducts(map[string]interface{}{
		"page_size": 100,
		"page":      1,
	})
	if err != nil {
		return productIDs
	}

	// Check conversation history for product mentions
	for _, msg := range conversationHistory {
		content := strings.ToLower(msg.Content)
		for _, product := range allProducts {
			if !seen[product.ID] {
				productTitleLower := strings.ToLower(product.Title)
				// Check if product name appears in message
				for _, word := range strings.Fields(productTitleLower) {
					if len(word) > 3 && strings.Contains(content, word) {
						productIDs = append(productIDs, product.ID)
						seen[product.ID] = true
						break
					}
				}
			}
		}
	}

	return productIDs
}

// extractProductsFromLastResponse extracts products from the last assistant message in conversation
func (s *AIService) extractProductsFromLastResponse(conversationHistory []ChatMessage) []models.Product {
	// Find last assistant message
	var lastAssistantMessage string
	for i := len(conversationHistory) - 1; i >= 0; i-- {
		if conversationHistory[i].Role == "assistant" {
			lastAssistantMessage = conversationHistory[i].Content
			break
		}
	}

	if lastAssistantMessage == "" {
		return []models.Product{}
	}

	// Get all products to match against
	allProducts, err := s.productRepo.GetProducts(map[string]interface{}{
		"page_size": 100,
		"page":      1,
	})
	if err != nil {
		return []models.Product{}
	}

	// Extract products mentioned in the last response
	var foundProducts []models.Product
	seen := make(map[int]bool)
	messageLower := strings.ToLower(lastAssistantMessage)

	// First, try to find products by exact title match (for numbered lists like "1. Product Name")
	lines := strings.Split(lastAssistantMessage, "\n")
	for _, line := range lines {
		lineLower := strings.ToLower(strings.TrimSpace(line))
		// Check if line starts with number (like "1. Product Name" or "1. **Product Name**")
		if strings.HasPrefix(lineLower, "1.") || strings.HasPrefix(lineLower, "2.") ||
			strings.HasPrefix(lineLower, "3.") || strings.HasPrefix(lineLower, "4.") {
			// Remove number prefix and clean up
			cleanedLine := strings.TrimSpace(lineLower)
			for strings.HasPrefix(cleanedLine, "1.") || strings.HasPrefix(cleanedLine, "2.") ||
				strings.HasPrefix(cleanedLine, "3.") || strings.HasPrefix(cleanedLine, "4.") {
				if len(cleanedLine) > 2 {
					cleanedLine = strings.TrimSpace(cleanedLine[2:])
				} else {
					break
				}
			}
			// Remove markdown formatting if present
			cleanedLine = strings.Trim(cleanedLine, "* ")
			cleanedLine = strings.TrimSpace(cleanedLine)

			// Try to match with product titles
			for _, product := range allProducts {
				if !seen[product.ID] {
					productTitleLower := strings.ToLower(product.Title)
					// Check for exact match or if line starts with product name
					if cleanedLine == productTitleLower || strings.HasPrefix(cleanedLine, productTitleLower) {
						foundProducts = append(foundProducts, product)
						seen[product.ID] = true
						break
					}
				}
			}
		}
	}

	// If we didn't find enough products, try fuzzy matching by keywords
	if len(foundProducts) < 2 {
		for _, product := range allProducts {
			if !seen[product.ID] && len(foundProducts) < 4 {
				productTitleLower := strings.ToLower(product.Title)
				// Check if product name or significant parts appear in message
				titleWords := strings.Fields(productTitleLower)
				if len(titleWords) > 0 {
					// Check if at least one significant word from title appears
					for _, word := range titleWords {
						if len(word) > 3 {
							// Check for word match (with word boundaries)
							wordPattern := " " + word + " "
							if strings.Contains(messageLower, wordPattern) ||
								strings.HasPrefix(messageLower, word+" ") ||
								strings.HasSuffix(messageLower, " "+word) ||
								strings.Contains(messageLower, word+" -") ||
								strings.Contains(messageLower, word+":") {
								foundProducts = append(foundProducts, product)
								seen[product.ID] = true
								break
							}
						}
					}
				}
			}
		}
	}

	return foundProducts
}

// isRequestForMoreSuggestions checks if user wants additional/different suggestions
func (s *AIService) isRequestForMoreSuggestions(userMessage string) bool {
	message := strings.ToLower(strings.TrimSpace(userMessage))

	patterns := []string{
		"что еще",
		"что еще посоветуешь",
		"что еще посоветуете",
		"что еще можно",
		"еще что-нибудь",
		"еще что нибудь",
		"другие варианты",
		"другие продукты",
		"еще варианты",
		"еще продукты",
		"посоветуй еще",
		"порекомендуй еще",
		"что еще добавить",
		"что еще подойдет",
		"what else",
		"anything else",
		"other suggestions",
		"more options",
	}

	for _, pattern := range patterns {
		if strings.Contains(message, pattern) {
			return true
		}
	}

	return false
}

// extractAllProductIDsFromHistory extracts ALL product IDs from entire conversation history
func (s *AIService) extractAllProductIDsFromHistory(conversationHistory []ChatMessage) []int {
	var productIDs []int
	seen := make(map[int]bool)

	// Get all products to match against
	allProducts, err := s.productRepo.GetProducts(map[string]interface{}{
		"page_size": 100,
		"page":      1,
	})
	if err != nil {
		return productIDs
	}

	// Check ALL conversation history for product mentions
	for _, msg := range conversationHistory {
		content := strings.ToLower(msg.Content)
		for _, product := range allProducts {
			if !seen[product.ID] {
				productTitleLower := strings.ToLower(product.Title)
				// Check if product name appears in message
				for _, word := range strings.Fields(productTitleLower) {
					if len(word) > 3 && strings.Contains(content, word) {
						productIDs = append(productIDs, product.ID)
						seen[product.ID] = true
						break
					}
				}
			}
		}
	}

	return productIDs
}

// getRandomDifferentProducts gets random products excluding specified IDs
func (s *AIService) getRandomDifferentProducts(excludeIDs []int, limit int) []models.Product {
	allProducts, err := s.productRepo.GetProducts(map[string]interface{}{
		"page_size": 50,
		"page":      1,
	})
	if err != nil {
		log.Printf("Error getting products for random selection: %v", err)
		return []models.Product{}
	}

	excludedMap := make(map[int]bool)
	for _, id := range excludeIDs {
		excludedMap[id] = true
	}

	var filteredProducts []models.Product
	for _, p := range allProducts {
		if !excludedMap[p.ID] && p.InStock {
			filteredProducts = append(filteredProducts, p)
		}
	}

	if len(filteredProducts) == 0 {
		// If all products are excluded, return any available products
		for _, p := range allProducts {
			if p.InStock {
				filteredProducts = append(filteredProducts, p)
			}
		}
	}

	// Shuffle for variety
	if len(filteredProducts) > 0 {
		rand.Seed(time.Now().UnixNano())
		rand.Shuffle(len(filteredProducts), func(i, j int) {
			filteredProducts[i], filteredProducts[j] = filteredProducts[j], filteredProducts[i]
		})

		if len(filteredProducts) > limit {
			return filteredProducts[:limit]
		}
		return filteredProducts
	}

	return []models.Product{}
}

// isQuestionAboutPreviousProducts checks if user is asking about previously recommended products
func (s *AIService) isQuestionAboutPreviousProducts(userMessage string) bool {
	message := strings.ToLower(strings.TrimSpace(userMessage))

	// Patterns that indicate user is asking about previous recommendations
	questionPatterns := []string{
		"почему именно",
		"почему они",
		"почему эти",
		"почему именно они",
		"почему именно эти",
		"расскажи подробнее",
		"расскажи подробнее про",
		"расскажи про них",
		"расскажи о них",
		"что про них",
		"что о них",
		"что насчет них",
		"а что про них",
		"а что о них",
		"а почему они",
		"а почему эти",
		"объясни почему",
		"объясни зачем",
		"чем они",
		"чем эти",
		"в чем их",
		"зачем они",
		"зачем эти",
		"чем хороши",
		"чем отличаются",
		"почему выбрал",
		"почему выбрали",
		"почему такие",
	}

	// Strong patterns that almost certainly indicate question about previous products
	strongPatterns := []string{
		"почему именно они",
		"почему именно эти",
		"почему они",
		"почему эти",
		"расскажи подробнее про них",
		"что про них",
	}

	// Check strong patterns first
	for _, pattern := range strongPatterns {
		if strings.Contains(message, pattern) {
			return true
		}
	}

	// Check other patterns
	for _, pattern := range questionPatterns {
		if strings.Contains(message, pattern) {
			// Check if it's a short question (likely about previous products)
			words := strings.Fields(message)
			if len(words) <= 10 {
				return true
			}
			// For longer messages, check if it doesn't contain product-specific keywords
			hasProductKeyword := false
			productKeywords := []string{"сыр", "cheese", "ветчина", "ham", "хамон", "итальянск", "italian", "французск", "french", "пармезан", "parmigiano", "грана", "grana", "пармиджан", "трюфель", "truffle", "песто", "pesto", "чоризо", "chorizo"}
			for _, keyword := range productKeywords {
				if strings.Contains(message, keyword) {
					hasProductKeyword = true
					break
				}
			}
			// If question pattern found but no specific product mentioned, likely about previous recommendations
			if !hasProductKeyword {
				return true
			}
		}
	}

	return false
}

// extractTagsFromDishQuery extracts relevant tags based on dish/meal mentioned in query
func (s *AIService) extractTagsFromDishQuery(message string) []string {
	messageLower := strings.ToLower(message)
	var tags []string

	// Dish to tag mappings
	dishMappings := map[string][]string{
		"шаурма":      {"соус", "sauce", "мясо", "meat", "колбаса", "овощ"},
		"shawarma":    {"соус", "sauce", "мясо", "meat", "колбаса"},
		"шаверма":     {"соус", "sauce", "мясо", "meat", "колбаса"},
		"бургер":      {"сыр", "cheese", "мясо", "meat", "соус", "sauce"},
		"burger":      {"сыр", "cheese", "мясо", "meat", "соус", "sauce"},
		"пицца":       {"сыр", "cheese", "итальянск", "italian", "соус", "sauce"},
		"pizza":       {"сыр", "cheese", "итальянск", "italian", "соус", "sauce"},
		"салат":       {"сыр", "cheese", "овощ", "соус", "sauce"},
		"salad":       {"сыр", "cheese", "овощ", "соус", "sauce"},
		"ризотто":     {"сыр", "cheese", "итальянск", "italian", "hard", "grated"},
		"risotto":     {"сыр", "cheese", "итальянск", "italian", "hard", "grated"},
		"лазанья":     {"сыр", "cheese", "итальянск", "italian"},
		"lasagna":     {"сыр", "cheese", "итальянск", "italian"},
		"тапас":       {"хамон", "ham", "сыр", "cheese", "испания"},
		"tapas":       {"хамон", "ham", "сыр", "cheese", "испания"},
		"стейк":       {"сыр", "cheese", "соус", "sauce"},
		"steak":       {"сыр", "cheese", "соус", "sauce"},
		"рыба":        {"сыр", "cheese", "соус", "sauce", "лимон"},
		"fish":        {"сыр", "cheese", "соус", "sauce"},
		"морепродукт": {"сыр", "cheese", "соус", "sauce"},
		"seafood":     {"сыр", "cheese", "соус", "sauce"},
		"паста":       {"сыр", "cheese", "итальянск", "italian", "hard", "grated", "соус", "sauce"},
		"pasta":       {"сыр", "cheese", "итальянск", "italian", "hard", "grated", "соус", "sauce"},
		"суп":         {"сыр", "cheese", "соус", "sauce"},
		"soup":        {"сыр", "cheese", "соус", "sauce"},
		"чипс":        {"соус", "sauce", "сыр", "cheese", "оливки"},
		"чипсы":       {"соус", "sauce", "сыр", "cheese", "оливки"},
		"chip":        {"соус", "sauce", "сыр", "cheese", "оливки"},
		"chips":       {"соус", "sauce", "сыр", "cheese", "оливки"},
	}

	for dish, dishTags := range dishMappings {
		if strings.Contains(messageLower, dish) {
			tags = append(tags, dishTags...)
			break
		}
	}

	// Remove duplicates
	if len(tags) > 0 {
		seen := make(map[string]bool)
		uniqueTags := []string{}
		for _, tag := range tags {
			if !seen[tag] {
				seen[tag] = true
				uniqueTags = append(uniqueTags, tag)
			}
		}
		return uniqueTags
	}

	return []string{}
}

// isGenericRequest checks if user is asking for general recommendations
func (s *AIService) isGenericRequest(message string) bool {
	messageLower := strings.ToLower(message)
	genericPatterns := []string{
		"любые продукты",
		"любой продукт",
		"что посоветуешь",
		"что посоветуете",
		"что рекомендуешь",
		"что порекомендуешь",
		"что у вас есть",
		"что есть",
		"покажи продукты",
		"покажи что есть",
		"любые",
		"что-нибудь",
		"что нибудь",
		"посоветуй",
		"порекомендуй",
		"любой",
		"любые",
		"random",
		"any products",
		"what do you recommend",
		"what would you recommend",
	}

	for _, pattern := range genericPatterns {
		if strings.Contains(messageLower, pattern) {
			return true
		}
	}

	return false
}

func (s *AIService) findRelevantProducts(userMessage string, excludeProductIDs []int) []models.Product {
	message := strings.ToLower(userMessage)
	var products []models.Product
	var err error

	// First, try to find specific product names in the message
	// Get all products to check against
	allProducts, err := s.productRepo.GetProducts(map[string]interface{}{
		"page_size": 100,
		"page":      1,
	})
	if err != nil {
		log.Printf("Error getting all products: %v", err)
		allProducts = []models.Product{}
	}

	// Try to find exact product matches in the message
	var matchedProducts []models.Product
	for _, product := range allProducts {
		// Skip excluded products
		isExcluded := false
		for _, excludedID := range excludeProductIDs {
			if product.ID == excludedID {
				isExcluded = true
				break
			}
		}
		if isExcluded {
			continue
		}

		productTitleLower := strings.ToLower(product.Title)
		// Check if product name or part of it is mentioned
		words := strings.Fields(message)
		for _, word := range words {
			if len(word) > 3 && strings.Contains(productTitleLower, word) {
				matchedProducts = append(matchedProducts, product)
				break
			}
		}
		// Also check full product name
		for _, word := range strings.Fields(productTitleLower) {
			if len(word) > 3 && strings.Contains(message, word) {
				// Check if not already added
				found := false
				for _, mp := range matchedProducts {
					if mp.ID == product.ID {
						found = true
						break
					}
				}
				if !found {
					matchedProducts = append(matchedProducts, product)
				}
				break
			}
		}
	}

	// If we found specific products, return them (shuffled for variety)
	if len(matchedProducts) > 0 {
		// Shuffle for variety
		rand.Seed(time.Now().UnixNano())
		rand.Shuffle(len(matchedProducts), func(i, j int) {
			matchedProducts[i], matchedProducts[j] = matchedProducts[j], matchedProducts[i]
		})
		if len(matchedProducts) > 4 {
			return matchedProducts[:4]
		}
		return matchedProducts
	}

	// Otherwise, use category-based search with randomization
	var tags []string

	// Check for dish/meal combinations first
	dishTags := s.extractTagsFromDishQuery(message)
	if len(dishTags) > 0 {
		tags = dishTags
	} else if strings.Contains(message, "сыр") || strings.Contains(message, "cheese") {
		tags = []string{"cheese"}
	} else if strings.Contains(message, "ветчина") || strings.Contains(message, "ham") || strings.Contains(message, "хамон") {
		tags = []string{"ham"}
	} else if strings.Contains(message, "итальян") || strings.Contains(message, "italian") {
		tags = []string{"italian"}
	} else if strings.Contains(message, "француз") || strings.Contains(message, "french") {
		tags = []string{"french"}
	} else if strings.Contains(message, "вино") || strings.Contains(message, "wine") {
		// For wine, recommend aged cheeses
		tags = []string{"aged", "cheese"}
	} else if strings.Contains(message, "паст") || strings.Contains(message, "pasta") {
		// For pasta, recommend hard cheeses
		tags = []string{"hard", "grated", "italian"}
	} else if s.isGenericRequest(message) {
		// For generic requests like "любые продукты", "что посоветуешь", return random variety
		tags = []string{} // Empty tags means we'll use fallback random products
	} else {
		// Try full-text search with randomization
		filters := map[string]interface{}{
			"query": userMessage,
		}
		allResults, err := s.productRepo.GetProducts(filters)
		if err != nil {
			log.Printf("Error finding relevant products: %v", err)
			allResults = []models.Product{}
		}

		// Filter out excluded products and shuffle
		var filteredResults []models.Product
		excludedMap := make(map[int]bool)
		for _, id := range excludeProductIDs {
			excludedMap[id] = true
		}
		for _, p := range allResults {
			if !excludedMap[p.ID] {
				filteredResults = append(filteredResults, p)
			}
		}

		// Shuffle for variety
		rand.Seed(time.Now().UnixNano())
		rand.Shuffle(len(filteredResults), func(i, j int) {
			filteredResults[i], filteredResults[j] = filteredResults[j], filteredResults[i]
		})

		if len(filteredResults) > 4 {
			return filteredResults[:4]
		}
		return filteredResults
	}

	// Use randomized tag-based search
	if len(tags) > 0 {
		products, err = s.productRepo.GetProductsByTagsRandom(tags, 10, excludeProductIDs)
		if err != nil {
			log.Printf("Error finding relevant products by tags: %v", err)
			products = []models.Product{}
		}
		log.Printf("Found %d products by tags %v", len(products), tags)
	}

	// If no products found, get some random products (excluding already recommended)
	// This handles cases where:
	// 1. Tags were specified but no products match
	// 2. No tags were specified and full-text search found nothing
	// 3. Generic request like "любые продукты"
	if len(products) == 0 {
		// Get more products for better variety in fallback
		allProducts, err := s.productRepo.GetProducts(map[string]interface{}{
			"page_size": 50,
			"page":      1,
		})
		if err != nil {
			log.Printf("Error getting fallback products: %v", err)
			// Last resort: try to get any products at all
			allProducts, err = s.productRepo.GetProducts(map[string]interface{}{
				"page_size": 10,
				"page":      1,
			})
			if err != nil {
				log.Printf("Critical error getting any products: %v", err)
				return []models.Product{}
			}
		}

		// Filter out excluded products and shuffle
		var filteredProducts []models.Product
		excludedMap := make(map[int]bool)
		for _, id := range excludeProductIDs {
			excludedMap[id] = true
		}
		for _, p := range allProducts {
			if !excludedMap[p.ID] && p.InStock {
				filteredProducts = append(filteredProducts, p)
			}
		}

		// If still no products, return all available (even if excluded)
		if len(filteredProducts) == 0 {
			for _, p := range allProducts {
				if p.InStock {
					filteredProducts = append(filteredProducts, p)
				}
			}
		}

		// Shuffle for variety
		if len(filteredProducts) > 0 {
			rand.Seed(time.Now().UnixNano())
			rand.Shuffle(len(filteredProducts), func(i, j int) {
				filteredProducts[i], filteredProducts[j] = filteredProducts[j], filteredProducts[i]
			})

			if len(filteredProducts) > 4 {
				return filteredProducts[:4]
			}
			return filteredProducts
		}

		// Final fallback: return empty, but this should rarely happen
		log.Printf("Warning: No products available at all")
		return []models.Product{}
	}

	// Limit to 4 products
	if len(products) > 4 {
		products = products[:4]
	}

	return products
}

func (s *AIService) callOpenAI(messages []ChatMessage) (string, error) {
	reqBody := ChatRequest{
		Model:       "gpt-4o-mini",
		Messages:    messages,
		MaxTokens:   2000,
		Temperature: 0.7,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %v", err)
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.config.OpenAIAPIKey))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenAI API error: %s", string(body))
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %v", err)
	}

	if chatResp.Error != nil {
		return "", fmt.Errorf("OpenAI API error: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	return chatResp.Choices[0].Message.Content, nil
}

func (s *AIService) extractProductsFromResponse(response string, products []models.Product) []models.Product {
	var recommendedProducts []models.Product
	responseLower := strings.ToLower(response)

	// Try to find product names in the response
	for _, product := range products {
		productTitleLower := strings.ToLower(product.Title)
		if strings.Contains(responseLower, productTitleLower) {
			// Check if not already added
			found := false
			for _, rp := range recommendedProducts {
				if rp.ID == product.ID {
					found = true
					break
				}
			}
			if !found {
				recommendedProducts = append(recommendedProducts, product)
			}
		}
	}

	// Limit to 4 products
	if len(recommendedProducts) > 4 {
		recommendedProducts = recommendedProducts[:4]
	}

	return recommendedProducts
}

func (s *AIService) fallbackResponse(userMessage string, products []models.Product, conversationHistory []ChatMessage) (*AIResponse, error) {
	// Use provided products or try to find some
	if len(products) == 0 {
		products = s.findRelevantProducts(userMessage, []int{})
	}

	isQuestionAboutPrevious := s.isQuestionAboutPreviousProducts(userMessage)
	isRequestForMore := s.isRequestForMoreSuggestions(userMessage)

	var responseText string

	if isRequestForMore && len(products) > 0 {
		// User wants more suggestions
		responseText = "Конечно! Вот еще несколько отличных вариантов:\n\n"
		for i, product := range products {
			responseText += fmt.Sprintf("%d. %s", i+1, product.Title)
			if product.Description != "" {
				responseText += fmt.Sprintf(" - %s", truncateString(product.Description, 100))
			}
			if len(product.Tags) > 0 {
				responseText += fmt.Sprintf(" (теги: %s)", strings.Join(product.Tags, ", "))
			}
			responseText += "\n"
		}
		responseText += "\nЭти продукты также отлично подойдут и добавят разнообразия к вашему выбору."
	} else if isQuestionAboutPrevious && len(products) > 0 {
		// If asking why these products were chosen, try to get context from history
		originalQuery := s.extractOriginalQueryFromHistory(conversationHistory)
		responseText = "Конечно! Позвольте объяснить логику выбора этих продуктов"
		if originalQuery != "" {
			responseText += fmt.Sprintf(" для запроса '%s'", originalQuery)
		}
		responseText += ":\n\n"
		for i, product := range products {
			responseText += fmt.Sprintf("%d. %s", i+1, product.Title)
			if product.Description != "" {
				responseText += fmt.Sprintf(" - %s", truncateString(product.Description, 120))
			}
			responseText += "\n"
			// Add brief explanation why it was chosen based on tags and description
			explanation := s.generateFallbackExplanation(product, originalQuery)
			if explanation != "" {
				responseText += fmt.Sprintf("   %s\n", explanation)
			}
			responseText += "\n"
		}
		responseText += "Каждый из этих продуктов был выбран потому, что он создает гармоничные вкусовые сочетания и дополняет ваш запрос своими уникальными качествами."
	} else if len(products) > 0 {
		// Regular recommendation
		responseText = "Я подобрал для вас следующие продукты из нашего ассортимента:\n\n"
		for i, product := range products {
			responseText += fmt.Sprintf("%d. %s", i+1, product.Title)
			if product.Description != "" {
				responseText += fmt.Sprintf(" - %s", truncateString(product.Description, 100))
			}
			if len(product.Tags) > 0 {
				responseText += fmt.Sprintf(" (теги: %s)", strings.Join(product.Tags, ", "))
			}
			responseText += "\n"
		}
		responseText += "\nЭти продукты были выбраны на основе вашего запроса. Каждый из них имеет уникальные вкусовые качества и может отлично дополнить ваш гастрономический опыт."
	} else {
		responseText = "К сожалению, не удалось найти подходящие продукты. Попробуйте уточнить ваш запрос, например: 'сыры', 'ветчина', 'итальянские продукты'."
	}

	return &AIResponse{
		Message:     responseText,
		Products:    products,
		HasProducts: len(products) > 0,
	}, nil
}

// extractOriginalQueryFromHistory tries to find the original user query in conversation history
func (s *AIService) extractOriginalQueryFromHistory(conversationHistory []ChatMessage) string {
	// Look for first user message that looks like a query (not a question about previous recommendations)
	for i := len(conversationHistory) - 1; i >= 0; i-- {
		msg := conversationHistory[i]
		if msg.Role == "user" {
			content := strings.ToLower(msg.Content)
			// Skip questions about previous recommendations
			if !s.isQuestionAboutPreviousProducts(msg.Content) &&
				!s.isRequestForMoreSuggestions(msg.Content) &&
				(strings.Contains(content, "посовету") ||
					strings.Contains(content, "рекоменд") ||
					strings.Contains(content, "что") ||
					strings.Contains(content, "какой")) {
				return msg.Content
			}
		}
	}
	return ""
}

// generateFallbackExplanation generates a simple explanation based on product characteristics
func (s *AIService) generateFallbackExplanation(product models.Product, originalQuery string) string {
	var explanations []string
	queryLower := strings.ToLower(originalQuery)

	// Check tags and generate explanations
	for _, tag := range product.Tags {
		tagLower := strings.ToLower(tag)
		switch {
		case tagLower == "соус" || tagLower == "sauce":
			if strings.Contains(queryLower, "чипс") || strings.Contains(queryLower, "chip") {
				explanations = append(explanations, "Отличный соус для чипсов, который создаст интересный контраст вкусов")
			} else {
				explanations = append(explanations, "Может использоваться как приправа или добавка для усиления вкуса")
			}
		case tagLower == "сыр" || tagLower == "cheese":
			if strings.Contains(queryLower, "чипс") || strings.Contains(queryLower, "chip") {
				explanations = append(explanations, "Сыр отлично дополняет чипсы, создавая насыщенный вкус и приятную текстуру")
			} else if strings.Contains(queryLower, "суп") {
				explanations = append(explanations, "Можно натереть сверху или подать отдельно к супу для усиления вкуса")
			} else {
				explanations = append(explanations, "Добавляет богатый вкус и кремовую текстуру")
			}
		case tagLower == "hard" || tagLower == "твердый":
			explanations = append(explanations, "Можно натереть сверху для добавления пикантного вкуса")
		case tagLower == "soft" || tagLower == "мягкий":
			explanations = append(explanations, "Идеален для намазывания или добавления кусочками")
		case tagLower == "оливки" || tagLower == "olive":
			explanations = append(explanations, "Отличная закуска и дополнение к основному блюду")
		}
	}

	if len(explanations) > 0 {
		return explanations[0]
	}

	// Default explanation
	return "Этот продукт был выбран благодаря своим уникальным вкусовым характеристикам и способности дополнить ваш запрос"
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
