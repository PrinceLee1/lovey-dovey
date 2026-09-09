import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { isStandalonePwa } from '../libs/pwa';

const PULL_THRESHOLD = 70; // px of drag needed to trigger a refresh
const MAX_PULL = 100; // visual cap so the indicator doesn't drag forever
const RESISTANCE = 0.45; // rubber-band feel: finger moves further than the indicator does

// Installed PWAs run in standalone display mode, which drops the browser
// chrome — and with it, the OS's native pull-to-refresh gesture. This
// restores it. Gated to standalone mode so it doesn't fight Chrome's own
// pull-to-refresh in a normal browser tab.
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!isStandalonePwa()) return;

    function reset() {
      dragging.current = false;
      startY.current = null;
      pullRef.current = 0;
      setPull(0);
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      // Only start tracking if the page is already scrolled to the very
      // top — otherwise this would hijack a normal upward scroll gesture.
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      dragging.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragging.current || startY.current === null || refreshing) return;
      if (window.scrollY > 0) { reset(); return; }

      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }

      const next = Math.min(MAX_PULL, dy * RESISTANCE);
      pullRef.current = next;
      setPull(next);
      e.preventDefault();
    }

    function onTouchEnd() {
      if (!dragging.current) return;
      dragging.current = false;
      startY.current = null;

      if (pullRef.current >= PULL_THRESHOLD) {
        setRefreshing(true);
        window.location.reload();
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', reset);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, [refreshing]);

  if (pull === 0 && !refreshing) return null;

  const progress = Math.min(1, pull / PULL_THRESHOLD);

  return (
    <div
      className="fixed left-0 right-0 z-[300] flex justify-center pointer-events-none"
      style={{
        top: 'env(safe-area-inset-top)',
        transform: `translateY(${Math.max(pull - 36, -36)}px)`,
        transition: dragging.current ? 'none' : 'transform 0.2s ease',
      }}
    >
      <div className="mt-2 h-9 w-9 rounded-full bg-white dark:bg-gray-900 shadow-lg border border-rose-100 dark:border-gray-800 grid place-items-center">
        <RefreshCw
          className={`w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400 ${refreshing ? 'animate-spin' : ''}`}
          style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
        />
      </div>
    </div>
  );
}
