import { useEffect, useMemo, useRef, useState } from "react";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { Clock, ChevronRight, Check, X, RotateCcw, Bolt } from "lucide-react";

/*
  Trivia Night: Duo vs Duo
  - Two teams (A & B), buzz-in to answer
  - 30s question timer; wrong answer locks out buzzing team and passes to other team (with remaining time)
  - +10 correct, -5 wrong (no negative total)
  - Ends after N questions or manual finish; saves history via onFinish
*/

type TriviaQ = {
  question: string;
  options: string[];      // 4 items
  correctIndex: number;   // 0..3
  category?: string;
  difficulty?: string;
};

export default function TriviaDuoVsDuo({
  couple,
  count = 10,
  secondsPerQ = 30,
  category = "General",
  difficulty = "Medium",
  onFinish,
}: {
  couple?: [string, string];
  count?: number;
  secondsPerQ?: number;
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  onFinish: (res: GameResult) => void;
}) {
  // players are only for flavor in header
  const players = useMemo<[string, string]>(() => couple ?? ["You", "Partner"], [couple]);

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

  // fetch questions
  useEffect(() => {
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
      } catch (e: any) {
        setErr(e.message || "Could not fetch trivia");
      } finally {
        setLoading(false);
      }
    })();
  }, [category, difficulty, count, secondsPerQ]);

  // 1s timer
  useEffect(() => {
    if (!running) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // time up: reveal and move on
          clearInterval(timerRef.current!);
          timerRef.current = null;
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [running, idx]);

  function handleTimeUp() {
    setRunning(false);
    // No score change; just show correct briefly then next
    setLocked(true);
    setTimeout(nextQuestion, 900);
  }

  function buzz(team: "A" | "B") {
    if (!running || locked || buzzedBy) return;
    setBuzzedBy(team);
  }

  function answer(i: number) {
    if (!buzzedBy || locked) return;
    const q = qs[idx];
    const correct = i === q.correctIndex;
    setRevealed(i);
    setLocked(true);

    if (correct) {
      if (buzzedBy === "A") {
        setScoreA((s) => s + 10);
        setCorrectA((n) => n + 1);
      } else {
        setScoreB((s) => s + 10);
        setCorrectB((n) => n + 1);
      }
      // next after short delay
      setTimeout(nextQuestion, 900);
    } else {
      // penalize and pass to other team with remaining time
      if (buzzedBy === "A") {
        setScoreA((s) => Math.max(0, s - 5));
        setWrongA((n) => n + 1);
        setBuzzedBy("B");
      } else {
        setScoreB((s) => Math.max(0, s - 5));
        setWrongB((n) => n + 1);
        setBuzzedBy("A");
      }
      setLocked(false);
      setRevealed(null);
    }
  }

  function nextQuestion() {
    const next = idx + 1;
    setAsked((n) => n + 1);
    if (next >= qs.length) {
      finishNow();
      return;
    }
    setIdx(next);
    setTimeLeft(secondsPerQ);
    setRunning(true);
    setBuzzedBy(null);
    setLocked(false);
    setRevealed(null);
  }

  function restart() {
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
  }

  function finishNow() {
    const rounds = asked;
    const xp = Math.max(20, (correctA + correctB) * 15 + (scoreA + scoreB) / 2);
    onFinish({
      xpEarned: Math.round(xp),
      rounds,
      skipped: 0,
      meta: {
        teamA: { score: scoreA, correct: correctA, wrong: wrongA },
        teamB: { score: scoreB, correct: correctB, wrong: wrongB },
        totalQuestions: qs.length,
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
                onClick={finishNow}
                className="ml-auto rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm inline-flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Finish & Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
