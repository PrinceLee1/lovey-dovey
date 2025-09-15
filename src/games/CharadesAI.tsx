import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../libs/axios";
import type { GameResult } from "./types";
import { Clock, Eye, EyeOff, SkipForward, RotateCcw, Users, Sparkles } from "lucide-react";

type Card = { title: string; hint?: string | null; taboo: string[]; category?: string; difficulty?: string };

export default function CharadesAI({
  couple,
  secondsPerRound = 60,
  roundsPerTeam = 3,
  category = "General",
  difficulty = "Easy",
  onFinish,
}: {
  couple?: [string, string];
  secondsPerRound?: number;
  roundsPerTeam?: number;
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  onFinish: (res: GameResult) => void;
}) {
  const teams = useMemo(() => ({ A: "Team A", B: "Team B" }), []);
  const players = useMemo<[string,string]>(() => couple ?? ["You","Partner"], [couple]);

  // Cards
  const [pool, setPool] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Round state
  const totalRounds = roundsPerTeam * 2;
  const [roundIndex, setRoundIndex] = useState(1); // 1..total
  const [teamTurn, setTeamTurn] = useState<"A"|"B">("A");
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [skipsLeft, setSkipsLeft] = useState(2);
  const [current, setCurrent] = useState<Card | null>(null);

  // Timer
  const [remain, setRemain] = useState(secondsPerRound);
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemain((t) => {
        if (t <= 1) { clearInterval(id); onRoundEnd(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, roundIndex]);

  function onRoundEnd() {
    setRunning(false);
    setRevealed(false);
    setCurrent(null);
    if (roundIndex >= totalRounds) { finishNow(); return; }
    // next team & next round
    setTeamTurn((t)=> t==="A" ? "B" : "A");
    setRoundIndex((r)=> r + 1);
    setRemain(secondsPerRound);
    setSkipsLeft(2);
  }

  async function fetchCards(n=24) {
    try {
      setLoading(true); setErr(null);
      const { data } = await api.post("/ai/charades", {
        category, difficulty, count: n, taboo_words: 2, personalize: false, names: players
      });
      if (Array.isArray(data.cards)) {
        setPool((p)=> [...p, ...data.cards]);
      }
    } catch (e:any) {
      setErr(e.message || "Could not load prompts");
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ fetchCards(24); }, [category, difficulty]);

  function drawCard(): Card | null {
    if (pool.length === 0) { fetchCards(16); return null; }
    const c = pool[0];
    setPool((p)=> p.slice(1));
    if (pool.length < 4 && !loading) fetchCards(16);
    return c;
  }

  // Scoring
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalSkips, setTotalSkips] = useState(0);
  const [used, setUsed] = useState<string[]>([]);

  function startRound() {
    setRemain(secondsPerRound);
    setSkipsLeft(2);
    setRevealed(false);
    setCurrent(drawCard());
    setRunning(true);
  }

  function onGuess() {
    if (!running || !current) return;
    // +1 and draw next card within same round
    if (teamTurn === "A") setScoreA((s)=> s + 1); else setScoreB((s)=> s + 1);
    setTotalCorrect((n)=> n + 1);
    setUsed((u)=> [...u, current.title]);
    setCurrent(drawCard());
    setRevealed(false);
  }

  function onSkip() {
    if (!running || skipsLeft <= 0) return;
    setSkipsLeft((k)=> k - 1);
    setTotalSkips((n)=> n + 1);
    setCurrent(drawCard());
    setRevealed(false);
  }

  function restartGame() {
    setScoreA(0); setScoreB(0);
    setTotalCorrect(0); setTotalSkips(0);
    setUsed([]); setRoundIndex(1); setTeamTurn("A");
    setRunning(false); setRemain(secondsPerRound); setSkipsLeft(2);
    setCurrent(null); setRevealed(false);
  }

  function finishNow() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const rounds = roundIndex; // how many timed rounds were run
    const xp = Math.max(20, totalCorrect * 12);
    onFinish({
      xpEarned: xp,
      rounds,
      skipped: totalSkips,
      meta: {
        teamA: { score: scoreA }, teamB: { score: scoreB },
        secondsPerRound, roundsPerTeam,
        usedTitles: used,
        category, difficulty,
      }
    });
  }

  const mm = Math.floor(remain / 60);
  const ss = String(remain % 60).padStart(2,"0");

  return (
    <div className="space-y-4">
      {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-gray-500">{teams.A}</div>
          <div className="text-lg font-semibold text-gray-900">{scoreA}</div>
        </div>
        <div className="rounded-2xl border p-3 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-fuchsia-600"/><span className="font-medium tabular-nums">{mm}:{ss}</span>
          <span className="text-xs text-gray-500 ml-2">Round {roundIndex}/{totalRounds} • Turn: {teamTurn}</span>
        </div>
        <div className="rounded-2xl border p-3 text-right">
          <div className="text-xs text-gray-500">{teams.B}</div>
          <div className="text-lg font-semibold text-gray-900">{scoreB}</div>
        </div>
      </div>

      {/* Card zone */}
      <div className="rounded-2xl border p-5">
        {!running ? (
          <div className="text-center space-y-3">
            <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <Users className="w-4 h-4"/><span>Pass the phone to <b className="text-gray-900">{teamTurn}</b></span>
            </div>
            <button
              onClick={startRound}
              disabled={loading}
              className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
            >
              {roundIndex === 1 ? "Start Game" : "Start Round"}
            </button>
            {loading && <div className="text-xs text-gray-500">Loading prompts…</div>}
          </div>
        ) : !current ? (
          <div className="grid place-items-center h-28 text-sm text-gray-500">Fetching a new card…</div>
        ) : (
          <>
            <div className="text-[11px] text-gray-500 mb-1">
              {current.category || category} • {current.difficulty || difficulty}
            </div>

            {/* Hide/reveal so guessers can't see */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Actor taps Reveal to view the card.</div>
                <button
                  onClick={()=> setRevealed(r => !r)}
                  className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50 inline-flex items-center gap-1"
                >
                  {revealed ? <><EyeOff className="w-4 h-4"/>Hide</> : <><Eye className="w-4 h-4"/>Reveal</>}
                </button>
              </div>

              {revealed ? (
                <div className="mt-3">
                  <div className="font-medium text-gray-900 text-lg">{current.title}</div>
                  {current.hint && <div className="text-xs text-gray-500 mt-1">Hint: {current.hint}</div>}
                  {current.taboo.length > 0 && (
                    <div className="text-[11px] text-gray-500 mt-2">
                      Taboo: {current.taboo.join(" • ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-20 grid place-items-center text-3xl text-gray-300">
                  <Sparkles className="w-7 h-7"/>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={onGuess}
                disabled={!revealed}
                className="rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm disabled:opacity-50"
              >
                Guessed!
              </button>
              <button
                onClick={onSkip}
                disabled={skipsLeft<=0}
                className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <SkipForward className="w-4 h-4"/> Skip ({skipsLeft})
              </button>
              <span className="text-xs text-gray-500 ml-auto">No talking • gestures only</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={restartGame} className="text-sm text-gray-600 inline-flex items-center gap-1 hover:text-gray-800">
          <RotateCcw className="w-4 h-4"/> Restart
        </button>
        <button onClick={finishNow} className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm">
          Finish & Save
        </button>
      </div>
    </div>
  );
}
