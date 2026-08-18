"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useChatStream } from "@/hooks/useChatStream";
import { PasscodeModal } from "@/components/auth/PasscodeModal";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ModelInfo } from "@/types/chat";
import { api } from "@/lib/api";

const DEFAULT_MODELS: ModelInfo[] = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    description: "Mô hình mới nhất, tư duy thông minh và tốc độ phản hồi cực nhanh.",
    tag: "Khuyên dùng",
    is_default: true,
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    description: "Tốc độ phản hồi tức thì, tối ưu câu hỏi nhanh hàng ngày.",
    tag: "Tốc độ cao",
    is_default: false,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Mô hình tiêu chuẩn ổn định, xử lý đa tác vụ.",
    tag: "Tiêu chuẩn",
    is_default: false,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Mô hình suy luận sâu, xử lý tài liệu dài và bài toán phức tạp.",
    tag: "Chuyên sâu",
    is_default: false,
  },
];

export default function ChatPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, login, logout } = useAuth();
  const {
    conversations,
    currentConvId,
    selectConversation,
    createNewChat,
    deleteConversation,
    addConversation,
  } = useConversations(isAuthenticated);

  const {
    messages,
    isGenerating,
    sendMessage,
    stopGenerating,
  } = useChatStream(currentConvId);

  const [models, setModels] = useState<ModelInfo[]>(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch available models from backend when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .getModels()
      .then((data) => {
        if (data && data.length > 0) {
          setModels(data);
          const defaultM = data.find((m) => m.is_default);
          if (defaultM) {
            setSelectedModel(defaultM.id);
          }
        }
      })
      .catch((err) => {
        console.warn("Using default models fallback:", err);
      });
  }, [isAuthenticated]);

  const handleSend = (text: string) => {
    sendMessage({
      message: text,
      model: selectedModel,
      systemPrompt,
      onConversationCreated: (newId, title, modelName) => {
        selectConversation(newId);
        addConversation({
          id: newId,
          user_id: user?.id || "",
          title,
          model: modelName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      },
    });
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#090a0f] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Đang tải AI Share Safe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f]">
      {/* Passcode Modal when not authenticated */}
      <PasscodeModal
        isOpen={!isAuthenticated}
        onLogin={login}
      />

      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConvId={currentConvId}
        isOpen={isSidebarOpen}
        user={user}
        onClose={() => setIsSidebarOpen(false)}
        onSelectConversation={selectConversation}
        onCreateNewChat={createNewChat}
        onDeleteConversation={deleteConversation}
        onLogout={logout}
      />

      {/* Main Chat Interface */}
      <ChatContainer
        messages={messages}
        models={models}
        selectedModel={selectedModel}
        isGenerating={isGenerating}
        systemPrompt={systemPrompt}
        onSelectModel={setSelectedModel}
        onSaveSystemPrompt={setSystemPrompt}
        onSend={handleSend}
        onStop={stopGenerating}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />
    </div>
  );
}
