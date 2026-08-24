import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../libs/axios";
import type { GameResult } from "./types";
import { Clock, Eye, EyeOff, SkipForward, RotateCcw, Users, Sparkles } from "lucide-react";

type Card = { title: string; hint?: string | null; taboo: string[]; category?: string; difficulty?: string };

/*
  Sync (lobby mode): when `isHost` is passed, the host is the sole authority
  over the round — it draws cards, runs the timer, and computes scores,
  broadcasting a full snapshot via onStateChange after every change (same
  pattern as HotSeat/WouldYouRather/GroupDareDice/TriviaDuoVsDuo). Non-host
  clients render the broadcast snapshot and forward Guessed!/Skip taps via
  onGuess/onSkip for the host to apply. The "reveal" peek stays a local,
  per-device toggle (not synced) — same honor-system as the original
  pass-the-phone version. With no sync props (standalone/GameRunner usage),
  isHost defaults to true and the component behaves exactly as before.
*/

type CharadesSyncState = {
  roundIndex: number;
  teamTurn: "A" | "B";
  running: boolean;
  skipsLeft: number;
  current: Card | null;
  remain: number;
  scoreA: number;
  scoreB: number;
  totalCorrect: number;
  totalSkips: number;
};

type SyncProps = {
  isHost?: boolean;
  remoteState?: any; // CharadesSyncState fields, plus optional _incomingGuess / _incomingSkip
  onStateChange?: (state: CharadesSyncState) => void;
  onGuess?: () => void;
  onSkip?: () => void;
};

export default function CharadesAI({
  couple,
  secondsPerRound = 60,
  roundsPerTeam = 3,
  category = "General",
  difficulty = "Easy",
  onFinish,
  isHost: isHostProp,
  remoteState,
  onStateChange,
  onGuess,
  onSkip,
}: SyncProps & {
  couple?: [string, string];
  secondsPerRound?: number;
  roundsPerTeam?: number;
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  onFinish: (res: GameResult) => void;
}) {
  const isHost = isHostProp ?? true;
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
  const [revealed, setRevealed] = useState(false); // local per-device peek — not synced
  const [skipsLeft, setSkipsLeft] = useState(2);
  const [current, setCurrent] = useState<Card | null>(null);

  // Timer
  const [remain, setRemain] = useState(secondsPerRound);
  const finishedRef = useRef(false);

  // Scoring
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalSkips, setTotalSkips] = useState(0);
  const [used, setUsed] = useState<string[]>([]);

  function pushState(snapshot: CharadesSyncState) {
    if (isHost) onStateChange?.(snapshot);
  }

  // Mirrors all synced fields after every render. The 1s timer interval below
  // is a long-lived closure that only reruns when [isHost, running, roundIndex]
  // change — guessing/skipping mid-round changes other fields without
  // touching those, so the interval's own closure (and onRoundEnd, which it
  // calls) would otherwise read/broadcast stale values. Reading through this
  // ref (updated post-render, well before the next 1s tick) keeps it accurate.
  const stateRef = useRef<CharadesSyncState>({
    roundIndex, teamTurn, running, skipsLeft, current, remain,
    scoreA, scoreB, totalCorrect, totalSkips,
  });
  useEffect(() => {
    stateRef.current = {
      roundIndex, teamTurn, running, skipsLeft, current, remain,
      scoreA, scoreB, totalCorrect, totalSkips,
    };
  });

  useEffect(() => {
    if (!isHost || !running) return;
    const id = setInterval(() => {
      setRemain((t) => {
        if (t <= 1) { clearInterval(id); onRoundEnd(); return 0; }
        const next = t - 1;
        pushState({ ...stateRef.current, remain: next });
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, running, roundIndex]);

  // ── Non-host: apply broadcast snapshots from host ─────────────────────────
  useEffect(() => {
    if (isHost || !remoteState) return;
    if (remoteState.roundIndex !== undefined) setRoundIndex(remoteState.roundIndex);
    if (remoteState.teamTurn !== undefined) setTeamTurn(remoteState.teamTurn);
    if (remoteState.running !== undefined) setRunning(remoteState.running);
    if (remoteState.skipsLeft !== undefined) setSkipsLeft(remoteState.skipsLeft);
    if (remoteState.current !== undefined) { setCurrent(remoteState.current); setRevealed(false); }
    if (remoteState.remain !== undefined) setRemain(remoteState.remain);
    if (remoteState.scoreA !== undefined) setScoreA(remoteState.scoreA);
    if (remoteState.scoreB !== undefined) setScoreB(remoteState.scoreB);
    if (remoteState.totalCorrect !== undefined) setTotalCorrect(remoteState.totalCorrect);
    if (remoteState.totalSkips !== undefined) setTotalSkips(remoteState.totalSkips);
  }, [remoteState, isHost]);

  // ── Host: apply guess/skip actions forwarded by non-host players ──────────
  // These _incoming* keys persist on remoteState (merged, never cleared), so
  // dedupe by seq — otherwise a later unrelated state update would re-fire
  // this effect and silently replay a stale guess/skip.
  const lastGuessSeq = useRef(0);
  const lastSkipSeq = useRef(0);
  useEffect(() => {
    if (!isHost || !remoteState) return;
    if (remoteState._incomingGuess && remoteState._incomingGuess.seq !== lastGuessSeq.current) {
      lastGuessSeq.current = remoteState._incomingGuess.seq;
      onGuessHost();
    }
    if (remoteState._incomingSkip && remoteState._incomingSkip.seq !== lastSkipSeq.current) {
      lastSkipSeq.current = remoteState._incomingSkip.seq;
      onSkipHost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteState, isHost]);

  function onRoundEnd() {
    if (!isHost) return;
    const s = stateRef.current;
    setRunning(false);
    setCurrent(null);
    if (s.roundIndex >= totalRounds) {
      pushState({ ...s, running: false, current: null, remain: 0 });
      finishNow();
      return;
    }
    // next team & next round
    const nextTeam = s.teamTurn === "A" ? "B" : "A";
    const nextRound = s.roundIndex + 1;
    setTeamTurn(nextTeam);
    setRoundIndex(nextRound);
    setRemain(secondsPerRound);
    setSkipsLeft(2);
    pushState({
      ...s, roundIndex: nextRound, teamTurn: nextTeam, running: false, skipsLeft: 2, current: null,
      remain: secondsPerRound,
    });
  }

  async function fetchCards(n=24) {
    if (!isHost) return;
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
  useEffect(()=>{ if (isHost) fetchCards(24); }, [isHost, category, difficulty]);

  function drawCard(): Card | null {
    if (pool.length === 0) { fetchCards(16); return null; }
    const c = pool[0];
    setPool((p)=> p.slice(1));
    if (pool.length < 4 && !loading) fetchCards(16);
    return c;
  }

  function startRound() {
    if (!isHost) return;
    const card = drawCard();
    setRemain(secondsPerRound);
    setSkipsLeft(2);
    setRevealed(false);
    setCurrent(card);
    setRunning(true);
    pushState({
      ...stateRef.current, running: true, skipsLeft: 2, current: card, remain: secondsPerRound,
    });
  }

  // Reached via the _incomingGuess effect (fresh) or a direct host click
  // (fresh) — but reads from stateRef.current anyway for consistency with
  // the other host mutators, and because it's called synchronously from
  // onGuessTap without its own render in between.
  function onGuessHost() {
    const s = stateRef.current;
    if (!s.running || !s.current) return;
    const newScoreA = s.teamTurn === "A" ? s.scoreA + 1 : s.scoreA;
    const newScoreB = s.teamTurn === "B" ? s.scoreB + 1 : s.scoreB;
    const newTotalCorrect = s.totalCorrect + 1;
    setScoreA(newScoreA); setScoreB(newScoreB);
    setTotalCorrect(newTotalCorrect);
    setUsed((u)=> [...u, s.current!.title]);
    const next = drawCard();
    setCurrent(next);
    pushState({
      ...s, current: next,
      scoreA: newScoreA, scoreB: newScoreB, totalCorrect: newTotalCorrect,
    });
  }

  function onSkipHost() {
    const s = stateRef.current;
    if (!s.running || s.skipsLeft <= 0) return;
    const newSkipsLeft = s.skipsLeft - 1;
    const newTotalSkips = s.totalSkips + 1;
    setSkipsLeft(newSkipsLeft);
    setTotalSkips(newTotalSkips);
    const next = drawCard();
    setCurrent(next);
    pushState({
      ...s, current: next, skipsLeft: newSkipsLeft, totalSkips: newTotalSkips,
    });
  }

  function onGuessTap() {
    if (!revealed) return;
    if (isHost) { onGuessHost(); return; }
    onGuess?.();
  }

  function onSkipTap() {
    if (skipsLeft <= 0) return;
    if (isHost) { onSkipHost(); return; }
    onSkip?.();
  }

  function restartGame() {
    if (!isHost) return;
    setScoreA(0); setScoreB(0);
    setTotalCorrect(0); setTotalSkips(0);
    setUsed([]); setRoundIndex(1); setTeamTurn("A");
    setRunning(false); setRemain(secondsPerRound); setSkipsLeft(2);
    setCurrent(null); setRevealed(false);
    pushState({
      roundIndex: 1, teamTurn: "A", running: false, skipsLeft: 2, current: null,
      remain: secondsPerRound, scoreA: 0, scoreB: 0, totalCorrect: 0, totalSkips: 0,
    });
  }

  function finishNow() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const s = stateRef.current;
    const rounds = s.roundIndex; // how many timed rounds were run
    const xp = Math.max(20, s.totalCorrect * 12);
    onFinish({
      xpEarned: xp,
      rounds,
      skipped: s.totalSkips,
      meta: {
        teamA: { score: s.scoreA }, teamB: { score: s.scoreB },
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
      {err && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">{err}</div>}

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl border dark:border-gray-800 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">{teams.A}</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{scoreA}</div>
        </div>
        <div className="rounded-2xl border dark:border-gray-800 p-3 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-fuchsia-600"/><span className="font-medium tabular-nums">{mm}:{ss}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Round {roundIndex}/{totalRounds} • Turn: {teamTurn}</span>
        </div>
        <div className="rounded-2xl border dark:border-gray-800 p-3 text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">{teams.B}</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{scoreB}</div>
        </div>
      </div>

      {/* Card zone */}
      <div className="rounded-2xl border dark:border-gray-800 p-5">
        {!running ? (
          <div className="text-center space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
              <Users className="w-4 h-4"/><span>Pass the phone to <b className="text-gray-900 dark:text-gray-100">{teamTurn}</b></span>
            </div>
            {isHost ? (
              <button
                onClick={startRound}
                disabled={loading}
                className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
              >
                {roundIndex === 1 ? "Start Game" : "Start Round"}
              </button>
            ) : (
              <div className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">Waiting for host to start the round…</div>
            )}
            {loading && <div className="text-xs text-gray-500 dark:text-gray-400">Loading prompts…</div>}
          </div>
        ) : !current ? (
          <div className="grid place-items-center h-28 text-sm text-gray-500 dark:text-gray-400">Fetching a new card…</div>
        ) : (
          <>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
              {current.category || category} • {current.difficulty || difficulty}
            </div>

            {/* Hide/reveal so guessers can't see */}
            <div className="rounded-xl border dark:border-gray-800 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">Actor taps Reveal to view the card.</div>
                <button
                  onClick={()=> setRevealed(r => !r)}
                  className="text-xs rounded-lg border dark:border-gray-700 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1"
                >
                  {revealed ? <><EyeOff className="w-4 h-4"/>Hide</> : <><Eye className="w-4 h-4"/>Reveal</>}
                </button>
              </div>

              {revealed ? (
                <div className="mt-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-lg">{current.title}</div>
                  {current.hint && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hint: {current.hint}</div>}
                  {current.taboo.length > 0 && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                      Taboo: {current.taboo.join(" • ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-20 grid place-items-center text-3xl text-gray-300 dark:text-gray-600">
                  <Sparkles className="w-7 h-7"/>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={onGuessTap}
                disabled={!revealed}
                className="rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm disabled:opacity-50"
              >
                Guessed!
              </button>
              <button
                onClick={onSkipTap}
                disabled={skipsLeft<=0}
                className="rounded-xl px-3 py-2 border dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <SkipForward className="w-4 h-4"/> Skip ({skipsLeft})
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">No talking • gestures only</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {isHost && (
        <div className="flex items-center justify-between pt-2">
          <button onClick={restartGame} className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-200">
            <RotateCcw className="w-4 h-4"/> Restart
          </button>
          <button onClick={finishNow} className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm">
            Finish & Save
          </button>
        </div>
      )}
    </div>
  );
}
