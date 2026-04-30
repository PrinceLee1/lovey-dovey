import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { JSX } from "react";
 
export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, token } = useAuth();
 
  // Not logged in → signin
  if (!token) return <Navigate to="/signin" replace />;
 
  // Logged in but not admin → home
  if (!user?.is_admin) return <Navigate to="/games" replace />;
 
  return children;
}