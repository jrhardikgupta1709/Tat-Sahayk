import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, AlertTriangle, Info, Siren, MapPin } from 'lucide-react';
import { notificationService } from '../services';
import { cn } from '../lib/utils';

const SEVERITY_STYLES = {
  critical: 'border-l-red-500 bg-red-50/50',
  warning:  'border-l-amber-500 bg-amber-50/50',
  info:     'border-l-brand-500 bg-brand-50/30',
};

const SEVERITY_ICON = {
  critical: Siren,
  warning:  AlertTriangle,
  info:     Info,
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        notificationService.list({ limit: 20 }),
        notificationService.stats(),
      ]);
      setNotifications(listRes.data || []);
      setUnread(statsRes.data?.unread || 0);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [load]);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      /* silent */
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unread > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-brand-600 hover:bg-brand-50 transition"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => {
                  const SevIcon = SEVERITY_ICON[n.severity] || Info;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'relative flex gap-3 px-4 py-3.5 border-l-[3px] transition cursor-pointer hover:bg-gray-50/60',
                        SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.info,
                        n.is_read && 'opacity-60 border-l-gray-200 bg-transparent',
                      )}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          n.severity === 'critical'
                            ? 'bg-red-100 text-red-600'
                            : n.severity === 'warning'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-brand-100 text-brand-600',
                        )}
                      >
                        <SevIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{n.title}</p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        {n.latitude && n.longitude && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                            <MapPin className="h-2.5 w-2.5" />
                            {n.radius_km}km radius from ({n.latitude.toFixed(2)}, {n.longitude.toFixed(2)})
                          </span>
                        )}
                      </div>
                      {!n.is_read && (
                        <div className="absolute top-3.5 right-3">
                          <div className="h-2 w-2 rounded-full bg-brand-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
