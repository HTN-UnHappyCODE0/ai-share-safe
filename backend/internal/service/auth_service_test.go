package service_test

import (
	"testing"

	"ai-share-safe/backend/internal/config"
	"ai-share-safe/backend/internal/database"
	"ai-share-safe/backend/internal/repository"
	"ai-share-safe/backend/internal/service"
	"ai-share-safe/backend/pkg/logger"
)

func TestAuthService_VerifyPasscodeAndJWT(t *testing.T) {
	logger.InitLogger("development")

	cfg := &config.Config{
		Environment:          "development",
		DatabaseType:         "sqlite",
		DatabaseURL:          "file::memory:?cache=shared",
		JWTSecret:            "test-secret-key-12345",
		DefaultAdminPasscode: "testcode2026",
	}

	db, err := database.InitDB(cfg)
	if err != nil {
		t.Fatalf("Failed to init in-memory database: %v", err)
	}

	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo, cfg)

	// Test 1: Verify correct passcode
	token, user, err := authService.VerifyPasscode("testcode2026")
	if err != nil {
		t.Fatalf("Expected valid passcode, got error: %v", err)
	}
	if token == "" || user == nil {
		t.Fatalf("Expected token and user, got empty token or nil user")
	}

	// Test 2: Validate JWT Token
	claims, err := authService.ValidateToken(token)
	if err != nil {
		t.Fatalf("Expected valid JWT token, got error: %v", err)
	}
	if claims.UserID != user.ID || claims.Username != user.Username {
		t.Fatalf("Claims mismatch: expected user %s, got %s", user.Username, claims.Username)
	}

	// Test 3: Invalid passcode
	_, _, err = authService.VerifyPasscode("wrong_passcode")
	if err == nil {
		t.Fatalf("Expected error for wrong passcode, but got nil")
	}
}
