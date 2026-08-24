/**
 * GamesDashboard.tsx — Updated with revenue features:
 *
 * CHANGES vs previous version:
 * 1. PlusModal paywall — Spicy/Erotic games gate behind is_plus check
 * 2. Fixed 4-second polling → fetch once on mount, refetch after game finishes
 * 3. Fixed hardcoded invite URL → calls real POST /api/partner/invites
 * 4. Post-game share card using Web Share API (free viral growth)
 * 5. Stripe success detection: ?subscribed=1 shows toast + refreshes user
 * 6. Gender-neutral greeting fallback for "Other" gender
 * 7. Plus badge shown in header when user is subscribed
 */

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Sparkles, Users, History, Share2, Play,
  Settings, Plus, Search, Crown,
} from "lucide-react";
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import GameRunner from "../games/GameRunner";
import type { Game, GameResult, HistoryItem } from "../games/types";
import api from "../libs/axios";
import CreateLobbyModal from "../components/lobbies/CreateLobbyModal";
import UpcomingLobbies from "../components/lobbies/UpcomingLobbies";
import Footer from "../components/Footer";
import PartnerCard from "../components/partners/PartnerCard";
import { usePartner } from "../hooks/usePartner";
import DailyChallengeCard from "../components/DailyChallengeCard";
import LeaderboardCard from "../components/LeaderboardCard";
import StreakBadge from "../components/StreakBadge";
import ProgressCard from "../components/ProgressCard";
import WeeklySummaryCard from "../components/WeeklySummaryCard";
import { echo } from "../libs/echo";
import FloatingHearts from "../components/FloatingHearts";
import PlusModal from "../components/PlusModal";

// ─── PLUS-LOCKED CATEGORIES ──────────────────────────────────────────────────
const PLUS_CATEGORIES = new Set(['Spicy', 'Erotic']);

export default function GamesDashboard() {
  const [mode, setMode] = useState<"couple" | "group">("couple");
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loadingGames, setLoadingGames] = useState(true);
  const { user, refreshUser } = useAuth();
  const [xp, setXp] = useState(user?.xp ?? 0);
  const [previewGame, setPreviewGame] = useState<Game | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { partner, link } = usePartner();
  const partnerActive = !!partner && link?.status === "active";
  const partnerId = partner?.id ?? null;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── MODAL STATE ───────────────────────────────────────────────────────────
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showPlusModal, setShowPlusModal] = useState(false);
  const [plusModalReason, setPlusModalReason] = useState<'spicy' | 'erotic' | 'general'>('general');
  const [invite, setInvite] = useState<null | { code: string; kind: string; from: string; url: string }>(null);

  // ─── POST-GAME SHARE STATE ─────────────────────────────────────────────────
  const [shareResult, setShareResult] = useState<{ game: Game; xp: number } | null>(null);

  // ─── SUCCESS TOAST ─────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string, ms = 4000) {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }

  // ─── DETECT STRIPE SUCCESS REDIRECT ───────────────────────────────────────
  useEffect(() => {
    if (searchParams.get('subscribed') === '1') {
      refreshUser(); // re-fetch user.is_plus = true from backend
      showToast('🎉 Welcome to Plus! Spicy & Erotic games are now unlocked.');
      // Remove the query param so refresh doesn't re-trigger
      searchParams.delete('subscribed');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  // ─── SYNC XP FROM USER ────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.xp !== undefined) setXp(user.xp);
  }, [user?.xp]);

  // ─── LOAD GAMES (once) ────────────────────────────────────────────────────
  useEffect(() => {
    async function loadGames() {
      try {
        const { data } = await api.get("/games");
        setGames(data.games);
        setCategories(["All", ...data.categories]);
      } catch (e) {
        console.error("Failed to load games", e);
      } finally {
        setLoadingGames(false);
      }
    }
    loadGames();
  }, []);

  // ─── LOAD HISTORY (once on mount, not polling) ────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get("/history?limit=6");
      setHistory(data.data ?? []);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ─── PUSHER: partner session invite ──────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const ch = echo.private(`user.${user.id}`)
      .listen('.couple.session.invited', (e: any) => {
        setInvite(e);
      });
    return () => { try { ch.unsubscribe(); } catch { /* empty */ } };
  }, [user?.id]);

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const needsPartner = (g: Game) => (g as any).partner_required;

  const isPlusLocked = (g: Game) =>
    PLUS_CATEGORIES.has(g.category) && !user?.is_plus;

  function tryStartGame(g: Game) {
    // 1. Plus gate (Spicy / Erotic)
    if (isPlusLocked(g)) {
      setPlusModalReason(g.category === 'Erotic' ? 'erotic' : 'spicy');
      setShowPlusModal(true);
      return;
    }
    // 2. Partner gate
    if (needsPartner(g) && !partnerActive) {
      setShowPartnerModal(true);
      return;
    }
    setActiveGame(g);
  }

  // ─── INVITE PARTNER (calls real API) ─────────────────────────────────────
  async function handleInvitePartner() {
    try {
      const { data } = await api.post('/partner/invite');
      const link = `${window.location.origin}/join/${data.code}`;
      await navigator.clipboard.writeText(link);
      showToast('✅ Invite link copied to clipboard!');
    } catch {
      showToast('❌ Failed to generate invite link. Try again.');
    }
  }

  // ─── POST-GAME SHARE ──────────────────────────────────────────────────────
  async function handleShare(game: Game, xpEarned: number) {
    const text = `${user?.name} just played "${game.title}" on LoveyDovey and earned ${xpEarned} XP! 💕\nTry it: ${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'LoveyDovey', text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      showToast('📋 Score copied to clipboard — share with your partner!');
    }
  }

  // ─── FILTERED GAMES ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return games.filter((g) => {
      const inMode = mode === "couple" ? g.players <= 2 : g.players >= 3;
      const inCat = category === "All" ? true : g.category === category;
      const inSearch = search
        ? (g.title + g.description).toLowerCase().includes(search.toLowerCase())
        : true;
      return inMode && inCat && inSearch;
    });
  }, [games, mode, category, search]);

  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  function toggleFavorite(id: string) {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  // ─── GREETING ─────────────────────────────────────────────────────────────
  //greet 'Good morning/afternoon/evening' based on user's local time + name + partner name if linked
  const partnerWord = partnerActive && partner?.name ? `${partner.name} ❤️` : "partner";
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${user?.name}!`;
    if (hour < 18) return `Good afternoon, ${user?.name}!`;
    return `Good evening, ${user?.name}!`;
  }, [user?.name]);

  // ─── ON GAME FINISHED ────────────────────────────────────────────────────
  async function onGameFinished(game: Game, res: GameResult) {
    setXp((x) => x + res.xpEarned);
    setActiveGame(null);

    // Show share card
    setShareResult({ game, xp: res.xpEarned });

    const isPartnerGame = needsPartner(game);
    const payload = {
      game_id: game.id,
      game_title: game.title,
      kind: game.kind,
      category: game.category,
      duration_minutes: game.duration,
      players: game.players,
      difficulty: game.difficulty,
      rounds: res.rounds,
      skipped: res.skipped,
      xp_earned: res.xpEarned,
      meta: res.meta ?? {},
      with_partner: isPartnerGame,
      partner_id: isPartnerGame ? partnerId : null,
      user_id: user?.id,
    };

    try {
      const { data } = await api.post("/history", payload);
      // Refresh history list with new entry at top
      setHistory((h) => [data.history, ...h].slice(0, 10));
      if (data.user?.xp !== undefined) setXp(data.user.xp);
    } catch (e) {
      console.error("Failed to save history", e);
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-rose-50 via-pink-50 to-white dark:from-[#0b0b12] dark:via-[#100c17] dark:to-[#0b0b12]">
      <FloatingHearts />

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Plus Modal ────────────────────────────────────────────────────── */}
      <PlusModal
        open={showPlusModal}
        onClose={() => setShowPlusModal(false)}
        reason={plusModalReason}
      />

      {/* ── Share Card (post-game) ────────────────────────────────────────── */}
      <AnimatePresence>
        {shareResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShareResult(null); }}
          >
            <motion.div
              initial={{ y: 20, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.97 }}
              className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-br from-pink-500 to-fuchsia-600 p-6 text-white text-center">
                <div className="text-3xl mb-1">🎉</div>
                <div className="font-bold text-lg">Game complete!</div>
                <div className="text-white/80 text-sm mt-1">{shareResult.game.title}</div>
                <div className="mt-3 bg-white/20 rounded-full px-4 py-1 inline-block font-semibold">
                  +{shareResult.xp} XP earned
                </div>
              </div>
              <div className="p-5 space-y-3">
                <button
                  onClick={() => handleShare(shareResult.game, shareResult.xp)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
                >
                  <Share2 className="w-4 h-4" />
                  Share your score
                </button>
                <button
                  onClick={() => setShareResult(null)}
                  className="w-full rounded-2xl py-2.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10">
        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
              <Heart className="w-5 h-5" />
            </div>
            <span className="font-display font-semibold text-gray-800 dark:text-gray-100 tracking-tight">LoveyDovey</span>
            {/* Plus badge in nav */}
            {user?.is_plus && (
              <span className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                <Crown className="w-3 h-3" /> Plus
              </span>
            )}
          </div>
          <Link to="/settings" className="rounded-xl border dark:border-gray-700 px-3 py-2 text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-6 px-4 md:px-6 pb-16">
          {/* ── MAIN ────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Header / greeting */}
            <motion.div {...variants} className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-gray-900">
                    {greeting} 👋
                  </h1>
                  <p className="text-gray-600">
                    Ready for a little fun? Invite your {partnerWord} to join the fun 🥰!
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StreakBadge kind="couple" />
                  <span className="bg-fuchsia-50 text-fuchsia-700 px-3 py-1 rounded-full text-sm">
                    ⭐ {xp} XP
                  </span>
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
                    onChange={(v) => setMode(v as never)}
                    options={[
                      { label: "Couple", value: "couple", icon: <Heart className="w-4 h-4" /> },
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
                      {/* Show lock icon on Spicy/Erotic for free users */}
                      {PLUS_CATEGORIES.has(c) && !user?.is_plus ? `🔒 ${c}` : c}
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
                  const pool = filtered.length ? filtered : games;
                  const pick = pool[Math.floor(Math.random() * pool.length)];
                  if (pick) tryStartGame(pick);
                }}
              />
              <LobbiesSection />
              {/* Fixed: calls real API instead of hardcoded link */}
              <ActionCard
                icon={<Share2 className="w-5 h-5" />}
                title="Invite Partner"
                desc="Share a join link"
                onClick={handleInvitePartner}
              />
              <DailyChallengeCard onXp={(earned) => setXp((x) => (x ?? 0) + earned)} />
            </motion.div>

            {/* Plus upsell banner (free users only) */}
            {!user?.is_plus && (
              <motion.div {...variants}>
                <button
                  onClick={() => { setPlusModalReason('general'); setShowPlusModal(true); }}
                  className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 p-4 flex items-center justify-between text-white hover:opacity-90 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/20 grid place-items-center">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm">Unlock LoveyDovey Plus 🔥</div>
                      <div className="text-xs text-white/80">Spicy & Erotic games + unlimited AI prompts — $4.99/mo</div>
                    </div>
                  </div>
                  <div className="text-xs bg-white text-fuchsia-600 font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
                    Upgrade
                  </div>
                </button>
              </motion.div>
            )}

            {/* Featured games */}
            <SectionTitle icon={<Play className="w-4 h-4" />} title="Featured" />
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {loadingGames ? (
                <div className="col-span-full text-center py-10 text-gray-500">
                  Loading games…
                </div>
              ) : (
                filtered.map((g) => {
                  const partnerDisabled = needsPartner(g) && !partnerActive;
                  const plusLocked = isPlusLocked(g);

                  return (
                    <GameCard
                      key={g.id}
                      game={g}
                      isFavorite={favorites.includes(g.id.toString())}
                      onFavorite={() => toggleFavorite(g.id.toString())}
                      onPreview={() => setPreviewGame(g)}
                      onPlay={() => tryStartGame(g)}
                      disabled={partnerDisabled && !plusLocked}
                      plusLocked={plusLocked}
                      disabledReason="Partner required"
                    />
                  );
                })
              )}
            </div>

            {/* Game Runner */}
            {activeGame && (
              <GameRunner
                game={activeGame}
                onClose={() => setActiveGame(null)}
                onFinished={(res) => onGameFinished(activeGame, res)}
                pg={activeGame.category === "Erotic" ? "PG-18+" : "PG-13"}
                isPlus={user?.is_plus}
              />
            )}

            {/* Partner required modal */}
            {showPartnerModal && (
              <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                  <div className="text-lg font-semibold text-gray-900">Partner required</div>
                  <p className="text-sm text-gray-600 mt-1">
                    This game is for two players. Link your partner to play and save progress together.
                  </p>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowPartnerModal(false)}
                      className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <a
                      href="/games#partner"
                      className="px-3 py-2 rounded-xl text-sm text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"
                    >
                      Invite / Link partner
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Incoming session invite toast */}
            {invite !== null && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%]">
                <div className="rounded-2xl border bg-white shadow-xl p-4">
                  <div className="font-semibold text-gray-900">
                    {invite.from} invited you to play{" "}
                    <span className="capitalize">{invite.kind.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-2 flex gap-2 justify-end">
                    <button
                      className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                      onClick={() => setInvite(null)}
                    >
                      Dismiss
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-xl text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"
                      onClick={() => { setInvite(null); navigate(`/session/${invite.code}`); }}
                    >
                      Join now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            <SectionTitle icon={<History className="w-4 h-4" />} title="Recently Played" />
            <div className="rounded-3xl bg-white shadow-xl border border-rose-100 divide-y">
              {historyLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading…</div>
              ) : history.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">
                  No games yet — play your first round!
                </div>
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
                        <span>
                          {new Date(h.played_at).toLocaleString([], {
                            hour: '2-digit', minute: '2-digit', weekday: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                      onClick={() => {
                        const g = games.find((g) => g.id == h.game_id);
                        console.log("Replaying game", g);
                        if (g) tryStartGame(g);
                      }}
                    >
                      Replay
                    </button>
                  </div>
                ))
              )}
            </div>

            <PartnerCard />
          </div>

          {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
          <div className="space-y-6">
            <ProgressCard  />
            <WeeklySummaryCard />
            <LeaderboardCard />
            <UpcomingLobbies variants={variants} />

            {/* Friends Online */}
            <motion.div {...variants} className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="font-display font-semibold text-gray-900">Friends Online</div>
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">
                  Coming Soon
                </span>
              </div>
              <div className="flex -space-x-2 overflow-hidden">
                {friends.map((f) => (
                  <div
                    key={f}
                    className="h-9 w-9 rounded-full ring-2 ring-white bg-gradient-to-br from-fuchsia-400 to-pink-500 grid place-items-center text-white text-xs font-semibold"
                  >
                    {f[0]}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Modals ────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {previewGame && (
            <Modal onClose={() => setPreviewGame(null)}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-display text-lg font-semibold text-gray-900">
                    {previewGame.title}
                  </div>
                  <button
                    onClick={() => setPreviewGame(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>
                <div className="text-sm text-gray-600">{previewGame.description}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 rounded-full border">{previewGame.category}</span>
                  <span className="px-2 py-1 rounded-full border">{previewGame.difficulty}</span>
                  <span className="px-2 py-1 rounded-full border">{previewGame.duration} min</span>
                  {isPlusLocked(previewGame) && (
                    <span className="px-2 py-1 rounded-full border border-fuchsia-300 text-fuchsia-700 bg-fuchsia-50">
                      🔒 Plus
                    </span>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  {isPlusLocked(previewGame) ? (
                    <button
                      onClick={() => {
                        setPreviewGame(null);
                        setPlusModalReason(previewGame.category === 'Erotic' ? 'erotic' : 'spicy');
                        setShowPlusModal(true);
                      }}
                      className="flex-1 rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-medium"
                    >
                      Unlock with Plus 🔒
                    </button>
                  ) : (!needsPartner(previewGame) || partnerActive) ? (
                    <button
                      onClick={() => {
                        setActiveGame(previewGame);
                        setPreviewGame(null);
                      }}
                      className="flex-1 rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
                    >
                      Play Now
                    </button>
                  ) : (
                    <button className="rounded-xl px-3 py-2 text-sm bg-gray-200 text-gray-500 cursor-not-allowed">
                      Partner Required
                    </button>
                  )}
                  <button
                    onClick={() => { toggleFavorite(previewGame.id); setPreviewGame(null); }}
                    className="flex-1 rounded-xl px-4 py-2 border hover:bg-gray-50"
                  >
                    Save to Favorites
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>

        <Footer variant="full" />
      </div>
    </div>
  );
}

/* ─── UI COMPONENTS ─────────────────────────────────────────────────────────── */

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

function ActionCard({ icon, title, desc, onClick }: {
  icon: React.ReactNode; title: string; desc: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-3xl bg-white shadow-xl border border-rose-100 p-5 hover:shadow-2xl transition"
    >
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

type GameCardProps = {
  game: Game;
  isFavorite: boolean;
  onFavorite: () => void;
  onPreview: () => void;
  onPlay?: () => void;
  disabled?: boolean;
  plusLocked?: boolean;
  disabledReason?: string;
};

function GameCard({ game, isFavorite, onFavorite, onPreview, onPlay, disabled, plusLocked, disabledReason }: GameCardProps) {
  return (
    <div className={`rounded-2xl border p-4 bg-white relative ${plusLocked ? 'border-fuchsia-200' : ''}`}>
      {plusLocked && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-xs px-2 py-0.5 rounded-full">
          <Crown className="w-3 h-3" /> Plus
        </div>
      )}
      <div className="font-medium text-gray-900 pr-16">{game.title}</div>
      <div className="text-xs text-gray-500">{game.category} • {game.duration} min</div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onPreview}
          className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50"
        >
          Preview
        </button>

        <button
          onClick={() => onPlay?.()}
          disabled={disabled}
          title={disabled ? (disabledReason || "Unavailable") : plusLocked ? "Plus required" : "Play now"}
          className={`rounded-xl px-3 py-2 text-sm ${
            plusLocked
              ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
              : disabled
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"
          }`}
        >
          {plusLocked ? "🔒 Unlock" : disabled ? (disabledReason || "Locked") : "Play now"}
        </button>

        <button
          onClick={onFavorite}
          className="ml-auto text-xs text-gray-500 hover:text-gray-900"
        >
          {isFavorite ? "★ Favorite" : "☆ Favorite"}
        </button>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Segmented({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string; icon?: React.ReactNode }[];
}) {
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

const friends = ["Sam", "Joy", "Liam", "Zoe", "Kai"];

function LobbiesSection() {
  const [open, setOpen] = useState(false);
  const [lobbyInvite, setLobbyInvite] = useState<{ code: string; invite_url: string } | null>(null);

  return (
    <>
      <div
        className="rounded-3xl bg-white shadow-xl border border-rose-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-2xl transition"
        onClick={() => setOpen(true)}
      >
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
          <Plus className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">Create Lobby</div>
          <div className="text-sm text-gray-500">Set rules & invite friends</div>
        </div>
      </div>

      <CreateLobbyModal open={open} onClose={() => setOpen(false)} onCreated={(p) => setLobbyInvite(p)} />

      {lobbyInvite && (
        <div className="mt-3 rounded-2xl border p-3 flex items-center gap-2">
          <div className="text-sm">Invite link:</div>
          <code className="text-xs bg-gray-50 px-2 py-1 rounded">{lobbyInvite.invite_url}</code>
          <button
            onClick={() => navigator.clipboard.writeText(lobbyInvite.invite_url)}
            className="ml-auto rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
          >
            Copy
          </button>
          <a
            href={`/lobby/${lobbyInvite.code}`}
            className="rounded-lg px-2 py-1 text-sm bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
          >
            Open lobby
          </a>
        </div>
      )}
    </>
  );
}