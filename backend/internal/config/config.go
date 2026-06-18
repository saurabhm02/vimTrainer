package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL        string
	JWTSecret          string
	CORSAllowedOrigins []string
	Port               string
	Environment        string
	StorageProvider    string
	StoragePath        string
	LogLevel           string
}

func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		DatabaseURL:     requireEnv("DATABASE_URL"),
		JWTSecret:       requireEnv("JWT_SECRET"),
		Port:            getEnv("PORT", "8080"),
		Environment:     getEnv("ENVIRONMENT", "development"),
		StorageProvider: getEnv("STORAGE_PROVIDER", "local"),
		StoragePath:     getEnv("STORAGE_PATH", "/tmp/vimtrainer-uploads"),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
	}

	origins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
	cfg.CORSAllowedOrigins = strings.Split(origins, ",")
	for i, o := range cfg.CORSAllowedOrigins {
		cfg.CORSAllowedOrigins[i] = strings.TrimSpace(o)
	}

	if len(cfg.JWTSecret) < 32 {
		panic("JWT_SECRET must be at least 32 characters")
	}

	return cfg
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required environment variable %s is not set", key))
	}
	return v
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
