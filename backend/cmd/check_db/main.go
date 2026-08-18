package main

import (
	"fmt"
	"log"

	"ai-share-safe/backend/internal/config"
	"ai-share-safe/backend/internal/model"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg := config.LoadConfig()
	fmt.Println("👉 Đang kết nối tới Database URL:", cfg.DatabaseURL)

	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Lỗi kết nối DB: %v", err)
	}

	fmt.Println("✅ Kết nối Database thành công!")

	// 1. Kiểm tra danh sách tables
	var tables []string
	db.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';").Scan(&tables)
	fmt.Printf("📋 Danh sách các bảng hiện có trong database (%d bảng):\n", len(tables))
	for _, t := range tables {
		fmt.Printf("   - %s\n", t)
	}

	// 2. Kiểm tra dữ liệu bảng users
	var users []model.User
	db.Find(&users)
	fmt.Printf("👥 Số lượng user hiện có: %d\n", len(users))
	for _, u := range users {
		fmt.Printf("   - ID: %s | Username: %s | Role: %s | Passcode: %s\n", u.ID, u.Username, u.Role, u.AccessPasscode)
	}
}
