// src/components/StreakBadge.tsx
import { useEffect, useState } from "react";
import { fetchStreaks } from "../libs/streaks";

export default function StreakBadge({ kind = "user" as "user" | "couple" }) {
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const s = await fetchStreaks();
      setN(kind === "user" ? s.user.current : (s.couple?.current ?? 0));
    })();
  }, [kind]);

  if (n === null || n <= 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] bg-amber-50 text-amber-700">
      <span>🔥</span>
      <span>{n}-day streak</span>
      {kind === "couple" && <span className="ml-1">(couple)</span>}
    </span>
  );
}
