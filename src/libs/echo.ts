// src/echo.ts
import Echo from "laravel-echo";
import Pusher from "pusher-js";

// pusher-js must be on window for Echo
(window as any).Pusher = Pusher;

const API_BASE = import.meta.env.VITE_API_URL; // e.g. https://api.example.com

export const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_APP_KEY!,         // <-- required
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER!, // <-- required, e.g. "mt1", "eu", "ap2"
  forceTLS: true,
  // (only needed for private/presence channels)
  authorizer: (channel) => ({
    authorize: (socketId: string, callback: any) => {
      fetch(`${API_BASE}/broadcasting/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "Authorization": `Bearer ${localStorage.getItem("auth_token") || ""}`,
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
