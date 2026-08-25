// src/pages/admin/AdminAnnouncements.tsx
import { useEffect, useState } from "react";
import { api } from "../../libs/axios";
import { useToast } from "../../context/ToastContext";
import { Megaphone, Send, Users, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Announcement = {
  id: number;
  subject: string;
  body: string;
  status: "pending" | "sending" | "sent" | "failed";
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
  sender: { id: number; name: string } | null;
};

const IC = "w-full bg-[#fef9f5] dark:bg-gray-800 border border-rose-100 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none focus:border-rose-300 dark:focus:border-rose-700 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950 transition";

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [eligible, setEligible] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function load() {
    setLoading(true);
    api.get("/admin/announcements")
      .then(({ data }) => { setItems(data.data ?? []); setEligible(data.eligible_recipients ?? 0); })
      .catch(() => toast.error("Failed to load announcements"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function send() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post("/admin/announcements", { subject: subject.trim(), body: body.trim() });
      setItems((list) => [data, ...list]);
      setSubject("");
      setBody("");
      toast.success(`Sent to ${data.sent_count} user${data.sent_count === 1 ? "" : "s"}!`);
    } catch {
      toast.error("Failed to send announcement");
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100" style={{ fontFamily: "Georgia,serif" }}>Features & Tips</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Email users who opted in to "New features & tips" in Settings</p>
      </div>

      {/* Compose */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-fuchsia-400 to-violet-600 grid place-items-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Compose an announcement</span>
          {eligible !== null && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <Users className="w-3.5 h-3.5" /> {eligible.toLocaleString()} eligible recipient{eligible === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 150))} placeholder="e.g. New game: Spice Dice 🎲" className={IC} />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 5000))}
            rows={6}
            placeholder="What's new? Use a blank line between paragraphs."
            className={IC + " resize-none"}
          />
          <div className="text-right text-[11px] text-gray-300 dark:text-gray-600">{body.length}/5000</div>
        </div>

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!subject.trim() || !body.trim() || sending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 hover:brightness-105 transition"
        >
          <Send className="w-4 h-4" /> Send to {eligible ?? "…"} user{eligible === 1 ? "" : "s"}
        </button>
      </div>

      {/* History */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-rose-50 dark:border-gray-800">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Sent history</span>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-300 dark:text-gray-600 animate-pulse">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Megaphone className="w-8 h-8 text-rose-200 dark:text-gray-700 mx-auto mb-3" />
            <div className="text-gray-300 dark:text-gray-600 text-sm">No announcements sent yet</div>
          </div>
        ) : (
          <div className="divide-y divide-rose-50 dark:divide-gray-800">
            {items.map((a) => (
              <div key={a.id} className="px-5 py-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.subject}</span>
                  {a.status === "sent" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Sent to {a.sent_count}{a.failed_count > 0 ? ` (${a.failed_count} failed)` : ""}
                    </span>
                  ) : a.status === "failed" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-300 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> {a.status === "sending" ? "Sending…" : "Pending"}
                    </span>
                  )}
                  <span className="text-xs text-gray-300 dark:text-gray-600 ml-auto flex-shrink-0">
                    {new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })}
                    {a.sender ? ` · ${a.sender.name}` : ""}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words line-clamp-3">{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm send */}
      <AnimatePresence>
        {confirmOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !sending && setConfirmOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-900 border border-rose-100 dark:border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-rose-100 dark:shadow-black/40">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-fuchsia-400 to-violet-600 grid place-items-center mx-auto mb-4">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-gray-900 dark:text-gray-100 font-bold text-center mb-1" style={{ fontFamily: "Georgia,serif" }}>
                  Send to {eligible ?? "…"} user{eligible === 1 ? "" : "s"}?
                </h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-5">
                  This emails everyone with "New features & tips" turned on right now. It can't be recalled.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmOpen(false)} disabled={sending}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={send} disabled={sending}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-sm font-semibold hover:brightness-105 transition disabled:opacity-50">
                    {sending ? "Sending…" : "Send now"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
