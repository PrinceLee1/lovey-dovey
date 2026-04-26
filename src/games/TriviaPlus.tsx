/**
 * TriviaPlus.tsx — PLUS EXCLUSIVE
 * ─────────────────────────────────────────────────────────────────────────────
 * "Couples Compatibility Trivia" — completely different from free TriviaDuoVsDuo:
 *
 * FREE version:  buzz-in trivia, Team A vs Team B, standard MCQ
 *
 * PLUS version:
 *  • Phase 1 — "Know Your Partner": predict what your partner will answer
 *    (same question asked to both, score based on matching, not correctness)
 *  • Phase 2 — "Hot Takes": spicy adult opinion questions with no right answer,
 *    vote agree/disagree and see if you match
 *  • Phase 3 — "Lightning Round": 10s per question, both buzz in simultaneously
 *  • Compatibility Score shown throughout (0–100%)
 *  • Full Erotic/Spicy trivia category available (gated by Plus)
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { useAuth } from "../context/AuthContext";
import { Heart, Zap, Clock, ChevronRight, RotateCcw, Crown } from "lucide-react";

type TriviaQ = { question: string; options: string[]; correctIndex: number; category?: string };

export default function TriviaPlus({
  category = "Spicy",
  difficulty = "Medium",
  onFinish,
}: {
  couple?: [string, string];
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  onFinish: (res: GameResult) => void;
}) {
  const { user } = useAuth();
  type Partner = { name: string };
  const partnerArr = (user?.partner ?? []) as Partner[];
  const partnerName = partnerArr[0]?.name ?? "Partner";
  const players = useMemo<[string, string]>(() => [user?.name ?? "You", partnerName], []);

  const [questions, setQuestions] = useState<TriviaQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [phase, setPhase] = useState<"know" | "hottakes" | "lightning" | "results">("know");
  const [qIdx, setQIdx] = useState(0);

  // Know Your Partner state
  const [p0Answer, setP0Answer] = useState<number | null>(null);
  const [p1Answer, setP1Answer] = useState<number | null>(null);
  const [p0Prediction, setP0Prediction] = useState<number | null>(null); // what p0 thinks p1 will say
  const [revealed, setRevealed] = useState(false);
  const [knowScore, setKnowScore] = useState(0);
  const [knowRounds, setKnowRounds] = useState(0);

  // Hot Takes state (opinion questions, no right answer)
  const HOT_TAKES = [
    "Should couples share all passwords?",
    "Is it okay to be friends with an ex?",
    "Should finances be fully merged after marriage?",
    "Is jealousy sometimes a sign of love?",
    "Should couples always go to bed at the same time?",
    "Would you rather be loved or respected?",
    "Is it okay to keep secrets from your partner?",
  ];
  const [htIdx, setHtIdx] = useState(0);
  const [htP0, setHtP0] = useState<boolean | null>(null);
  const [htP1, setHtP1] = useState<boolean | null>(null);
  const [htRevealed, setHtRevealed] = useState(false);
  const [htMatches, setHtMatches] = useState(0);
  const [htRounds, setHtRounds] = useState(0);

  // Lightning round state
  const [lTimer, setLTimer] = useState(10);
  const [lRunning, setLRunning] = useState(false);
  const [lAnswer, setLAnswer] = useState<number | null>(null);
  const [lCorrect, setLCorrect] = useState(0);
  const [lTotal, setLTotal] = useState(0);

  // Compat score
  const compatScore = useMemo(() => {
    const knowPct = knowRounds > 0 ? (knowScore / (knowRounds * 2)) * 100 : 0;
    const htPct = htRounds > 0 ? (htMatches / htRounds) * 100 : 0;
    return Math.round((knowPct * 0.6 + htPct * 0.4));
  }, [knowScore, knowRounds, htMatches, htRounds]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/ai/trivia", {
          category, difficulty, count: 15, personalize: false,
        });
        setQuestions((data.questions ?? []).sort(() => Math.random() - 0.5));
      } catch { setErr("Could not load questions"); }
      finally { setLoading(false); }
    })();
  }, []);

  // Lightning timer
  useEffect(() => {
    if (!lRunning) return;
    const id = setInterval(() => {
      setLTimer(t => {
        if (t <= 1) { clearInterval(id); setLRunning(false); advanceLightning(null); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lRunning, qIdx]);

  // ── KNOW YOUR PARTNER ─────────────────────────────────────────────────────
  const KY_ROUNDS = Math.min(5, questions.length);
  const kyQ = questions[qIdx];

  function revealKnow() {
    setRevealed(true);
    let pts = 0;
    if (p0Answer === p1Answer) pts += 2; // both chose same (compatibility)
    if (p0Prediction === p1Answer) pts += 1; // p0 predicted correctly
    if (p1Answer === kyQ?.correctIndex) pts += 1; // p1 got the right answer
    setKnowScore(s => s + pts);
    setKnowRounds(r => r + 1);
  }

  function nextKnow() {
    setP0Answer(null); setP1Answer(null); setP0Prediction(null); setRevealed(false);
    if (knowRounds + 1 >= KY_ROUNDS) {
      setPhase("hottakes");
      setQIdx(0);
    } else {
      setQIdx(i => i + 1);
    }
  }

  // ── HOT TAKES ─────────────────────────────────────────────────────────────
  const HT_ROUNDS = Math.min(5, HOT_TAKES.length);

  function revealHotTake() {
    setHtRevealed(true);
    if (htP0 === htP1) setHtMatches(m => m + 1);
    setHtRounds(r => r + 1);
  }

  function nextHotTake() {
    setHtP0(null); setHtP1(null); setHtRevealed(false);
    if (htIdx + 1 >= HT_ROUNDS) {
      setPhase("lightning");
      setQIdx(KY_ROUNDS);
      setLTimer(10);
      setLRunning(true);
    } else {
      setHtIdx(i => i + 1);
    }
  }

  // ── LIGHTNING ─────────────────────────────────────────────────────────────
  const L_ROUNDS = Math.min(5, questions.length - KY_ROUNDS);
  const lQ = questions[KY_ROUNDS + (qIdx - KY_ROUNDS)];

  function advanceLightning(chosen: number | null) {
    setLAnswer(chosen);
    setLTotal(t => t + 1);
    if (chosen !== null && lQ && chosen === lQ.correctIndex) setLCorrect(c => c + 1);
    setTimeout(() => {
      setLAnswer(null);
      setLTimer(10);
      if (lTotal + 1 >= L_ROUNDS) {
        setPhase("results");
      } else {
        setQIdx(i => i + 1);
        setLRunning(true);
      }
    }, 800);
  }

  // ── FINAL XP ──────────────────────────────────────────────────────────────
  const totalXp = knowScore * 15 + htMatches * 20 + lCorrect * 25;

  function finish() {
    onFinish({
      xpEarned: Math.max(50, totalXp),
      rounds: KY_ROUNDS + HT_ROUNDS + L_ROUNDS,
      skipped: 0,
      meta: { compatScore, knowScore, htMatches, lCorrect, category },
    });
  }

  if (loading) return <div className="text-sm text-gray-500 text-center py-8">Loading Compatibility Trivia…</div>;
  if (err) return <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{err}</div>;

  return (
    <div className="space-y-4">
      {/* Compat meter */}
      <div className="rounded-2xl border bg-gradient-to-r from-rose-50 to-fuchsia-50 p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-gray-600 flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" /> Compatibility Score
          </div>
          <div className="text-xs font-bold text-fuchsia-700">{compatScore}%</div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 to-fuchsia-500 rounded-full"
            animate={{ width: `${compatScore}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── KNOW YOUR PARTNER ─────────────────────────────────────────────── */}
        {phase === "know" && kyQ && (
          <motion.div key={`know-${qIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" /> Know Your Partner
              </div>
              <div className="text-xs text-gray-500">Round {knowRounds + 1}/{KY_ROUNDS}</div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="font-medium text-gray-900 mb-3">{kyQ.question}</div>
              <div className="grid grid-cols-1 gap-2">
                {kyQ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => !revealed && setP0Answer(i)}
                    className={`text-left rounded-xl px-3 py-2 text-sm border transition ${
                      revealed && i === kyQ.correctIndex ? "border-emerald-300 bg-emerald-50" :
                      revealed && i === p0Answer && i !== kyQ.correctIndex ? "border-red-200 bg-red-50" :
                      p0Answer === i ? "border-fuchsia-400 bg-fuchsia-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {["A","B","C","D"][i]}. {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* P0 predicts P1 */}
            {p0Answer !== null && !revealed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border p-3 space-y-2">
                <div className="text-xs font-semibold text-gray-700">
                  {players[0]}: What will {players[1]} answer?
                </div>
                <div className="flex flex-wrap gap-2">
                  {kyQ.options.map((opt, i) => (
                    <button key={i} onClick={() => setP0Prediction(i)}
                      className={`rounded-xl px-3 py-1.5 text-xs border ${p0Prediction === i ? "bg-fuchsia-600 text-white" : "hover:bg-gray-50"}`}>
                      {["A","B","C","D"][i]}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* P1 answers (pass phone) */}
            {p0Prediction !== null && !revealed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border-2 border-fuchsia-200 p-3 space-y-2">
                <div className="text-xs font-semibold text-fuchsia-700">
                  📱 Pass to {players[1]} — don't peek!
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {kyQ.options.map((opt, i) => (
                    <button key={i} onClick={() => setP1Answer(i)}
                      className={`rounded-xl px-3 py-2 text-xs border text-left ${p1Answer === i ? "bg-fuchsia-600 text-white" : "hover:bg-gray-50"}`}>
                      {["A","B","C","D"][i]}. {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex gap-2">
              {p1Answer !== null && !revealed && (
                <button onClick={revealKnow} className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm">
                  Reveal Answers
                </button>
              )}
              {revealed && (
                <div className="w-full space-y-2">
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>{p0Answer === p1Answer ? "✅ You chose the same!" : "❌ Different answers"}</div>
                    <div>{p0Prediction === p1Answer ? `✅ ${players[0]} predicted correctly!` : `❌ ${players[0]}'s prediction missed`}</div>
                  </div>
                  <button onClick={nextKnow} className="rounded-xl px-4 py-2 border text-sm inline-flex items-center gap-1 hover:bg-gray-50">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── HOT TAKES ─────────────────────────────────────────────────────── */}
        {phase === "hottakes" && (
          <motion.div key={`ht-${htIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" /> Hot Takes
              </div>
              <div className="text-xs text-gray-500">Round {htIdx + 1}/{HT_ROUNDS}</div>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
              <div className="font-medium text-gray-900 text-center">{HOT_TAKES[htIdx]}</div>
              <div className="text-xs text-center text-amber-700 mt-1">No right answer — do you agree?</div>
            </div>

            {/* Both vote separately */}
            <div className="grid grid-cols-2 gap-3">
              {([0, 1] as const).map(p => (
                <div key={p} className="rounded-2xl border p-3 space-y-2">
                  <div className="text-xs font-semibold text-gray-700">{players[p]}</div>
                  {!htRevealed ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => p === 0 ? setHtP0(true) : setHtP1(true)}
                        className={`flex-1 rounded-xl py-2 text-xs border font-semibold ${
                          (p === 0 ? htP0 : htP1) === true ? "bg-emerald-500 text-white" : "hover:bg-emerald-50 text-emerald-700"
                        }`}
                      >Agree ✅</button>
                      <button
                        onClick={() => p === 0 ? setHtP0(false) : setHtP1(false)}
                        className={`flex-1 rounded-xl py-2 text-xs border font-semibold ${
                          (p === 0 ? htP0 : htP1) === false ? "bg-red-500 text-white" : "hover:bg-red-50 text-red-700"
                        }`}
                      >Disagree ❌</button>
                    </div>
                  ) : (
                    <div className={`text-center rounded-xl py-2 font-semibold text-sm ${
                      (p === 0 ? htP0 : htP1) ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                    }`}>
                      {(p === 0 ? htP0 : htP1) ? "Agree" : "Disagree"}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {htP0 !== null && htP1 !== null && !htRevealed && (
              <button onClick={revealHotTake} className="w-full rounded-xl py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm">
                Reveal & Compare
              </button>
            )}
            {htRevealed && (
              <div className="space-y-2">
                <div className={`rounded-xl p-3 text-center text-sm font-semibold ${
                  htP0 === htP1 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-700 border"
                }`}>
                  {htP0 === htP1 ? "💕 You agree! +20 XP" : "Interesting difference! Discuss why 💬"}
                </div>
                <button onClick={nextHotTake} className="rounded-xl px-4 py-2 border text-sm inline-flex items-center gap-1 hover:bg-gray-50">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── LIGHTNING ROUND ───────────────────────────────────────────────── */}
        {phase === "lightning" && lQ && (
          <motion.div key={`lightning-${qIdx}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> ⚡ Lightning Round
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full font-mono font-bold text-sm border ${
                lTimer <= 3 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-white"
              }`}>
                <Clock className="w-3.5 h-3.5" /> {lTimer}s
              </div>
            </div>

            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <motion.div className="h-full bg-amber-500 rounded-full" animate={{ width: `${(lTimer / 10) * 100}%` }} transition={{ duration: 0 }} />
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-xs text-gray-500 mb-2">Q{lTotal + 1}/{L_ROUNDS}</div>
              <div className="font-medium text-gray-900 mb-3">{lQ.question}</div>
              <div className="grid grid-cols-2 gap-2">
                {lQ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => lAnswer === null && advanceLightning(i)}
                    disabled={lAnswer !== null}
                    className={`rounded-xl px-3 py-2 text-sm border text-left transition ${
                      lAnswer !== null && i === lQ.correctIndex ? "border-emerald-400 bg-emerald-50 text-emerald-800" :
                      lAnswer === i && i !== lQ.correctIndex ? "border-red-400 bg-red-50 text-red-700" :
                      lAnswer !== null ? "opacity-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {["A","B","C","D"][i]}. {opt}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── RESULTS ───────────────────────────────────────────────────────── */}
        {phase === "results" && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
            <div className="rounded-3xl bg-gradient-to-br from-pink-50 to-fuchsia-50 border border-fuchsia-100 p-6 space-y-3">
              <div className="text-4xl">
                {compatScore >= 80 ? "💑" : compatScore >= 60 ? "💕" : compatScore >= 40 ? "💞" : "💛"}
              </div>
              <div className="font-bold text-2xl text-gray-900">{compatScore}% Compatible</div>
              <div className="text-sm text-gray-600">
                {compatScore >= 80 ? "You two are incredibly in sync! 🌟" :
                 compatScore >= 60 ? "Great connection with room to grow 💕" :
                 compatScore >= 40 ? "You complement each other well! 🌈" :
                 "Opposites attract — keep exploring! 🔥"}
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs mt-2">
                <div className="rounded-xl bg-white border p-2">
                  <div className="text-gray-500">Know Score</div>
                  <div className="font-bold text-gray-900">{knowScore} pts</div>
                </div>
                <div className="rounded-xl bg-white border p-2">
                  <div className="text-gray-500">Hot Takes</div>
                  <div className="font-bold text-gray-900">{htMatches}/{HT_ROUNDS} match</div>
                </div>
                <div className="rounded-xl bg-white border p-2">
                  <div className="text-gray-500">Lightning</div>
                  <div className="font-bold text-gray-900">{lCorrect}/{L_ROUNDS} ✅</div>
                </div>
              </div>
            </div>
            <button onClick={finish} className="rounded-2xl px-8 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-semibold">
              Save Results & Earn {Math.max(50, totalXp)} XP
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {phase !== "results" && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPhase("results")} className="text-xs text-gray-400 inline-flex items-center gap-1 hover:text-gray-600">
            <RotateCcw className="w-3 h-3" /> End early
          </button>
          <div className="text-xs text-gray-500">{totalXp} XP so far</div>
        </div>
      )}
    </div>
  );
}