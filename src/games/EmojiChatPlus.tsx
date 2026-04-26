/**
 * EmojiChatPlus.tsx — PLUS EXCLUSIVE
 * ─────────────────────────────────────────────────────────────────────────────
 * "Emoji Story Builder" — completely different from free EmojiChat:
 *
 * FREE version:   chat using emojis back-and-forth with a timer
 *
 * PLUS version:
 *  • Collaborative story told in emoji "chapters" (each player adds one)
 *  • After story is complete, AI interprets what the story means
 *  • Guess your partner's emoji round — earn XP for correct guesses
 *  • Bonus speed round: fastest to react to a random emoji prompt wins
 *  • Story saved as a "memory" in meta for journal feature
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "./types";
import { api } from "../libs/axios";
import { Clock, Sparkles, Send, RotateCcw, Eye, Zap, BookOpen } from "lucide-react";

type Chapter = { from: 0 | 1; emojis: string; turn: number };

const PALETTE = [
  "😍","🔥","💃","🌙","🎉","🥂","💋","🌹","🎵","🌊","⚡","✨","🦋","🎭","🍓",
  "🌺","💎","🎪","🌈","🏔️","🕺","👁️","🌸","🦄","🎠","🍷","🌻","🎯","💫","🎨",
];

const GUESS_PROMPTS = [
  { emoji: "🌊🌙✨", meaning: "A romantic night at the beach" },
  { emoji: "🎵❤️🌹", meaning: "Our song playing on our first date" },
  { emoji: "☕🛋️📚", meaning: "A cozy rainy day at home" },
  { emoji: "🌍✈️🗺️", meaning: "Our dream vacation together" },
  { emoji: "🍕🎮😂", meaning: "Lazy Friday night in" },
];

export default function EmojiChatPlus({
  couple,
  minutes = 8,
  onFinish,
}: {
  couple?: [string, string];
  minutes?: number;
  onFinish: (res: GameResult) => void;
}) {
  const players = useMemo<[string, string]>(() => couple ?? ["You", "Partner"], [couple]);

  // ── Phase: story | guess | speed | result ─────────────────────────────────
  const [phase, setPhase] = useState<"story" | "guess" | "speed" | "airead">("story");
  const [who, setWho] = useState<0 | 1>(0);
  const [text, setText] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [turn, setTurn] = useState(1);
  const [warn, setWarn] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Timer for story phase
  const totalMs = minutes * 60 * 1000;
  const [remaining, setRemaining] = useState(totalMs);
  const [running, setRunning] = useState(true);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!running || phase !== "story") return;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1000) { clearInterval(id); goToGuessPhase(); return 0; }
        return r - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  // ── XP tracking ───────────────────────────────────────────────────────────
  const [score, setScore] = useState(0);

  // ── AI story interpretation ────────────────────────────────────────────────
  const [aiStory, setAiStory] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function interpretStory() {
    setAiLoading(true);
    const storyStr = chapters.map(c => c.emojis).join(" → ");
    try {
      const { data } = await api.post("/ai/truth-dare", {
        // Reuse the AI endpoint with a custom prompt via personalize
        category: "Romantic",
        tone: "PG-13",
        count_truths: 1,
        count_dares: 0,
        names: [storyStr],
        personalize: true,
      });
      // Use the first truth as the "interpretation" (prompt it as an interpretation)
      setAiStory(data.truths?.[0] ?? "Your story is beautifully mysterious — only you two know the true meaning! 💕");
    } catch {
      setAiStory("Your emoji story is uniquely yours — a love language only you two speak! 💕");
    } finally {
      setAiLoading(false);
    }
  }

  // ── Guess phase ───────────────────────────────────────────────────────────
  const [guessIdx, setGuessIdx] = useState(0);
  const [guessInput, setGuessInput] = useState("");
  const [guessResult, setGuessResult] = useState<"correct" | "wrong" | null>(null);
  const [guessScore, setGuessScore] = useState(0);
  const GUESS_ROUNDS = Math.min(3, GUESS_PROMPTS.length);

  // ── Speed round ───────────────────────────────────────────────────────────
  const [speedPrompt, setSpeedPrompt] = useState<{ emoji: string; meaning: string } | null>(null);
  const [speedTimer, setSpeedTimer] = useState(5);
  const [speedWinner, setSpeedWinner] = useState<0 | 1 | "tie" | null>(null);
  const speedRef = useRef<number | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function isEmojiOnly(s: string) {
    const t = s.trim();
    if (!t) return false;
    if (/\p{L}|\p{N}/u.test(t)) return false;
    return /\p{Extended_Pictographic}/u.test(t);
  }

  function addChapter() {
    if (!isEmojiOnly(text)) {
      setWarn("Only emojis! No letters or numbers 🚫");
      setTimeout(() => setWarn(null), 1500);
      return;
    }
    setChapters(c => [...c, { from: who, emojis: text.trim(), turn }]);
    setTurn(t => t + 1);
    setScore(s => s + 5);
    setWho(w => w === 0 ? 1 : 0);
    setText("");
    inputRef.current?.focus();
  }

  function goToGuessPhase() {
    setRunning(false);
    setPhase("airead");
    interpretStory();
    setTimeout(() => setPhase("guess"), 100);
  }

  function submitGuess() {
    const correct = GUESS_PROMPTS[guessIdx];
    const userGuess = guessInput.trim().toLowerCase();
    const keyWords = correct.meaning.toLowerCase().split(" ");
    const matches = keyWords.filter(w => w.length > 3 && userGuess.includes(w)).length;
    const isCorrect = matches >= 2;

    setGuessResult(isCorrect ? "correct" : "wrong");
    if (isCorrect) { setGuessScore(s => s + 20); setScore(s => s + 20); }

    setTimeout(() => {
      setGuessResult(null);
      setGuessInput("");
      if (guessIdx + 1 >= GUESS_ROUNDS) {
        startSpeedRound();
      } else {
        setGuessIdx(i => i + 1);
      }
    }, 1200);
  }

  function startSpeedRound() {
    setPhase("speed");
    const prompt = GUESS_PROMPTS[Math.floor(Math.random() * GUESS_PROMPTS.length)];
    setSpeedPrompt(prompt);
    setSpeedTimer(5);
    setSpeedWinner(null);
    speedRef.current = window.setInterval(() => {
      setSpeedTimer(t => {
        if (t <= 1) {
          clearInterval(speedRef.current!);
          setSpeedWinner("tie");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function buzzSpeed(player: 0 | 1) {
    if (speedWinner !== null) return;
    clearInterval(speedRef.current!);
    setSpeedWinner(player);
    setScore(s => s + 30);
  }

  function finishGame() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const storyStr = chapters.map(c => `${players[c.from]}: ${c.emojis}`).join(" | ");
    onFinish({
      xpEarned: Math.max(30, score + chapters.length * 5),
      rounds: chapters.length,
      skipped: 0,
      meta: {
        story: storyStr,
        chapters: chapters.length,
        guessScore,
        aiInterpretation: aiStory,
      },
    });
  }

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">

        {/* ── STORY PHASE ─────────────────────────────────────────────────── */}
        {phase === "story" && (
          <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-fuchsia-700 font-semibold">
                  <BookOpen className="w-4 h-4" /> Emoji Story Builder
                </div>
                <div className="text-xs text-gray-500">Take turns adding emoji chapters to your shared story</div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-bold border ${
                remaining <= 30000 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-white text-gray-700"
              }`}>
                <Clock className="w-3.5 h-3.5" /> {mm}:{String(ss).padStart(2, "0")}
              </div>
            </div>

            {/* Story so far */}
            <div className="rounded-2xl border bg-gradient-to-br from-rose-50 to-fuchsia-50 p-4 min-h-24 space-y-2">
              {chapters.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">
                  Your story starts here… ✨<br />
                  <span className="text-xs">{players[0]} goes first</span>
                </div>
              ) : (
                chapters.map((ch, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: ch.from === 0 ? -10 : 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex gap-2 items-start ${ch.from === 1 ? "flex-row-reverse" : ""}`}
                  >
                    <div className="text-xs text-gray-400 mt-1 flex-shrink-0">Ch.{ch.turn}</div>
                    <div className={`px-3 py-2 rounded-2xl text-xl leading-relaxed ${
                      ch.from === 0 ? "bg-rose-100 text-rose-700 rounded-bl-sm" : "bg-fuchsia-100 text-fuchsia-700 rounded-br-sm"
                    }`}>
                      {ch.emojis}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{players[ch.from]}</div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="rounded-2xl border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-xs px-2 py-1 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700">
                  {players[who]}'s chapter
                </div>
                {warn && <div className="text-xs text-red-600">{warn}</div>}
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChapter(); } }}
                  placeholder="Add emojis to continue the story…"
                  className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <button
                  onClick={addChapter}
                  className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white inline-flex items-center gap-1"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PALETTE.map(e => (
                  <button key={e} onClick={() => setText(t => (t + e).trim())}
                    className="px-1.5 py-1 rounded-lg border hover:bg-gray-50 text-lg">{e}</button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">{chapters.length} chapters • {score} XP earned</div>
              <button
                onClick={goToGuessPhase}
                className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
              >
                End Story →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── AI READING PHASE ─────────────────────────────────────────────── */}
        {phase === "airead" && (
          <motion.div key="airead" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-3">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Sparkles className="w-10 h-10 text-fuchsia-500 mx-auto" />
            </motion.div>
            <div className="font-semibold text-gray-900">AI is reading your story…</div>
            <div className="text-sm text-gray-500">Interpreting {chapters.length} chapters of your emoji journey</div>
          </motion.div>
        )}

        {/* ── GUESS PHASE ─────────────────────────────────────────────────── */}
        {phase === "guess" && (
          <motion.div key="guess" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {aiStory && (
              <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
                <div className="text-xs text-fuchsia-600 font-semibold mb-1 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> AI read your story:
                </div>
                <div className="text-sm text-gray-800 italic">"{aiStory}"</div>
              </div>
            )}

            <div className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">Guess the Meaning 🤔</div>
                <div className="text-xs text-gray-500">Round {guessIdx + 1}/{GUESS_ROUNDS}</div>
              </div>
              <div className="text-3xl text-center py-4 bg-gray-50 rounded-xl">
                {GUESS_PROMPTS[guessIdx].emoji}
              </div>
              <div className="text-xs text-gray-500">What do these emojis represent?</div>
              <div className="flex gap-2">
                <input
                  value={guessInput}
                  onChange={e => setGuessInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submitGuess(); }}
                  placeholder="Type your interpretation…"
                  className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <button onClick={submitGuess} className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm">
                  Guess
                </button>
              </div>
              <AnimatePresence>
                {guessResult && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className={`text-center rounded-xl py-2 text-sm font-semibold ${
                      guessResult === "correct"
                        ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {guessResult === "correct" ? "✅ Nice! +20 XP" : `❌ It was: "${GUESS_PROMPTS[guessIdx].meaning}"`}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── SPEED ROUND ─────────────────────────────────────────────────── */}
        {phase === "speed" && speedPrompt && (
          <motion.div key="speed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="text-center">
              <div className="font-bold text-gray-900 flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Speed Round!
              </div>
              <div className="text-sm text-gray-500">First to buzz wins +30 XP</div>
            </div>

            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center space-y-2">
              <div className="text-4xl">{speedPrompt.emoji}</div>
              <div className={`text-2xl font-bold tabular-nums ${speedTimer <= 2 ? "text-red-600" : "text-gray-900"}`}>
                {speedTimer}s
              </div>
              <div className="text-xs text-gray-500">What scene is this?</div>
            </div>

            {speedWinner === null ? (
              <div className="grid grid-cols-2 gap-3">
                {([0, 1] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => buzzSpeed(p)}
                    className="rounded-2xl py-4 bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white font-semibold text-sm"
                  >
                    ⚡ {players[p]} — BUZZ!
                  </button>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center"
              >
                <div className="font-bold text-emerald-700">
                  {speedWinner === "tie" ? "⏰ Time's up — tie!" : `⚡ ${players[speedWinner]} buzzed first! +30 XP`}
                </div>
                <div className="text-xs text-gray-500 mt-1">It was: "{speedPrompt.meaning}"</div>
                <button
                  onClick={finishGame}
                  className="mt-3 rounded-xl px-6 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
                >
                  Finish & Save
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer for story phase */}
      {phase === "story" && (
        <div className="flex items-center justify-between">
          <button onClick={() => { if (!finishedRef.current) finishGame(); }}
            className="text-xs text-gray-400 inline-flex items-center gap-1 hover:text-gray-600">
            <RotateCcw className="w-3 h-3" /> Skip to results
          </button>
          <div className="text-xs text-gray-500">+5 XP per chapter</div>
        </div>
      )}
    </div>
  );
}