/**
 * WouldYouRather.tsx — GROUP PARTY GAME
 * ─────────────────────────────────────────────────────────────────────────────
 * Classic WYR but with:
 *  - Live vote tallying (each person taps their choice on the same phone)
 *  - "Debate mode" — after voting, minority must defend their choice (60s)
 *  - Wildcard rounds: tiebreaker dares if it's 50/50
 *  - XP based on being in the majority OR successfully defending the minority
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { Clock, RotateCcw, Zap, Crown } from "lucide-react";

type WYRQuestion = { a: string; b: string };

const FALLBACK: WYRQuestion[] = [
  { a: "Always be 10 minutes late", b: "Always be 20 minutes early" },
  { a: "Know when you'll die", b: "Know how you'll die" },
  { a: "Have no phone for a month", b: "Have no money for a month" },
  { a: "Fight 100 duck-sized horses", b: "Fight 1 horse-sized duck" },
  { a: "Only eat your favourite food forever", b: "Never eat it again" },
  { a: "Be famous but hated", b: "Unknown but loved" },
  { a: "Have a photographic memory", b: "Be able to forget anything on demand" },
  { a: "Live in the past (your choice of era)", b: "Live 100 years in the future" },
  { a: "Speak every language fluently", b: "Play every instrument perfectly" },
  { a: "Always say what you think", b: "Never be able to speak again" },
  { a: "Be the funniest person in any room", b: "Be the smartest person in any room" },
  { a: "Have unlimited money but no friends", b: "Have amazing friends but always broke" },
];

const DEBATE_SECONDS = 45;

export default function WouldYouRather({
  players,
  onFinish,
  category = "Playful",
}: {
  players: string[];
  onFinish: (res: GameResult) => void;
  category?: string;
}) {
  const [questions, setQuestions] = useState<WYRQuestion[]>(FALLBACK);
  const [qIdx, setQIdx] = useState(0);
  const [phase, setPhase] = useState<"vote" | "debate" | "result">("vote");
  const [choices, setChoices] = useState<Record<string, "A" | "B">>({});
  const [debateTimer, setDebateTimer] = useState(DEBATE_SECONDS);
  const [debating, setDebating] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [rounds, setRounds] = useState(0);
  const [history, setHistory] = useState<{ q: WYRQuestion; aVoters: string[]; bVoters: string[] }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/ai/truth-dare", {
          category, tone: "PG-13", count_truths: 15, count_dares: 0, personalize: false,
        });
        // Convert truths into WYR format: split by "or" roughly
        const wyrs: WYRQuestion[] = (data.truths ?? [])
          .filter((t: string) => t.toLowerCase().includes(" or "))
          .map((t: string) => {
            const parts = t.split(/ or /i);
            return { a: parts[0]?.trim() ?? t, b: parts[1]?.trim() ?? "Something else entirely" };
          });
        if (wyrs.length >= 3) setQuestions(q => [...wyrs, ...q]);
      } catch { /* use fallback */ }
    })();
  }, []);

  // Debate timer
  useEffect(() => {
    if (!debating) return;
    const id = setInterval(() => {
      setDebateTimer(t => {
        if (t <= 1) { clearInterval(id); setDebating(false); setPhase("result"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [debating]);

  const q = questions[qIdx % questions.length];
  const aVoters = players.filter(p => choices[p] === "A");
  const bVoters = players.filter(p => choices[p] === "B");
  const allVoted = players.every(p => choices[p]);
  const isTie = aVoters.length === bVoters.length;
  const majorityIs = aVoters.length > bVoters.length ? "A" : "B";
  const minorityPlayers = majorityIs === "A" ? bVoters : aVoters;

  function cast(player: string, choice: "A" | "B") {
    setChoices(c => ({ ...c, [player]: choice }));
  }

  function reveal() {
    setHistory(h => [...h, { q, aVoters, bVoters }]);
    setRounds(r => r + 1);

    if (isTie) {
      // Tiebreaker: start debate immediately
      setPhase("debate");
      setDebateTimer(DEBATE_SECONDS);
      setDebating(true);
      return;
    }

    // Score majority
    const majority = majorityIs === "A" ? aVoters : bVoters;
    setScores(s => {
      const next = { ...s };
      majority.forEach(p => { next[p] = (next[p] ?? 0) + 10; });
      return next;
    });

    // If minority exists, give them a chance to debate
    if (minorityPlayers.length > 0) {
      setPhase("debate");
      setDebateTimer(DEBATE_SECONDS);
      setDebating(true);
    } else {
      setPhase("result");
    }
  }

  function awardDebateWin() {
    setDebating(false);
    setScores(s => {
      const next = { ...s };
      minorityPlayers.forEach(p => { next[p] = (next[p] ?? 0) + 20; });
      return next;
    });
    setPhase("result");
  }

  function next() {
    setQIdx(i => i + 1);
    setChoices({});
    setPhase("vote");
    setDebateTimer(DEBATE_SECONDS);
    setDebating(false);
  }

  function finish() {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    onFinish({
      xpEarned: Math.max(40, sorted.reduce((a, b) => a + b[1], 0)),
      rounds,
      skipped: 0,
      meta: { scores, winner: sorted[0]?.[0], history: history.length },
    });
  }

  return (
    <div className="space-y-4">
      {/* Scores */}
      {Object.keys(scores).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([name, pts], i) => (
            <div key={name} className={`rounded-full px-3 py-1 text-xs font-semibold border flex items-center gap-1 ${
              i === 0 ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-gray-50 text-gray-600"
            }`}>
              {i === 0 && <Crown className="w-3 h-3" />} {name} {pts}pts
            </div>
          ))}
        </div>
      )}

      {!q ? <div className="text-sm text-gray-500">Loading questions…</div> : (
        <AnimatePresence mode="wait">

          {/* VOTE PHASE */}
          {phase === "vote" && (
            <motion.div key={`vote-${qIdx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Round {rounds + 1} • Would You Rather…</div>
                <div className="text-sm text-gray-500">{players.length - Object.keys(choices).length} players haven't voted yet</div>
              </div>

              {/* The two options */}
              <div className="grid grid-cols-2 gap-3">
                {(["A", "B"] as const).map(side => (
                  <div key={side} className={`rounded-2xl border-2 p-4 text-center space-y-2 transition ${
                    side === "A" ? "border-rose-200 bg-rose-50" : "border-fuchsia-200 bg-fuchsia-50"
                  }`}>
                    <div className={`text-xs font-bold ${side === "A" ? "text-rose-600" : "text-fuchsia-600"}`}>
                      Option {side}
                    </div>
                    <div className="text-sm font-medium text-gray-900 leading-snug">
                      {side === "A" ? q.a : q.b}
                    </div>
                  </div>
                ))}
              </div>

              {/* Each player votes — pass phone around */}
              <div className="space-y-2">
                {players.map(player => (
                  <div key={player} className="flex items-center justify-between rounded-2xl border p-3">
                    <span className={`text-sm font-medium ${choices[player] ? "text-gray-400" : "text-gray-900"}`}>
                      {player} {choices[player] ? `→ ${choices[player]}` : ""}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => cast(player, "A")}
                        className={`rounded-xl px-3 py-1.5 text-xs border font-semibold transition ${
                          choices[player] === "A" ? "bg-rose-500 text-white" : "hover:bg-rose-50 text-rose-700 border-rose-200"
                        }`}>A</button>
                      <button onClick={() => cast(player, "B")}
                        className={`rounded-xl px-3 py-1.5 text-xs border font-semibold transition ${
                          choices[player] === "B" ? "bg-fuchsia-500 text-white" : "hover:bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200"
                        }`}>B</button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={reveal} disabled={!allVoted}
                className="w-full rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium disabled:opacity-50">
                Reveal Results {!allVoted && `(${Object.keys(choices).length}/${players.length})`}
              </button>
            </motion.div>
          )}

          {/* DEBATE PHASE */}
          {phase === "debate" && (
            <motion.div key="debate" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="space-y-4">
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-800 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    {isTie ? "🤝 It's a tie! Debate time!" : "🎤 Minority must defend!"}
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-mono font-bold border ${
                    debateTimer <= 10 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-white text-amber-700"
                  }`}>
                    <Clock className="w-3.5 h-3.5" /> {debateTimer}s
                  </div>
                </div>

                <div className="h-1.5 w-full bg-amber-200 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-amber-500 rounded-full"
                    animate={{ width: `${(debateTimer / DEBATE_SECONDS) * 100}%` }} transition={{ duration: 0 }} />
                </div>

                <div className="text-sm text-amber-800">
                  {isTie
                    ? `Split ${aVoters.length}–${bVoters.length}! Everyone argue why their choice is better!`
                    : `${minorityPlayers.join(", ")} chose the minority option. Defend yourselves!`}
                </div>

                {/* Show the split */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-xs">
                    <div className="font-semibold text-rose-700 mb-1">Team A ({aVoters.length})</div>
                    {aVoters.map(p => <div key={p}>{p}</div>)}
                  </div>
                  <div className="rounded-xl bg-fuchsia-50 border border-fuchsia-200 p-2 text-xs">
                    <div className="font-semibold text-fuchsia-700 mb-1">Team B ({bVoters.length})</div>
                    {bVoters.map(p => <div key={p}>{p}</div>)}
                  </div>
                </div>
              </div>

              {!isTie && (
                <button onClick={awardDebateWin}
                  className="w-full rounded-2xl py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium">
                  🏆 Minority won the debate! +20 XP
                </button>
              )}
              <button onClick={() => { setDebating(false); setPhase("result"); }}
                className="w-full rounded-2xl py-2 border text-sm text-gray-500 hover:bg-gray-50">
                End debate
              </button>
            </motion.div>
          )}

          {/* RESULT PHASE */}
          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4">
              <div className="rounded-2xl border p-4 space-y-3">
                <div className="text-sm font-medium text-gray-700">Would you rather…</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`rounded-xl p-3 ${aVoters.length > bVoters.length ? "bg-rose-100 border-2 border-rose-300" : "bg-gray-50 border"}`}>
                    <div className="font-semibold text-rose-700 mb-1">A — {aVoters.length} votes {aVoters.length > bVoters.length ? "✅" : ""}</div>
                    <div className="text-gray-700">{q.a}</div>
                    <div className="text-gray-500 mt-1">{aVoters.join(", ")}</div>
                  </div>
                  <div className={`rounded-xl p-3 ${bVoters.length > aVoters.length ? "bg-fuchsia-100 border-2 border-fuchsia-300" : "bg-gray-50 border"}`}>
                    <div className="font-semibold text-fuchsia-700 mb-1">B — {bVoters.length} votes {bVoters.length > aVoters.length ? "✅" : ""}</div>
                    <div className="text-gray-700">{q.b}</div>
                    <div className="text-gray-500 mt-1">{bVoters.join(", ")}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={next}
                  className="flex-1 rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium">
                  Next Question →
                </button>
                <button onClick={finish}
                  className="rounded-2xl px-4 py-2.5 border text-sm hover:bg-gray-50 inline-flex items-center gap-1">
                  <RotateCcw className="w-4 h-4" /> End
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}