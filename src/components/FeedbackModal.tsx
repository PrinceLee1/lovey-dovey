import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, Lightbulb, Heart, MessageSquare, X } from "lucide-react";
import { api } from "../libs/axios";
import { useToast } from "../context/ToastContext";

type Category = "bug" | "idea" | "praise" | "other";

const CATEGORIES: { value: Category; label: string; icon: React.ReactNode }[] = [
  { value: "idea", label: "Idea", icon: <Lightbulb className="w-4 h-4" /> },
  { value: "bug", label: "Bug", icon: <Bug className="w-4 h-4" /> },
  { value: "praise", label: "Praise", icon: <Heart className="w-4 h-4" /> },
  { value: "other", label: "Other", icon: <MessageSquare className="w-4 h-4" /> },
];

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [category, setCategory] = useState<Category>("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post("/feedback", { category, message: message.trim() });
      setSent(true);
    } catch {
      toast.error("Couldn't send your feedback — try again?");
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-xl"
      >
        {sent ? (
          <div className="text-center py-4 space-y-3">
            <div className="text-4xl">💌</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Thanks for the feedback!</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">We read every message — it genuinely helps shape what we build next.</div>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 inline-flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-fuchsia-500" /> Send feedback
              </div>
              <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition ${
                    category === c.value
                      ? "border-fuchsia-400 dark:border-fuchsia-700 bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder="What's on your mind? A bug you hit, a feature you'd love, or just how you're liking LoveyDovey…"
              className="w-full rounded-xl border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 resize-none"
            />
            <div className="text-right text-[11px] text-gray-400 dark:text-gray-500 mt-1">{message.length}/2000</div>

            <button
              onClick={submit}
              disabled={sending || !message.trim()}
              className="w-full mt-2 rounded-xl py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send feedback"}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function FeedbackModalPortal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <FeedbackModal onClose={onClose} />}</AnimatePresence>;
}
