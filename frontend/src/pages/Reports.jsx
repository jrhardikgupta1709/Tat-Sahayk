import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter } from 'lucide-react';
import { reportService } from '../services';
import { cn, formatDate, SEVERITY_CONFIG, STATUS_CONFIG } from '../lib/utils';

const SEVERITY_OPTIONS = ['all', 'low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS = ['all', 'pending', 'verified', 'rejected'];

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await reportService.list({ skip: 0, limit: 200 });
        setReports(data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = reports.filter((r) => {
    if (sevFilter !== 'all' && r.severity !== sevFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.hazard_type || '').toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            {reports.length} total report{reports.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/create-report"
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
        >
          + New Report
        </Link>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by hazard type or description"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            className="rounded-lg border border-gray-200 py-2 px-3 text-xs font-medium text-gray-700 focus:border-brand-500 outline-none"
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Severities' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 py-2 px-3 text-xs font-medium text-gray-700 focus:border-brand-500 outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No reports match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Hazard Type</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => {
                  const sev = SEVERITY_CONFIG[r.severity] || SEVERITY_CONFIG.medium;
                  const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-6 py-3.5 font-mono text-xs text-gray-500">#{r.id}</td>
                      <td className="px-6 py-3.5 font-medium text-gray-900">
                        {r.hazard_type || '—'}
                      </td>
                      <td className="px-6 py-3.5 text-gray-600 max-w-xs truncate">
                        {r.description}
                      </td>
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
                      <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          to={`/reports/${r.id}`}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
