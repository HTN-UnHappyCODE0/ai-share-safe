"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, User as UserIcon, Copy, Check } from "lucide-react";
import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";

interface MessageItemProps {
  message: Message;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 text-xs shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 select-none">
        <span className="font-mono text-[11px] font-medium text-slate-400 lowercase">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-3.5 py-4 px-4 md:px-8 transition-colors",
        isUser ? "bg-transparent justify-end" : "bg-[#111420]/50 border-y border-white/[0.02]"
      )}
    >
      <div
        className={cn(
          "flex gap-3.5 max-w-3xl w-full",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-xl shrink-0 shadow-sm",
            isUser
              ? "bg-indigo-600 text-white"
              : "bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 text-white border border-white/20"
          )}
        >
          {isUser ? <UserIcon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </div>

        {/* Message Content */}
        <div className={cn("flex-1 overflow-hidden", isUser && "text-right")}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-300">
              {isUser ? "Bạn" : "Gemini AI"}
            </span>
          </div>

          <div
            className={cn(
              "text-sm leading-relaxed",
              isUser
                ? "inline-block bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-left shadow-md max-w-xl whitespace-pre-wrap"
                : "markdown-body text-slate-200"
            )}
          >
            {isUser ? (
              message.content
            ) : (
              <>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");

                      if (!inline && match) {
                        return <CodeBlock language={match[1]} code={codeString} />;
                      } else if (!inline && codeString.includes("\n")) {
                        return <CodeBlock language="text" code={codeString} />;
                      }

                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>

                {message.isStreaming && <span className="typing-cursor" />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
