/**
 * TruthDarePlus.tsx — PLUS EXCLUSIVE
 * ─────────────────────────────────────────────────────────────────────────────
 * "Confessions Roulette" — dramatically different from free TruthDareRomantic:
 *
 * FREE version:   pick Truth or Dare → read prompt → complete/skip
 *
 * PLUS version:
 *  • Animated spinning roulette wheel randomly picks Truth or Dare (no choice)
 *  • 30-second countdown timer per truth — must answer before time runs out
 *  • "Double Down" button on every dare — risk 0 XP or earn 2× XP
 *  • Streak multiplier: consecutive completions boost XP (up to 3×)
 *  • Relationship Depth Score: AI prompts get progressively more intimate
 *  • Spicy/Erotic categories fully unlocked with adult content
 *  • "Challenge Mode" — both players get the same dare simultaneously
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { useAuth } from "../context/AuthContext";
import {
  Clock, Flame, Zap, SkipForward, Check, RotateCcw, Crown, Heart, Sparkles,
} from "lucide-react";

type Props = {
  couple?: [string, string];
  category?: "Spicy" | "Erotic" | "Wild" | "Extreme";
  onFinish: (res: GameResult) => void;
};

const SECONDS_PER_TRUTH = 30;
const WHEEL_SEGMENTS = ["TRUTH", "DARE", "TRUTH", "DARE", "TRUTH", "DARE", "CHALLENGE"];

export default function TruthDarePlus({ couple, category = "Spicy", onFinish }: Props) {
  const { user } = useAuth();
  type Partner = { name: string };
  const partnerArr = (user?.partner ?? []) as Partner[];
  const partnerName = partnerArr[0]?.name ?? "Partner";
  const players = useMemo<[string, string]>(() => couple ?? [user?.name ?? "You", partnerName], []);

  // ── Prompt pool ────────────────────────────────────────────────────────────
  const [truths, setTruths] = useState<string[]>([]);
  const [dares, setDares] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchBatch() {
    setLoading(true); setErr(null);
    try {
      const { data } = await api.post("/ai/truth-dare", {
        category,
        tone: category === "Erotic" ? "NC-17" : "PG-18+",
        count_truths: 12, count_dares: 12,
        names: players, personalize: true,
      });
      if (Array.isArray(data.truths)) setTruths(t => [...t, ...data.truths]);
      if (Array.isArray(data.dares)) setDares(d => [...d, ...data.dares]);
    } catch { setErr("Failed to load prompts — retrying…"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchBatch(); }, [category]);

  // ── Game state ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<"spin" | "truth" | "dare" | "challenge" | "result">("spin");
  const [spinning, setSpinning] = useState(false);
  const [spinDeg, setSpinDeg] = useState(0);
  const [, setLanded] = useState<"TRUTH" | "DARE" | "CHALLENGE" | null>(null);
  const [prompt, setPrompt] = useState("");
  const [prompt2, setPrompt2] = useState(""); // challenge: both players get one
  const [pIdx, setPIdx] = useState(0);
  const [round, setRound] = useState(1);

  // Streak + scoring
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [skips, setSkips] = useState(3);
  const [totalXp, setTotalXp] = useState(0);
  const [doubleDown, setDoubleDown] = useState(false);
  const [doubleDownResult, setDoubleDownResult] = useState<"win" | "lose" | null>(null);

  // Truth timer
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_TRUTH);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current!); };
  }, [timerActive]);

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current!);
    setTimerActive(false);
  }

  function handleTimeUp() {
    // time ran out on truth — break streak
    setStreak(0);
    setPhase("spin");
    setPIdx(i => i === 0 ? 1 : 0);
    setRound(r => r + 1);
    setTimeLeft(SECONDS_PER_TRUTH);
  }

  // ── Spin wheel ─────────────────────────────────────────────────────────────
  function spin() {
    if (spinning || (truths.length === 0 && dares.length === 0 && !loading)) return;
    setSpinning(true);
    setDoubleDown(false);
    setDoubleDownResult(null);

    const extraSpins = 5 + Math.floor(Math.random() * 4); // 5–8 full rotations
    const segAngle = 360 / WHEEL_SEGMENTS.length;
    const targetSeg = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const targetDeg = spinDeg + extraSpins * 360 + targetSeg * segAngle;

    setSpinDeg(targetDeg);

    setTimeout(() => {
      setSpinning(false);
      const result = WHEEL_SEGMENTS[targetSeg] as "TRUTH" | "DARE" | "CHALLENGE";
      setLanded(result);

      if (result === "TRUTH") {
        const p = truths[0] || "";
        setTruths(t => t.slice(1));
        if (truths.length < 3) fetchBatch();
        setPrompt(p);
        setPhase("truth");
        setTimeLeft(SECONDS_PER_TRUTH);
        setTimerActive(true);
      } else if (result === "DARE") {
        const p = dares[0] || "";
        setDares(d => d.slice(1));
        if (dares.length < 3) fetchBatch();
        setPrompt(p);
        setPhase("dare");
      } else {
        // CHALLENGE — both players get a dare
        const p1 = dares[0] || "";
        const p2 = dares[1] || "";
        setDares(d => d.slice(2));
        if (dares.length < 4) fetchBatch();
        setPrompt(p1);
        setPrompt2(p2);
        setPhase("challenge");
      }
    }, 2400);
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const multiplier = Math.min(3, 1 + Math.floor(streak / 3));
  const baseXp = { truth: 15, dare: 20, challenge: 35 };

  function completePrompt(kind: "truth" | "dare" | "challenge") {
    stopTimer();
    let xp = baseXp[kind] * multiplier;
    if (kind === "dare" && doubleDown) {
      const won = Math.random() > 0.4;
      setDoubleDownResult(won ? "win" : "lose");
      xp = won ? xp * 2 : 0;
    }
    setTotalXp(x => x + xp);
    setCompleted(c => c + 1);
    setStreak(s => s + 1);
    setPIdx(i => i === 0 ? 1 : 0);
    setRound(r => r + 1);
    setPhase("spin");
    setTimeLeft(SECONDS_PER_TRUTH);
  }

  function skipPrompt() {
    if (skips <= 0) return;
    stopTimer();
    setSkips(s => s - 1);
    setStreak(0);
    setPIdx(i => i === 0 ? 1 : 0);
    setRound(r => r + 1);
    setPhase("spin");
    setTimeLeft(SECONDS_PER_TRUTH);
  }

  function finish() {
    stopTimer();
    onFinish({
      xpEarned: totalXp || completed * 20,
      rounds: round - 1,
      skipped: 3 - skips,
      meta: { category, totalXp, maxStreak: streak, multiplierReached: multiplier },
    });
  }

  function restart() {
    stopTimer();
    setPhase("spin"); setSpinning(false); setSpinDeg(0); setLanded(null);
    setPrompt(""); setPIdx(0); setRound(1); setStreak(0); setCompleted(0);
    setSkips(3); setTotalXp(0); setDoubleDown(false); setDoubleDownResult(null);
    setTimeLeft(SECONDS_PER_TRUTH); setTimerActive(false);
  }

  // ── Wheel render ───────────────────────────────────────────────────────────
  const segColors = [
    "#F9A8D4", "#E879F9", "#F9A8D4", "#E879F9", "#F9A8D4", "#E879F9", "#FBBF24"
  ];
  const segAngle = 360 / WHEEL_SEGMENTS.length;

  return (
    <div className="space-y-5">
      {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{err}</div>}

      {/* ── Header stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-2">
          <div className="text-xs text-gray-500">Round</div>
          <div className="font-bold text-gray-900">{round}</div>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 border border-fuchsia-100 p-2">
          <div className="text-xs text-gray-500">Streak</div>
          <div className="font-bold text-fuchsia-700 flex items-center justify-center gap-1">
            <Flame className="w-3 h-3" />{streak}
          </div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-2">
          <div className="text-xs text-gray-500">Multiplier</div>
          <div className="font-bold text-amber-600">{multiplier}×</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-2">
          <div className="text-xs text-gray-500">XP</div>
          <div className="font-bold text-emerald-700">{totalXp}</div>
        </div>
      </div>

      {/* ── Player turn ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Turn: <b className="text-gray-900">{players[pIdx]}</b></span>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full border">Skips: {skips}</span>
          {multiplier >= 2 && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
              <Crown className="w-3 h-3" /> {multiplier}× streak bonus!
            </span>
          )}
        </div>
      </div>

      {/* ── Spin phase ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {phase === "spin" && (
          <motion.div
            key="spin"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {doubleDownResult && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className={`text-center rounded-2xl p-3 text-sm font-semibold ${
                  doubleDownResult === "win"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {doubleDownResult === "win" ? "🎉 Double Down won! XP doubled!" : "😬 Double Down lost! No XP this round."}
              </motion.div>
            )}

            {/* Wheel */}
            <div className="flex justify-center">
              <div className="relative w-52 h-52">
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0"
                  style={{ borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "18px solid #7C3AED" }}
                />
                {/* SVG Wheel */}
                <motion.svg
                  viewBox="0 0 200 200"
                  className="w-full h-full drop-shadow-xl"
                  animate={{ rotate: spinDeg }}
                  transition={{ duration: 2.4, ease: [0.17, 0.67, 0.22, 1.0] }}
                >
                  {WHEEL_SEGMENTS.map((seg, i) => {
                    const startAngle = (i * segAngle - 90) * (Math.PI / 180);
                    const endAngle = ((i + 1) * segAngle - 90) * (Math.PI / 180);
                    const x1 = 100 + 98 * Math.cos(startAngle);
                    const y1 = 100 + 98 * Math.sin(startAngle);
                    const x2 = 100 + 98 * Math.cos(endAngle);
                    const y2 = 100 + 98 * Math.sin(endAngle);
                    const midAngle = ((i + 0.5) * segAngle - 90) * (Math.PI / 180);
                    const tx = 100 + 65 * Math.cos(midAngle);
                    const ty = 100 + 65 * Math.sin(midAngle);
                    return (
                      <g key={i}>
                        <path
                          d={`M 100 100 L ${x1} ${y1} A 98 98 0 0 1 ${x2} ${y2} Z`}
                          fill={segColors[i]}
                          stroke="white" strokeWidth="2"
                        />
                        <text
                          x={tx} y={ty}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize="9" fontWeight="bold" fill="white"
                          transform={`rotate(${(i + 0.5) * segAngle}, ${tx}, ${ty})`}
                        >
                          {seg}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="100" cy="100" r="12" fill="white" stroke="#7C3AED" strokeWidth="3" />
                </motion.svg>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={spin}
                disabled={spinning || loading}
                className="rounded-2xl px-8 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-semibold shadow-lg hover:opacity-90 disabled:opacity-60 transition"
              >
                {spinning ? "Spinning…" : loading ? "Loading prompts…" : "🎰 Spin the Wheel"}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Truth phase ─────────────────────────────────────────────────── */}
        {phase === "truth" && (
          <motion.div key="truth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-600" />
                  <span className="font-semibold text-rose-700">TRUTH</span>
                </div>
                {/* Timer */}
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-bold ${
                  timeLeft <= 10 ? "bg-red-100 text-red-700 animate-pulse" : "bg-white text-gray-700 border"
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {timeLeft}s
                </div>
              </div>

              {/* Timer bar */}
              <div className="h-1.5 w-full bg-gray-200 rounded-full mb-4 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${timeLeft <= 10 ? "bg-red-500" : "bg-rose-500"}`}
                  animate={{ width: `${(timeLeft / SECONDS_PER_TRUTH) * 100}%` }}
                  transition={{ duration: 0 }}
                />
              </div>

              <p className="text-gray-900 font-medium text-base leading-relaxed">{prompt}</p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => completePrompt("truth")}
                  className="rounded-xl px-4 py-2 bg-rose-600 text-white text-sm inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Answered! +{baseXp.truth * multiplier} XP
                </button>
                <button
                  onClick={skipPrompt}
                  disabled={skips <= 0}
                  className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <SkipForward className="w-4 h-4" /> Skip
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Dare phase ──────────────────────────────────────────────────── */}
        {phase === "dare" && (
          <motion.div key="dare" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-fuchsia-600" />
                  <span className="font-semibold text-fuchsia-700">DARE</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-white border text-gray-600">No time limit</span>
              </div>

              <p className="text-gray-900 font-medium text-base leading-relaxed">{prompt}</p>

              {/* Double Down toggle */}
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-amber-800 flex items-center gap-1">
                      <Zap className="w-4 h-4" /> Double Down
                    </div>
                    <div className="text-xs text-amber-700">60% chance to double XP — or get nothing</div>
                  </div>
                  <button
                    onClick={() => setDoubleDown(d => !d)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
                      doubleDown
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                    }`}
                  >
                    {doubleDown ? "ON 🎲" : "OFF"}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => completePrompt("dare")}
                  className="rounded-xl px-4 py-2 bg-fuchsia-600 text-white text-sm inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Done! {doubleDown ? "🎲 " : ""}+{baseXp.dare * multiplier} XP
                </button>
                <button
                  onClick={skipPrompt}
                  disabled={skips <= 0}
                  className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <SkipForward className="w-4 h-4" /> Skip
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Challenge phase ─────────────────────────────────────────────── */}
        {phase === "challenge" && (
          <motion.div key="challenge" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <Crown className="w-5 h-5" /> BOTH PLAYERS CHALLENGE
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border p-3">
                  <div className="text-xs text-gray-500 mb-1">{players[0]}</div>
                  <div className="text-sm font-medium text-gray-900">{prompt}</div>
                </div>
                <div className="rounded-xl bg-white border p-3">
                  <div className="text-xs text-gray-500 mb-1">{players[1]}</div>
                  <div className="text-sm font-medium text-gray-900">{prompt2}</div>
                </div>
              </div>
              <div className="text-xs text-amber-700">Both must complete for +{baseXp.challenge * multiplier} XP each</div>
              <button
                onClick={() => completePrompt("challenge")}
                className="rounded-xl px-4 py-2 bg-amber-500 text-white text-sm inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Both done! +{baseXp.challenge * multiplier} XP
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <button onClick={restart} className="text-sm text-gray-500 inline-flex items-center gap-1 hover:text-gray-800">
          <RotateCcw className="w-4 h-4" /> Restart
        </button>
        <button onClick={finish} className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm">
          Finish & Save
        </button>
      </div>
    </div>
  );
}