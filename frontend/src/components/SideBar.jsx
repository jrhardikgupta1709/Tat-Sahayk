import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/LanguageContext';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Map,
  ShieldCheck,
  Globe,
  User,
  LogOut,
  Waves,
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'official';

  const NAV_ITEMS = [
    { to: '/dashboard',     label: t('nav.dashboard'),    icon: LayoutDashboard },
    { to: '/create-report', label: t('nav.newReport'),    icon: FilePlus },
    { to: '/reports',       label: t('nav.reports'),       icon: FileText },
    { to: '/map',           label: t('nav.map'),           icon: Map },
  ];

  const ADMIN_ITEMS = [
    { to: '/admin',  label: t('nav.admin'),  icon: ShieldCheck, roles: ['admin', 'official'] },
    { to: '/zones',  label: t('nav.zones'),  icon: Globe,       roles: ['admin'] },
  ];

  const linkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      isActive
        ? 'bg-brand-50 text-brand-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
          <Waves className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Tat Sahayak</p>
          <p className="text-[11px] text-gray-500 leading-tight">Coastal Guardian</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Main
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Administration
            </p>
            {ADMIN_ITEMS.filter((item) => item.roles.includes(user?.role)).map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-200 p-3 space-y-1">
        <button
          onClick={() => navigate('/profile')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <User className="h-[18px] w-[18px]" />
          <span className="flex-1 text-left truncate">{user?.full_name || user?.email}</span>
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {t('nav.signOut')}
        </button>
      </div>
    </aside>
  );
}
