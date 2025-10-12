import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Onboarding from './pages/Onboarding';
import GamesDashboard from './pages/GamesDashboard';
import SignIn from './pages/SignIn';
import type { JSX } from 'react';
import Settings from './pages/Settings';
import LobbyRoom from './pages/LoobyRoom';
import LobbyGameRunner from "../src/games/LobbyGameRunner";
import Landing from './pages/Landing';

// Admin imports
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import RequireAdmin from './pages/admin/RequireAdmin';
import CoupleSession from './pages/Session';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/signin" element={<SignIn />} />

          <Route
            path="/games"
            element={
              <PrivateRoute>
                <GamesDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          <Route
            path="/lobby/:code"
            element={
              <PrivateRoute>
                <LobbyRoom />
              </PrivateRoute>
            }
          />
          <Route
            path="/session/:code"
            element={
              <PrivateRoute>
                <CoupleSession />
              </PrivateRoute>
            }
          />

          {/* Admin area */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>

        <LobbyGameRunner />
      </BrowserRouter>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">404</h1>
        <p className="text-gray-600">Page not found</p>
      </div>
    </div>
  );
}
