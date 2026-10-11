"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastItem {
  id: string;
  type: "success" | "warning" | "error" | "info";
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
            warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
            error: <XCircle className="h-4 w-4 text-rose-400" />,
            info: <Info className="h-4 w-4 text-cyan-400" />,
          };

          const borders = {
            success: "border-emerald-500/30 bg-emerald-950/80 text-emerald-100",
            warning: "border-amber-500/30 bg-amber-950/80 text-amber-100",
            error: "border-rose-500/30 bg-rose-950/80 text-rose-100",
            info: "border-cyan-500/30 bg-cyan-950/80 text-cyan-100",
          };

          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-xl transition-all duration-200 text-sm font-medium animate-in slide-in-from-bottom-2",
                borders[toast.type]
              )}
            >
              {icons[toast.type]}
              <span>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-auto text-white/50 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
