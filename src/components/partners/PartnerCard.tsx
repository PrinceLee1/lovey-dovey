import React, { useEffect, useState } from "react";
import {
  getPartnerStatus,
  createInvite,
  lookupInvite,
  acceptInvite,
  requestUnpair,
  confirmUnpair,
  cancelUnpair,
} from "../../libs/partner";
import { Copy, Link as LinkIcon, Check, X, UserX, Clock } from "lucide-react";
import { subscribePartnerNotifications } from "../../libs/notification";
import { useAuth } from "../../context/AuthContext";
// (optional) live updates if you wired Echo private-user.{id}
// import { subscribePartnerNotifications } from "@/lib/notifications";

export default function PartnerCard() {
    const { user } = useAuth();
  const meId = user?.id;

  const [status, setStatus] = useState<any>(null); // { partner, link, shared }
  const [loading, setLoading] = useState<string | null>(null);

  // invite flow state
  const [gen, setGen] = useState<{ code: string; expires_at: string | null } | null>(null);
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const s = await getPartnerStatus();
    setStatus(s);
    // if you want to force “not paired” view when link ended:
    if (s?.link?.status === "ended") {
      setStatus({ partner: null, link: null, shared: s.shared ?? { counts: { total: 0 }, games: [] } });
    }
  }

  useEffect(() => {
    load();

    // Optional realtime
    if (meId) {
      const off = subscribePartnerNotifications(meId, {
        onAccepted: load,
        onRejected: load,
        onStatus: load,
      });
      return off;
    }
  }, []);

  // ----- invite actions -----
  async function generate() {
    setLoading("generate"); setErr(null);
    try {
      const res = await createInvite();
      setGen(res);
      navigator.clipboard.writeText(res.code).catch(() => {});
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Unable to generate invite");
    } finally { setLoading(null); }
  }

  async function onLookup() {
    setErr(null); setLookup(null);
    if (!code.trim()) return;
    try {
      const info = await lookupInvite(code.trim().toUpperCase());
      setLookup(info); // { valid:true, inviter:{id,name}, expires_at }
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.response?.data?.reason || "Code invalid");
    }
  }

  async function onAccept() {
    setErr(null);
    try {
      await acceptInvite(code.trim().toUpperCase());
      setLookup(null); setCode(""); setGen(null);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Unable to accept");
    }
  }

  // ----- unpair actions -----
  async function doRequestUnpair() {
    setLoading("request");
    try { await requestUnpair(); await load(); }
    finally { setLoading(null); }
  }
  async function doConfirmUnpair() {
    setLoading("confirm");
    try { await confirmUnpair(); await load(); }
    finally { setLoading(null); }
  }
  async function doCancelUnpair() {
    setLoading("cancel");
    try { await cancelUnpair(); await load(); }
    finally { setLoading(null); }
  }

  const paired = !!status?.partner;
  const link = status?.link ?? {};
  const isActive = link.status == "active";
  const isPending = link.status == "pending_unpair";
  const requesterId = link.unpair_requested_by;
  const iAmRequester = isPending && requesterId === meId;

  return (
    <div className="rounded-3xl bg-white border p-5 space-y-4">
      {!paired ? (
        <>
          <div className="text-sm font-medium text-gray-900">Invite your partner</div>

          {/* generate & copy my code */}
          <div className="flex items-center gap-2">
            {gen ? (
              <>
                <code className="px-2 py-1 rounded bg-gray-50 border">{gen.code}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(gen.code)}
                  className="rounded-lg border px-2 py-1 text-sm inline-flex items-center gap-1 hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </>
            ) : (
              <button
                disabled={loading === "generate"}
                onClick={generate}
                className="rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm inline-flex items-center gap-1"
              >
                <LinkIcon className="w-4 h-4" />
                {loading === "generate" ? "Creating…" : "Generate invite code"}
              </button>
            )}
          </div>

          {/* enter a code I received */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500">Have a code?</div>
            <div className="flex items-center gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-500"
                placeholder="Enter code e.g. X7PQK9AB"
              />
              <button onClick={onLookup} className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50">
                Check
              </button>
            </div>

            {lookup && (
              <div className="rounded-xl border p-2 text-sm flex items-center justify-between">
                <div>
                  From <span className="font-medium">{lookup.inviter?.name ?? "Someone"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onAccept}
                    className="rounded-lg px-2 py-1 text-xs bg-emerald-600 text-white inline-flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button onClick={() => { setLookup(null); setCode(""); }} className="rounded-lg px-2 py-1 text-xs border">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {err && <div className="text-xs text-red-600">{err}</div>}
          </div>
        </>
      ) : (
        <>
          <div className="text-sm text-gray-500">Your Partner</div>
          <div className="text-xl font-semibold text-gray-900">{status.partner.name}</div>
          <div className="text-xs text-gray-500">
            Shared games: {status.shared?.counts?.total ?? 0}
          </div>

          {isActive && (
            <button
              disabled={loading === "request"}
              onClick={doRequestUnpair}
              className="mt-2 rounded-xl px-3 py-2 border text-sm inline-flex items-center gap-1 hover:bg-gray-50"
            >
              <UserX className="w-4 h-4" />
              {loading === "request" ? "Requesting…" : "Request unpair"}
            </button>
          )}

          {isPending && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {iAmRequester ? (
                <>
                  <span className="text-sm text-amber-700 inline-flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Waiting for {status.partner.name} to confirm…
                  </span>
                  <button
                    disabled={loading === "cancel"}
                    onClick={doCancelUnpair}
                    className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50"
                  >
                    {loading === "cancel" ? "Cancelling…" : "Cancel request"}
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-amber-700 inline-flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {status.partner.name} requested to unpair
                  </span>
                  <button
                    disabled={loading === "confirm"}
                    onClick={doConfirmUnpair}
                    className="rounded-xl px-3 py-2 bg-rose-600 text-white text-sm inline-flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    {loading === "confirm" ? "Confirming…" : "Confirm unpair"}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
