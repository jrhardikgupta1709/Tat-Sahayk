import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, FileText, ShieldCheck, Siren,
  ArrowRight, MapPin, Clock,
  MessageSquare, ThumbsUp, Share2, User as UserIcon,
  Newspaper, ExternalLink, RefreshCw, ImageIcon,
} from 'lucide-react';
import { reportService, newsService } from '../services';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/LanguageContext';
import { cn, formatDate, SEVERITY_CONFIG } from '../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

const STAT_CARDS = [
  { key: 'total_reports',   labelKey: 'dash.totalReports',    icon: FileText,     color: 'text-brand-600  bg-brand-50' },
  { key: 'pending_review',  labelKey: 'dash.pendingReview',   icon: Clock,        color: 'text-amber-600  bg-amber-50' },
  { key: 'verified_hazards',labelKey: 'dash.verifiedHazards',  icon: ShieldCheck,  color: 'text-emerald-600 bg-emerald-50' },
  { key: 'critical_alerts', labelKey: 'dash.criticalAlerts',   icon: Siren,        color: 'text-red-600    bg-red-50' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState([]);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNews = async (refresh = false) => {
    setNewsLoading(true);
    try {
      const res = await newsService.list({ limit: 10, refresh });
      setNews(res.data || []);
    } catch {
      /* silent */
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        // Build feed params — pass user location for 50km radius filtering
        const feedParams = { skip: 0, limit: 20 };
        if (user?.latitude && user?.longitude) {
          feedParams.latitude = user.latitude;
          feedParams.longitude = user.longitude;
          feedParams.radius_km = 50;
        }

        const [statsRes, feedRes] = await Promise.all([
          reportService.stats(),
          reportService.feed(feedParams),
        ]);
        setStats(statsRes.data);
        setFeed(feedRes.data);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    load();
    loadNews();
  }, [user?.latitude, user?.longitude]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('dash.welcome')}, {user?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t('dash.summary')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div
            key={key}
            className="rounded-xl border border-gray-200 bg-white p-4 flex items-start gap-3"
          >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {stats?.[key] ?? '—'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions — compact */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          to="/create-report"
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-brand-300 transition group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{t('nav.newReport')}</p>
            <p className="text-[11px] text-gray-400">{t('dash.reportHazard')}</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-brand-500 transition" />
        </Link>

        <Link
          to="/reports"
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-brand-300 transition group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ocean-50 text-ocean-600">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{t('dash.myReports')}</p>
            <p className="text-[11px] text-gray-400">{t('dash.viewSub')}</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-brand-500 transition" />
        </Link>

        <Link
          to="/map"
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-brand-300 transition group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{t('dash.hazardMap')}</p>
            <p className="text-[11px] text-gray-400">{t('dash.viewMapped')}</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-brand-500 transition" />
        </Link>
      </div>

      {/* ===== MAIN: Community Feed (large) + News sidebar (compact) ===== */}
      <div className="flex gap-6">
        {/* Community Feed — main focus */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-bold text-gray-900">{t('dash.communityFeed')}</h2>
              <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                Verified • 50km
              </span>
            </div>
            <Link to="/reports" className="text-xs font-medium text-brand-600 hover:underline">
              {t('dash.viewAll')} →
            </Link>
          </div>

          {feed.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                No verified reports near you yet — community alerts will appear here once reviewed by officials.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((r) => {
                const sev = SEVERITY_CONFIG[r.severity] || SEVERITY_CONFIG.medium;
                return (
                  <div key={r.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition group">
                    {/* Card header */}
                    <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          Citizen Report #{r.id}
                        </p>
                        <p className="text-[11px] text-gray-400">{formatDate(r.created_at)}</p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    </div>

                    {/* Content */}
                    <div className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', sev.color)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', sev.dot)} />
                          {sev.label}
                        </span>
                        {r.hazard_type && r.hazard_type !== 'unknown' && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {r.hazard_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {r.description}
                      </p>

                      {/* Report images */}
                      {r.media?.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {r.media.slice(0, 2).map((m, i) => {
                            const src = m.file_path.startsWith('http')
                              ? m.file_path
                              : `${API_URL.replace('/api/v1', '')}${m.file_path.startsWith('/') ? '' : '/'}${m.file_path}`;
                            return (
                              <img
                                key={i}
                                src={src}
                                alt={`Evidence ${i + 1}`}
                                className="rounded-lg border border-gray-100 object-cover h-32 w-full"
                              />
                            );
                          })}
                          {r.media.length > 2 && (
                            <div className="flex items-center justify-center rounded-lg border border-gray-100 bg-gray-50 h-32">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <ImageIcon className="h-3.5 w-3.5" />
                                +{r.media.length - 2} more
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Location + credibility */}
                    <div className="px-5 pb-2 flex items-center gap-4 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                      </span>
                      {r.credibility_score != null && (
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {(r.credibility_score * 100).toFixed(0)}% credibility
                        </span>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-2.5">
                      <Link
                        to={`/reports/${r.id}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                      >
                        {t('common.viewDetails')} <ArrowRight className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: `Hazard Alert #${r.id}`, text: r.description, url: window.location.origin + `/reports/${r.id}` });
                          }
                        }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
                      >
                        <Share2 className="h-3.5 w-3.5" /> {t('common.share')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== NEWS SIDEBAR — compact column ===== */}
        <div className="w-72 shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Newspaper className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-bold text-gray-900">{t('dash.liveNews')}</h3>
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-600 uppercase animate-pulse">
                  Live
                </span>
              </div>
              <button
                onClick={() => loadNews(true)}
                disabled={newsLoading}
                className="text-gray-400 hover:text-brand-600 transition disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', newsLoading && 'animate-spin')} />
              </button>
            </div>

            {news.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
                <Newspaper className="h-5 w-5 text-gray-300 mx-auto mb-1" />
                <p className="text-[11px] text-gray-400">
                  {newsLoading ? 'Fetching…' : 'No news available'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
                {news.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-2.5 rounded-lg border border-gray-100 bg-white p-3 hover:border-brand-200 hover:shadow-sm transition"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-brand-700 transition">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-medium text-gray-500">{item.source}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">
                          {item.published_at
                            ? new Date(item.published_at).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short',
                              })
                            : 'Recent'}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-brand-500 transition mt-0.5 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
