import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../libs/axios';

type User = {
  id: number; name: string; email: string;
  phone?: string | null; gender?: string | null; dob?: string | null; xp?: number; avatar_url?: string | null; partner?: unknown[]; is_admin?: boolean;
};

type RegisterPayload = {
  name: string; email: string; password: string; password_confirmation: string;
  phone?: string; gender?: 'Male'|'Female'|'Other'|''; dob?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  register: (p: RegisterPayload) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User|null>(null);
  const [token, setToken] = useState<string|null>(localStorage.getItem('auth_token'));
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
      const { data } = await api.post('/login', { email, password });
      //check if user is deactivated
      if(data.user.status === 'deactivated'){
        throw new Error('Your account has been deactivated. Please contact support.');
      }
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.post('/logout');
    } catch { /* empty */ }
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

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
