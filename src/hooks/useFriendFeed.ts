import { useEffect, useState } from 'react';
import { api } from '../libs/axios';
import { echo } from '../libs/echo';
import { useAuth } from '../context/AuthContext';

export type FriendActivityType = 'game_completed' | 'xp_gained' | 'friend_added' | 'streak_milestone';

export type FeedItem = {
  id: number;
  activity_type: FriendActivityType;
  metadata: Record<string, string | number>;
  created_at: string;
  actor: { id: number; name: string; avatar_url: string | null };
};

export function useFriendFeed() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/friends/activity')
      .then(({ data }) => setFeed(data.activities ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;

    const ch = echo.private(`feed.${user.id}`).listen('.FriendActivityLogged', (e: FeedItem) => {
      setFeed((prev) => [e, ...prev].slice(0, 20));
    });

    return () => {
      try {
        ch.unsubscribe();
      } catch {
        /* empty */
      }
    };
  }, [user?.id]);

  return { feed, loading };
}
