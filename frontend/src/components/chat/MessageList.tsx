"use client";

import { useEffect, useRef } from "react";
import { Sparkles, Code, Terminal, Lightbulb, Compass } from "lucide-react";
import { Message } from "@/types/chat";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: Message[];
  onSelectSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  {
    icon: <Code className="w-4 h-4 text-indigo-400" />,
    title: "Viết hàm SSE Golang",
    prompt: "Viết giúp tôi một handler trong Go (Gin) xử lý Server-Sent Events (SSE) để truyền dữ liệu thời gian thực kèm xử lý ngắt kết nối.",
  },
  {
    icon: <Terminal className="w-4 h-4 text-emerald-400" />,
    title: "Docker Compose Ubuntu",
    prompt: "Hướng dẫn tối ưu hoá file Dockerfile đa tầng và docker-compose.yml chạy Next.js và Go Backend trên Ubuntu Server.",
  },
  {
    icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
    title: "Giải thích Hybrid Reasoning",
    prompt: "Giải thích cơ chế tư duy suy luận lai (Hybrid Reasoning) trên mô hình Gemini 3.7 Flash mới nhất của Google.",
  },
  {
    icon: <Compass className="w-4 h-4 text-purple-400" />,
    title: "Tối ưu Database Postgres",
    prompt: "Các mẹo tối ưu chỉ mục (Index) và cấu hình connection pool cho PostgreSQL khi phục vụ hệ thống có lưu lượng cao?",
  },
];

export function MessageList({ messages, onSelectSuggestion }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto overflow-y-auto">
        <div className="flex items-center justify-center w-16 h-16 mb-5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-500 shadow-xl shadow-indigo-500/20 border border-white/20">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Tôi có thể giúp gì cho bạn hôm nay?
        </h2>
        <p className="mt-2 text-xs md:text-sm text-slate-400 max-w-md">
          Hệ thống AI Proxy kết nối trực tiếp với Google Gemini 3.7 Flash & 2.0 Flash qua máy chủ Backend bảo mật.
        </p>

        {/* Suggestion cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-8">
          {SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-850 border border-white/5 hover:border-indigo-500/30 text-left transition-all group active:scale-[0.99]"
            >
              <div className="p-2 rounded-xl bg-slate-800/80 group-hover:bg-indigo-600/20 transition-colors shrink-0">
                {item.icon}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  {item.prompt}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col py-4">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
