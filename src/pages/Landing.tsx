import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Heart, Sparkles, Users, Shield, Zap, Crown, ArrowRight, Check, Star, Flame } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/* ─── Scroll-triggered fade ──────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/* ─── Floating hearts ────────────────────────────────────────────────────── */
function Hearts() {
  const items = [
    { size: 10, left: 5,  delay: 0,   dur: 12, op: 0.18 },
    { size: 16, left: 18, delay: 4,   dur: 16, op: 0.1  },
    { size: 8,  left: 32, delay: 8,   dur: 11, op: 0.15 },
    { size: 20, left: 48, delay: 1.5, dur: 18, op: 0.08 },
    { size: 12, left: 62, delay: 6,   dur: 14, op: 0.12 },
    { size: 9,  left: 78, delay: 10,  dur: 10, op: 0.18 },
    { size: 18, left: 90, delay: 3,   dur: 17, op: 0.09 },
  ];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {items.map((h, i) => (
        <motion.div key={i} className="absolute text-rose-300"
          style={{ left: `${h.left}%`, bottom: "-40px", opacity: h.op }}
          animate={{ y: [0, -window.innerHeight - 100], rotate: [0, 20, -15, 10, 0] }}
          transition={{ duration: h.dur, delay: h.delay, repeat: Infinity, ease: "linear" }}>
          <Heart style={{ width: h.size, height: h.size }} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="relative bg-[#fef9f5] text-gray-900 overflow-x-hidden" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <Hearts />

      {/* Soft ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[800px] h-[600px] rounded-full bg-rose-200/25 blur-[140px]" />
        <div className="absolute bottom-1/3 right-0 w-[600px] h-[600px] rounded-full bg-fuchsia-200/20 blur-[120px]" />
      </div>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#fef9f5]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center shadow-md shadow-rose-200">
              <Heart className="w-4.5 h-4.5 text-white" fill="white" />
            </div>
            <span className="text-[17px] font-bold text-gray-900 tracking-tight">LoveyDovey</span>
          </Link>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-8">
            {[["#features","Features"],["#how","How it works"],["#pricing","Pricing"],["#faq","FAQ"]].map(([h,l]) => (
              <a key={h} href={h} className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                style={{ fontFamily: "system-ui, sans-serif" }}>{l}</a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/games" className="px-5 py-2.5 rounded-xl bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100 transition"
                style={{ fontFamily: "system-ui, sans-serif" }}>Dashboard</Link>
            ) : (
              <>
                <Link to="/signin" className="hidden sm:block px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition"
                  style={{ fontFamily: "system-ui, sans-serif" }}>Sign in</Link>
                <Link to="/onboarding"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition shadow-sm"
                  style={{ fontFamily: "system-ui, sans-serif" }}>
                  Get started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-20 pb-12 md:pt-28 md:pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left copy */}
            <div>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full px-4 py-1.5 mb-7"
                  style={{ fontFamily: "system-ui, sans-serif" }}>
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-xs font-semibold text-rose-600">AI-powered games for love & laughter</span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}
                className="text-5xl md:text-6xl font-black leading-[1.05] tracking-tight text-gray-900 mb-6">
                Playful games<br />
                <em className="not-italic bg-gradient-to-r from-rose-500 to-fuchsia-600 bg-clip-text text-transparent">
                  for couples
                </em><br />
                & friends.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.18 }}
                className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg"
                style={{ fontFamily: "system-ui, sans-serif" }}>
                Truth or dare, spicy dice, AI charades, live lobbies — curated games that
                spark deeper conversations and actual laughter. Free forever.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}
                className="flex flex-wrap gap-3 mb-10">
                <Link to="/onboarding"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white font-semibold shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:brightness-105 transition text-[15px]"
                  style={{ fontFamily: "system-ui, sans-serif" }}>
                  Start playing free <Sparkles className="w-4 h-4" />
                </Link>
                <a href="#how"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50 transition text-[15px] shadow-sm"
                  style={{ fontFamily: "system-ui, sans-serif" }}>
                  How it works
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                className="flex flex-wrap gap-5 text-sm text-gray-400"
                style={{ fontFamily: "system-ui, sans-serif" }}>
                {[["✓","No credit card"],["✓","Works long-distance"],["✓","Up to 10 players"]].map(([c,l]) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">{c}</span>{l}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right — app preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
              className="relative">
              {/* Main card */}
              <div className="relative bg-white rounded-3xl shadow-2xl shadow-rose-100 border border-rose-100 p-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-fuchsia-50/30" />
                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-0.5" style={{ fontFamily: "system-ui, sans-serif" }}>Game Night Lobby</div>
                      <div className="font-bold text-gray-900">Saturday Vibes 🎉</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-emerald-700" style={{ fontFamily: "system-ui, sans-serif" }}>4 online</span>
                    </div>
                  </div>
                  {/* Players */}
                  <div className="flex gap-2 mb-5">
                    {[["P","from-rose-400 to-pink-500"],["L","from-violet-400 to-fuchsia-500"],["A","from-amber-400 to-orange-500"],["M","from-teal-400 to-emerald-500"]].map(([l,g]) => (
                      <div key={l} className={`h-9 w-9 rounded-xl bg-gradient-to-br ${g} grid place-items-center text-white text-sm font-bold shadow-sm`}>{l}</div>
                    ))}
                    <div className="h-9 w-9 rounded-xl border-2 border-dashed border-gray-200 grid place-items-center text-gray-400 text-xs font-bold">+</div>
                  </div>
                  {/* Game cards */}
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    {[
                      { emoji:"🔥", label:"Hot Seat",      tag:"Free", tagColor:"bg-gray-100 text-gray-500",          bg:"from-orange-50 to-rose-50",    border:"border-orange-100" },
                      { emoji:"🎲", label:"Dare Dice",     tag:"Free", tagColor:"bg-gray-100 text-gray-500",          bg:"from-fuchsia-50 to-purple-50", border:"border-fuchsia-100" },
                      { emoji:"🤔", label:"Would You",     tag:"Free", tagColor:"bg-gray-100 text-gray-500",          bg:"from-blue-50 to-indigo-50",    border:"border-blue-100" },
                      { emoji:"✨", label:"Confessions",   tag:"Plus", tagColor:"bg-amber-100 text-amber-700",        bg:"from-amber-50 to-rose-50",     border:"border-amber-200" },
                    ].map(g => (
                      <div key={g.label} className={`rounded-xl border ${g.border} bg-gradient-to-br ${g.bg} p-3 flex items-center gap-2.5`}>
                        <span className="text-xl">{g.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-800 truncate">{g.label}</div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${g.tagColor}`}
                            style={{ fontFamily: "system-ui, sans-serif" }}>{g.tag === "Plus" ? "✦ Plus" : g.tag}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Chat preview */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="text-xs text-gray-400 mb-2 font-semibold" style={{ fontFamily: "system-ui, sans-serif" }}>Party Chat</div>
                    <div className="flex items-end gap-2">
                      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 grid place-items-center text-white text-[10px] font-bold flex-shrink-0">P</div>
                      <div className="bg-white rounded-xl rounded-bl-sm px-3 py-1.5 text-xs text-gray-700 shadow-sm border border-gray-100"
                        style={{ fontFamily: "system-ui, sans-serif" }}>"this game is hilarious 😂🔥"</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-5 -right-4 bg-white rounded-2xl shadow-lg border border-rose-100 px-4 py-2.5 flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <div style={{ fontFamily: "system-ui, sans-serif" }}>
                  <div className="text-xs font-bold text-gray-900">7-day streak!</div>
                  <div className="text-[10px] text-gray-400">+50 XP earned</div>
                </div>
              </motion.div>

              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg border border-fuchsia-100 px-4 py-2.5 flex items-center gap-2">
                <span className="text-lg">👑</span>
                <div style={{ fontFamily: "system-ui, sans-serif" }}>
                  <div className="text-xs font-bold text-gray-900">Top couple</div>
                  <div className="text-[10px] text-gray-400">398 XP this week</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ────────────────────────────────────────────── */}
      <section className="relative z-10 py-8 border-y border-rose-100 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400"
          style={{ fontFamily: "system-ui, sans-serif" }}>
          <span className="flex items-center gap-2"><Users className="w-4 h-4 text-rose-400" /> Couples & groups of 2–10</span>
          <span className="w-px h-4 bg-gray-200 hidden sm:block" />
          <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-rose-400" /> Privacy-first, no ads</span>
          <span className="w-px h-4 bg-gray-200 hidden sm:block" />
          <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-rose-400" /> New games added weekly</span>
          <span className="w-px h-4 bg-gray-200 hidden sm:block" />
          <span className="flex items-center gap-5">
            <span className="flex gap-0.5">{[...Array(5)].map((_,i)=><Star key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor"/>)}</span>
            <span className="font-semibold text-gray-600">4.9 / 5 from couples</span>
          </span>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp className="text-center mb-16">
            <p className="text-rose-500 text-sm font-bold tracking-widest uppercase mb-3" style={{ fontFamily: "system-ui, sans-serif" }}>Features</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">Built for real connection</h2>
            <p className="text-gray-400 mt-4 max-w-md mx-auto text-lg" style={{ fontFamily: "system-ui, sans-serif" }}>
              Everything you need to spark fun, intimacy, and laughter.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { emoji:"✨", title:"AI-generated prompts",    body:"Fresh Truth-or-Dare, Charades, Emoji Chat — no repeats, personalised to your interests.",  bg:"bg-rose-50",    border:"border-rose-100",    tag:null },
              { emoji:"👫", title:"Partner linking",          body:"Pair up, share history automatically, and earn couple streaks together.",                   bg:"bg-pink-50",    border:"border-pink-100",    tag:null },
              { emoji:"🎉", title:"Live group lobbies",       body:"Up to 10 players. Real-time chat, reactions, synced gameplay. No lag, no spoilers.",        bg:"bg-fuchsia-50", border:"border-fuchsia-100", tag:null },
              { emoji:"⚡", title:"XP, streaks & boards",    body:"Daily challenges, weekly targets, and couple leaderboards to stay motivated.",              bg:"bg-amber-50",   border:"border-amber-100",   tag:null },
              { emoji:"🔒", title:"Privacy-first",            body:"Private couple mode. Your intimate moments stay between you two — always.",                bg:"bg-emerald-50", border:"border-emerald-100", tag:null },
              { emoji:"🔞", title:"Plus adult games",         body:"Unlock Spicy & Confessions categories. Animated spin wheel, dare gambling, 3× multiplier.", bg:"bg-orange-50",  border:"border-orange-100",  tag:"Plus" },
            ].map((f,i) => (
              <FadeUp key={f.title} delay={i*0.06}>
                <div className={`group h-full rounded-2xl border ${f.border} ${f.bg} p-6 hover:shadow-lg hover:shadow-rose-100 hover:-translate-y-0.5 transition-all duration-300`}>
                  <div className="text-3xl mb-4">{f.emoji}</div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-base">{f.title}</h3>
                    {f.tag && <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full" style={{ fontFamily: "system-ui, sans-serif" }}>✦ PLUS</span>}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: "system-ui, sans-serif" }}>{f.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how" className="relative z-10 py-24 md:py-32 bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(225,29,72,0.15),transparent)]" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <FadeUp className="text-center mb-16">
            <p className="text-rose-400 text-sm font-bold tracking-widest uppercase mb-3" style={{ fontFamily: "system-ui, sans-serif" }}>Simple setup</p>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">Playing in under a minute</h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n:"01", emoji:"👤", title:"Create your account",    body:"Fast sign-up with email. Set your name, interests, and partner details in 2 minutes." },
              { n:"02", emoji:"🔗", title:"Invite partner or friends", body:"Share your invite code or lobby link. Join from anywhere — no app install required." },
              { n:"03", emoji:"🏆", title:"Play & earn XP",          body:"Pick a game, keep your streak, and climb the couple leaderboard." },
            ].map((s,i) => (
              <FadeUp key={s.n} delay={i*0.12}>
                <div className="relative rounded-2xl border border-white/10 bg-white/5 p-8 hover:bg-white/8 transition-all">
                  <div className="text-4xl mb-5">{s.emoji}</div>
                  <div className="text-xs font-black text-rose-400 tracking-[0.2em] mb-2" style={{ fontFamily: "system-ui, sans-serif" }}>{s.n}</div>
                  <h3 className="text-xl font-black text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed" style={{ fontFamily: "system-ui, sans-serif" }}>{s.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp className="text-center mt-12" delay={0.3}>
            <Link to="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white font-bold shadow-xl shadow-rose-900/30 hover:brightness-110 transition"
              style={{ fontFamily: "system-ui, sans-serif" }}>
              Try it free <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp className="text-center mb-16">
            <p className="text-rose-500 text-sm font-bold tracking-widest uppercase mb-3" style={{ fontFamily: "system-ui, sans-serif" }}>Pricing</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">Start free. Go spicy with Plus.</h2>
            <p className="text-gray-400 mt-4 max-w-md mx-auto" style={{ fontFamily: "system-ui, sans-serif" }}>
              All the fun for free. Unlock adult game categories with Plus.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* FREE */}
            <FadeUp delay={0.05}>
              <div className="h-full rounded-3xl border border-gray-200 bg-white p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-7">
                  <div className="text-xs font-black tracking-[0.18em] text-gray-400 uppercase mb-3" style={{ fontFamily: "system-ui, sans-serif" }}>Free</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-black text-gray-900">$0</span>
                    <span className="text-gray-400 text-sm" style={{ fontFamily: "system-ui, sans-serif" }}>forever</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2" style={{ fontFamily: "system-ui, sans-serif" }}>Everything to get started</p>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {[
                    "Playful & Romantic game packs",
                    "Truth or Dare (PG & PG-13)",
                    "Would You Rather",
                    "Hot Seat party game",
                    "AI Charades & Trivia",
                    "Live group lobbies (10 players)",
                    "Partner linking & streaks",
                    "XP, leaderboards & challenges",
                    "Party chat & emoji reactions",
                  ].map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-600" style={{ fontFamily: "system-ui, sans-serif" }}>
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-px" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to="/onboarding"
                  className="block w-full text-center py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-900 hover:text-gray-900 transition"
                  style={{ fontFamily: "system-ui, sans-serif" }}>
                  Get started free
                </Link>
              </div>
            </FadeUp>

            {/* PLUS */}
            <FadeUp delay={0.12}>
              <div className="h-full rounded-3xl bg-gray-900 p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-gray-900/20">
                {/* Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-600/15 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

                {/* Popular badge */}
                <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-orange-900 text-[10px] font-black px-3 py-1.5 rounded-full shadow"
                  style={{ fontFamily: "system-ui, sans-serif" }}>
                  <Crown className="w-2.5 h-2.5" /> MOST POPULAR
                </div>

                <div className="relative mb-7">
                  <div className="text-xs font-black tracking-[0.18em] text-rose-400 uppercase mb-3" style={{ fontFamily: "system-ui, sans-serif" }}>Plus ✦</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-black text-white">$4.99</span>
                    <span className="text-white/40 text-sm" style={{ fontFamily: "system-ui, sans-serif" }}>/month</span>
                  </div>
                  <p className="text-white/45 text-sm mt-2" style={{ fontFamily: "system-ui, sans-serif" }}>Everything in Free, plus:</p>
                </div>

                <ul className="space-y-3 flex-1 mb-8 relative">
                  {[
                    { l: "Spicy game pack (18+)",               hot: true  },
                    { l: "Erotic / Confessions (18+)",          hot: true  },
                    { l: "Confessions Roulette spin wheel",     hot: true  },
                    { l: "Double Down dare mechanic",           hot: false },
                    { l: "Streak multiplier up to 3×",          hot: false },
                    { l: "Couples Journal — memory wall",       hot: false },
                    { l: "Priority AI generation",              hot: false },
                    { l: "All Free features included",          hot: false },
                  ].map(f => (
                    <li key={f.l} className="flex items-start gap-3 text-sm" style={{ fontFamily: "system-ui, sans-serif" }}>
                      <Check className="w-4 h-4 text-rose-400 flex-shrink-0 mt-px" />
                      <span className={f.hot ? "text-white font-medium" : "text-white/55"}>{f.l}</span>
                      {f.hot && (
                        <span className="ml-auto flex-shrink-0 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/25 px-1.5 py-0.5 rounded-full">HOT</span>
                      )}
                    </li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/onboarding"
                    className="relative block w-full text-center py-4 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white font-bold text-sm shadow-xl shadow-rose-900/40 hover:brightness-110 transition"
                    style={{ fontFamily: "system-ui, sans-serif" }}>
                    Start with Plus ✦
                  </Link>
                </motion.div>
                <p className="text-center text-xs text-white/20 mt-3" style={{ fontFamily: "system-ui, sans-serif" }}>
                  Cancel anytime · Age verification required for 18+ content
                </p>
              </div>
            </FadeUp>
          </div>

          <FadeUp className="mt-8 text-center" delay={0.2}>
            <p className="text-sm text-gray-400 flex items-center justify-center gap-2" style={{ fontFamily: "system-ui, sans-serif" }}>
              <Shield className="w-4 h-4 text-gray-300" />
              Plus content is strictly 18+. Age verification required at checkout. Powered by Stripe.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 md:py-28 bg-rose-50">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp className="text-center mb-12">
            <div className="flex justify-center gap-0.5 mb-3">
              {[...Array(5)].map((_,i) => <Star key={i} className="w-4 h-4 text-amber-400" fill="currentColor"/>)}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Loved by couples & friends</h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { q: "Date night completely transformed. We actually laugh and open up way more.", a: "Amara & Tunde",   tag: "Couple mode",   avatar: "AT" },
              { q: "Group lobbies are an absolute riot. Weekly trivia is our new tradition.",    a: "Liam & the crew", tag: "Party lobby",   avatar: "LC" },
              { q: "Long distance is so much better with the streaks and daily challenges.",     a: "Maya & Alex",     tag: "Long distance", avatar: "MA" },
            ].map((t,i) => (
              <FadeUp key={t.a} delay={i*0.1}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100 hover:shadow-md transition-shadow h-full flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_,j) => <Star key={j} className="w-3.5 h-3.5 text-amber-400" fill="currentColor"/>)}
                  </div>
                  <p className="text-gray-800 leading-relaxed flex-1 mb-5">"{t.q}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-400 to-fuchsia-500 grid place-items-center text-white text-xs font-black flex-shrink-0">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900" style={{ fontFamily: "system-ui, sans-serif" }}>{t.a}</div>
                      <div className="text-xs text-rose-500 font-medium" style={{ fontFamily: "system-ui, sans-serif" }}>{t.tag}</div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 md:py-20 px-6">
        <FadeUp>
          <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 p-10 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-rose-200">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,255,255,0.2),transparent)]" />
            <div className="relative z-10">
              <div className="text-5xl mb-5">💑</div>
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
                Ready to play together?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-sm mx-auto" style={{ fontFamily: "system-ui, sans-serif" }}>
                Start free. Get closer in your first game.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link to="/onboarding"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-rose-600 font-bold hover:bg-rose-50 transition shadow-xl text-[15px]"
                  style={{ fontFamily: "system-ui, sans-serif" }}>
                  <Flame className="w-4 h-4" /> Get started free
                </Link>
                {!user && (
                  <Link to="/signin"
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/15 border border-white/30 text-white font-semibold hover:bg-white/25 transition text-[15px]"
                    style={{ fontFamily: "system-ui, sans-serif" }}>
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="relative z-10 py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Common questions</h2>
          </FadeUp>
          <div className="space-y-3">
            {[
              { q: "Is LoveyDovey really free?",           a: "Yes — core games, lobbies, partner linking, XP and streaks are all free forever. Plus is optional for adult content." },
              { q: "What's in the Plus plan?",             a: "Plus unlocks Spicy, Erotic and Confessions game categories (18+). You also get the Confessions Roulette spin wheel, Double Down dare mechanic, streak multipliers up to 3×, and the Couples Journal." },
              { q: "Is Plus content really 18+ only?",     a: "Yes. Age verification is required at checkout. The paywall is firm — Plus content is never visible to Free users." },
              { q: "Can we play with friends remotely?",   a: "Absolutely. Create a lobby, share the invite code, and up to 10 players can join from anywhere. Party chat and reactions are built in." },
              { q: "Do we have to be a couple?",           a: "Not at all. Party mode works great for friend groups of 2–10. Couple mode adds partner-linking and partner-specific prompts." },
              { q: "Is our data private?",                 a: "Yes. Private couple mode keeps your game history between you two. We never sell data or show ads inside the product." },
            ].map((f,i) => (
              <FadeUp key={f.q} delay={i*0.04}>
                <details className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <summary className="cursor-pointer list-none flex items-center justify-between px-6 py-5 gap-4">
                    <span className="font-semibold text-gray-900 text-sm leading-snug" style={{ fontFamily: "system-ui, sans-serif" }}>{f.q}</span>
                    <span className="text-gray-300 group-open:text-rose-400 group-open:rotate-45 transition-all duration-200 text-2xl leading-none flex-shrink-0 font-light">+</span>
                  </summary>
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: "system-ui, sans-serif" }}>{f.a}</p>
                  </div>
                </details>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 bg-gray-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center shadow-lg shadow-rose-900/30">
                <Heart className="w-4 h-4 text-white" fill="white" />
              </div>
              <div>
                <div className="font-bold text-white text-[15px]" style={{ fontFamily: "Georgia, serif" }}>LoveyDovey</div>
                <div className="text-xs text-white/35" style={{ fontFamily: "system-ui, sans-serif" }}>Games for love & laughter</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/40" style={{ fontFamily: "system-ui, sans-serif" }}>
              {[["#features","Features"],["#how","How it works"],["#pricing","Pricing"],["#faq","FAQ"]].map(([h,l]) => (
                <a key={h} href={h} className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link to="/signin" className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/25 transition"
                style={{ fontFamily: "system-ui, sans-serif" }}>Sign in</Link>
              <Link to="/onboarding" className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-sm font-semibold hover:brightness-110 transition"
                style={{ fontFamily: "system-ui, sans-serif" }}>Get started</Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
            <p className="text-xs text-white/25" style={{ fontFamily: "system-ui, sans-serif" }}>
              © {new Date().getFullYear()} LoveyDovey. Built with ❤️ for couples everywhere.
            </p>
            <div className="flex gap-5 text-xs text-white/25" style={{ fontFamily: "system-ui, sans-serif" }}>
              <a href="#" className="hover:text-white/60 transition">Privacy Policy</a>
              <a href="#" className="hover:text-white/60 transition">Terms of Service</a>
              <a href="#" className="hover:text-white/60 transition">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}