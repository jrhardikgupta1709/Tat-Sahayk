import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import LanguageSelector from './LanguageSelector';
import LanguageBanner from './LanguageBanner';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/LanguageContext';
import { AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { reportService } from '../services';

export default function AppLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [sosState, setSosState] = useState('idle'); // idle | loading | success | error

  const handleSOS = () => {
    if (sosState === 'loading') return;
    setSosState('loading');

    if (!navigator.geolocation) {
      setSosState('error');
      setTimeout(() => setSosState('idle'), 3000);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await reportService.sos({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setSosState('success');
          setTimeout(() => setSosState('idle'), 4000);
        } catch {
          setSosState('error');
          setTimeout(() => setSosState('idle'), 3000);
        }
      },
      () => {
        setSosState('error');
        setTimeout(() => setSosState('idle'), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const sosLabel =
    sosState === 'loading' ? 'Sending…' :
    sosState === 'success' ? 'SOS Sent!' :
    sosState === 'error' ? 'Failed — retry' :
    t('common.sosEmergency');

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-8">
          {/* SOS Button — one-click emergency */}
          <button
            onClick={handleSOS}
            disabled={sosState === 'loading'}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors ${
              sosState === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : sosState === 'error'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-red-800 hover:bg-red-900 shadow-lg shadow-red-900/40'
            } disabled:opacity-60`}
          >
            {sosState === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : sosState === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {sosLabel}
          </button>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <NotificationBell />
            {user?.role === 'admin' && (
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                Admin
              </span>
            )}
            {user?.role === 'official' && (
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                Official
              </span>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white text-sm font-semibold">
              {(user?.full_name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* SOS confirmation banner */}
        {sosState === 'success' && (
          <div className="mx-8 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3 text-sm text-emerald-800 animate-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold">Emergency alert sent!</p>
              <p className="text-xs text-emerald-600">Admins in your area have been notified. A critical report has been created with your location.</p>
            </div>
          </div>
        )}

        {/* Language suggestion banner */}
        <LanguageBanner />

        {/* Page content */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
