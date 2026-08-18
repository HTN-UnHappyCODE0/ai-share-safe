package service

import (
	"errors"
	"strings"
	"time"

	"ai-share-safe/backend/internal/config"
	"ai-share-safe/backend/internal/model"
	"ai-share-safe/backend/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type AuthService struct {
	userRepo *repository.UserRepository
	cfg      *config.Config
}

type JWTClaims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func NewAuthService(userRepo *repository.UserRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

// VerifyPasscode checks if the given passcode matches an existing user or config default passcode
func (s *AuthService) VerifyPasscode(passcode string) (string, *model.User, error) {
	if strings.TrimSpace(passcode) == "" {
		return "", nil, errors.New("passcode is required")
	}

	trimmedPasscode := strings.TrimSpace(passcode)

	// 1. Try finding user with this passcode in DB
	user, err := s.userRepo.FindByPasscode(trimmedPasscode)
	if err == nil && user != nil {
		token, genErr := s.GenerateToken(user)
		if genErr != nil {
			return "", nil, genErr
		}
		return token, user, nil
	}

	// 2. If not found in DB, check if it matches the configured DEFAULT_ACCESS_PASSCODE
	if trimmedPasscode == strings.TrimSpace(s.cfg.DefaultAdminPasscode) {
		// Ensure admin user exists in DB with this passcode
		adminUser := &model.User{
			Username:       "admin",
			AccessPasscode: trimmedPasscode,
			Role:           "admin",
			DailyQuota:     1000,
		}
		_ = s.userRepo.Create(adminUser)

		token, genErr := s.GenerateToken(adminUser)
		if genErr != nil {
			return "", nil, genErr
		}
		return token, adminUser, nil
	}

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil, err
	}

	return "", nil, errors.New("invalid access passcode")
}

func (s *AuthService) GenerateToken(user *model.User) (string, error) {
	claims := JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "ai-share-safe-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token claims")
}
