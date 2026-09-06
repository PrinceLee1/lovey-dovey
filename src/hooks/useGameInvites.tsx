import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Gamepad2, X } from 'lucide-react';
import { api } from '../libs/axios';
import { echo } from '../libs/echo';
import { useAuth } from '../context/AuthContext';

export type IncomingGameInvite = {
  id: number;
  sender_id: number;
  sender_name: string;
  game_id: number;
  game_name: string | null;
  lobby_id: number | null;
  lobby_code: string | null;
  status: string;
  expires_at: string;
};

export function useGameInvites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<IncomingGameInvite | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;

    const ch = echo.private(`invites.${user.id}`).listen(
      '.GameInviteReceived',
      (e: { invite: IncomingGameInvite }) => setInvite(e.invite)
    );

    return () => {
      try {
        ch.leave();
      } catch {
        /* empty */
      }
    };
  }, [user?.id]);

  const dismiss = useCallback(() => setInvite(null), []);

  const accept = useCallback(async () => {
    if (!invite) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/invites/accept/${invite.id}`);
      if (data.lobby_id && invite.lobby_code) {
        navigate(`/lobby/${invite.lobby_code}`);
      }
    } finally {
      setBusy(false);
      setInvite(null);
    }
  }, [invite, navigate]);

  const decline = useCallback(async () => {
    if (!invite) return;
    setBusy(true);
    try {
      await api.post(`/invites/decline/${invite.id}`);
    } finally {
      setBusy(false);
      setInvite(null);
    }
  }, [invite]);

  const sendInvite = useCallback(async (receiverId: number, gameId: number, lobbyId?: number) => {
    const { data } = await api.post('/invites/send', {
      receiver_id: receiverId,
      game_id: gameId,
      lobby_id: lobbyId ?? null,
    });
    return data.invite;
  }, []);

  const banner = (
    <AnimatePresence>
      {invite && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-sm rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-gray-900 shadow-xl p-4"
        >
          <button
            onClick={dismiss}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-rose-600 dark:text-rose-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {invite.sender_name} invited you to play
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {invite.game_name ?? 'a game'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={accept}
              disabled={busy}
              className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium py-2"
            >
              Accept
            </button>
            <button
              onClick={decline}
              disabled={busy}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm font-medium py-2"
            >
              Decline
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { invite, accept, decline, dismiss, sendInvite, banner };
}
