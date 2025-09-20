import { useEffect, useMemo, useState } from "react";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { Sparkles, Heart, SkipForward, Check, RotateCcw } from "lucide-react";
import { useAuth } from '../context/AuthContext';
type Props = {
  couple?: [string, string];
  category?: "Romantic" | "Playful" | "Spicy" | "Challenge";
  onFinish: (res: GameResult) => void;
};

export default function TruthDareRomantic({ couple, category = "Romantic", onFinish }: Props) {
  const [pIdx, setPIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [step, setStep] = useState<"choose" | "prompt">("choose");
  const [type, setType] = useState<"truth" | "dare" | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [skips, setSkips] = useState(2);
  const [completed, setCompleted] = useState(0);

  const [truths, setTruths] = useState<string[]>([]);
  const [dares, setDares] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
    const { user } = useAuth();

  const players = useMemo<[string, string]>(() => couple ?? [user?.name ?? "You", "Partner"], [couple, user?.name]);

  async function fetchBatch() {
    try {
      setLoading(true);
      setErr(null);
      const { data } = await api.post('/ai/truth-dare', {
        category: "Romantic",
        tone: "PG-13",
        count_truths: 12,
        count_dares: 12,
        names: [user?.name ?? "You", "Partner"],     // optional
        personalize: true             // set false for better cache hit rate
        });
      if (Array.isArray(data.truths)) setTruths((t) => [...t, ...data.truths]);
      if (Array.isArray(data.dares)) setDares((d) => [...d, ...data.dares]);
    } catch (e: any) {
      setErr(e.message || "Could not fetch prompts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBatch(); /* first batch */ }, [category]);

  function draw(kind: "truth" | "dare") {
    const src = kind === "truth" ? truths : dares;
    if (src.length === 0) return null;
    const p = src[0];
    if (kind === "truth") setTruths(src.slice(1));
    else setDares(src.slice(1));
    // top-up when low
    const low = kind === "truth" ? truths.length : dares.length;
    if (low < 3 && !loading) fetchBatch();
    return p;
  }

  function nextPrompt(kind: "truth" | "dare") {
    const p = draw(kind);
    if (!p) {
      setErr("Fetching more prompts…");
      fetchBatch();
      return;
    }
    setPrompt(p);
    setType(kind);
    setStep("prompt");
  }

  function onSkip() {
    if (skips <= 0 || !type) return;
    setSkips((s) => s - 1);
    nextPrompt(type);
  }

  function onComplete() {
    setCompleted((c) => c + 1);
    setPIdx((i) => (i === 0 ? 1 : 0));
    setRound((r) => r + 1);
    setStep("choose");
    setType(null);
    setPrompt("");
  }

  function finishNow() {
    onFinish({ xpEarned: completed * 20, rounds: round - 1, skipped: 2 - skips });
  }
  function restart() {
    setPIdx(0); setRound(1); setStep("choose"); setType(null); setPrompt(""); setSkips(2); setCompleted(0);
  }

  return (
    <div className="space-y-4">
      {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}
      {loading && truths.length + dares.length === 0 && (
        <div className="text-sm text-gray-600">Getting sweet prompts…</div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Round <b className="text-gray-900">{round}</b> • Turn: <b className="text-gray-900">{players[pIdx]}</b></div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full border">Skips: {skips}</span>
          <span className="px-2 py-1 rounded-full border">Done: {completed}</span>
        </div>
      </div>

      {step === "choose" && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => nextPrompt("truth")} className="rounded-2xl border p-5 hover:bg-gray-50 text-left">
            <div className="h-10 w-10 rounded-xl bg-rose-100 grid place-items-center text-rose-600 mb-2">
              <Heart className="w-5 h-5" />
            </div>
            <div className="font-medium text-gray-900">Truth</div>
            <div className="text-xs text-gray-500">A heartfelt question to open up.</div>
          </button>
          <button onClick={() => nextPrompt("dare")} className="rounded-2xl border p-5 hover:bg-gray-50 text-left">
            <div className="h-10 w-10 rounded-xl bg-fuchsia-100 grid place-items-center text-fuchsia-600 mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="font-medium text-gray-900">Dare</div>
            <div className="text-xs text-gray-500">A sweet action to do together.</div>
          </button>
        </div>
      )}

      {step === "prompt" && (
        <div className="rounded-2xl border p-5">
          <div className="text-xs text-gray-500 mb-1 capitalize">{type}</div>
          <div className="text-gray-900 font-medium">{prompt}</div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={onComplete} className="rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm inline-flex items-center gap-2">
              <Check className="w-4 h-4" /> Complete
            </button>
            <button onClick={onSkip} disabled={skips <= 0} className="rounded-xl px-3 py-2 border hover:bg-gray-50 text-sm inline-flex items-center gap-2 disabled:opacity-50">
              <SkipForward className="w-4 h-4" /> Skip
            </button>
            <button onClick={() => nextPrompt(type!)} className="rounded-xl px-3 py-2 border hover:bg-gray-50 text-sm">New prompt</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={restart} className="text-sm text-gray-600 inline-flex items-center gap-1 hover:text-gray-800">
          <RotateCcw className="w-4 h-4" /> Restart
        </button>
        <button onClick={finishNow} className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm">
          Finish Game
        </button>
      </div>
    </div>
  );
}
