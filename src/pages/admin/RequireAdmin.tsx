// src/pages/admin/RequireAdmin.tsx
import { Navigate } from "react-router-dom";
import { useEffect, useState, type JSX } from "react";
import api from "../../libs/axios";

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/me'); // your existing endpoint
        setOk(!!data?.is_admin);
      } catch {
        setOk(false);
      }
    })();
  }, []);

  if (ok === null) return null;
  if (!ok) return <Navigate to="/signin" replace />;
  return children;
}
