import { User, Mail, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initial = (user.full_name || user.email || '?')[0].toUpperCase();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-2xl font-bold">
            {initial}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{user.full_name || '—'}</p>
            <span
              className={cn(
                'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium mt-1',
                user.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : user.role === 'official'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700',
              )}
            >
              {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="divide-y divide-gray-100">
          <InfoRow icon={User} label="Full Name" value={user.full_name || '—'} />
          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow icon={Shield} label="Role" value={user.role} />
        </div>
      </div>

      <button
        onClick={logout}
        className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}

function InfoRow({ icon: IconComponent, label, value }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <IconComponent className="h-4 w-4 text-gray-400 shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 capitalize">{value}</p>
      </div>
    </div>
  );
}
