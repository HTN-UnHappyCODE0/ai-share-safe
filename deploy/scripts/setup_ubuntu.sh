#!/bin/bash
# ==============================================================================
# Script cài đặt toàn bộ hệ thống AI Share Safe trên Ubuntu Server
# (Bao gồm Docker, Docker Compose, cấu hình tự khởi động)
# ==============================================================================

set -e

echo "🚀 [1/3] Cập nhật Ubuntu Server & Cài đặt các gói phụ trợ..."
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y curl wget git ufw htop

echo "🐳 [2/3] Cài đặt Docker & Docker Compose Plugin..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm -f get-docker.sh
    sudo usermod -aG docker $USER
fi

echo "🛡️ [3/3] Cấu hình Firewall UFW (Bảo vệ máy chủ)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Mở port nếu dev nội bộ LAN:
# sudo ufw allow 5432/tcp
# sudo ufw allow 8080/tcp
# sudo ufw allow 3000/tcp
# sudo ufw --force enable

echo ""
echo "✅ Hoàn tất thiết lập môi trường máy chủ Ubuntu Server!"
echo "Bạn có thể khởi chạy ứng dụng bằng lệnh: docker compose up -d --build"
