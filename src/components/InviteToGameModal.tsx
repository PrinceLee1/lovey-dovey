import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, PlusCircle, Layers } from 'lucide-react';
import { api } from '../libs/axios';
import { useToast } from '../context/ToastContext';
import { useGameInvitesContext } from '../context/GameInvitesContext';

type PickerGame = { id: number; title: string; category: string; kind: string };
type MyLobby = { id: number; code: string; name: string; status: string; game_kind: string | null };
type InviteStep = 'choice' | 'existing-lobby';

export default function InviteToGameModal({
  friend,
  onClose,
}: {
  friend: { id: number; name: string } | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendInvite } = useGameInvitesContext();

  const [inviteStep, setInviteStep] = useState<InviteStep>('choice');
  const [games, setGames] = useState<PickerGame[]>([]);
  const [myLobbies, setMyLobbies] = useState<MyLobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(false);
  const [selectedLobbyId, setSelectedLobbyId] = useState<number | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (!friend) return;
    setInviteStep('choice');
    setMyLobbies([]);
    setSelectedLobbyId(null);
    api.get('/games').then(({ data }) => setGames(data.games ?? [])).catch(() => {});
  }, [friend?.id]);

  function chooseNewLobby() {
    if (!friend) return;
    navigate(`/games?createLobby=1&inviteFriendId=${friend.id}`);
  }

  async function chooseExistingLobby() {
    setInviteStep('existing-lobby');
    setLoadingLobbies(true);
    try {
      const { data } = await api.get('/lobbies/mine');
      const lobbies = ((Array.isArray(data) ? data : data.lobbies ?? []) as MyLobby[]).filter(
        (l) => l.status !== 'ended'
      );
      setMyLobbies(lobbies);
      setSelectedLobbyId(lobbies[0]?.id ?? null);
    } catch {
      toast.error("Couldn't load your lobbies");
    } finally {
      setLoadingLobbies(false);
    }
  }

  async function sendToExistingLobby() {
    if (!friend || !selectedLobbyId) return;
    const lobby = myLobbies.find((l) => l.id === selectedLobbyId);
    const catalogIdByKind: Record<string, number> = Object.fromEntries(games.map((g) => [g.kind, g.id]));
    const gameId = (lobby?.game_kind && catalogIdByKind[lobby.game_kind]) || games[0]?.id;

    if (!gameId) {
      toast.error('No game available to invite for');
      return;
    }

    setSendingInvite(true);
    try {
      await sendInvite(friend.id, gameId, selectedLobbyId);
      toast.success(`Invite sent to ${friend.name}`);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't send invite");
    } finally {
      setSendingInvite(false);
    }
  }

  return (
    <AnimatePresence>
      {friend && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">
                Invite {friend.name}
              </div>
              <button onClick={onClose} aria-label="Close">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {inviteStep === 'choice' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Create a new lobby or invite to an existing one?
                </p>
                <button
                  onClick={chooseNewLobby}
                  className="w-full flex items-center gap-3 rounded-xl border dark:border-gray-700 px-3 py-3 hover:bg-rose-50 dark:hover:bg-gray-800 text-left"
                >
                  <PlusCircle className="w-5 h-5 text-fuchsia-500 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">New Lobby</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Create a lobby and invite them to it</div>
                  </div>
                </button>
                <button
                  onClick={chooseExistingLobby}
                  className="w-full flex items-center gap-3 rounded-xl border dark:border-gray-700 px-3 py-3 hover:bg-rose-50 dark:hover:bg-gray-800 text-left"
                >
                  <Layers className="w-5 h-5 text-fuchsia-500 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Existing Lobby</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Invite them to one of your active lobbies</div>
                  </div>
                </button>
              </div>
            )}

            {inviteStep === 'existing-lobby' && (
              loadingLobbies ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Loading your lobbies…</div>
              ) : myLobbies.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  You don't have any active lobbies — create one instead.
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedLobbyId ?? ''}
                    onChange={(e) => setSelectedLobbyId(Number(e.target.value))}
                    className="w-full rounded-xl border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-500"
                  >
                    {myLobbies.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code}){l.status === 'in_progress' ? ' — in progress' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={sendingInvite}
                    onClick={sendToExistingLobby}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    {sendingInvite ? 'Sending…' : 'Send Invite'}
                  </button>
                </div>
              )
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
