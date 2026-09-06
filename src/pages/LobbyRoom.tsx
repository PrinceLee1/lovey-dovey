// src/pages/LobbyRoom.tsx — CHAT FIXED + WHATSAPP UI + REALTIME REACTIONS
//
// FIXES:
//  1. No more duplicate messages — optimistic ID is replaced by real server ID,
//     and broadcast events skip messages already in state by server ID
//  2. WhatsApp-style chat — own messages right (pink), others left (gray)
//  3. Reactions are real-time — backend fires LobbyReactionSent,
//     frontend listens and shows floating emoji for all players

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../libs/axios";
import { echo } from "../libs/echo";
import {
  Globe, Lock, Users, Send, Copy, LogOut, Trophy, PlayCircle,
  Flame, Crown, Zap, ChevronRight, Sparkles, Wifi, Check, CheckCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import SyncedLobbyGameRunner from "../games/SyncedLobbyGameRunner";
import { useToast } from "../context/ToastContext";
import { usePresenceMap } from "../context/PresenceContext";
import { useGameInvitesContext } from "../context/GameInvitesContext";
import { UserPlus } from "lucide-react";
type Lobby   = { id: number; code: string; name: string; max_players: number; privacy: "Public"|"Private"; status: string; host_id: number; start_at?: string|null };
type Member  = { id: number; name: string; avatar?: string|null };
type Message = {
  id: number;
  tempId?: number;   // optimistic ID before server confirms
  user: Member;
  body: string;
  created_at: string;
  confirmed?: boolean; // true once server has confirmed
};
type GameKind = "trivia"|"charades_ai"|"hot_seat"|"would_you_rather"|"spice_dice";
type Session  = { id: number; lobby_id: number; started_by: number; kind: GameKind; status: "active"|"ended"; settings?: any; result?: any; started_at: string; ended_at?: string|null };

const GAME_MODES = [
  { kind: "trivia"           as GameKind, emoji: "🧠", label: "Trivia Battle",   desc: "Buzz in, Team A vs B.",             minPlayers: 2, vibe: "Competitive" },
  { kind: "charades_ai"      as GameKind, emoji: "🎭", label: "AI Charades",      desc: "Act it out! AI cards.",             minPlayers: 3, vibe: "Hilarious"   },
  { kind: "hot_seat"         as GameKind, emoji: "🔥", label: "Hot Seat",         desc: "Answer & everyone votes.",          minPlayers: 3, vibe: "Spicy"       },
  { kind: "would_you_rather" as GameKind, emoji: "🤔", label: "Would You Rather", desc: "Vote then defend your choice.",     minPlayers: 2, vibe: "Chaotic"     },
  { kind: "spice_dice"       as GameKind, emoji: "🎲", label: "Dare Dice",        desc: "Roll the dice, get a dare.",        minPlayers: 2, vibe: "Bold"        },
];

const REACTIONS = ["🔥","💀","😂","👀","🎉","😳","❤️","👏"];
const POLL_MS   = 3000;

export default function LobbyRoom() {
  const { code = "" } = useParams();
  const nav            = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user }       = useAuth();
  const { toast } = useToast();
  const presenceMap = usePresenceMap();
  const { sendInvite } = useGameInvitesContext();

  const [lobby, setLobby]               = useState<Lobby|null>(null);
  const [members, setMembers]           = useState<Member[]>([]);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [activeGame, setActiveGame]     = useState<Session|null>(null);
  const [input, setInput]               = useState("");
  const [presenceReady, setPresenceReady] = useState(false);
  const [partyScores, setPartyScores]   = useState<Record<string,number>>({});
  const [floatingReactions, setFloatingReactions] = useState<{id:string; emoji:string; x:number}[]>([]);
  const [joinToast, setJoinToast]       = useState<string|null>(null);
  const [friends, setFriends]           = useState<{ id: number; name: string; avatar_url: string | null; presence_status: string | null }[]>([]);
  const [catalogIdByKind, setCatalogIdByKind] = useState<Record<string, number>>({});
  const [invitedIds, setInvitedIds]     = useState<Set<number>>(new Set());
  const [invitingId, setInvitingId]     = useState<number|null>(null);

  const listRef     = useRef<HTMLDivElement>(null);
  const lobbyIdRef  = useRef<number|null>(null);
  const presenceRef = useRef(false);
  const pollRef     = useRef<number|null>(null);
  // Track real server IDs we've received via broadcast to avoid duplicates
  const receivedServerIds = useRef<Set<number>>(new Set());
  const autoInvitedRef = useRef<string | null>(null);

  const isHost      = lobby && String(user?.id) === String(lobby.host_id);
  const memberNames = members.map(m => m.name);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 50);
  }, []);

  // Normalize avatar field — backend may send avatar_url OR avatar on user object
  function normalizeMessage(m: any): Message {
    return {
      ...m,
      user: {
        ...m.user,
        avatar: m.user?.avatar ?? m.user?.avatar_url ?? null,
      },
    };
  }

  // ── Add a floating reaction bubble ────────────────────────────────────────
  function showReaction(emoji: string) {
    const id = `${Date.now()}-${Math.random()}`;
    const x  = 20 + Math.random() * 60; // random horizontal position %
    setFloatingReactions(r => [...r, { id, emoji, x }]);
    setTimeout(() => setFloatingReactions(r => r.filter(x => x.id !== id)), 2000);
  }

  // ── Merge messages — NO DUPLICATES ────────────────────────────────────────
  // Uses server ID to deduplicate. Replaces optimistic (tempId) with real message.
  function addServerMessage(incoming: any) {
    const msg = normalizeMessage(incoming);
    if (receivedServerIds.current.has(msg.id)) return;
    receivedServerIds.current.add(msg.id);
    setMessages(prev => {
      const optimisticIdx = prev.findIndex(
        m => m.tempId !== undefined && m.user.id === msg.user.id && !m.confirmed
      );
      if (optimisticIdx !== -1) {
        const copy = prev.slice();
        copy[optimisticIdx] = { ...msg, confirmed: true };
        return copy;
      }
      return [...prev, { ...msg, confirmed: true }];
    });
    scrollToBottom();
  }

  function loadMessages(data: any[]) {
    const normalized = data.map(normalizeMessage);
    normalized.forEach(m => receivedServerIds.current.add(m.id));
    setMessages(normalized.map(m => ({ ...m, confirmed: true })));
  }

  // ── Poll fallback ─────────────────────────────────────────────────────────
  const pollData = useCallback(async () => {
    if (presenceRef.current) return;
    try {
      const [msgRes, sessRes] = await Promise.all([
        api.get(`/lobbies/${code}/messages`),
        api.get(`/lobbies/${code}/sessions`),
      ]);
      // Only add NEW messages we haven't seen
      const incoming: Message[] = msgRes.data ?? [];
      incoming.forEach(m => {
        if (!receivedServerIds.current.has(m.id)) {
          receivedServerIds.current.add(m.id);
          setMessages(prev => [...prev, { ...m, confirmed: true }]);
        }
      });
      const newSess: Session[] = sessRes.data ?? [];
      setSessions(newSess);
      const active = newSess.find(s => s.status === "active");
      setActiveGame(prev => active ? (prev?.id === active.id ? prev : active) : null);
    } catch { /* silent */ }
  }, [code]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // Route through the same capacity/status-checked join used by the
        // dashboard's "Join" button — visiting an invite link directly must
        // not bypass it. Idempotent for existing members (including host).
        try {
          await api.post(`/lobbies/${code}/join`);
        } catch (e: any) {
          const message = e?.response?.data?.message ?? "Unable to join this lobby";
          toast.error(message);
          nav("/games");
          return;
        }

        const [metaRes, msgRes, sessRes] = await Promise.all([
          api.get(`/lobbies/${code}`),
          api.get(`/lobbies/${code}/messages`),
          api.get(`/lobbies/${code}/sessions`),
        ]);
        const lb: Lobby = metaRes.data.lobby;
        setLobby(lb);
        lobbyIdRef.current = lb?.id ?? null;
        loadMessages(msgRes.data ?? []);
        const sess: Session[] = sessRes.data ?? [];
        setSessions(sess);
        const active = sess.find(s => s.status === "active");
        if (active) setActiveGame(active);
        try {
          const mRes = await api.get(`/lobbies/${code}/members`);
          setMembers(prev => prev.length === 0 ? (mRes.data?.members ?? mRes.data ?? []) : prev);
        } catch { /* no members endpoint yet */ }
      } catch (e) { console.error("[LobbyRoom] load failed:", e); }
    })();
  }, [code]);

  // ── Fallback poll ─────────────────────────────────────────────────────────
  useEffect(() => {
    pollRef.current = window.setInterval(pollData, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollData]);

  // ── Friends + game catalog (for the "Invite Friends" panel) ────────────────
  useEffect(() => {
    api.get("/friends").then(({ data }) => setFriends(data.friends ?? [])).catch(() => {});
    api.get("/games").then(({ data }) => {
      const map: Record<string, number> = {};
      for (const g of (data.games ?? []) as { id: number; kind: string }[]) map[g.kind] = g.id;
      setCatalogIdByKind(map);
    }).catch(() => {});
  }, []);

  // ── Presence + live events ────────────────────────────────────────────────
  useEffect(() => {
    echo.join(`lobby.${code}`)
      .here((users: Member[]) => {
        setMembers(users);
        setPresenceReady(true);
        presenceRef.current = true;
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      })
      .joining((u: Member) => {
        setMembers(m => m.find(x => x.id === u.id) ? m : [...m, u]);
        setJoinToast(u.name);
        setTimeout(() => setJoinToast(null), 2500);
      })
      .leaving((u: Member) => {
        setMembers(m => m.filter(x => x.id !== u.id));
      })
      // ── Chat: only adds messages from OTHER players ───────────────────────
      // Our own messages are already shown optimistically and replaced via addServerMessage
      .listen(".LobbyMessageCreated", (e: any) => {
        const msg: Message = e.message ?? e;
        addServerMessage(msg);
      })
      // ── Reactions: real-time for ALL players ──────────────────────────────
      // Backend: broadcast(new LobbyReactionSent($emoji))->toOthers() in LobbyController
      .listen(".LobbyReactionSent", (e: any) => {
        showReaction(e.emoji);
      })
      .listen(".LobbyGameStarted", (e: any) => {
        const s: Session = {
          id: e.session?.id ?? e.sessionId,
          lobby_id: lobbyIdRef.current ?? 0,
          started_by: e.session?.started_by ?? e.started_by,
          kind: e.session?.kind ?? e.kind,
          status: "active",
          settings: e.session?.settings ?? e.settings,
          started_at: new Date().toISOString(),
        };
        setSessions(prev => {
          const idx = prev.findIndex(x => x.id === s.id);
          if (idx === -1) return [s, ...prev];
          const c = prev.slice(); c[idx] = { ...prev[idx], ...s }; return c;
        });
        setActiveGame(s);
      })
      .listen(".LobbyGameEnded", (e: any) => {
        setSessions(prev => {
          const idx = prev.findIndex(x => x.id === (e.session?.id ?? e.sessionId));
          if (idx === -1) return prev;
          const c = prev.slice(); c[idx] = { ...prev[idx], status: "ended", result: e.result ?? {} }; return c;
        });
        setActiveGame(null);
      });

    return () => { echo.leave(`lobby.${code}`); };
  }, [code]);

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    const body = input.trim();
    if (!body) return;
    setInput("");

    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      tempId,
      user: {
        id: user?.id ?? 0,
        name: user?.name ?? "You",
        avatar: (user as any)?.avatar_url ?? (user as any)?.avatar ?? null,
      },
      body,
      created_at: new Date().toISOString(),
      confirmed: false,
    };

    setMessages(p => [...p, optimistic]);
    scrollToBottom();

    try {
      const { data } = await api.post(`/lobbies/${code}/messages`, { body });
      const real: Message = data.message ?? optimistic;
      // Mark the real server ID as received so broadcast event skips it
      receivedServerIds.current.add(real.id);
      // Replace optimistic with confirmed real message
      setMessages(p => p.map(m => m.tempId === tempId ? { ...real, confirmed: true } : m));
    } catch {
      // Remove optimistic on failure
      setMessages(p => p.filter(m => m.tempId !== tempId));
    }
  }

  // ── Send reaction ─────────────────────────────────────────────────────────
  async function sendReaction(emoji: string) {
    showReaction(emoji); // show locally immediately
    try {
      await api.post(`/lobbies/${code}/reactions`, { emoji });
      // Backend fires LobbyReactionSent event → other players see it via .listen()
    } catch { /* silent */ }
  }

  // ── Other actions ─────────────────────────────────────────────────────────
  async function leave() {
    try { await api.post(`/lobbies/${code}/leave`); nav("/games"); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed to leave"); }
  }

  function copyInvite() { navigator.clipboard.writeText(`${window.location.origin}/lobby/${code}`); }

  async function startGame(kind: GameKind) {
    //check if game time have reached before allowing host to start a game.
    const now = new Date();
    if (lobby?.start_at && new Date(lobby.start_at) > now) {
      toast.info(`The game is scheduled to start at ${formatTime(lobby.start_at)}. Please wait until then to start the game.`);
      return;
    }
    const active = sessions.find(s => s.status === "active");
    if (active) {
      toast.info("A game is already in progress. Please wait for it to finish before starting a new one.");
      return;
    }
    const settingsMap: Record<GameKind,any> = {
      trivia: { count:10, secondsPerQ:30 },
      charades_ai: { secondsPerRound:60, roundsPerTeam:3 },
      hot_seat: { players: memberNames },
      would_you_rather: { players: memberNames },
      spice_dice: {},
    };
    const { data } = await api.post(`/lobbies/${code}/games/start`, { kind, settings: settingsMap[kind] });
    const s: Session = data.session;
    setSessions(prev => { const idx = prev.findIndex(x => x.id === s.id); if (idx === -1) return [s,...prev]; const c=prev.slice(); c[idx]={...prev[idx],...s}; return c; });
    setActiveGame(s);
  }

  async function endActiveGame(result: any) {
    if (!activeGame) return;
    if (result?.meta?.scores) {
      setPartyScores(prev => {
        const next = { ...prev };
        Object.entries(result.meta.scores as Record<string,number>).forEach(([name,pts]) => { next[name] = (next[name]??0)+pts; });
        return next;
      });
    }
    try {
      await api.post(`/lobbies/${code}/games/${activeGame.id}/end`, { result });
      setActiveGame(null);
    } catch (e: any) {
      // Only the host can end a session server-side — surface anything else.
      toast.error(e?.message ?? "Couldn't end the game");
    }
  }

  const modeInfo     = (kind: string) => GAME_MODES.find(m => m.kind === kind);
  const displayCount = members.length;
  const displayMax   = lobby?.max_players ?? 4;

  // The game currently selected for this lobby, for invite purposes: the
  // active session's kind if one is running, otherwise whichever GAME_MODE
  // is first suggested (same list/order the "Suggested" card below uses).
  // Not every lobby game kind has a row in the `games` catalog table
  // (hot_seat / would_you_rather are lobby-only, started ad hoc), so we only
  // ever pick one that resolves to a real game_id.
  const inviteGameKind = activeGame?.kind ?? GAME_MODES.find(m => catalogIdByKind[m.kind])?.kind;
  const inviteGameId   = inviteGameKind ? catalogIdByKind[inviteGameKind] : undefined;

  const memberIds = new Set(members.map(m => m.id));
  const onlineFriends = friends.filter(f => {
    const status = presenceMap[f.id]?.status ?? f.presence_status ?? "offline";
    return (status === "online" || status === "idle") && !memberIds.has(f.id);
  });

  async function inviteFriendToLobby(friendId: number) {
    if (!lobby || !inviteGameId) return;
    setInvitingId(friendId);
    try {
      await sendInvite(friendId, inviteGameId, lobby.id);
      setInvitedIds(prev => new Set(prev).add(friendId));
      toast.success("Invite sent!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't send invite");
    } finally {
      setInvitingId(null);
    }
  }

  // ── Auto-invite a friend pre-selected on the Friends page (?inviteFriend=id) ─
  useEffect(() => {
    const pending = searchParams.get("inviteFriend");
    if (!pending || !lobby || !inviteGameId) return;
    // Guards against firing twice for the same query value — React 18
    // StrictMode double-invokes effects in dev, and this send isn't
    // idempotent on the backend (each call creates a new invite row).
    if (autoInvitedRef.current === pending) return;
    autoInvitedRef.current = pending;

    inviteFriendToLobby(Number(pending)).finally(() => {
      searchParams.delete("inviteFriend");
      setSearchParams(searchParams, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby, inviteGameId]);

  // ── Time formatter ────────────────────────────────────────────────────────
  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderActiveGame() {
    if (!activeGame || !lobby) return null;
    return (
      <SyncedLobbyGameRunner
        kind={activeGame.kind}
        sessionId={activeGame.id}
        lobbyCode={code}
        hostId={lobby.host_id}
        players={memberNames}
        onFinish={endActiveGame}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white dark:from-[#0b0b12] dark:via-[#100c17] dark:to-[#0b0b12] p-4 md:p-6">

      {/* Join toast */}
      <AnimatePresence>
        {joinToast && (
          <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
            🎉 {joinToast} joined the party!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating reactions — full screen overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: "90vh", scale: 0.5 }}
              animate={{ opacity: 1, y: "10vh", scale: 1.6 }}
              exit={{ opacity: 0, y: "0vh", scale: 0.8 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              style={{ position: "absolute", left: `${r.x}%`, bottom: 0 }}
              className="text-4xl select-none"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Header */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5">
            {lobby ? (
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {lobby.privacy === "Public" ? <Globe className="w-4 h-4 text-emerald-500"/> : <Lock className="w-4 h-4 text-amber-500"/>}
                    <span className="text-xs text-gray-500 dark:text-gray-400">Code: <b className="font-mono">{lobby.code}</b></span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${presenceReady ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900"}`}>
                      <Wifi className="w-3 h-3"/>
                      {presenceReady ? "Live" : "Polling…"}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{lobby.name}</h1>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4"/>{displayCount}/{displayMax} online</span>
                    {isHost && <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><Crown className="w-4 h-4"/> You're the host</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={copyInvite} className="rounded-xl px-3 py-2 border dark:border-gray-700 dark:text-gray-200 text-sm inline-flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-800"><Copy className="w-4 h-4"/> Invite</button>
                  <button onClick={leave} className="rounded-xl px-3 py-2 border text-sm inline-flex items-center gap-1 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40"><LogOut className="w-4 h-4"/> Leave</button>
                </div>
              </div>
            ) : <div className="h-20 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl"/>}
          </div>

          {/* Active game */}
          <AnimatePresence>
            {activeGame && (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{modeInfo(activeGame.kind)?.emoji}</span>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">{modeInfo(activeGame.kind)?.label}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">● Live now</div>
                    </div>
                  </div>
                  {isHost && <button onClick={() => endActiveGame({})} className="rounded-xl px-3 py-1.5 border text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40">End Game</button>}
                </div>
                {renderActiveGame()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game picker */}
          {isHost && !activeGame && (
            <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5">
              <div className="mb-4">
                <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Sparkles className="w-5 h-5 text-fuchsia-500"/> Start a Game</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{displayCount} player{displayCount !== 1 ? "s" : ""} in the room</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GAME_MODES.filter(m => displayCount >= m.minPlayers).map(mode => (
                  <button key={mode.kind} onClick={() => startGame(mode.kind)}
                    className="text-left rounded-2xl border border-rose-100 dark:border-gray-800 p-4 hover:shadow-md hover:border-fuchsia-200 dark:hover:border-fuchsia-800 transition group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl">{mode.emoji}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        mode.vibe==="Spicy"?"bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300":
                        mode.vibe==="Competitive"?"bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300":
                        mode.vibe==="Hilarious"?"bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300":
                        mode.vibe==="Chaotic"?"bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300":
                        "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"}`}>{mode.vibe}</span>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{mode.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{mode.desc}</div>
                    <div className="mt-2 flex items-center gap-1 text-fuchsia-600 dark:text-fuchsia-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition">
                      <PlayCircle className="w-3.5 h-3.5"/> Start now <ChevronRight className="w-3.5 h-3.5"/>
                    </div>
                  </button>
                ))}
              </div>
              {displayCount < 2 && <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">💡 Share code: <b className="font-mono">{code}</b> to invite players</div>}
              {displayCount >= 2 && displayCount < 3 && <div className="mt-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">💡 Invite 1 more to unlock Hot Seat and Charades</div>}
            </div>
          )}

          {!isHost && !activeGame && (
            <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5 text-center py-8">
              <div className="text-3xl mb-2">⏳</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">Waiting for host to start a game</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{displayCount} player{displayCount!==1?"s":""} online</div>
            </div>
          )}

          {/* ── WHATSAPP-STYLE CHAT ──────────────────────────────────────── */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 overflow-hidden">
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-rose-50 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 grid place-items-center text-white text-sm font-bold">
                  {lobby?.name?.[0] ?? "L"}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{lobby?.name ?? "Party Chat"}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">{displayCount} online</div>
                </div>
              </div>
              {/* Quick reactions in header */}
              <div className="flex gap-1">
                {REACTIONS.slice(0, 4).map(e => (
                  <button key={e} onClick={() => sendReaction(e)}
                    className="text-base px-1.5 py-1 rounded-xl hover:bg-rose-50 dark:hover:bg-gray-800 active:scale-125 transition">
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Message list */}
            <div
              ref={listRef}
              className="h-72 overflow-y-auto px-4 py-4 space-y-2 bg-gradient-to-b from-rose-50 via-pink-100 to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-3xl mb-2">💬</div>
                  <div className="text-sm text-gray-400 dark:text-gray-500">No messages yet</div>
                  <div className="text-xs text-gray-300 dark:text-gray-600 mt-1">Say hi to the group! 👋</div>
                </div>
              ) : (
                messages.map((m, i) => {
                  const isMe = String(m.user.id) === String(user?.id);
                  const prevMsg = messages[i - 1];
                  const showName = !isMe && (!prevMsg || prevMsg.user.id !== m.user.id);
                  const showAvatar = !isMe && (!messages[i + 1] || messages[i + 1].user.id !== m.user.id);

                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar — only for others, only on last message in a group */}
                      <div className="w-7 flex-shrink-0">
                        {showAvatar ? (
                          m.user.avatar
                            ? <img src={m.user.avatar} alt={m.user.name} className="h-7 w-7 rounded-full object-cover ring-1 ring-rose-100"/>
                            : <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold">
                                {m.user.name[0]?.toUpperCase()}
                              </div>
                        ) : null}
                      </div>

                      <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                        {/* Sender name — only for others, first in group */}
                        {showName && (
                          <span className="text-xs text-fuchsia-600 font-semibold mb-0.5 ml-1">
                            {m.user.name}
                          </span>
                        )}

                        {/* Bubble */}
                        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white rounded-br-sm"
                            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-rose-100 dark:border-gray-700 rounded-bl-sm"
                        }`}>
                          {m.body}
                        </div>

                        {/* Timestamp + delivery status */}
                        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTime(m.created_at)}</span>
                          {isMe && (
                            m.confirmed
                              ? <CheckCheck className="w-3 h-3 text-fuchsia-500"/>
                              : <Check className="w-3 h-3 text-gray-400 dark:text-gray-500"/>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input area */}
            <div className="px-4 py-3 border-t border-rose-50 dark:border-gray-800 bg-white dark:bg-gray-900">
              {/* All reactions row */}
              <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                {REACTIONS.map(e => (
                  <button key={e} onClick={() => sendReaction(e)}
                    className="text-xl flex-shrink-0 px-2 py-1.5 rounded-2xl border border-rose-100 dark:border-gray-700 hover:bg-rose-50 dark:hover:bg-gray-800 active:scale-125 transition">
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 outline-none focus:ring-2 focus:ring-fuchsia-400 text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                  placeholder="Type a message…"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white grid place-items-center flex-shrink-0 disabled:opacity-40 hover:opacity-90 transition"
                >
                  <Send className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </div>

          {sessions.length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5">
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-fuchsia-500"/> Games Played</div>
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border dark:border-gray-800 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{modeInfo(s.kind)?.emoji ?? "🎮"}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{modeInfo(s.kind)?.label ?? s.kind}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{s.status==="active" ? "🟢 Live" : "✅ Finished"}</div>
                      </div>
                    </div>
                    {s.result?.meta?.winner && (
                      <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-2 py-1 rounded-full flex items-center gap-1">
                        <Crown className="w-3 h-3"/> {s.result.meta.winner}
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
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5">
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-fuchsia-500"/> Players ({displayCount}/{displayMax})</div>
              {!presenceReady && <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">syncing…</span>}
            </div>
            {members.length === 0 && !presenceReady ? (
              <div className="space-y-2">
                {[...Array(2)].map((_,i) => (
                  <div key={i} className="flex items-center gap-2 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800"/>
                    <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded"/>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-sm text-gray-400 dark:text-gray-500">No players yet</div>
            ) : (
              <div className="space-y-2">
                {members.map(m => (
                  <motion.div key={m.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-shrink-0">
                        {m.avatar
                          ? <img src={m.avatar} alt={m.name} className="h-9 w-9 rounded-full object-cover"/>
                          : <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold">
                              {m.name[0]?.toUpperCase()}
                            </div>
                        }
                        {/* Online dot */}
                        <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-900"/>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</div>
                        {lobby && String(m.id) === String(lobby.host_id) && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><Crown className="w-2.5 h-2.5"/> Host</div>
                        )}
                      </div>
                    </div>
                    {partyScores[m.name] ? <span className="text-xs text-fuchsia-700 dark:text-fuchsia-300 font-semibold bg-fuchsia-50 dark:bg-fuchsia-950/40 px-2 py-0.5 rounded-full">{partyScores[m.name]}pts</span> : null}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {Object.keys(partyScores).length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5">
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500"/> Party Leaderboard</div>
              <div className="space-y-2">
                {Object.entries(partyScores).sort((a,b)=>b[1]-a[1]).map(([name,pts],i) => (
                  <div key={name} className={`flex items-center justify-between rounded-xl px-3 py-2 ${i===0?"bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900":"border dark:border-gray-800"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-4">{i+1}</span>
                      {i===0 && <Crown className="w-3.5 h-3.5 text-amber-500"/>}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</span>
                    </div>
                    <span className="text-sm font-bold text-fuchsia-700 dark:text-fuchsia-300">{pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reaction pad */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5">
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500"/> React Live</div>
            <div className="grid grid-cols-4 gap-2">
              {REACTIONS.map(e => (
                <button key={e} onClick={() => sendReaction(e)}
                  className="text-2xl aspect-square rounded-2xl border dark:border-gray-700 hover:bg-rose-50 dark:hover:bg-gray-800 active:scale-110 transition">
                  {e}
                </button>
              ))}
            </div>
          </div>

          {!activeGame && (
            <div className="rounded-3xl bg-gradient-to-br from-fuchsia-50 to-rose-50 dark:from-fuchsia-950/40 dark:to-rose-950/40 border border-rose-100 dark:border-gray-800 p-5">
              <div className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300 mb-2 flex items-center gap-1"><Zap className="w-3.5 h-3.5"/> Suggested for {displayCount} players</div>
              <div className="space-y-1.5">
                {GAME_MODES.filter(m => displayCount >= m.minPlayers).slice(0,3).map(m => (
                  <button key={m.kind} onClick={() => isHost ? startGame(m.kind) : undefined}
                    className={`w-full text-left rounded-xl px-3 py-2 text-xs border dark:border-gray-800 dark:text-gray-200 transition ${isHost?"hover:bg-white dark:hover:bg-gray-800 hover:shadow cursor-pointer":"cursor-default opacity-70"}`}>
                    {m.emoji} <b>{m.label}</b> — {m.vibe}
                  </button>
                ))}
                {displayCount < 2 && <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">Waiting for players…</div>}
                {!isHost && displayCount >= 2 && <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">Ask the host to start a game</div>}
              </div>
            </div>
          )}

          {/* Invite Friends */}
          {!activeGame && (
            <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-5">
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-fuchsia-500"/> Invite Friends
              </div>
              {onlineFriends.length === 0 ? (
                <div className="text-sm text-gray-400 dark:text-gray-500">None of your friends are online right now</div>
              ) : (
                <div className="space-y-2">
                  {onlineFriends.map(f => {
                    const status = presenceMap[f.id]?.status ?? f.presence_status ?? "offline";
                    const invited = invitedIds.has(f.id);
                    return (
                      <div key={f.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative flex-shrink-0">
                            {f.avatar_url
                              ? <img src={f.avatar_url} alt={f.name} className="h-8 w-8 rounded-full object-cover"/>
                              : <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold">
                                  {f.name[0]?.toUpperCase()}
                                </div>
                            }
                            <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 ${status === "online" ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-600"}`}/>
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{f.name}</div>
                        </div>
                        <button
                          onClick={() => inviteFriendToLobby(f.id)}
                          disabled={invited || invitingId === f.id || !inviteGameId}
                          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            invited
                              ? "border dark:border-gray-700 text-gray-500 dark:text-gray-400"
                              : "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white disabled:opacity-50"
                          }`}
                        >
                          {invited ? "Invited" : "Invite"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}