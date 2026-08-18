# 🚀 AI Share Safe - Gemini AI Proxy Portal

> **Cổng giao tiếp trò chuyện AI bảo mật thời gian thực hỗ trợ Google Gemini 3.7 Flash & 2.0 Flash.**
> Cho phép bạn tự host giao diện chat độc lập, người dùng cuối tương tác trực tiếp mà hoàn toàn không biết hệ thống phía sau đang dùng tài khoản Google nào hay API Key bí mật nào.

---

## 🌟 Tính Năng Nổi Bật

- ⚡ **Streaming SSE (Server-Sent Events):** Phản hồi từng token thời gian thực với độ trễ tối thiểu, tạo hiệu ứng gõ chữ mượt mà như ChatGPT.
- 🔄 **Multi-Key Rotation Pool:** Hỗ trợ mảng danh sách nhiều Google Gemini API Key, tự động xoay vòng Round-Robin và tự động fallback sang key khác khi gặp lỗi giới hạn Quota (`429 Too Many Requests`).
- 🧠 **Context Window & Abort:** Tự động lấy 10 tin nhắn gần nhất từ Database duy trì ngữ cảnh trò chuyện; ngắt kết nối lập tức khi người dùng bấm "Dừng".
- 🛡️ **Bảo mật & Phân quyền:** Xác thực Passcode ➔ Cấp JWT Token có hạn 30 ngày; tích hợp Token-Bucket Rate Limiter chống spam.
- 🎨 **Giao diện Sleek Dark Mode:** Thiết kế Glassmorphism sang trọng với Next.js 14, Tailwind CSS, hỗ trợ Markdown và Code Highlight 1-click copy.
- 🐘 **Cơ sở dữ liệu linh hoạt:** Hỗ trợ cả **PostgreSQL** lẫn **SQLite (WAL mode)** tự động chạy Migration.
- 🌐 **Deploy 1-click & Zero Trust:** Docker Compose trọn gói, tích hợp sẵn **Cloudflare Tunnel** giúp public ra internet an toàn miễn phí 100% không cần mở port router.

---

## 🏗️ Kiến Trúc Hệ Thống (Architecture)

```
[Người dùng / Web Browser]
       │ (1. Gửi tin nhắn / Passcode JWT)
       ▼
[Next.js 14 Frontend] (Port: 3000)
       │ (2. Gọi API SSE Stream)
       ▼
[Golang Gin Backend] (Port: 8080) ──(Kiểm tra Rate Limit / Auth)──> [PostgreSQL / SQLite]
       │
       │ (3. Multi-Key Round-Robin & Sliding Context Window)
       ▼
[Google Gemini API] (gemini-3.7-flash / gemini-2.0-flash / gemini-1.5-pro)
       │
       │ (4. Stream token chunks theo thời gian thực)
       ▼
[Next.js Frontend] (Render Markdown + Code Block + Typing Cursor)
```

---

## 📁 Cấu Trúc Thư Mục

```
ai-share-safe/
├── backend/                        # GOLANG BACKEND
│   ├── cmd/server/main.go          # Server entrypoint & graceful shutdown
│   ├── internal/
│   │   ├── config/                 # Load .env, parse Multi-Key pool
│   │   ├── database/               # GORM PostgreSQL & SQLite connection
│   │   ├── model/                  # User, Conversation, Message, Usage
│   │   ├── repository/             # Database access objects
│   │   ├── service/                # Gemini client, Auth, Conversation logic
│   │   ├── middleware/             # Rate Limiter, JWT Auth, CORS, Zap Logger
│   │   └── handler/                # REST & SSE Streaming handlers
│   └── Dockerfile                  # Multi-stage static binary build (< 25MB)
│
├── frontend/                       # NEXT.JS FRONTEND
│   ├── src/
│   │   ├── app/                    # Next.js App Router (Layout & Chat Page)
│   │   ├── components/             # Sidebar, ChatContainer, MessageList, PasscodeModal
│   │   ├── hooks/                  # useChatStream, useConversations, useAuth
│   │   └── lib/                    # API client with JWT interceptor
│   └── Dockerfile                  # Next.js standalone runner
│
├── plan/                           # TÀI LIỆU KẾ HOẠCH & HƯỚNG DẪN CHI TIẾT
│   ├── implementation_plan.md      # Kế hoạch tổng thể
│   ├── backend_plan.md             # Kế hoạch Backend Go
│   ├── frontend_plan.md            # Kế hoạch Frontend Next.js
│   ├── database_setup_guide.md     # Hướng dẫn Database trên Ubuntu Server
│   └── deployment_and_public_guide.md # Hướng dẫn public Cloudflare Tunnel
│
├── docker-compose.yml              # Quản lý trọn gói toàn bộ hệ thống
└── .env.example
```

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local Development)

### 1. Khởi chạy Backend Go
```bash
cd backend
cp .env.example .env
# Chỉnh sửa file .env: Điền GEMINI_API_KEYS và cấu hình DATABASE_URL
go run cmd/server/main.go
```
*Backend chạy tại `http://localhost:8080`.*

### 2. Khởi chạy Frontend Next.js
```bash
cd frontend
npm install
npm run dev
```
*Frontend chạy tại `http://localhost:3000`.*

Truy cập `http://localhost:3000` và nhập Passcode mặc định: **`gemini2026`**!

---

## 🐳 Triển Khai Bằng Docker Compose (Ubuntu Server)

1. Sao chép project lên server và tạo file `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
2. Khởi chạy toàn bộ hệ thống bằng 1 lệnh:
   ```bash
   docker compose up -d --build
   ```
3. Xem chi tiết hướng dẫn trỏ Domain qua Cloudflare Tunnel tại:
   👉 **[plan/deployment_and_public_guide.md](plan/deployment_and_public_guide.md)**

---

## 📜 Giấy Phép
Dự án được phân phối dưới giấy phép MIT License.
