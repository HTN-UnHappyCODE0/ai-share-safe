"use client";

import { useState } from "react";
import { X, Code, BookOpen, Languages, PenTool, Sliders, Check } from "lucide-react";
import { Persona } from "@/types/chat";

const PRESET_PERSONAS: Persona[] = [
  {
    id: "default",
    name: "Trợ Lý Đa Năng",
    icon: "sparkles",
    description: "Trợ lý AI tổng quát, trả lời thông minh, súc tích và chính xác.",
    systemPrompt: "Bạn là một trợ lý AI thông minh, nhiệt tình và chính xác. Hãy trả lời câu hỏi bằng tiếng Việt chuẩn mực, rõ ràng, định dạng Markdown đẹp mắt.",
  },
  {
    id: "coder",
    name: "Chuyên Gia Lập Trình",
    icon: "code",
    description: "Chuyên gia Senior về Golang, Next.js, TypeScript, Database & Architecture.",
    systemPrompt: "Bạn là một Senior Software Architect & Fullstack Developer xuất sắc (chuyên sâu về Golang, Next.js, PostgreSQL, Docker). Hãy đưa ra các đoạn mã sạch, tối ưu hiệu năng, có giải thích từng phần và xử lý các trường hợp ngoại lệ (error handling).",
  },
  {
    id: "tutor",
    name: "Gia Sư & Giải Thích",
    icon: "book",
    description: "Giải thích các khái niệm phức tạp một cách đơn giản, từng bước dễ hiểu.",
    systemPrompt: "Bạn là một người thầy tận tâm. Khi giải thích bất kỳ vấn đề nào, hãy chia nhỏ thành từng bước từ cơ bản đến nâng cao, sử dụng ví dụ thực tế trực quan để người đọc dễ tiếp thu nhất.",
  },
  {
    id: "translator",
    name: "Biên Dịch Viên Đa Ngữ",
    icon: "languages",
    description: "Dịch thuật Anh - Việt chuyên nghiệp, tự nhiên theo ngữ cảnh bản xứ.",
    systemPrompt: "Bạn là một biên dịch viên chuyên nghiệp. Khi nhận văn bản, hãy dịch sang ngôn ngữ yêu cầu một cách tự nhiên, đúng sắc thái văn phong, không dịch thô (word-by-word) và giải thích các thuật ngữ chuyên ngành nếu cần.",
  },
  {
    id: "writer",
    name: "Nhà Biên Tập & Sáng Tạo",
    icon: "pen",
    description: "Hỗ trợ viết email, bài đăng blog, báo cáo và sáng tạo nội dung.",
    systemPrompt: "Bạn là chuyên gia sáng tạo nội dung và biên tập viên cao cấp. Hãy giúp người dùng trau chuốt câu chữ, tạo ra các bài viết mạch lạc, lôi cuốn và chuyên nghiệp.",
  },
];

interface PersonaModalProps {
  isOpen: boolean;
  currentPrompt: string;
  onClose: () => void;
  onSave: (prompt: string) => void;
}

export function PersonaModal({
  isOpen,
  currentPrompt,
  onClose,
  onSave,
}: PersonaModalProps) {
  const [selectedId, setSelectedId] = useState<string>("default");
  const [customPrompt, setCustomPrompt] = useState<string>(currentPrompt);

  if (!isOpen) return null;

  const handleSelectPreset = (persona: Persona) => {
    setSelectedId(persona.id);
    setCustomPrompt(persona.systemPrompt);
  };

  const handleSave = () => {
    onSave(customPrompt);
    onClose();
  };

  const getIcon = (id: string) => {
    switch (id) {
      case "coder": return <Code className="w-4 h-4 text-indigo-400" />;
      case "tutor": return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case "translator": return <Languages className="w-4 h-4 text-amber-400" />;
      case "writer": return <PenTool className="w-4 h-4 text-pink-400" />;
      default: return <Sliders className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl p-6 overflow-hidden rounded-2xl glass-panel shadow-2xl border border-white/10">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white">Cấu Hình Vai Trò AI (System Persona)</h3>
            <p className="text-xs text-slate-400">Chọn vai trò định hình cách AI suy nghĩ và phản hồi</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 my-4">
          {PRESET_PERSONAS.map((persona) => {
            const isSelected = selectedId === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => handleSelectPreset(persona)}
                className={`flex items-start gap-2.5 p-3 rounded-xl text-left border transition-all ${
                  isSelected
                    ? "bg-indigo-600/20 border-indigo-500/40 text-white"
                    : "bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="mt-0.5 shrink-0">{getIcon(persona.id)}</div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{persona.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {persona.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Prompt Editor */}
        <div className="mt-4">
          <label className="block mb-1.5 text-xs font-medium text-slate-300">
            Chỉ dẫn hệ thống chi tiết (System Instruction):
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value);
              setSelectedId("custom");
            }}
            rows={4}
            placeholder="Nhập hướng dẫn riêng cho AI..."
            className="w-full p-3 text-xs text-slate-200 bg-slate-950/80 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            Áp Dụng
          </button>
        </div>
      </div>
    </div>
  );
}
