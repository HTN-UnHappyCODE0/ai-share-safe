"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";

interface MessageInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onStop,
  isGenerating,
  disabled,
}: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && input.trim()) {
        onSend(input);
        setInput("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) {
      onStop();
      return;
    }

    if (input.trim()) {
      onSend(input);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <form onSubmit={handleSubmit} className="relative flex flex-col glass-panel rounded-2xl p-2 border border-white/10 shadow-xl focus-within:border-indigo-500/50 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hỏi bất kỳ điều gì (Nhấn Enter để gửi, Shift + Enter để xuống dòng)..."
          rows={1}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none max-h-44 leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1 px-1 text-xs text-slate-500">
          <span className="text-[11px] hidden sm:inline text-slate-500">
            Powered by Google Gemini API & Golang SSE Proxy
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-xs text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl transition-all active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Dừng</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={disabled || !input.trim()}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-indigo-600/30"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
