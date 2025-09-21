// src/echo.ts
import Echo from "laravel-echo";
import Pusher from "pusher-js";

// Required for Echo
(window as any).Pusher = Pusher;

const API_BASE = import.meta.env.VITE_API_URL;

// Read envs (Vite)
const KEY = import.meta.env.VITE_PUSHER_APP_KEY ?? import.meta.env.VITE_PUSHER_KEY;
const CLUSTER =
  import.meta.env.VITE_PUSHER_APP_CLUSTER ?? import.meta.env.VITE_PUSHER_CLUSTER ?? "mt1";

// TEMP: verify what the build embedded
console.log("[Echo] VITE_PUSHER_APP_KEY:", KEY);
console.log("[Echo] VITE_PUSHER_APP_CLUSTER:", CLUSTER);
console.log("[Echo] VITE_API_URL:", API_BASE);

// Hard fail early with a clear message if missing
if (!KEY) {
  throw new Error(
    "[Echo] Missing PUSHER APP KEY. Set VITE_PUSHER_APP_KEY in Vercel (Preview + Production) and redeploy."
  );
}
if (!CLUSTER) {
  throw new Error(
    "[Echo] Missing PUSHER CLUSTER. Set VITE_PUSHER_APP_CLUSTER (e.g. mt1, eu, ap2) in Vercel and redeploy."
  );
}

// If you DON'T use private/presence channels, you can remove authorizer.
export const echo = new Echo({
  broadcaster: "pusher",
  key: KEY,
  cluster: CLUSTER,
  forceTLS: true,
  authorizer: (channel) => ({
    authorize: (socketId: string, callback: any) => {
      fetch(`${API_BASE}/broadcasting/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          "X-Socket-Id": socketId,
        },
        body: JSON.stringify({ channel_name: channel.name, socket_id: socketId }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => callback(false, data))
        .catch((err) => callback(true, err));
    },
  }),
});
