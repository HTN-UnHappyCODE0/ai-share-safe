# Kế Hoạch Chi Tiết: Xây Dựng Hệ Thống AI Chat Service (Next.js + Golang + Gemini API + Ubuntu Server)

Hệ thống cho phép bạn tự host một cổng giao tiếp AI Chat (AI Proxy / Wrapper) độc lập, sử dụng Google Gemini API làm lõi xử lý phía sau. Người dùng cuối chỉ tương tác qua giao diện web hiện đại mà không cần tài khoản Google hay biết API Key bí mật của bạn.

---

## 1. Phân Tích Ý Tưởng & Các Vấn Đề Quan Trọng Cần Bổ Sung

```
[Người dùng / Web Browser]
       │ (1. Gửi tin nhắn / Access Token)
       ▼
[Next.js Frontend]
       │ (2. Proxy / Gọi API SSE)
       ▼
[Golang Backend] ──(Kiểm tra Rate Limit / Quota / Auth)──> [PostgreSQL / SQLite]
       │
       │ (3. Gửi System Prompt + Sliding Context Window + API Key Pool)
       ▼
[Google Gemini API] (gemini-1.5-flash / gemini-2.0-flash / gemini-1.5-pro)
       │
       │ (4. Stream từng token trả về theo thời gian thực)
       ▼
[Golang Backend] ──(Lưu Message History & Usage Log)
       │ (5. Server-Sent Events - SSE Stream)
       ▼
[Next.js Frontend] (Render hiệu ứng gõ chữ thời gian thực + Markdown + Code Highlight)
```

### Các vấn đề cốt lõi cần giải quyết:
1. **Phản hồi thời gian thực (Streaming Response - Server-Sent Events / SSE):**
   - *Vấn đề:* Nếu BE đợi Google sinh xong 1000 từ rồi mới gửi về FE, người dùng sẽ phải nhìn màn hình trống xoay vòng 5-15 giây.
   - *Giải pháp:* BE sử dụng cơ chế **Stream chunks (SSE)** từ Gemini SDK để bắn từng từ về Next.js ngay khi có sẵn.
2. **Kiểm soát truy cập & Chống lạm dụng (Authentication & Rate Limiting):**
   - *Vấn đề:* Khi public ra internet, nếu không kiểm soát, bot/người lạ có thể spam làm cạn kiệt Quota API Key hoặc phát sinh chi phí.
   - *Giải pháp:* Hỗ trợ cơ chế **Invite Code / Access Passcode** hoặc tài khoản người dùng đơn giản (JWT). Thiết lập **Rate Limiter** (vd: tối đa 10 tin nhắn / phút / user).
3. **Quản lý ngữ cảnh hội thoại (Multi-turn Chat & Context Window Management):**
   - *Vấn đề:* AI không tự nhớ đoạn chat trước nếu không gửi kèm lịch sử chat. Tuy nhiên gửi toàn bộ lịch sử sẽ tốn token và vượt giới hạn.
   - *Giải pháp:* BE lưu lại hội thoại vào DB và duy trì một **Sliding Window** (gửi kèm 5-10 lượt hội thoại gần nhất) kèm theo **System Prompt** cố định.
4. **Cơ chế Xoay vòng & Dự phòng API Key (Multi-Key Rotation / Fallback):**
   - *Vấn đề:* 1 API Key có thể bị giới hạn RPM (Requests Per Minute) hoặc chạm ngưỡng miễn phí.
   - *Giải pháp:* BE hỗ trợ nạp mảng danh sách nhiều API Keys và tự động xoay vòng hoặc fallback khi gặp lỗi `429 Too Many Requests`.
5. **Bộ lọc an toàn & Tuỳ biến Persona (System Instructions & Prompt Injection Guard):**
   - Cung cấp tính năng chọn "Persona" (Chuyên gia lập trình, Dịch thuật, Trợ lý viết lách...) với các System Instruction tuỳ biến.

---

## 2. Kiến Trúc & Cấu Trúc Thư Mục Dự Án (Tech Stack & Project Structure)

### 2.1. Công nghệ đề xuất (Tech Stack)
- **Frontend:** Next.js (App Router, React 19 / 18, TypeScript), TailwindCSS (hoặc Modern CSS System), Lucide Icons, React-Markdown, Remark-GFM, Rehype-Highlight / PrismJS.
- **Backend:** Golang 1.22+, Web Framework (Gin / Chi / Fiber), Official Google GenAI Go SDK (`google.golang.org/genai` hoặc REST Client SSE), GORM / sqlx, `uber-go/zap` (Logging).
- **Database:** PostgreSQL (hoặc SQLite với WAL mode nếu muốn siêu nhẹ cho máy chủ cá nhân).
- **Deployment:** Docker & Docker Compose, Cloudflare Tunnel (Miễn phí, không cần mở port NAT, có sẵn SSL HTTPS và chống DDoS).

### 2.2. Cấu trúc thư mục (Monorepo / Clean Architecture)

```
ai-share-safe/
├── plan/                           # THƯ MỤC LƯU TRỮ CÁC BẢN KẾ HOẠCH
│   └── implementation_plan.md
├── docker-compose.yml              # Quản lý chạy đồng thời Next.js, Go BE, Postgres, Cloudflared
├── docker-compose.prod.yml
├── .env.example
├── README.md
│
├── backend/                        # GOLANG BACKEND
│   ├── cmd/
│   │   └── server/
│   │       └── main.go             # Entrypoint khởi chạy server
│   ├── internal/
│   │   ├── config/                 # Load biến môi trường, API keys pool
│   │   ├── handler/                # HTTP & SSE Handlers (Chat, Auth, Session)
│   │   ├── middleware/             # Rate Limiter, Auth JWT, CORS, Request Logger
│   │   ├── model/                  # Database Models (GORM/SQL)
│   │   ├── repository/             # Thao tác DB (User, Conversation, Message)
│   │   ├── service/                # Business Logic: Gemini Client, Prompt Builder, Key Rotator
│   │   └── gemini/                 # Tương tác với Google Gemini API (Streaming & Non-streaming)
│   ├── pkg/
│   │   ├── logger/
│   │   └── response/
│   ├── migrations/                 # SQL Migration files
│   ├── Dockerfile
│   ├── go.mod
│   └── go.sum
│
├── frontend/                       # NEXT.JS FRONTEND
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root Layout với Dark Mode & Font
│   │   │   ├── page.tsx            # Trang Chat chính
│   │   │   ├── login/              # Trang nhập Access Code / Đăng nhập
│   │   │   └── api/                # Next.js API Routes (nếu cần proxy thêm)
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatContainer.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageItem.tsx   # Render Markdown + Copy code block
│   │   │   │   ├── MessageInput.tsx  # Textarea tự co giãn + Nút gửi/dừng
│   │   │   │   └── ModelSelector.tsx # Chọn model (Gemini Flash, Pro...)
│   │   │   ├── sidebar/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── ConversationList.tsx
│   │   │   │   └── UserStatus.tsx
│   │   │   └── ui/                   # Modal, Toast, Button, Input UI components
│   │   ├── hooks/
│   │   │   ├── useChatStream.ts    # Custom hook xử lý đọc SSE chunk từ BE
│   │   │   └── useConversations.ts
│   │   ├── lib/
│   │   │   ├── api.ts              # Axios / Fetch client
│   │   │   └── utils.ts
│   │   └── types/                  # TypeScript Interfaces
│   ├── public/
│   ├── Dockerfile
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── package.json
│
└── deploy/                         # DEPLOYMENT SCRIPTS
    ├── cloudflare/
    │   └── config.yml              # Cấu hình Cloudflare Tunnel
    ├── nginx/
    │   └── nginx.conf              # Cấu hình Reverse Proxy nội bộ (nếu dùng)
    └── scripts/
        ├── setup_ubuntu.sh         # Script cài đặt Docker trên Ubuntu server
        └── deploy.sh               # Script 1-click build & run
```

---

## 3. Thiết Kế Cơ Sở Dữ Liệu (Database Schema)

```mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : owns
    USERS ||--o{ API_USAGE_LOGS : tracks
    CONVERSATIONS ||--o{ MESSAGES : contains

    USERS {
        uuid id PK
        string username
        string access_passcode "Mã bí mật cấp cho người dùng"
        string role "admin / user / guest"
        int daily_quota "Giới hạn request mỗi ngày"
        datetime created_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        string title "Tự sinh từ tin nhắn đầu tiên"
        string model "gemini-1.5-flash / gemini-2.0-flash"
        text system_prompt "Chỉ dẫn vai trò cho AI"
        datetime created_at
        datetime updated_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        string sender "user / assistant / system"
        text content "Nội dung tin nhắn markdown"
        int prompt_tokens "Số token đầu vào"
        int completion_tokens "Số token sinh ra"
        datetime created_at
    }

    API_USAGE_LOGS {
        uuid id PK
        uuid user_id FK
        string endpoint
        string model_used
        int total_tokens
        string ip_address
        datetime created_at
    }
```

---

## 4. Đặc Tả API Giữa Frontend & Backend

### 4.1. Authentication / Passcode Verification
- `POST /api/v1/auth/verify-code`
  - Body: `{ "passcode": "SECRET_KEY_123" }`
  - Response: `{ "token": "jwt_token_here", "user": { "id": "...", "role": "user" } }`

### 4.2. Quản lý Hội thoại (Conversations)
- `GET /api/v1/conversations`: Lấy danh sách cuộc trò chuyện trước đó của user.
- `POST /api/v1/conversations`: Tạo cuộc hội thoại mới (tuỳ chọn gán `system_prompt`, `model`).
- `GET /api/v1/conversations/:id/messages`: Lấy toàn bộ tin nhắn trong 1 hội thoại.
- `DELETE /api/v1/conversations/:id`: Xoá cuộc trò chuyện.

### 4.3. Chat & Streaming Endpoint (Cốt lõi)
- `POST /api/v1/chat/stream`
  - Headers: `Authorization: Bearer <token>`, `Accept: text/event-stream`
  - Body:
    ```json
    {
      "conversation_id": "uuid-here",
      "message": "Viết giúp tôi hàm Go đọc file CSV",
      "model": "gemini-1.5-flash",
      "temperature": 0.7
    }
    ```
  - **Dòng dữ liệu trả về (SSE Stream format):**
    ```http
    data: {"type": "start", "message_id": "msg-123"}

    data: {"type": "chunk", "content": "Dưới "}

    data: {"type": "chunk", "content": "đây là "}

    data: {"type": "chunk", "content": "đoạn code..."}

    data: {"type": "done", "total_tokens": 145}
    ```

---

## 5. Kế Hoạch Triển Khai Lên Server Ubuntu Cũ & Public Ra Internet

Vì bạn sử dụng **máy tính cây cũ cài Ubuntu Server đặt tại nhà**, mô hình kết nối tối ưu nhất không phải là mở port router thủ công (dễ bị lộ IP nhà, bị ISP chặn port 80/443 hoặc gặp tình trạng CGNAT không có IP tĩnh), mà là sử dụng **Cloudflare Tunnel (Zero Trust)**.

### 5.1. Ưu điểm của giải pháp Cloudflare Tunnel:
1. **Không cần mở Port Router (No Port Forwarding):** An toàn tuyệt đối cho mạng gia đình.
2. **Không cần IP Tĩnh / Dynamic DNS:** Hoạt động ổn định kể cả khi nhà mạng đổi IP liên tục.
3. **Miễn phí SSL/HTTPS tự động:** Trang web có ổ khoá xanh chuẩn `https://yourdomain.com`.
4. **Bảo vệ DDoS & WAF của Cloudflare:** Chặn các cuộc tấn công quét bot từ internet.

```mermaid
graph LR
    User[Người dùng Internet] -->|HTTPS: yourdomain.com| CloudflareEdge[Cloudflare Edge Network]
    CloudflareEdge -->|Encrypted Tunnel| Cloudflared[Cloudflared Container trên Ubuntu Server]
    Cloudflared -->|Local HTTP:3000| NextJS[Next.js Frontend]
    NextJS -->|Local HTTP:8080| GoBackend[Go Backend]
    GoBackend -->|Outbound HTTPS| GeminiAPI[Google Gemini API]
    GoBackend -->|Internal TCP:5432| Postgres[(PostgreSQL)]
```

### 5.2. Các bước triển khai chi tiết trên Ubuntu Server:
1. **Chuẩn bị máy Ubuntu Server:**
   - Cài đặt `Docker` và `Docker Compose Plugin`.
   - Cấu hình tự khởi động các container khi bật máy: `restart: always`.
2. **Cấu hình biến môi trường (`.env`):**
   - `GEMINI_API_KEYS=key1,key2,key3` (danh sách key xoay vòng).
   - `JWT_SECRET=your_super_secret_string`.
   - `DATABASE_URL=postgres://user:pass@postgres:5432/aisharesafe?sslmode=disable`.
   - `DEFAULT_ACCESS_PASSCODE=YOUR_INVITE_CODE`.
3. **Cấu hình Cloudflare Tunnel (Miễn phí):**
   - Đăng ký tên miền (domain) miễn phí hoặc trả phí (trỏ Nameservers về Cloudflare).
   - Vào Cloudflare Zero Trust -> Networks -> Tunnels -> Tạo Tunnel.
   - Thêm `Public Hostname`: `chat.yourdomain.com` -> trỏ về `http://frontend:3000`.
   - Lấy `TUNNEL_TOKEN` điền vào `docker-compose.yml`.
4. **Khởi chạy hệ thống 1 lệnh duy nhất:**
   ```bash
   docker compose up -d --build
   ```

---

## 6. Lộ Trình Thực Hiện Từng Bước (Implementation Phases)

### Giai đoạn 1: Xây dựng Backend Go (Core Engine)
- [ ] Khởi tạo dự án Go với cấu trúc Clean Architecture.
- [ ] Tích hợp Google Gemini Client SDK hỗ trợ Streaming và Multi-key pool.
- [ ] Xây dựng Database Schema với PostgreSQL / SQLite (Users, Conversations, Messages).
- [ ] Xây dựng Middleware: Rate Limiter (Token Bucket), Auth Guard (Passcode/JWT).
- [ ] Viết SSE Stream Handler `/api/v1/chat/stream`.

### Giai đoạn 2: Xây dựng Frontend Next.js (Modern & Responsive UI)
- [ ] Khởi tạo Next.js với App Router, Dark mode theme sang trọng (Glassmorphism & Slate/Zinc palette).
- [ ] Tạo giao diện Sidebar (Lịch sử chat, danh sách cuộc trò chuyện, tạo mới).
- [ ] Xây dựng khung Chat chính với custom hook `useChatStream` tiêu thụ SSE real-time.
- [ ] Hỗ trợ Markdown Renderer (Code block có nút Copy, highlight syntax, tables).
- [ ] Thêm màn hình xác thực Access Code / Cài đặt model & persona.

### Giai đoạn 3: Containerization & Thử nghiệm cục bộ
- [ ] Viết `Dockerfile` đa tầng (Multi-stage build) cho Go BE (binary siêu nhẹ < 25MB) và Next.js (Standalone output).
- [ ] Viết `docker-compose.yml` kết nối Next.js, Go BE, PostgreSQL.
- [ ] Test luồng chat streaming, ngắt kết nối giữa chừng (AbortController), và lưu trữ lịch sử.

### Giai đoạn 4: Đóng gói Deploy & Hướng dẫn thiết lập trên Ubuntu Server
- [ ] Viết script tự động cài đặt môi trường trên Ubuntu Server (`setup_ubuntu.sh`).
- [ ] Viết file cấu hình Cloudflare Tunnel và tài liệu hướng dẫn từng bước kết nối domain ra internet.
- [ ] Hướng dẫn cài đặt Wake-on-LAN hoặc auto-reboot để server gia đình hoạt động 24/7.
