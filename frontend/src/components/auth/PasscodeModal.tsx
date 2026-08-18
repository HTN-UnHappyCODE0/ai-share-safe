"use client";

import { useState } from "react";
import { Lock, Sparkles, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

interface PasscodeModalProps {
  isOpen: boolean;
  onLogin: (passcode: string) => Promise<any>;
}

export function PasscodeModal({ isOpen, onLogin }: PasscodeModalProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      await onLogin(passcode.trim());
    } catch (err: any) {
      setError(err.message || "Mã truy cập không hợp lệ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md p-8 overflow-hidden rounded-2xl glass-panel shadow-2xl border border-white/10">
        {/* Glow ambient circle */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gemini-purple/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          {/* Logo icon */}
          <div className="flex items-center justify-center w-16 h-16 mb-5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/25 border border-white/20">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            AI Share Safe Portal
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Cổng trò chuyện AI bảo mật sử dụng Google Gemini. Vui lòng nhập mã truy cập (Passcode) được cấp.
          </p>

          <form onSubmit={handleSubmit} className="w-full mt-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Nhập Passcode (vd: gemini2026)..."
                autoFocus
                className="w-full py-3.5 pl-11 pr-4 text-sm text-white bg-slate-900/80 border border-slate-700/80 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-500 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-3 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !passcode.trim()}
              className="flex items-center justify-center w-full gap-2 py-3.5 mt-5 font-semibold text-white transition-all bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 rounded-xl hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 border border-indigo-400/20"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Bắt đầu trò chuyện</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-1.5 mt-6 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Mã hoá kết nối qua Backend Go & Gemini API</span>
          </div>
        </div>
      </div>
    </div>
  );
}
