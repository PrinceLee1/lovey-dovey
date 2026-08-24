// src/components/WeeklySummaryCard.tsx
import { useEffect, useState } from "react";
import { api } from "../libs/axios";
import { CalendarDays, Flame, Gamepad2 } from "lucide-react";

type WeeklySummary = {
  games_with_partner: number;
  games_total: number;
  lobby_games: number;
  xp_earned: number;
  current_streak: number;
  longest_streak: number;
  couple_streak_current: number | null;
  couple_streak_longest: number | null;
  partner_name: string | null;
  daily: { date: string; games: number }[];
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function WeeklySummaryCard() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<WeeklySummary>("/me/weekly-summary");
        setSummary(data);
      } catch {
        /* silent — this is a nice-to-have widget */
      }
    })();
  }, []);

  if (!summary) return null;

  const max = Math.max(1, ...summary.daily.map((d) => d.games));
  const totalGames = summary.games_total + summary.lobby_games;

  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display font-semibold text-gray-900 dark:text-gray-100">This Week</div>
        <CalendarDays className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400" />
      </div>

      {totalGames === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No games played this week yet — start one to see your recap here!
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="flex items-end justify-between gap-1.5 h-20 mb-2">
            {summary.daily.map((d) => {
              const heightPct = Math.max(6, Math.round((d.games / max) * 100));
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <div
                    className={`w-full rounded-t-md ${
                      d.games > 0
                        ? "bg-gradient-to-t from-fuchsia-500 to-pink-400"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`${d.games} game${d.games === 1 ? "" : "s"}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-4">
            {summary.daily.map((d, i) => (
              <div key={d.date} className="flex-1 text-center">
                {DAY_LABELS[new Date(d.date).getDay()] ?? DAY_LABELS[i % 7]}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="space-y-1.5 text-sm">
            {summary.games_with_partner > 0 && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Gamepad2 className="w-3.5 h-3.5 text-fuchsia-500 dark:text-fuchsia-400 flex-shrink-0" />
                {summary.games_with_partner} game{summary.games_with_partner === 1 ? "" : "s"} with {summary.partner_name ?? "your partner"}
              </div>
            )}
            {summary.lobby_games > 0 && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Gamepad2 className="w-3.5 h-3.5 text-fuchsia-500 dark:text-fuchsia-400 flex-shrink-0" />
                {summary.lobby_games} lobby game{summary.lobby_games === 1 ? "" : "s"}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              {summary.current_streak} day streak
              {summary.couple_streak_current !== null && (
                <span className="text-gray-400 dark:text-gray-500">• {summary.couple_streak_current}d couple streak</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
