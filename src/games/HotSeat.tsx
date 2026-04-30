/**
 * HotSeat.tsx — SYNCED VERSION
 * Host controls ALL game state. State is broadcast to all players via
 * POST /lobbies/{code}/games/{id}/action → backend fires LobbyGameUpdate event
 * All players listen on echo.channel(`lobby-game.${sessionId}`)
 *
 * Player roles:
 *  HOST          → sees all controls (Start Round, Move to Vote, Reveal, Next)
 *  IN THE SEAT   → sees the question, gets a banner, no vote buttons
 *  VOTER         → sees vote buttons (thumbs up / thumbs down)
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { useAuth } from "../context/AuthContext";
import { Flame, ThumbsUp, ThumbsDown, Crown, Clock, RotateCcw } from "lucide-react";
import { echo } from "../libs/echo";

type Phase = "intro" | "question" | "vote" | "result";

type GameState = {
  phase: Phase;
  seatIdx: number;
  qIdx: number;
  question: string | null;
  votes: Record<string, "up" | "down">;
  timeLeft: number;
  scores: Record<string, number>;
  roundResults: { player: string; q: string; ups: number; downs: number }[];
  currentPlayer: string; // ← explicit name, not derived from index
};

const SECONDS = 20;

const FALLBACK = [
  "What's the most embarrassing thing you've done at a party?",
  "What's a lie you've told recently?",
  "Who in this room would you trust with a secret?",
  "What's something you'd never admit to your parents?",
  "What's the wildest thing on your bucket list?",
  "Who here would survive a zombie apocalypse?",
  "What's your most controversial food opinion?",
  "What's the last thing you Googled that you're embarrassed about?",
  "What would you do with $1 million right now?",
  "What's a habit nobody here knows about?",
  "If you had to date someone in this room, who?",
  "What's the most childish thing you still do?",
  "What's your biggest pet peeve about this group?",
  "What's something you pretend to like but hate?",
  "What's the funniest thing that happened to you this year?",
  "What would you do if you were invisible for a day?",
  "What's a secret talent nobody here knows about?",
  "What's the worst gift you've ever received?",
];

type Props = {
  players: string[];
  lobbyCode: string;
  sessionId: number;
  hostId: number;
  onFinish: (res: GameResult) => void;
  category?: string;
};

export default function HotSeat({ players, lobbyCode, sessionId, hostId, onFinish, category = "Playful" }: Props) {
  const { user } = useAuth();
  const isHost   = String(user?.id) === String(hostId);

  const questionsRef = useRef<string[]>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const [gs, setGs] = useState<GameState>(() => ({
    phase: "intro", seatIdx: 0, qIdx: 0, question: null,
    votes: {}, timeLeft: SECONDS, scores: {}, roundResults: [],
    currentPlayer: players[0] ?? "",
  }));

  // ── Load AI questions ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.post("/ai/truth-dare", {
          category, tone: "PG-13",
          count_truths: 20, count_dares: 0,
          names: players, personalize: false,
        });
        if (data.truths?.length) {
          questionsRef.current = [...data.truths, ...FALLBACK];
        }
      } catch { /* use fallback */ }
      finally { setLoading(false); }
    })();
  }, []);

  // ── Listen for state from host ────────────────────────────────────────────
  useEffect(() => {
    echo.channel(`lobby-game.${sessionId}`)
      .listen(".LobbyGameUpdate", (e: any) => {
        if (e.type === "state") {
          setGs(e.data);
          // If host broadcasted question phase, start local timer display
          if (e.data.phase === "question" && !isHost) {
            // non-host just renders the timeLeft from state
          }
        }
        if (e.type === "vote" && isHost) {
          // Host receives vote events and merges them, then rebroadcasts
          setGs(prev => {
            const newVotes = { ...prev.votes, [e.voter]: e.vote };
            const next = { ...prev, votes: newVotes };
            broadcastState(next);
            return next;
          });
        }
      });
    return () => { echo.leave(`lobby-game.${sessionId}`); stopTimer(); };
  }, [sessionId, isHost]);

  // ── Broadcast state (host only) ───────────────────────────────────────────
  async function broadcastState(newGs: GameState) {
    setGs(newGs);
    try {
      await api.post(`/lobbies/${lobbyCode}/games/${sessionId}/action`, {
        type: "state", data: newGs,
      });
    } catch (e) { console.error("Broadcast failed:", e); }
  }

  // ── Timer (host only) ─────────────────────────────────────────────────────
  function startTimer(initial: GameState) {
    stopTimer();
    let current = { ...initial };
    timerRef.current = window.setInterval(() => {
      current = { ...current, timeLeft: current.timeLeft - 1 };
      if (current.timeLeft <= 0) {
        stopTimer();
        const next = { ...current, phase: "vote" as Phase };
        broadcastState(next);
      } else {
        setGs(current);
        if (current.timeLeft % 3 === 0) broadcastState(current);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  // ── HOST ACTIONS ──────────────────────────────────────────────────────────
  function startRound() {
    if (!isHost) return;
    const q = questionsRef.current[gs.qIdx % questionsRef.current.length];
    const next: GameState = {
      ...gs,
      phase: "question",
      question: q,
      votes: {},
      timeLeft: SECONDS,
      currentPlayer: hotPlayer, // ← explicit name from host
    };
    broadcastState(next);
    startTimer(next);
  }

  function moveToVote() {
    if (!isHost) return;
    stopTimer();
    const next: GameState = { ...gs, phase: "vote" };
    broadcastState(next);
  }

  function revealVotes() {
    if (!isHost) return;
    const ups  = Object.values(gs.votes).filter(v => v === "up").length;
    const downs = Object.values(gs.votes).filter(v => v === "down").length;
    const xp         = ups * 10;
    const newScores  = { ...gs.scores, [hotPlayer]: (gs.scores[hotPlayer] ?? 0) + xp };
    const newResults = [...gs.roundResults, { player: hotPlayer, q: gs.question ?? "", ups, downs }];
    broadcastState({ ...gs, phase: "result", scores: newScores, roundResults: newResults });
  }

  function nextPlayer() {
    if (!isHost) return;
    const newSeatIdx = gs.seatIdx + 1;
    const nextName   = players[newSeatIdx % players.length] ?? players[0];
    broadcastState({
      ...gs,
      phase: "intro",
      seatIdx: newSeatIdx,
      qIdx: gs.qIdx + 1,
      question: null,
      votes: {},
      timeLeft: SECONDS,
      currentPlayer: nextName,
    });
  }

  // ── PARTICIPANT VOTE ──────────────────────────────────────────────────────
  async function castVote(v: "up" | "down") {
    const voterName = user?.name ?? "Unknown";
    setGs(prev => ({ ...prev, votes: { ...prev.votes, [voterName]: v } }));
    try {
      await api.post(`/lobbies/${lobbyCode}/games/${sessionId}/action`, {
        type: "vote", voter: voterName, vote: v,
      });
    } catch { /* silent */ }
  }

  function finish() {
    stopTimer();
    const sorted = Object.entries(gs.scores).sort((a, b) => b[1] - a[1]);
    onFinish({
      xpEarned: Math.max(50, sorted.reduce((a, [, v]) => a + v, 0)),
      rounds: gs.roundResults.length, skipped: 0,
      meta: { scores: gs.scores, winner: sorted[0]?.[0] },
    });
  }

  // Use broadcasted currentPlayer name — not derived from local players[] order
  // This prevents sync issues when presence delivers players in different orders
  const hotPlayer = gs.currentPlayer || players[gs.seatIdx % players.length] || players[0] || "";
  const isInSeat  = user?.name === hotPlayer;
  const voters    = players.filter(p => p !== hotPlayer);
  const myVote    = gs.votes[user?.name ?? ""];

  return (
    <div className="space-y-4">
      {loading && <div className="text-xs text-gray-500 text-center animate-pulse">Loading questions…</div>}

      {/* Scoreboard */}
      {Object.keys(gs.scores).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(gs.scores).sort((a,b) => b[1]-a[1]).map(([name, pts], i) => (
            <div key={name} className={`rounded-full px-3 py-1 text-xs font-semibold border flex items-center gap-1 ${
              i === 0 ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-gray-50 text-gray-600"
            }`}>
              {i === 0 && <Crown className="w-3 h-3"/>} {name} {pts}pts
            </div>
          ))}
        </div>
      )}

      {/* Contextual banner */}
      {isInSeat && gs.phase === "question" && (
        <div className="rounded-2xl bg-gradient-to-r from-orange-400 to-rose-500 p-3 text-white text-center font-semibold text-sm animate-pulse">
          🔥 You're in the Hot Seat! Answer out loud.
        </div>
      )}
      {!isInSeat && gs.phase === "question" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-amber-700 text-center text-sm">
          👂 Listen to <b>{hotPlayer}</b>'s answer — vote coming up!
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* INTRO */}
        {gs.phase === "intro" && (
          <motion.div key="intro" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
            className="rounded-3xl bg-gradient-to-br from-orange-400 to-rose-500 p-6 text-white text-center space-y-3">
            <div className="text-5xl">🔥</div>
            <div className="text-xl font-bold">{hotPlayer} is in the Hot Seat!</div>
            <div className="text-white/80 text-sm">20 seconds to answer. Everyone else votes.</div>
            {isHost
              ? <button onClick={startRound} className="mt-2 rounded-2xl px-6 py-2.5 bg-white text-orange-600 font-semibold text-sm hover:bg-orange-50">Start Round 🎤</button>
              : <div className="text-white/60 text-sm mt-2">Waiting for host to start…</div>
            }
          </motion.div>
        )}

        {/* QUESTION */}
        {gs.phase === "question" && (
          <motion.div key="question" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500"/>
                <span className="font-semibold text-gray-900">{hotPlayer}'s turn</span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-sm border ${
                gs.timeLeft <= 5 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-white text-gray-700"
              }`}>
                <Clock className="w-3.5 h-3.5"/> {gs.timeLeft}s
              </div>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div className={`h-full rounded-full ${gs.timeLeft <= 5 ? "bg-red-500" : "bg-orange-500"}`}
                animate={{ width: `${(gs.timeLeft / SECONDS) * 100}%` }} transition={{ duration: 0 }}/>
            </div>
            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5">
              <div className="text-xs text-orange-600 mb-2 font-medium">QUESTION FOR {hotPlayer.toUpperCase()}</div>
              <div className="text-gray-900 font-medium text-lg leading-relaxed">{gs.question}</div>
            </div>
            <div className="text-center text-sm text-gray-500">
              📱 Pass the phone to <b>{hotPlayer}</b> — everyone listen!
            </div>
            {isHost && (
              <button onClick={moveToVote}
                className="w-full rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium">
                Done answering → Start Vote
              </button>
            )}
          </motion.div>
        )}

        {/* VOTE */}
        {gs.phase === "vote" && (
          <motion.div key="vote" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} className="space-y-3">
            <div className="text-center">
              <div className="font-semibold text-gray-900">Did {hotPlayer} answer honestly? 🗳️</div>
              <div className="text-xs text-gray-500 mt-1">{Object.keys(gs.votes).length}/{voters.length} voted</div>
            </div>
            <div className="rounded-2xl border bg-gray-50 p-3 text-sm text-gray-700 italic">"{gs.question}"</div>

            {/* Non-host voters see buttons */}
            {!isInSeat && !isHost && (
              <div className="flex gap-3">
                <button onClick={() => castVote("up")} className={`flex-1 rounded-2xl py-3 text-sm border font-semibold transition ${
                  myVote==="up" ? "bg-emerald-500 text-white border-emerald-500" : "hover:bg-emerald-50 text-emerald-700"}`}>
                  <ThumbsUp className="w-5 h-5 mx-auto mb-1"/> Honest ✅
                </button>
                <button onClick={() => castVote("down")} className={`flex-1 rounded-2xl py-3 text-sm border font-semibold transition ${
                  myVote==="down" ? "bg-red-500 text-white border-red-500" : "hover:bg-red-50 text-red-700"}`}>
                  <ThumbsDown className="w-5 h-5 mx-auto mb-1"/> Sus 👀
                </button>
              </div>
            )}
            {isInSeat && <div className="text-center text-sm text-gray-400 py-2">Everyone is voting on your answer… 🤫</div>}

            {/* Vote status pills — visible to all */}
            <div className="flex flex-wrap gap-2">
              {voters.map(p => (
                <div key={p} className={`rounded-full px-3 py-1 text-xs border ${
                  gs.votes[p]==="up" ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
                  gs.votes[p]==="down" ? "bg-red-50 border-red-300 text-red-700" :
                  "bg-gray-50 text-gray-500"}`}>
                  {p} {gs.votes[p]==="up" ? "✅" : gs.votes[p]==="down" ? "👀" : "⌛"}
                </div>
              ))}
            </div>

            {isHost && (
              <button onClick={revealVotes}
                className="w-full rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium">
                Reveal Results
              </button>
            )}
          </motion.div>
        )}

        {/* RESULT */}
        {gs.phase === "result" && (() => {
          const last = gs.roundResults[gs.roundResults.length - 1];
          return (
            <motion.div key="result" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="space-y-3 text-center">
              <div className={`rounded-2xl p-5 ${last?.ups >= last?.downs ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                <div className="text-3xl mb-2">{last?.ups >= last?.downs ? "✅" : "😬"}</div>
                <div className="font-bold text-gray-900">{last?.ups} honest • {last?.downs} sus</div>
                <div className="text-sm text-gray-600 mt-1">
                  {last?.ups >= last?.downs ? `${hotPlayer} earns ${last?.ups * 10} XP!` : `${hotPlayer} was sus — no XP!`}
                </div>
              </div>
              {isHost ? (
                <div className="flex gap-3">
                  <button onClick={nextPlayer}
                    className="flex-1 rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium">
                    Next Player →
                  </button>
                  <button onClick={finish}
                    className="rounded-2xl px-4 py-2.5 border text-sm hover:bg-gray-50 inline-flex items-center gap-1">
                    <RotateCcw className="w-4 h-4"/> End Game
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-400">Waiting for host to continue…</div>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}