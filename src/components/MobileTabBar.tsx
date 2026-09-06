import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, Users, User, Settings } from 'lucide-react';

const TABS = [
  { to: '/games', label: 'Games', icon: Gamepad2, match: (p: string) => p === '/games' },
  { to: '/friends', label: 'Friends', icon: Users, match: (p: string) => p.startsWith('/friends') },
  { to: '/profile/me', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/profile') },
  { to: '/settings', label: 'Settings', icon: Settings, match: (p: string) => p.startsWith('/settings') },
];

export default function MobileTabBar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-rose-100 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="grid grid-cols-4">
        {TABS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs ${
                active
                  ? 'text-fuchsia-600 dark:text-fuchsia-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
