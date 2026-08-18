"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Message } from "@/types/chat";
import { api } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface SendMessageOptions {
  message: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  onConversationCreated?: (id: string, title: string, model: string) => void;
}

export function useChatStream(currentConvId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load message history when switching conversation
  useEffect(() => {
    if (!currentConvId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const loadHistory = async () => {
      try {
        const data = await api.getConversation(currentConvId);
        if (isMounted && data && data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Failed to load message history:", err);
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [currentConvId]);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setMessages((prev) =>
      prev.map((msg, idx) =>
        idx === prev.length - 1 && msg.isStreaming
          ? { ...msg, isStreaming: false, content: msg.content + "\n\n*(Đã dừng sinh)*" }
          : msg
      )
    );
  }, []);

  const sendMessage = useCallback(
    async ({
      message,
      model = "gemini-3.7-flash",
      systemPrompt = "",
      temperature = 0.7,
      onConversationCreated,
    }: SendMessageOptions) => {
      if (!message.trim() || isGenerating) return;

      setError(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("ai_token") : null;
      if (!token) {
        setError("Vui lòng đăng nhập bằng Passcode trước khi chat.");
        return;
      }

      // Add user message to UI immediately
      const userMsgId = "user-" + Date.now();
      const assistantMsgId = "asst-" + Date.now();

      const userMessage: Message = {
        id: userMsgId,
        conversation_id: currentConvId || "",
        role: "user",
        content: message.trim(),
        created_at: new Date().toISOString(),
      };

      const assistantPlaceholder: Message = {
        id: assistantMsgId,
        conversation_id: currentConvId || "",
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
      setIsGenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            conversation_id: currentConvId || "",
            message: message.trim(),
            model,
            system_prompt: systemPrompt,
            temperature,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || `HTTP ${response.status}: Lỗi kết nối máy chủ`);
        }

        if (!response.body) {
          throw new Error("Không thể đọc luồng phản hồi từ máy chủ");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const block of lines) {
            const trimmed = block.trim();
            if (!trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.replace(/^data:\s*/, "");
            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "start") {
                if (event.data?.conversation_id && onConversationCreated) {
                  onConversationCreated(
                    event.data.conversation_id,
                    event.data.title || "Cuộc trò chuyện mới",
                    event.data.model || model
                  );
                }
              } else if (event.type === "chunk") {
                accumulatedContent += event.content || "";
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: accumulatedContent, isStreaming: true }
                      : msg
                  )
                );
              } else if (event.type === "done") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: accumulatedContent, isStreaming: false }
                      : msg
                  )
                );
              } else if (event.type === "error") {
                setError(event.error || "Đã xảy ra lỗi khi tạo phản hồi");
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          content:
                            accumulatedContent +
                            `\n\n⚠️ **Lỗi:** ${event.error || "Không thể hoàn thành câu trả lời"}`,
                          isStreaming: false,
                        }
                      : msg
                  )
                );
              }
            } catch (parseErr) {
              console.warn("Failed to parse SSE line:", jsonStr, parseErr);
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("Chat stream aborted by user");
        } else {
          console.error("Chat streaming error:", err);
          setError(err.message || "Đã xảy ra lỗi không xác định");
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content:
                      msg.content ||
                      `⚠️ **Lỗi:** ${err.message || "Không thể kết nối đến máy chủ AI"}`,
                    isStreaming: false,
                  }
                : msg
            )
          );
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [currentConvId, isGenerating]
  );

  return {
    messages,
    isGenerating,
    error,
    sendMessage,
    stopGenerating,
    setMessages,
  };
}
