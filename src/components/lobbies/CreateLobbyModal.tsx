// src/components/lobbies/CreateLobbyModal.tsx
import React, { useState } from "react";
import { api } from "../../libs/axios";
import { X } from "lucide-react";

type Props = { open: boolean; onClose: () => void; onCreated?: (payload: { code:string; invite_url:string }) => void };

export default function CreateLobbyModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("Game Night");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [entry, setEntry] = useState(0);
  const [privacy, setPrivacy] = useState<"Public"|"Private">("Public");
  const [startAt, setStartAt] = useState<string>(""); // datetime-local
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    try {
      setLoading(true); setErr(null);
      // Convert local datetime to ISO (assume local → UTC)
      const iso = startAt ? new Date(startAt).toISOString() : null;
      const { data } = await api.post("/lobbies", {
        name,
        max_players: maxPlayers,
        entry_coins: entry,
        privacy,
        start_at: iso,
      });
      onCreated?.({ code: data.code, invite_url: data.invite_url });
      onClose();
    } catch (e:any) {
      setErr(e.response?.data?.message || e.message || "Failed to create lobby");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-semibold text-gray-900">Create Lobby</div>
          <button onClick={onClose} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"><X className="w-4 h-4"/></button>
        </div>

        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">{err}</div>}

        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-700 mb-1">Lobby name</div>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500" placeholder="Game Night"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-gray-700 mb-1">Max players</div>
              <input type="number" min={2} max={16} value={maxPlayers} onChange={(e)=>setMaxPlayers(parseInt(e.target.value||"4"))}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500" />
            </div>
            <div>
              <div className="text-sm text-gray-700 mb-1">Entry (coins)</div>
              <input type="number" min={0} value={entry} onChange={(e)=>setEntry(parseInt(e.target.value||"0"))}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500" />
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-700 mb-1">Privacy</div>
            <select value={privacy} onChange={(e)=>setPrivacy(e.target.value as any)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500">
              <option>Public</option>
              <option>Private</option>
            </select>
          </div>

          <div>
            <div className="text-sm text-gray-700 mb-1">Start time</div>
            <input type="datetime-local" value={startAt} onChange={(e)=>setStartAt(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500" />
          </div>
        </div>

        <div className="mt-5">
          <button disabled={loading} onClick={submit}
            className="w-full rounded-xl px-4 py-3 font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 disabled:opacity-50">
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
