import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "./types";
import { Sparkles, Clock, RotateCcw, Check } from "lucide-react";

type Card = {
  id: string;
  value: string;        // what matches (emoji or favorite text)
  owner?: 0 | 1 | null; // which partner submitted (for subtle highlighting)
  matched: boolean;
};

export default function MemoryMatchCouple({
  couple,
  onFinish,
  size = 4,            // 4x4 grid (8 pairs)
}: {
  couple?: [string, string];
  onFinish: (res: GameResult) => void;
  size?: 4 | 6;        // you can try 6 for a bigger board later
}) {
  const players = useMemo<[string, string]>(() => couple ?? ["You", "Partner"], [couple]);
  const PAIRS = (size * size) / 2;

  // -------------------- Setup (favorites) --------------------
  const defaultPool = useMemo(
    () => ["🍕","🎬","🎧","🌮","☕️","🎮","📚","🌈","🧋","🍣","🐶","✈️","🍫","🎵","🏖️","🌙","🌟","🏀","🍓","🧩"],
    []
  );

  const [favA, setFavA] = useState<string[]>([]);
  const [favB, setFavB] = useState<string[]>([]);
  const [setupOpen, setSetupOpen] = useState(true);

  function addFav(side: 0 | 1, item: string) {
    const v = item.trim();
    if (!v) return;
    if (side === 0) setFavA((arr) => uniq([...arr, v]).slice(0, PAIRS));
    else setFavB((arr) => uniq([...arr, v]).slice(0, PAIRS));
  }
  function removeFav(side: 0 | 1, item: string) {
    if (side === 0) setFavA((arr) => arr.filter((x) => x !== item));
    else setFavB((arr) => arr.filter((x) => x !== item));
  }
  function autoFill(side: 0 | 1) {
    const picks = takeRandom(defaultPool, 6);
    if (side === 0) setFavA(uniq([...favA, ...picks]).slice(0, PAIRS));
    else setFavB(uniq([...favB, ...picks]).slice(0, PAIRS));
  }

  // -------------------- Deck build --------------------
  const [deck, setDeck] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]); // indices of currently revealed cards (max 2)
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [turn, setTurn] = useState<0 | 1>(0); // whose turn (for fun)

  function startTimer() {
    if (startedAt !== null) return;
    const t0 = Date.now();
    setStartedAt(t0);
    timerRef.current = window.setInterval(() => {
      setElapsed(Date.now() - t0);
    }, 250);
  }
  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => () => stopTimer(), []);

  function buildDeck() {
    // merge favorites (keep side info), then fill up with emoji pool until PAIRS items
    let items: { value: string; owner: 0 | 1 | null }[] = [];
    for (const v of favA) items.push({ value: v, owner: 0 });
    for (const v of favB) items.push({ value: v, owner: 1 });

    const need = Math.max(0, PAIRS - items.length);
    if (need > 0) {
      const fillers = takeRandom(
        defaultPool.filter((e) => !items.find((i) => i.value === e)),
        need
      ).map((v) => ({ value: v, owner: null as 0 | 1 | null }));
      items = [...items, ...fillers];
    } else if (items.length > PAIRS) {
      items = items.slice(0, PAIRS);
    }

    // duplicate & shuffle
    const dup: Card[] = items
      .flatMap((it) => [
        { id: nanoid(), value: it.value, owner: it.owner, matched: false },
        { id: nanoid(), value: it.value, owner: it.owner, matched: false },
      ])
      .sort(() => Math.random() - 0.5);

    setDeck(dup);
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setTurn(0);
    setStartedAt(null);
    setElapsed(0);
    stopTimer();
  }

  // start game when setup closes
  function startGame() {
    setSetupOpen(false);
    buildDeck();
  }

  // -------------------- Game logic --------------------
  function onCardClick(idx: number) {
    if (setupOpen) return;
    const card = deck[idx];
    if (card.matched) return;
    if (flipped.includes(idx)) return;

    // start timer on first reveal
    startTimer();

    const next = [...flipped, idx].slice(-2);
    setFlipped(next);

    if (next.length === 2) {
      // one move per 2 flips
      setMoves((m) => m + 1);
      const [a, b] = next;
      const ca = deck[a];
      const cb = deck[b];

      if (ca.value === cb.value) {
        // match!
        setTimeout(() => {
          setDeck((d) => {
            const copy = d.slice();
            copy[a] = { ...copy[a], matched: true };
            copy[b] = { ...copy[b], matched: true };
            return copy;
          });
          setMatches((k) => k + 1);
          setFlipped([]);
          // keep same player's turn on success (optional rule)
        }, 450);
      } else {
        // flip back after a beat & switch turn
        setTimeout(() => {
          setFlipped([]);
          setTurn((t) => (t === 0 ? 1 : 0));
        }, 800);
      }
    }
  }

  // finish when all matched
  useEffect(() => {
    if (matches === PAIRS && deck.length) {
      stopTimer();
      const ms = elapsed;
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      const timeNice = `${minutes}:${String(seconds).padStart(2, "0")}`;

      // client-estimated XP (server will clamp/compute)
      const speedBonus = Math.max(0, Math.round((PAIRS * 20 * 60_000 - ms) / 60_000)); // small bonus for speed
      const accuracy = Math.max(0.3, Math.min(1, PAIRS / Math.max(1, moves)));
      const xp = Math.round(PAIRS * 15 * accuracy + speedBonus);

      onFinish({
        xpEarned: xp,
        rounds: moves,   // "attempts"
        skipped: 0,
        meta: {
          boardSize: `${size}x${size}`,
          timeMs: ms,
          timeNice,
          moves,
          accuracy,
        },
      });
    }
  }, [matches]); // eslint-disable-line

  function restart() {
    buildDeck();
  }

  // -------------------- Render --------------------
  const mm = Math.floor(elapsed / 60000);
  const ss = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${mm}:${String(ss).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Turn: <b className="text-gray-900">{players[turn]}</b>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2 py-1 rounded-full border">Moves: {moves}</span>
          <span className="px-2 py-1 rounded-full border">Matches: {matches}/{PAIRS}</span>
          <span className="px-2 py-1 rounded-full border inline-flex items-center gap-1">
            <Clock className="w-4 h-4 text-fuchsia-600" /> {timeStr}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div
        className={`grid gap-3`}
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {deck.map((c, idx) => {
          const isUp = c.matched || flipped.includes(idx);
          const tint =
            c.owner === 0 ? "ring-rose-200" : c.owner === 1 ? "ring-fuchsia-200" : "ring-gray-200";

          return (
            <button
              key={c.id}
              onClick={() => onCardClick(idx)}
              disabled={isUp || setupOpen}
              className={`aspect-square rounded-2xl border grid place-items-center text-2xl md:text-3xl
                bg-white relative overflow-hidden
                ${isUp ? "border-fuchsia-200" : "border-rose-100 hover:bg-rose-50"}
                ${tint}
              `}
            >
              <AnimatePresence initial={false}>
                {isUp ? (
                  <motion.div
                    key="front"
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full h-full grid place-items-center"
                  >
                    <span className="select-none">{c.value}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -90, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full h-full grid place-items-center bg-gradient-to-br from-rose-100 to-fuchsia-100"
                  >
                    <Sparkles className="w-6 h-6 text-fuchsia-600" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={restart}
          className="text-sm text-gray-600 inline-flex items-center gap-1 hover:text-gray-800"
        >
          <RotateCcw className="w-4 h-4" /> Restart
        </button>
        {/* When all pairs matched, onFinish will close via GameRunner's handler */}
        <span className="text-xs text-gray-500">Match all pairs to finish</span>
      </div>

      {/* Setup modal */}
      {setupOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-gray-500">Personalize (optional)</div>
                <div className="font-display text-lg font-semibold text-gray-900">
                  Couple Favorites
                </div>
                <div className="text-xs text-gray-500">
                  Add up to {PAIRS} items total. We’ll fill the rest with cute emojis.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FavColumn
                title={players[0]}
                values={favA}
                onAdd={(v) => addFav(0, v)}
                onRemove={(v) => removeFav(0, v)}
                onAuto={() => autoFill(0)}
              />
              <FavColumn
                title={players[1]}
                values={favB}
                onAdd={(v) => addFav(1, v)}
                onRemove={(v) => removeFav(1, v)}
                onAuto={() => autoFill(1)}
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Tip: “Pizza”, “Blue”, “Studio Ghibli”, “Afrobeats”, “Paris”
              </div>
              <button
                onClick={startGame}
                className="rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Start Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------- Small subcomponents ------------------------- */

function FavColumn({
  title,
  values,
  onAdd,
  onRemove,
  onAuto,
}: {
  title: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  onAuto: () => void;
}) {
  const [input, setInput] = useState("");
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-gray-900">{title}</div>
        <button onClick={onAuto} className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50">
          Autofill
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              onAdd(input);
              setInput("");
            }
          }}
          placeholder="Add a favorite (press Enter)…"
          className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500"
        />
        <button
          onClick={() => {
            if (!input.trim()) return;
            onAdd(input);
            setInput("");
          }}
          className="rounded-xl px-3 py-2 text-sm border hover:bg-gray-50"
        >
          Add
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {values.length === 0 ? (
          <span className="text-xs text-gray-400">No items yet</span>
        ) : (
          values.map((v) => (
            <button
              key={v}
              onClick={() => onRemove(v)}
              className="text-xs px-2 py-1 rounded-full border hover:bg-gray-50"
              title="Remove"
            >
              {v}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Utilities ------------------------------ */

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
function takeRandom<T>(pool: T[], n: number) {
  const copy = pool.slice();
  const out: T[] = [];
  while (copy.length && out.length < n) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}
function nanoid() {
  return (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}
