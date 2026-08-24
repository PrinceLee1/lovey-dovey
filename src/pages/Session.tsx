import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, SkipForward, Dices, Send, X, Trophy, MessageCircle } from "lucide-react";
import { echo } from "../libs/echo";
import { api } from "../libs/axios";
import { useAuth } from "../context/AuthContext";
import { usePartner } from "../hooks/usePartner";
import { useToast } from "../context/ToastContext";

type ChatMessage = { from: number; text: string; at: string };
type MatchCard = { id: number; value: string; matched: boolean };

type SessionState = {
  phase?: "picking" | "prompt";
  currentType?: "truth" | "dare" | null;
  currentPrompt?: string | null;
  skips?: number;
  done?: number;
  xp?: number;
  messages?: ChatMessage[];
  endsAt?: string | null;
  chatLog?: ChatMessage[];
  deck?: MatchCard[];
  flipped?: number[];
  matches?: number;
  moves?: number;
  justRevealed?: { indexes: number[]; matched: boolean } | null;
};

type S = {
  code: string;
  kind: string;
  round: number;
  turnUserId: number | null;
  status: "waiting" | "active" | "ended" | "aborted";
  state: SessionState;
  createdBy: number;
  partnerUserId: number;
};

const GAME_META: Record<string, { label: string; emoji: string; gradient: string }> = {
  truth_dare: { label: "Truth or Dare", emoji: "💗", gradient: "from-pink-500 via-fuchsia-600 to-purple-600" },
  truth_dare_erotic: { label: "Truth or Dare · Plus", emoji: "🔥", gradient: "from-rose-600 via-fuchsia-700 to-purple-800" },
  spice_dice: { label: "Spice Dice", emoji: "🎲", gradient: "from-orange-500 via-rose-500 to-fuchsia-600" },
  emoji_chat: { label: "Emoji-Only Chat", emoji: "💬", gradient: "from-fuchsia-500 via-pink-500 to-rose-400" },
  memory_match: { label: "Memory Match", emoji: "🧩", gradient: "from-indigo-500 via-fuchsia-600 to-pink-500" },
};

function meta(kind: string) {
  return GAME_META[kind] ?? { label: kind, emoji: "🎮", gradient: "from-pink-500 to-fuchsia-600" };
}

const PROMPT_KINDS = new Set(["truth_dare", "truth_dare_erotic", "spice_dice"]);

function FullscreenShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-rose-50 via-pink-50 to-white dark:from-[#0b0b12] dark:via-[#100c17] dark:to-[#0b0b12] grid place-items-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`relative w-full ${wide ? "max-w-xl" : "max-w-sm"} rounded-3xl bg-white dark:bg-gray-900 shadow-2xl border border-rose-100 dark:border-gray-800 overflow-hidden my-8`}
      >
        {children}
      </motion.div>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <FullscreenShell>
      <div className="p-8 text-center space-y-4">{children}</div>
    </FullscreenShell>
  );
}

function GameHeader({ kind, round, onEnd }: { kind: string; round: number; onEnd: () => void }) {
  const m = meta(kind);
  return (
    <div className={`bg-gradient-to-br ${m.gradient} px-6 py-5 text-white relative`}>
      <button
        onClick={onEnd}
        className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 grid place-items-center hover:bg-white/30 transition"
        title="End game"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{m.emoji}</span>
        <div>
          <div className="font-bold text-lg leading-tight">{m.label}</div>
          {round > 0 && <div className="text-white/70 text-xs">Round {round}</div>}
        </div>
      </div>
    </div>
  );
}

function PlayerChip({ name, active }: { name: string; active: boolean }) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`h-10 w-10 rounded-full grid place-items-center text-white text-sm font-bold bg-gradient-to-br from-pink-400 to-fuchsia-500 transition ${
          active ? "ring-2 ring-offset-2 ring-fuchsia-500 dark:ring-offset-gray-900" : "opacity-50"
        }`}
      >
        {initial}
      </div>
      <div className={`text-xs truncate max-w-[80px] ${active ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}`}>
        {name}
      </div>
    </div>
  );
}

function PlayerBar({ meName, partnerName, myTurn, turnless }: { meName: string; partnerName: string; myTurn: boolean; turnless?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-6 py-4 border-b border-rose-50 dark:border-gray-800">
      <PlayerChip name={meName} active={turnless || myTurn} />
      <div className="text-xs text-gray-300 dark:text-gray-600 font-medium">vs</div>
      <PlayerChip name={partnerName} active={turnless || !myTurn} />
    </div>
  );
}

export default function CoupleSession() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { partner } = usePartner();
  const { toast } = useToast();
  const meId = user?.id;
  const meName = user?.name ?? "You";
  const partnerName = partner?.name ?? "Partner";

  const [s, setS] = useState<S | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [revealPair, setRevealPair] = useState<number[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const finishedTimeoutRef = useRef(false);

  // Side chat — separate from Emoji Chat's own in-game messaging.
  const [sideChatOpen, setSideChatOpen] = useState(false);
  const [sideChatInput, setSideChatInput] = useState("");
  const [sideChatSeen, setSideChatSeen] = useState(0);
  const sideChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/sessions/${code}`);
        setS(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  useEffect(() => {
    if (!code) return;
    const ch = echo
      .join(`couple-session.${code}`)
      .listen(".session.created", (e: any) => setS((prev) => (prev ? { ...prev, ...e } : prev)))
      .listen(".session.updated", (e: any) => setS((prev) => (prev ? { ...prev, ...e } : prev)));
    return () => {
      try {
        ch.leave();
      } catch {
        /* empty */
      }
    };
  }, [code]);

  // Fallback poll — the real-time broadcast can be missed (a dropped socket,
  // a backgrounded tab throttling reconnects), which would otherwise leave
  // this screen stuck showing stale status forever. Stops once the game ends.
  useEffect(() => {
    if (!code || s?.status === "ended" || s?.status === "aborted") return;
    const id = window.setInterval(async () => {
      try {
        const { data } = await api.get(`/sessions/${code}`);
        setS(data);
      } catch {
        /* keep whatever we last had */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [code, s?.status]);

  // Briefly show a resolved memory-match pair (match or mismatch) before it
  // settles — matches stay revealed via `matched`, mismatches just fade out.
  useEffect(() => {
    const jr = s?.state?.justRevealed;
    if (!jr) return;
    setRevealPair(jr.indexes);
    const t = setTimeout(() => setRevealPair([]), 700);
    return () => clearTimeout(t);
  }, [s?.state?.justRevealed]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [s?.state?.messages?.length]);

  useEffect(() => {
    if (sideChatOpen) {
      setSideChatSeen(s?.state?.chatLog?.length ?? 0);
      sideChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [sideChatOpen, s?.state?.chatLog?.length]);

  async function accept() {
    setAccepting(true);
    try {
      const { data } = await api.post(`/sessions/${code}/accept`);
      setS(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Unable to join this game");
    } finally {
      setAccepting(false);
    }
  }

  async function send(type: string, payload?: any) {
    try {
      const { data } = await api.post(`/sessions/${code}/action`, { type, payload });
      setS(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Something went wrong");
    }
  }

  async function spin() {
    setSpinning(true);
    await send("spin");
    setTimeout(() => setSpinning(false), 500);
  }

  function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    if (/[a-zA-Z0-9]/.test(text) || !/\p{Extended_Pictographic}/u.test(text)) {
      toast.error("Emojis only!");
      return;
    }
    setChatInput("");
    send("message", { text });
  }

  function sendSideChat() {
    const text = sideChatInput.trim();
    if (!text) return;
    setSideChatInput("");
    send("chat", { text });
  }

  function flip(index: number) {
    if (s?.turnUserId !== meId) return;
    const card = s?.state?.deck?.[index];
    if (!card || card.matched || s?.state?.flipped?.includes(index)) return;
    send("flip", { index });
  }

  if (loading) {
    return (
      <CenteredCard>
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      </CenteredCard>
    );
  }

  if (notFound || !s) {
    return (
      <CenteredCard>
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Game not found</div>
        <button
          onClick={() => nav("/games")}
          className="rounded-xl px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
        >
          Back to games
        </button>
      </CenteredCard>
    );
  }

  const m = meta(s.kind);
  const isCreator = meId === s.createdBy;
  const myTurn = s.turnUserId === meId;

  if (s.status === "waiting") {
    return (
      <CenteredCard>
        <div className={`h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br ${m.gradient} grid place-items-center text-white text-2xl`}>
          {m.emoji}
        </div>
        {isCreator ? (
          <>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Waiting for {partnerName}…</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              We sent them an invite to play {m.label}. This screen updates the moment they join.
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {partnerName} invited you to play {m.label}
            </div>
            <button
              disabled={accepting}
              onClick={accept}
              className="w-full rounded-2xl py-3 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 disabled:opacity-50"
            >
              {accepting ? "Joining…" : "Accept & Play"}
            </button>
          </>
        )}
        <button
          onClick={() => nav("/games")}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </CenteredCard>
    );
  }

  if (s.status === "ended" || s.status === "aborted") {
    const isMatch = s.kind === "memory_match";
    return (
      <CenteredCard>
        <div className="text-4xl">🎉</div>
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Game over!</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {isMatch
            ? `${s.state?.matches ?? 0} pairs matched in ${s.state?.moves ?? 0} moves`
            : s.kind === "emoji_chat"
            ? `${s.state?.messages?.length ?? 0} messages exchanged`
            : `${s.state?.done ?? 0} completed • ${s.state?.xp ?? 0} XP earned`}
        </div>
        <button
          onClick={() => nav("/games")}
          className="rounded-2xl px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"
        >
          Back to games
        </button>
      </CenteredCard>
    );
  }

  return (
    <FullscreenShell wide>
      <GameHeader kind={s.kind} round={s.round} onEnd={() => send("finish")} />

      {s.kind === "emoji_chat" ? (
        <ChatBody
          state={s.state}
          meId={meId}
          meName={meName}
          partnerName={partnerName}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendChat={sendChat}
          chatEndRef={chatEndRef}
          onExpire={() => {
            if (finishedTimeoutRef.current) return;
            finishedTimeoutRef.current = true;
            send("finish");
          }}
        />
      ) : s.kind === "memory_match" ? (
        <MatchBody state={s.state} meName={meName} partnerName={partnerName} myTurn={myTurn} revealPair={revealPair} onFlip={flip} />
      ) : PROMPT_KINDS.has(s.kind) ? (
        <PromptBody
          kind={s.kind}
          state={s.state}
          meName={meName}
          partnerName={partnerName}
          myTurn={myTurn}
          spinning={spinning}
          onSpin={spin}
          onDone={() => send("done")}
          onSkip={() => send("skip")}
        />
      ) : (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Unsupported game.</div>
      )}

      {/* Emoji Chat already IS a chat — the side chat would be redundant there. */}
      {s.kind !== "emoji_chat" && (
        <SideChatDrawer
          open={sideChatOpen}
          onToggle={() => setSideChatOpen((o) => !o)}
          log={s.state?.chatLog ?? []}
          unread={sideChatOpen ? 0 : Math.max(0, (s.state?.chatLog?.length ?? 0) - sideChatSeen)}
          meId={meId}
          meName={meName}
          partnerName={partnerName}
          input={sideChatInput}
          setInput={setSideChatInput}
          onSend={sendSideChat}
          endRef={sideChatEndRef}
        />
      )}
    </FullscreenShell>
  );
}

// ── Side chat drawer (any game except Emoji Chat) ───────────────────────────
function SideChatDrawer({
  open, onToggle, log, unread, meId, meName, partnerName, input, setInput, onSend, endRef,
}: {
  open: boolean; onToggle: () => void; log: ChatMessage[]; unread: number;
  meId?: number; meName: string; partnerName: string;
  input: string; setInput: (v: string) => void; onSend: () => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <button
        onClick={onToggle}
        className="absolute bottom-4 right-4 h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-lg grid place-items-center z-10 hover:opacity-90 transition"
        title={open ? "Close chat" : "Chat with your partner"}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 h-72 bg-white dark:bg-gray-900 border-t border-rose-100 dark:border-gray-800 rounded-t-3xl shadow-2xl z-10 flex flex-col"
          >
            <div className="px-4 py-3 border-b border-rose-50 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 inline-flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-fuchsia-500" /> Chat with {partnerName}
              </div>
              <button onClick={onToggle} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {log.length === 0 ? (
                <div className="h-full grid place-items-center text-xs text-gray-400 dark:text-gray-500">
                  Say something while you play 💬
                </div>
              ) : (
                log.map((msg, i) => {
                  const mine = msg.from === meId;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-sm leading-snug ${
                        mine
                          ? "bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white ml-auto rounded-br-sm"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                      }`}
                      title={mine ? meName : partnerName}
                    >
                      {msg.text}
                    </motion.div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <div className="p-3 border-t border-rose-50 dark:border-gray-800 flex-shrink-0 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSend()}
                placeholder="Type a message…"
                className="flex-1 rounded-xl border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
              <button
                onClick={onSend}
                disabled={!input.trim()}
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white grid place-items-center disabled:opacity-40 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Truth or Dare / Truth or Dare Plus / Spice Dice ─────────────────────────
function PromptBody({
  kind, state, meName, partnerName, myTurn, spinning, onSpin, onDone, onSkip,
}: {
  kind: string; state: SessionState; meName: string; partnerName: string; myTurn: boolean;
  spinning: boolean; onSpin: () => void; onDone: () => void; onSkip: () => void;
}) {
  const phase = state.phase ?? "picking";
  const isDice = kind === "spice_dice";

  return (
    <div>
      <PlayerBar meName={meName} partnerName={partnerName} myTurn={myTurn} />
      <div className="flex items-center justify-center gap-3 py-3">
        <div className="text-xs px-3 py-1 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300">
          Skips: {state.skips ?? 0}
        </div>
        <div className="text-xs px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
          {state.xp ?? 0} XP
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="text-center mb-5">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{myTurn ? "Your turn" : `${partnerName}'s turn`}</div>
        </div>

        <AnimatePresence mode="wait">
          {phase === "picking" ? (
            <motion.div key="picking" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center space-y-5">
              <motion.div
                animate={spinning ? { rotate: 360 * 3 } : {}}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-32 w-32 mx-auto rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-600 to-purple-600 grid place-items-center text-white shadow-xl"
              >
                {isDice ? <Dices className="w-12 h-12" /> : <Sparkles className="w-10 h-10" />}
              </motion.div>
              {myTurn ? (
                <button
                  disabled={spinning}
                  onClick={onSpin}
                  className="rounded-2xl px-6 py-3 font-semibold text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 disabled:opacity-60"
                >
                  {spinning ? "Rolling…" : isDice ? "🎲 Roll the Dice" : "🎡 Spin the Wheel"}
                </button>
              ) : (
                <div className="text-sm text-gray-400 dark:text-gray-500">
                  Waiting for {partnerName} to {isDice ? "roll" : "spin"}…
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="prompt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div
                className={`rounded-2xl p-5 text-center border-2 ${
                  state.currentType === "dare"
                    ? "border-fuchsia-300 dark:border-fuchsia-800 bg-fuchsia-50 dark:bg-fuchsia-950/40"
                    : "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40"
                }`}
              >
                <div className={`text-xs font-bold uppercase mb-2 ${state.currentType === "dare" ? "text-fuchsia-600 dark:text-fuchsia-300" : "text-rose-600 dark:text-rose-300"}`}>
                  {state.currentType}
                </div>
                <div className="text-lg font-medium text-gray-900 dark:text-gray-100">{state.currentPrompt}</div>
              </div>
              {myTurn ? (
                <div className="flex items-center justify-center gap-3">
                  <button onClick={onSkip} className="rounded-xl px-4 py-2 text-sm border dark:border-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1">
                    <SkipForward className="w-4 h-4" /> Skip
                  </button>
                  <button onClick={onDone} className="rounded-xl px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600">
                    ✓ Done — +10 XP
                  </button>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-400 dark:text-gray-500">Waiting for {partnerName}…</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Emoji Chat ───────────────────────────────────────────────────────────────
const EMOJI_PALETTE = ["😍","😂","🔥","💃","🕺","🎉","😜","🤫","😉","❤️","💌","🌹","🥰","🤝","🎵","🍕"];

function ChatBody({
  state, meId, meName, partnerName, chatInput, setChatInput, sendChat, chatEndRef, onExpire,
}: {
  state: SessionState; meId?: number; meName: string; partnerName: string;
  chatInput: string; setChatInput: (v: string) => void; sendChat: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>; onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!state.endsAt) return;
    const tick = () => {
      const ms = Math.max(0, new Date(state.endsAt as string).getTime() - Date.now());
      setRemaining(ms);
      if (ms <= 0) onExpire();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.endsAt]);

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const messages = state.messages ?? [];

  return (
    <div>
      <div className="flex items-center justify-between px-6 py-3 border-b border-rose-50 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400">Emojis only — no letters or numbers!</div>
        <div className="text-sm font-mono font-semibold text-fuchsia-600 dark:text-fuchsia-400">
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </div>
      </div>

      <div className="h-72 overflow-y-auto px-4 py-4 space-y-2 bg-gradient-to-b from-rose-50 via-pink-50 to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        {messages.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-gray-400 dark:text-gray-500">Say hi with an emoji 👋</div>
        ) : (
          messages.map((msg, i) => {
            const mine = msg.from === meId;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-lg leading-6 ${
                  mine
                    ? "bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white ml-auto rounded-br-sm"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-rose-100 dark:border-gray-700 rounded-bl-sm"
                }`}
                title={mine ? meName : partnerName}
              >
                {msg.text}
              </motion.div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 space-y-2 border-t border-rose-50 dark:border-gray-800">
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_PALETTE.map((e) => (
            <button
              key={e}
              onClick={() => setChatInput((chatInput + e).slice(0, 12))}
              className="text-lg px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-gray-800 transition"
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="Tap emojis above…"
            className="flex-1 rounded-xl border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
          <button
            onClick={sendChat}
            disabled={!chatInput.trim()}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white grid place-items-center disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Memory Match ─────────────────────────────────────────────────────────────
function MatchBody({
  state, meName, partnerName, myTurn, revealPair, onFlip,
}: {
  state: SessionState; meName: string; partnerName: string; myTurn: boolean; revealPair: number[]; onFlip: (i: number) => void;
}) {
  const deck = state.deck ?? [];
  const flipped = state.flipped ?? [];
  const totalPairs = deck.length / 2;
  const done = (state.matches ?? 0) >= totalPairs && totalPairs > 0;

  return (
    <div>
      <PlayerBar meName={meName} partnerName={partnerName} myTurn={myTurn} />
      <div className="flex items-center justify-center gap-3 py-3">
        <div className="text-xs px-3 py-1 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300">
          Moves: {state.moves ?? 0}
        </div>
        <div className="text-xs px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
          Matches: {state.matches ?? 0}/{totalPairs}
        </div>
      </div>

      <div className="px-6 pb-4 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
        {done ? "All matched! 🎉" : myTurn ? "Your turn — pick a card" : `Waiting for ${partnerName}…`}
      </div>

      <div className="px-6 pb-6 grid grid-cols-4 gap-3">
        {deck.map((card, i) => {
          const isUp = card.matched || flipped.includes(i) || revealPair.includes(i);
          return (
            <button
              key={card.id}
              onClick={() => onFlip(i)}
              disabled={!myTurn || isUp}
              className="aspect-square rounded-2xl border dark:border-gray-700 grid place-items-center text-2xl relative overflow-hidden bg-white dark:bg-gray-800 disabled:cursor-default"
              style={{ perspective: 600 }}
            >
              <AnimatePresence initial={false}>
                {isUp ? (
                  <motion.div
                    key="front"
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`w-full h-full grid place-items-center ${card.matched ? "bg-emerald-50 dark:bg-emerald-950/40" : ""}`}
                  >
                    {card.value}
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full grid place-items-center bg-gradient-to-br from-rose-100 to-fuchsia-100 dark:from-rose-950/40 dark:to-fuchsia-950/40"
                  >
                    <Heart className="w-5 h-5 text-fuchsia-400 dark:text-fuchsia-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {done && (
        <div className="px-6 pb-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 font-semibold">
            <Trophy className="w-4 h-4" /> +{state.xp ?? 0} XP earned
          </div>
        </div>
      )}
    </div>
  );
}
