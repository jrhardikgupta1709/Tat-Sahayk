import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Send, Bell, MapPin, Users, AlertTriangle, Siren, Info,
  Clock, ChevronDown, ChevronUp, Radio,
} from 'lucide-react';
import { notificationService } from '../services';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const SEVERITY_OPTIONS = [
  { value: 'info',     label: 'Info',     icon: Info,          color: 'text-brand-600 bg-brand-50' },
  { value: 'warning',  label: 'Warning',  icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  { value: 'critical', label: 'Critical', icon: Siren,         color: 'text-red-600 bg-red-50' },
];

const CATEGORY_OPTIONS = [
  'general', 'weather', 'tsunami', 'flood', 'cyclone',
  'pollution', 'erosion', 'evacuation',
];

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

export default function PushNotifications() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [targetCount, setTargetCount] = useState(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [form, setForm] = useState({
    title: '',
    message: '',
    severity: 'info',
    category: 'general',
    latitude: '',
    longitude: '',
    radius_km: '50',
  });

  const isMainAdmin = user?.role === 'admin';

  if (!user || (user.role !== 'admin' && user.role !== 'official')) {
    return <Navigate to="/dashboard" replace />;
  }

  const loadHistory = useCallback(async () => {
    try {
      const res = await notificationService.list({ limit: 50 });
      setHistory(res.data || []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Fetch target count when location changes
  useEffect(() => {
    const t = setTimeout(async () => {
      const lat = parseFloat(form.latitude);
      const lng = parseFloat(form.longitude);
      const radius = parseFloat(form.radius_km) || 50;
      try {
        const params = { radius_km: radius };
        if (!isNaN(lat) && !isNaN(lng)) {
          params.latitude = lat;
          params.longitude = lng;
        }
        const res = await notificationService.targetCount(params);
        setTargetCount(res.data?.targeted_users ?? null);
      } catch {
        setTargetCount(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.latitude, form.longitude, form.radius_km]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);

    const payload = {
      title: form.title,
      message: form.message,
      severity: form.severity,
      category: form.category,
      radius_km: parseFloat(form.radius_km) || 50,
    };

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      payload.latitude = lat;
      payload.longitude = lng;
    }

    try {
      await notificationService.push(payload);
      setSuccess('Notification pushed successfully!');
      setForm({
        title: '',
        message: '',
        severity: 'info',
        category: 'general',
        latitude: '',
        longitude: '',
        radius_km: '50',
      });
      await loadHistory();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to push notification.');
    } finally {
      setSending(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(4),
          longitude: pos.coords.longitude.toFixed(4),
        }));
      },
      () => setError('Could not get your location.'),
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Push Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Send targeted alerts to citizens within a coastal radius.
        </p>
      </div>

      {/* Push form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 space-y-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <Radio className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-gray-900">New Alert</h2>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Cyclone Warning — Take Shelter"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Message *</label>
            <textarea
              required
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Detailed alert message for citizens in the area..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 resize-none"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Severity</label>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map(({ value, label, icon: SevIcon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, severity: value })}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition',
                    form.severity === value
                      ? `${color} border-current`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300',
                  )}
                >
                  <SevIcon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location targeting — only shown for main admin */}
        {isMainAdmin ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-500" />
                <p className="text-sm font-medium text-gray-700">Location Targeting</p>
              </div>
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="text-[11px] font-medium text-brand-600 hover:underline"
              >
                Use my location
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Only users within this radius will receive the alert.
              Leave empty for a global broadcast.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g., 19.07"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g., 72.87"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Radius (km)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={form.radius_km}
                  onChange={(e) => setForm({ ...form, radius_km: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
            </div>
            {targetCount !== null && (
              <div className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2">
                <Users className="h-4 w-4 text-brand-500" />
                <span className="text-xs text-gray-600">
                  Estimated reach: <strong className="text-gray-900">{targetCount}</strong> user(s) in the target area
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Officials — simplified info banner */
          <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4 flex items-start gap-3">
            <MapPin className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-brand-800">Auto-targeted to your zone</p>
              <p className="text-xs text-brand-600 mt-1">
                This notification will be sent to all users within 50 km of your assigned zone.
                Location targeting is handled automatically.
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {sending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Push Notification
        </button>
      </form>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sent Notifications</h2>
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No notifications have been sent yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((n) => {
              const isExpanded = expandedId === n.id;
              const SevIcon = n.severity === 'critical' ? Siren : n.severity === 'warning' ? AlertTriangle : Info;
              return (
                <div key={n.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : n.id)}
                    className="flex items-center justify-between w-full px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        n.severity === 'critical' ? 'bg-red-100 text-red-600'
                        : n.severity === 'warning' ? 'bg-amber-100 text-amber-600'
                        : 'bg-brand-100 text-brand-600',
                      )}>
                        <SevIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3" /> {timeAgo(n.created_at)}
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">{n.category}</span>
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/30 space-y-2">
                      <p className="text-sm text-gray-600">{n.message}</p>
                      {n.latitude && n.longitude && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Targeted: {n.radius_km}km radius from ({n.latitude.toFixed(4)}, {n.longitude.toFixed(4)})
                        </p>
                      )}
                      {!n.latitude && (
                        <p className="text-xs text-gray-400">📡 Global broadcast (all users)</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
