import { createContext, useContext } from 'react';

// useGameInvites() owns a live Echo subscription on the current user's
// invites.{id} channel — it must only be called once, at the root
// authenticated layout, same reasoning as PresenceContext. Any page that
// needs to send an invite (e.g. the Friends page) reads sendInvite from
// here instead of calling useGameInvites() again, which would
// double-subscribe and tear down the root layout's channel on unmount.
export type GameInvitesContextValue = {
  sendInvite: (receiverId: number, gameId: number, lobbyId?: number) => Promise<unknown>;
};

export const GameInvitesContext = createContext<GameInvitesContextValue>({
  sendInvite: async () => {
    throw new Error('GameInvitesContext.Provider is missing');
  },
});

export function useGameInvitesContext(): GameInvitesContextValue {
  return useContext(GameInvitesContext);
}
