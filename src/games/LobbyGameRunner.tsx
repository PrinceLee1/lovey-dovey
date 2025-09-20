// src/games/LobbyGameRunner.tsx
import { useEffect, useState } from "react";
import { api } from "../libs/axios";
import TriviaDuoVsDuo from "../games/TriviaDuoVsDuo";
import CharadesAI from "../games/CharadesAI";

export default function LobbyGameRunner() {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<{ code:string; sessionId:number; kind:'trivia'|'charades_ai' }|null>(null);
  const isHostRef = { current: false };

  useEffect(() => {
    function handler(e: any) {
      setCtx(e.detail);
      setOpen(true);
      // quick host check (you can pass from LobbyRoom or fetch lobby)
      isHostRef.current = true;
    }
    window.addEventListener("open-lobby-game", handler as any);
    return () => window.removeEventListener("open-lobby-game", handler as any);
  }, []);

  if (!open || !ctx) return null;

  const { code, sessionId, kind } = ctx;

  async function onFinish(res:any) {
    await api.post(`/lobbies/${code}/games/${sessionId}/end`, { result: res });
    setOpen(false);
  }


  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-xl">
        {kind === "trivia" && (
          <TriviaDuoVsDuo
            onFinish={onFinish}
            // Host can also echo out snapshots: wrap inside component in your handlers, e.g.,
            // on every tick/buzz/answer call wrapUpdate({ type:'state', data:{ ... } })
          />
        )}
        {kind === "charades_ai" && (
          <CharadesAI
            onFinish={onFinish}
            // likewise wrapUpdate for "guessed", "skip", etc if you want spectators to animate
          />
        )}
      </div>
    </div>
  );
}
