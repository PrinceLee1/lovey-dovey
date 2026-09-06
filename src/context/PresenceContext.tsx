import { createContext, useContext } from 'react';
import type { PresenceMap } from '../hooks/usePresence';

// usePresence() owns a live Echo subscription per friend and posts
// online/offline on mount/unmount — it must only be called once, at the
// root authenticated layout. Any page that needs live friend status (e.g.
// the Friends page) reads it from here instead of calling usePresence()
// again, which would double-subscribe and, worse, have its unmount
// cleanup (ch.leave()) tear down the channel the root layout still needs.
export const PresenceContext = createContext<PresenceMap>({});

export function usePresenceMap(): PresenceMap {
  return useContext(PresenceContext);
}
