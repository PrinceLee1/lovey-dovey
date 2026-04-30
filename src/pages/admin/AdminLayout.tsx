// src/pages/admin/AdminLayout.tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, Gamepad2, BarChart3,
  Settings, Heart, LogOut, Bell, ChevronRight, Shield,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/admin",          label: "Overview",  icon: LayoutDashboard, end: true },
  { to: "/admin/users",    label: "Users",     icon: Users            },
  { to: "/admin/games",    label: "Games",     icon: Gamepad2         },
  { to: "/admin/reports",  label: "Reports",   icon: BarChart3        },
  { to: "/admin/settings", label: "Settings",  icon: Settings         },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#fef9f5] flex" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`flex flex-col bg-white border-r border-rose-100 shadow-sm transition-all duration-300 flex-shrink-0 ${collapsed ? "w-[64px]" : "w-52"}`}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-rose-50">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center flex-shrink-0 shadow-md shadow-rose-200">
            <Heart className="w-4 h-4 text-white" fill="white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: "Georgia, serif" }}>LoveyDovey</div>
              <div className="text-[9px] font-black text-rose-400 tracking-widest uppercase">Admin</div>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-rose-50 text-rose-700 font-semibold"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`
              }>
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-rose-500" : "text-gray-400 group-hover:text-gray-600"}`} />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {!collapsed && isActive && <ChevronRight className="w-3 h-3 ml-auto text-rose-300" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-4 border-t border-rose-50 space-y-1">
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 mb-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-400 to-fuchsia-500 grid place-items-center text-white text-xs font-bold flex-shrink-0">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-gray-900 truncate">{user.name}</div>
                <div className="text-[10px] text-rose-400 flex items-center gap-1 font-medium">
                  <Shield className="w-2.5 h-2.5" /> Admin
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 text-sm transition-all">
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
          <button onClick={async () => { await logout(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 text-sm transition-all">
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-rose-100 flex-shrink-0">
          <div className="text-sm text-gray-400">
            <span className="text-gray-300">LoveyDovey</span>
            <span className="mx-1.5">/</span>
            <span className="text-gray-600 font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative h-8 w-8 rounded-xl bg-rose-50 hover:bg-rose-100 grid place-items-center text-rose-400 hover:text-rose-600 transition">
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