/**
 * SyncedLobbyGameRunner.tsx
 *
 *  - Host receives "vote"/"buzz"/"answer"/"guess"/"skip" events from non-host players
 *  - Non-host receives "state"/"tick" events from host
 *  - Players guard added so games don't crash when players[] is still loading
 *  - Incoming player actions (_incomingVote/_incomingBuzz/etc.) are stamped with
 *    a monotonic `seq` so the receiving game component can dedupe: those keys
 *    persist on remoteState (they're merged, not cleared), so without a seq
 *    check a later unrelated state change would silently re-apply a stale action.
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

        // HOST receives: vote, buzz, answer, guess, skip events sent by non-host players
        if (isHost && ["vote", "buzz", "answer", "guess", "skip"].includes(e.type)) {
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
      <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Waiting for players to connect…</div>
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
  const [remoteChoices, setRemoteChoices] = useState<Record<string, "A"|"B"> | null>(null);
  const [remotePhase, setRemotePhase]     = useState<string | null>(null);
  const [remoteQIdx, setRemoteQIdx]       = useState<number | undefined>(undefined);
  const [incomingVote, setIncomingVote]   = useState<{ player: string; choice: "A"|"B"; seq: number } | null>(null);
  const seqRef = useRef(0);

  const onHostReceive = useCallback((e: any) => {
    // Host receives votes from players: { type: "vote", data: { player, choice } }
    if (e.type === "vote" && e.data?.player && e.data?.choice) {
      seqRef.current += 1;
      setIncomingVote({ player: e.data.player, choice: e.data.choice, seq: seqRef.current });
    }
  }, []);

  const onPlayerReceive = useCallback((e: any) => {
    if (e.type === "state" && e.data) {
      // Always apply — including an empty {} choices reset when a new round starts.
      if (e.data.choices !== undefined) setRemoteChoices(e.data.choices);
      if (e.data.phase)                 setRemotePhase(e.data.phase);
      if (e.data.qIdx !== undefined)    setRemoteQIdx(e.data.qIdx);
    }
  }, []);

  const { broadcast, sendAction } = useGameSync(sessionId, lobbyCode, isHost, onHostReceive, onPlayerReceive);

  if (players.length === 0) return <PlayersNotReady />;

  return (
    <WouldYouRather
      players={players}
      onFinish={onFinish}
      isHost={isHost}
      remoteChoices={remoteChoices ?? undefined}
      remotePhase={remotePhase}
      remoteQIdx={remoteQIdx}
      incomingVote={incomingVote}
      onStateChange={(state: any) => broadcast("state", state)}
      onVote={(player: string, choice: "A"|"B") => sendAction("vote", { player, choice })}
    />
  );
}

// ── Synced Group Dare Dice ────────────────────────────────────────────────────
function SyncedGroupDareDice({ sessionId, lobbyCode, hostId, players, onFinish }: Omit<Props, "kind">) {
  const { user } = useAuth();
  const isHost   = String(user?.id) === String(hostId);
  const [remoteState, setRemoteState] = useState<any>(null);
  const seqRef = useRef(0);

  const onHostReceive = useCallback((e: any) => {
    // Host receives vote events from non-host players
    if (e.type === "vote" && e.data?.voter && e.data?.vote) {
      seqRef.current += 1;
      // Merge the incoming vote into remoteState for host to see
      setRemoteState((prev: any) => ({
        ...prev,
        _incomingVote: { voter: e.data.voter, vote: e.data.vote, seq: seqRef.current },
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
  const [remoteState, setRemoteState] = useState<any>(null);
  const seqRef = useRef(0);

  const onHostReceive = useCallback((e: any) => {
    // Buzz/answer events from non-host players, forwarded for the host to apply
    if (e.type === "buzz" && e.data?.team) {
      seqRef.current += 1;
      setRemoteState((prev: any) => ({ ...prev, _incomingBuzz: { team: e.data.team, seq: seqRef.current } }));
    }
    if (e.type === "answer" && e.data?.idx !== undefined) {
      seqRef.current += 1;
      setRemoteState((prev: any) => ({ ...prev, _incomingAnswer: { idx: e.data.idx, seq: seqRef.current } }));
    }
  }, []);

  const onPlayerReceive = useCallback((e: any) => {
    if (e.type === "state" && e.data) setRemoteState(e.data);
  }, []);

  const { broadcast, sendAction } = useGameSync(sessionId, lobbyCode, isHost, onHostReceive, onPlayerReceive);

  if (players.length === 0) return <PlayersNotReady />;

  return (
    <TriviaDuoVsDuo
      count={10}
      secondsPerQ={30}
      category="General"
      difficulty="Medium"
      onFinish={onFinish}
      isHost={isHost}
      remoteState={remoteState}
      onStateChange={(state) => broadcast("state", state)}
      onBuzz={(team) => sendAction("buzz", { team })}
      onAnswer={(idx) => sendAction("answer", { idx })}
    />
  );
}

// ── Synced Charades ───────────────────────────────────────────────────────────
function SyncedCharades({ sessionId, lobbyCode, hostId, players, onFinish }: Omit<Props, "kind">) {
  const { user } = useAuth();
  const isHost   = String(user?.id) === String(hostId);
  const [remoteState, setRemoteState] = useState<any>(null);
  const seqRef = useRef(0);

  const onHostReceive = useCallback((e: any) => {
    // Guess/skip taps from non-host players, forwarded for the host to apply
    if (e.type === "guess") {
      seqRef.current += 1;
      setRemoteState((prev: any) => ({ ...prev, _incomingGuess: { seq: seqRef.current } }));
    }
    if (e.type === "skip") {
      seqRef.current += 1;
      setRemoteState((prev: any) => ({ ...prev, _incomingSkip: { seq: seqRef.current } }));
    }
  }, []);

  const onPlayerReceive = useCallback((e: any) => {
    if (e.type === "state" && e.data) setRemoteState(e.data);
  }, []);

  const { broadcast, sendAction } = useGameSync(sessionId, lobbyCode, isHost, onHostReceive, onPlayerReceive);

  if (players.length === 0) return <PlayersNotReady />;

  return (
    <CharadesAI
      secondsPerRound={60}
      roundsPerTeam={3}
      category="General"
      difficulty="Easy"
      onFinish={onFinish}
      isHost={isHost}
      remoteState={remoteState}
      onStateChange={(state) => broadcast("state", state)}
      onGuess={() => sendAction("guess", {})}
      onSkip={() => sendAction("skip", {})}
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