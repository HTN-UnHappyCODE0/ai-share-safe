package middleware

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	config := cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "X-Accel-Buffering"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	// Allow all origins if wildcard is present
	for _, origin := range allowedOrigins {
		if origin == "*" {
			config.AllowAllOrigins = true
			config.AllowOrigins = nil
			break
		}
	}

	return cors.New(config)
}
