export function isStandalonePwa() {
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
