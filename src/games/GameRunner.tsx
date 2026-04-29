/**
 * GameRunner.tsx — UPDATED
 * Routes game.kind to the correct engine.
 * Plus games use *Plus variants when pg === "PG-18+" | "NC-17"
 * and the game kind ends with _plus.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { Game, GameResult } from "./types";
import TruthDareRomantic from "./TruthDareRomantic";
import TruthDarePlus from "./TruthDarePlus";
import EmojiChat from "./EmojiChat";
import EmojiChatPlus from "./EmojiChatPlus";
import SpiceDice from "./SpiceDice";
import MemoryMatchCouple from "./MemoryMatchCouple";
import TriviaDuoVsDuo from "./TriviaDuoVsDuo";
import TriviaPlus from "./TriviaPlus";
import CharadesAI from "./CharadesAI";

export default function GameRunner({
  game,
  onClose,
  onFinished,
  pg = "PG-13",
  isPlus = false,
}: {
  game: Game;
  onClose: () => void;
  onFinished: (res: GameResult) => void;
  pg?: "PG-13" | "PG-18+" | "NC-17";
  isPlus?: boolean;
}) {
  // const isPlus = pg === "PG-18+" || pg === "NC-17";

  function finish(res: GameResult) {
    onFinished(res);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      >
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">{game.category}</div>
                {isPlus && (
                  <span className="text-xs bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-2 py-0.5 rounded-full font-semibold">
                    PLUS
                  </span>
                )}
              </div>
              <div className="font-display text-lg font-semibold text-gray-900">
                {game.title}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          {/* ── Truth or Dare ─────────────────────────────────────────────── */}
          {(game.kind === "truth_dare" || game.kind === "truth_dare_erotic") && (
            isPlus ? (
              <TruthDarePlus
                category={game.category as any}
                onFinish={finish}
              />
            ) : (
              <TruthDareRomantic
                pg={pg}
                category={game.category as any}
                onFinish={finish}
              />
            )
          )}

          {/* ── Emoji Chat ────────────────────────────────────────────────── */}
          {game.kind === "emoji_chat" && (
            isPlus ? (
              <EmojiChatPlus
                minutes={Math.max(1, Math.round(game.duration || 8))}
                onFinish={finish}
              />
            ) : (
              <EmojiChat
                minutes={Math.max(1, Math.round(game.duration || 5))}
                onFinish={finish}
              />
            )
          )}

          {/* ── Spice Dice ────────────────────────────────────────────────── */}
          {/* SpiceDice is already a Plus-calibre game — keep it for both tiers */}
          {game.kind === "spice_dice" && (
            <SpiceDice onFinish={finish} />
          )}

          {/* ── Memory Match ─────────────────────────────────────────────── */}
          {game.kind === "memory_match" && (
            <MemoryMatchCouple onFinish={finish} />
          )}

          {/* ── Trivia ───────────────────────────────────────────────────── */}
          {game.kind === "trivia" && (
            isPlus ? (
              <TriviaPlus
                category={game.category}
                difficulty={game.difficulty}
                onFinish={finish}
              />
            ) : (
              <TriviaDuoVsDuo
                count={10}
                secondsPerQ={30}
                category="General"
                difficulty={game.difficulty}
                onFinish={finish}
              />
            )
          )}

          {/* ── Charades ─────────────────────────────────────────────────── */}
          {game.kind === "charades_ai" && (
            <CharadesAI
              secondsPerRound={isPlus ? 45 : 60}
              roundsPerTeam={isPlus ? 4 : 3}
              category={isPlus ? game.category : "General"}
              difficulty={isPlus ? game.difficulty : "Easy"}
              onFinish={finish}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}