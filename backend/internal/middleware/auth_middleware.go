package middleware

import (
	"strings"

	"ai-share-safe/backend/internal/service"
	"ai-share-safe/backend/pkg/response"

	"github.com/gin-gonic/gin"
)

const (
	CtxUserIDKey   = "user_id"
	CtxUsernameKey = "username"
	CtxRoleKey     = "role"
)

func AuthMiddleware(authService *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// Check Authorization Header
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				tokenString = parts[1]
			}
		}

		// Fallback to query param `token` (useful for direct EventSource connections)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			response.Unauthorized(c, "Authorization token is missing")
			c.Abort()
			return
		}

		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		c.Set(CtxUserIDKey, claims.UserID)
		c.Set(CtxUsernameKey, claims.Username)
		c.Set(CtxRoleKey, claims.Role)
		c.Next()
	}
}
