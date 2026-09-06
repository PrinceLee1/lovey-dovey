import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft, Users } from 'lucide-react';
import { api } from '../libs/axios';
import { echo } from '../libs/echo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePresenceMap } from '../context/PresenceContext';
import type { PresenceStatus } from '../hooks/usePresence';
import { useFriendFeed, type FeedItem } from '../hooks/useFriendFeed';
import InviteToGameModal from '../components/InviteToGameModal';
import Avatar from '../components/Avatar';
import { dotColor, statusLabel } from '../libs/presenceDisplay';

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

type TabKey = 'friends' | 'activity' | 'requests' | 'find';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'activity', label: 'Activity' },
  { key: 'requests', label: 'Requests' },
  { key: 'find', label: 'Find Players' },
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

function activityText(item: FeedItem, myUserId?: number): string {
  const m = item.metadata;
  switch (item.activity_type) {
    case 'game_completed':
      return `${item.actor.name} completed ${m.game_name} 🎮`;
    case 'xp_gained':
      return `${item.actor.name} earned ${m.amount} XP ⭐`;
    case 'friend_added':
      return Number(m.friend_id) === myUserId
        ? `You and ${item.actor.name} are now friends 🎉`
        : `${item.actor.name} and ${m.friend_name} are now friends 🎉`;
    case 'streak_milestone':
      return `${item.actor.name} is on a ${m.streak_days}-day streak 🔥`;
    default:
      return `${item.actor.name} did something`;
  }
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">{text}</div>;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const presenceMap = usePresenceMap();
  const { feed, loading: loadingFeed } = useFriendFeed();

  const [tab, setTab] = useState<TabKey>('friends');

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [onlineOthers, setOnlineOthers] = useState<OnlineOther[]>([]);

  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingFind, setLoadingFind] = useState(true);

  const [requestActionId, setRequestActionId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [inviteTarget, setInviteTarget] = useState<Friend | null>(null);

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
                          onClick={() => setInviteTarget(f)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
                        >
                          Invite to Game
                        </button>
                        <button
                          onClick={() => navigate(`/profile/${f.id}`)}
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

          {/* Tab: Activity */}
          {tab === 'activity' && (
            loadingFeed ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">Loading…</div>
            ) : feed.length === 0 ? (
              <EmptyState text="No activity yet — play some games with friends!" />
            ) : (
              <div className="space-y-3">
                {feed.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-rose-100 dark:border-gray-800 p-4 flex items-center gap-3"
                  >
                    <Avatar name={item.actor.name} avatarUrl={item.actor.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{activityText(item, user?.id)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(item.created_at)}</div>
                    </div>
                  </div>
                ))}
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

      <InviteToGameModal friend={inviteTarget} onClose={() => setInviteTarget(null)} />
    </div>
  );
}
