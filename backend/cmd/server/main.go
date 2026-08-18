package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ai-share-safe/backend/internal/config"
	"ai-share-safe/backend/internal/database"
	"ai-share-safe/backend/internal/handler"
	"ai-share-safe/backend/internal/middleware"
	"ai-share-safe/backend/internal/repository"
	"ai-share-safe/backend/internal/service"
	"ai-share-safe/backend/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// 1. Load Configuration
	cfg := config.LoadConfig()

	// 2. Initialize Logger
	logger.InitLogger(cfg.Environment)
	defer logger.Sync()

	logger.Log.Info("Starting AI Share Safe Backend Server...",
		zap.String("port", cfg.Port),
		zap.String("env", cfg.Environment),
		zap.String("db_type", cfg.DatabaseType),
		zap.Int("api_keys_count", len(cfg.GeminiAPIKeys)),
	)

	// 3. Initialize Database
	db, err := database.InitDB(cfg)
	if err != nil {
		logger.Log.Fatal("Failed to initialize database", zap.Error(err))
	}

	// 4. Initialize Repositories
	userRepo := repository.NewUserRepository(db)
	convRepo := repository.NewConversationRepository(db)
	msgRepo := repository.NewMessageRepository(db)

	// 5. Initialize Services
	authService := service.NewAuthService(userRepo, cfg)
	convService := service.NewConversationService(convRepo, msgRepo)
	geminiService := service.NewGeminiService(cfg, msgRepo, convRepo)

	// 6. Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)
	convHandler := handler.NewConversationHandler(convService)
	chatHandler := handler.NewChatHandler(geminiService, convService)
	modelHandler := handler.NewModelHandler(cfg)

	// 7. Setup Gin Engine
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.ZapLoggerMiddleware())
	router.Use(middleware.CORSMiddleware(cfg.AllowedOrigins))
	router.Use(middleware.RateLimitMiddleware(cfg.RateLimitRPM, cfg.RateLimitBurst))

	// 8. Register Public Routes
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"version":   "1.0.0",
		})
	})

	apiV1 := router.Group("/api/v1")
	{
		// Public Auth routes
		authGroup := apiV1.Group("/auth")
		{
			authGroup.POST("/verify", authHandler.VerifyPasscode)
		}

		// Protected routes (Require JWT)
		protected := apiV1.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			// Current user info
			protected.GET("/auth/me", authHandler.GetMe)

			// Models
			protected.GET("/models", modelHandler.ListModels)

			// Conversations CRUD
			protected.GET("/conversations", convHandler.ListConversations)
			protected.POST("/conversations", convHandler.CreateConversation)
			protected.GET("/conversations/:id", convHandler.GetConversation)
			protected.DELETE("/conversations/:id", convHandler.DeleteConversation)

			// Chat SSE Streaming
			protected.POST("/chat/stream", chatHandler.StreamChat)
		}
	}

	// 9. Start Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 0, // Must be 0 for unlimited SSE streaming duration
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Log.Info(fmt.Sprintf("Server listening on port %s (http://localhost:%s)", cfg.Port, cfg.Port))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Log.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Log.Info("Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Log.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Log.Info("Server stopped cleanly.")
}
