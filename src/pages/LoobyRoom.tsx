// src/pages/LobbyRoom.tsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../libs/axios";
import { echo } from "../libs/echo";
import { Globe, Lock, Users, Send, Copy, LogOut, Trophy, PlayCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Lobby = {
  id:number; code:string; name:string; max_players:number; entry_coins:number;
  privacy:"Public"|"Private"; status:"open"|"in_progress"|"ended";
  start_at?:string|null; host_id:number;
};
type Member = { id:number; name:string };
type Message = { id:number; user:Member; body:string; created_at:string };
type Session = {
  id:number; lobby_id:number; started_by:number;
  kind:"trivia"|"charades_ai"; status:"active"|"ended";
  settings?:any; result?:any; started_at:string; ended_at?:string|null;
};

export default function LobbyRoom() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
const lobbyIdRef = React.useRef<number | null>(null);
const sessionIdsRef = React.useRef<Set<number>>(new Set());

  const isHost = lobby && String(user?.id) === String(lobby.host_id);

    async function loadAll() {
    const meta = await api.get(`/lobbies/${code}`);
    setLobby(meta.data.lobby);
    lobbyIdRef.current = meta.data.lobby?.id ?? null;

    const msgs = await api.get(`/lobbies/${code}/messages`);
    setMessages(msgs.data);

    const sess = await api.get(`/lobbies/${code}/sessions`);
    setSessions(sess.data);
    }
function upsertSession(next: Session) {
  setSessions(prev => {
    const idx = prev.findIndex(s => s.id === next.id);
    if (idx === -1) {
      sessionIdsRef.current.add(next.id);
      return [next, ...prev];
    }
    const copy = prev.slice();
    copy[idx] = { ...prev[idx], ...next };
    return copy;
  });
}
useEffect(() => {
  const channelName = `presence-lobby.${code}`;
  let joined = false;

  (async () => {
    await loadAll();                        // ✅ ensure lobby is set first
    echo.join(channelName)
      .here((u:any[]) => setMembers(u))
      .joining((u:any) => setMembers(m => [...m, u]))
      .leaving((u:any) => setMembers(m => m.filter(x => x.id !== u.id)))
      .listen('LobbyMessageCreated', (e:any) => {
        setMessages(arr => [...arr, e]);
        setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 0);
      })
      .listen('LobbyGameStarted', (e:any) => {
        upsertSession({
            id: e.sessionId,
            lobby_id: lobbyIdRef.current ?? 0,
            started_by: e.started_by,
            kind: e.kind,
            status: 'active',
            settings: e.settings,
            started_at: new Date().toISOString(),
        } as Session);
      })
      .listen('LobbyGameEnded', (e:any) => {
            upsertSession({
                id: e.sessionId,
                status: 'ended',
                result: e.result,
                ended_at: e.ended_at,
            } as Partial<Session> as Session);
      });

    joined = true;
  })();

  return () => {
    if (joined) echo.leave(channelName);    // ✅ correct way to unsubscribe
  };
}, [code]);

async function sendMessage() {
  const body = input.trim();
  if (!body) return;
  setInput("");

  // 1) Optimistic add
  const me = {
    id: Number(localStorage.getItem("user_id") || 0),
    name: localStorage.getItem("user_name") || "You",
  };
  const optimisticId = Date.now();
  const optimistic: Message = {
    id: optimisticId,
    user: me,
    body,
    created_at: new Date().toISOString(),
  };
  setMessages((prev) => [...prev, optimistic]);
  setTimeout(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, 0);

  try {
    // 2) Send to API — controller returns { message: {...} }
    const { data } = await api.post(`/lobbies/${code}/messages`, { body });
    const real: Message = data.message;

    // 3) Swap optimistic with real (no duplicate, since broadcast is .toOthers())
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? real : m))
    );

    // optional re-scroll
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
  } catch (e: any) {
    // 4) Roll back if failed
    setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    alert(e?.response?.data?.message || e?.message || "Failed to send");
  }
}


  async function leave() {
    try {
      await api.post(`/lobbies/${code}/leave`);
      nav("/games");
    } catch (e:any) {
      alert(e.response?.data?.message || "Failed to leave");
    }
  }

  function copyInvite() {
    const url = `${window.location.origin}/lobby/${code}`;
    navigator.clipboard.writeText(url);
  }

    async function start(kind: 'trivia' | 'charades_ai') {
    const { data } = await api.post(`/lobbies/${code}/games/start`, {
        kind,
        settings: kind === 'trivia'
        ? { count: 10, secondsPerQ: 30 }
        : { secondsPerRound: 60, roundsPerTeam: 3 },
    });

    const s: Session = data.session;
    upsertSession(s); // ✅ show immediately, no duplicates
    window.dispatchEvent(new CustomEvent('open-lobby-game', { detail: { sessionId: s.id, kind, code } }));
    }


  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gradient-to-b from-rose-50 via-pink-50 to-white">
      {/* Main column */}
      <div className="lg:col-span-2 rounded-3xl border bg-gradient-to-b from-rose-50 via-pink-50 to-white p-5">
        {/* Header */}
        {lobby ? (
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-gray-500">Code {lobby.code}</div>
              <div className="text-2xl font-semibold text-gray-900">{lobby.name}</div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                {lobby.privacy === "Public"
                  ? <><Globe className="w-3.5 h-3.5"/><span>Public</span></>
                  : <><Lock className="w-3.5 h-3.5"/><span>Private</span></>}
                <span>•</span>
                <Users className="w-3.5 h-3.5"/><span>{members.length}/{lobby.max_players} online</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyInvite} className="rounded-xl px-3 py-2 border text-sm inline-flex items-center gap-1 hover:bg-gray-50">
                <Copy className="w-4 h-4"/> Invite
              </button>
              <button onClick={leave} className="rounded-xl px-3 py-2 border text-sm inline-flex items-center gap-1 hover:bg-gray-50">
                <LogOut className="w-4 h-4"/> Leave
              </button>
            </div>
          </div>
        ) : (
          <div className="h-9 w-32 bg-gray-100 rounded animate-pulse mb-4" />
        )}

        {/* Start buttons for host */}
        {isHost && (
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => start("trivia")}
              className="rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm inline-flex items-center gap-1">
              <PlayCircle className="w-4 h-4"/> Start Trivia
            </button>
            <button onClick={() => start("charades_ai")}
              className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50">
              Start Charades
            </button>
          </div>
        )}

        {/* Chat */}
        <div className="h-72 border rounded-2xl p-3 flex flex-col">
          <div ref={listRef} className="flex-1 overflow-y-auto space-y-2">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-400 mt-2">No messages yet.</div>
            ) : messages.map(m => (
              <div key={m.id} className="text-sm">
                <span className="font-medium text-gray-900">{m.user?.name ?? "User"}:</span>{" "}
                <span className="text-gray-700">{m.body}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={(e)=> e.key === "Enter" ? sendMessage() : undefined}
              className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="Type message…"
            />
            <button onClick={sendMessage}
              className="rounded-xl px-3 py-2 border hover:bg-gray-50 text-sm inline-flex items-center gap-1">
              <Send className="w-4 h-4"/> Send
            </button>
          </div>
        </div>
      </div>

      {/* Right column: Sessions */}
    <div className="rounded-3xl border bg-white p-5">
    <div className="font-semibold text-gray-900 mb-3">Games in this Lobby</div>

    {sessions.length === 0 ? (
        isHost ? (
        <div className="space-y-2">
            <div className="text-sm text-gray-500">No games yet. Start one:</div>
            <div className="flex gap-2">
            <button
                onClick={() => start("trivia")}
                className="rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
            >
                Start Trivia
            </button>
            <button
                onClick={() => start("charades_ai")}
                className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50"
            >
                Start Charades
            </button>
            </div>
        </div>
        ) : (
        <div className="text-sm text-gray-500">No games yet. Waiting for host…</div>
        )
    ) : (
        /* existing list of sessions */
        <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="rounded-xl border p-3 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-fuchsia-500" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {session.kind === "trivia" ? "Trivia" : "Charades"}
              </div>
              <div className="text-xs text-gray-500">
                Status: {session.status === "active" ? "Active" : "Ended"}
              </div>
            </div>
          </div>
        ))}
        </div>
    )}
    </div>
    </div>
  );
}
