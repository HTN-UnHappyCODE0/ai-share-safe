package database

import (
	"fmt"
	"strings"

	"ai-share-safe/backend/internal/config"
	"ai-share-safe/backend/internal/model"
	"ai-share-safe/backend/pkg/logger"

	"github.com/glebarez/sqlite"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes the database connection and runs migrations
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector

	logLevel := gormLogger.Warn
	if cfg.Environment == "development" {
		logLevel = gormLogger.Info
	}

	gormConfig := &gorm.Config{
		Logger: gormLogger.Default.LogMode(logLevel),
	}

	if strings.ToLower(cfg.DatabaseType) == "postgres" {
		logger.Log.Info("Connecting to PostgreSQL database", zap.String("url", cfg.DatabaseURL))
		dialector = postgres.Open(cfg.DatabaseURL)
	} else {
		// Default to SQLite (pure Go, WAL enabled)
		dbFile := cfg.DatabaseURL
		if dbFile == "" || dbFile == "aisharesafe.db" {
			dbFile = "aisharesafe.db?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
		}
		logger.Log.Info("Connecting to SQLite database", zap.String("file", dbFile))
		dialector = sqlite.Open(dbFile)
	}

	db, err := gorm.Open(dialector, gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto Migration
	err = db.AutoMigrate(
		&model.User{},
		&model.Conversation{},
		&model.Message{},
		&model.APIUsageLog{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to run database auto-migration: %w", err)
	}

	DB = db
	logger.Log.Info("Database connection and migrations completed successfully")

	// Seed default user if none exists
	seedDefaultUser(db, cfg)

	return db, nil
}

func seedDefaultUser(db *gorm.DB, cfg *config.Config) {
	var count int64
	db.Model(&model.User{}).Count(&count)
	if count == 0 {
		defaultUser := model.User{
			Username:       "admin",
			AccessPasscode: cfg.DefaultAdminPasscode,
			Role:           "admin",
			DailyQuota:     1000,
		}
		if err := db.Create(&defaultUser).Error; err != nil {
			logger.Log.Error("Failed to seed default admin user", zap.Error(err))
		} else {
			logger.Log.Info("Default admin user created successfully",
				zap.String("username", defaultUser.Username),
				zap.String("passcode", cfg.DefaultAdminPasscode),
			)
		}
	}
}
