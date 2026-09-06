import { useEffect, useState } from 'react';
import { api } from '../libs/axios';
import { echo } from '../libs/echo';
import { useAuth } from '../context/AuthContext';

export type PresenceStatus = 'online' | 'idle' | 'in_game' | 'offline';

export type PresenceEntry = { status: PresenceStatus; current_lobby_id: number | null };
export type PresenceMap = Record<number, PresenceEntry>;

export function usePresence() {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});

  useEffect(() => {
    if (!user) return;

    const channels: { id: number; ch: ReturnType<typeof echo.private> }[] = [];

    api.post('/presence/update', { status: 'online' }).catch(() => {});

    api
      .get('/presence/friends')
      .then(({ data }) => {
        const map: PresenceMap = {};
        for (const p of data.presence as Array<{ user_id: number; status: PresenceStatus; current_lobby_id: number | null }>) {
          map[p.user_id] = { status: p.status, current_lobby_id: p.current_lobby_id };

          const ch = echo.private(`presence.${p.user_id}`).listen('.UserPresenceUpdated', (e: {
            user_id: number; status: PresenceStatus; current_lobby_id: number | null;
          }) => {
            setPresenceMap((prev) => ({
              ...prev,
              [e.user_id]: { status: e.status, current_lobby_id: e.current_lobby_id },
            }));
          });
          channels.push({ id: p.user_id, ch });
        }
        setPresenceMap(map);
      })
      .catch(() => {});

    return () => {
      for (const { ch } of channels) {
        try {
          ch.leave();
        } catch {
          /* empty */
        }
      }
      // Best-effort — a closing tab may not wait for this to resolve. The
      // backend's UpdateUserPresence scheduled job is the real safety net
      // for tabs that close without running this cleanup at all.
      api.post('/presence/update', { status: 'offline' }).catch(() => {});
    };
  }, [user?.id]);

  return { presenceMap };
}
