// UpcomingLobbies.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../../libs/axios";
import { Globe, Lock, Users, CalendarClock, TrashIcon } from "lucide-react";

type Lobby = {
  id: number;
  code: string;
  name: string;
  max_players: number;
  entry_coins: number;
  privacy: "Public" | "Private";
  status: "open" | "in_progress" | "ended";
  start_at?: string | null;   // ISO
  host_id: number;
};

import type { MotionProps } from "framer-motion";
import { useAuth } from "../../context/AuthContext";

export default function UpcomingLobbies({ variants }: { variants: MotionProps }) {
  const nav = useNavigate();
  const [pub, setPub] = useState<Lobby[]>([]);
  const [mine, setMine] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [a, b] = await Promise.all([
          api.get<Lobby[]>("/lobbies/public"),
          api.get<Lobby[]>("/lobbies/mine"),
        ]);
        setPub(a.data || []);
        setMine(b.data || []);
      } catch (e: unknown) {
        if (
          typeof e === "object" &&
          e !== null &&
          "response" in e &&
          typeof (e as { response?: { data?: { message?: string } } }).response === "object"
        ) {
          const errObj = e as { response?: { data?: { message?: string }, message?: string } };
          setErr(
            errObj.response?.data?.message ||
            errObj.response?.message ||
            "Unable to load lobbies"
          );
        } else if (typeof e === "object" && e !== null && "message" in e) {
          setErr((e as { message?: string }).message || "Unable to load lobbies");
        } else {
          setErr("Unable to load lobbies");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mineIds = useMemo(() => new Set(mine.map((l) => l.id)), [mine]);
  const deleteLobby = async (id: number) => {
    try {
      await api.delete(`/lobbies/${id}`);
      setMine((prev) => prev.filter((l) => l.id !== id));
      //refresh public lobbies as well
      setPub((prev) => prev.filter((l) => l.id !== id));
    } catch (e: unknown) {
      if (
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response === "object"
      ) {
        alert(
          (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
          "Failed to delete lobby"
        );
      } else if (typeof e === "object" && e !== null && "message" in e) {
        alert((e as { message?: string }).message || "Failed to delete lobby");
      } else {
        alert("Failed to delete lobby");
      }
    }
  };
  const list = useMemo(() => {
    const map = new Map<number, Lobby>();
    [...pub, ...mine].forEach((l) => map.set(l.id, l)); // de-dupe
    const arr = Array.from(map.values());
    // sort by start time (soonest first); "Anytime"/null at the end
    arr.sort((x, y) => {
      const ax = x.start_at ? new Date(x.start_at).getTime() : Number.POSITIVE_INFINITY;
      const ay = y.start_at ? new Date(y.start_at).getTime() : Number.POSITIVE_INFINITY;
      return ax - ay;
    });
    return arr;
  }, [pub, mine]);

  function whenLabel(iso?: string | null) {
    if (!iso) return "Anytime";
    const d = new Date(iso);
    const now = new Date();
    const today = d.toDateString() === now.toDateString();
    const tmr = new Date(now); tmr.setDate(now.getDate() + 1);
    const tomorrow = d.toDateString() === tmr.toDateString();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const day = today
      ? "Today"
      : tomorrow
      ? "Tomorrow"
      : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    return `${day} • ${time}`;
  }

  async function join(l: Lobby) {
    try {
      await api.post(`/lobbies/${l.code}/join`);
      nav(`/lobby/${l.code}`);
    } catch (e: unknown) {
      if (
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response === "object"
      ) {
        alert(
          (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
          "Failed to join lobby"
        );
      } else if (typeof e === "object" && e !== null && "message" in e) {
        alert((e as { message?: string }).message || "Failed to join lobby");
      } else {
        alert("Failed to join lobby");
      }
    }
  }

  return (
    <motion.div {...variants} className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
      <div className="font-display font-semibold text-gray-900 mb-4">Upcoming Lobbies</div>

      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
          {err}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse border rounded-2xl p-3">
              <div className="h-4 w-40 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-64 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-sm text-gray-500">No lobbies yet. Be the first to create one!</div>
      ) : (
        <div className="space-y-3">
          {list.map((l) => {
            const isMinePrivate = mineIds.has(l.id) && l.privacy === "Private";
            const badge = l.privacy === "Public"
              ? { icon: <Globe className="w-3.5 h-3.5" />, text: "Public", cls: "border-emerald-200 text-emerald-700" }
              : { icon: <Lock className="w-3.5 h-3.5" />, text: isMinePrivate ? "Private • mine" : "Private", cls: "border-amber-200 text-amber-700" };

            return (
              <div key={l.id} className="border rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{l.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                    <span className={`inline-flex items-center mt-2 gap-1 px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
                      {badge.icon} <span>{badge.text}</span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 mt-3">
                      <CalendarClock className="w-3.5 h-3.5" /> {whenLabel(l.start_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 ml-3">
                      <Users className="w-3.5 h-3.5" />{l.max_players}
                    </span>
                    </div>
                </div>

                {mineIds.has(l.id) ? (
                  <button
                    onClick={() => nav(`/lobby/${l.code}`)}
                    className="text-sm px-2 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white -mt-5"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    onClick={() => join(l)}
                    disabled={l.status !== "open"}
                    className="text-sm px-2 py-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-50 -mt-2"
                  >
                    {l.status === "open" ? "Join" : l.status.replace("_", " ")}
                  </button>
                )}
                {
                  l.host_id == user?.id && (
                    <div title="Delete Lobby" className="-mt-5">
                      <button
                        onClick={() => deleteLobby(l.id)}
                        className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                      >
                        <TrashIcon className="w-4 h-4" color="red" />
                      </button>
                    </div>
                  )
                }
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
