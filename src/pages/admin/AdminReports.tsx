// src/pages/admin/AdminReports.tsx
import { useEffect, useState } from "react";
import { api } from "../../libs/axios";
import { motion } from "framer-motion";
import { TrendingUp, Users, Crown, Gamepad2, Download } from "lucide-react";

type ReportData = {
  signups_by_day: { date: string; count: number }[];
  games_by_kind: { kind: string; count: number }[];
  revenue_by_month: { month: string; amount: number }[];
  plus_conversions: { month: string; count: number }[];
  top_lobbies: { name: string; code: string; sessions: number; players: number }[];
};

const EMOJI: Record<string,string> = { trivia:"🧠",hot_seat:"🔥",would_you_rather:"🤔",spice_dice:"🎲",charades_ai:"🎭",truth_dare:"❤️" };
const LABELS: Record<string,string> = { trivia:"Trivia",hot_seat:"Hot Seat",would_you_rather:"WYR",spice_dice:"Dare Dice",charades_ai:"Charades",truth_dare:"Truth or Dare" };

function Bar({ value, max, color }: { value:number; max:number; color:string }) {
  return (
    <div className="h-2 bg-rose-50 rounded-full overflow-hidden flex-1">
      <motion.div className={`h-full rounded-full ${color}`}
        initial={{ width:0 }} animate={{ width:`${max>0?(value/max)*100:0}%` }}
        transition={{ duration:0.8, ease:"easeOut" }}/>
    </div>
  );
}

function Sparkline({ data }: { data: { date:string; count:number }[] }) {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-gray-300 text-xs">No data</div>;
  const max = Math.max(...data.map(d=>d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-20">
      {data.slice(-30).map((d,i) => (
        <motion.div key={i} title={`${d.date}: ${d.count}`}
          initial={{ height:0 }} animate={{ height:`${Math.max(4,(d.count/max)*100)}%` }}
          transition={{ duration:0.6, delay:i*0.01 }}
          className="flex-1 rounded-sm bg-gradient-to-t from-rose-500 to-fuchsia-400 opacity-75 hover:opacity-100 transition min-w-0" />
      ))}
    </div>
  );
}

export default function AdminReports() {
  const [data, setData]   = useState<ReportData|null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d"|"30d"|"90d">("30d");

  useEffect(() => {
    api.get(`/admin/reports?range=${range}`)
      .then(r => setData(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, [range]);

  const maxGames   = Math.max(...(data?.games_by_kind.map(g=>g.count)??[1]));
  const maxRevenue = Math.max(...(data?.revenue_by_month.map(r => Number(r.amount)) ?? [1]));

  if (loading) return <div className="p-8 space-y-4 animate-pulse">{[...Array(4)].map((_,i)=><div key={i} className="h-36 rounded-2xl bg-rose-50"/>)}</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900" style={{fontFamily:"Georgia,serif"}}>Reports</h1>
          <p className="text-sm text-gray-400 mt-1">Platform analytics & insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-rose-100 rounded-xl p-1 shadow-sm">
            {(["7d","30d","90d"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${range===r ? "bg-rose-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>{r}</button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-rose-100 text-gray-400 hover:text-gray-700 hover:border-rose-200 text-xs font-medium transition shadow-sm">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Signup chart */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-bold text-gray-900">New Signups</span>
          <span className="text-xs text-gray-300 ml-auto">Last {range}</span>
        </div>
        {data?.signups_by_day ? <Sparkline data={data.signups_by_day}/> : <div className="h-20 flex items-center justify-center text-gray-300 text-xs">No data</div>}
        <div className="flex justify-between text-[10px] text-gray-300 mt-2"><span>Older</span><span>Today</span></div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Games by type */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5"><Gamepad2 className="w-4 h-4 text-fuchsia-400"/><span className="text-sm font-bold text-gray-900">Games by Type</span></div>
          <div className="space-y-3">
            {(data?.games_by_kind??[]).sort((a,b)=>b.count-a.count).map(g => (
              <div key={g.kind} className="flex items-center gap-3">
                <span className="text-base w-6">{EMOJI[g.kind]??"🎮"}</span>
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">{LABELS[g.kind]??g.kind}</span>
                <Bar value={g.count} max={maxGames} color="bg-gradient-to-r from-rose-400 to-fuchsia-500"/>
                <span className="text-xs text-gray-400 w-10 text-right">{g.count.toLocaleString()}</span>
              </div>
            ))}
            {!data?.games_by_kind?.length && <div className="text-sm text-gray-300 text-center py-4">No data</div>}
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5"><Crown className="w-4 h-4 text-amber-500"/><span className="text-sm font-bold text-gray-900">Plus Revenue</span></div>
          <div className="space-y-3">
            {(data?.revenue_by_month??[]).map(r => (
              <div key={r.month} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-12 flex-shrink-0">{r.month}</span>
                <Bar value={r.amount} max={maxRevenue} color="bg-gradient-to-r from-amber-400 to-orange-500"/>
                <span className="text-xs text-gray-500 w-14 text-right font-semibold">${Number(r.amount).toFixed(0)}</span>
              </div>
            ))}
            {!data?.revenue_by_month?.length && <div className="text-sm text-gray-300 text-center py-4">No data</div>}
          </div>
        </div>

        {/* Plus conversions */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5"><TrendingUp className="w-4 h-4 text-emerald-500"/><span className="text-sm font-bold text-gray-900">Plus Conversions</span></div>
          <div className="space-y-2">
            {(data?.plus_conversions??[]).map(c => (
              <div key={c.month} className="flex items-center justify-between py-2 border-b border-rose-50 last:border-0">
                <span className="text-xs text-gray-400">{c.month}</span>
                <div className="flex items-center gap-2 flex-1 mx-3">
                  <Bar value={c.count} max={Math.max(...(data?.plus_conversions.map(x=>x.count)??[1]))} color="bg-emerald-400"/>
                </div>
                <span className="text-xs font-bold text-emerald-600 w-6 text-right">{c.count}</span>
              </div>
            ))}
            {!data?.plus_conversions?.length && <div className="text-sm text-gray-300 text-center py-4">No data</div>}
          </div>
        </div>

        {/* Top lobbies */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5"><span className="text-base">🎉</span><span className="text-sm font-bold text-gray-900">Top Lobbies</span></div>
          <div className="space-y-1">
            {(data?.top_lobbies??[]).map((l,i) => (
              <div key={l.code} className="flex items-center gap-3 py-2.5 border-b border-rose-50 last:border-0">
                <span className="text-xs font-black text-gray-200 w-5">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 truncate">{l.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{l.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-gray-600">{l.sessions} games</div>
                  <div className="text-[10px] text-gray-300">{l.players} players</div>
                </div>
              </div>
            ))}
            {!data?.top_lobbies?.length && <div className="text-sm text-gray-300 text-center py-4">No data</div>}
          </div>
        </div>
      </div>
    </div>
  );
}