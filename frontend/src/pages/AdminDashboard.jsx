import { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ShieldCheck, Eye, Clock, CheckCircle2, XCircle,
  FileText, AlertTriangle, Siren, Filter, MapPin,
  Send, Radio, Info, Users,
} from 'lucide-react';
import { reportService, zoneService, notificationService } from '../services';
import { useAuth } from '../hooks/useAuth';
import { cn, formatDate, SEVERITY_CONFIG, STATUS_CONFIG } from '../lib/utils';

const TABS = [
  { value: 'all',      label: 'All' },
  { value: 'pending',  label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const SEVERITY_OPTIONS = [
  { value: 'info',     label: 'Info',     icon: Info,          color: 'text-brand-600 bg-brand-50' },
  { value: 'warning',  label: 'Warning',  icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  { value: 'critical', label: 'Critical', icon: Siren,         color: 'text-red-600 bg-red-50' },
];

const CATEGORY_OPTIONS = [
  'general', 'weather', 'tsunami', 'flood', 'cyclone',
  'pollution', 'erosion', 'evacuation',
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('all');
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  /* Push Notification state */
  const [pushForm, setPushForm] = useState({
    title: '', message: '', severity: 'info', category: 'general',
    latitude: '', longitude: '', radius_km: '50',
  });
  const [pushSending, setPushSending] = useState(false);
  const [pushSuccess, setPushSuccess] = useState('');
  const [pushError, setPushError] = useState('');
  const [targetCount, setTargetCount] = useState(null);
  const isMainAdmin = user?.role === 'admin';

  /* Guard: only admin / official can access */
  if (!user || (user.role !== 'admin' && user.role !== 'official')) {
    return <Navigate to="/dashboard" replace />;
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch zones list
      const zonesRes = await zoneService.list();
      setZones(zonesRes.data || []);

      // Determine which zone to filter by
      const effectiveZone = selectedZone !== 'all'
        ? selectedZone
        : (user.role === 'official' && user.zone_id ? String(user.zone_id) : 'all');

      let reportsData;
      if (effectiveZone !== 'all') {
        // Zone-filtered reports
        const res = await reportService.byZone({ zone_id: effectiveZone, skip: 0, limit: 200 });
        reportsData = res.data;
      } else {
        // All reports (admin can see everything)
        const res = await reportService.list({ skip: 0, limit: 200 });
        reportsData = res.data;
      }
      setReports(reportsData);

      // Stats — use global stats (zone stats are per-zone in zone management)
      const statsRes = await reportService.stats();
      setStats(statsRes.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedZone, user.role, user.zone_id]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (id, status) => {
    setActionLoading(id);
    try {
      await reportService.verify(id, status);
      await load();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  /* Push notification — target count */
  useEffect(() => {
    const t = setTimeout(async () => {
      const lat = parseFloat(pushForm.latitude);
      const lng = parseFloat(pushForm.longitude);
      const radius = parseFloat(pushForm.radius_km) || 50;
      try {
        const params = { radius_km: radius };
        if (!isNaN(lat) && !isNaN(lng)) { params.latitude = lat; params.longitude = lng; }
        const res = await notificationService.targetCount(params);
        setTargetCount(res.data?.targeted_users ?? null);
      } catch { setTargetCount(null); }
    }, 500);
    return () => clearTimeout(t);
  }, [pushForm.latitude, pushForm.longitude, pushForm.radius_km]);

  const handlePush = async (e) => {
    e.preventDefault();
    setPushError(''); setPushSuccess(''); setPushSending(true);
    const payload = {
      title: pushForm.title, message: pushForm.message,
      severity: pushForm.severity, category: pushForm.category,
      radius_km: parseFloat(pushForm.radius_km) || 50,
    };
    const lat = parseFloat(pushForm.latitude);
    const lng = parseFloat(pushForm.longitude);
    if (!isNaN(lat) && !isNaN(lng)) { payload.latitude = lat; payload.longitude = lng; }
    try {
      await notificationService.push(payload);
      setPushSuccess('Notification pushed successfully!');
      setPushForm({ title: '', message: '', severity: 'info', category: 'general', latitude: '', longitude: '', radius_km: '50' });
      setTimeout(() => setPushSuccess(''), 4000);
    } catch (err) {
      setPushError(err.response?.data?.detail || 'Failed to push notification.');
    } finally { setPushSending(false); }
  };

  const filtered = tab === 'all'
    ? reports
    : reports.filter((r) => r.status === tab);

  const adminStats = [
    { label: 'Total',     value: stats?.total_reports ?? 0,    icon: FileText,     cls: 'text-brand-600 bg-brand-50' },
    { label: 'Pending',   value: stats?.pending_review ?? 0,   icon: Clock,        cls: 'text-amber-600 bg-amber-50' },
    { label: 'Verified',  value: stats?.verified_hazards ?? 0,  icon: ShieldCheck,  cls: 'text-emerald-600 bg-emerald-50' },
    { label: 'Critical',  value: stats?.critical_alerts ?? 0,   icon: Siren,        cls: 'text-red-600 bg-red-50' },
  ];

  if (loading && !reports.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Review and verify submitted reports.</p>
        </div>

        {/* Zone selector — admins see all zones, officials see only their assigned zone */}
        {zones.length > 0 && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              disabled={user.role === 'official' && user.zone_id}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none disabled:opacity-60"
            >
              {user.role === 'admin' && <option value="all">All Zones</option>}
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.report_count} reports)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map(({ label, value, icon: StatIcon, cls }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 flex items-center gap-4">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', cls)}>
              <StatIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Zone info banner */}
      {selectedZone !== 'all' && zones.length > 0 && (
        <div className="rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 flex items-center gap-3">
          <MapPin className="h-4 w-4 text-brand-600 shrink-0" />
          <p className="text-sm text-brand-800">
            Showing reports for <strong>{zones.find((z) => String(z.id) === String(selectedZone))?.name || 'selected zone'}</strong>.
            {user.role === 'admin' && ' Switch to "All Zones" to see everything.'}
          </p>
        </div>
      )}

      {/* Tabs + table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-1 px-4 pt-4 pb-2 border-b border-gray-100">
          <Filter className="h-4 w-4 text-gray-400 mr-2" />
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                tab === t.value
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              )}
            >
              {t.label}
              {t.value === 'pending' && stats?.pending_review > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {stats.pending_review}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No reports in this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Hazard</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Zone</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3">Credibility</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => {
                  const sev = SEVERITY_CONFIG[r.severity] || SEVERITY_CONFIG.medium;
                  const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const busy = actionLoading === r.id;
                  const zoneName = zones.find((z) => z.id === r.zone_id)?.name;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">#{r.id}</td>
                      <td className="px-6 py-3.5 font-medium text-gray-900">{r.hazard_type || '—'}</td>
                      <td className="px-6 py-3.5">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', sev.color)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', sev.dot)} />
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', st.color)}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {zoneName ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" /> {zoneName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-500">{formatDate(r.created_at)}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-500 transition-all"
                              style={{ width: `${(r.credibility_score ?? 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {((r.credibility_score ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/reports/${r.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Link>
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleVerify(r.id, 'verified')}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {busy ? '…' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleVerify(r.id, 'rejected')}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                {busy ? '…' : 'Reject'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== Push Notification Section ====== */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Push Notifications</p>
            <p className="text-xs text-gray-500">Send targeted alerts to citizens</p>
          </div>
        </div>

        <form onSubmit={handlePush} className="border-t border-gray-100 px-6 py-5 space-y-4">
            {pushError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{pushError}</div>
            )}
            {pushSuccess && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{pushSuccess}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
                <input
                  type="text" required value={pushForm.title}
                  onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })}
                  placeholder="e.g., Cyclone Warning — Take Shelter"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Message *</label>
                <textarea
                  required rows={2} value={pushForm.message}
                  onChange={(e) => setPushForm({ ...pushForm, message: e.target.value })}
                  placeholder="Detailed alert message…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Severity</label>
                <div className="flex gap-2">
                  {SEVERITY_OPTIONS.map(({ value, label, icon: SevIcon, color }) => (
                    <button
                      key={value} type="button"
                      onClick={() => setPushForm({ ...pushForm, severity: value })}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition',
                        pushForm.severity === value ? `${color} border-current` : 'border-gray-200 text-gray-500 hover:border-gray-300',
                      )}
                    >
                      <SevIcon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                <select
                  value={pushForm.category}
                  onChange={(e) => setPushForm({ ...pushForm, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location targeting — admin only */}
            {isMainAdmin ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  <p className="text-sm font-medium text-gray-700">Location Targeting</p>
                </div>
                <p className="text-xs text-gray-500">Leave empty for a global broadcast.</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Latitude</label>
                    <input type="number" step="any" value={pushForm.latitude}
                      onChange={(e) => setPushForm({ ...pushForm, latitude: e.target.value })}
                      placeholder="e.g., 19.07"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Longitude</label>
                    <input type="number" step="any" value={pushForm.longitude}
                      onChange={(e) => setPushForm({ ...pushForm, longitude: e.target.value })}
                      placeholder="e.g., 72.87"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Radius (km)</label>
                    <input type="number" step="1" min="1" value={pushForm.radius_km}
                      onChange={(e) => setPushForm({ ...pushForm, radius_km: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  </div>
                </div>
                {targetCount !== null && (
                  <div className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2">
                    <Users className="h-4 w-4 text-brand-500" />
                    <span className="text-xs text-gray-600">
                      Estimated reach: <strong className="text-gray-900">{targetCount}</strong> user(s)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4 flex items-start gap-3">
                <MapPin className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-brand-800">Auto-targeted to your zone</p>
                  <p className="text-xs text-brand-600 mt-1">
                    This notification will be sent to all users within 50 km of your assigned zone.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit" disabled={pushSending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {pushSending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Push Notification
            </button>
          </form>
      </div>
    </div>
  );
}
