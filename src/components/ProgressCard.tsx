// src/components/ProgressCard.tsx
import React, { useEffect, useState } from "react";
import { fetchProgress, type ProgressRes } from "../libs/progress";
import { Trophy } from "lucide-react";

function Bar({ value, className }:{ value:number; className:string }) {
  return (
    <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${className}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function ProgressCard() {
  const [p, setP] = useState<ProgressRes | null>(null);

  useEffect(() => { (async()=> setP(await fetchProgress()))(); }, []);

  if (!p) return null;

  return (
    <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display font-semibold text-gray-900">Your Progress</div>
        <Trophy className="w-5 h-5 text-amber-500" />
      </div>

      <div className="text-sm text-gray-600">XP</div>
      <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
        <div>Lvl {p.xp.level}</div>
        <div>{p.xp.percent}%</div>
      </div>
      <Bar value={p.xp.percent} className="bg-gradient-to-r from-fuchsia-500 to-pink-500" />

      <div className="mt-5 text-sm text-gray-600">Weekly Streak</div>
      <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
        <div>{p.weekly.active_days}/{p.weekly.goal_days} days</div>
        <div>{p.weekly.percent}%</div>
      </div>
      <Bar value={p.weekly.percent} className="bg-gradient-to-r from-amber-400 to-orange-500" />

      {/* Optional: tiny helper line */}
      <div className="mt-3 text-xs text-gray-500">
        Earn XP by finishing games & the Daily Challenge. Keep playing daily to fill the weekly bar.
      </div>
    </div>
  );
}
