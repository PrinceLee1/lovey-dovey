export type GameKind =
  | "truth_dare"
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
  players: number;    // suggested player count
  difficulty: "Easy" | "Medium" | "Hard";
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
