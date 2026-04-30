// src/libs/echo.ts — FULLY FIXED
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window { Pusher: typeof Pusher }
}

window.Pusher = Pusher;

const KEY     = import.meta.env.VITE_PUSHER_APP_KEY as string;
const CLUSTER = (import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1') as string;

// IMPORTANT: VITE_API_URL must be the base URL with NO /api suffix
// e.g.  VITE_API_URL=https://yourapi.com
// The broadcasting/auth endpoint sits at: https://yourapi.com/broadcasting/auth
// NOT at: https://yourapi.com/api/broadcasting/auth
//
// If your broadcasting/auth IS under /api prefix, set:
// VITE_API_URL=https://yourapi.com/api
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

if (import.meta.env.DEV) {
  // Full Pusher logging in development
  Pusher.logToConsole = true;
  console.info('[Echo] KEY:', KEY ? `${KEY.slice(0, 6)}…` : '❌ MISSING');
  console.info('[Echo] CLUSTER:', CLUSTER);
  console.info('[Echo] AUTH URL:', `${API_URL}/broadcasting/auth`);
}

export const echo = new Echo({
  broadcaster: 'pusher',
  key        : KEY,
  cluster    : CLUSTER,
  forceTLS   : import.meta.env.VITE_PUSHER_SCHEME !== 'http',

  authorizer: (channel) => ({
    authorize: (socketId, cb) => {
      const token = localStorage.getItem('auth_token') || '';

      if (!token) {
        console.error('[Echo auth] ❌ No auth_token in localStorage');
        cb(new Error('No auth token'), null);
        return;
      }

      const authUrl = `${API_URL}/broadcasting/auth`;

      fetch(authUrl, {
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
          const text = await r.text(); // read as text first — catches empty body

          if (!text || text.trim() === '') {
            // Empty body = channel name doesn't match channels.php
            // Check: Broadcast::channel('lobby.{code}') in channels.php
            // The "presence-" prefix is stripped by Laravel before lookup
            console.error(
              `[Echo auth] ❌ EMPTY response for "${channel.name}"\n` +
              `→ Your channels.php doesn't have a matching Broadcast::channel() entry.\n` +
              `→ Laravel strips "presence-" prefix, so for channel "${channel.name}"\n` +
              `  channels.php needs: Broadcast::channel('${channel.name.replace(/^presence-/, '')}', ...)`
            );
            cb(new Error('Empty auth response — check channels.php'), null);
            return;
          }

          let data: any;
          try {
            data = JSON.parse(text);
          } catch {
            console.error('[Echo auth] ❌ Non-JSON response:', text.slice(0, 200));
            cb(new Error('Non-JSON auth response'), null);
            return;
          }

          if (r.ok) {
            cb(null, data);
          } else {
            console.error(`[Echo auth] ❌ ${r.status} for "${channel.name}":`, data);
            cb(new Error(data.message || `Auth failed ${r.status}`), null);
          }
        })
        .catch((err) => {
          console.error('[Echo auth] ❌ Network error:', err);
          cb(err, null);
        });
    },
  }),
});

// Connection lifecycle logging — cast connector to any to avoid union type narrowing issue
const pusherConnector = (echo.connector as any).pusher;
if (pusherConnector?.connection) {
  pusherConnector.connection.bind('connected', () => {
    console.info('[Echo] ✅ Connected — socket:', echo.socketId());
  });
  pusherConnector.connection.bind('error', (err: any) => {
    console.error('[Echo] ❌ Connection error:', err);
  });
  pusherConnector.connection.bind('disconnected', () => {
    console.warn('[Echo] ⚠️ Disconnected');
  });
}