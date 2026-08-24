import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '../libs/auth';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong. Please try again.');
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

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-emerald-50 grid place-items-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
              Check your email
            </h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              If an account exists for <span className="font-medium text-gray-700">{email}</span>, we've sent a link to reset your password.
            </p>
            <Link to="/signin" className="inline-flex items-center gap-2 mt-8 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </motion.div>
        ) : (
          <>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
              Forgot password?
            </h1>
            <p className="text-gray-400 text-sm mt-1.5 mb-8">No worries, we'll send you reset instructions</p>

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
                    Sending…
                  </span>
                ) : (
                  <>Send reset link <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </form>

            <Link to="/signin" className="flex items-center justify-center gap-2 mt-6 text-sm font-medium text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
