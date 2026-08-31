import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import translations from './translations';
import type { Locale } from './translations';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('kraefegg-locale');
    return (saved as Locale) || 'pt';
  });

  const handleSetLocale = (l: Locale) => {
    setLocale(l);
    localStorage.setItem('kraefegg-locale', l);
    document.documentElement.lang = l === 'pt' ? 'pt-BR' : l;
  };

  const t = (key: string): string => {
    return translations[locale][key] || translations['pt'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
