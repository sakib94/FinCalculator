import { useCallback, useEffect, useState } from 'react';
import { readLocal, writeLocal } from '@/lib/storage';
import { DEFAULT_LANG, isLang, type Lang } from '@/i18n';

/**
 * Language is stored alongside the appearance settings and mirrored onto <html lang>,
 * which is what screen readers and the browser's own translation prompt
 * read. Devanagari needs no direction change, so there is no dir handling.
 */
export function useLangState() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = readLocal<Lang>('lang', DEFAULT_LANG);
    return isLang(stored) ? stored : DEFAULT_LANG;
  });

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    writeLocal('lang', lang);
  }, [lang]);

  const toggleLang = useCallback(() => setLang((l) => (l === 'en' ? 'hi' : 'en')), []);

  return { lang, setLang, toggleLang };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}
