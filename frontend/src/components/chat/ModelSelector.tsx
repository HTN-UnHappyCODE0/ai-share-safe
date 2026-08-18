"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, Zap, Brain, Check } from "lucide-react";
import { ModelInfo } from "@/types/chat";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentModel = models.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel.includes("3.7") ? "Gemini 3.7 Flash" : "Gemini 2.0 Flash",
    description: "Tốc độ phản hồi cực nhanh",
    tag: "Khuyên dùng",
    is_default: true,
  };

  const getModelIcon = (id: string) => {
    if (id.includes("3.7")) return <Brain className="w-4 h-4 text-purple-400" />;
    if (id.includes("pro")) return <Brain className="w-4 h-4 text-indigo-400" />;
    return <Zap className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800/80 hover:bg-slate-800 border border-white/10 rounded-xl transition-all shadow-sm active:scale-[0.98]"
      >
        {getModelIcon(currentModel.id)}
        <span>{currentModel.name}</span>
        <ChevronDown
          className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 w-72 mt-2 p-1.5 rounded-2xl glass-dropdown border border-white/10 shadow-2xl animate-fade-in">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Chọn Mô Hình AI
          </div>
          <div className="space-y-1">
            {models.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-start justify-between w-full p-2.5 rounded-xl text-left transition-all",
                    isSelected
                      ? "bg-indigo-600/20 text-white border border-indigo-500/30"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{getModelIcon(model.id)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{model.name}</span>
                        {model.tag && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                            {model.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                        {model.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
