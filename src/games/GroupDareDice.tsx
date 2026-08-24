/**
 * GroupDareDice.tsx — GROUP PARTY VERSION (FIXED)
 *
 * FIXES:
 *  1. Crash fix: `players` can be empty on mount — guard with early return
 *  2. `_incomingVote` from remoteState: host merges votes sent by non-host players
 *  3. Non-host players correctly see the rolled face + dare via remoteState
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { Dice6, Check, SkipForward, RotateCcw, ThumbsUp, ThumbsDown, Crown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Props = {
  players: string[];
  onFinish: (res: GameResult) => void;
  category?: string;
  isHost?: boolean;
  remoteState?: any;
  onStateChange?: (state: any) => void;
  onVote?: (voter: string, v: "up" | "down") => void;
};

const FACES = [
  { n: 1, label: "Sweet",     color: "from-pink-100 to-rose-100",      text: "text-rose-600"    },
  { n: 2, label: "Funny",     color: "from-yellow-100 to-amber-100",   text: "text-amber-600"   },
  { n: 3, label: "Playful",   color: "from-fuchsia-100 to-purple-100", text: "text-fuchsia-600" },
  { n: 4, label: "Bold",      color: "from-orange-100 to-red-100",     text: "text-orange-600"  },
  { n: 5, label: "Challenge", color: "from-blue-100 to-indigo-100",    text: "text-blue-600"    },
  { n: 6, label: "Wild Card", color: "from-emerald-100 to-teal-100",   text: "text-emerald-600" },
];

export default function GroupDareDice({
  players, onFinish, category = "Playful",
  isHost: isHostProp, remoteState, onStateChange, onVote,
}: Props) {
  const isHost = isHostProp ?? true;
  const { user } = useAuth();
  const myName = user?.name ?? "";

  // ── ALL HOOKS BEFORE ANY EARLY RETURN ────────────────────────────────────
  const [dares, setDares]                         = useState<string[]>([]);
  const [loading, setLoading]                     = useState(false);
  const [err, setErr]                             = useState<string | null>(null);
  const [turnIdx, setTurnIdx]                     = useState(0);
  const [currentPlayerName, setCurrentPlayerName] = useState<string>("");
  const [rolled, setRolled]                       = useState<typeof FACES[0] | null>(null);
  const [currentDare, setCurrentDare]             = useState<string | null>(null);
  const [spins, setSpins]                         = useState(0);
  const [skipsLeft, setSkipsLeft]                 = useState(3);
  const [scores, setScores]                       = useState<Record<string, number>>({});
  const [votes, setVotes]                         = useState<Record<string, "up" | "down">>({});
  const [phase, setPhase]                         = useState<"roll" | "dare" | "vote" | "result">("roll");
  const [challengeTarget, setChallengeTarget]     = useState<string | null>(null);
  const distribution = useRef<Record<number, number>>({ 1:0,2:0,3:0,4:0,5:0,6:0 });
  // _incomingVote persists on remoteState (merged, never cleared) — dedupe by
  // seq so a later unrelated state update doesn't replay a stale vote.
  const lastVoteSeq = useRef(0);

  // Apply remote state (must be before early return)
  useEffect(() => {
    if (!remoteState) return;
    if (!isHost) {
      if (remoteState.currentPlayer   !== undefined) setCurrentPlayerName(remoteState.currentPlayer);
      if (remoteState.turnIdx         !== undefined) setTurnIdx(remoteState.turnIdx);
      if (remoteState.rolled          !== undefined) setRolled(remoteState.rolled);
      if (remoteState.currentDare     !== undefined) setCurrentDare(remoteState.currentDare);
      if (remoteState.phase           !== undefined) setPhase(remoteState.phase);
      if (remoteState.scores          !== undefined) setScores(remoteState.scores);
      if (remoteState.votes           !== undefined) setVotes(remoteState.votes);
      if (remoteState.challengeTarget !== undefined) setChallengeTarget(remoteState.challengeTarget);
    }
    if (isHost && remoteState._incomingVote && remoteState._incomingVote.seq !== lastVoteSeq.current) {
      lastVoteSeq.current = remoteState._incomingVote.seq;
      const { voter, vote } = remoteState._incomingVote;
      setVotes(prev => {
        const newVotes = { ...prev, [voter]: vote as "up" | "down" };
        onStateChange?.({ votes: newVotes, phase, turnIdx, scores, currentDare, rolled, challengeTarget, currentPlayer: currentPlayerName });
        return newVotes;
      });
    }
  }, [remoteState]);

  // Fetch dares on mount (host only) — must be before early return
  useEffect(() => {
    if (isHost && players.length > 0) fetchBatch(20);
  }, [isHost, players.length]);

  // ── Guard: after all hooks ────────────────────────────────────────────────
  if (!players || players.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500 animate-pulse">
        Waiting for players to connect…
      </div>
    );
  }

  const currentPlayer = isHost
    ? (players[turnIdx % players.length] ?? players[0])
    : (currentPlayerName || (players[0] ?? ""));
  const voters = players.filter(p => p !== currentPlayer);

  function pushState(patch: Record<string, any>) {
    if (isHost) onStateChange?.({ ...patch, currentPlayer });
  }

  async function fetchBatch(count = 20) {
    setLoading(true); setErr(null);
    try {
      const { data } = await api.post("/ai/truth-dare", {
        category, tone: "PG-13",
        count_truths: 0, count_dares: count,
        names: players, personalize: false,
      });
      if (Array.isArray(data.dares)) setDares(d => [...d, ...data.dares]);
    } catch { setErr("Couldn't load dares — using backup pool"); }
    finally { setLoading(false); }
  }

  function drawDare(): string | null {
    if (dares.length === 0) { if (isHost) fetchBatch(12); return null; }
    const d = dares[0];
    setDares(arr => arr.slice(1));
    if (dares.length < 4 && isHost) fetchBatch(12);
    return d;
  }

  // ── Host actions ──────────────────────────────────────────────────────────
  function rollDice() {
    if (!isHost) return;
    setSpins(s => s + 1);
    const n    = Math.floor(Math.random() * 6) + 1;
    const face = FACES[n - 1];
    distribution.current[n] = (distribution.current[n] || 0) + 1;
    setRolled(face);
    setChallengeTarget(null);
    setVotes({});

    if (face.label === "Challenge") {
      setPhase("dare");
      setCurrentDare(null);
      pushState({ rolled: face, phase: "dare", currentDare: null, votes: {}, challengeTarget: null, turnIdx, scores, currentPlayer });
    } else {
      const d = drawDare();
      setCurrentDare(d);
      setPhase("dare");
      pushState({ rolled: face, phase: "dare", currentDare: d, votes: {}, challengeTarget: null, turnIdx, scores, currentPlayer });
    }
  }

  function pickChallengeDare(target: string) {
    if (!isHost) return;
    setChallengeTarget(target);
    const d = drawDare();
    setCurrentDare(d);
    pushState({ challengeTarget: target, currentDare: d, phase: "dare", turnIdx, rolled, scores, votes: {} });
  }

  function submitDare() {
    if (!isHost) return;
    if (voters.length === 0) {
      completeTurn(true);
    } else {
      setPhase("vote");
      pushState({ phase: "vote", currentDare, rolled, challengeTarget, turnIdx, scores, votes: {} });
    }
  }

  function castVote(voter: string, v: "up" | "down") {
    if (isHost) {
      // Host votes directly
      const newVotes = { ...votes, [voter]: v };
      setVotes(newVotes);
      pushState({ votes: newVotes, phase, turnIdx, scores, currentDare, rolled, challengeTarget });
    } else {
      // Non-host sends vote to host via sendAction
      onVote?.(voter, v);
      setVotes(prev => ({ ...prev, [voter]: v })); // optimistic local update
    }
  }

  function revealVotes() {
    if (!isHost) return;
    const ups   = Object.values(votes).filter(v => v === "up").length;
    const downs = Object.values(votes).filter(v => v === "down").length;
    completeTurn(ups >= downs);
  }

  function completeTurn(success: boolean) {
    const scorer    = challengeTarget ?? currentPlayer;
    const newScores = { ...scores };
    if (success) newScores[scorer] = (newScores[scorer] ?? 0) + 25;
    setScores(newScores);
    setPhase("result");
    pushState({ phase: "result", scores: newScores, turnIdx, currentDare, rolled, challengeTarget, votes });
  }

  function nextTurn() {
    if (!isHost) return;
    const newTurnIdx    = turnIdx + 1;
    const nextPlayer    = players[newTurnIdx % players.length] ?? players[0];
    setTurnIdx(newTurnIdx);
    setCurrentPlayerName(nextPlayer);
    setRolled(null);
    setCurrentDare(null);
    setChallengeTarget(null);
    setVotes({});
    setPhase("roll");
    pushState({
      phase: "roll",
      turnIdx: newTurnIdx,
      currentPlayer: nextPlayer,
      rolled: null,
      currentDare: null,
      challengeTarget: null,
      votes: {},
      scores,
    });
  }

  function skipDare() {
    if (!isHost || skipsLeft <= 0) return;
    setSkipsLeft(k => k - 1);
    const d = drawDare();
    setCurrentDare(d);
    setVotes({});
    pushState({ currentDare: d, votes: {}, phase: "dare", turnIdx, rolled, challengeTarget, scores });
  }

  function finish() {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    onFinish({
      xpEarned: Math.max(30, sorted.reduce((a, [, v]) => a + v, 0)),
      rounds: turnIdx,
      skipped: 3 - skipsLeft,
      meta: { scores, winner: sorted[0]?.[0], rolls: distribution.current },
    });
  }

  return (
    <div className="space-y-4">
      {err && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{err}</div>}

      {/* Scores */}
      {Object.keys(scores).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(scores).sort((a,b) => b[1]-a[1]).map(([name, pts], i) => (
            <div key={name} className={`rounded-full px-3 py-1 text-xs font-semibold border flex items-center gap-1 ${
              i === 0 ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-gray-50 text-gray-600"
            }`}>
              {i === 0 && <Crown className="w-3 h-3"/>} {name} {pts}pts
            </div>
          ))}
        </div>
      )}

      {/* Turn indicator */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold">
            {currentPlayer[0]?.toUpperCase()}
          </div>
          <span className="font-semibold text-gray-900">{currentPlayer}'s turn</span>
        </div>
        {isHost && <span className="text-xs px-2 py-1 rounded-full border text-gray-500">Skips: {skipsLeft}</span>}
      </div>

      <AnimatePresence mode="wait">

        {/* ROLL */}
        {phase === "roll" && (
          <motion.div key="roll" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="grid place-items-center py-4 space-y-4">
            <motion.div key={spins}
              initial={{rotate:0,scale:1}} animate={{rotate:360,scale:1.1}}
              transition={{duration:0.6,ease:"easeInOut"}}
              className="h-28 w-28 rounded-3xl bg-gradient-to-br from-rose-100 to-fuchsia-100 grid place-items-center shadow-inner">
              <Dice6 className="w-14 h-14 text-fuchsia-600"/>
            </motion.div>
            {isHost ? (
              <button onClick={rollDice} disabled={loading}
                className="rounded-2xl px-8 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-semibold shadow-lg hover:opacity-90 disabled:opacity-60 transition">
                🎲 Roll the Dice
              </button>
            ) : (
              <div className="text-sm text-gray-500 animate-pulse">
                Waiting for <b>{currentPlayer}</b> to roll…
              </div>
            )}
            {loading && <div className="text-xs text-gray-500">Loading dares…</div>}
          </motion.div>
        )}

        {/* DARE */}
        {phase === "dare" && rolled && (
          <motion.div key="dare" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
            className="space-y-3">
            <div className={`rounded-2xl bg-gradient-to-br ${rolled.color} p-4`}>
              <div className={`text-xs font-bold mb-1 ${rolled.text}`}>
                YOU ROLLED: {rolled.label.toUpperCase()}
              </div>

              {/* Challenge — pick target (host only) */}
              {rolled.label === "Challenge" && !challengeTarget && isHost && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Pick someone to challenge:</div>
                  <div className="flex flex-wrap gap-2">
                    {voters.map(p => (
                      <button key={p} onClick={() => pickChallengeDare(p)}
                        className="rounded-xl px-3 py-1.5 text-sm bg-white border border-gray-200 hover:border-fuchsia-400 hover:bg-fuchsia-50 font-medium text-gray-900 transition">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {rolled.label === "Challenge" && !challengeTarget && !isHost && (
                <div className="text-sm text-gray-600 animate-pulse">Host is picking who to challenge…</div>
              )}

              {/* Dare card */}
              {currentDare && (
                <div className="mt-2">
                  {challengeTarget && (
                    <div className="text-xs text-gray-500 mb-1">Challenge for <b>{challengeTarget}</b>:</div>
                  )}
                  <div className="text-gray-900 font-medium text-base leading-relaxed">{currentDare}</div>
                </div>
              )}
            </div>

            {currentDare && (
              <div className="flex flex-wrap gap-2">
                {isHost && (
                  <>
                    <button onClick={submitDare}
                      className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm inline-flex items-center gap-2">
                      <Check className="w-4 h-4"/> Done — Let everyone vote
                    </button>
                    <button onClick={skipDare} disabled={skipsLeft <= 0}
                      className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1">
                      <SkipForward className="w-4 h-4"/> New dare
                    </button>
                  </>
                )}
                {!isHost && (
                  <div className="text-xs text-gray-400 animate-pulse">
                    Watching <b>{challengeTarget ?? currentPlayer}</b> do the dare…
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* VOTE */}
        {phase === "vote" && (
          <motion.div key="vote" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
            className="space-y-3">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                Did <b>{challengeTarget ?? currentPlayer}</b> complete the dare? 🗳️
              </div>
              <div className="text-xs text-gray-500 mt-1">{Object.keys(votes).length}/{voters.length} voted</div>
            </div>
            <div className="rounded-2xl border bg-gray-50 p-3 text-sm text-gray-700 italic">"{currentDare}"</div>

            {/* Vote list — each player only sees their OWN vote buttons */}
            <div className="space-y-2">
              {voters.map(voter => {
                // Only show vote buttons if this row is the current user
                const isMyRow = voter === myName;
                return (
                  <div key={voter} className="flex items-center justify-between rounded-2xl border p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 grid place-items-center text-white text-[10px] font-bold">
                        {voter[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{voter}</span>
                    </div>
                    {/* Vote status or buttons */}
                    {votes[voter] ? (
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        votes[voter] === "up"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {votes[voter] === "up" ? "✅ Yes" : "👀 Nope"}
                      </span>
                    ) : isMyRow ? (
                      <div className="flex gap-2">
                        <button onClick={() => castVote(voter, "up")}
                          className="rounded-xl px-3 py-1.5 text-sm border inline-flex items-center gap-1 hover:bg-emerald-50 text-emerald-700 transition">
                          <ThumbsUp className="w-4 h-4"/> Yes!
                        </button>
                        <button onClick={() => castVote(voter, "down")}
                          className="rounded-xl px-3 py-1.5 text-sm border inline-flex items-center gap-1 hover:bg-red-50 text-red-700 transition">
                          <ThumbsDown className="w-4 h-4"/> Nope
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">⌛ waiting…</span>
                    )}
                  </div>
                );
              })}
            </div>

            {isHost && (
              <button onClick={revealVotes} disabled={Object.keys(votes).length === 0}
                className="w-full rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium disabled:opacity-50">
                Reveal Results ({Object.keys(votes).length}/{voters.length})
              </button>
            )}
            {!isHost && (
              <div className="text-center text-xs text-gray-400 animate-pulse">
                Waiting for host to reveal results…
              </div>
            )}
          </motion.div>
        )}

        {/* RESULT */}
        {phase === "result" && (() => {
          const ups    = Object.values(votes).filter(v => v === "up").length;
          const downs  = Object.values(votes).filter(v => v === "down").length;
          const won    = voters.length === 0 || ups >= downs;
          const scorer = challengeTarget ?? currentPlayer;
          return (
            <motion.div key="result" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
              className="space-y-3 text-center">
              <div className={`rounded-2xl p-5 ${won ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                <div className="text-3xl mb-2">{won ? "🎉" : "😬"}</div>
                <div className="font-bold text-gray-900">
                  {voters.length === 0
                    ? `${scorer} completed the dare!`
                    : won
                    ? `${ups}/${voters.length} say ${scorer} nailed it! +25 pts`
                    : `${downs}/${voters.length} say ${scorer} didn't complete it!`}
                </div>
              </div>
              {isHost ? (
                <div className="flex gap-3">
                  <button onClick={nextTurn}
                    className="flex-1 rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium">
                    Next Player →
                  </button>
                  <button onClick={finish}
                    className="rounded-2xl px-4 py-2.5 border text-sm hover:bg-gray-50 inline-flex items-center gap-1">
                    <RotateCcw className="w-4 h-4"/> End Game
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-gray-400 animate-pulse">
                  Waiting for host to continue…
                </div>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Footer — player turn dots + finish */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex -space-x-1">
          {players.map((p, i) => (
            <div key={p} title={p}
              className={`h-6 w-6 rounded-full border-2 border-white grid place-items-center text-white text-[10px] font-bold ${
                i === turnIdx % players.length
                  ? "bg-gradient-to-br from-pink-500 to-fuchsia-600 ring-2 ring-fuchsia-400"
                  : "bg-gradient-to-br from-gray-300 to-gray-400"
              }`}>
              {p[0]?.toUpperCase()}
            </div>
          ))}
        </div>
        {isHost && (
          <button onClick={finish}
            className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm">
            Finish Game
          </button>
        )}
      </div>
    </div>
  );
}