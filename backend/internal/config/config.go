package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                 string
	Environment          string
	DatabaseType         string // "sqlite" or "postgres"
	DatabaseURL          string // Postgres connection string or SQLite file path
	GeminiAPIKeys        []string
	JWTSecret            string
	DefaultAdminPasscode string
	AllowedOrigins       []string
	RateLimitRPM         int
	RateLimitBurst       int
	MaxContextMessages   int
	DefaultModel         string
}

func LoadConfig() *Config {
	// Load .env file if exists
	_ = godotenv.Load()

	port := getEnv("PORT", "8080")
	env := getEnv("ENV", "development")
	dbType := getEnv("DATABASE_TYPE", "sqlite")
	dbURL := getEnv("DATABASE_URL", "aisharesafe.db")

	// Parse comma-separated Gemini API Keys
	rawKeys := getEnv("GEMINI_API_KEYS", "")
	var apiKeys []string
	if rawKeys != "" {
		for _, key := range strings.Split(rawKeys, ",") {
			trimmed := strings.TrimSpace(key)
			if trimmed != "" {
				apiKeys = append(apiKeys, trimmed)
			}
		}
	}
	// Fallback single key
	if len(apiKeys) == 0 {
		singleKey := getEnv("GEMINI_API_KEY", "")
		if singleKey != "" {
			apiKeys = append(apiKeys, singleKey)
		}
	}

	jwtSecret := getEnv("JWT_SECRET", "super-secret-default-change-me-in-production")
	defaultPasscode := getEnv("DEFAULT_ACCESS_PASSCODE", "gemini2026")

	// Parse Allowed Origins for CORS
	rawOrigins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
	var allowedOrigins []string
	for _, origin := range strings.Split(rawOrigins, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}

	rateLimitRPM := getEnvAsInt("RATE_LIMIT_RPM", 30)
	rateLimitBurst := getEnvAsInt("RATE_LIMIT_BURST", 5)
	maxContextMessages := getEnvAsInt("MAX_CONTEXT_MESSAGES", 10)
	defaultModel := getEnv("DEFAULT_MODEL", "gemini-2.0-flash")

	return &Config{
		Port:                 port,
		Environment:          env,
		DatabaseType:         dbType,
		DatabaseURL:          dbURL,
		GeminiAPIKeys:        apiKeys,
		JWTSecret:            jwtSecret,
		DefaultAdminPasscode: defaultPasscode,
		AllowedOrigins:       allowedOrigins,
		RateLimitRPM:         rateLimitRPM,
		RateLimitBurst:       rateLimitBurst,
		MaxContextMessages:   maxContextMessages,
		DefaultModel:         defaultModel,
	}
}

func getEnv(key, defaultValue string) string {
	if val, exists := os.LookupEnv(key); exists && strings.TrimSpace(val) != "" {
		return strings.TrimSpace(val)
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valStr := getEnv(key, "")
	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}
	return defaultValue
}
