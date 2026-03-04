import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { reportService } from '../services';
import { cn, formatDate, SEVERITY_CONFIG } from '../lib/utils';
import 'leaflet/dist/leaflet.css';

/* Fix default Leaflet marker icons not loading in bundlers */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MARKER_COLORS = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#991b1b',
};

function makeIcon(severity) {
  const color = MARKER_COLORS[severity] || MARKER_COLORS.medium;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px; height:26px; border-radius:50%;
      background:${color}; border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.3);
    "></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/* Default center: India's west coast */
const DEFAULT_CENTER = [15.4, 73.8];
const DEFAULT_ZOOM = 6;

/* Restrict map to Indian subcontinent — cannot zoom/pan outside */
const INDIA_BOUNDS = [
  [5.0, 65.0],   // South-West corner
  [37.0, 100.0], // North-East corner
];

export default function MapPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await reportService.list({ skip: 0, limit: 500 });
        setReports(data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hazard Map</h1>
          <p className="text-sm text-gray-500 mt-1">
            {reports.length} report{reports.length !== 1 ? 's' : ''} plotted
          </p>
        </div>
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
          {Object.entries(MARKER_COLORS).map(([sev, color]) => (
            <span key={sev} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ background: color }} />
              {sev.charAt(0).toUpperCase() + sev.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={5}
          maxZoom={18}
          maxBounds={INDIA_BOUNDS}
          maxBoundsViscosity={1.0}
          className="h-full w-full z-0"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {reports.map((r) => (
            <Marker key={r.id} position={[r.latitude, r.longitude]} icon={makeIcon(r.severity)}>
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-semibold text-gray-900 text-sm mb-1">
                    {r.hazard_type || 'Unknown Hazard'}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{r.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('rounded-full px-2 py-0.5 font-medium',
                      (SEVERITY_CONFIG[r.severity] || SEVERITY_CONFIG.medium).color,
                    )}>
                      {(SEVERITY_CONFIG[r.severity] || SEVERITY_CONFIG.medium).label}
                    </span>
                    <span className="text-gray-400">{formatDate(r.created_at)}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/reports/${r.id}`)}
                    className="mt-2 w-full rounded bg-brand-500 py-1 text-xs font-medium text-white hover:bg-brand-600 transition"
                  >
                    View Report
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
