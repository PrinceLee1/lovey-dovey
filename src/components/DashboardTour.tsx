import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../libs/axios';

type Step = { selector: string; title: string; body: string };

const STEPS: Step[] = [
  {
    selector: '[data-tour="couple-toggle"]',
    title: 'Pick your mode',
    body: 'Choose your mode — Couple for you and your partner, Group for friends.',
  },
  {
    selector: '[data-tour="game-cards"]',
    title: 'Find a game',
    body: 'Pick any game and hit Play Now to start. Use the category filters to find the right vibe.',
  },
  {
    selector: '[data-tour="create-lobby"]',
    title: 'Play with a group',
    body: 'Create a Lobby to invite friends with a shareable code. They join, you play.',
  },
  {
    selector: '[data-tour="daily-challenge"]',
    title: "Don't break the streak",
    body: 'Complete the Daily Challenge every day to earn XP and keep your streak alive 🔥',
  },
];

const PAD = 8;

export default function DashboardTour({ active, onDone }: { active: boolean; onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const step = STEPS[stepIndex];
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) {
      // This step's target isn't on the page right now (e.g. the Daily
      // Challenge card only renders once a partner is linked) — skip it
      // rather than spotlighting nothing.
      setStepIndex((i) => i + 1);
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setRect(el.getBoundingClientRect());
    setReady(true);
  }, [stepIndex]);

  useEffect(() => {
    if (!active) return;
    setReady(false);
    const t = setTimeout(measure, 300); // let scrollIntoView settle
    return () => clearTimeout(t);
  }, [active, stepIndex, measure]);

  useEffect(() => {
    if (!active || stepIndex >= STEPS.length) return;
    if (stepIndex >= STEPS.length) return;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, stepIndex, measure]);

  useEffect(() => {
    if (active && stepIndex >= STEPS.length) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, active]);

  async function finish() {
    setReady(false);
    try {
      await api.post('/user/tour/complete');
    } catch {
      /* best-effort — not critical if this fails once, tour just won't be marked done */
    }
    onDone();
  }

  function skip() {
    finish();
  }

  function next() {
    if (stepIndex + 1 >= STEPS.length) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  if (!active || !ready || !rect || stepIndex >= STEPS.length) return null;

  const step = STEPS[stepIndex];
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const top = Math.max(0, rect.top - PAD);
  const left = Math.max(0, rect.left - PAD);
  const right = Math.min(vw, rect.right + PAD);
  const bottom = Math.min(vh, rect.bottom + PAD);

  const showBelow = bottom + 180 < vh;
  const tooltipTop = showBelow ? bottom + 16 : undefined;
  const tooltipBottom = showBelow ? undefined : vh - top + 16;
  const tooltipLeft = Math.min(Math.max(16, left), Math.max(16, vw - 336));

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Four dimmed panels tiling around the spotlight cutout — dims the
          page AND blocks interaction with everything except the
          highlighted element, unlike a single box-shadow cutout which only
          looks dimmed but doesn't block clicks outside its own box. */}
      <div className="fixed bg-black/70" style={{ top: 0, left: 0, width: vw, height: top }} />
      <div className="fixed bg-black/70" style={{ top: bottom, left: 0, width: vw, height: Math.max(0, vh - bottom) }} />
      <div className="fixed bg-black/70" style={{ top, left: 0, width: left, height: bottom - top }} />
      <div className="fixed bg-black/70" style={{ top, left: right, width: Math.max(0, vw - right), height: bottom - top }} />

      {/* Glowing ring around the spotlighted element */}
      <div
        className="fixed rounded-2xl ring-4 ring-fuchsia-500 pointer-events-none"
        style={{ top, left, width: right - left, height: bottom - top }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: showBelow ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed w-[320px] rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-rose-100 dark:border-gray-800 p-4"
          style={{ top: tooltipTop, bottom: tooltipBottom, left: tooltipLeft }}
        >
          {/* Arrow pointing from the tooltip toward the spotlighted element */}
          <div
            className={`absolute w-3 h-3 bg-white dark:bg-gray-900 border-rose-100 dark:border-gray-800 rotate-45 ${
              showBelow ? '-top-1.5 border-t border-l' : '-bottom-1.5 border-b border-r'
            }`}
            style={{ left: Math.min(Math.max(16, left + (right - left) / 2 - tooltipLeft - 6), 288) }}
          />

          <div className="text-xs font-medium text-fuchsia-600 dark:text-fuchsia-400 mb-1">
            Step {stepIndex + 1} of {STEPS.length}
          </div>
          <div className="font-display text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {step.title}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{step.body}</p>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={skip}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex ? 'w-4 bg-fuchsia-600' : 'w-1.5 bg-gray-300 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 whitespace-nowrap"
            >
              {stepIndex + 1 >= STEPS.length ? "Got it, let's play!" : 'Next'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
