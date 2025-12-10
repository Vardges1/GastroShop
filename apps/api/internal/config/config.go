package config

import (
	"os"
)

type Config struct {
	DatabaseURL        string
	JWTSecret          string
	PaymentProvider    string
	YooKassaShopID     string
	YooKassaSecret     string
	YooKassaTestMode   bool
	YooKassaWebhookURL string
	MockWebhookSecret  string
	CPublicID          string
	CAPI_SECRET        string
	CORSOrigin         string
	ServerPort         string
	OpenAIAPIKey       string
	// Email/SMTP settings
	SMTPHost           string
	SMTPPort           string
	SMTPUser           string
	SMTPPassword       string
	SMTPFrom           string
	BaseURL            string
}

func Load() *Config {
	return &Config{
		DatabaseURL:        getEnv("DB_DSN", "postgres://postgres:postgres@localhost:5432/gastroshop?sslmode=disable"),
		JWTSecret:          getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		PaymentProvider:    getEnv("PAYMENT_PROVIDER", "mock"),
		YooKassaShopID:     getEnv("YOOKASSA_SHOP_ID", ""),
		YooKassaSecret:     getEnv("YOOKASSA_SECRET_KEY", ""),
		YooKassaTestMode:   getEnvBool("YOOKASSA_TEST_MODE", true),
		YooKassaWebhookURL: getEnv("YOOKASSA_WEBHOOK_URL", "https://yourdomain.com/api/webhooks/yookassa"),
		MockWebhookSecret:  getEnv("MOCK_WEBHOOK_SECRET", "mock-webhook-secret-key"),
		CPublicID:          getEnv("CPUBLIC_ID", ""),
		CAPI_SECRET:        getEnv("CAPI_SECRET", ""),
		CORSOrigin:         getEnv("CORS_ORIGIN", "http://localhost:3001"),
		ServerPort:         getEnv("PORT", "8080"),
		OpenAIAPIKey:       getEnv("OPENAI_API_KEY", ""),
		SMTPHost:           getEnv("SMTP_HOST", ""),
		SMTPPort:           getEnv("SMTP_PORT", "587"),
		SMTPUser:           getEnv("SMTP_USER", ""),
		SMTPPassword:       getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:           getEnv("SMTP_FROM", ""),
		BaseURL:            getEnv("BASE_URL", "http://localhost:3001"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true"
	}
	return defaultValue
}
