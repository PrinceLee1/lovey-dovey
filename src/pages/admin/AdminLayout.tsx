// src/pages/admin/AdminLayout.tsx
import { Outlet, NavLink } from "react-router-dom";
import { Shield, Users, BarChart2, LogOut, Heart } from "lucide-react";

export default function AdminLayout() {
  return (
    <div className="min-h-screen grid md:grid-cols-[260px_1fr]">
      <aside className="border-r bg-white">
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl grid place-items-center text-white bg-gradient-to-br from-pink-500 to-fuchsia-600">
            <Heart className="w-5 h-5" />
          </div>
          <div className="font-semibold">LoveyDovey Admin</div>
        </div>
        <nav className="px-2 py-2 space-y-1">
          <Item to="/admin" icon={<BarChart2 className="w-4 h-4" />}>Overview</Item>
          <Item to="/admin/users" icon={<Users className="w-4 h-4" />}>Users</Item>
        </nav>
        <div className="px-2 py-2 mt-auto hidden md:block">
          <a href="/games" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">
            <LogOut className="w-4 h-4" /> Back to app
          </a>
        </div>
      </aside>
      <main className="bg-gray-50">
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-fuchsia-600" />
            Admin Panel
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Item({ to, icon, children }: any) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg ${isActive ? 'bg-fuchsia-50 text-fuchsia-700' : 'hover:bg-gray-50'}`
      }
    >
      {icon}{children}
    </NavLink>
  );
}
