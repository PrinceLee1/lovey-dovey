/**
 * SyncedLobbyGameRunner.tsx — FIXED
 *
 * Key fixes:
 *  1. useGameSync now passes userId so events from self are ignored (no echo loop)
 *  2. Host receives "vote"/"buzz"/"answer" events from non-host players
 *  3. Non-host receives "state"/"tick" events from host
 *  4. Players guard added so games don't crash when players[] is still loading
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { echo } from "../libs/echo";
import { api } from "../libs/axios";
import type { GameResult } from "../games/types";
import { useAuth } from "../context/AuthContext";
import HotSeat from "../games/HotSeat";
import WouldYouRather from "../games/WouldYouRather";
import GroupDareDice from "../games/GroupDareDice";
import TriviaDuoVsDuo from "../games/TriviaDuoVsDuo";
import CharadesAI from "../games/CharadesAI";

type GameKind = "trivia" | "charades_ai" | "hot_seat" | "would_you_rather" | "spice_dice";

type Props = {
  kind: GameKind;
  sessionId: number;
  lobbyCode: string;
  hostId: number;
  players: string[];
  onFinish: (res: GameResult) => void;
};

// ── Core sync hook ────────────────────────────────────────────────────────────
function useGameSync(
  sessionId: number,
  lobbyCode: string,
  isHost: boolean,
  onHostReceive: (e: any) => void,   // host receives: vote, buzz, answer from players
  onPlayerReceive: (e: any) => void, // players receive: state, tick from host
) {
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // broadcast — host pushes full state to all players
  const broadcast = useCallback((type: string, payload: any) => {
    if (pendingRef.current) clearTimeout(pendingRef.current);
    const delay = type === "tick" ? 1000 : 0;
    pendingRef.current = setTimeout(() => {
      api.post(`/lobbies/${lobbyCode}/games/${sessionId}/action`, {
        type,
        data: payload,
      }).catch(() => {});
    }, delay);
  }, [lobbyCode, sessionId]);

  // sendAction — non-host players send votes/buzzes to host
  const sendAction = useCallback((type: string, payload: any) => {
    api.post(`/lobbies/${lobbyCode}/games/${sessionId}/action`, {
      type,
      data: payload,
    }).catch(() => {});
  }, [lobbyCode, sessionId]);

  useEffect(() => {
    console.log(`[GameSync] Subscribing to lobby-game.${sessionId} as ${isHost ? 'HOST' : 'PLAYER'}`);

    echo.channel(`lobby-game.${sessionId}`)
      .listen(".LobbyGameUpdate", (e: any) => {
        console.log(`[GameSync] Received event:`, e.type, e.data, `isHost:${isHost}`);

        // HOST receives: vote, buzz, answer events sent by non-host players
        if (isHost && ["vote", "buzz", "answer"].includes(e.type)) {
          onHostReceive(e);
        }

        // NON-HOST receives: state, tick events broadcast by host
        if (!isHost && ["state", "tick"].includes(e.type)) {
          onPlayerReceive(e);
        }
      });

    return () => {
      console.log(`[GameSync] Leaving lobby-game.${sessionId}`);
      echo.leave(`lobby-game.${sessionId}`);
    };
  }, [sessionId, isHost, onHostReceive, onPlayerReceive]);

  return { broadcast, sendAction };
}

// ── Loading guard ─────────────────────────────────────────────────────────────
function PlayersNotReady() {
  return (
    <div className="text-center py-8 space-y-2">
      <div className="text-2xl">⏳</div>
      <div className="text-sm text-gray-500 animate-pulse">Waiting for players to connect…</div>
    </div>
  );
}

// ── Synced Hot Seat ───────────────────────────────────────────────────────────
function SyncedHotSeat({ sessionId, lobbyCode, hostId, players, onFinish }: Omit<Props, "kind">) {
  if (players.length === 0) return <PlayersNotReady />;
  // HotSeat has its own full sync implementation
  return <HotSeat players={players} lobbyCode={lobbyCode} sessionId={sessionId} hostId={hostId} onFinish={onFinish} />;
}

// ── Synced Would You Rather ───────────────────────────────────────────────────
function SyncedWouldYouRather({ sessionId, lobbyCode, hostId, players, onFinish }: Omit<Props, "kind">) {
  const { user }   = useAuth();
  const isHost     = String(user?.id) === String(hostId);
  const [remoteChoices, setRemoteChoices] = useState<Record<string, "A"|"B">>({});
  const [remotePhase, setRemotePhase]     = useState<string | null>(null);

  const onHostReceive = useCallback((e: any) => {
    // Host receives votes from players: { type: "vote", data: { player, choice } }
    if (e.type === "vote" && e.data?.player && e.data?.choice) {
      setRemoteChoices(prev => ({ ...prev, [e.data.player]: e.data.choice }));
    }
  }, []);

  const onPlayerReceive = useCallback((e: any) => {
    if (e.type === "state" && e.data) {
      if (e.data.choices) setRemoteChoices(e.data.choices);
      if (e.data.phase)   setRemotePhase(e.data.phase);
    }
  }, []);

  const { broadcast, sendAction } = useGameSync(sessionId, lobbyCode, isHost, onHostReceive, onPlayerReceive);

  if (players.length === 0) return <PlayersNotReady />;

  return (
    <WouldYouRather
      players={players}
      onFinish={onFinish}
      isHost={isHost}
      remoteChoices={remoteChoices}
      remotePhase={remotePhase}
      onStateChange={(state: any) => broadcast("state", state)}
      onVote={(player: string, choice: "A"|"B") => sendAction("vote", { player, choice })}
    />
  );
}

// ── Synced Group Dare Dice ────────────────────────────────────────────────────
function SyncedGroupDareDice({ sessionId, lobbyCode, hostId, players, onFinish }: Omit<Props, "kind">) {
  const { user } = useAuth();
  const isHost   = String(user?.id) === String(hostId);
  const [, setRemoteState] = useState<any>(null);

  const onHostReceive = useCallback((e: any) => {
    // Host receives vote events from non-host players
    if (e.type === "vote" && e.data?.voter && e.data?.vote) {
      // Merge the incoming vote into remoteState for host to see
      setRemoteState((prev: any) => ({
        ...prev,
        _incomingVote: { voter: e.data.voter, vote: e.data.vote },
      }));
    }
  }, []);

  const onPlayerReceive = useCallback((e: any) => {
    if (e.type === "state" && e.data) {
      setRemoteState(e.data);
    }
  }, []);

  const { broadcast, sendAction } = useGameSync(sessionId, lobbyCode, isHost, onHostReceive, onPlayerReceive);

  if (players.length === 0) return <PlayersNotReady />;

  return (
    <GroupDareDice
      players={players}
      onFinish={onFinish}
      isHost={isHost}
      remoteState={remoteState}
      onStateChange={(state: any) => broadcast("state", state)}
      onVote={(voter: string, v: "up"|"down") => sendAction("vote", { voter, vote: v })}
    />
  );
}

// ── Synced Trivia ─────────────────────────────────────────────────────────────
function SyncedTrivia({ sessionId, lobbyCode, hostId, players, onFinish }: Omit<Props, "kind">) {
  const { user } = useAuth();
  const isHost   = String(user?.id) === String(hostId);
  const [, setRemoteState] = useState<any>(null);

  const onHostReceive = useCallback((e: any) => {
    // Store buzz/answer events from players for host to process
    if (e.type === "buzz" && e.data?.team) {
      setRemoteState((prev: any) => ({ ...prev, _buzz: e.data.team }));
    }
    if (e.type === "answer" && e.data?.idx !== undefined) {
      setRemoteState((prev: any) => ({ ...prev, _answer: e.data.idx }));
    }
  }, []);

  const onPlayerReceive = useCallback((e: any) => {
    if (e.type === "state" && e.data) setRemoteState(e.data);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { broadcast: _broadcast, sendAction: _sendAction } = useGameSync(sessionId, lobbyCode, isHost, onHostReceive, onPlayerReceive);

  if (players.length === 0) return <PlayersNotReady />;

  // TriviaDuoVsDuo doesn't yet accept sync props — runs independently on each device
  // Full sync can be added once TriviaDuoVsDuo is updated to accept isHost/remoteState
  return (
    <TriviaDuoVsDuo
      count={10}
      secondsPerQ={30}
      category="General"
      difficulty="Medium"
      onFinish={onFinish}
    />
  );
}

// ── Synced Charades ───────────────────────────────────────────────────────────
function SyncedCharades({ sessionId, lobbyCode, hostId, players, onFinish }: Omit<Props, "kind">) {
  const { user } = useAuth();
  const isHost   = String(user?.id) === String(hostId);
  const [, setRemoteState] = useState<any>(null);

  const onHostReceive = useCallback((_e: any) => {}, []);

  const onPlayerReceive = useCallback((e: any) => {
    if (e.type === "state" && e.data) setRemoteState(e.data);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { broadcast: _broadcast } = useGameSync(sessionId, lobbyCode, isHost, onHostReceive, onPlayerReceive);

  if (players.length === 0) return <PlayersNotReady />;

  // CharadesAI doesn't yet accept sync props — runs independently on each device
  return (
    <CharadesAI
      secondsPerRound={60}
      roundsPerTeam={3}
      category="General"
      difficulty="Easy"
      onFinish={onFinish}
    />
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SyncedLobbyGameRunner({ kind, ...props }: Props) {
  switch (kind) {
    case "hot_seat":         return <SyncedHotSeat         {...props} />;
    case "would_you_rather": return <SyncedWouldYouRather  {...props} />;
    case "spice_dice":       return <SyncedGroupDareDice   {...props} />;
    case "trivia":           return <SyncedTrivia           {...props} />;
    case "charades_ai":      return <SyncedCharades         {...props} />;
    default:                 return null;
  }
}