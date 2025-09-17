import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer';

export default function SignIn() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string|null>(null);
  const nav = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      nav('/games');
    } catch (e:any) {
      setErr(e.message);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-rose-50 via-pink-50 to-white p-4">
      <form onSubmit={handleSubmit} className="rounded-3xl bg-white border border-rose-100 shadow-xl p-8 w-full max-w-md">
        <h1 className="font-display text-2xl font-semibold text-gray-900 mb-6">Sign in</h1>
        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input className="w-full rounded-xl border px-4 py-3 mb-3 focus:ring-2 focus:ring-fuchsia-500" value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="you@example.com" />
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input className="w-full rounded-xl border px-4 py-3 mb-4 focus:ring-2 focus:ring-fuchsia-500" value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="••••••••" />
        <button disabled={loading} className="w-full rounded-xl px-4 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white">{loading?'Signing in…':'Sign in'}</button>
        <div className="text-xs text-gray-500 mt-3">
          Don’t have an account? <Link to="/onboarding" className="text-fuchsia-700">Create one</Link>
        </div>
      </form>
      <Footer variant="simple" className="mt-6" />
    </div>
  );
}
