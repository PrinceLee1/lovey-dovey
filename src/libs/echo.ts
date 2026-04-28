// src/libs/echo.ts — FIXED
// ─────────────────────────────────────────────────────────────────────────────
// FIXES:
//  1. VITE_PUSHER_KEY → VITE_PUSHER_APP_KEY (was silently undefined, breaking all presence)
//  2. Added connection state logging so you can see in DevTools what's happening
//  3. Auth error now logs the full response so you can debug 403s
//  4. forceTLS driven by VITE_PUSHER_SCHEME env var (consistent with other files)

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window { Pusher: typeof Pusher }
}

window.Pusher = Pusher;

const KEY     = import.meta.env.VITE_PUSHER_APP_KEY as string;   // ← FIXED (was VITE_PUSHER_KEY)
const CLUSTER = (import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1') as string;
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// ── Dev-time guard so you know immediately if env is misconfigured ─────────
if (!KEY) {
  console.error(
    '[LoveyDovey Echo] ❌ VITE_PUSHER_APP_KEY is missing from your .env file.\n' +
    'Presence channels will NOT work. Add it and restart Vite.'
  );
}
if (!API_URL) {
  console.error(
    '[LoveyDovey Echo] ❌ VITE_API_URL is missing. Broadcasting auth will fail.'
  );
}

// ── Enable Pusher logging in development only ─────────────────────────────
if (import.meta.env.DEV) {
  Pusher.logToConsole = true;
}

export const echo = new Echo({
  broadcaster : 'pusher',
  key         : KEY,
  cluster     : CLUSTER,
  forceTLS    : import.meta.env.VITE_PUSHER_SCHEME !== 'http', // true unless explicitly http

  authorizer: (channel) => ({
    authorize: (socketId, cb) => {
      const token = localStorage.getItem('auth_token') || '';

      if (!token) {
        console.error('[Echo auth] No auth_token in localStorage — user not logged in?');
        cb(new Error('No auth token'), null);
        return;
      }

      fetch(`${API_URL}/broadcasting/auth`, {
        method : 'POST',
        headers: {
          'Content-Type'    : 'application/json',
          'Accept'          : 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization'   : `Bearer ${token}`,
        },
        body: JSON.stringify({
          socket_id   : socketId,
          channel_name: channel.name,
        }),
      })
        .then(async (r) => {
          const data = await r.json();
          console.log(`Auth for "${channel.name}":`, r.status, data);
          if (r.ok) {
            cb(null, data);
          } else {
            // Log the full error so you can debug 403s in DevTools
            console.error(
              `[Echo auth] ❌ ${r.status} on channel "${channel.name}":`,
              data
            );
            cb(new Error(data.message || `Auth failed (${r.status})`), null);
          }
        })
        .catch((err) => {
          console.error('[Echo auth] Network error during auth:', err);
          cb(err, null);
        });
    },
  }),
});

// ── Connection state logging (visible in DevTools console) ────────────────
echo.connector.pusher.connection.bind('connected', () => {
  console.info('[Echo] ✅ Pusher connected — socket ID:', echo.socketId());
});
echo.connector.pusher.connection.bind('error', (err: any) => {
  console.error('[Echo] ❌ Pusher connection error:', err);
});
echo.connector.pusher.connection.bind('disconnected', () => {
  console.warn('[Echo] ⚠️ Pusher disconnected');
});