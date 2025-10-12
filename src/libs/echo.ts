// src/lib/echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window { Pusher: typeof Pusher }
}

// Make Pusher available for laravel-echo
window.Pusher = Pusher;

// ---- CONFIG (Pusher Cloud) ----
// Make sure these are set in Vercel (or .env.local for dev):
// VITE_PUSHER_APP_KEY, VITE_PUSHER_APP_CLUSTER, VITE_API_URL
const KEY     = import.meta.env.VITE_PUSHER_KEY as string;
const CLUSTER = (import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1') as string;
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

if (!KEY) {
  // Helps catch missing env at build/runtime
  console.warn('[echo] VITE_PUSHER_APP_KEY is missing');
}

export const echo = new Echo({
  broadcaster: 'pusher',
  key: KEY,
  cluster: CLUSTER,
  forceTLS: true,          // Cloud uses WSS
  // If you prefer, you can pass a client explicitly:
  // client: new Pusher(KEY, { cluster: CLUSTER, forceTLS: true }),

  // Use bearer token for private/presence auth
  authorizer: (channel) => ({
    authorize: (socketId, cb) => {
      fetch(`${API_URL}/broadcasting/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
      })
        .then(async (r) => {
          const data = await r.json();
          if (r.ok) {
            cb(null, data);
          } else {
            cb(new Error(data.message || 'Authorization failed'), data);
          }
        })
        .catch((err) => cb(err, null));
    },
  }),
});

