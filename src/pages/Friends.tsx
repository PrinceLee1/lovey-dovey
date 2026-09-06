import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowLeft, Users, Gamepad2, X, PlusCircle, Layers } from 'lucide-react';
import { api } from '../libs/axios';
import { echo } from '../libs/echo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePresenceMap } from '../context/PresenceContext';
import type { PresenceStatus } from '../hooks/usePresence';
import { useGameInvitesContext } from '../context/GameInvitesContext';

type Friend = {
  id: number;
  name: string;
  avatar_url: string | null;
  presence_status: PresenceStatus | null;
};

type FriendRequest = {
  id: number;
  created_at: string;
  requester: { id: number; name: string; avatar_url: string | null };
};

type OnlineOther = { id: number; name: string; avatar_url: string | null };

type PickerGame = { id: number; title: string; category: string; kind: string };

type MyLobby = { id: number; code: string; name: string; status: string; game_kind: string | null };

type InviteStep = 'choice' | 'existing-lobby' | null;

type TabKey = 'friends' | 'requests' | 'find';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'requests', label: 'Requests' },
  { key: 'find', label: 'Find Players' },
];

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 overflow-hidden grid place-items-center text-white text-sm font-semibold">
      {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" alt={name} /> : initials(name)}
    </div>
  );
}

function dotColor(status: string) {
  if (status === 'online') return 'bg-emerald-500';
  if (status === 'in_game') return 'bg-purple-500';
  return 'bg-gray-400 dark:bg-gray-600'; // idle or offline
}

function statusLabel(status: string) {
  if (status === 'online') return 'Online';
  if (status === 'in_game') return 'In a game';
  if (status === 'idle') return 'Idle';
  return 'Offline';
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">{text}</div>;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const presenceMap = usePresenceMap();
  const { sendInvite } = useGameInvitesContext();

  const [tab, setTab] = useState<TabKey>('friends');

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [onlineOthers, setOnlineOthers] = useState<OnlineOther[]>([]);
  const [games, setGames] = useState<PickerGame[]>([]);

  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingFind, setLoadingFind] = useState(true);

  const [requestActionId, setRequestActionId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [inviteTarget, setInviteTarget] = useState<Friend | null>(null);
  const [inviteStep, setInviteStep] = useState<InviteStep>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [myLobbies, setMyLobbies] = useState<MyLobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(false);
  const [selectedLobbyId, setSelectedLobbyId] = useState<number | null>(null);

  async function loadFriends() {
    setLoadingFriends(true);
    try {
      const { data } = await api.get('/friends');
      setFriends(data.friends);
    } catch {
      toast.error("Couldn't load your friends");
    } finally {
      setLoadingFriends(false);
    }
  }

  async function loadRequests() {
    setLoadingRequests(true);
    try {
      const { data } = await api.get('/friends/requests');
      setRequests(data.requests);
    } catch {
      toast.error("Couldn't load friend requests");
    } finally {
      setLoadingRequests(false);
    }
  }

  async function loadFind() {
    setLoadingFind(true);
    try {
      const { data } = await api.get('/presence/friends');
      setOnlineOthers(data.online_others ?? []);
    } catch {
      toast.error("Couldn't load online players");
    } finally {
      setLoadingFind(false);
    }
  }

  useEffect(() => {
    loadFriends();
    loadRequests();
    loadFind();
    api.get('/games').then(({ data }) => setGames(data.games ?? [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live updates: someone sends me a request, or accepts one I sent — both
  // land on the same per-user channel every other private notification
  // (partner invites, etc.) already uses in this app.
  useEffect(() => {
    if (!user) return;

    const ch = echo.private(`user.${user.id}`);

    ch.listen('.FriendRequestReceived', (e: { request: { requester: { name: string } } }) => {
      toast.info(`${e.request.requester.name} sent you a friend request`);
      loadRequests();
    });

    ch.listen('.FriendRequestAccepted', (e: { friend: { name: string } }) => {
      toast.success(`${e.friend.name} accepted your friend request`);
      loadFriends();
    });

    return () => {
      try {
        ch.unsubscribe();
      } catch {
        /* empty */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function acceptRequest(id: number) {
    setRequestActionId(id);
    try {
      await api.post(`/friends/accept/${id}`);
      toast.success('Friend request accepted');
      loadRequests();
      loadFriends();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't accept request");
    } finally {
      setRequestActionId(null);
    }
  }

  async function rejectRequest(id: number) {
    setRequestActionId(id);
    try {
      await api.post(`/friends/reject/${id}`);
      toast.info('Request declined');
      loadRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't decline request");
    } finally {
      setRequestActionId(null);
    }
  }

  async function addFriend(userId: number) {
    setAddingId(userId);
    try {
      await api.post(`/friends/request/${userId}`);
      toast.success('Friend request sent');
      setOnlineOthers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't send request");
    } finally {
      setAddingId(null);
    }
  }

  function openInvite(f: Friend) {
    setInviteTarget(f);
    setInviteStep('choice');
  }

  function closeInviteModal() {
    setInviteTarget(null);
    setInviteStep(null);
    setMyLobbies([]);
    setSelectedLobbyId(null);
  }

  function chooseNewLobby() {
    if (!inviteTarget) return;
    navigate(`/games?createLobby=1&inviteFriendId=${inviteTarget.id}`);
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
    if (!inviteTarget || !selectedLobbyId) return;
    const lobby = myLobbies.find((l) => l.id === selectedLobbyId);
    const catalogIdByKind: Record<string, number> = Object.fromEntries(games.map((g) => [g.kind, g.id]));
    const gameId = (lobby?.game_kind && catalogIdByKind[lobby.game_kind]) || games[0]?.id;

    if (!gameId) {
      toast.error('No game available to invite for');
      return;
    }

    setSendingInvite(true);
    try {
      await sendInvite(inviteTarget.id, gameId, selectedLobbyId);
      toast.success(`Invite sent to ${inviteTarget.name}`);
      closeInviteModal();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't send invite");
    } finally {
      setSendingInvite(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-rose-50 via-pink-50 to-white dark:from-[#0b0b12] dark:via-[#100c17] dark:to-[#0b0b12]">
      {/* Top bar */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 flex items-center justify-between">
        <Link to="/games" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
            <Heart className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
            LoveyDovey
          </span>
        </Link>
        <Link
          to="/games"
          className="rounded-xl border dark:border-gray-700 px-3 py-2 text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Games
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
            <h1 className="font-display text-2xl font-semibold text-gray-900 dark:text-gray-100">Friends</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-5">
            See who's around, manage requests, and invite friends to play.
          </p>

          {/* Tabs */}
          <div className="flex gap-2 border-b dark:border-gray-800 mb-5 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
                  tab === t.key
                    ? 'border-fuchsia-600 text-fuchsia-700 dark:text-fuchsia-300'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {t.label}
                {t.key === 'requests' && requests.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-rose-600 text-white text-xs">
                    {requests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: Friends */}
          {tab === 'friends' && (
            loadingFriends ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">Loading…</div>
            ) : friends.length === 0 ? (
              <EmptyState text="No friends yet — send a request to get started" />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {friends.map((f) => {
                  const status = presenceMap[f.id]?.status ?? f.presence_status ?? 'offline';
                  return (
                    <div
                      key={f.id}
                      className="rounded-2xl border border-rose-100 dark:border-gray-800 p-4 flex items-center gap-3"
                    >
                      <div className="relative shrink-0">
                        <Avatar name={f.name} avatarUrl={f.avatar_url} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 ${dotColor(status)}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{f.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{statusLabel(status)}</div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => openInvite(f)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
                        >
                          Invite to Game
                        </button>
                        <button
                          onClick={() => toast.info('Profile pages are coming soon')}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium border dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Tab: Requests */}
          {tab === 'requests' && (
            loadingRequests ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">Loading…</div>
            ) : requests.length === 0 ? (
              <EmptyState text="No pending requests" />
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-rose-100 dark:border-gray-800 p-4 flex items-center gap-3"
                  >
                    <Avatar name={r.requester.name} avatarUrl={r.requester.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{r.requester.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">wants to be friends</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={requestActionId === r.id}
                        onClick={() => acceptRequest(r.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        disabled={requestActionId === r.id}
                        onClick={() => rejectRequest(r.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium border dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Tab: Find Players */}
          {tab === 'find' && (
            loadingFind ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">Loading…</div>
            ) : onlineOthers.length === 0 ? (
              <EmptyState text="No other players online right now" />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {onlineOthers.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-2xl border border-rose-100 dark:border-gray-800 p-4 flex items-center gap-3"
                  >
                    <div className="relative shrink-0">
                      <Avatar name={u.name} avatarUrl={u.avatar_url} />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{u.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Online</div>
                    </div>
                    <button
                      disabled={addingId === u.id}
                      onClick={() => addFriend(u.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white disabled:opacity-50 shrink-0"
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </motion.div>
      </div>

      {/* Invite-to-game modal */}
      <AnimatePresence>
        {inviteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeInviteModal(); }}
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Invite {inviteTarget.name}
                </div>
                <button onClick={closeInviteModal} aria-label="Close">
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
    </div>
  );
}
