export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  // Backend stores UTC (SQLite func.now()) but may omit the Z suffix.
  // Ensure the date is parsed as UTC, then displayed in IST.
  const raw = String(dateStr);
  const utcStr = raw.endsWith('Z') || raw.includes('+') ? raw : raw + 'Z';
  return new Date(utcStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const SEVERITY_CONFIG = {
  low:      { label: 'Low',      color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  medium:   { label: 'Medium',   color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  high:     { label: 'High',     color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
  critical: { label: 'Critical', color: 'bg-red-200 text-red-900',      dot: 'bg-red-700' },
};

export const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-800' },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
};
