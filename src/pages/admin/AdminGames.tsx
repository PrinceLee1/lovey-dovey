// ═══════════════════════════════════════════════════════
// src/pages/admin/AdminGames.tsx
// ═══════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { api } from "../../libs/axios";
import { useToast } from "../../context/ToastContext";
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, Save, Gamepad2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Game = {
  id: number; kind: string; title: string; description: string;
  category: "Free"|"Plus"; min_players: number; max_players: number;
  is_active: boolean; times_played: number;
};
type Session = { id:number; kind:string; lobby_name:string; players:number; started_at:string; status:string };

const EMOJI: Record<string,string> = { trivia:"🧠",hot_seat:"🔥",would_you_rather:"🤔",spice_dice:"🎲",charades_ai:"🎭",truth_dare:"❤️",emoji_chat:"💬",confessions:"✨" };
const IC = "w-full bg-[#fef9f5] border border-rose-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition";

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{label}</label>{children}</div>;
}

export function AdminGames() {
  const { toast } = useToast();
  const [games, setGames]   = useState<Game[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<"games"|"sessions">("games");
  const [editGame, setEditGame] = useState<Partial<Game>|null>(null);
  const [isNew, setIsNew]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [delGame, setDelGame] = useState<Game|null>(null);

  useEffect(() => {
    Promise.all([api.get("/admin/games"), api.get("/admin/games/sessions?limit=20")])
      .then(([g,s]) => { setGames(g.data.data??[]); setSessions(s.data.data??[]); })
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!editGame?.title || !editGame?.kind) { toast.error("Title and kind are required"); return; }
    setSaving(true);
    try {
      if (isNew) {
        const { data } = await api.post("/admin/games", editGame);
        setGames(g => [data, ...g]); toast.success("Game created!");
      } else {
        const { data } = await api.put(`/admin/games/${editGame.id}`, editGame);
        setGames(g => g.map(x => x.id===data.id ? data : x)); toast.success("Game updated!");
      }
      setEditGame(null);
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  }

  async function toggleActive(game: Game) {
    try {
      const { data } = await api.patch(`/admin/games/${game.id}`, { is_active: !game.is_active });
      setGames(g => g.map(x => x.id===game.id ? {...x, is_active:data.is_active} : x));
    } catch { toast.error("Failed"); }
  }

  async function deleteGame(game: Game) {
    try { await api.delete(`/admin/games/${game.id}`); setGames(g => g.filter(x=>x.id!==game.id)); toast.success("Deleted"); }
    catch { toast.error("Failed"); } setDelGame(null);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily:"Georgia,serif" }}>Games</h1>
          <p className="text-sm text-gray-400 mt-1">{games.length} game types · {sessions.length} recent sessions</p>
        </div>
        <button onClick={() => { setEditGame({ kind:"",title:"",description:"",category:"Free",min_players:2,max_players:10,is_active:true }); setIsNew(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-sm font-semibold shadow-md shadow-rose-200 hover:brightness-105 transition">
          <Plus className="w-4 h-4" /> Add Game
        </button>
      </div>

      <div className="flex gap-1 bg-white border border-rose-100 rounded-xl p-1 w-fit shadow-sm">
        {(["games","sessions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition ${tab===t ? "bg-rose-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
        {tab === "games" && (
          <>
            <div className="grid grid-cols-[48px_1fr_90px_80px_110px_80px_80px] gap-4 px-5 py-3 bg-rose-50/60 border-b border-rose-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <div/><div>Game</div><div>Category</div><div>Players</div><div>Played</div><div>Status</div><div>Actions</div>
            </div>
            {loading ? <div className="py-12 text-center text-gray-300 animate-pulse">Loading…</div> :
             games.length === 0 ? (
              <div className="py-16 text-center">
                <Gamepad2 className="w-8 h-8 text-rose-200 mx-auto mb-3" />
                <div className="text-gray-300 text-sm">No games yet</div>
                <button onClick={() => { setEditGame({ kind:"",title:"",description:"",category:"Free",min_players:2,max_players:10,is_active:true }); setIsNew(true); }}
                  className="mt-3 text-rose-500 text-sm font-semibold hover:text-rose-700 transition">+ Add first game</button>
              </div>
            ) : (
              <div className="divide-y divide-rose-50">
                {games.map(game => (
                  <div key={game.id} className="grid grid-cols-[48px_1fr_90px_80px_110px_80px_80px] gap-4 px-5 py-3.5 hover:bg-rose-50/30 transition items-center">
                    <div className="h-9 w-9 rounded-xl bg-rose-50 grid place-items-center text-xl">{EMOJI[game.kind] ?? "🎮"}</div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{game.title}</div>
                      <div className="text-[11px] text-gray-400 truncate max-w-xs">{game.description}</div>
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${game.category==="Plus" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-gray-100 text-gray-500"}`}>
                        {game.category==="Plus" ? "✦ Plus" : "Free"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{game.min_players}–{game.max_players}</div>
                    <div className="text-xs text-gray-400">{game.times_played?.toLocaleString() ?? 0}</div>
                    <div>
                      <button onClick={() => toggleActive(game)} className={`flex items-center gap-1.5 text-xs font-semibold transition ${game.is_active ? "text-emerald-600" : "text-gray-300 hover:text-gray-500"}`}>
                        {game.is_active ? <ToggleRight className="w-5 h-5"/> : <ToggleLeft className="w-5 h-5"/>}
                        {game.is_active ? "On" : "Off"}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setEditGame(game); setIsNew(false); }} className="h-7 w-7 rounded-xl bg-rose-50 hover:bg-rose-100 grid place-items-center text-rose-400 hover:text-rose-600 transition"><Pencil className="w-3 h-3"/></button>
                      <button onClick={() => setDelGame(game)} className="h-7 w-7 rounded-xl bg-red-50 hover:bg-red-100 grid place-items-center text-red-400 hover:text-red-600 transition"><Trash2 className="w-3 h-3"/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "sessions" && (
          <>
            <div className="grid grid-cols-[48px_1fr_1fr_80px_100px_80px] gap-4 px-5 py-3 bg-rose-50/60 border-b border-rose-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <div/><div>Game</div><div>Lobby</div><div>Players</div><div>Started</div><div>Status</div>
            </div>
            <div className="divide-y divide-rose-50">
              {sessions.length === 0 ? (
                <div className="py-12 text-center text-gray-300 text-sm">No sessions</div>
              ) : sessions.map(s => (
                <div key={s.id} className="grid grid-cols-[48px_1fr_1fr_80px_100px_80px] gap-4 px-5 py-3.5 hover:bg-rose-50/30 transition items-center">
                  <div className="h-9 w-9 rounded-xl bg-rose-50 grid place-items-center text-lg">{EMOJI[s.kind]??"🎮"}</div>
                  <div className="text-sm font-medium text-gray-900 capitalize">{s.kind.replace(/_/g," ")}</div>
                  <div className="text-xs text-gray-400 truncate">{s.lobby_name ?? "—"}</div>
                  <div className="text-xs text-gray-400">{s.players}</div>
                  <div className="text-xs text-gray-400">{new Date(s.started_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                  <div><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.status==="active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{s.status==="active" ? "● Live" : "Ended"}</span></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editGame && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setEditGame(null)} className="fixed inset-0 bg-black/15 backdrop-blur-sm z-40" />
            <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.96}} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-rose-100 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-rose-100">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900" style={{fontFamily:"Georgia,serif"}}>{isNew ? "Add game" : "Edit game"}</h3>
                  <button onClick={() => setEditGame(null)} className="h-7 w-7 rounded-xl bg-rose-50 hover:bg-rose-100 grid place-items-center text-gray-400 hover:text-gray-700 transition"><X className="w-4 h-4"/></button>
                </div>
                <div className="space-y-3.5">
                  <Field label="Kind (key)"><input value={editGame.kind??""} onChange={e=>setEditGame(g=>({...g!,kind:e.target.value}))} placeholder="hot_seat" className={IC}/></Field>
                  <Field label="Title"><input value={editGame.title??""} onChange={e=>setEditGame(g=>({...g!,title:e.target.value}))} placeholder="Hot Seat" className={IC}/></Field>
                  <Field label="Description"><textarea value={editGame.description??""} onChange={e=>setEditGame(g=>({...g!,description:e.target.value}))} rows={2} className={IC+" resize-none"}/></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Min players"><input type="number" min={2} max={10} value={editGame.min_players??2} onChange={e=>setEditGame(g=>({...g!,min_players:+e.target.value}))} className={IC}/></Field>
                    <Field label="Max players"><input type="number" min={2} max={20} value={editGame.max_players??10} onChange={e=>setEditGame(g=>({...g!,max_players:+e.target.value}))} className={IC}/></Field>
                  </div>
                  <Field label="Category">
                    <select value={editGame.category??"Free"} onChange={e=>setEditGame(g=>({...g!,category:e.target.value as "Free"|"Plus"}))} className={IC+" bg-[#fef9f5]"}>
                      <option value="Free">Free</option>
                      <option value="Plus">Plus (18+)</option>
                    </select>
                  </Field>
                  <button onClick={() => setEditGame(g=>({...g!,is_active:!g!.is_active}))}
                    className={`flex items-center gap-2 text-sm font-semibold transition ${editGame.is_active ? "text-emerald-600" : "text-gray-400"}`}>
                    {editGame.is_active ? <ToggleRight className="w-5 h-5"/> : <ToggleLeft className="w-5 h-5"/>}
                    {editGame.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setEditGame(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 text-sm font-medium transition">Cancel</button>
                  <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50 hover:brightness-105 transition flex items-center justify-center gap-2">
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                    {isNew ? "Create" : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {delGame && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/15 backdrop-blur-sm z-50" />
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-rose-100 rounded-2xl p-6 w-full max-w-xs shadow-2xl shadow-rose-100">
                <div className="h-12 w-12 rounded-2xl bg-red-100 grid place-items-center mx-auto mb-4"><Trash2 className="w-5 h-5 text-red-500"/></div>
                <h3 className="text-gray-900 font-bold text-center mb-1" style={{fontFamily:"Georgia,serif"}}>Delete "{delGame.title}"?</h3>
                <p className="text-sm text-gray-400 text-center mb-5">This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setDelGame(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:text-gray-700 transition">Cancel</button>
                  <button onClick={() => deleteGame(delGame)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition">Delete</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminGames;

