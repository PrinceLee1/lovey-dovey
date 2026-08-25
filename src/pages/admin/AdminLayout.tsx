// src/pages/admin/AdminLayout.tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, Gamepad2, BarChart3,
  Settings, Heart, LogOut, Bell, ChevronRight, Shield, MessageSquare,
  Menu, X, Sun, Moon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const NAV = [
  { to: "/admin",          label: "Overview",  icon: LayoutDashboard, end: true },
  { to: "/admin/users",    label: "Users",     icon: Users            },
  { to: "/admin/games",    label: "Games",     icon: Gamepad2         },
  { to: "/admin/feedback", label: "Feedback",  icon: MessageSquare    },
  { to: "/admin/reports",  label: "Reports",   icon: BarChart3        },
  { to: "/admin/settings", label: "Settings",  icon: Settings         },
];

function useAdminTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return { dark, toggle };
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-rose-50 dark:border-gray-800">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center flex-shrink-0 shadow-md shadow-rose-200 dark:shadow-none">
          <Heart className="w-4 h-4 text-white" fill="white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate" style={{ fontFamily: "Georgia, serif" }}>LoveyDovey</div>
            <div className="text-[9px] font-black text-rose-400 tracking-widest uppercase">Admin</div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`
            }>
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-rose-500 dark:text-rose-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"}`} />
                {!collapsed && <span className="truncate">{label}</span>}
                {!collapsed && isActive && <ChevronRight className="w-3 h-3 ml-auto text-rose-300 dark:text-rose-600" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle: toggleTheme } = useAdminTheme();

  return (
    <div className="min-h-screen bg-[#fef9f5] dark:bg-gray-950 flex" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* ── Sidebar (desktop) ───────────────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-rose-100 dark:border-gray-800 shadow-sm transition-all duration-300 flex-shrink-0 ${collapsed ? "w-[64px]" : "w-52"}`}>
        <SidebarContent collapsed={collapsed} />

        {/* Bottom */}
        <div className="px-2 py-4 border-t border-rose-50 dark:border-gray-800 space-y-1">
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-gray-800 mb-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold flex-shrink-0">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                <div className="text-[10px] text-rose-400 flex items-center gap-1 font-medium">
                  <Shield className="w-2.5 h-2.5" /> Admin
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-all">
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
          <button onClick={async () => { await logout(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm transition-all">
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Sidebar (mobile drawer) ─────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/30 z-40 md:hidden" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-rose-100 dark:border-gray-800 shadow-2xl z-50 flex flex-col md:hidden">
              <button onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-3 h-7 w-7 rounded-xl bg-rose-50 dark:bg-gray-800 grid place-items-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition">
                <X className="w-4 h-4" />
              </button>
              <div className="flex-1 min-h-0 flex flex-col"><SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} /></div>
              <div className="px-2 py-4 border-t border-rose-50 dark:border-gray-800 space-y-1">
                {user && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-gray-800 mb-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold flex-shrink-0">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                      <div className="text-[10px] text-rose-400 flex items-center gap-1 font-medium"><Shield className="w-2.5 h-2.5" /> Admin</div>
                    </div>
                  </div>
                )}
                <button onClick={async () => { await logout(); navigate("/"); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm transition-all">
                  <LogOut className="w-4 h-4" /><span>Sign out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white dark:bg-gray-900 border-b border-rose-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="md:hidden h-8 w-8 rounded-xl bg-rose-50 dark:bg-gray-800 grid place-items-center text-rose-500 dark:text-rose-300 flex-shrink-0">
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-sm text-gray-400 dark:text-gray-500 truncate">
              <span className="text-gray-300 dark:text-gray-600">LoveyDovey</span>
              <span className="mx-1.5">/</span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-gray-800 hover:bg-rose-100 dark:hover:bg-gray-700 grid place-items-center text-rose-400 dark:text-amber-300 hover:text-rose-600 dark:hover:text-amber-200 transition">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="relative h-8 w-8 rounded-xl bg-rose-50 dark:bg-gray-800 hover:bg-rose-100 dark:hover:bg-gray-700 grid place-items-center text-rose-400 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200 transition">
              <Bell className="w-4 h-4" />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            </button>
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold shadow-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
