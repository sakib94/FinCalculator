import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { readLocal, writeLocal } from '@/lib/storage';
import { useLangState, useThemeState } from './usePreferences';
import { translator, type Lang, type Translate } from '@/i18n';
import type { Mode, Palette, PaletteId, ResolvedMode } from './usePreferences';

/**
 * Theme, favourites and recently-used live in one store shared by the whole
 * app, so starring a calculator updates the sidebar, the dashboard and the
 * page header at once — and the theme picker, the topbar icon and the
 * keyboard shortcut all read the same value rather than separate copies.
 * Everything is persisted locally — nothing leaves the browser.
 */

const MAX_RECENT = 6;

interface PreferencesValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: Translate;
  palette: PaletteId;
  paletteOption: Palette;
  setPalette: (p: PaletteId) => void;
  mode: Mode;
  resolvedMode: ResolvedMode;
  setMode: (m: Mode) => void;
  cyclePalette: () => void;
  toggleMode: () => void;
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  recents: string[];
  pushRecent: (id: string) => void;
  clearRecents: () => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { lang, setLang, toggleLang } = useLangState();
  // Rebuilt only when the language actually changes.
  const t = useMemo(() => translator(lang), [lang]);

  const {
    palette,
    paletteOption,
    setPalette,
    mode,
    resolvedMode,
    setMode,
    cyclePalette,
    toggleMode,
  } = useThemeState();
  const [favorites, setFavorites] = useState<string[]>(() => readLocal<string[]>('favorites', []));
  const [recents, setRecents] = useState<string[]>(() => readLocal<string[]>('recents', []));

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeLocal('favorites', next);
      return next;
    });
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecents((prev) => {
      if (prev[0] === id) return prev;
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      writeLocal('recents', next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    writeLocal('recents', []);
  }, []);

  const value = useMemo<PreferencesValue>(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      palette,
      paletteOption,
      setPalette,
      mode,
      resolvedMode,
      setMode,
      cyclePalette,
      toggleMode,
      favorites,
      isFavorite: (id: string) => favorites.includes(id),
      toggleFavorite,
      recents,
      pushRecent,
      clearRecents,
    }),
    [
      lang,
      setLang,
      toggleLang,
      t,
      palette,
      paletteOption,
      setPalette,
      mode,
      resolvedMode,
      setMode,
      cyclePalette,
      toggleMode,
      favorites,
      recents,
      toggleFavorite,
      pushRecent,
      clearRecents,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}

/** The translate function for the active language. */
export function useT(): Translate {
  return usePreferences().t;
}

export function useLanguage() {
  const { lang, setLang, toggleLang } = usePreferences();
  return { lang, setLang, toggleLang };
}

export function useTheme() {
  const {
    palette,
    paletteOption,
    setPalette,
    mode,
    resolvedMode,
    setMode,
    cyclePalette,
    toggleMode,
  } = usePreferences();
  return { palette, paletteOption, setPalette, mode, resolvedMode, setMode, cyclePalette, toggleMode };
}

export function useFavorites() {
  const { favorites, isFavorite, toggleFavorite } = usePreferences();
  return { favorites, isFavorite, toggle: toggleFavorite };
}

export function useRecents() {
  const { recents, pushRecent, clearRecents } = usePreferences();
  return { recents, push: pushRecent, clear: clearRecents };
}
