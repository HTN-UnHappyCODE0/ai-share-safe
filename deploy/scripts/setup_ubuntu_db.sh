#!/bin/bash
# ==============================================================================
# Script cài đặt và khởi chạy PostgreSQL 16 qua Docker trên Ubuntu Server
# Dự án: AI Share Safe Proxy
# ==============================================================================

set -e

echo "🚀 [1/4] Kiểm tra và cập nhật hệ thống..."
sudo apt update -y

echo "📦 [2/4] Kiểm tra cài đặt Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    echo "Docker chưa được cài đặt. Đang tiến hành cài đặt Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm -f get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker đã được cài đặt thành công!"
else
    echo "✅ Docker đã có sẵn trên máy."
fi

# Tạo thư mục làm việc cho database
PROJECT_DIR="$HOME/ai-share-safe"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "📝 [3/4] Khởi tạo cấu hình docker-compose cho PostgreSQL..."
cat << 'EOF' > docker-compose.db.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: aisharesafe_postgres
    restart: always
    environment:
      POSTGRES_USER: aisharesafe
      POSTGRES_PASSWORD: YourSecurePassword2026!
      POSTGRES_DB: aisharesafe_db
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - ./db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aisharesafe -d aisharesafe_db"]
      interval: 10s
      timeout: 5s
      retries: 5
EOF

echo "🐘 [4/4] Khởi chạy PostgreSQL Container..."
sudo docker compose -f docker-compose.db.yml up -d

echo ""
echo "======================================================================"
echo "🎉 PostgreSQL đã được khởi chạy thành công trên Ubuntu Server!"
echo "======================================================================"
echo "🔹 Database:  aisharesafe_db"
echo "🔹 Username:  aisharesafe"
echo "🔹 Password:  YourSecurePassword2026!"
echo "🔹 Port:      5432"
echo ""
echo "Chuỗi kết nối Connection String cho Go Backend:"
echo "postgres://aisharesafe:YourSecurePassword2026!@<IP_MAY_UBUNTU>:5432/aisharesafe_db?sslmode=disable"
echo "======================================================================"
