import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const VISIT_KEY = 'pwa_visit_count';
const DISMISSED_KEY = 'pwa_install_dismissed';
const MIN_VISITS = 2;

function isStandalone() {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari's own standalone flag — not covered by the media query above.
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const countedThisLoad = useRef(false);

  useEffect(() => {
    if (countedThisLoad.current) return;
    countedThisLoad.current = true;

    if (isStandalone() || localStorage.getItem(DISMISSED_KEY) === '1') return;

    let count = 0;
    try {
      count = Number(localStorage.getItem(VISIT_KEY) ?? '0') + 1;
      localStorage.setItem(VISIT_KEY, String(count));
    } catch {
      return;
    }

    if (count < MIN_VISITS) return;

    if (isIos()) {
      // iOS has no beforeinstallprompt API at all — installation is only
      // ever the manual Share → Add to Home Screen flow, so show the
      // instructional banner immediately once the visit threshold is hit.
      setVisible(true);
      return;
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  async function install() {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    deferredPrompt.current = null;
    setVisible(false);
  }

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* empty */
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed left-3 right-3 bottom-3 z-[90] mx-auto max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-rose-100 dark:border-gray-800 p-4 flex items-start gap-3"
        >
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
            <Download className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Install LoveyDovey</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isIos()
                ? 'Tap the Share icon, then "Add to Home Screen" for the full app experience.'
                : 'Add it to your home screen for a faster, full-screen experience.'}
            </div>
            {!isIos() && (
              <button
                onClick={install}
                className="mt-2 rounded-lg px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
              >
                Install
              </button>
            )}
          </div>
          <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
