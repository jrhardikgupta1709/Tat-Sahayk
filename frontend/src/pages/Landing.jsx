import { Link, Navigate } from 'react-router-dom';
import { Waves, ShieldCheck, MapPin, Brain, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Detection',
    desc: 'Machine learning models classify hazards, assess credibility, and detect patterns in real time.',
  },
  {
    icon: MapPin,
    title: 'Geospatial Mapping',
    desc: 'Reports are plotted on an interactive map with severity-coded markers and hotspot clustering.',
  },
  {
    icon: ShieldCheck,
    title: 'Admin Verification',
    desc: 'Officials review, verify, or reject submissions through a dedicated admin dashboard.',
  },
];

export default function Landing() {
  const { user, loading } = useAuth();

  // Show nothing while auth state is being resolved (prevents flash of Landing)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // If already logged in, redirect to dashboard
  if (user) {
    const dest = user.role === 'admin' || user.role === 'official' ? '/admin' : '/dashboard';
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
            <Waves className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Tat Sahayak</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-8 pt-24 pb-16 text-center">
        <span className="inline-block mb-6 rounded-full bg-brand-50 border border-brand-200 px-4 py-1.5 text-xs font-semibold text-brand-700">
          Protecting India's Coastline
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-gray-900">
          Community-Powered{' '}
          <span className="bg-gradient-to-r from-brand-500 to-ocean-500 bg-clip-text text-transparent">
            Coastal Hazard
          </span>{' '}
          Detection
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Report coastal hazards, get AI-driven analysis, and help authorities respond faster — all from a single platform.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition"
          >
            Start Reporting <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-8 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Tat Sahayak — Coastal Guardian
      </footer>
    </div>
  );
}
