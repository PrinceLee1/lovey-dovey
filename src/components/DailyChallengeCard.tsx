// src/components/DailyChallengeCard.tsx
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { getDaily, completeDaily } from "../libs/daily";

interface ChallengePayload {
  description: string;
  steps?: string[];
  duration_minutes: number;
  difficulty: string;
}

interface Challenge {
  kind: string;
  title: string;
  status: string;
  payload: ChallengePayload;
}

interface DailyData {
  challenge: Challenge;
}

export default function DailyChallengeCard({ onXp }: { onXp?: (xp:number)=>void }) {
  const [data, setData] = useState<DailyData | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load(){ setData(await getDaily()); }
  useEffect(()=>{ load(); }, []);

  if (!data) return null;

  const c = data.challenge;
  const isDone = c.status === "completed";

  return (
    <>
      <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5 flex items-center gap-4 hover:shadow-2xl transition cursor-pointer" onClick={()=>setOpen(true)}>
        <div className="h-12 w-12 rounded-2xl grid place-items-center text-white bg-gradient-to-br from-pink-500 to-fuchsia-600">
          <Flame className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{isDone ? "View Daily Challenge" : " Daily Challenge"}</div>
          <div className="text-sm text-gray-500">{isDone ? "Completed" : "+50 XP if completed"}</div>
        </div>
        {/* <button
          onClick={()=>setOpen(true)}
          className={`rounded-xl px-4 py-2 text-sm ${isDone ? "border" : "text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"}`}
        >
          {isDone ? "View" : "Start"}
        </button> */}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="text-xs text-gray-500">{c.kind === 'duo' ? "For you + partner" : "Solo"}</div>
            <div className="text-xl font-semibold text-gray-900">{c.title}</div>
            <p className="text-sm text-gray-600 mt-2">{c.payload.description}</p>

            <div className="mt-4 space-y-2">
              {c.payload.steps?.map((s:string, i:number)=>(
                <div key={i} className="flex gap-3 items-start">
                  <span className="mt-1 h-5 w-5 rounded-full bg-rose-100 text-rose-600 grid place-items-center text-xs">{i+1}</span>
                  <div className="text-sm text-gray-800">{s}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              ~{c.payload.duration_minutes} min • {c.payload.difficulty}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-xl border text-sm" onClick={()=>setOpen(false)}>Close</button>
              {!isDone && (
                <button
                  disabled={busy}
                  onClick={async ()=>{
                    setBusy(true);
                    try{
                      const res = await completeDaily();
                      onXp?.(res.xp_awarded);
                      await load();
                      setOpen(false);
                    } finally { setBusy(false); }
                  }}
                  className="px-4 py-2 rounded-xl text-sm text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"
                >
                  {busy ? "Saving…" : "Mark Done (+50 XP)"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
