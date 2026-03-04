import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, ShieldCheck, ShieldX,
  AlertTriangle, Brain, ImageIcon, CheckCircle2, XCircle,
} from 'lucide-react';
import { reportService } from '../services';
import { useAuth } from '../hooks/useAuth';
import { cn, formatDate, SEVERITY_CONFIG, STATUS_CONFIG } from '../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'official';

  useEffect(() => {
    (async () => {
      try {
        const { data } = await reportService.get(id);
        setReport(data);
      } catch {
        navigate('/reports');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleVerify = async (status) => {
    setActionLoading(true);
    try {
      await reportService.verify(id, status);
      const { data } = await reportService.get(id);
      setReport(data);
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!report) return null;

  const sev = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG.medium;
  const st = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
  const ml = report.ml_analysis;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate('/reports');
            }
          }}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            Report #{report.id} — {report.hazard_type || 'Unknown Hazard'}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(report.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
            </span>
          </div>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', sev.color)}>
          {sev.label}
        </span>
        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', st.color)}>
          {st.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {report.description}
            </p>
          </div>

          {/* Media */}
          {report.media?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-400" />
                  Photos ({report.media.length})
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {report.media.map((m, i) => {
                  const src = m.file_path.startsWith('http')
                    ? m.file_path
                    : `${API_URL.replace('/api/v1', '')}${m.file_path.startsWith('/') ? '' : '/'}${m.file_path}`;
                  return (
                    <img
                      key={i}
                      src={src}
                      alt={`Evidence ${i + 1}`}
                      className="rounded-lg border border-gray-100 object-cover h-48 w-full cursor-pointer hover:opacity-90 transition"
                      onClick={() => window.open(src, '_blank')}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && report.status === 'pending' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Verification Required
              </h2>
              <p className="text-xs text-amber-700 mb-4">
                As an administrator, please review this report and approve or reject it.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleVerify('verified')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button
                  onClick={() => handleVerify('rejected')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* ML Analysis */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-brand-500" />
              ML Analysis
            </h3>
            {ml ? (
              <div className="space-y-3 text-sm">
                <Row label="Hazard Detected" value={ml.hazard_detected ? 'Yes' : 'No'} />
                <Row label="Hazard Type" value={ml.hazard_type || '—'} />
                <Row
                  label="Confidence"
                  value={ml.confidence != null ? `${(ml.confidence * 100).toFixed(0)}%` : '—'}
                />
                <Row
                  label="Sentiment"
                  value={typeof ml.sentiment === 'object' ? ml.sentiment?.sentiment : ml.sentiment || '—'}
                />
                <Row label="Real-data Verified" value={ml.verified_by_real_data ? 'Yes' : 'No'} />
              </div>
            ) : (
              <p className="text-xs text-gray-400">No ML analysis available.</p>
            )}
          </div>

          {/* Credibility */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Credibility Score</h3>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${(report.credibility_score ?? 0) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900">
                {((report.credibility_score ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Quick info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
            <div className="space-y-2.5 text-sm">
              <Row label="Report ID" value={`#${report.id}`} />
              <Row label="User ID" value={`#${report.user_id}`} />
              <Row label="Verified" value={report.is_verified ? 'Yes' : 'No'} />
              <Row label="Latitude" value={report.latitude.toFixed(6)} />
              <Row label="Longitude" value={report.longitude.toFixed(6)} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900 capitalize">{String(value)}</span>
    </div>
  );
}
