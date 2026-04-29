import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function SignIn() {
  const { login, loading } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [err, setErr]           = useState<string|null>(null);
  const nav = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      nav('/games');
    } catch (e: any) {
      setErr(e?.message ?? 'Invalid email or password');
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[#fdfbf9]">

      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <div className="hidden md:flex relative bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-700 items-center justify-center overflow-hidden">
        {/* Orbs */}
        <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-white/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-black/15 blur-3xl translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.12),transparent_60%)]" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 text-center px-12 max-w-sm"
        >
          {/* App card illustration */}
          <svg viewBox="0 0 280 300" className="w-64 mx-auto drop-shadow-2xl mb-8" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Main app card */}
            <rect x="10" y="10" width="260" height="280" rx="28" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.3" strokeWidth="1.5"/>
            {/* Top bar */}
            <rect x="10" y="10" width="260" height="56" rx="28" fill="white" fillOpacity="0.15"/>
            <rect x="10" y="38" width="260" height="28" fill="white" fillOpacity="0.15"/>
            <circle cx="38" cy="38" r="16" fill="white" fillOpacity="0.3"/>
            <path d="M38 38 C38 38 30 30 26 34 C22 38 24 44 38 54 C52 44 54 38 50 34 C46 30 38 38 38 38Z" fill="#fb7185"/>
            <text x="68" y="33" fontSize="11" fill="white" fontWeight="800">LoveyDovey</text>
            <text x="68" y="47" fontSize="8" fill="white" fillOpacity="0.65">Welcome back 👋</text>
            {/* XP card */}
            <rect x="24" y="78" width="232" height="58" rx="16" fill="white" fillOpacity="0.18"/>
            <text x="40" y="100" fontSize="8" fill="white" fillOpacity="0.6" fontWeight="600">YOUR PROGRESS</text>
            <text x="40" y="118" fontSize="20" fill="white" fontWeight="800">398 XP</text>
            <rect x="40" y="126" width="160" height="6" rx="3" fill="white" fillOpacity="0.2"/>
            <rect x="40" y="126" width="118" height="6" rx="3" fill="white"/>
            <text x="208" y="132" fontSize="8" fill="white" fillOpacity="0.7">Lvl 3</text>
            {/* Game cards row */}
            <rect x="24" y="148" width="108" height="78" rx="16" fill="white" fillOpacity="0.18"/>
            <text x="40" y="172" fontSize="22">💑</text>
            <text x="68" y="172" fontSize="10" fill="white" fontWeight="700">Couple</text>
            <text x="68" y="186" fontSize="8" fill="white" fillOpacity="0.6">Mode</text>
            <rect x="40" y="196" width="80" height="22" rx="8" fill="white" fillOpacity="0.2"/>
            <text x="80" y="211" fontSize="8" fill="white" textAnchor="middle">Play now →</text>
            <rect x="148" y="148" width="108" height="78" rx="16" fill="white" fillOpacity="0.18"/>
            <text x="164" y="172" fontSize="22">🎉</text>
            <text x="192" y="172" fontSize="10" fill="white" fontWeight="700">Party</text>
            <text x="192" y="186" fontSize="8" fill="white" fillOpacity="0.6">Mode</text>
            <rect x="164" y="196" width="80" height="22" rx="8" fill="white" fillOpacity="0.2"/>
            <text x="204" y="211" fontSize="8" fill="white" textAnchor="middle">Join lobby →</text>
            {/* Daily challenge */}
            <rect x="24" y="238" width="232" height="40" rx="14" fill="white" fillOpacity="0.2"/>
            <text x="40" y="256" fontSize="10" fill="white" fillOpacity="0.85">🎯  Daily Challenge awaits!</text>
            <text x="40" y="270" fontSize="8" fill="white" fillOpacity="0.55">Complete today for +50 XP bonus</text>
          </svg>

          <h2 className="text-3xl font-black text-white leading-tight tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
            Your love story<br />continues here.
          </h2>
          <p className="text-white/70 text-sm mt-3 leading-relaxed">
            Sign back in to your games, streaks, and your partner.
          </p>
        </motion.div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────────────── */}
      <div className="flex flex-col justify-center px-6 md:px-14 py-12 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(253,164,175,0.08),transparent_50%)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm mx-auto relative"
        >
          {/* Logo — mobile only */}
          <div className="flex items-center gap-2 mb-10 md:hidden">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center shadow-md">
              <Heart className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>LoveyDovey</span>
          </div>

          {/* Logo — desktop */}
          <div className="hidden md:flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center shadow-md">
              <Heart className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>LoveyDovey</span>
          </div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
            Welcome back
          </h1>
          <p className="text-gray-400 text-sm mt-1.5 mb-8">Sign in to continue playing</p>

          {/* Error */}
          {err && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            >
              <span className="text-red-500 mt-0.5 text-sm">⚠️</span>
              <p className="text-sm text-red-700">{err}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100 transition text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">Password</label>
                <button type="button" className="text-xs text-fuchsia-600 hover:text-fuchsia-700 font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-12 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100 transition text-sm"
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit" disabled={loading}
              whileHover={loading ? {} : { scale: 1.01 }}
              whileTap={loading ? {} : { scale: 0.98 }}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all mt-2 ${
                loading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white shadow-lg shadow-rose-200 hover:shadow-rose-300"
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full" />
                  Signing in…
                </span>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">New to LoveyDovey?</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Sign up CTA */}
          <Link to="/onboarding">
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-rose-300 hover:bg-rose-50/50 hover:text-rose-700 transition-all">
              <Heart className="w-4 h-4" />
              Create an account
            </motion.div>
          </Link>

          <p className="text-center text-xs text-gray-400 mt-6">
            By signing in you agree to our{" "}
            <span className="text-gray-600 underline cursor-pointer">Terms</span> &{" "}
            <span className="text-gray-600 underline cursor-pointer">Privacy</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}