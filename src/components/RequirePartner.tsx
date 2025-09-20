import React from "react";
import { usePartner } from "../hooks/usePartner";
import { useNavigate } from "react-router-dom";

export default function RequirePartner({ children }: { children: React.ReactNode }) {
  const { partner, link, loading } = usePartner();
  const nav = useNavigate();

  if (loading) return <div className="p-6 text-sm text-gray-500">Checking partner…</div>;

  const active = link?.status === "active" && !!partner;
  if (!active) {
    return (
      <div className="max-w-lg mx-auto rounded-2xl border p-6 bg-white">
        <div className="text-lg font-semibold text-gray-900">Partner required</div>
        <p className="text-sm text-gray-600 mt-1">
          This game is for two players only. Invite your partner first to play together and share progress.
        </p>
        <button
          onClick={() => nav("/dashboard#partner")}
          className="mt-4 rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
        >
          Invite / Link partner
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
