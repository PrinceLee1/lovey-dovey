import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../libs/axios';

type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  dob?: string | null;
  xp?: number;
  avatar_url?: string | null;
  partner?: { id: number; name: string }[];
  is_admin?: boolean;
  is_plus?: boolean;           // ← NEW: Plus subscription flag
  plus_expires_at?: string | null; // ← NEW: when Plus expires
  trial_ends_at?: string | null; // ← NEW: free trial end date (Plus features until then)
  status?: 'active' | 'deactivated' | 'deleted';
  email_news?: boolean;
  email_reminders?: boolean;
  weekly_summary?: boolean;
  private_profile?: boolean;
};

type RegisterPayload = {
  name: string; email: string; password: string; password_confirmation: string;
  phone?: string; gender?: 'Male' | 'Female' | 'Other' | ''; dob?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  register: (p: RegisterPayload) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refreshUser: () => Promise<void>; // ← NEW: alias for fetchMe, used after subscription
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) fetchMe();
  }, [token]);

  async function register(p: RegisterPayload) {
    setLoading(true);
    try {
      const { data } = await api.post('/register', p);
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      // Deactivated/deleted accounts are rejected server-side (403, before a
      // token is even issued) — the api.post rejection carries that message
      // through to the caller via the axios interceptor.
      const { data } = await api.post('/login', { email, password });
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try { await api.post('/logout'); } catch { /* empty */ }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }

  async function fetchMe() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await api.get<User>('/me');
      setUser(data);
    } finally {
      setLoading(false);
    }
  }

  // refreshUser re-fetches /me and updates user state (call after Stripe checkout completes)
  const refreshUser = fetchMe;

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, fetchMe, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}