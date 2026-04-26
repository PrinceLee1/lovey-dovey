// src/games/types.ts — UPDATED
// Added plus game kinds so TypeScript doesn't complain

export type GameKind =
  | "truth_dare"
  | "truth_dare_erotic"   // ← Plus only (Erotic category)
  | "emoji_chat"
  | "spice_dice"
  | "memory_match"
  | "trivia"
  | "charades_ai";

export type Game = {
  id: string;
  kind: GameKind;
  title: string;
  category: string;
  description: string;
  duration: number;   // minutes
  players: number;
  difficulty: "Easy" | "Medium" | "Hard";
  partner_required?: boolean;
  is_plus?: boolean;  // ← backend sends this flag for Plus-only games
};

export type HistoryItem = {
  id: number;
  game_id: string;
  game_title: string;
  kind: string;
  category: string;
  duration_minutes: number;
  players: number;
  difficulty?: string | null;
  rounds: number;
  skipped: number;
  xp_earned: number;
  meta?: Record<string, any> | null;
  played_at: string; // ISO
};

export type GameResult = {
  xpEarned: number;
  rounds: number;
  skipped: number;
  meta?: Record<string, any>;
};