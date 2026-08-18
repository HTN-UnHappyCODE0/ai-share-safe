# Hướng Dẫn Chi Tiết Thiết Lập Database Trên Ubuntu Server (Máy Cây Cũ)

Tài liệu này hướng dẫn từng bước thiết lập cơ sở dữ liệu trên máy chủ Ubuntu Server của bạn, tối ưu hóa cho phần cứng máy tính để bàn cũ (tiết kiệm RAM, tự khởi động khi bật máy và tự động sao lưu).

---

## 1. Lựa Chọn Giải Pháp Database

Đối với máy chủ cá nhân Ubuntu Server tại nhà, bạn có **2 giải pháp tối ưu**:

| Tiêu chí | Giải pháp 1: PostgreSQL qua Docker (Khuyên dùng) | Giải pháp 2: SQLite với WAL Mode |
| :--- | :--- | :--- |
| **Mức độ khuyên dùng** | ⭐⭐⭐⭐⭐ (Chuẩn Production, dễ quản trị) | ⭐⭐⭐⭐ (Cực nhẹ, 0MB RAM phụ trội) |
| **Tiêu tốn tài nguyên** | ~30MB - 50MB RAM | Gần như 0MB (nhúng trực tiếp vào Go BE) |
| **Quản lý dữ liệu** | Dễ kết nối qua DBeaver / PgAdmin từ máy khác | Xem trực tiếp file `.db` |
| **Cách cài đặt** | 1 lệnh Docker Compose | Không cần cài gì cả, Go BE tự tạo |

> **Khuyến nghị:** Dùng **PostgreSQL 16 (bản Alpine siêu nhẹ)** chạy bằng **Docker**. Giải pháp này vừa chuyên nghiệp, vừa độc lập, không làm rác hệ điều hành Ubuntu của bạn.

---

## 2. Cách 1: Thiết Lập PostgreSQL Qua Docker (Khuyên Dùng)

### Bước 1: Cài đặt Docker trên Ubuntu Server (nếu máy chưa có)
Chạy lệnh sau trên terminal của Ubuntu Server:
```bash
# Cập nhật hệ thống và cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cấp quyền cho user hiện tại không cần sudo khi gõ docker
sudo usermod -aG docker $USER
newgrp docker
```

### Bước 2: Tạo thư mục dự án và file cấu hình trên Ubuntu Server
Tạo thư mục lưu trữ dữ liệu DB:
```bash
mkdir -p ~/ai-share-safe/db_data
cd ~/ai-share-safe
```

Tạo file `docker-compose.db.yml` với nội dung:
```yaml
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
```

### Bước 3: Khởi chạy PostgreSQL Container
```bash
docker compose -f docker-compose.db.yml up -d
```

Kiểm tra trạng thái container:
```bash
docker ps
```
Nếu thấy `Status: Up (healthy)` là PostgreSQL đã sẵn sàng hoạt động 24/7.

---

## 3. Cách 2: Thiết Lập PostgreSQL Trực Tiếp (Native Apt)

Nếu bạn không muốn dùng Docker mà muốn cài trực tiếp vào hệ điều hành Ubuntu:

### Bước 1: Cài đặt PostgreSQL
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

### Bước 2: Tạo User và Database cho dự án
```bash
# Đổi sang user postgres
sudo -i -u postgres

# Mở psql shell
psql

# Chạy các câu lệnh SQL sau:
CREATE DATABASE aisharesafe_db;
CREATE USER aisharesafe WITH ENCRYPTED PASSWORD 'YourSecurePassword2026!';
GRANT ALL PRIVILEGES ON DATABASE aisharesafe_db TO aisharesafe;
ALTER DATABASE aisharesafe_db OWNER TO aisharesafe;

# Thoát psql và user postgres
\q
exit
```

### Bước 3: Cho phép kết nối trong mạng LAN (Tuỳ chọn)
Nếu bạn muốn từ máy Windows kết nối vào DB trên Ubuntu Server qua DBeaver / Navicat:
1. Sửa file `/etc/postgresql/16/main/postgresql.conf`:
   ```bash
   sudo nano /etc/postgresql/16/main/postgresql.conf
   ```
   Tìm dòng `#listen_addresses = 'localhost'` đổi thành:
   ```
   listen_addresses = '*'
   ```
2. Sửa file `/etc/postgresql/16/main/pg_hba.conf`:
   ```bash
   sudo nano /etc/postgresql/16/main/pg_hba.conf
   ```
   Thêm dòng sau vào cuối file:
   ```
   host    all             all             192.168.0.0/16          scram-sha-256
   ```
3. Khởi động lại PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

---

## 4. Cấu Hình Backend Go Kết Nối Đến PostgreSQL

Sau khi thiết lập xong DB trên Ubuntu Server, trong file `.env` của Backend Go, bạn chỉ cần cấu hình:

```env
# Nếu Go Backend chạy cùng máy Ubuntu Server:
DATABASE_TYPE=postgres
DATABASE_URL=postgres://aisharesafe:YourSecurePassword2026!@localhost:5432/aisharesafe_db?sslmode=disable

# Nếu Go Backend chạy trên máy Windows dev kết nối sang Ubuntu Server (IP ví dụ: 192.168.1.100):
DATABASE_TYPE=postgres
DATABASE_URL=postgres://aisharesafe:YourSecurePassword2026!@192.168.1.100:5432/aisharesafe_db?sslmode=disable
```

Backend Go khi chạy sẽ **tự động khởi tạo tất cả các bảng (`users`, `conversations`, `messages`, `api_usage_logs`)** và tự động tạo tài khoản quản trị ban đầu.

---

## 5. Script Sao Lưu Tự Động (Auto Backup Script)

Để tránh mất dữ liệu cuộc trò chuyện khi máy cây gặp sự cố, bạn có thể tạo cron job backup hàng ngày:

```bash
# Tạo script backup
cat << 'EOF' > ~/backup_db.sh
#!/bin/bash
BACKUP_DIR=~/db_backups
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker exec aisharesafe_postgres pg_dump -U aisharesafe aisharesafe_db > $BACKUP_DIR/backup_$TIMESTAMP.sql
# Xoá các bản backup cũ hơn 7 ngày để tiết kiệm dung lượng ổ cứng
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -exec rm {} \;
EOF

chmod +x ~/backup_db.sh

# Cài đặt cron job chạy lúc 2:00 sáng mỗi ngày
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup_db.sh") | crontab -
```
