# Kế Hoạch Chi Tiết Xây Dựng Frontend (Next.js) Cho AI Share Safe

Tài liệu này đặc tả toàn diện về giao diện, trải nghiệm người dùng (UX/UI), kiến trúc thư mục và luồng tương tác thời gian thực (SSE Streaming) cho **Frontend Next.js**.

---

## 1. Định Hướng Trải Nghiệm & Thẩm Mỹ Giao Diện (Design System & Aesthetics)

Giao diện được thiết kế theo tiêu chuẩn hiện đại, cao cấp (tương tự ChatGPT, Claude và Google Gemini Web):
- **Bảng màu (Dark Mode Sleek Theme):**
  - Nền chính: Deep Slate / Obsidian Dark (`#090a0f`, `#0f121d`)
  - Bảng điều khiển / Sidebar: Glassmorphism Glass Panel (`#141824` với viền `border-white/10`, `backdrop-blur-md`)
  - Điểm nhấn ánh sáng: Gradient tím - xanh neon (Indigo `#6366f1` / Violet `#8b5cf6` / Emerald `#10b981`)
- **Hiệu ứng & Hoạt ảnh (Micro-animations):**
  - Hiệu ứng gõ chữ (Streaming typing cursor) mượt mà không giật khung hình.
  - Khối mã nguồn (Code Block) có nút copy 1-click kèm thông báo phản hồi tick xanh.
  - Tự động cuộn trang thông minh (Auto-scroll to bottom) khi đang nhận tin nhắn stream và giữ nguyên vị trí nếu người dùng cuộn lên đọc lại lịch sử.
- **Tương thích toàn diện (Mobile & Desktop Responsive):**
  - Desktop: Thanh Sidebar trái 260px cố định, có thể thu gọn.
  - Mobile: Drawer trượt mềm mại kèm nút đóng/mở nhanh.

---

## 2. Cấu Trúc Thư Mục Frontend (`frontend/`)

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout, fonts, meta tags
│   │   ├── page.tsx                  # Trang Chat chính
│   │   └── globals.css               # Design system tokens, Glassmorphism, Code styles
│   ├── components/
│   │   ├── auth/
│   │   │   └── PasscodeModal.tsx     # Popup nhập mã truy cập (Passcode) khi chưa có JWT
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx     # Khung bao bọc chính cho Chat
│   │   │   ├── ChatHeader.tsx        # Thanh tiêu đề, chọn Model, mở cài đặt Persona
│   │   │   ├── MessageList.tsx       # Danh sách tin nhắn & auto-scroll
│   │   │   ├── MessageItem.tsx       # Hiển thị từng tin nhắn, Markdown & Code highlight
│   │   │   ├── MessageInput.tsx      # Textarea tự co giãn, nút Gửi / Dừng sinh chữ
│   │   │   ├── ModelSelector.tsx     # Dropdown chọn model (Gemini 3.7 Flash, 2.0 Flash...)
│   │   │   └── PersonaModal.tsx      # Modal cấu hình System Prompt / Vai trò AI
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx           # Thanh điều hướng trái
│   │   │   ├── ConversationItem.tsx  # Từng mục hội thoại (Đổi tên / Xoá)
│   │   │   └── UserFooter.tsx        # Thông tin user & nút Đăng xuất
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Toast.tsx
│   ├── hooks/
│   │   ├── useAuth.ts                # Quản lý token, passcode, login/logout
│   │   ├── useChatStream.ts          # Core hook: Đọc SSE chunks từ Go Backend & Abort
│   │   └── useConversations.ts       # Quản lý danh sách hội thoại CRUD
│   ├── lib/
│   │   ├── api.ts                    # HTTP client kèm token header tự động
│   │   └── utils.ts
│   └── types/
│       └── chat.ts                   # TypeScript interfaces (Message, Conversation, ModelInfo)
├── Dockerfile                        # Multi-stage production build (Standalone output)
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── package.json
└── tsconfig.json
```

---

## 3. Các Luồng Nghiệp Vụ Cốt Lõi (Core Frontend Flows)

### 3.1. Luồng Xác Thực (Passcode Auth Flow)
1. Khi người dùng mở trang web, `useAuth` kiểm tra xem trong `localStorage` đã có `token` hợp lệ chưa.
2. Nếu chưa có token: Hiển thị `PasscodeModal` đẹp mắt yêu cầu nhập mã truy cập.
3. Người dùng nhập Passcode ➔ Gọi API `POST /api/v1/auth/verify` ➔ Lưu Token và thông tin User vào `localStorage` ➔ Mở khóa giao diện chat.
4. Có nút **Đăng xuất** ở góc dưới sidebar để xoá token khi cần.

### 3.2. Luồng SSE Chat Streaming (`useChatStream.ts`)
1. Người dùng nhập câu hỏi vào `MessageInput` và nhấn Enter (hoặc bấm nút Gửi).
2. Tin nhắn của người dùng lập tức hiển thị trên màn hình.
3. Tạo `AbortController` mới và gọi `fetch(BACKEND_URL + "/api/v1/chat/stream", { method: 'POST', signal: controller.signal })`.
4. Đọc luồng `response.body.getReader()` bằng `TextDecoder`:
   - Bắt sự kiện `type: "start"`: Nhận `conversation_id` mới (nếu là chat mới) và cập nhật sidebar.
   - Bắt sự kiện `type: "chunk"`: Nối từng từ (`content`) vào tin nhắn của AI theo thời gian thực.
   - Bắt sự kiện `type: "done"`: Kết thúc stream, bật lại nút gửi.
   - Bắt sự kiện `type: "error"`: Hiển thị lỗi thân thiện.
5. Nếu người dùng bấm **"Dừng sinh câu trả lời"**: Gọi `controller.abort()`, Backend Go lập tức ngừng gọi Gemini.

### 3.3. Luồng Hiển Thị Markdown & Khối Mã (Code Blocks)
- Render định dạng Markdown đầy đủ (in đậm, in nghiêng, danh sách, trích dẫn, bảng dữ liệu).
- Tự động nhận diện ngôn ngữ lập trình (Python, Go, JavaScript, TypeScript, HTML, CSS, SQL, Bash...).
- Khung code bo góc đẹp mắt, có nhãn ngôn ngữ bên góc trái và nút **Copy Code** bên góc phải (có animation chuyển thành icon tích xanh trong 2 giây khi bấm).

---

## 4. Lộ Trình Triển Khai Frontend Từng Bước

### Bước 1: Khởi tạo Project Next.js & Cài đặt Dependencies
- Cài đặt Next.js 14/15 App Router với TypeScript và Tailwind CSS.
- Cài đặt các thư viện bổ trợ:
  - `lucide-react` (Icon hiện đại)
  - `react-markdown`, `remark-gfm` (Xử lý Markdown chuẩn Github)
  - `prismjs` / `clsx` / `tailwind-merge`

### Bước 2: Xây dựng Design System & Cấu hình Styles
- Cấu hình màu sắc, gradient và font chữ trong `globals.css` và `tailwind.config.ts`.
- Viết các utility class hỗ trợ Glassmorphism và scrollbar tùy biến.

### Bước 3: Xây dựng Module Auth & API Client
- Viết `src/lib/api.ts` hỗ trợ kết nối Backend Go qua biến môi trường `NEXT_PUBLIC_API_URL`.
- Viết `src/hooks/useAuth.ts` và component `PasscodeModal.tsx`.

### Bước 4: Xây dựng Module Quản Lý Hội Thoại & Sidebar
- Viết `src/hooks/useConversations.ts` tải danh sách hội thoại từ `/api/v1/conversations`.
- Viết `Sidebar.tsx` hỗ trợ tạo mới, chọn hội thoại và xoá hội thoại.

### Bước 5: Xây dựng Khung Chat, SSE Streaming Hook & Markdown Renderer
- Viết `useChatStream.ts` xử lý toàn bộ cơ chế đọc ReadableStream.
- Viết `MessageList.tsx`, `MessageItem.tsx` và `MessageInput.tsx`.
- Viết `ModelSelector.tsx` hỗ trợ chọn `Gemini 3.7 Flash`, `Gemini 2.0 Flash`, `Gemini 1.5 Pro`.
- Viết `PersonaModal.tsx` cho phép người dùng tùy biến vai trò của AI.

### Bước 6: Thử nghiệm cục bộ kết nối toàn diện FE ➔ BE ➔ DB ➔ Gemini API
- Khởi động đồng thời Go Backend và Next.js Frontend.
- Chat thử nghiệm nhiều lượt để kiểm tra độ mượt của SSE stream, tính năng dừng stream, và lưu lịch sử vào PostgreSQL.
