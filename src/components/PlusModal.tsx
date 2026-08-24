/**
 * PlusModal.tsx
 * ---------------------------------------------------------------------------
 * Upgrade paywall modal. Shows when a free user tries to access Spicy/Erotic
 * content or any other Plus-only feature.
 *
 * HOW IT WORKS:
 *  1. User taps a locked game → GamesDashboard calls setShowPlusModal(true)
 *  2. This modal renders with pricing + a "Subscribe" button
 *  3. "Subscribe" hits POST /api/subscribe/checkout → backend returns { url }
 *  4. We redirect the browser to Stripe Checkout
 *  5. Stripe redirects back to /games?subscribed=1 on success
 *  6. GamesDashboard detects ?subscribed=1, calls refreshUser() to re-fetch
 *     user.is_plus = true, and shows a success toast
 *
 * BACKEND NEEDED:
 *  POST /api/subscribe/checkout  → { url: "https://checkout.stripe.com/..." }
 *  POST /api/webhooks/stripe     → listens for checkout.session.completed,
 *                                   sets users.is_plus = true, plus_expires_at
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X, Sparkles, Zap, Heart, Crown } from 'lucide-react';
import api from '../libs/axios';

type PlusModalProps = {
  open: boolean;
  onClose: () => void;
  /** Which locked feature triggered this — shown in heading */
  reason?: 'spicy' | 'erotic' | 'ai' | 'history' | 'general';
};

const PERKS = [
  { icon: <Zap className="w-4 h-4" />, text: 'Spicy & Erotic game tiers unlocked' },
  { icon: <Sparkles className="w-4 h-4" />, text: 'Unlimited AI-generated prompts' },
  { icon: <Heart className="w-4 h-4" />, text: 'Couples Journal — unlimited memories' },
  { icon: <Crown className="w-4 h-4" />, text: 'Priority leaderboard + exclusive badges' },
];

const REASON_COPY: Record<NonNullable<PlusModalProps['reason']>, { title: string; sub: string }> = {
  spicy:   { title: 'This game is Plus-only 🔥', sub: 'Upgrade to unlock Spicy & Erotic content.' },
  erotic:  { title: 'Adults-only content 🔞',   sub: 'Upgrade to Plus to access Erotic games.' },
  ai:      { title: 'AI prompts are Plus-only ✨', sub: 'Upgrade for unlimited AI-generated content.' },
  history: { title: 'Full history is Plus-only 📜', sub: 'Upgrade to see your complete game history.' },
  general: { title: 'Unlock LoveyDovey Plus 💜',  sub: 'Get the full experience for just $4.99/mo.' },
};

export default function PlusModal({ open, onClose, reason = 'general' }: PlusModalProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const copy = REASON_COPY[reason];

  async function handleSubscribe() {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.post('/subscribe/checkout', {
        // tell backend which success URL to redirect to
        success_url: `${window.location.origin}/games?subscribed=1`,
        cancel_url: window.location.href,
      });
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
          >
            {/* Gradient header */}
            <div className="bg-gradient-to-br from-pink-500 via-fuchsia-600 to-purple-600 px-6 pt-8 pb-10 text-white relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 grid place-items-center hover:bg-white/30 transition"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Crown icon */}
              <div className="mb-3 h-12 w-12 rounded-2xl bg-white/20 grid place-items-center">
                <Crown className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold leading-tight">{copy.title}</h2>
              <p className="mt-1 text-sm text-white/80">{copy.sub}</p>

              {/* Price pill */}
              <div className="mt-4 inline-flex items-baseline gap-1 bg-white/20 rounded-full px-4 py-1.5">
                <span className="text-2xl font-bold">$4.99</span>
                <span className="text-sm text-white/80">/month</span>
              </div>
            </div>

            {/* Perks list — overlaps the header */}
            <div className="px-6 mt-5">
              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-rose-100 dark:border-gray-700 shadow-lg p-4 space-y-3">
                {PERKS.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-600 dark:text-fuchsia-300 grid place-items-center flex-shrink-0">
                      {p.icon}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{p.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 pt-5 pb-6 space-y-3">
              {err && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
                  {err}
                </div>
              )}

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? 'Redirecting to checkout…' : 'Upgrade to Plus — $4.99/mo'}
              </button>

              <button
                onClick={onClose}
                className="w-full rounded-2xl py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                Maybe later
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Cancel anytime. Billed monthly via Stripe. Secure checkout.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}