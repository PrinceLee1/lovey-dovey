import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  User as UserIcon,
  Mail,
  Phone,
  Calendar as CalIcon,
  Shield,
  Lock,
  Bell,
  Eye,
  Sun,
  Moon,
  Link2,
  UploadCloud,
  Trash2,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../libs/axios";
import Footer from "../components/Footer";
import { useToast } from "../context/ToastContext";
/* -------------------------------- Types -------------------------------- */

type ProfilePayload = {
  name?: string;
  email?: string;
  phone?: string;
  gender?: "Male" | "Female" | "Other" | "";
  dob?: string; // YYYY-MM-DD
};

type PasswordPayload = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

type PrefsPayload = {
  email_news: boolean;
  email_reminders: boolean;
  weekly_summary: boolean;
  private_profile: boolean;
};

type SessionInfo = {
  id: number;
  device: string;
  ip_address: string | null;
  last_used_at: string | null;
  created_at: string;
  is_current: boolean;
};

/* -------------------------------- Helpers ------------------------------- */

function timeAgo(iso: string | null): string {
  if (!iso) return "Never used";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ---------------------------- Settings Page ---------------------------- */

export default function Settings() {
  const nav = useNavigate();
  const { user, fetchMe, logout } = useAuth();
  const { toast } = useToast();

  // profile state
  const [profile, setProfile] = useState<ProfilePayload>({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone ?? "",
    gender: (user?.gender as any) ?? "",
    dob: user?.dob ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // password
  const [pwd, setPwd] = useState<PasswordPayload>({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  // prefs — backed by the real user record (PUT /user/prefs)
  const [prefs, setPrefs] = useState<PrefsPayload>({
    email_news: user?.email_news ?? true,
    email_reminders: user?.email_reminders ?? true,
    weekly_summary: user?.weekly_summary ?? true,
    private_profile: user?.private_profile ?? false,
  });
  const [prefsSaving, setPrefsSaving] = useState(false);

  // theme
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as any) || "light"
  );

  // sessions
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  // partner link
  const [pairLink, setPairLink] = useState<string>("");
  const [pairRefreshing, setPairRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile((p) => ({
        ...p,
        name: user.name || "",
        email: user.email || "",
        phone: (user as any).phone ?? "",
        gender: ((user as any).gender as any) ?? "",
        dob: (user as any).dob ?? "",
      }));
      setPrefs({
        email_news: user.email_news ?? true,
        email_reminders: user.email_reminders ?? true,
        weekly_summary: user.weekly_summary ?? true,
        private_profile: user.private_profile ?? false,
      });
    }
  }, [user]);

  async function loadSessions() {
    try {
      setSessionsLoading(true);
      const { data } = await api.get("/account/sessions");
      setSessions(data.sessions ?? []);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => { loadSessions(); }, []);

  const variants = useMemo(
    () => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }),
    []
  );

  /* ------------------------------ Handlers ------------------------------ */

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await api.put("/user", profile);
      await fetchMe();
      setProfileMsg("Profile updated ✔");
    } catch (e: any) {
      setProfileMsg(e.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(null), 2500);
    }
  }

  async function uploadAvatar(file: File) {
    const fd = new FormData();
    fd.append("avatar", file);
    setAvatarUploading(true);
    try {
      const { data } = await api.post("/user/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarPreview(data.url); // use returned URL
      await fetchMe();
    } catch (e: any) {
      toast.error(e.message || "Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    uploadAvatar(file);
  }

  async function savePassword() {
    if (pwd.password !== pwd.password_confirmation) {
      setPwdMsg("Passwords do not match");
      return;
    }
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      await api.post("/user/password", pwd);
      setPwd({ current_password: "", password: "", password_confirmation: "" });
      setPwdMsg("Password changed ✔");
    } catch (e: any) {
      setPwdMsg(e.message || "Failed to change password");
    } finally {
      setPwdSaving(false);
      setTimeout(() => setPwdMsg(null), 2500);
    }
  }

  async function savePrefs() {
    setPrefsSaving(true);
    try {
      await api.put("/user/prefs", prefs);
      await fetchMe();
      toast.success("Preferences saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save preferences");
    } finally {
      setPrefsSaving(false);
    }
  }

  function toggleTheme(next: "light" | "dark") {
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  async function revokeOtherSessions() {
    if (!confirm("Log out of other devices?")) return;
    try {
      await api.post("/logout-others");
      toast.success("Other sessions revoked");
      await loadSessions();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to revoke other sessions");
    }
  }

  async function revokeSession(id: number) {
    setRevokingId(id);
    try {
      await api.delete(`/account/sessions/${id}`);
      setSessions((arr) => arr.filter((s) => s.id !== id));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  }

  async function refreshPairLink() {
    setPairRefreshing(true);
    try {
      // Reuses the existing partner-invite endpoint (generates or returns
      // the current pending invite code) rather than a separate route.
      const { data } = await api.post("/partner/invite");
      setPairLink(`${window.location.origin}/join/${data.code}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to refresh pairing link");
    } finally {
      setPairRefreshing(false);
    }
  }

  async function handleLogout() {
    await logout();
    nav("/onboarding");
  }

  async function deleteAccount() {
    const typed = prompt('Type "DELETE" to confirm account deletion');
    if (typed !== "DELETE") return;
    const password = prompt("Enter your password to confirm:");
    if (!password) return;
    try {
      await api.delete("/user", { data: { password } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete account");
      return;
    }
    await logout();
    nav("/onboarding");
  }

  /* --------------------------------- UI --------------------------------- */

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-rose-50 via-pink-50 to-white dark:from-[#0b0b12] dark:via-[#100c17] dark:to-[#0b0b12]">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 flex items-center justify-between">
        <Link to="/games" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
            <Heart className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
            LoveyDovey
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="rounded-xl border dark:border-gray-700 px-3 py-2 text-sm flex items-center gap-2 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6 px-4 md:px-6 pb-16">
        {/* LEFT: Profile + Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <motion.div {...variants} className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">Profile</div>
              </div>
              <button
                disabled={profileSaving}
                onClick={saveProfile}
                className="rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
              >
                {profileSaving ? "Saving…" : "Save changes"}
              </button>
            </div>

            {profileMsg && <div className="mb-3 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">{profileMsg}</div>}

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-fuchsia-400 to-pink-500 overflow-hidden grid place-items-center text-white text-xl">
                  {/* preview or initials */}
                  {avatarPreview ? (
                    <img src={avatarPreview} className="h-full w-full object-cover" />
                  ) : (
                    (user?.avatar_url ? <img src={user.avatar_url} className="h-full w-full object-cover" /> : null) ||
                    (user?.name
                      ? user.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "?")
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 grid place-items-center shadow"
                  title="Upload avatar"
                >
                  <UploadCloud className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {avatarUploading ? "Uploading avatar…" : "PNG/JPG up to ~2MB"}
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                label="Name"
                icon={<UserIcon className="w-4 h-4 text-gray-400" />}
                value={profile.name || ""}
                onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
                autoComplete="name"
              />
              <LabeledInput
                label="Email"
                type="email"
                icon={<Mail className="w-4 h-4 text-gray-400" />}
                value={profile.email || ""}
                onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                autoComplete="email"
                disabled={!!user?.email} // disable if social login
              />
              <LabeledInput
                label="Phone"
                type="tel"
                icon={<Phone className="w-4 h-4 text-gray-400" />}
                value={profile.phone || ""}
                onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
                autoComplete="tel"
              />
              <LabeledInput
                label="Date of Birth"
                type="date"
                icon={<CalIcon className="w-4 h-4 text-gray-400" />}
                value={profile.dob || ""}
                onChange={(v) => setProfile((p) => ({ ...p, dob: v }))}
              />
              <LabeledSelect
                label="Gender"
                value={profile.gender || ""}
                onChange={(v) => setProfile((p) => ({ ...p, gender: v as any }))}
                options={["Male", "Female", "Other"]}
              />
            </div>
          </motion.div>

          {/* Security */}
          <motion.div {...variants} className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">Security</div>
              </div>
              <button
                disabled={pwdSaving}
                onClick={savePassword}
                className="rounded-xl px-3 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm"
              >
                {pwdSaving ? "Updating…" : "Change password"}
              </button>
            </div>

            {pwdMsg && <div className="mb-3 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">{pwdMsg}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LabeledInput
                label="Current password"
                type="password"
                value={pwd.current_password}
                onChange={(v) => setPwd((p) => ({ ...p, current_password: v }))}
              />
              <LabeledInput
                label="New password"
                type="password"
                value={pwd.password}
                onChange={(v) => setPwd((p) => ({ ...p, password: v }))}
              />
              <LabeledInput
                label="Confirm password"
                type="password"
                value={pwd.password_confirmation}
                onChange={(v) => setPwd((p) => ({ ...p, password_confirmation: v }))}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={revokeOtherSessions} className="rounded-xl border dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                Log out of other devices
              </button>
              <Link to="/games" className="rounded-xl border dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                Back to games
              </Link>
              {user?.is_admin && <Link to="/admin" className="rounded-xl border dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">Admin panel</Link>}
            </div>
          </motion.div>
        </div>

        {/* RIGHT: Preferences, Privacy, Sessions, Pairing, Theme, Danger */}
        <div className="space-y-6">
          {/* Notifications */}
          <motion.div {...variants} className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
              <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</div>
            </div>
            <div className="space-y-3">
              <ToggleRow
                label="Game reminders (email)"
                hint="Email me when someone starts a public game I'm eligible to join"
                checked={prefs.email_reminders}
                onChange={(v) => setPrefs((p) => ({ ...p, email_reminders: v }))}
              />
              <ToggleRow
                label="New features & tips"
                checked={prefs.email_news}
                onChange={(v) => setPrefs((p) => ({ ...p, email_news: v }))}
              />
              <ToggleRow
                label="Weekly summary"
                hint="Games played, streaks, and XP from the past week"
                checked={prefs.weekly_summary}
                onChange={(v) => setPrefs((p) => ({ ...p, weekly_summary: v }))}
              />
            </div>
            <div className="mt-4">
              <button
                disabled={prefsSaving}
                onClick={savePrefs}
                className="w-full rounded-xl px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
              >
                {prefsSaving ? "Saving…" : "Save preferences"}
              </button>
            </div>
          </motion.div>

          {/* Privacy */}
          <motion.div {...variants} className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
              <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">Privacy</div>
            </div>
            <ToggleRow
              label="Private couple mode (hide from discovery)"
              checked={prefs.private_profile}
              onChange={(v) => {
                setPrefs((p) => ({ ...p, private_profile: v }));
              }}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              When enabled, lobbies you host won't appear in the public lobby
              browser — only people with your invite link can find and join them.
            </div>
            <button
              disabled={prefsSaving}
              onClick={savePrefs}
              className="mt-3 w-full rounded-xl px-4 py-2 border dark:border-gray-700 text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {prefsSaving ? "Saving…" : "Save privacy setting"}
            </button>
          </motion.div>

          {/* Partner link */}
          <motion.div {...variants} className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">Partner link</div>
              </div>
              <button
                onClick={refreshPairLink}
                disabled={pairRefreshing}
                className="text-sm rounded-xl border dark:border-gray-700 px-3 py-2 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> {pairRefreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {pairLink ? (
              <div className="rounded-xl border dark:border-gray-700 p-3 text-sm flex items-center justify-between dark:text-gray-200">
                <span className="truncate">{pairLink}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(pairLink)}
                  className="ml-3 rounded-lg border dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Copy
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Tap Refresh to generate your invite link.
              </div>
            )}
          </motion.div>

          {/* Theme */}
          <motion.div {...variants} className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
              <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleTheme("light")}
                className={`flex-1 rounded-xl border px-3 py-2 flex items-center justify-center gap-2 ${
                  theme === "light"
                    ? "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700"
                    : "hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <Sun className="w-4 h-4" /> Light
              </button>
              <button
                onClick={() => toggleTheme("dark")}
                className={`flex-1 rounded-xl border px-3 py-2 flex items-center justify-center gap-2 ${
                  theme === "dark"
                    ? "bg-fuchsia-950/40 border-fuchsia-800 text-fuchsia-300"
                    : "hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
            </div>
          </motion.div>

          {/* Sessions */}
          <motion.div {...variants} className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6">
            <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Sessions & Devices</div>
            <div className="divide-y dark:divide-gray-800">
              {sessionsLoading ? (
                <div className="py-3 text-sm text-gray-500 dark:text-gray-400">Loading sessions…</div>
              ) : sessions.length === 0 ? (
                <div className="py-3 text-sm text-gray-500 dark:text-gray-400">No active sessions</div>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {s.device} {s.is_current && <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full">This device</span>}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{s.ip_address ?? "Unknown IP"} • {timeAgo(s.last_used_at ?? s.created_at)}</div>
                    </div>
                    {!s.is_current && (
                      <button
                        disabled={revokingId === s.id}
                        className="text-sm rounded-lg border dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-50"
                        onClick={() => revokeSession(s.id)}
                      >
                        {revokingId === s.id ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div {...variants} className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">Danger Zone</div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Deleting your account signs you out everywhere, ends your partner
              pairing, and makes your profile inaccessible. Your game history
              is kept for record-keeping and isn't erased from our database.
            </div>
            <button
              onClick={deleteAccount}
              className="w-full rounded-xl px-4 py-2 bg-red-600 text-white"
            >
              Delete account
            </button>
          </motion.div>
        </div>
      </div>
      <Footer variant="full" />
    </div>
  );
}

/* ------------------------------- Controls ------------------------------ */

function LabeledInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  autoComplete,
  disabled
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  autoComplete?: string;
    disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-3">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full ${icon ? "pl-10" : "pl-4"} pr-4 py-3 rounded-xl border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-fuchsia-500 disabled:opacity-60`}
            disabled={disabled}
        />
      </div>
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border dark:border-gray-700 px-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500 bg-white dark:bg-gray-800 dark:text-gray-100"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm text-gray-800 dark:text-gray-200">{label}</div>
        {hint && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 flex-shrink-0 rounded-full p-0.5 transition ${
          checked ? "bg-fuchsia-600" : "bg-gray-300 dark:bg-gray-700"
        }`}
        aria-pressed={checked}
      >
        <div
          className={`h-5 w-5 bg-white rounded-full transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
