// src/components/Toast.tsx
// Only exports components (satisfies react-refresh/only-export-components rule)

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { ToastContext, useToastState } from "../context/ToastContext";
import type { Toast, ToastType } from "../context/ToastContext";

const CONFIG: Record<ToastType, {
  icon: React.ReactNode;
  border: string;
  title: string;
  text: string;
  iconColor: string;
  progressColor: string;
}> = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    border: "border-emerald-200",
    title: "text-emerald-800",
    text: "text-emerald-700",
    iconColor: "text-emerald-500",
    progressColor: "bg-emerald-500",
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    border: "border-red-200",
    title: "text-red-800",
    text: "text-red-700",
    iconColor: "text-red-500",
    progressColor: "bg-red-500",
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    border: "border-fuchsia-200",
    title: "text-fuchsia-800",
    text: "text-fuchsia-700",
    iconColor: "text-fuchsia-500",
    progressColor: "bg-fuchsia-500",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    border: "border-amber-200",
    title: "text-amber-800",
    text: "text-amber-700",
    iconColor: "text-amber-500",
    progressColor: "bg-amber-500",
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg      = CONFIG[toast.type];
  const duration = toast.duration ?? 4000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,   scale: 1     }}
      exit={{    opacity: 0, y: -16, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`relative w-full max-w-sm rounded-2xl border bg-white shadow-xl overflow-hidden ${cfg.border}`}
    >
      {/* Auto-dismiss progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 ${cfg.progressColor} origin-left`}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        onAnimationComplete={() => onDismiss(toast.id)}
      />

      <div className="flex items-start gap-3 p-4">
        <div className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`}>{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className={`text-sm font-semibold leading-snug ${cfg.title}`}>
              {toast.title}
            </div>
          )}
          <div className={`text-sm leading-snug ${toast.title ? "mt-0.5" : ""} ${cfg.text}`}>
            {toast.message}
          </div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, dismiss, toast } = useToastState();

  return (
    <ToastContext.Provider value={{ toasts, dismiss, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}