// src/pages/admin/AdminSettings.tsx
import { useEffect, useState } from "react";
import { api } from "../../libs/axios";
import { useToast } from "../../context/ToastContext";
import { Save, ToggleLeft, ToggleRight, RefreshCw, Bell, Shield, Zap, Globe } from "lucide-react";

type Settings = {
  maintenance_mode: boolean; registration_open: boolean;
  plus_enabled: boolean; plus_price: number;
  max_lobby_size: number; ai_model: string;
  announcement: string; announcement_active: boolean;
};

const IC = "w-full bg-[#fef9f5] dark:bg-gray-800 border border-rose-100 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none focus:border-rose-300 dark:focus:border-rose-700 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950 transition";

function Section({ icon: Icon, title, accent, children }: { icon:any; title:string; accent:string; children:React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2.5 px-5 py-4 border-b border-rose-50 dark:border-gray-800`}>
        <div className={`h-7 w-7 rounded-lg ${accent} grid place-items-center flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label:string; desc?:string; value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <div>
        <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">{label}</div>
        {desc && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)} className={`flex items-center gap-1.5 text-sm font-semibold transition flex-shrink-0 ${value ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`}>
        {value ? <ToggleRight className="w-7 h-7"/> : <ToggleLeft className="w-7 h-7"/>}
      </button>
    </div>
  );
}

function Divider() { return <div className="border-t border-rose-50 dark:border-gray-800" />; }

export default function AdminSettings() {
  const { toast } = useToast();
  const [s, setS] = useState<Settings>({
    maintenance_mode:false, registration_open:true, plus_enabled:true,
    plus_price:4.99, max_lobby_size:10, ai_model:"claude-sonnet-4-20250514",
    announcement:"", announcement_active:false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then(r => setS(x => ({...x,...r.data}))).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const set = <K extends keyof Settings>(k:K, v:Settings[K]) => setS(x => ({...x,[k]:v}));

  async function save() {
    setSaving(true);
    try { await api.post("/admin/settings", s); toast.success("Settings saved!"); }
    catch { toast.error("Failed to save"); } finally { setSaving(false); }
  }

  if (loading) return <div className="p-8 space-y-4 animate-pulse">{[...Array(4)].map((_,i)=><div key={i} className="h-40 rounded-2xl bg-rose-50 dark:bg-gray-800/60"/>)}</div>;

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100" style={{fontFamily:"Georgia,serif"}}>Settings</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Global platform configuration</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50 hover:brightness-105 transition shadow-md shadow-rose-200 dark:shadow-none">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
          {saving ? "Saving…" : "Save all"}
        </button>
      </div>

      <Section icon={Globe} title="Platform" accent="bg-gradient-to-br from-blue-400 to-blue-600">
        <Toggle label="Maintenance mode" desc="Blocks all users from accessing the app" value={s.maintenance_mode} onChange={v=>set("maintenance_mode",v)}/>
        <Divider/>
        <Toggle label="Registration open" desc="Allow new users to create accounts" value={s.registration_open} onChange={v=>set("registration_open",v)}/>
        <Divider/>
        <div>
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Max lobby size</label>
          <input type="number" min={2} max={50} value={s.max_lobby_size} onChange={e=>set("max_lobby_size",+e.target.value)} className={IC}/>
        </div>
      </Section>

      <Section icon={Zap} title="Plus & Monetization" accent="bg-gradient-to-br from-amber-400 to-orange-500">
        <Toggle label="Plus subscriptions enabled" desc="Allow users to upgrade to Plus plan" value={s.plus_enabled} onChange={v=>set("plus_enabled",v)}/>
        <Divider/>
        <div>
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Plus monthly price (USD)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-semibold">$</span>
            <input type="number" min={0} step={0.01} value={s.plus_price} onChange={e=>set("plus_price",+e.target.value)} className={IC+" pl-7"}/>
          </div>
        </div>
      </Section>

      <Section icon={RefreshCw} title="AI Configuration" accent="bg-gradient-to-br from-violet-400 to-fuchsia-600">
        <div>
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">AI model</label>
          <select value={s.ai_model} onChange={e=>set("ai_model",e.target.value)} className={IC+" bg-[#fef9f5] dark:bg-gray-800"}>
            <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</option>
            <option value="claude-opus-4-6">Claude Opus 4.6 (Most powerful)</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fastest)</option>
          </select>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1.5">Used for generating all game prompts and AI responses</p>
        </div>
      </Section>

      <Section icon={Bell} title="Announcement Banner" accent="bg-gradient-to-br from-rose-400 to-pink-600">
        <Toggle label="Show announcement" desc="Display a banner to all users on the dashboard" value={s.announcement_active} onChange={v=>set("announcement_active",v)}/>
        <Divider/>
        <div>
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Message</label>
          <textarea value={s.announcement} onChange={e=>set("announcement",e.target.value)} rows={3}
            placeholder="e.g. 🎉 New game pack dropping this Friday! Stay tuned."
            className={IC+" resize-none"}/>
          {s.announcement_active && s.announcement && (
            <div className="mt-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Preview:</span> {s.announcement}
            </div>
          )}
        </div>
      </Section>

      <Section icon={Shield} title="Security" accent="bg-gradient-to-br from-emerald-400 to-teal-600">
        <div className="space-y-4">
          {[
            { label:"Require age verification for Plus", desc:"Users must confirm 18+ before accessing adult content" },
            { label:"Two-factor auth for admins", desc:"Require 2FA for all admin accounts" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">{item.label}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.desc}</div>
              </div>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 rounded-full font-bold flex-shrink-0">Enforced</span>
            </div>
          ))}
        </div>
      </Section>

      <button onClick={save} disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white font-semibold disabled:opacity-50 hover:brightness-105 transition shadow-lg shadow-rose-200 dark:shadow-none flex items-center justify-center gap-2">
        {saving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
        {saving ? "Saving…" : "Save all settings"}
      </button>
    </div>
  );
}