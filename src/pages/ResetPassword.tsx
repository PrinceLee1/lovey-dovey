import { useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Lock, Mail, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '../libs/auth';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();

  const [email, setEmail]       = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!token) {
      setErr('This reset link is invalid or has expired.');
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, email, password, password_confirmation: confirm });
      setDone(true);
      setTimeout(() => nav('/signin'), 2000);
    } catch (e: any) {
      setErr(e?.message ?? 'Could not reset your password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#fdfbf9] px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm mx-auto"
      >
        <div className="flex items-center gap-2 mb-10">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center shadow-md">
            <Heart className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>LoveyDovey</span>
        </div>

        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-emerald-50 grid place-items-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
              Password reset
            </h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Your password has been updated. Redirecting you to sign in…
            </p>
          </motion.div>
        ) : (
          <>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
              Reset your password
            </h1>
            <p className="text-gray-400 text-sm mt-1.5 mb-8">Choose a new password for your account</p>

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

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">New password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? "text" : "password"} required autoComplete="new-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" minLength={8}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-12 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100 transition text-sm"
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? "text" : "password"} required autoComplete="new-password"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" minLength={8}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100 transition text-sm"
                  />
                </div>
              </div>

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
                    Resetting…
                  </span>
                ) : (
                  <>Reset password <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Remembered your password?{' '}
              <Link to="/signin" className="text-fuchsia-600 hover:text-fuchsia-700 font-medium">Sign in</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
