// src/pages/admin/AdminUsers.tsx
import { useCallback, useEffect, useState } from "react";
import { api } from "../../libs/axios";
import { useToast } from "../../context/ToastContext";
import {
  Search, Filter, Heart, Crown, UserX, UserCheck, Trash2,
  ChevronLeft, ChevronRight, X, Shield, Mail, Calendar,
  Gamepad2, Zap, MoreHorizontal, Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type User = {
  id: number; name: string; email: string; is_plus: boolean;
  is_admin: boolean; is_active: boolean; created_at: string;
  partner?: { id: number; name: string };
  stats?: { games_played: number; xp: number; streak: number };
};
type Meta = { current_page: number; last_page: number; total: number };
type StatusFilter = "all" | "active" | "inactive" | "plus" | "no_partner" | "admin";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all",       label: "All"        },
  { key: "active",    label: "Active"     },
  { key: "inactive",  label: "Inactive"   },
  { key: "plus",      label: "Plus"       },
  { key: "no_partner",label: "Solo"       },
  { key: "admin",     label: "Admins"     },
];

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers]       = useState<User[]>([]);
  const [meta, setMeta]         = useState<Meta>({ current_page:1, last_page:1, total:0 });
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<StatusFilter>("all");
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [viewUser, setViewUser] = useState<User|null>(null);
  const [confirm, setConfirm]   = useState<{ type: "delete"|"deactivate"|"activate"; user: User }|null>(null);
  const [openMenu, setOpenMenu] = useState<number|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "20", ...(search ? {search}:{}), ...(filter !== "all" ? {filter}:{}) });
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.data ?? data ?? []);
      if (data.meta) setMeta(data.meta);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); }, 350); return () => clearTimeout(t); }, [search]);

  async function doAction(type: "delete"|"deactivate"|"activate", user: User) {
    try {
      if (type === "delete") {
        await api.delete(`/admin/users/${user.id}`);
        setUsers(u => u.filter(x => x.id !== user.id));
        toast.success(`${user.name} deleted`);
      } else {
        const is_active = type === "activate";
        await api.patch(`/admin/users/${user.id}`, { is_active });
        setUsers(u => u.map(x => x.id === user.id ? { ...x, is_active } : x));
        toast.success(`${user.name} ${is_active ? "reactivated" : "deactivated"}`);
      }
    } catch { toast.error("Action failed"); }
    setConfirm(null);
  }

  async function toggleAdmin(user: User) {
    try {
      await api.patch(`/admin/users/${user.id}`, { is_admin: !user.is_admin });
      setUsers(u => u.map(x => x.id === user.id ? { ...x, is_admin: !x.is_admin } : x));
      toast.success(`${user.name} ${user.is_admin ? "demoted" : "promoted to admin"}`);
    } catch { toast.error("Failed"); }
  }

  const toggleSelect = (id: number) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const allSelected = users.length > 0 && selected.length === users.length;

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "Georgia, serif" }}>Users</h1>
        <p className="text-sm text-gray-400 mt-1">{meta.total.toLocaleString()} total members</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
            className="w-full bg-white border border-rose-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition shadow-sm" />
        </div>
        <div className="flex items-center gap-1 bg-white border border-rose-100 rounded-xl px-2 py-1.5 shadow-sm">
          <Filter className="w-3.5 h-3.5 text-gray-300 mr-1" />
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => { setFilter(t.key); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${filter === t.key ? "bg-rose-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk bar */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
            <span className="text-sm font-bold text-rose-700">{selected.length} selected</span>
            <div className="flex-1" />
            <button onClick={async () => { await api.post("/admin/users/bulk-deactivate", { ids: selected }); setUsers(u => u.map(x => selected.includes(x.id) ? {...x,is_active:false} : x)); toast.success("Deactivated"); setSelected([]); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition">
              <UserX className="w-3.5 h-3.5" /> Deactivate
            </button>
            <button onClick={async () => { await api.post("/admin/users/bulk-delete", { ids: selected }); setUsers(u => u.filter(x => !selected.includes(x.id))); toast.success("Deleted"); setSelected([]); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 transition">
              <Trash2 className="w-3.5 h-3.5" /> Delete all
            </button>
            <button onClick={() => setSelected([])}><X className="w-4 h-4 text-gray-400 hover:text-gray-700" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[32px_1fr_160px_90px_90px_110px_48px] gap-4 px-5 py-3 bg-rose-50/60 border-b border-rose-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <div><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : users.map(u=>u.id))} className="w-3.5 h-3.5 rounded accent-rose-500" /></div>
          <div>User</div>
          <div>Partner</div>
          <div>Plan</div>
          <div>Status</div>
          <div>Joined</div>
          <div />
        </div>

        {/* Rows */}
        {loading ? (
          <div className="divide-y divide-rose-50">
            {[...Array(8)].map((_,i) => (
              <div key={i} className="grid grid-cols-[32px_1fr_160px_90px_90px_110px_48px] gap-4 px-5 py-4 animate-pulse">
                <div className="h-3 w-3 bg-rose-100 rounded" />
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-rose-100" />
                  <div className="space-y-1.5"><div className="h-2.5 w-24 bg-rose-100 rounded"/><div className="h-2 w-32 bg-rose-50 rounded"/></div>
                </div>
                <div className="h-2.5 w-20 bg-rose-50 rounded self-center" />
                <div className="h-5 w-14 bg-rose-50 rounded-full self-center" />
                <div className="h-5 w-16 bg-rose-50 rounded-full self-center" />
                <div className="h-2.5 w-20 bg-rose-50 rounded self-center" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gray-300 text-sm">No users found</div>
        ) : (
          <div className="divide-y divide-rose-50">
            {users.map(user => (
              <div key={user.id} className={`grid grid-cols-[32px_1fr_160px_90px_90px_110px_48px] gap-4 px-5 py-3.5 hover:bg-rose-50/30 transition group items-center ${!user.is_active ? "opacity-50" : ""}`}>
                <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleSelect(user.id)} className="w-3.5 h-3.5 rounded accent-rose-500" />

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold flex-shrink-0">
                    {user.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">{user.name}</span>
                      {user.is_admin && <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
                  </div>
                </div>

                <div>
                  {user.partner ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-500 font-semibold">
                      <Heart className="w-3 h-3 flex-shrink-0" fill="currentColor" />
                      <span className="truncate">{user.partner.name}</span>
                    </div>
                  ) : <span className="text-[11px] text-gray-300">—</span>}
                </div>

                <div>
                  {user.is_plus ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                      <Crown className="w-2.5 h-2.5" /> Plus
                    </span>
                  ) : <span className="text-[10px] text-gray-300 font-medium">Free</span>}
                </div>

                <div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
                    user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-400"}`} />
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="text-[11px] text-gray-400">
                  {new Date(user.created_at).toLocaleDateString("en", { month:"short", day:"numeric", year:"2-digit" })}
                </div>

                <div className="relative flex justify-end">
                  <button onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                    className="h-7 w-7 rounded-xl bg-rose-50 hover:bg-rose-100 grid place-items-center text-gray-400 hover:text-gray-700 transition opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <AnimatePresence>
                    {openMenu === user.id && (
                      <motion.div initial={{ opacity:0, scale:0.95, y:-4 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95 }}
                        className="absolute right-0 top-8 z-50 w-44 bg-white border border-rose-100 rounded-2xl shadow-xl shadow-rose-100/50 overflow-hidden">
                        <button onClick={() => { setViewUser(user); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-rose-50 transition">
                          <Eye className="w-3.5 h-3.5 text-gray-400" /> View profile
                        </button>
                        <button onClick={() => { toggleAdmin(user); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-rose-50 transition">
                          <Shield className="w-3.5 h-3.5 text-gray-400" /> {user.is_admin ? "Remove admin" : "Make admin"}
                        </button>
                        {user.is_active
                          ? <button onClick={() => { setConfirm({ type:"deactivate", user }); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition">
                              <UserX className="w-3.5 h-3.5" /> Deactivate
                            </button>
                          : <button onClick={() => { setConfirm({ type:"activate", user }); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition">
                              <UserCheck className="w-3.5 h-3.5" /> Reactivate
                            </button>
                        }
                        <div className="border-t border-rose-50" />
                        <button onClick={() => { setConfirm({ type:"delete", user }); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition">
                          <Trash2 className="w-3.5 h-3.5" /> Delete user
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-rose-50/40 border-t border-rose-100">
          <span className="text-xs text-gray-400">Page {meta.current_page} of {meta.last_page} · {meta.total} users</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              className="h-7 w-7 rounded-xl bg-white border border-rose-100 hover:border-rose-300 grid place-items-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition shadow-sm">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage(p => Math.min(meta.last_page,p+1))} disabled={page===meta.last_page}
              className="h-7 w-7 rounded-xl bg-white border border-rose-100 hover:border-rose-300 grid place-items-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition shadow-sm">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── User Detail Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {viewUser && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setViewUser(null)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
            <motion.div initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
              transition={{ type:"spring", damping:28, stiffness:280 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white border-l border-rose-100 z-50 overflow-y-auto shadow-2xl shadow-rose-200">
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900" style={{ fontFamily:"Georgia,serif" }}>User Profile</h2>
                  <button onClick={() => setViewUser(null)} className="h-8 w-8 rounded-xl bg-rose-50 hover:bg-rose-100 grid place-items-center text-gray-400 hover:text-gray-700 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center py-2">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-400 to-fuchsia-500 grid place-items-center text-white text-2xl font-black mx-auto mb-3 shadow-lg shadow-rose-200">
                    {viewUser.name[0]?.toUpperCase()}
                  </div>
                  <div className="font-bold text-gray-900 text-lg">{viewUser.name}</div>
                  <div className="text-sm text-gray-400">{viewUser.email}</div>
                  <div className="flex items-center justify-center gap-2 mt-2.5">
                    {viewUser.is_plus && <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">✦ PLUS</span>}
                    {viewUser.is_admin && <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Admin</span>}
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${viewUser.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500"}`}>
                      {viewUser.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-100 overflow-hidden">
                  {[
                    { icon: Mail,     label: "Email",        value: viewUser.email },
                    { icon: Calendar, label: "Joined",       value: new Date(viewUser.created_at).toLocaleDateString() },
                    { icon: Heart,    label: "Partner",      value: viewUser.partner?.name ?? "None" },
                    { icon: Gamepad2, label: "Games played", value: viewUser.stats?.games_played ?? "—" },
                    { icon: Zap,      label: "XP earned",   value: viewUser.stats?.xp ?? "—" },
                  ].map(({ icon: Icon, label, value }, i) => (
                    <div key={label} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-rose-50" : ""}`}>
                      <Icon className="w-3.5 h-3.5 text-rose-300 flex-shrink-0" />
                      <span className="text-xs text-gray-400 w-24">{label}</span>
                      <span className="text-xs text-gray-900 font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-1">
                  <button onClick={() => { toggleAdmin(viewUser); setViewUser(v => v ? {...v, is_admin:!v.is_admin} : null); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 text-sm font-medium transition">
                    <Shield className="w-4 h-4" /> {viewUser.is_admin ? "Remove admin" : "Grant admin"}
                  </button>
                  {viewUser.is_active
                    ? <button onClick={() => { setConfirm({ type:"deactivate", user:viewUser }); setViewUser(null); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition">
                        <UserX className="w-4 h-4" /> Deactivate account
                      </button>
                    : <button onClick={() => { setConfirm({ type:"activate", user:viewUser }); setViewUser(null); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition">
                        <UserCheck className="w-4 h-4" /> Reactivate account
                      </button>
                  }
                  <button onClick={() => { setConfirm({ type:"delete", user:viewUser }); setViewUser(null); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition">
                    <Trash2 className="w-4 h-4" /> Delete permanently
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Confirm Dialog ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirm && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-rose-100 rounded-2xl p-6 w-full max-w-xs shadow-2xl shadow-rose-100">
                <div className={`h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-4 ${
                  confirm.type==="delete" ? "bg-red-100" : confirm.type==="deactivate" ? "bg-amber-100" : "bg-emerald-100"}`}>
                  {confirm.type==="delete" ? <Trash2 className="w-5 h-5 text-red-500" /> :
                   confirm.type==="deactivate" ? <UserX className="w-5 h-5 text-amber-600" /> :
                   <UserCheck className="w-5 h-5 text-emerald-600" />}
                </div>
                <h3 className="text-gray-900 font-bold text-center mb-1" style={{ fontFamily:"Georgia,serif" }}>
                  {confirm.type==="delete" ? "Delete user?" : confirm.type==="deactivate" ? "Deactivate user?" : "Reactivate user?"}
                </h3>
                <p className="text-sm text-gray-400 text-center mb-5">
                  {confirm.type==="delete" ? `Permanently delete ${confirm.user.name}. Cannot be undone.` :
                   confirm.type==="deactivate" ? `${confirm.user.name} won't be able to sign in.` :
                   `${confirm.user.name} will regain access.`}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirm(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 text-sm font-medium transition">
                    Cancel
                  </button>
                  <button onClick={() => doAction(confirm.type, confirm.user)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                      confirm.type==="delete" ? "bg-red-500 text-white hover:bg-red-600" :
                      confirm.type==="deactivate" ? "bg-amber-500 text-white hover:bg-amber-600" :
                      "bg-emerald-500 text-white hover:bg-emerald-600"}`}>
                    {confirm.type==="delete" ? "Delete" : confirm.type==="deactivate" ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}