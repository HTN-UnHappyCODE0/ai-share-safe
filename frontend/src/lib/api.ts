const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("ai_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("ai_token");
      localStorage.removeItem("ai_user");
      window.dispatchEvent(new Event("auth_change"));
    }
    throw new ApiError(data.error || data.message || "Đã xảy ra lỗi không xác định", response.status);
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  // Auth
  verifyPasscode: (passcode: string) =>
    fetchApi<{ token: string; user: { id: string; username: string; role: string } }>(
      "/api/v1/auth/verify",
      {
        method: "POST",
        body: JSON.stringify({ passcode }),
      }
    ),

  getMe: () => fetchApi<{ id: string; username: string; role: string }>("/api/v1/auth/me"),

  // Models
  getModels: () => fetchApi<Array<{ id: string; name: string; description: string; tag: string; is_default: boolean }>>("/api/v1/models"),

  // Conversations
  getConversations: () => fetchApi<Array<any>>("/api/v1/conversations"),
  createConversation: (title?: string, model?: string, system_prompt?: string) =>
    fetchApi<any>("/api/v1/conversations", {
      method: "POST",
      body: JSON.stringify({ title, model, system_prompt }),
    }),
  getConversation: (id: string) => fetchApi<{ conversation: any; messages: any[] }>(`/api/v1/conversations/${id}`),
  deleteConversation: (id: string) =>
    fetchApi(`/api/v1/conversations/${id}`, {
      method: "DELETE",
    }),
};
