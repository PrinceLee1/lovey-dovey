import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Sparkles,
  Users,
  Flame,
  Star,
  History,
  Trophy,
  Share2,
  Play,
  Clock,
  Settings,
  Plus,
  Search,
} from "lucide-react";
import { useAuth } from '../context/AuthContext';
import { Link } from "react-router-dom";
import GameRunner from "../games/GameRunner";
import type { Game, HistoryItem } from "../games/types";
import api from "../libs/axios";
/**
 * GamesDashboard – Couples AI (Web)
 * --------------------------------------------------------------
 * • Two-column responsive layout (main + sidebar)
 * • Filters: Mode (Couple/Group) + Categories (Romantic/Playful/Spicy/Challenge)
 * • Quick Actions: Generate Game, Create Lobby, Invite Partner, Daily Challenge
 * • Featured games, Favorites, History
 * • Sidebar: Streak/XP, Leaderboard, Upcoming Lobbies, Friends Online
 * • Simple modals for Generate preview + Create Lobby
 *
 * Style: Tailwind + (optional) font-display for Sora headings
 */

export default function GamesDashboard() {
  const [mode, setMode] = useState<"couple" | "group">("couple");
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const { user } = useAuth();
  // console.log(user)
  const [xp, setXp] = useState(user?.xp); // replace the static XP chip if you want live updates
  const [previewGame, setPreviewGame] = useState<Game | null>(null);
  const [showCreateLobby, setShowCreateLobby] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
const [historyLoading, setHistoryLoading] = useState(true);
  const categories = ["All", "Romantic", "Playful", "Spicy", "Challenge", "Erotic"];
  // console.log('User in dashboard:', user);
  const allGames = useMemo<Game[]>(
    () => [
      {
        id: "g1",
        kind: "truth_dare",
        title: "Truth or Dare – Romantic",
        category: "Romantic",
        description: "Sweet prompts to spark intimacy and laughter.",
        duration: 10,
        players: 2,
        difficulty: "Easy",
      },
      {
        id: "g2",
        kind: "emoji_chat",
        title: "Emoji-Only Chat",
        category: "Playful",
        description: "Speak only in emojis for 5 minutes. Guess the message!",
        duration: 5,
        players: 2,
        difficulty: "Easy",
      },
      {
        id: "g3",
        kind: "spice_dice",
        title: "Spice Dice",
        category: "Spicy",
        description: "Roll the dice for a daring prompt. Keep it fun and consensual.",
        duration: 8,
        players: 2,
        difficulty: "Medium",
      },
      {
        id: "g4",
        kind: "memory_match",
        title: "Memory Match – Couple Edition",
        category: "Challenge",
        description: "Test how well you remember each other's favorites.",
        duration: 7,
        players: 2,
        difficulty: "Medium",
      },
      {
        id: "g5",
        kind: "trivia",
        title: "Trivia Night: Duo vs Duo",
        category: "Challenge",
        description: "Team up for trivia madness in group mode.",
        duration: 12,
        players: 4,
        difficulty: "Hard",
      },
      {
        id: "g6",
        kind: "charades_ai",
        title: "Charades with AI Prompts",
        category: "Playful",
        description: "Act it out, let the group guess!",
        duration: 10,
        players: 3,
        difficulty: "Easy",
      },
    ],
    []
  );


useEffect(() => {
  (async () => {
    try {
      const { data } = await api.get("/history?limit=6");
      setHistory(data.data ?? []);
    } finally {
      setHistoryLoading(false);
    }
  })();
}, []);

  const filtered = useMemo(() => {
    return allGames.filter((g) => {
      const inMode = mode === "couple" ? g.players <= 2 : g.players >= 3;
      const inCat = category === "All" ? true : g.category === category;
      const inSearch = search
        ? (g.title + g.description).toLowerCase().includes(search.toLowerCase())
        : true;
      return inMode && inCat && inSearch;
    });
  }, [allGames, mode, category, search]);

  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  function toggleFavorite(id: string) {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  function generateGame() {
    const pool = filtered.length ? filtered : allGames;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setPreviewGame(pick);
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-rose-50 via-pink-50 to-white">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
            <Heart className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-gray-800 tracking-tight">LoveyDovey</span>
        </div>
        <Link to="/settings" className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 hover:bg-white">
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-6 px-4 md:px-6 pb-16">
        {/* MAIN */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header / greeting */}
          <motion.div {...variants} className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-semibold text-gray-900">Hey {user?.name} 👋</h1> {/* Later will change it to "Hey Hey {user?.name} & {partnerName}" */}
                <p className="text-gray-600">Ready for a little fun? Invite your {user?.gender == 'Male' ? 'girlfriend' : 'boyfriend'} to join the fun 🥰!</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm">🔥 5‑day streak</span>
                <span className="bg-fuchsia-50 text-fuchsia-700 px-3 py-1 rounded-full text-sm">⭐ {xp} XP</span>
              </div>
            </div>

            {/* Search + Mode + Categories */}
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search games…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Segmented
                  value={mode}
                  onChange={(v) => setMode(v as any)}
                  options={[
                    { label: "Couple", value: "couple", icon: <Sparkles className="w-4 h-4" /> },
                    { label: "Group", value: "group", icon: <Users className="w-4 h-4" /> },
                  ]}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      category === c
                        ? "bg-fuchsia-50 border-fuchsia-400 text-fuchsia-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div {...variants} className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <ActionCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Generate Game"
              desc="AI picks a perfect game"
              onClick={() => {
                const pool = filtered.length ? filtered : allGames;
                const pick = pool[Math.floor(Math.random() * pool.length)];
                setActiveGame(pick);         // open the game directly
              }}
            />
            <ActionCard
              icon={<Plus className="w-5 h-5" />}
              title="Create Lobby"
              desc="Set rules & invite friends"
              onClick={() => setShowCreateLobby(true)}
            />
            <ActionCard
              icon={<Share2 className="w-5 h-5" />}
              title="Invite Partner"
              desc="Share a join link"
              onClick={() => navigator.clipboard.writeText("https://lovely.ai/join/abcd1234")}
            />
            <ActionCard
              icon={<Flame className="w-5 h-5" />}
              title="Daily Challenge"
              desc="+50 XP if completed"
              onClick={generateGame}
            />
          </motion.div>

          {/* Featured games */}
          <SectionTitle icon={<Play className="w-4 h-4" />} title="Featured" />
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                isFavorite={favorites.includes(g.id)}
                onFavorite={() => toggleFavorite(g.id)}
                onPreview={() => setPreviewGame(g)}
              />
            ))}
          </div>
          {activeGame && (
            <GameRunner
              game={activeGame}
              onClose={() => setActiveGame(null)}
              onFinished={async (res) => {
                setXp((x) => x + res.xpEarned);

                const payload = {
                  game_id: activeGame.id,
                  game_title: activeGame.title,
                  kind: activeGame.kind,
                  category: activeGame.category,
                  duration_minutes: activeGame.duration,
                  players: activeGame.players,
                  difficulty: activeGame.difficulty,
                  rounds: res.rounds,
                  skipped: res.skipped,
                  xp_earned: res.xpEarned,
                  meta: res.meta ?? {},
                };

                try {
                  const { data } = await api.post("/history", payload);
                  // Update recent list
                  setHistory((h) => [data.history, ...h].slice(0, 10));
                  // Update XP using server value (authoritative)
                  if (data.user?.xp !== undefined) {
                    setXp(data.user.xp);
                  } else {
                    // fallback if backend didn't send xp (shouldn't happen)
                    setXp((x) => x + payload.xp_earned);
                  }
                } catch (e) {
                  // optional: toast error
                  console.error("Failed to save history", e);
                }
              }}
            />
          )}
          {/* History */}
          <SectionTitle icon={<History className="w-4 h-4" />} title="Recently Played" />

          <div className="rounded-3xl bg-white shadow-xl border border-rose-100 divide-y">
            {historyLoading ? (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : history.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No games yet — play your first round!</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{h.game_title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{h.category}</span>
                      <span>•</span>
                      <span>{h.rounds} rounds</span>
                      <span>•</span>
                      <span>{h.xp_earned} XP</span>
                      <span>•</span>
                      <span>{new Date(h.played_at).toLocaleString([], {hour: '2-digit', minute: '2-digit', weekday: 'short'})}</span>
                    </div>
                  </div>
                  <button
                    className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                    onClick={() => {
                      // quick replay: set the same game active
                      const g = allGames.find(g => g.id === h.game_id);
                      if (g) setActiveGame(g);
                    }}
                  >
                    Replay
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* Streak & XP */}
          <motion.div {...variants} className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
            <div className="flex items-center justify-between">
              <div className="font-display font-semibold text-gray-900">Your Progress</div>
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div className="mt-4 space-y-3">
              <Progress label="XP" value={62} />
              <Progress label="Weekly Streak" value={71} color="amber" />
            </div>
          </motion.div>

          {/* Leaderboard mini */}
          <motion.div {...variants} className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
            <div className="font-display font-semibold text-gray-900 mb-4">Leaderboard</div>
            <div className="space-y-3">
              {leaderboard.map((u, i) => (
                <div key={u.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar seed={u.name} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{i + 1}. {u.name}</div>
                      <div className="text-xs text-gray-500">{u.xp} XP</div>
                    </div>
                  </div>
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Upcoming Lobbies */}
          <motion.div {...variants} className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
            <div className="font-display font-semibold text-gray-900 mb-4">Upcoming Lobbies</div>
            <div className="space-y-3">
              {upcoming.map((u) => (
                <div key={u.id} className="border rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{u.title}</div>
                    <div className="text-xs text-gray-500">{u.when} • {u.players} players</div>
                  </div>
                  <button className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50">Join</button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Friends Online */}
          <motion.div {...variants} className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
            <div className="font-display font-semibold text-gray-900 mb-4">Friends Online</div>
            <div className="flex -space-x-2 overflow-hidden">
              {friends.map((f) => (
                <div key={f} className="h-9 w-9 rounded-full ring-2 ring-white bg-gradient-to-br from-fuchsia-400 to-pink-500 grid place-items-center text-white text-xs font-semibold">
                  {f[0]}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {previewGame && (
          <Modal onClose={() => setPreviewGame(null)}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-display text-lg font-semibold text-gray-900">{previewGame.title}</div>
                <button onClick={() => setPreviewGame(null)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
              </div>
              <div className="text-sm text-gray-600">{previewGame.description}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 rounded-full border">{previewGame.category}</span>
                <span className="px-2 py-1 rounded-full border">{previewGame.difficulty}</span>
                <span className="px-2 py-1 rounded-full border">{previewGame.duration} min</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    if (!previewGame) return;
                    setActiveGame(previewGame);
                    setPreviewGame(null);
                  }}
                  className="flex-1 rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
                >
                  Play Now
                </button>
                <button
                  onClick={() => {
                    toggleFavorite(previewGame.id);
                    setPreviewGame(null);
                  }}
                  className="flex-1 rounded-xl px-4 py-2 border hover:bg-gray-50"
                >
                  Save to Favorites
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showCreateLobby && (
          <CreateLobbyModal onClose={() => setShowCreateLobby(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------- UI Components ---------------------------- */

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mt-6 mb-2 flex items-center gap-2">
      <div className="h-8 w-8 rounded-xl bg-white shadow border border-rose-100 grid place-items-center text-fuchsia-600">
        {icon}
      </div>
      <div className="font-display text-lg font-semibold text-gray-900">{title}</div>
    </div>
  );
}

function ActionCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick?: () => void; }) {
  return (
    <button onClick={onClick} className="text-left rounded-3xl bg-white shadow-xl border border-rose-100 p-5 hover:shadow-2xl transition">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
          {icon}
        </div>
        <div>
          <div className="font-medium text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{desc}</div>
        </div>
      </div>
    </button>
  );
}

function GameCard({ game, isFavorite, onFavorite, onPreview }: { game: Game; isFavorite: boolean; onFavorite: () => void; onPreview: () => void; }) {
  return (
    <div className="rounded-3xl bg-white shadow-xl border border-rose-100 overflow-hidden flex flex-col">
      <div className="h-28 bg-gradient-to-br from-rose-100 to-fuchsia-100 grid place-items-center">
        <Play className="w-8 h-8 text-fuchsia-600" />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="font-medium text-gray-900">{game.title}</div>
        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{game.description}</div>
        <div className="flex items-center gap-2 text-xs text-gray-600 mt-3">
          <span className="px-2 py-1 rounded-full border">{game.category}</span>
          <span className="px-2 py-1 rounded-full border">{game.difficulty}</span>
          <span className="px-2 py-1 rounded-full border">{game.duration} min</span>
        </div>
        <div className="mt-auto flex items-center gap-2 pt-4">
          <button onClick={onPreview} className="flex-1 rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm">
            Preview
          </button>
          <button onClick={onFavorite} className={`rounded-xl px-3 py-2 text-sm border ${isFavorite ? "bg-amber-50 border-amber-300 text-amber-700" : "hover:bg-gray-50"}`}>
            {isFavorite ? "Favorited" : "Favorite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        {children}
      </motion.div>
    </motion.div>
  );
}

function CreateLobbyModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [startAt, setStartAt] = useState("");
  const [entry, setEntry] = useState(0);

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-display text-lg font-semibold text-gray-900">Create Lobby</div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <LabeledInput label="Lobby name" value={name} onChange={setName} placeholder="Game Night" />
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Max players" type="number" value={String(maxPlayers)} onChange={(v)=>setMaxPlayers(Number(v))} />
            <LabeledInput label="Entry (coins)" type="number" value={String(entry)} onChange={(v)=>setEntry(Number(v))} />
          </div>
          <LabeledSelect label="Privacy" value={privacy} onChange={(v)=>setPrivacy(v as any)} options={["public","private"]} />
          <LabeledInput label="Start time" type="datetime-local" value={startAt} onChange={setStartAt} />
        </div>
        <button
          onClick={()=>{ console.log({ name, maxPlayers, privacy, startAt, entry }); onClose(); }}
          className="w-full rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
        >
          Create
        </button>
      </div>
    </Modal>
  );
}

function LabeledInput({ label, type = "text", value, onChange, placeholder }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-fuchsia-500"
      />
    </div>
  );
}

function LabeledSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[]; }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-fuchsia-500 bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o[0].toUpperCase() + o.slice(1)}</option>
        ))}
      </select>
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string; icon?: React.ReactNode }[]; }) {
  return (
    <div className="inline-flex rounded-xl border bg-white p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
            value === o.value ? "bg-fuchsia-600 text-white" : "hover:bg-gray-50"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Progress({ label, value, color = "fuchsia" }: { label: string; value: number; color?: "fuchsia" | "amber" }) {
  const bar = color === "amber" ? "bg-amber-500" : "bg-fuchsia-600";
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Avatar({ seed }: { seed: string }) {
  // Simple initials avatar
  const initials = seed
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-fuchsia-400 to-pink-500 grid place-items-center text-white text-xs font-semibold">
      {initials}
    </div>
  );
}

/* ------------------------------ Mock Data ------------------------------ */

type Game = {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: number; // minutes
  players: number;
  difficulty: "Easy" | "Medium" | "Hard";
};

const historyData = [
  { id: "h1", title: "Truth or Dare – Romantic", when: "Yesterday 9:12 PM" },
  { id: "h2", title: "Emoji-Only Chat", when: "Yesterday 8:03 PM" },
  { id: "h3", title: "Memory Match – Couple Edition", when: "Fri 7:24 PM" },
];

const leaderboard = [
  { name: "Alex & Maya", xp: 1240 },
  { name: "Sam & Joy", xp: 1100 },
  { name: "Liam & Zoe", xp: 980 },
];

const upcoming = [
  { id: "u1", title: "Trivia Night", when: "Tonight 8:30 PM", players: 4 },
  { id: "u2", title: "Charades", when: "Tue 7:00 PM", players: 5 },
];

const friends = ["Sam", "Joy", "Liam", "Zoe", "Kai"];
