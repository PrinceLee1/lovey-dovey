// src/context/ToastContext.tsx
// Holds the context, types, and useToast hook (non-component exports)

import { createContext, useCallback, useContext, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
};

export type ToastContextValue = {
  toasts: Toast[];
  dismiss: (id: string) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error:   (message: string, title?: string) => void;
    info:    (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
  };
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const add = useCallback((type: ToastType, message: string, title?: string, duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(t => [...t.slice(-4), { id, type, message, title, duration }]);
  }, []);

  const toast = {
    success: (message: string, title?: string) => add("success", message, title),
    error:   (message: string, title?: string) => add("error",   message, title),
    info:    (message: string, title?: string) => add("info",    message, title),
    warning: (message: string, title?: string) => add("warning", message, title),
  };

  return { toasts, dismiss, toast };
}