// src/pages/admin/AdminOverview.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../../libs/axios";
import { Users, Heart, Crown, Activity, Gamepad2, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type Stats = {
  total_users: number; active_users: number; paired_users: number;
  plus_subscribers: number; total_games_played: number; games_today: number;
  revenue_monthly: number; new_users_today: number; new_users_week: number;
  active_lobbies: number;
};
type RecentUser = {
  id: number; name: string; email: string; created_at: string;
  is_plus: boolean; partner?: { name: string };
};
type RecentGame = {
  id: number; kind: string; players: number;
  started_at: string; status: string; lobby_name?: string;
};

const GAME_EMOJI: Record<string, string> = {
  trivia:"🧠", hot_seat:"🔥", would_you_rather:"🤔",
  spice_dice:"🎲", charades_ai:"🎭", truth_dare:"❤️",
};

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string; icon: any; accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`h-9 w-9 rounded-xl ${accent} grid place-items-center flex-shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-0.5">{value}</div>
      <div className="text-xs font-semibold text-gray-400 dark:text-gray-500">{label}</div>
      {sub && <div className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users?per_page=5&sort=newest"),
      api.get("/admin/games/recent?limit=5"),
    ]).then(([s, u, g]) => {
      setStats(s.data);
      setRecentUsers(u.data.data ?? u.data ?? []);
      setRecentGames(g.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmt = (n?: number) => n?.toLocaleString() ?? "—";

  if (loading) return (
    <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {[...Array(8)].map((_,i) => <div key={i} className="h-28 rounded-2xl bg-rose-50 dark:bg-gray-800/60" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100" style={{ fontFamily: "Georgia, serif" }}>Overview</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Platform health at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users"      value={fmt(stats?.total_users)}       icon={Users}    accent="bg-gradient-to-br from-blue-400 to-blue-600"    sub={`+${stats?.new_users_week ?? 0} this week`} />
        <StatCard label="Paired Users"     value={fmt(stats?.paired_users)}      icon={Heart}    accent="bg-gradient-to-br from-rose-400 to-pink-600"     />
        <StatCard label="Plus Subscribers" value={fmt(stats?.plus_subscribers)}  icon={Crown}    accent="bg-gradient-to-br from-amber-400 to-orange-500"  sub={`$${((stats?.plus_subscribers ?? 0)*4.99).toFixed(0)}/mo`} />
        <StatCard label="Active Today"     value={fmt(stats?.active_users)}      icon={Activity} accent="bg-gradient-to-br from-emerald-400 to-teal-600"  sub={`${stats?.new_users_today ?? 0} new signups`} />
        <StatCard label="Games Played"     value={fmt(stats?.total_games_played)} icon={Gamepad2} accent="bg-gradient-to-br from-fuchsia-400 to-violet-600" sub={`${stats?.games_today ?? 0} today`} />
        <StatCard label="Active Lobbies"   value={fmt(stats?.active_lobbies)}    icon={Zap}      accent="bg-gradient-to-br from-orange-400 to-rose-500"   />
        <StatCard label="Monthly Revenue"  value={`$${fmt(stats?.revenue_monthly)}`} icon={TrendingUp} accent="bg-gradient-to-br from-teal-400 to-cyan-600" />
        <StatCard label="New Today"        value={fmt(stats?.new_users_today)}   icon={Users}    accent="bg-gradient-to-br from-violet-400 to-fuchsia-600" />
      </div>

      {/* Tables */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Recent Users */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rose-50 dark:border-gray-800">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Recent Users</span>
            <Link to="/admin/users" className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-semibold transition">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-rose-50 dark:divide-gray-800">
            {recentUsers.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-300 dark:text-gray-600">No users yet</div>
            ) : recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-rose-50/40 dark:hover:bg-gray-800/40 transition">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold flex-shrink-0">
                  {u.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{u.name}</span>
                    {u.is_plus && <span className="text-[9px] font-black bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">✦ PLUS</span>}
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{u.email}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  {u.partner ? (
                    <div className="flex items-center gap-1 text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
                      <Heart className="w-2.5 h-2.5" fill="currentColor" />{u.partner.name}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-300 dark:text-gray-600">No partner</div>
                  )}
                  <div className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">
                    {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Games */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rose-50 dark:border-gray-800">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Recent Games</span>
            <Link to="/admin/games" className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-semibold transition">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-rose-50 dark:divide-gray-800">
            {recentGames.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-300 dark:text-gray-600">No games yet</div>
            ) : recentGames.map(g => (
              <div key={g.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-rose-50/40 dark:hover:bg-gray-800/40 transition">
                <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-gray-800 grid place-items-center text-lg flex-shrink-0">
                  {GAME_EMOJI[g.kind] ?? "🎮"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{g.kind.replace(/_/g," ")}</div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500">{g.lobby_name ?? "Session"} · {g.players} players</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    g.status === "active" ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300" : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                  }`}>{g.status === "active" ? "● Live" : "Ended"}</span>
                  <div className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                    {new Date(g.started_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}