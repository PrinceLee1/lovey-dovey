// src/components/LeaderboardCard.tsx
import React, { useEffect, useState } from "react";
import { fetchLeaderboard, type LbEntry } from "../libs/leaderboard";
import { Star } from "lucide-react";

function initialsPair(name: string) {
  const parts = name.split('&').map(s=>s.trim());
  const i1 = parts[0]?.[0]?.toUpperCase() ?? '?';
  const i2 = parts[1]?.[0]?.toUpperCase() ?? '?';
  return `${i1}&${i2}`;
}

export default function LeaderboardCard() {
  const [scope, setScope] = useState<"all_time"|"weekly"|"monthly">("all_time");
  const [data, setData] = useState<{top:LbEntry[]; me:any} | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(s = scope) {
    setLoading(true);
    try { const res = await fetchLeaderboard(s); setData({ top: res.top, me: res.me }); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);
  useEffect(()=>{ load(scope); }, [scope]);

  return (
    <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display font-semibold text-gray-900">Leaderboard</div>
        <select
          className="text-sm border rounded-lg px-2 py-1"
          value={scope}
          onChange={e=>setScope(e.target.value as any)}
        >
          <option value="all_time">All-time</option>
          <option value="weekly">This week</option>
          <option value="monthly">This month</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="space-y-4">
          {data?.top?.map((row, idx) => (
            <div key={row.pair_id} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white grid place-items-center text-sm font-semibold">
                {initialsPair(row.duo_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 font-medium truncate">
                  {row.rank}. {row.duo_name}
                </div>
                <div className="text-xs text-gray-500">{row.xp} XP</div>
              </div>
              {row.rank <= 3 && <Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
            </div>
          ))}

          {/* Your rank if not in top list */}
          {data?.me && (data.top.findIndex(t=>t.pair_id===data.me.pair_id) === -1) && (
            <div className="mt-2 pt-2 border-t">
              <div className="text-xs text-gray-500 mb-1">You</div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 grid place-items-center text-sm font-semibold">
                  {initialsPair(data.me.duo_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-medium truncate">
                    {data.me.rank}. {data.me.duo_name}
                  </div>
                  <div className="text-xs text-gray-500">{data.me.xp} XP</div>
                </div>
              </div>
            </div>
          )}

          {!data?.top?.length && (
            <div className="text-sm text-gray-500">No couples on the board yet. Play games to earn XP!</div>
          )}
        </div>
      )}
    </div>
  );
}
