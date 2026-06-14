import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {en, type TranslationShape} from './locales/en';
import {es} from './locales/es';
import {fr} from './locales/fr';

export type LanguageCode = 'en' | 'es' | 'fr';

export const SUPPORTED_LANGUAGES: {code: LanguageCode; label: string}[] = [
  {code: 'en', label: 'EN'},
  {code: 'es', label: 'ES'},
  {code: 'fr', label: 'FR'},
];

const RESOURCES: Record<LanguageCode, TranslationShape> = {en, es, fr};

const STORAGE_KEY = 'em_lang';

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
  ready: false,
});

function resolve(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function LanguageProvider({children}: {children: React.ReactNode}) {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as LanguageCode | null;
        if (stored && stored in RESOURCES) {
          setLanguageState(stored);
        }
      } catch {
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value =
        resolve(RESOURCES[language], key) ?? resolve(RESOURCES.en, key) ?? key;
      return interpolate(value, vars);
    },
    [language],
  );

  const value = useMemo(
    () => ({language, setLanguage, t, ready}),
    [language, setLanguage, t, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}
