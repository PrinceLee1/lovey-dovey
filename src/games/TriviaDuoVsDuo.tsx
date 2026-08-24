import { useEffect, useRef, useState } from "react";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { Clock, ChevronRight, Check, RotateCcw, Bolt } from "lucide-react";

/*
  Trivia Night: Duo vs Duo
  - Two teams (A & B), buzz-in to answer
  - 30s question timer; wrong answer locks out buzzing team and passes to other team (with remaining time)
  - +10 correct, -5 wrong (no negative total)
  - Ends after N questions or manual finish; saves history via onFinish

  Sync (lobby mode): when `isHost` is passed, the host fetches the question
  set and is the sole authority over timer/score/buzz state, broadcasting a
  full snapshot via onStateChange after every change (same pattern as
  HotSeat/WouldYouRather/GroupDareDice). Non-host clients render the
  broadcast snapshot and forward buzz/answer taps via onBuzz/onAnswer for
  the host to apply. With no sync props (standalone/GameRunner usage),
  isHost defaults to true and the component behaves exactly as before.
*/

type TriviaQ = {
  question: string;
  options: string[];      // 4 items
  correctIndex: number;   // 0..3
  category?: string;
  difficulty?: string;
};

type TriviaSyncState = {
  qs: TriviaQ[];
  idx: number;
  timeLeft: number;
  running: boolean;
  buzzedBy: "A" | "B" | null;
  locked: boolean;
  revealed: number | null;
  scoreA: number;
  scoreB: number;
  correctA: number;
  correctB: number;
  wrongA: number;
  wrongB: number;
  asked: number;
};

type SyncProps = {
  isHost?: boolean;
  remoteState?: any; // TriviaSyncState fields, plus optional _incomingBuzz / _incomingAnswer
  onStateChange?: (state: TriviaSyncState) => void;
  onBuzz?: (team: "A" | "B") => void;
  onAnswer?: (idx: number) => void;
};

type Props = SyncProps & {
  couple?: [string, string];
  count?: number;
  secondsPerQ?: number;
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  onFinish: (res: GameResult) => void;
};

export default function TriviaDuoVsDuo({
  count = 10,
  secondsPerQ = 30,
  category = "General",
  difficulty = "Medium",
  onFinish,
  isHost: isHostProp,
  remoteState,
  onStateChange,
  onBuzz,
  onAnswer,
}: Props) {
  // If isHost not passed (standalone mode), this device is the sole authority.
  const isHost = isHostProp ?? true;

  // questions
  const [qs, setQs] = useState<TriviaQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // timer
  const [timeLeft, setTimeLeft] = useState<number>(secondsPerQ);
  const [running, setRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // buzzing & answer state
  const [buzzedBy, setBuzzedBy] = useState<"A" | "B" | null>(null);
  const [locked, setLocked] = useState<boolean>(false); // lock after answer reveal
  const [revealed, setRevealed] = useState<number | null>(null); // chosen option index

  // scoring
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [correctA, setCorrectA] = useState(0);
  const [correctB, setCorrectB] = useState(0);
  const [wrongA, setWrongA] = useState(0);
  const [wrongB, setWrongB] = useState(0);

  // per-round stats
  const [asked, setAsked] = useState(0);

  // host: broadcast a full state snapshot (never a partial merge, to avoid stale patches)
  function pushState(snapshot: TriviaSyncState) {
    if (isHost) onStateChange?.(snapshot);
  }

  // Mirrors all synced fields after every render. The 1s timer interval below
  // is a long-lived closure that only reruns when [isHost, running, idx]
  // change — buzzing/answering mid-question changes other fields without
  // touching those, so the interval's own closure would otherwise broadcast
  // stale values on the next tick. Reading through this ref (updated post-
  // render, well before the next 1s tick) keeps that broadcast accurate.
  const stateRef = useRef<TriviaSyncState>({
    qs, idx, timeLeft, running, buzzedBy, locked, revealed,
    scoreA, scoreB, correctA, correctB, wrongA, wrongB, asked,
  });
  useEffect(() => {
    stateRef.current = {
      qs, idx, timeLeft, running, buzzedBy, locked, revealed,
      scoreA, scoreB, correctA, correctB, wrongA, wrongB, asked,
    };
  });

  // fetch questions (host only — non-host receives the set via broadcast)
  useEffect(() => {
    if (!isHost) return;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const { data } = await api.post("/ai/trivia", {
          category,
          difficulty,
          count: Math.max(6, count),
          personalize: false,
        });
        const got: TriviaQ[] = Array.isArray(data.questions) ? data.questions : [];
        // shuffle and take first N
        const shuffled = got.sort(() => Math.random() - 0.5).slice(0, count);
        setQs(shuffled);
        setIdx(0);
        setTimeLeft(secondsPerQ);
        setRunning(true);
        setAsked(0);
        setBuzzedBy(null);
        setLocked(false);
        setRevealed(null);
        pushState({
          qs: shuffled, idx: 0, timeLeft: secondsPerQ, running: true,
          buzzedBy: null, locked: false, revealed: null,
          scoreA: 0, scoreB: 0, correctA: 0, correctB: 0, wrongA: 0, wrongB: 0, asked: 0,
        });
      } catch (e: any) {
        setErr(e.message || "Could not fetch trivia");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, category, difficulty, count, secondsPerQ]);

  // ── Non-host: apply broadcast snapshots from host ─────────────────────────
  useEffect(() => {
    if (isHost || !remoteState) return;
    if (remoteState.qs !== undefined) { setQs(remoteState.qs); setLoading(false); }
    if (remoteState.idx !== undefined) setIdx(remoteState.idx);
    if (remoteState.timeLeft !== undefined) setTimeLeft(remoteState.timeLeft);
    if (remoteState.running !== undefined) setRunning(remoteState.running);
    if (remoteState.buzzedBy !== undefined) setBuzzedBy(remoteState.buzzedBy);
    if (remoteState.locked !== undefined) setLocked(remoteState.locked);
    if (remoteState.revealed !== undefined) setRevealed(remoteState.revealed);
    if (remoteState.scoreA !== undefined) setScoreA(remoteState.scoreA);
    if (remoteState.scoreB !== undefined) setScoreB(remoteState.scoreB);
    if (remoteState.correctA !== undefined) setCorrectA(remoteState.correctA);
    if (remoteState.correctB !== undefined) setCorrectB(remoteState.correctB);
    if (remoteState.wrongA !== undefined) setWrongA(remoteState.wrongA);
    if (remoteState.wrongB !== undefined) setWrongB(remoteState.wrongB);
    if (remoteState.asked !== undefined) setAsked(remoteState.asked);
  }, [remoteState, isHost]);

  // ── Host: apply buzz/answer actions forwarded by non-host players ─────────
  // These _incoming* keys persist on remoteState (merged, never cleared), so
  // dedupe by seq — otherwise a later unrelated state update would re-fire
  // this effect and silently replay a stale buzz/answer.
  const lastBuzzSeq = useRef(0);
  const lastAnswerSeq = useRef(0);
  useEffect(() => {
    if (!isHost || !remoteState) return;
    if (remoteState._incomingBuzz && remoteState._incomingBuzz.seq !== lastBuzzSeq.current) {
      lastBuzzSeq.current = remoteState._incomingBuzz.seq;
      buzz(remoteState._incomingBuzz.team);
    }
    if (remoteState._incomingAnswer && remoteState._incomingAnswer.seq !== lastAnswerSeq.current) {
      lastAnswerSeq.current = remoteState._incomingAnswer.seq;
      answer(remoteState._incomingAnswer.idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteState, isHost]);

  // 1s timer (host only — non-host renders the broadcast timeLeft)
  useEffect(() => {
    if (!isHost || !running) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // time up: reveal and move on
          clearInterval(timerRef.current!);
          timerRef.current = null;
          handleTimeUp();
          return 0;
        }
        const next = t - 1;
        pushState({ ...stateRef.current, timeLeft: next });
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, running, idx]);

  function handleTimeUp() {
    setRunning(false);
    // No score change; just show correct briefly then next
    setLocked(true);
    pushState({ ...stateRef.current, timeLeft: 0, running: false, locked: true });
    setTimeout(nextQuestion, 900);
  }

  // Any connected player may buzz/answer (teams aren't bound to specific
  // devices) — non-host taps are forwarded to the host, which applies them
  // authoritatively via the _incomingBuzz/_incomingAnswer effect above.
  //
  // These host functions can run well after the click that triggered them
  // (buzz/answer forwarded via an effect, nextQuestion via setTimeout), so
  // they read their baseline from stateRef.current — never from the
  // destructured useState variables above, which may be stale by the time
  // a delayed call actually runs.
  function buzz(team: "A" | "B") {
    if (!isHost) {
      if (!running || locked || buzzedBy) return;
      onBuzz?.(team);
      setBuzzedBy(team); // optimistic
      return;
    }
    const s = stateRef.current;
    if (!s.running || s.locked || s.buzzedBy) return;
    setBuzzedBy(team);
    pushState({ ...s, buzzedBy: team });
  }

  function answer(i: number) {
    if (!isHost) {
      if (!buzzedBy || locked) return;
      onAnswer?.(i);
      setRevealed(i); // optimistic — host's broadcast will confirm/correct
      return;
    }
    const s = stateRef.current;
    if (!s.buzzedBy || s.locked) return;
    const q = s.qs[s.idx];
    if (!q) return;
    const correct = i === q.correctIndex;
    setRevealed(i);
    setLocked(true);

    if (correct) {
      const newScoreA = s.buzzedBy === "A" ? s.scoreA + 10 : s.scoreA;
      const newScoreB = s.buzzedBy === "B" ? s.scoreB + 10 : s.scoreB;
      const newCorrectA = s.buzzedBy === "A" ? s.correctA + 1 : s.correctA;
      const newCorrectB = s.buzzedBy === "B" ? s.correctB + 1 : s.correctB;
      setScoreA(newScoreA); setScoreB(newScoreB);
      setCorrectA(newCorrectA); setCorrectB(newCorrectB);
      pushState({
        ...s, locked: true, revealed: i,
        scoreA: newScoreA, scoreB: newScoreB, correctA: newCorrectA, correctB: newCorrectB,
      });
      setTimeout(nextQuestion, 900);
    } else {
      // penalize and pass to other team with remaining time
      const otherTeam = s.buzzedBy === "A" ? "B" : "A";
      const newScoreA = s.buzzedBy === "A" ? Math.max(0, s.scoreA - 5) : s.scoreA;
      const newScoreB = s.buzzedBy === "B" ? Math.max(0, s.scoreB - 5) : s.scoreB;
      const newWrongA = s.buzzedBy === "A" ? s.wrongA + 1 : s.wrongA;
      const newWrongB = s.buzzedBy === "B" ? s.wrongB + 1 : s.wrongB;
      setScoreA(newScoreA); setScoreB(newScoreB);
      setWrongA(newWrongA); setWrongB(newWrongB);
      setBuzzedBy(otherTeam);
      setLocked(false);
      setRevealed(null);
      pushState({
        ...s, buzzedBy: otherTeam, locked: false, revealed: null,
        scoreA: newScoreA, scoreB: newScoreB, wrongA: newWrongA, wrongB: newWrongB,
      });
    }
  }

  function nextQuestion() {
    if (!isHost) return;
    const s = stateRef.current;
    const next = s.idx + 1;
    const newAsked = s.asked + 1;
    setAsked(newAsked);
    if (next >= s.qs.length) {
      finishNow(newAsked);
      return;
    }
    setIdx(next);
    setTimeLeft(secondsPerQ);
    setRunning(true);
    setBuzzedBy(null);
    setLocked(false);
    setRevealed(null);
    pushState({
      ...s, idx: next, timeLeft: secondsPerQ, running: true,
      buzzedBy: null, locked: false, revealed: null, asked: newAsked,
    });
  }

  function restart() {
    if (!isHost) return;
    // just re-trigger the effect by changing deps, or refetch
    setIdx(0);
    setTimeLeft(secondsPerQ);
    setRunning(true);
    setBuzzedBy(null);
    setLocked(false);
    setRevealed(null);
    setScoreA(0); setScoreB(0);
    setCorrectA(0); setCorrectB(0);
    setWrongA(0); setWrongB(0);
    setAsked(0);
    pushState({
      ...stateRef.current, idx: 0, timeLeft: secondsPerQ, running: true,
      buzzedBy: null, locked: false, revealed: null,
      scoreA: 0, scoreB: 0, correctA: 0, correctB: 0, wrongA: 0, wrongB: 0, asked: 0,
    });
  }

  // `askedOverride` covers the case where finishNow is called synchronously
  // from nextQuestion() right after setAsked(newAsked) — stateRef.current
  // won't reflect that increment until the next render's mirror effect runs.
  function finishNow(askedOverride?: number) {
    const s = stateRef.current;
    const rounds = askedOverride ?? s.asked;
    const xp = Math.max(20, (s.correctA + s.correctB) * 15 + (s.scoreA + s.scoreB) / 2);
    onFinish({
      xpEarned: Math.round(xp),
      rounds,
      skipped: 0,
      meta: {
        teamA: { score: s.scoreA, correct: s.correctA, wrong: s.wrongA },
        teamB: { score: s.scoreB, correct: s.correctB, wrong: s.wrongB },
        totalQuestions: s.qs.length,
        secondsPerQ,
      },
    });
  }

  const q = qs[idx];

  return (
    <div className="space-y-4">
      {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}
      {loading || !q ? (
        <div className="text-sm text-gray-600">Loading trivia…</div>
      ) : (
        <>
          {/* Scoreboard */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-gray-500">Team A</div>
              <div className="text-lg font-semibold text-gray-900">{scoreA}</div>
              <div className="text-[11px] text-gray-500">✅ {correctA} • ❌ {wrongA}</div>
            </div>
            <div className="rounded-2xl border p-3 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-fuchsia-600" />
                <span className="font-medium tabular-nums">{timeLeft}s</span>
              </div>
            </div>
            <div className="rounded-2xl border p-3 text-right">
              <div className="text-xs text-gray-500">Team B</div>
              <div className="text-lg font-semibold text-gray-900">{scoreB}</div>
              <div className="text-[11px] text-gray-500">✅ {correctB} • ❌ {wrongB}</div>
            </div>
          </div>

          {/* Buzzers */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => buzz("A")}
              disabled={!!buzzedBy || !running}
              className={`rounded-xl px-3 py-2 text-sm inline-flex items-center gap-1 border ${
                buzzedBy === "A" ? "bg-rose-50 border-rose-300 text-rose-700" : "hover:bg-gray-50"
              }`}
            >
              <Bolt className="w-4 h-4" /> Buzz A
            </button>
            <button
              onClick={() => buzz("B")}
              disabled={!!buzzedBy || !running}
              className={`rounded-xl px-3 py-2 text-sm inline-flex items-center gap-1 border ${
                buzzedBy === "B" ? "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700" : "hover:bg-gray-50"
              }`}
            >
              <Bolt className="w-4 h-4" /> Buzz B
            </button>
            <span className="text-xs text-gray-500">
              {buzzedBy ? `Answering: Team ${buzzedBy}` : "Buzz to answer"}
            </span>
          </div>

          {/* Question card */}
          <div className="rounded-2xl border p-5">
            <div className="text-[11px] text-gray-500 mb-1">
              {q.category || category} • {q.difficulty || difficulty} • Q{idx + 1} / {qs.length}
            </div>
            <div className="font-medium text-gray-900">{q.question}</div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              {q.options.map((opt, i) => {
                const isChosen = revealed === i;
                const isCorrect = i === q.correctIndex;
                const canClick = !!buzzedBy && !locked && running;
                const style =
                  revealed != null
                    ? isCorrect
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : isChosen
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "opacity-60"
                    : "hover:bg-gray-50";
                return (
                  <button
                    key={i}
                    onClick={() => (canClick ? answer(i) : undefined)}
                    className={`text-left rounded-xl border px-3 py-2 text-sm ${style}`}
                  >
                    <span className="inline-block w-5">{["A","B","C","D"][i]}</span>
                    <span className="ml-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            {isHost && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={nextQuestion}
                  className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50 inline-flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={restart}
                  className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-4 h-4" /> Restart
                </button>
                <button
                  onClick={() => finishNow()}
                  className="ml-auto rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm inline-flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> Finish & Save
                </button>
              </div>
            )}
            {!isHost && (
              <div className="mt-4 text-center text-xs text-gray-400">Host controls Next / Restart / Finish…</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
