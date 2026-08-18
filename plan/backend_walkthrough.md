# Kết Quả Xây Dựng Backend Go (AI Share Safe Proxy)

Đã hoàn thành 100% phần Backend viết bằng Go theo đúng kiến trúc Clean Layered Architecture, sẵn sàng kết nối với Google Gemini API và phục vụ luồng SSE Streaming thời gian thực cho Frontend.

---

## 1. Các Tính Năng Đã Triển Khai

### 1.1. Core Proxy & Google Gemini Service (`internal/service/gemini_service.go`)
- **SSE Streaming:** Truyền trực tiếp các chunk token từ Google Gemini về Client ngay tức thì qua cơ chế Server-Sent Events (`text/event-stream`).
- **Cơ chế Multi-Key Rotation Pool:** Hỗ trợ mảng danh sách `GEMINI_API_KEYS`, tự động xoay vòng Round-Robin bằng `sync/atomic` và tự động fallback sang key khác khi gặp lỗi giới hạn Quota (`429 ResourceExhausted`).
- **Sliding Context Window:** Tự động lấy 10 tin nhắn gần nhất từ Database gắn vào cuộc trò chuyện để AI duy trì ngữ cảnh.
- **Client Disconnect Detection:** Lắng nghe `ctx.Done()`, tự động ngắt request sang Google khi người dùng bấm dừng hoặc đóng tab để tiết kiệm token.

### 1.2. Bảo Mật & Quản Lý Truy Cập
- **Access Passcode & JWT Token:** Người dùng nhập mã truy cập được cấp ➔ Hệ thống xác thực và cấp JWT Token có hạn 30 ngày.
- **Rate Limiting (Token Bucket):** Giới hạn tần suất gọi API (mặc định 30 req/phút, burst 5) theo từng IP để chống bot càn quét.
- **CORS & Logger:** Hỗ trợ CORS linh hoạt và ghi log chuẩn cấu trúc với Uber Zap.

### 1.3. Cơ Sở Dữ Liệu
- Hỗ trợ cả **SQLite (Pure-Go WAL mode)** (chạy nhẹ tênh trên máy cũ không cần cài DB server) lẫn **PostgreSQL**.
- Tự động chạy Migration các bảng `users`, `conversations`, `messages`, `api_usage_logs`.
- Tự động Seed tài khoản admin mặc định khi khởi động lần đầu.

---

## 2. Cấu Trúc Mã Nguồn Backend

```
backend/
├── cmd/server/main.go                 # Khởi động server & Graceful shutdown
├── internal/
│   ├── config/config.go               # Load biến môi trường & API Key pool
│   ├── database/db.go                 # Kết nối GORM SQLite/Postgres & Migration
│   ├── model/                         # User, Conversation, Message, APIUsageLog
│   ├── repository/                    # GORM Data Access Object
│   ├── service/
│   │   ├── auth_service.go            # Passcode check & JWT
│   │   ├── conversation_service.go    # Quản lý hội thoại
│   │   ├── gemini_service.go          # Core Gemini Client & Stream Iterator
│   │   └── auth_service_test.go       # Unit test
│   ├── middleware/                    # Auth, RateLimiter, CORS, Zap Logger
│   └── handler/                       # Auth, Conversations, Models, Chat SSE Stream
├── pkg/
│   ├── logger/logger.go               # Zap Logger
│   └── response/response.go           # Standard JSON response
├── Dockerfile                         # Multi-stage build (< 25MB)
├── .env.example
├── go.mod
└── go.sum
```

---

## 3. Kết Quả Kiểm Thử (Verification)

1. **Biên dịch mã nguồn:** `go build ./...` ➔ Hoàn tất 0 lỗi (`Exit code: 0`).
2. **Chạy Unit Test:** `go test -v ./...` ➔ Toàn bộ test Pass (`PASS: TestAuthService_VerifyPasscodeAndJWT (0.01s)`).
