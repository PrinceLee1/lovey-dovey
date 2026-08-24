import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, SkipForward } from "lucide-react";
import { echo } from "../libs/echo";
import { api } from "../libs/axios";
import { useAuth } from "../context/AuthContext";
import { usePartner } from "../hooks/usePartner";
import { useToast } from "../context/ToastContext";

type SessionState = {
  phase?: "picking" | "prompt";
  currentType?: "truth" | "dare" | null;
  currentPrompt?: string | null;
  skips?: number;
  done?: number;
  xp?: number;
};

type S = {
  code: string;
  kind: string;
  round: number;
  turnUserId: number | null;
  status: "waiting" | "active" | "ended" | "aborted";
  state: SessionState;
  createdBy: number;
  partnerUserId: number;
};

function FullscreenShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-rose-50 via-pink-50 to-white dark:from-[#0b0b12] dark:via-[#100c17] dark:to-[#0b0b12] grid place-items-center p-4 z-50">
      <div className={`w-full ${wide ? "max-w-lg" : "max-w-sm"} rounded-3xl bg-white dark:bg-gray-900 shadow-2xl border border-rose-100 dark:border-gray-800 p-6`}>
        {children}
      </div>
    </div>
  );
}

export default function CoupleSession() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { partner } = usePartner();
  const { toast } = useToast();
  const meId = user?.id;

  const [s, setS] = useState<S | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/sessions/${code}`);
        setS(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  useEffect(() => {
    if (!code) return;
    const ch = echo
      .join(`couple-session.${code}`)
      .listen(".session.created", (e: any) => setS((prev) => (prev ? { ...prev, ...e } : prev)))
      .listen(".session.updated", (e: any) => setS((prev) => (prev ? { ...prev, ...e } : prev)));
    return () => {
      try {
        ch.leave();
      } catch {
        /* empty */
      }
    };
  }, [code]);

  // Fallback poll — the real-time broadcast can be missed (a dropped socket,
  // a backgrounded tab throttling reconnects), which would otherwise leave
  // this screen stuck showing stale status forever. Stops once the game ends.
  useEffect(() => {
    if (!code || s?.status === "ended" || s?.status === "aborted") return;
    const id = window.setInterval(async () => {
      try {
        const { data } = await api.get(`/sessions/${code}`);
        setS(data);
      } catch {
        /* keep whatever we last had */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [code]);

  async function accept() {
    setAccepting(true);
    try {
      const { data } = await api.post(`/sessions/${code}/accept`);
      setS(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Unable to join this game");
    } finally {
      setAccepting(false);
    }
  }

  async function send(type: string, payload?: any) {
    try {
      const { data } = await api.post(`/sessions/${code}/action`, { type, payload });
      setS(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Something went wrong");
    }
  }

  async function spin() {
    setSpinning(true);
    await send("spin");
    setTimeout(() => setSpinning(false), 500);
  }

  if (loading) {
    return (
      <FullscreenShell>
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      </FullscreenShell>
    );
  }

  if (notFound || !s) {
    return (
      <FullscreenShell>
        <div className="text-center space-y-3">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Game not found</div>
          <button
            onClick={() => nav("/games")}
            className="rounded-xl px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
          >
            Back to games
          </button>
        </div>
      </FullscreenShell>
    );
  }

  const isCreator = meId === s.createdBy;
  const myTurn = s.turnUserId === meId;
  const gameLabel = s.kind === "truth_dare_erotic" ? "Truth or Dare (Plus)" : "Truth or Dare";
  const partnerName = partner?.name ?? "your partner";

  if (s.status === "waiting") {
    return (
      <FullscreenShell>
        <div className="text-center space-y-4">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
            <Heart className="w-7 h-7" />
          </div>
          {isCreator ? (
            <>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Waiting for {partnerName}…
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                We sent them an invite. This screen updates the moment they join.
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {partnerName} invited you to play {gameLabel}
              </div>
              <button
                disabled={accepting}
                onClick={accept}
                className="w-full rounded-2xl py-3 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 disabled:opacity-50"
              >
                {accepting ? "Joining…" : "Accept & Play"}
              </button>
            </>
          )}
          <button
            onClick={() => nav("/games")}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      </FullscreenShell>
    );
  }

  if (s.status === "ended" || s.status === "aborted") {
    return (
      <FullscreenShell>
        <div className="text-center space-y-4">
          <div className="text-3xl">🎉</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Game over!</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {s.state?.done ?? 0} completed • {s.state?.xp ?? 0} XP earned
          </div>
          <button
            onClick={() => nav("/games")}
            className="rounded-2xl px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"
          >
            Back to games
          </button>
        </div>
      </FullscreenShell>
    );
  }

  const phase = s.state?.phase ?? "picking";

  return (
    <FullscreenShell wide>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {gameLabel} • Round {s.round}
        </div>
        <button
          onClick={() => send("finish")}
          className="text-sm px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          End Game
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="text-xs px-3 py-1 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300">
          Skips: {s.state?.skips ?? 0}
        </div>
        <div className="text-xs px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
          {s.state?.xp ?? 0} XP
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {myTurn ? "Your turn" : `${partnerName}'s turn`}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "picking" ? (
          <motion.div
            key="picking"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-4"
          >
            <motion.div
              animate={spinning ? { rotate: 360 * 3 } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-32 w-32 mx-auto rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-600 to-purple-600 grid place-items-center text-white shadow-xl"
            >
              <Sparkles className="w-10 h-10" />
            </motion.div>
            {myTurn ? (
              <button
                disabled={spinning}
                onClick={spin}
                className="rounded-2xl px-6 py-3 font-semibold text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 disabled:opacity-60"
              >
                {spinning ? "Spinning…" : "🎡 Spin the Wheel"}
              </button>
            ) : (
              <div className="text-sm text-gray-400 dark:text-gray-500">
                Waiting for {partnerName} to spin…
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div
              className={`rounded-2xl p-5 text-center border-2 ${
                s.state?.currentType === "dare"
                  ? "border-fuchsia-300 dark:border-fuchsia-800 bg-fuchsia-50 dark:bg-fuchsia-950/40"
                  : "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40"
              }`}
            >
              <div
                className={`text-xs font-bold uppercase mb-2 ${
                  s.state?.currentType === "dare"
                    ? "text-fuchsia-600 dark:text-fuchsia-300"
                    : "text-rose-600 dark:text-rose-300"
                }`}
              >
                {s.state?.currentType}
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {s.state?.currentPrompt}
              </div>
            </div>
            {myTurn ? (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => send("skip")}
                  className="rounded-xl px-4 py-2 text-sm border dark:border-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1"
                >
                  <SkipForward className="w-4 h-4" /> Skip
                </button>
                <button
                  onClick={() => send("done")}
                  className="rounded-xl px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"
                >
                  ✓ Done — +10 XP
                </button>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-400 dark:text-gray-500">
                Waiting for {partnerName}…
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </FullscreenShell>
  );
}
