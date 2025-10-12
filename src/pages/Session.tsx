import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {echo} from "../libs/echo";
import api from "../libs/axios";

type S = {
  code: string;
  kind: string;
  round: number;
  turnUserId: number|null;
  status: "waiting"|"active"|"ended"|"aborted";
  state: any;
};

export default function CoupleSession() {
  const { code = "" } = useParams();
  const [s, setS] = useState<S|null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const meId = Number(localStorage.getItem("user_id")||0);
  const nav = useNavigate();
  const chanRef = useRef<any>(null);

  // fetch initial
  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/sessions/${code}`);
      setS(data);
    })();
  }, [code]);

  // join presence channel
  useEffect(() => {
    if (!code) return;
    const ch = echo.join(`couple-session.${code}`)
      .here((list:any[]) => setMembers(list))
      .joining((m:any)=> setMembers(cur => [...cur, m]))
      .leaving((m:any)=> setMembers(cur => cur.filter(x=>x.id!==m.id)))
      .listen('.session.created', (e:any) => setS(s => ({...(s||{} as any), ...e})))
      .listen('.session.updated', (e:any) => setS(s => ({...(s||{} as any), ...e})));
    chanRef.current = ch;
    return () => { try { ch.leave(); } catch {} };
  }, [code]);

  async function send(type: string, payload?: any) {
    await api.post(`/sessions/${code}/action`, { type, payload});
  }

  if (!s) return null;

  const myTurn = s.turnUserId === meId;

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {s.kind} • Round {s.round}
          </div>
          <button onClick={()=>nav(-1)} className="text-gray-500 hover:text-gray-800">Close</button>
        </div>

        <div className="mt-2 text-gray-800 font-semibold">
          {myTurn ? "Your turn" : "Partner’s turn"}
        </div>

        {/* Example Truth/Dare UI */}
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <button
            disabled={!myTurn}
            onClick={()=>send('pick',{ type:'truth' })}
            className="rounded-2xl border p-4 text-left disabled:opacity-50"
          >
            <div className="font-semibold">Truth</div>
            <div className="text-sm text-gray-600">A heartfelt question to open up.</div>
          </button>
          <button
            disabled={!myTurn}
            onClick={()=>send('pick',{ type:'dare' })}
            className="rounded-2xl border p-4 text-left disabled:opacity-50"
          >
            <div className="font-semibold">Dare</div>
            <div className="text-sm text-gray-600">A sweet action to do together.</div>
          </button>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button onClick={()=>send('skip')} className="text-sm text-gray-600 hover:text-gray-900">
            Skip turn
          </button>
          <button onClick={()=>send('finish')} className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-pink-500 to-fuchsia-600">
            Finish Game
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Online: {members.map(m => m.name).join(", ") || "waiting…"}
        </div>
      </div>
    </div>
  );
}
