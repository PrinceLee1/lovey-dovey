import { useEffect, useMemo, useRef, useState } from "react";
import type { GameResult } from "./types";
import { Clock, Pause, Play as PlayIcon, Send, RotateCcw, Smile } from "lucide-react";

export default function EmojiChat({
  couple,
  minutes = 5,
  onFinish,
}: {
  couple?: [string, string];
  minutes?: number;
  onFinish: (res: GameResult) => void;
}) {
  const players = useMemo<[string, string]>(() => couple ?? ["You", "Partner"], [couple]);

  // TIMER ---------------------------------------------------------------
  const totalMs = Math.max(1, minutes) * 60 * 1000;
  const [remaining, setRemaining] = useState<number>(totalMs);
  const [running, setRunning] = useState<boolean>(true);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = Math.max(0, prev - 1000); // subtract exactly 1s per tick
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // auto-finish exactly once at 0
  useEffect(() => {
    if (remaining <= 0 && !finishedRef.current) {
      finishedRef.current = true;
      setRunning(false);
      finishNow(); // auto-save at 00:00
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${String(mm)}:${String(ss).padStart(2, "0")}`;
  const progress = Math.min(100, Math.max(0, Math.round(((totalMs - remaining) / totalMs) * 100)));

  // CHAT ----------------------------------------------------------------
  type Msg = { id: string; from: 0 | 1; text: string; t: number };
  const [messages, setMessages] = useState<Msg[]>([]);
  const [who, setWho] = useState<0 | 1>(0);
  const [text, setText] = useState("");
  const [warn, setWarn] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const palette = ["😍","😂","🔥","💃","🕺","🎉","😜","🤫","😉","❤️","💌","🌹","🥰","🤝","🎵","🍕","🍫","🧩","🌟","🌙"];

  function isEmojiOnly(s: string) {
    const trimmed = s.trim();
    if (!trimmed) return false;
    // reject letters/numbers from most scripts
    if (/\p{L}|\p{N}/u.test(trimmed)) return false;
    // must contain at least one emoji/pictograph
    return /\p{Extended_Pictographic}/u.test(trimmed);
  }

  function send() {
    const v = text;
    if (!isEmojiOnly(v)) {
      setWarn("Only emojis allowed — no letters or numbers!");
      setTimeout(() => setWarn(null), 1200);
      return;
    }
    const id = (crypto as any).randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    const msg: Msg = { id, from: who, text: v.trim(), t: Date.now() };
    setMessages((arr) => [...arr, msg]);
    setText("");
    setWho((w) => (w === 0 ? 1 : 0));
    setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 40);
    inputRef.current?.focus();
  }

  function resetGame() {
    setMessages([]);
    setRemaining(totalMs);
    setRunning(false);
    setWho(0);
    setWarn(null);
    setText("");
    finishedRef.current = false;
  }

  function topEmoji(msgs: Msg[]) {
    const freq = new Map<string, number>();
    msgs.forEach((m) => {
      for (const ch of Array.from(m.text)) freq.set(ch, (freq.get(ch) || 0) + 1);
    });
    let top = "", best = 0;
    freq.forEach((n, k) => { if (n > best) { best = n; top = k; } });
    return top;
  }

  function finishNow() {
    if (finishedRef.current) return; // guard double finish (manual + auto)
    finishedRef.current = true;
    const rounds = messages.length;
    const all = messages.map((m) => Array.from(m.text)).flat();
    const unique = Array.from(new Set(all));
    const xpEarned = Math.max(10, Math.round(rounds * 5));

    onFinish({
      xpEarned,
      rounds,
      skipped: 0,
      meta: {
        totalMessages: rounds,
        uniqueEmojiCount: unique.length,
        topEmoji: topEmoji(messages),
        durationMs: totalMs - remaining,
      },
    });
  }

  // UI ------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header / Timer */}
      <div className="rounded-2xl border dark:border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Chat as <b className="text-gray-900 dark:text-gray-100">{players[who]}</b> • Emojis only!
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-fuchsia-600" />
            <div className="font-medium tabular-nums">{timeStr}</div>
            <button
              onClick={() => { setRunning((r) => !r); }}
              className="ml-2 rounded-lg border dark:border-gray-700 px-2.5 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1"
              title={running ? "Pause" : "Resume"}
            >
              {running ? <Pause className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
              {running ? "Pause" : "Resume"}
            </button>
            <button
              onClick={resetGame}
              className="rounded-lg border dark:border-gray-700 px-2.5 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div className="h-full bg-fuchsia-600" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Thread */}
      <div ref={listRef} className="rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 h-64 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-gray-500 dark:text-gray-400">
            Start the chat — emojis only! (e.g. ❤️🎉 or 😜👉🎵)
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[75%] px-3 py-2 rounded-2xl text-lg leading-6 ${
                m.from === 0
                  ? "bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 mr-auto rounded-bl-sm"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ml-auto rounded-br-sm"
              }`}
              title={new Date(m.t).toLocaleTimeString()}
            >
              {m.text}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="rounded-2xl border dark:border-gray-800 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-1 rounded-full border dark:border-gray-700">{players[who]}</div>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              disabled={!running || remaining <= 0}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type with emojis only…"
              className="w-full rounded-xl border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
            />
            <button
              onClick={send}
              disabled={!running || remaining <= 0}
              className="absolute right-1.5 top-1.5 rounded-lg px-2.5 py-1.5 text-sm bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
          <button
            onClick={() => setWho((w) => (w === 0 ? 1 : 0))}
            className="rounded-lg border dark:border-gray-700 px-2.5 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1"
            title="Switch speaker"
          >
            <Smile className="w-4 h-4" /> Switch
          </button>
        </div>

        {warn && <div className="text-xs text-red-600 dark:text-red-400">{warn}</div>}

        {/* Quick palette */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {palette.map((e) => (
            <button
              key={e}
              onClick={() => setText((t) => (t + " " + e).trim())}
              className="px-2 py-1 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-lg"
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end">
        <button
          onClick={finishNow}
          className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
        >
          Finish & Save
        </button>
      </div>
    </div>
  );
}
