"use client";

import { Plus, Sparkles, LogOut, User as UserIcon, X, Server, MessageSquare } from "lucide-react";
import { Conversation, User } from "@/types/chat";
import { ConversationItem } from "./ConversationItem";
import { cn } from "@/lib/utils";

interface SidebarProps {
  conversations: Conversation[];
  currentConvId: string | null;
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSelectConversation: (id: string | null) => void;
  onCreateNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  conversations,
  currentConvId,
  isOpen,
  user,
  onClose,
  onSelectConversation,
  onCreateNewChat,
  onDeleteConversation,
  onLogout,
}: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex flex-col w-[280px] bg-[#0d101a] border-r border-white/5 transition-transform duration-300 ease-in-out shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">AI Share Safe</h1>
              <p className="text-[10px] text-slate-400">Gemini AI Proxy Engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg md:hidden hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onCreateNewChat();
              onClose();
            }}
            className="flex items-center justify-center w-full gap-2 px-4 py-2.5 text-sm font-medium text-white transition-all bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:opacity-95 shadow-md shadow-indigo-600/20 border border-indigo-400/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo đoạn chat mới</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Lịch sử trò chuyện
          </div>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 px-4">
              <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">Chưa có cuộc trò chuyện nào</p>
              <p className="text-[11px] text-slate-600 mt-1">Bắt đầu bằng câu hỏi đầu tiên!</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={currentConvId === conv.id}
                onSelect={(id) => {
                  onSelectConversation(id);
                  onClose();
                }}
                onDelete={onDeleteConversation}
              />
            ))
          )}
        </div>

        {/* Server & User Footer */}
        <div className="p-3 border-t border-white/5 space-y-2">
          {/* Server status indicator */}
          <div className="flex items-center justify-between px-3 py-2 text-xs rounded-lg bg-slate-900/60 border border-white/5 text-slate-400">
            <div className="flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full bg-emerald-400 rounded-full opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 bg-emerald-500 rounded-full" />
              </span>
              <span className="text-[11px]">Ubuntu Server</span>
            </div>
            <Server className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/80 border border-white/5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.username || "Admin"}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role || "User"}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
