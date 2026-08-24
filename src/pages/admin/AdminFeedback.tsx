// src/pages/admin/AdminFeedback.tsx
import { useEffect, useState } from "react";
import { api } from "../../libs/axios";
import { useToast } from "../../context/ToastContext";
import { Bug, Lightbulb, Heart, MessageSquare, CheckCircle2, Circle } from "lucide-react";

type Feedback = {
  id: number;
  category: "bug" | "idea" | "praise" | "other";
  message: string;
  status: "new" | "reviewed";
  created_at: string;
  user: { id: number; name: string; email: string } | null;
};

const CATEGORY_META: Record<Feedback["category"], { label: string; icon: React.ReactNode; color: string }> = {
  bug:    { label: "Bug",    icon: <Bug className="w-3.5 h-3.5" />,       color: "bg-red-100 text-red-600 border-red-200" },
  idea:   { label: "Idea",   icon: <Lightbulb className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-700 border-amber-200" },
  praise: { label: "Praise", icon: <Heart className="w-3.5 h-3.5" />,     color: "bg-rose-100 text-rose-600 border-rose-200" },
  other:  { label: "Other",  icon: <MessageSquare className="w-3.5 h-3.5" />, color: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function AdminFeedback() {
  const { toast } = useToast();
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "reviewed">("all");

  useEffect(() => {
    setLoading(true);
    api.get("/admin/feedback", { params: filter === "all" ? {} : { status: filter } })
      .then(({ data }) => setItems(data.data ?? []))
      .catch(() => toast.error("Failed to load feedback"))
      .finally(() => setLoading(false));
  }, [filter]);

  async function toggleReviewed(item: Feedback) {
    try {
      const { data } = await api.patch(`/admin/feedback/${item.id}`, { reviewed: item.status !== "reviewed" });
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, status: data.status } : x)));
    } catch {
      toast.error("Failed to update");
    }
  }

  const newCount = items.filter((i) => i.status === "new").length;

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "Georgia,serif" }}>Feedback</h1>
          <p className="text-sm text-gray-400 mt-1">{items.length} messages{filter === "all" && newCount > 0 ? ` · ${newCount} new` : ""}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-white border border-rose-100 rounded-xl p-1 w-fit shadow-sm">
        {(["all", "new", "reviewed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition ${
              filter === f ? "bg-rose-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-300 animate-pulse">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="w-8 h-8 text-rose-200 mx-auto mb-3" />
            <div className="text-gray-300 text-sm">No feedback yet</div>
          </div>
        ) : (
          <div className="divide-y divide-rose-50">
            {items.map((item) => {
              const meta = CATEGORY_META[item.category];
              return (
                <div key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-rose-50/30 transition">
                  <button
                    onClick={() => toggleReviewed(item)}
                    title={item.status === "reviewed" ? "Mark as new" : "Mark reviewed"}
                    className={`mt-0.5 flex-shrink-0 transition ${item.status === "reviewed" ? "text-emerald-500" : "text-gray-300 hover:text-emerald-500"}`}
                  >
                    {item.status === "reviewed" ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">{item.user?.name ?? "Unknown"}</span>
                      <span className="text-xs text-gray-300">{item.user?.email}</span>
                      <span className="text-xs text-gray-300 ml-auto flex-shrink-0">
                        {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{item.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
