import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Onboarding from './pages/Onboarding';
import GamesDashboard from './pages/GamesDashboard';
import SignIn from './pages/SignIn';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import LobbyRoom from './pages/LobbyRoom';
import Landing from './pages/Landing';
import { ToastProvider } from "./components/Toast";
import { usePresence } from './hooks/usePresence';
import { useGameInvites } from './hooks/useGameInvites';
import { PresenceContext } from './context/PresenceContext';
import { GameInvitesContext } from './context/GameInvitesContext';
import FriendsPage from './pages/Friends';
import ProfilePage from './pages/Profile';
import MobileTabBar from './components/MobileTabBar';
import InstallPrompt from './components/InstallPrompt';
import PrivacyPage from './pages/legal/Privacy';
import TermsPage from './pages/legal/Terms';
import CommunityGuidelinesPage from './pages/legal/CommunityGuidelines';

// Admin imports
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import RequireAdmin from './pages/admin/RequireAdmin';
import CoupleSession from './pages/Session';
import AdminSettings from './pages/admin/AdminSettings';
import AdminReports from './pages/admin/AdminReports';
import AdminGames from './pages/admin/AdminGames';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';

// Root layout for every authenticated (non-admin) page. Mounted once via a
// nested <Route element={...}> below, so it stays mounted across navigation
// between /games, /settings, /lobby/:code, /session/:code — unlike a
// per-route wrapper, which would remount (and re-fire the online/offline
// presence effect) on every navigation.
function AuthenticatedLayout() {
  const { token } = useAuth();
  const { presenceMap } = usePresence();
  const { banner, sendInvite } = useGameInvites();

  if (!token) return <Navigate to="/" replace />;

  return (
    <PresenceContext.Provider value={presenceMap}>
      <GameInvitesContext.Provider value={{ sendInvite }}>
        {banner}
        <Outlet />
        {/* Clears the fixed MobileTabBar below on small screens */}
        <div className="h-16 md:hidden" />
        <MobileTabBar />
      </GameInvitesContext.Provider>
    </PresenceContext.Provider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <InstallPrompt />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/password-reset/:token" element={<ResetPassword />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />

            <Route element={<AuthenticatedLayout />}>
              <Route path="/games" element={<GamesDashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/lobby/:code" element={<LobbyRoom />} />
              <Route path="/session/:code" element={<CoupleSession />} />
            </Route>

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
              <Route path="games"    element={<AdminGames />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="reports"  element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
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