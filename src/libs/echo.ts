import Echo from "laravel-echo";
import Pusher from "pusher-js";

const API_BASE = import.meta.env.VITE_API_URL; // e.g. https://couples.test
const pusher = Pusher;;
(window as any).Pusher = pusher; // Laravel Echo expects it on window
export const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_KEY,
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  // if you use self-hosted WS, also set wsHost/wsPort + forceTLS:false
  authorizer: (channel) => ({
    authorize: (socketId: string, callback: any) => {
      fetch(`${API_BASE}/broadcasting/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "Authorization": `Bearer ${localStorage.getItem("auth_token") || ""}`,
          "X-Socket-Id": socketId, // optional, harmless
        },
        // ✅ IMPORTANT: include socket_id in the body
        body: JSON.stringify({
          channel_name: channel.name,
          socket_id: socketId,
        }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => callback(false, data))
        .catch((err) => callback(true, err));
    },
  }),
});
