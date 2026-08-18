"use client";

import { Menu, Sliders, ShieldCheck } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { ModelInfo } from "@/types/chat";

interface ChatHeaderProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (id: string) => void;
  onToggleSidebar: () => void;
  onOpenPersonaModal: () => void;
  hasCustomPersona: boolean;
}

export function ChatHeader({
  models,
  selectedModel,
  onSelectModel,
  onToggleSidebar,
  onOpenPersonaModal,
  hasCustomPersona,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0d101a]/80 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          title="Mở menu lịch sử"
          className="p-2 text-slate-400 hover:text-white rounded-xl md:hidden hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onSelectModel={onSelectModel}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenPersonaModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
            hasCustomPersona
              ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
              : "text-slate-400 hover:text-slate-200 bg-slate-800/40 border-white/5 hover:bg-slate-800"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vai trò AI</span>
        </button>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Proxy An Toàn</span>
        </div>
      </div>
    </header>
  );
}
