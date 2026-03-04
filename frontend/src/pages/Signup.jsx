import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Waves, Eye, EyeOff, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/LanguageContext';
import { cn } from '../lib/utils';

const ROLES = [
  { value: 'citizen',  label: 'Citizen',       desc: 'Report hazards and view alerts',       icon: Users },
  { value: 'admin',    label: 'Administrator', desc: 'Verify reports and manage the system',  icon: ShieldCheck },
];

export default function Signup() {
  const { user: currentUser, signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (currentUser) {
    const dest = currentUser.role === 'admin' || currentUser.role === 'official' ? '/admin' : '/dashboard';
    return <Navigate to={dest} replace />;
  }

  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'citizen' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target?.value ?? e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signup(form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-brand-50/30 to-ocean-50/20 px-4 py-12">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-ocean-100/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/25 mb-4">
            <Waves className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join Tat Sahayak</h1>
          <p className="text-sm text-gray-500 mt-1">Help safeguard coastal communities across India</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200/80 bg-white/80 backdrop-blur-sm shadow-xl shadow-gray-200/40 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{t('auth.signUp')}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => set('role')(r.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition',
                      form.role === r.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <r.icon
                      className={cn(
                        'h-6 w-6',
                        form.role === r.value ? 'text-brand-600' : 'text-gray-400',
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        form.role === r.value ? 'text-brand-700' : 'text-gray-700',
                      )}
                    >
                      {r.label}
                    </span>
                    <span className="text-[11px] text-gray-500 leading-tight">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.fullName')}</label>
              <input
                type="text"
                value={form.full_name}
                onChange={set('full_name')}
                required
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition shadow-sm shadow-brand-500/20"
            >
              {loading ? 'Creating account…' : t('auth.signUp')}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-400 mt-6">
          © {new Date().getFullYear()} Tat Sahayak — Protecting India's Coastline
        </p>
      </div>
    </div>
  );
}
