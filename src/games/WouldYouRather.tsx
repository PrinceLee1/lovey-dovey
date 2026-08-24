/**
 * WouldYouRather.tsx — SYNCED VERSION
 *
 * Accepts sync props from SyncedLobbyGameRunner:
 *  - isHost: boolean — host sees Reveal button, others wait
 *  - remoteChoices / remotePhase — state patches from host broadcast
 *  - onStateChange(state) — host calls this to broadcast state
 *  - onVote(player, choice) — non-host calls this to send vote to host
 *
 * When used standalone (no sync props), falls back to original local behavior.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { Clock, RotateCcw, Zap, Crown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type WYRQuestion = { a: string; b: string };

const FALLBACK: WYRQuestion[] = [
  { a: "Always be 10 minutes late",          b: "Always be 20 minutes early" },
  { a: "Know when you'll die",               b: "Know how you'll die" },
  { a: "Have no phone for a month",          b: "Have no money for a month" },
  { a: "Fight 100 duck-sized horses",        b: "Fight 1 horse-sized duck" },
  { a: "Only eat your favourite food forever", b: "Never eat it again" },
  { a: "Be famous but hated",               b: "Unknown but loved" },
  { a: "Have a photographic memory",         b: "Forget anything on demand" },
  { a: "Live in the past",                   b: "Live 100 years in the future" },
  { a: "Speak every language fluently",      b: "Play every instrument perfectly" },
  { a: "Always say what you think",          b: "Never speak again" },
  { a: "Be the funniest person in any room", b: "Be the smartest person in any room" },
  { a: "Unlimited money but no friends",     b: "Amazing friends but always broke" },
];

const DEBATE_SECONDS = 45;

type SyncProps = {
  isHost?: boolean;
  remoteChoices?: Record<string, "A" | "B">;
  remotePhase?: string | null;
  remoteQIdx?: number;
  incomingVote?: { player: string; choice: "A" | "B"; seq: number } | null;
  onStateChange?: (state: any) => void;
  onVote?: (player: string, choice: "A" | "B") => void;
};

type Props = SyncProps & {
  players: string[];
  onFinish: (res: GameResult) => void;
  category?: string;
};

export default function WouldYouRather({
  players, onFinish, category = "Playful",
  isHost: isHostProp,
  remoteChoices, remotePhase, remoteQIdx, incomingVote,
  onStateChange, onVote,
}: Props) {
  const { user } = useAuth();
  // If isHost not passed (standalone mode), everyone is "host"
  const isHost = isHostProp ?? true;

  const [questions, setQuestions] = useState<WYRQuestion[]>(FALLBACK);
  const [qIdx, setQIdx]           = useState(0);
  const [phase, setPhase]         = useState<"vote" | "debate" | "result">("vote");
  const [choices, setChoices]     = useState<Record<string, "A" | "B">>({});
  const [debateTimer, setDebateTimer] = useState(DEBATE_SECONDS);
  const [debating, setDebating]   = useState(false);
  const [scores, setScores]       = useState<Record<string, number>>({});
  const [rounds, setRounds]       = useState(0);

  // ── Load questions ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/ai/truth-dare", {
          category, tone: "PG-13", count_truths: 15, count_dares: 0, personalize: false,
        });
        const wyrs: WYRQuestion[] = (data.truths ?? [])
          .filter((t: string) => t.toLowerCase().includes(" or "))
          .map((t: string) => {
            const parts = t.split(/ or /i);
            return { a: parts[0]?.trim() ?? t, b: parts[1]?.trim() ?? "Something else" };
          });
        if (wyrs.length >= 3) setQuestions(q => [...wyrs, ...q]);
      } catch { /* use fallback */ }
    })();
  }, []);

  // ── Apply remote state patches (non-host only — the host's own `choices`/
  // `qIdx` are the source of truth and must not be clobbered by a stale prop) ──
  useEffect(() => {
    if (isHost || remoteChoices === undefined) return;
    setChoices(remoteChoices);
  }, [isHost, remoteChoices]);

  useEffect(() => {
    if (isHost || !remotePhase || remotePhase === phase) return;
    setPhase(remotePhase as any);
  }, [isHost, remotePhase]);

  useEffect(() => {
    if (isHost || remoteQIdx === undefined || remoteQIdx === qIdx) return;
    setQIdx(remoteQIdx);
  }, [isHost, remoteQIdx]);

  // ── Apply incoming votes from non-host players (host only) ────────────────
  const lastVoteSeqRef = useRef(0);
  useEffect(() => {
    if (!isHost || !incomingVote || incomingVote.seq <= lastVoteSeqRef.current) return;
    lastVoteSeqRef.current = incomingVote.seq;
    setChoices(c => {
      const next = { ...c, [incomingVote.player]: incomingVote.choice };
      broadcastState(next, phase);
      return next;
    });
  }, [isHost, incomingVote]);

  // ── Broadcast state (host only) ───────────────────────────────────────────
  const broadcastState = useCallback((newChoices: Record<string, "A"|"B">, newPhase: string) => {
    onStateChange?.({ choices: newChoices, phase: newPhase, qIdx });
  }, [onStateChange, qIdx]);

  // ── Debate timer ──────────────────────────────────────────────────────────
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

  const q        = questions[qIdx % questions.length];
  const aVoters  = players.filter(p => choices[p] === "A");
  const bVoters  = players.filter(p => choices[p] === "B");
  const allVoted = players.every(p => choices[p]);
  const isTie    = aVoters.length === bVoters.length;
  const majorityIs = aVoters.length > bVoters.length ? "A" : "B";
  const minorityPlayers = majorityIs === "A" ? bVoters : aVoters;

  function cast(player: string, choice: "A" | "B") {
    if (!isHost) {
      // Non-host sends their own vote only
      if (player !== user?.name) return;
      onVote?.(player, choice);
      setChoices(c => ({ ...c, [player]: choice })); // optimistic
      return;
    }
    const newChoices = { ...choices, [player]: choice };
    setChoices(newChoices);
    broadcastState(newChoices, phase);
  }

  function reveal() {
    if (!isHost) return;
    setRounds(r => r + 1);
    if (isTie || minorityPlayers.length > 0) {
      setPhase("debate");
      setDebateTimer(DEBATE_SECONDS);
      setDebating(true);
      broadcastState(choices, "debate");
    } else {
      const majority = majorityIs === "A" ? aVoters : bVoters;
      setScores(s => { const n = {...s}; majority.forEach(p => { n[p] = (n[p]??0)+10; }); return n; });
      setPhase("result");
      broadcastState(choices, "result");
    }
  }

  function awardDebateWin() {
    if (!isHost) return;
    setDebating(false);
    setScores(s => { const n={...s}; minorityPlayers.forEach(p=>{n[p]=(n[p]??0)+20;}); return n; });
    setPhase("result");
    broadcastState(choices, "result");
  }

  function next() {
    if (!isHost) return;
    const newIdx = qIdx + 1;
    setQIdx(newIdx);
    setChoices({});
    setPhase("vote");
    setDebateTimer(DEBATE_SECONDS);
    setDebating(false);
    onStateChange?.({ choices: {}, phase: "vote", qIdx: newIdx });
  }

  function finish() {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    onFinish({
      xpEarned: Math.max(40, sorted.reduce((a, b) => a + b[1], 0)),
      rounds, skipped: 0,
      meta: { scores, winner: sorted[0]?.[0] },
    });
  }

  if (!q) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading questions…</div>;

  return (
    <div className="space-y-4">
      {/* Scores */}
      {Object.keys(scores).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(scores).sort((a,b)=>b[1]-a[1]).map(([name,pts],i) => (
            <div key={name} className={`rounded-full px-3 py-1 text-xs font-semibold border flex items-center gap-1 ${
              i===0?"bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300":"bg-gray-50 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"}`}>
              {i===0&&<Crown className="w-3 h-3"/>} {name} {pts}pts
            </div>
          ))}
        </div>
      )}

      {!isHost && phase === "vote" && (
        <div className="rounded-xl bg-fuchsia-50 border border-fuchsia-200 p-2 text-center text-xs text-fuchsia-700 dark:bg-fuchsia-950/40 dark:border-fuchsia-900 dark:text-fuchsia-300">
          Tap your choice below 👇
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* VOTE */}
        {phase === "vote" && (
          <motion.div key={`vote-${qIdx}`} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Round {qIdx+1} • Would You Rather…</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{players.length - Object.keys(choices).length} players haven't voted</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["A","B"] as const).map(side => (
                <div key={side} className={`rounded-2xl border-2 p-4 text-center space-y-2 ${
                  side==="A"?"border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40":"border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-900 dark:bg-fuchsia-950/40"}`}>
                  <div className={`text-xs font-bold ${side==="A"?"text-rose-600 dark:text-rose-400":"text-fuchsia-600 dark:text-fuchsia-400"}`}>Option {side}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{side==="A"?q.a:q.b}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {players.map(player => {
                const canVote = isHost || player === user?.name;
                return (
                  <div key={player} className="flex items-center justify-between rounded-2xl border dark:border-gray-800 p-3">
                    <span className={`text-sm font-medium ${choices[player]?"text-gray-400 dark:text-gray-500":"text-gray-900 dark:text-gray-100"}`}>
                      {player} {choices[player] ? `→ ${choices[player]}` : ""}
                    </span>
                    {canVote && (
                      <div className="flex gap-2">
                        <button onClick={() => cast(player, "A")} className={`rounded-xl px-3 py-1.5 text-xs border font-semibold transition ${
                          choices[player]==="A"?"bg-rose-500 text-white":"hover:bg-rose-50 text-rose-700 border-rose-200 dark:hover:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"}`}>A</button>
                        <button onClick={() => cast(player, "B")} className={`rounded-xl px-3 py-1.5 text-xs border font-semibold transition ${
                          choices[player]==="B"?"bg-fuchsia-500 text-white":"hover:bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:hover:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-800"}`}>B</button>
                      </div>
                    )}
                    {!canVote && !choices[player] && <span className="text-xs text-gray-400 dark:text-gray-500">⌛</span>}
                  </div>
                );
              })}
            </div>
            {isHost && (
              <button onClick={reveal} disabled={!allVoted}
                className="w-full rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium disabled:opacity-50">
                Reveal Results {!allVoted && `(${Object.keys(choices).length}/${players.length})`}
              </button>
            )}
            {!isHost && !allVoted && (
              <div className="text-center text-xs text-gray-400 dark:text-gray-500">Waiting for all players to vote…</div>
            )}
          </motion.div>
        )}

        {/* DEBATE */}
        {phase === "debate" && (
          <motion.div key="debate" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="space-y-4">
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 space-y-2 dark:border-amber-900 dark:bg-amber-950/40">
              <div className="flex items-center justify-between">
                <div className="font-bold text-amber-800 flex items-center gap-2 dark:text-amber-300">
                  <Zap className="w-5 h-5"/>
                  {isTie ? "🤝 It's a tie! Debate time!" : "🎤 Minority must defend!"}
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-mono font-bold border ${
                  debateTimer<=10?"bg-red-50 text-red-600 border-red-200 animate-pulse dark:bg-red-950/40 dark:text-red-400 dark:border-red-900":"bg-white text-amber-700 dark:bg-gray-800 dark:text-amber-300 dark:border-gray-700"}`}>
                  <Clock className="w-3.5 h-3.5"/> {debateTimer}s
                </div>
              </div>
              <div className="h-1.5 w-full bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                <motion.div className="h-full bg-amber-500 rounded-full"
                  animate={{width:`${(debateTimer/DEBATE_SECONDS)*100}%`}} transition={{duration:0}}/>
              </div>
              <div className="text-sm text-amber-800 dark:text-amber-300">
                {isTie ? "Everyone argue why their choice is better!" : `${minorityPlayers.join(", ")} chose the minority. Defend it!`}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-xs dark:bg-rose-950/40 dark:border-rose-900">
                  <div className="font-semibold text-rose-700 mb-1 dark:text-rose-300">Team A ({aVoters.length})</div>
                  {aVoters.map(p=><div key={p} className="dark:text-gray-300">{p}</div>)}
                </div>
                <div className="rounded-xl bg-fuchsia-50 border border-fuchsia-200 p-2 text-xs dark:bg-fuchsia-950/40 dark:border-fuchsia-900">
                  <div className="font-semibold text-fuchsia-700 mb-1 dark:text-fuchsia-300">Team B ({bVoters.length})</div>
                  {bVoters.map(p=><div key={p} className="dark:text-gray-300">{p}</div>)}
                </div>
              </div>
            </div>
            {isHost && !isTie && (
              <button onClick={awardDebateWin} className="w-full rounded-2xl py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium">
                🏆 Minority won the debate! +20 XP
              </button>
            )}
            {isHost && (
              <button onClick={() => { setDebating(false); setPhase("result"); broadcastState(choices, "result"); }}
                className="w-full rounded-2xl py-2 border dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                End debate
              </button>
            )}
            {!isHost && <div className="text-center text-xs text-gray-400 dark:text-gray-500">Host will end the debate…</div>}
          </motion.div>
        )}

        {/* RESULT */}
        {phase === "result" && (
          <motion.div key="result" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
            <div className="rounded-2xl border dark:border-gray-800 p-4 space-y-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Would you rather…</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`rounded-xl p-3 ${aVoters.length>bVoters.length?"bg-rose-100 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800":"bg-gray-50 dark:bg-gray-800 border dark:border-gray-700"}`}>
                  <div className="font-semibold text-rose-700 dark:text-rose-300 mb-1">A — {aVoters.length} {aVoters.length>bVoters.length?"✅":""}</div>
                  <div className="text-gray-700 dark:text-gray-300">{q.a}</div>
                  <div className="text-gray-500 dark:text-gray-400 mt-1">{aVoters.join(", ")}</div>
                </div>
                <div className={`rounded-xl p-3 ${bVoters.length>aVoters.length?"bg-fuchsia-100 dark:bg-fuchsia-950/40 border-2 border-fuchsia-300 dark:border-fuchsia-800":"bg-gray-50 dark:bg-gray-800 border dark:border-gray-700"}`}>
                  <div className="font-semibold text-fuchsia-700 dark:text-fuchsia-300 mb-1">B — {bVoters.length} {bVoters.length>aVoters.length?"✅":""}</div>
                  <div className="text-gray-700 dark:text-gray-300">{q.b}</div>
                  <div className="text-gray-500 dark:text-gray-400 mt-1">{bVoters.join(", ")}</div>
                </div>
              </div>
            </div>
            {isHost ? (
              <div className="flex gap-3">
                <button onClick={next} className="flex-1 rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium">
                  Next Question →
                </button>
                <button onClick={finish} className="rounded-2xl px-4 py-2.5 border dark:border-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1">
                  <RotateCcw className="w-4 h-4"/> End
                </button>
              </div>
            ) : (
              <div className="text-center text-xs text-gray-400 dark:text-gray-500">Waiting for host to continue…</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}