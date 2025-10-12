import { motion, AnimatePresence } from "framer-motion";
import type { Game, GameResult } from "./types";
import TruthDareRomantic from "./TruthDareRomantic";
import EmojiChat from "./EmojiChat";
import SpiceDice from "./SpiceDice";
import MemoryMatchCouple from "./MemoryMatchCouple";
import TriviaDuoVsDuo from "./TriviaDuoVsDuo";
import CharadesAI from "./CharadesAI";
export default function GameRunner({
  game,
  onClose,
  onFinished,
  pg = "PG-13",
}: {
  game: Game;
  onClose: () => void;
  onFinished: (res: GameResult) => void;
  pg?: "PG-13" | "PG-18+" | "NC-17";
}) {
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
          className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-500">{game.category}</div>
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

          {/* Render engine by kind */}
          {game.kind === "truth_dare" && (
            <TruthDareRomantic
              onFinish={(res) => {
                onFinished(res);
                onClose();
              }}
              pg={pg}
              category={game.category as "Romantic" | "Playful" | "Spicy" | "Challenge" | "Wild" | "Extreme" | "Erotic"}
            />
          )}
          {game.kind === "emoji_chat" && (
            <EmojiChat
                minutes={Math.max(1, Math.round(game.duration || 5))} // uses 5 from your allGames
                onFinish={(res) => {
                onFinished(res);
                onClose();
                }}
            />
            )}
            {game.kind === "spice_dice" && (
            <SpiceDice
                onFinish={(res) => {
                onFinished(res);  // your dashboard will save history + update XP
                onClose();
                }}
            />
            )}
            {game.kind === "memory_match" && (
                <MemoryMatchCouple
                    onFinish={(res) => {
                    onFinished(res); // your Dashboard persists history + XP
                    onClose();
                    }}
                />
            )}
            {game.kind === "trivia" && (
                <TriviaDuoVsDuo
                    count={10}
                    secondsPerQ={30}
                    category="General"
                    difficulty="Medium"
                    onFinish={(res) => {
                    onFinished(res); // your Dashboard handles history + XP
                    onClose();
                    }}
                />
            )}
            {game.kind === "charades_ai" && (
            <CharadesAI
                secondsPerRound={60}
                roundsPerTeam={3}
                category="General"
                difficulty="Easy"
                onFinish={(res) => { onFinished(res); onClose(); }}
            />
            )}

          {/* TODO: add other kinds here as you implement them */}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
