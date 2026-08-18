"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { Conversation } from "@/types/chat";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  return (
    <div
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all duration-150 select-none",
        isActive
          ? "bg-indigo-600/20 text-white font-medium border border-indigo-500/30 shadow-sm"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
      )}
    >
      <MessageSquare
        className={cn(
          "w-4 h-4 shrink-0 transition-colors",
          isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
        )}
      />

      <span className="truncate flex-1 text-left">
        {conversation.title || "Cuộc trò chuyện mới"}
      </span>

      {/* Delete button on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("Bạn có chắc muốn xoá cuộc trò chuyện này?")) {
            onDelete(conversation.id);
          }
        }}
        title="Xoá hội thoại"
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
