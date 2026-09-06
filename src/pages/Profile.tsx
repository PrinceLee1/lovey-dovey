import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Trophy, Flame, Gamepad2, Star } from 'lucide-react';
import { api } from '../libs/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePresenceMap } from '../context/PresenceContext';
import { dotColor, statusLabel } from '../libs/presenceDisplay';
import Avatar from '../components/Avatar';
import InviteToGameModal from '../components/InviteToGameModal';

type FriendshipStatus = 'self' | 'accepted' | 'pending_sent' | 'pending_received' | 'blocked' | 'none';

type ProfileData = {
  user: { id: number; name: string; avatar_url: string | null; created_at: string };
  presence_status: string;
  stats: { xp: number; level: number; weekly_active_days: number; weekly_goal_days: number; games_played: number };
  recent_games: { game_title: string; xp_earned: number; played_at: string }[];
  friendship: { status: FriendshipStatus; friendship_id: number | null };
};

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 shadow border border-rose-100 dark:border-gray-800 p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 text-fuchsia-500 mb-1">{icon}</div>
      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const { toast } = useToast();
  const presenceMap = usePresenceMap();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ id: number; name: string } | null>(null);

  const targetId = userId === 'me' ? me?.id : Number(userId);

  async function load() {
    if (!targetId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/users/${targetId}/profile`);
      setProfile(data);
    } catch {
      toast.error("Couldn't load this profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  async function addFriend() {
    if (!targetId) return;
    setActionBusy(true);
    try {
      await api.post(`/friends/request/${targetId}`);
      toast.success('Friend request sent');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't send request");
    } finally {
      setActionBusy(false);
    }
  }

  async function acceptRequest() {
    if (!profile?.friendship.friendship_id) return;
    setActionBusy(true);
    try {
      await api.post(`/friends/accept/${profile.friendship.friendship_id}`);
      toast.success('Friend request accepted');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't accept request");
    } finally {
      setActionBusy(false);
    }
  }

  async function rejectRequest() {
    if (!profile?.friendship.friendship_id) return;
    setActionBusy(true);
    try {
      await api.post(`/friends/reject/${profile.friendship.friendship_id}`);
      toast.info('Request declined');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't decline request");
    } finally {
      setActionBusy(false);
    }
  }

  const bg = 'min-h-screen w-full bg-gradient-to-b from-rose-50 via-pink-50 to-white dark:from-[#0b0b12] dark:via-[#100c17] dark:to-[#0b0b12]';

  if (loading) {
    return (
      <div className={`${bg} grid place-items-center`}>
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`${bg} grid place-items-center`}>
        <div className="text-center space-y-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">Couldn't find this profile.</div>
          <Link to="/games" className="text-fuchsia-600 dark:text-fuchsia-400 text-sm font-medium">
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  const status =
    profile.friendship.status === 'self'
      ? 'online' // trivially true — you're using the app right now
      : presenceMap[profile.user.id]?.status ?? profile.presence_status;

  const memberSince = new Date(profile.user.created_at).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={bg}>
      {/* Top bar */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-5 flex items-center justify-between">
        <Link to="/games" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
            <Heart className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
            LoveyDovey
          </span>
        </Link>
        <Link
          to="/friends"
          className="rounded-xl border dark:border-gray-700 px-3 py-2 text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Friends
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 pb-16 space-y-5">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative shrink-0">
              <Avatar name={profile.user.name} avatarUrl={profile.user.avatar_url} size="lg" />
              <span
                className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 ${dotColor(status)}`}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h1 className="font-display text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {profile.user.name}
              </h1>
              <div className="text-sm text-gray-500 dark:text-gray-400">{statusLabel(status)}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Member since {memberSince}</div>
            </div>

            <div className="flex flex-col gap-2 items-stretch min-w-[160px]">
              {profile.friendship.status === 'self' && (
                <Link
                  to="/settings"
                  className="text-center rounded-lg px-3 py-1.5 text-xs font-medium border dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Edit Profile
                </Link>
              )}

              {profile.friendship.status === 'accepted' && (
                <>
                  <span className="text-center rounded-lg px-3 py-1.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                    Friends
                  </span>
                  <button
                    onClick={() => setInviteTarget({ id: profile.user.id, name: profile.user.name })}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
                  >
                    Invite to Game
                  </button>
                </>
              )}

              {profile.friendship.status === 'pending_sent' && (
                <span className="text-center rounded-lg px-3 py-1.5 text-xs font-medium border dark:border-gray-700 text-gray-500 dark:text-gray-400">
                  Request Sent
                </span>
              )}

              {profile.friendship.status === 'pending_received' && (
                <>
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Sent you a request</div>
                  <div className="flex gap-2">
                    <button
                      disabled={actionBusy}
                      onClick={acceptRequest}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      disabled={actionBusy}
                      onClick={rejectRequest}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium border dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </>
              )}

              {profile.friendship.status === 'blocked' && (
                <span className="text-center rounded-lg px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Blocked
                </span>
              )}

              {profile.friendship.status === 'none' && (
                <button
                  disabled={actionBusy}
                  onClick={addFriend}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white disabled:opacity-50"
                >
                  Add Friend
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <StatTile icon={<Star className="w-4 h-4" />} label="Total XP" value={profile.stats.xp} />
          <StatTile icon={<Trophy className="w-4 h-4" />} label="Level" value={profile.stats.level} />
          <StatTile
            icon={<Flame className="w-4 h-4" />}
            label="Weekly Streak"
            value={`${profile.stats.weekly_active_days}/${profile.stats.weekly_goal_days}`}
          />
          <StatTile icon={<Gamepad2 className="w-4 h-4" />} label="Games Played" value={profile.stats.games_played} />
        </motion.div>

        {/* Recent games */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6"
        >
          <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Recent Games
          </div>
          {profile.recent_games.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No games played yet</div>
          ) : (
            <div className="space-y-3">
              {profile.recent_games.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border dark:border-gray-800 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {g.game_title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(g.played_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-950/40 px-2.5 py-1 rounded-full shrink-0">
                    +{g.xp_earned} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <InviteToGameModal friend={inviteTarget} onClose={() => setInviteTarget(null)} />
    </div>
  );
}
