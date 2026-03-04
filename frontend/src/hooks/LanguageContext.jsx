import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations, { LANGUAGES, detectLanguageFromLocation } from '../lib/translations';

const LanguageContext = createContext(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

export default function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('tat_lang') || 'en';
  });
  const [suggestion, setSuggestion] = useState(null); // { lang, state }

  /* Persist language choice */
  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    localStorage.setItem('tat_lang', lang);
    setSuggestion(null); // dismiss any suggestion
  }, []);

  /* Translation function — falls back to English */
  const t = useCallback(
    (key) => {
      return translations[language]?.[key] || translations.en?.[key] || key;
    },
    [language],
  );

  /* On first visit, detect location and suggest language */
  useEffect(() => {
    // If user already chose a language, don't suggest
    if (localStorage.getItem('tat_lang_dismissed') || localStorage.getItem('tat_lang')) return;

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const result = detectLanguageFromLocation(pos.coords.latitude, pos.coords.longitude);
        if (result && result.lang !== 'en' && result.lang !== language) {
          setSuggestion(result);
        }
      },
      () => {}, // ignore errors
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissSuggestion = useCallback(() => {
    setSuggestion(null);
    localStorage.setItem('tat_lang_dismissed', '1');
  }, []);

  const acceptSuggestion = useCallback(() => {
    if (suggestion) {
      setLanguage(suggestion.lang);
      localStorage.setItem('tat_lang_dismissed', '1');
    }
  }, [suggestion, setLanguage]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: LANGUAGES,
        suggestion,
        dismissSuggestion,
        acceptSuggestion,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
