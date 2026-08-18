package middleware

import (
	"time"

	"ai-share-safe/backend/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func ZapLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method

		// Don't log spammy health checks
		if path == "/health" {
			return
		}

		logger.Log.Info("HTTP Request",
			zap.Int("status", status),
			zap.String("method", method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", clientIP),
			zap.Duration("latency", latency),
			zap.String("user_agent", c.Request.UserAgent()),
		)
	}
}
