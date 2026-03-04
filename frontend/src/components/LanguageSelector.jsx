import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../hooks/LanguageContext';
import { cn } from '../lib/utils';

export default function LanguageSelector() {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = languages[language];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
        title="Change language"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{current?.nativeName || 'English'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="p-1.5">
            {Object.entries(languages).map(([code, meta]) => (
              <button
                key={code}
                onClick={() => {
                  setLanguage(code);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left text-sm transition',
                  language === code
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className="text-base">{meta.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{meta.nativeName}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{meta.name}</p>
                </div>
                {language === code && (
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
