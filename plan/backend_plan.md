# Kế Hoạch Chi Tiết Xây Dựng Backend (Golang) Cho Hệ Thống AI Chat Proxy

Tài liệu này đặc tả chi tiết toàn bộ kiến trúc, cấu trúc code, luồng dữ liệu (Data Flow), xử lý SSE Streaming và từng bước triển khai cho phần **Backend viết bằng Go**.

---

## 1. Mục Tiêu & Yêu Cầu Kỹ Thuật

Backend đóng vai trò là một **Security & AI Proxy Core**:
- **Ẩn hoàn toàn Google API Key** khỏi người dùng cuối và client.
- **Xử lý Streaming thời gian thực (Server-Sent Events - SSE)** với độ trễ tối thiểu (zero buffering).
- **Hỗ trợ Multi-Key Pool & Auto-fallback:** Tự động xoay vòng nhiều Google Gemini API Key khi bị giới hạn Quota (lỗi 429).
- **Quản lý ngữ cảnh (Context Window):** Tự động truy xuất 5 - 10 tin nhắn gần nhất từ Database và ghép vào System Prompt gửi lên Gemini.
- **Bảo vệ hệ thống:** Kiểm soát truy cập bằng Passcode/JWT, Rate Limiting (Token Bucket) chống spam, CORS, Timeout và Graceful Shutdown.
- **Lưu trữ dữ liệu:** Hỗ trợ linh hoạt cả **SQLite (WAL mode)** (nhẹ nhàng, không cần cài đặt DB riêng cho server gia đình) lẫn **PostgreSQL** (cho môi trường production).

---

## 2. Kiến Trúc Backend (Clean Layered Architecture)

```
[Client Request (HTTP / SSE)]
              │
              ▼
    [Middlewares Layer]
    ├── CORS Middleware
    ├── Zap Logger & Recovery
    ├── Rate Limiter (Token Bucket per IP/User)
    └── JWT / Passcode Auth Guard
              │
              ▼
      [Handler Layer] (internal/handler)
    ├── AuthHandler (Xác thực passcode, cấp JWT)
    ├── ConversationHandler (CRUD cuộc trò chuyện)
    └── ChatStreamHandler (Xử lý SSE Streaming & Client Abort)
              │
              ▼
      [Service Layer] (internal/service)
    ├── AuthService (Business logic xác thực)
    ├── ConversationService (Quản lý ngữ cảnh, lưu trữ)
    └── GeminiService (Quản lý Key Pool, Prompt Builder, SDK Stream)
              │
              ▼
    [Repository Layer] (internal/repository)
    └── GORM Database Access (Users, Conversations, Messages)
              │
              ▼
      [Database Layer] (SQLite / PostgreSQL)
```

---

## 3. Cấu Trúc Thư Mục Chi Tiết Của Go Backend (`backend/`)

```
backend/
├── cmd/
│   └── server/
│       └── main.go                 # Entrypoint khởi tạo app & graceful shutdown
├── internal/
│   ├── config/
│   │   └── config.go               # Load biến môi trường (.env), parse danh sách API keys
│   ├── database/
│   │   └── db.go                   # Khởi tạo kết nối DB (GORM với SQLite hoặc Postgres)
│   ├── model/
│   │   ├── user.go                 # Struct User (ID, Passcode, Role, Quota)
│   │   ├── conversation.go         # Struct Conversation (ID, UserID, Title, Model, SystemPrompt)
│   │   └── message.go              # Struct Message (ID, ConversationID, Role, Content, Tokens)
│   ├── repository/
│   │   ├── user_repo.go            # Truy vấn User
│   │   ├── conversation_repo.go    # Truy vấn danh sách/chi tiết hội thoại
│   │   └── message_repo.go         # Lưu và lấy lịch sử tin nhắn
│   ├── service/
│   │   ├── auth_service.go         # Logic kiểm tra Passcode, sinh/giải mã JWT
│   │   ├── conversation_service.go # Logic tạo hội thoại, tự sinh tiêu đề
│   │   └── gemini_service.go       # Core: Gemini Client, Multi-Key Rotator, Stream Handler
│   ├── handler/
│   │   ├── auth_handler.go         # Endpoint /api/v1/auth/*
│   │   ├── conversation_handler.go # Endpoint /api/v1/conversations/*
│   │   └── chat_handler.go         # Endpoint /api/v1/chat/stream (SSE)
│   └── middleware/
│       ├── auth_middleware.go      # Kiểm tra JWT Bearer Token
│       ├── ratelimit_middleware.go # Giới hạn số request/phút (Token Bucket)
│       └── cors_middleware.go      # Cấu hình CORS an toàn
├── pkg/
│   ├── logger/
│   │   └── logger.go               # Cấu hình Uber Zap Logger
│   └── response/
│       └── response.go             # Chuẩn hoá định dạng JSON response
├── Dockerfile                      # Multi-stage build (sản sinh binary < 20MB)
├── go.mod
└── go.sum
```

---

## 4. Thiết Kế Các Module Trọng Tâm (Core Modules)

### 4.1. Module Xử Lý Gemini & Multi-Key Pool (`internal/service/gemini_service.go`)
- **Key Rotator:**
  - Nhận vào mảng `[]string` chứa các API Key từ biến môi trường `GEMINI_API_KEYS`.
  - Sử dụng cơ chế Round-Robin với `sync/atomic` để luân phiên phân phối các request.
  - Khi một key trả về mã lỗi HTTP `429 (ResourceExhausted)` hoặc `Quota Exceeded`, tự động chuyển sang key tiếp theo trong danh sách (tối đa N lần thử).
- **Context Builder (Sliding Window):**
  - Truy vấn tối đa 10 tin nhắn gần nhất từ DB thuộc `conversation_id`.
  - Format tin nhắn theo chuẩn Gemini Content (Role: `user` / `model`).
  - Gắn kèm `SystemInstruction` tuỳ chọn (ví dụ: *"Bạn là chuyên gia lập trình Golang và Next.js..."*).

### 4.2. Module Xử Lý SSE Stream (`internal/handler/chat_handler.go`)
- **Headers bắt buộc cho SSE:**
  ```go
  w.Header().Set("Content-Type", "text/event-stream")
  w.Header().Set("Cache-Control", "no-cache")
  w.Header().Set("Connection", "keep-alive")
  w.Header().Set("X-Accel-Buffering", "no") // Chống Nginx buffer stream
  ```
- **Xử lý ngắt kết nối giữa chừng (Client Disconnect):**
  - Lắng nghe `ctx := r.Context(); <-ctx.Done()`. Nếu người dùng bấm "Dừng" hoặc đóng trình duyệt, lập tức hủy Context gọi sang Gemini để tiết kiệm token và giải phóng tài nguyên.
- **Lưu trữ sau khi Stream kết thúc:**
  - Trong quá trình stream, Backend tích luỹ chuỗi text trả về.
  - Khi luồng stream hoàn tất (`done`), Backend bất đồng bộ (async goroutine) lưu tin nhắn hoàn chỉnh của Assistant vào Database.

### 4.3. Module Giới Hạn Tần Suất (Rate Limiter Middleware)
- Sử dụng thuật toán **Token Bucket** (sử dụng package chuẩn `golang.org/x/time/rate`).
- Quản lý map theo Client IP hoặc User ID, tự động dọn dẹp các IP không hoạt động để tránh rò rỉ bộ nhớ (Memory Leak).
- Mặc định: Cho phép 10 request/phút với burst = 3.

---

## 5. Danh Sách API Endpoints Backend

| Phương thức | Đường dẫn | Chức năng | Quyền truy cập |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Kiểm tra trạng thái hoạt động server | Public |
| `POST` | `/api/v1/auth/verify` | Nhập Passcode để nhận JWT Token | Public |
| `GET` | `/api/v1/conversations` | Lấy danh sách hội thoại của user | Cần Token |
| `POST` | `/api/v1/conversations` | Tạo mới cuộc hội thoại | Cần Token |
| `GET` | `/api/v1/conversations/:id/messages` | Lấy lịch sử chat của 1 hội thoại | Cần Token |
| `DELETE` | `/api/v1/conversations/:id` | Xoá cuộc hội thoại | Cần Token |
| `POST` | `/api/v1/chat/stream` | Gửi câu hỏi và nhận SSE Stream | Cần Token |

---

## 6. Lộ Trình Triển Khai Backend Từng Bước (Backend Roadmap)

### Bước 1: Khởi tạo Project & Cài đặt Dependencies
- Khởi tạo Go Module: `go mod init ai-share-safe-be`
- Cài đặt các thư viện cần thiết:
  - Framework: `github.com/gin-gonic/gin` (hoặc `github.com/go-chi/chi/v5`)
  - Google Gemini SDK: `google.golang.org/genai` (hoặc REST Client stream)
  - Database: `gorm.io/gorm`, `gorm.io/driver/sqlite`, `gorm.io/driver/postgres`
  - JWT: `github.com/golang-jwt/jwt/v5`
  - Logger & Utils: `go.uber.org/zap`, `github.com/joho/godotenv`, `golang.org/x/time`

### Bước 2: Xây dựng Config, Logger & Database Connection
- Viết `internal/config/config.go` đọc biến từ `.env`.
- Cấu hình kết nối DB tự động migration các bảng `users`, `conversations`, `messages`.
- Seed dữ liệu mặc định: Tạo user/passcode mặc định nếu DB trống.

### Bước 3: Xây dựng Module Gemini Service & Key Rotator
- Khởi tạo client Gemini.
- Viết hàm `StreamChat(ctx, history, prompt, systemPrompt, model)` trả về channel hoặc callback stream.
- Viết cơ chế retry / key fallback.

### Bước 4: Xây dựng các Middleware (Auth, RateLimit, CORS, Logger)
- Middleware kiểm tra JWT Bearer.
- Middleware Rate Limiter chống DDOS/Spam.
- Middleware xử lý CORS cho phép Next.js frontend truy cập.

### Bước 5: Viết Handlers & Hoàn thiện SSE Streaming
- Viết `AuthHandler` cho endpoint login passcode.
- Viết `ConversationHandler` cho các thao tác danh sách chat.
- Viết `ChatStreamHandler` với flush từng chunk dữ liệu qua SSE.

### Bước 6: Testing & Dockerization
- Viết test thử nghiệm kết nối Gemini stream qua Go backend.
- Tạo `Dockerfile` đa tầng tối ưu hoá kích thước file chạy.
