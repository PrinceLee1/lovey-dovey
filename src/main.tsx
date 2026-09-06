import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if ('serviceWorker' in navigator) {
  // A controller already present at load time means this page was already
  // running under a previously-installed service worker — so a later
  // controllerchange is a genuine update. On a brand-new install there's no
  // controller yet, and claiming the page still fires controllerchange once;
  // this guard keeps first-time visitors from getting an unnecessary reload.
  const hadController = !!navigator.serviceWorker.controller;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for a newer sw.js on every load — this is what lets an
      // already-installed PWA (which otherwise only re-checks every 24h)
      // notice a fresh deploy promptly.
      reg.update().catch(() => {});
    }).catch(() => {});
  });

  if (hadController) {
    // Once the new service worker takes control, the old cached shell is
    // gone — reload so the page actually runs the new bundle instead of
    // continuing to run the stale one it was loaded with.
    let reloadedForUpdate = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadedForUpdate) return;
      reloadedForUpdate = true;
      window.location.reload();
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
