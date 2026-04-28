/**
 * HotSeat.tsx — GROUP PARTY GAME
 * ─────────────────────────────────────────────────────────────────────────────
 * One player is in the "Hot Seat" and gets rapid-fire questions from the group.
 * Everyone else VOTES on whether the answer is honest / good / funny.
 * Votes are tallied in real time. Most votes = most XP.
 *
 * Works great for 3–10 people at a party.
 * No partner required. Pure chaos energy.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { Flame, ThumbsUp, ThumbsDown, RotateCcw, Clock, Crown } from "lucide-react";

type Question = string;

const SECONDS = 20;

const FALLBACK: Question[] = [
  "What's the most embarrassing thing you've done at a party?",
  "What's a lie you've told recently?",
  "Who in this room would you trust with a secret?",
  "What's something you'd never admit to your parents?",
  "What's the wildest thing on your bucket list?",
  "Who here would survive a zombie apocalypse?",
  "What's your most controversial food opinion?",
  "What's the last thing you Googled that you're embarrassed about?",
  "What would you do with $1 million right now?",
  "What's a habit you have that no one knows about?",
  "If you had to date someone in this room, who would it be?",
  "What's the most childish thing you still do?",
  "What's your biggest pet peeve about people in this group?",
  "What's something you pretend to like but actually hate?",
];

export default function HotSeat({
  players,
  onFinish,
  category = "Playful",
}: {
  players: string[];
  onFinish: (res: GameResult) => void;
  category?: string;
}) {
  const [questions, setQuestions] = useState<Question[]>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [seatIdx, setSeatIdx] = useState(0); // whose turn
  const [qIdx, setQIdx] = useState(0);
  const [phase, setPhase] = useState<"intro" | "question" | "vote" | "result">("intro");
  const [votes, setVotes] = useState<Record<string, "up" | "down">>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [roundResults, setRoundResults] = useState<{ player: string; q: string; ups: number; downs: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.post("/ai/truth-dare", {
          category,
          tone: "PG-13",
          count_truths: 20,
          count_dares: 0,
          personalize: false,
        });
        if (data.truths?.length) setQuestions(q => [...data.truths, ...q]);
      } catch { /* use fallback */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Countdown during question phase
  useEffect(() => {
    if (phase !== "question") return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setPhase("vote"); setVotes({}); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const hotPlayer = players[seatIdx % players.length] ?? "Player";
  const currentQ = questions[qIdx % questions.length] ?? "Tell us something interesting about yourself!";
  const voters = players.filter(p => p !== hotPlayer);

  function startRound() {
    setPhase("question");
    setTimeLeft(SECONDS);
    setVotes({});
  }

  function castVote(voter: string, v: "up" | "down") {
    setVotes(prev => ({ ...prev, [voter]: v }));
  }

  function revealVotes() {
    const ups = Object.values(votes).filter(v => v === "up").length;
    const downs = Object.values(votes).filter(v => v === "down").length;
    const xp = ups * 10;
    setScores(s => ({ ...s, [hotPlayer]: (s[hotPlayer] ?? 0) + xp }));
    setRoundResults(r => [...r, { player: hotPlayer, q: currentQ, ups, downs }]);
    setPhase("result");
  }

  function next() {
    setSeatIdx(i => i + 1);
    setQIdx(i => i + 1);
    setPhase("intro");
  }

  function finish() {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const totalXp = sorted.reduce((a, b) => a + b[1], 0);
    onFinish({
      xpEarned: Math.max(50, totalXp),
      rounds: roundResults.length,
      skipped: 0,
      meta: { scores, winner: sorted[0]?.[0], rounds: roundResults },
    });
  }

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      {Object.keys(scores).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .map(([name, pts], i) => (
              <div key={name} className={`rounded-full px-3 py-1 text-xs font-semibold border flex items-center gap-1 ${
                i === 0 ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-gray-50 text-gray-600"
              }`}>
                {i === 0 && <Crown className="w-3 h-3" />}{name} {pts}pts
              </div>
            ))}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* INTRO */}
        {phase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="rounded-3xl bg-gradient-to-br from-orange-400 to-rose-500 p-6 text-white text-center space-y-3">
            <div className="text-5xl">🔥</div>
            <div className="text-xl font-bold">{hotPlayer} is in the Hot Seat!</div>
            <div className="text-white/80 text-sm">20 seconds to answer. Everyone else votes.</div>
            <button onClick={startRound}
              className="mt-2 rounded-2xl px-6 py-2.5 bg-white text-orange-600 font-semibold text-sm hover:bg-orange-50 transition">
              {loading ? "Loading…" : "Start Round 🎤"}
            </button>
          </motion.div>
        )}

        {/* QUESTION */}
        {phase === "question" && (
          <motion.div key="question" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-gray-900">{hotPlayer}'s turn</span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-sm border ${
                timeLeft <= 5 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-white text-gray-700"
              }`}>
                <Clock className="w-3.5 h-3.5" /> {timeLeft}s
              </div>
            </div>

            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-orange-500 rounded-full"
                animate={{ width: `${(timeLeft / SECONDS) * 100}%` }} transition={{ duration: 0 }} />
            </div>

            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5">
              <div className="text-xs text-orange-600 mb-2 font-medium">QUESTION FOR {hotPlayer.toUpperCase()}</div>
              <div className="text-gray-900 font-medium text-lg leading-relaxed">{currentQ}</div>
            </div>

            <div className="text-center text-sm text-gray-500">
              📱 Pass the phone to <b>{hotPlayer}</b> — everyone listen!
            </div>

            <button onClick={() => { setPhase("vote"); setVotes({}); }}
              className="w-full rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium">
              Done answering → Start Vote
            </button>
          </motion.div>
        )}

        {/* VOTE */}
        {phase === "vote" && (
          <motion.div key="vote" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-4">
            <div className="text-center">
              <div className="font-semibold text-gray-900">Did {hotPlayer} answer honestly? 🗳️</div>
              <div className="text-xs text-gray-500 mt-1">{Object.keys(votes).length}/{voters.length} voted</div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {voters.map(voter => (
                <div key={voter} className="flex items-center justify-between rounded-2xl border p-3">
                  <span className="text-sm font-medium text-gray-900">{voter}</span>
                  <div className="flex gap-2">
                    <button onClick={() => castVote(voter, "up")}
                      className={`rounded-xl px-3 py-1.5 text-sm border inline-flex items-center gap-1 transition ${
                        votes[voter] === "up" ? "bg-emerald-500 text-white border-emerald-500" : "hover:bg-emerald-50 text-emerald-700"
                      }`}>
                      <ThumbsUp className="w-4 h-4" /> Honest
                    </button>
                    <button onClick={() => castVote(voter, "down")}
                      className={`rounded-xl px-3 py-1.5 text-sm border inline-flex items-center gap-1 transition ${
                        votes[voter] === "down" ? "bg-red-500 text-white border-red-500" : "hover:bg-red-50 text-red-700"
                      }`}>
                      <ThumbsDown className="w-4 h-4" /> Sus 👀
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={revealVotes}
              disabled={Object.keys(votes).length === 0}
              className="w-full rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium disabled:opacity-50">
              Reveal Results
            </button>
          </motion.div>
        )}

        {/* RESULT */}
        {phase === "result" && (() => {
          const last = roundResults[roundResults.length - 1];
          return (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="space-y-4 text-center">
              <div className={`rounded-2xl p-5 ${last?.ups >= last?.downs ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                <div className="text-3xl mb-2">{last?.ups >= last?.downs ? "✅" : "😬"}</div>
                <div className="font-bold text-gray-900">{last?.ups} honest • {last?.downs} sus</div>
                <div className="text-sm text-gray-600 mt-1">
                  {last?.ups >= last?.downs
                    ? `${hotPlayer} earns ${last?.ups * 10} XP!`
                    : `${hotPlayer} was sus — no XP this round!`}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={next}
                  className="flex-1 rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium">
                  Next Player →
                </button>
                <button onClick={finish}
                  className="rounded-2xl px-4 py-2.5 border text-sm hover:bg-gray-50 inline-flex items-center gap-1">
                  <RotateCcw className="w-4 h-4" /> End Game
                </button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}