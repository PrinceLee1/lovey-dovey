import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { JSX } from "react";
 
export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, token } = useAuth();

  // Not logged in → signin
  if (!token) return <Navigate to="/signin" replace />;

  // Token present but /me hasn't resolved yet (the fetch only starts in an
  // effect, so `loading` is still false on this very first render) —
  // deciding now would bounce a real admin to /games before we even know
  // they're one. Wait for the user object instead of redirecting blind.
  if (!user) return null;

  // Logged in but not admin → home
  if (!user?.is_admin) return <Navigate to="/games" replace />;

  return children;
}