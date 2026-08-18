"use client";

import { useState } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { PersonaModal } from "./PersonaModal";
import { ModelInfo, Message } from "@/types/chat";

interface ChatContainerProps {
  messages: Message[];
  models: ModelInfo[];
  selectedModel: string;
  isGenerating: boolean;
  systemPrompt: string;
  onSelectModel: (id: string) => void;
  onSaveSystemPrompt: (prompt: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onToggleSidebar: () => void;
}

export function ChatContainer({
  messages,
  models,
  selectedModel,
  isGenerating,
  systemPrompt,
  onSelectModel,
  onSaveSystemPrompt,
  onSend,
  onStop,
  onToggleSidebar,
}: ChatContainerProps) {
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);

  return (
    <main className="flex-1 flex flex-col h-full bg-[#090a0f] overflow-hidden relative">
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <ChatHeader
        models={models}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        onToggleSidebar={onToggleSidebar}
        onOpenPersonaModal={() => setIsPersonaModalOpen(true)}
        hasCustomPersona={!!systemPrompt.trim()}
      />

      <MessageList
        messages={messages}
        onSelectSuggestion={(prompt) => onSend(prompt)}
      />

      <MessageInput
        onSend={onSend}
        onStop={onStop}
        isGenerating={isGenerating}
      />

      <PersonaModal
        isOpen={isPersonaModalOpen}
        currentPrompt={systemPrompt}
        onClose={() => setIsPersonaModalOpen(false)}
        onSave={onSaveSystemPrompt}
      />
    </main>
  );
}
