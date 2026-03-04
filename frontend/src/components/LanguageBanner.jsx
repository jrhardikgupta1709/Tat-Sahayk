import { Globe, X } from 'lucide-react';
import { useLanguage } from '../hooks/LanguageContext';

/**
 * Shows a banner suggesting the user switch to their regional language
 * based on detected geolocation.
 */
export default function LanguageBanner() {
  const { suggestion, acceptSuggestion, dismissSuggestion, languages } = useLanguage();

  if (!suggestion) return null;

  const suggestedLang = languages[suggestion.lang];
  if (!suggestedLang) return null;

  return (
    <div className="mx-8 mt-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 flex items-center gap-3 animate-in">
      <Globe className="h-5 w-5 text-brand-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-brand-800">
          Based on your location ({suggestion.state}), would you like to switch to{' '}
          <strong>{suggestedLang.nativeName}</strong> ({suggestedLang.name})?
        </p>
      </div>
      <button
        onClick={acceptSuggestion}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition whitespace-nowrap"
      >
        Switch to {suggestedLang.nativeName}
      </button>
      <button
        onClick={dismissSuggestion}
        className="rounded-lg p-1.5 text-brand-400 hover:text-brand-600 hover:bg-brand-100 transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
