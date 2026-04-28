// src/pages/LobbyRoom.tsx — PRESENCE FIXED
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../libs/axios";
import { echo } from "../libs/echo";
import {
  Globe, Lock, Users, Send, Copy, LogOut, Trophy, PlayCircle,
  Flame, Crown, Zap, ChevronRight, Sparkles, Wifi
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import TriviaDuoVsDuo from "../games/TriviaDuoVsDuo";
import CharadesAI from "../games/CharadesAI";
import HotSeat from "../games/HotSeat";
import WouldYouRather from "../games/WouldYouRather";
import SpiceDice from "../games/SpiceDice";

type Lobby = {
  id: number; code: string; name: string; max_players: number; entry_coins: number;
  privacy: "Public" | "Private"; status: "open" | "in_progress" | "ended";
  start_at?: string | null; host_id: number;
};
type Member = { id: number; name: string; avatar?: string | null };
type Message = { id: number; user: Member; body: string; created_at: string };
type GameKind = "trivia" | "charades_ai" | "hot_seat" | "would_you_rather" | "spice_dice";
type Session = {
  id: number; lobby_id: number; started_by: number;
  kind: GameKind; status: "active" | "ended";
  settings?: any; result?: any; started_at: string; ended_at?: string | null;
};

const GAME_MODES: { kind: GameKind; emoji: string; label: string; desc: string; minPlayers: number; vibe: string }[] = [
  { kind: "trivia",           emoji: "🧠", label: "Trivia Battle",    desc: "Buzz in, Team A vs B. Most points wins.",           minPlayers: 2, vibe: "Competitive" },
  { kind: "charades_ai",      emoji: "🎭", label: "AI Charades",       desc: "Act it out! AI generates unlimited cards.",          minPlayers: 3, vibe: "Hilarious"   },
  { kind: "hot_seat",         emoji: "🔥", label: "Hot Seat",          desc: "One person answers, everyone votes on honesty.",    minPlayers: 3, vibe: "Spicy"       },
  { kind: "would_you_rather", emoji: "🤔", label: "Would You Rather",  desc: "Vote A or B, then defend your choice in a debate.", minPlayers: 2, vibe: "Chaotic"     },
  { kind: "spice_dice",       emoji: "🎲", label: "Dare Dice",         desc: "Roll the dice, get a dare. Consent required.",      minPlayers: 2, vibe: "Bold"        },
];

const REACTIONS = ["🔥", "💀", "😂", "👀", "🎉", "😳", "❤️", "👏"];

export default function LobbyRoom() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [lobby, setLobby]       = useState<Lobby | null>(null);
  const [members, setMembers]   = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [input, setInput]       = useState("");
  const listRef                 = useRef<HTMLDivElement>(null);
  const lobbyIdRef              = useRef<number | null>(null);

  // FIX 3: presence ready flag — shows "Live" only after .here() fires
  const [presenceReady, setPresenceReady] = useState(false);

  const [activeGame, setActiveGame]   = useState<Session | null>(null);
  const [partyScores, setPartyScores] = useState<Record<string, number>>({});
  const [reactions, setReactions]     = useState<{ id: string; emoji: string }[]>([]);
  const [joinToast, setJoinToast]     = useState<string | null>(null);

  const isHost      = lobby && String(user?.id) === String(lobby.host_id);

  async function loadAll() {
    try {
      const [metaRes, msgsRes, sessRes] = await Promise.all([
        api.get(`/lobbies/${code}`),
        api.get(`/lobbies/${code}/messages`),
        api.get(`/lobbies/${code}/sessions`),
      ]);
      setLobby(metaRes.data.lobby);
      lobbyIdRef.current = metaRes.data.lobby?.id ?? null;
      setMessages(msgsRes.data);
      setSessions(sessRes.data);

      // FIX 2: fetch members from REST so list isn't empty while presence loads
      // Requires: GET /api/lobbies/{code}/members → [{id, name}, ...]
      // See the Laravel controller snippet in channels.php output
      try {
        const membersRes = await api.get(`/lobbies/${code}/members`);
        // console.log("Fetched members:", membersRes.data?.members);
        setMembers(prev => prev.length === 0 ? (membersRes.data?.members ?? []) : prev);
      } catch {
        // endpoint may not exist yet — presence will handle it
      }
    } catch (e) {
      console.error("[LobbyRoom] loadAll failed:", e);
    }
  }
  // console.log("LobbyRoom render", { lobby, members, messages, sessions, activeGame });
  const memberNames = members.map(m => m.name);

  function upsertSession(next: Partial<Session> & { id: number }) {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === next.id);
      if (idx === -1) return [next as Session, ...prev];
      const copy = prev.slice(); copy[idx] = { ...prev[idx], ...next }; return copy;
    });
  }

  function showJoinToast(name: string) {
    setJoinToast(name);
    setTimeout(() => setJoinToast(null), 2500);
  }

  useEffect(() => {
    (async () => {
      await loadAll();

      echo.join(`presence-lobby.${code}`)
        .here((users: Member[]) => {
          // FIX 1+2: .here() fires once with ALL current members after successful
          // presence auth. Override REST data with authoritative live list.
          console.info(`[Echo] .here() — ${users.length} members online`);
          setMembers(users);
          setPresenceReady(true);
        })
        .joining((u: Member) => {
          setMembers(m => m.find(x => x.id === u.id) ? m : [...m, u]);
          showJoinToast(u.name);
        })
        .leaving((u: Member) => {
          setMembers(m => m.filter(x => x.id !== u.id));
        })
        .listen("LobbyMessageCreated", (e: any) => {
          setMessages(arr => [...arr, e]);
          setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 0);
        })
        .listen("LobbyGameStarted", (e: any) => {
          const s: Session = {
            id: e.sessionId, lobby_id: lobbyIdRef.current ?? 0,
            started_by: e.started_by, kind: e.kind,
            status: "active", settings: e.settings,
            started_at: new Date().toISOString(),
          };
          upsertSession(s);
          setActiveGame(s);
        })
        .listen("LobbyGameEnded", (e: any) => {
          upsertSession({ id: e.sessionId, status: "ended", result: e.result, ended_at: e.ended_at });
          setActiveGame(null);
        });
    })();

    return () => { echo.leave(`presence-lobby.${code}`); };
  }, [code]);

  async function sendMessage() {
    const body = input.trim(); if (!body) return;
    setInput("");
    const optimistic: Message = {
      id: Date.now(), user: { id: user?.id ?? 0, name: user?.name ?? "You" },
      body, created_at: new Date().toISOString(),
    };
    setMessages(p => [...p, optimistic]);
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 0);
    try {
      const { data } = await api.post(`/lobbies/${code}/messages`, { body });
      setMessages(p => p.map(m => m.id === optimistic.id ? data.message : m));
    } catch { setMessages(p => p.filter(m => m.id !== optimistic.id)); }
  }

  async function leave() {
    try { await api.post(`/lobbies/${code}/leave`); nav("/games"); }
    catch (e: any) { alert(e?.response?.data?.message ?? "Failed to leave"); }
  }

  function copyInvite() { navigator.clipboard.writeText(`${window.location.origin}/lobby/${code}`); }

  async function startGame(kind: GameKind) {
    const settingsMap: Record<GameKind, any> = {
      trivia: { count: 10, secondsPerQ: 30 },
      charades_ai: { secondsPerRound: 60, roundsPerTeam: 3 },
      hot_seat: { players: memberNames },
      would_you_rather: { players: memberNames },
      spice_dice: {},
    };
    const { data } = await api.post(`/lobbies/${code}/games/start`, { kind, settings: settingsMap[kind] });
    upsertSession(data.session);
    setActiveGame(data.session);
  }

  async function endActiveGame(result: any) {
    if (!activeGame) return;
    if (result?.meta?.scores) {
      setPartyScores(prev => {
        const next = { ...prev };
        Object.entries(result.meta.scores as Record<string, number>).forEach(([name, pts]) => {
          next[name] = (next[name] ?? 0) + pts;
        });
        return next;
      });
    }
    await api.post(`/lobbies/${code}/games/${activeGame.id}/end`, { result });
    setActiveGame(null);
  }

  function sendReaction(emoji: string) {
    const id = `${Date.now()}-${Math.random()}`;
    setReactions(r => [...r, { id, emoji }]);
    setTimeout(() => setReactions(r => r.filter(x => x.id !== id)), 1800);
  }

  const modeInfo     = (kind: string) => GAME_MODES.find(m => m.kind === kind);
  const displayCount = members.length;
  const displayMax   = lobby?.max_players ?? 4;

  function renderActiveGame() {
    if (!activeGame) return null;
    const common = { onFinish: endActiveGame };
    switch (activeGame.kind) {
      case "trivia":           return <TriviaDuoVsDuo {...common} count={10} secondsPerQ={30} category="General" difficulty="Medium" />;
      case "charades_ai":      return <CharadesAI {...common} secondsPerRound={60} roundsPerTeam={3} category="General" difficulty="Easy" />;
      case "hot_seat":         return <HotSeat {...common} players={memberNames} />;
      case "would_you_rather": return <WouldYouRather {...common} players={memberNames} />;
      case "spice_dice":       return <SpiceDice {...common} />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white p-4 md:p-6">

      <AnimatePresence>
        {joinToast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
            🎉 {joinToast} joined the party!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-24 right-6 z-50 pointer-events-none">
        <AnimatePresence>
          {reactions.map(r => (
            <motion.div key={r.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -60, scale: 1.4 }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ duration: 1.5 }}
              className="text-3xl">{r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Header */}
          <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
            {lobby ? (
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {lobby.privacy === "Public" ? <Globe className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-amber-500" />}
                    <span className="text-xs text-gray-500">Code: <b className="font-mono">{lobby.code}</b></span>
                    {/* Presence live indicator */}
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                      presenceReady ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-400 border-gray-200"
                    }`}>
                      <Wifi className="w-3 h-3" />
                      {presenceReady ? "Live" : "Connecting…"}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{lobby.name}</h1>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {/* Real count driven by presence .here() */}
                      {displayCount}/{displayMax} online
                    </span>
                    {isHost && <span className="flex items-center gap-1 text-amber-600"><Crown className="w-4 h-4" /> You're the host</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={copyInvite} className="rounded-xl px-3 py-2 border text-sm inline-flex items-center gap-1 hover:bg-gray-50">
                    <Copy className="w-4 h-4" /> Invite
                  </button>
                  <button onClick={leave} className="rounded-xl px-3 py-2 border text-sm inline-flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50">
                    <LogOut className="w-4 h-4" /> Leave
                  </button>
                </div>
              </div>
            ) : <div className="h-20 animate-pulse bg-gray-100 rounded-2xl" />}
          </div>

          {/* Active game */}
          <AnimatePresence>
            {activeGame && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{modeInfo(activeGame.kind)?.emoji}</span>
                    <div>
                      <div className="font-bold text-gray-900">{modeInfo(activeGame.kind)?.label}</div>
                      <div className="text-xs text-emerald-600 font-medium">● Live now</div>
                    </div>
                  </div>
                  {isHost && (
                    <button onClick={() => endActiveGame({})} className="rounded-xl px-3 py-1.5 border text-xs text-red-600 border-red-200 hover:bg-red-50">
                      End Game
                    </button>
                  )}
                </div>
                {renderActiveGame()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game picker — host only */}
          {isHost && !activeGame && (
            <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
              <div className="mb-4">
                <div className="font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-fuchsia-500" /> Start a Game
                </div>
                <div className="text-xs text-gray-500">{displayCount} player{displayCount !== 1 ? "s" : ""} in the room</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GAME_MODES.filter(m => displayCount >= m.minPlayers).map(mode => (
                  <button key={mode.kind} onClick={() => startGame(mode.kind)}
                    className="text-left rounded-2xl border border-rose-100 p-4 hover:shadow-md hover:border-fuchsia-200 transition group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl">{mode.emoji}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        mode.vibe === "Spicy" ? "bg-orange-100 text-orange-700" :
                        mode.vibe === "Competitive" ? "bg-blue-100 text-blue-700" :
                        mode.vibe === "Hilarious" ? "bg-yellow-100 text-yellow-700" :
                        mode.vibe === "Chaotic" ? "bg-purple-100 text-purple-700" :
                        "bg-rose-100 text-rose-700"
                      }`}>{mode.vibe}</span>
                    </div>
                    <div className="font-semibold text-gray-900 text-sm">{mode.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{mode.desc}</div>
                    <div className="mt-2 flex items-center gap-1 text-fuchsia-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition">
                      <PlayCircle className="w-3.5 h-3.5" /> Start now <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
              {displayCount < 2 && (
                <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                  💡 Waiting for players… Share code: <b className="font-mono">{code}</b>
                </div>
              )}
              {displayCount >= 2 && displayCount < 3 && (
                <div className="mt-3 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
                  💡 Invite 1 more to unlock Hot Seat and Charades
                </div>
              )}
            </div>
          )}

          {!isHost && !activeGame && (
            <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5 text-center py-8">
              <div className="text-3xl mb-2">⏳</div>
              <div className="font-semibold text-gray-900">Waiting for host to start a game</div>
              <div className="text-sm text-gray-500 mt-1">{displayCount} player{displayCount !== 1 ? "s" : ""} online</div>
            </div>
          )}

          {/* Chat */}
          <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
            <div className="font-semibold text-gray-900 mb-3">Party Chat</div>
            <div ref={listRef} className="h-48 overflow-y-auto space-y-2 mb-3">
              {messages.length === 0
                ? <div className="text-sm text-gray-400 text-center py-6">No messages yet. Say hi! 👋</div>
                : messages.map(m => (
                  <div key={m.id} className="text-sm">
                    <span className="font-medium text-fuchsia-700">{m.user?.name ?? "User"}: </span>
                    <span className="text-gray-700">{m.body}</span>
                  </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {REACTIONS.map(e => (
                <button key={e} onClick={() => sendReaction(e)} className="text-lg px-2 py-1 rounded-xl border hover:bg-gray-50 active:scale-125 transition">{e}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                placeholder="Type a message…" />
              <button onClick={sendMessage} className="rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {sessions.length > 0 && (
            <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
              <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-fuchsia-500" /> Games Played
              </div>
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{modeInfo(s.kind)?.emoji ?? "🎮"}</span>
                      <div>
                        <div className="font-medium text-gray-900">{modeInfo(s.kind)?.label ?? s.kind}</div>
                        <div className="text-xs text-gray-500">{s.status === "active" ? "🟢 Live" : "✅ Finished"}</div>
                      </div>
                    </div>
                    {s.result?.meta?.winner && (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full flex items-center gap-1">
                        <Crown className="w-3 h-3" /> {s.result.meta.winner}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
            <div className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-fuchsia-500" />
                Players ({displayCount}/{displayMax})
              </div>
              {!presenceReady && <span className="text-xs text-gray-400 animate-pulse">syncing…</span>}
            </div>
            {members.length === 0 && !presenceReady ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-gray-100" />
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-sm text-gray-400">No players yet</div>
            ) : (
              <div className="space-y-2">
                {members.map(m => (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold flex-shrink-0">
                        {m.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{m.name}</span>
                      {lobby && String(m.id) === String(lobby.host_id) && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    {partyScores[m.name] ? <span className="text-xs text-fuchsia-700 font-semibold">{partyScores[m.name]}pts</span> : null}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {Object.keys(partyScores).length > 0 && (
            <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
              <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Party Leaderboard
              </div>
              <div className="space-y-2">
                {Object.entries(partyScores).sort((a, b) => b[1] - a[1]).map(([name, pts], i) => (
                  <div key={name} className={`flex items-center justify-between rounded-xl px-3 py-2 ${i === 0 ? "bg-amber-50 border border-amber-200" : "border"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                      {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                      <span className="text-sm font-medium text-gray-900">{name}</span>
                    </div>
                    <span className="text-sm font-bold text-fuchsia-700">{pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-5">
            <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" /> React Live
            </div>
            <div className="grid grid-cols-4 gap-2">
              {REACTIONS.map(e => (
                <button key={e} onClick={() => sendReaction(e)} className="text-2xl aspect-square rounded-2xl border hover:bg-rose-50 active:scale-110 transition">{e}</button>
              ))}
            </div>
          </div>

          {!activeGame && (
            <div className="rounded-3xl bg-gradient-to-br from-fuchsia-50 to-rose-50 border border-rose-100 p-5">
              <div className="text-xs font-semibold text-fuchsia-700 mb-2 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Suggested for {displayCount} players
              </div>
              <div className="space-y-1.5">
                {GAME_MODES.filter(m => displayCount >= m.minPlayers).slice(0, 3).map(m => (
                  <button key={m.kind} onClick={() => isHost ? startGame(m.kind) : undefined}
                    className={`w-full text-left rounded-xl px-3 py-2 text-xs border transition ${isHost ? "hover:bg-white hover:shadow cursor-pointer" : "cursor-default opacity-70"}`}>
                    {m.emoji} <b>{m.label}</b> — {m.vibe}
                  </button>
                ))}
                {displayCount < 2 && <div className="text-xs text-gray-400 text-center py-2">Waiting for players to join…</div>}
                {!isHost && displayCount >= 2 && <div className="text-xs text-gray-400 text-center mt-2">Ask the host to start a game</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}