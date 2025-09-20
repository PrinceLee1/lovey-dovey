import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { GameResult } from "./types";
import { Sparkles, Dice6, Check, SkipForward, RotateCcw, Shield } from "lucide-react";
import { api } from "../libs/axios";

type Props = {
  couple?: [string, string];
  onFinish: (res: GameResult) => void;
  minutes?: number; // optional if you later want a soft timer
};

const FACES = [
  { n: 1, label: "Sweet" },
  { n: 2, label: "Flirty" },
  { n: 3, label: "Playful" },
  { n: 4, label: "Bold" },
  { n: 5, label: "Creative" },
  { n: 6, label: "Surprise" },
];

export default function SpiceDice({ couple, onFinish }: Props) {
  const players = useMemo<[string, string]>(() => couple ?? ["You", "Partner"], [couple]);

  // dare pool (fetched from backend)
  const [dares, setDares] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // game state
  const [turnIdx, setTurnIdx] = useState<0 | 1>(0);
  const [rolled, setRolled] = useState<{ n: number; label: string } | null>(null);
  const [currentDare, setCurrentDare] = useState<string | null>(null);
  const [spins, setSpins] = useState(0);
  const [consent, setConsent] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [skipsLeft, setSkipsLeft] = useState(2);
  const [used, setUsed] = useState<string[]>([]);
  const distribution = useRef<Record<number, number>>({ 1:0,2:0,3:0,4:0,5:0,6:0 });

  async function fetchBatch(count = 18) {
    try {
      setLoading(true);
      setErr(null);
      const { data } = await api.post("/ai/truth-dare", {
        category: "Spicy",
        tone: "PG-13",         // keep store-safe
        count_truths: 0,       // Structured Outputs accepts 0
        count_dares: count,
        names: players,
        personalize: true,
      });
      if (Array.isArray(data.dares)) {
        setDares((prev) => [...prev, ...data.dares]);
      }
    } catch (e: any) {
      setErr(e.message || "Could not fetch dares");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBatch(18); }, []); // initial pool

  function nextDare() {
    if (dares.length === 0) {
      setErr("Fetching more dares…");
      fetchBatch(12);
      return null;
    }
    const pick = dares[0];
    setDares((arr) => arr.slice(1));
    if (dares.length < 3 && !loading) fetchBatch(12); // top-up when low
    return pick;
  }

  function rollDice() {
    // spin animation count (for a lil flourish)
    setSpins((s) => s + 1);
    const n = Math.floor(Math.random() * 6) + 1;
    const face = FACES[n - 1];
    distribution.current[n] = (distribution.current[n] || 0) + 1;
    setRolled(face);
    const d = nextDare();
    setCurrentDare(d);
    setConsent(false); // require consent each new dare
  }

  function onSkip() {
    if (skipsLeft <= 0) return;
    setSkipsLeft((k) => k - 1);
    // keep same face label but change dare
    const d = nextDare();
    setCurrentDare(d);
    setConsent(false);
  }

  function onComplete() {
    if (!currentDare) return;
    setCompleted((c) => c + 1);
    setUsed((arr) => [...arr, currentDare]);
    setTurnIdx((i) => (i === 0 ? 1 : 0));
    // clear current and prompt to roll again
    setCurrentDare(null);
    setRolled(null);
    setConsent(false);
  }

  function restart() {
    setTurnIdx(0);
    setRolled(null);
    setCurrentDare(null);
    setSpins(0);
    setConsent(false);
    setCompleted(0);
    setSkipsLeft(2);
    setUsed([]);
    distribution.current = {1:0,2:0,3:0,4:0,5:0,6:0};
  }

  function finishNow() {
    onFinish({
      xpEarned: completed * 25,   // medium difficulty reward
      rounds: completed,
      skipped: 2 - skipsLeft,
      meta: {
        usedDares: used,
        rolls: distribution.current,
      },
    });
  }

  return (
    <div className="space-y-4">
      {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}

      {/* Top status */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Turn: <b className="text-gray-900">{players[turnIdx]}</b>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full border">Skips: {skipsLeft}</span>
          <span className="px-2 py-1 rounded-full border">Completed: {completed}</span>
        </div>
      </div>

      {/* Dice + dare panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dice */}
        <div className="rounded-2xl border p-5 grid place-items-center">
          <motion.div
            key={spins}
            initial={{ rotate: 0, scale: 1 }}
            animate={{ rotate: 360, scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="h-24 w-24 rounded-2xl bg-gradient-to-br from-rose-100 to-fuchsia-100 grid place-items-center shadow-inner"
          >
            <Dice6 className="w-10 h-10 text-fuchsia-600" />
          </motion.div>

          <button
            onClick={rollDice}
            className="mt-4 rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
          >
            Roll the Dice
          </button>

          {rolled && (
            <div className="mt-2 text-sm text-gray-600">
              You rolled: <b className="text-gray-900">{rolled.n}</b> — <span className="font-medium">{rolled.label}</span>
            </div>
          )}
        </div>

        {/* Dare card */}
        <div className="rounded-2xl border p-5">
          {!currentDare ? (
            <div className="h-full grid place-items-center text-sm text-gray-500">
              Roll to get a PG-13 dare ✨
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-fuchsia-600" />
                <div className="text-xs text-gray-500">{rolled?.label ?? "Dare"}</div>
              </div>
              <div className="text-gray-900 font-medium">{currentDare}</div>

              {/* Consent gate */}
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-emerald-600" />
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  We both consent to try this
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  disabled={!consent}
                  onClick={onComplete}
                  className={`rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2 text-white ${
                    consent
                      ? "bg-gradient-to-r from-pink-500 to-fuchsia-600"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  <Check className="w-4 h-4" /> Complete
                </button>
                <button
                  onClick={onSkip}
                  disabled={skipsLeft <= 0}
                  className="rounded-xl px-3 py-2 border hover:bg-gray-50 text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <SkipForward className="w-4 h-4" /> Skip
                </button>
                <button
                  onClick={() => {
                    const d = nextDare();
                    setCurrentDare(d);
                    setConsent(false);
                  }}
                  className="rounded-xl px-3 py-2 border hover:bg-gray-50 text-sm"
                >
                  New dare
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={restart}
          className="text-sm text-gray-600 inline-flex items-center gap-1 hover:text-gray-800"
        >
          <RotateCcw className="w-4 h-4" /> Restart
        </button>
        <button
          onClick={finishNow}
          className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
        >
          Finish Game
        </button>
      </div>
    </div>
  );
}
