import { useCallback, useEffect, useState } from 'react';
import { readLocal, writeLocal } from '@/lib/storage';
import { DEFAULT_LANG, isLang, type Lang } from '@/i18n';

/**
 * Appearance is two independent choices, not one list:
 *
 *   palette — which hue family (Premium, Ocean, Emerald, Royal, Graphite)
 *   mode    — light or dark surface, or follow the device
 *
 * Keeping them separate means five palettes cost five pairs of CSS blocks
 * rather than fifteen list entries, and picking a colour never silently
 * changes whether the screen is light or dark.
 *
 * "system" is resolved to a concrete mode here and written to the DOM as
 * data-mode, so tokens.css needs no prefers-color-scheme duplication.
 */

export type PaletteId = 'premium' | 'ocean' | 'emerald' | 'royal' | 'graphite';
export type Mode = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';

export interface Palette {
  id: PaletteId;
  label: string;
  /** One line on what the palette is for — shown under the name. */
  hint: string;
  /** Swatch colours: [surface, brand, accent] in light mode. */
  swatch: [string, string, string];
  /** Chrome colour for the browser UI, per mode. */
  themeColor: Record<ResolvedMode, string>;
}

export const PALETTES: Palette[] = [
  {
    id: 'premium',
    label: 'Premium',
    hint: 'Ink & sapphire',
    swatch: ['#f4f6fa', '#2450c4', '#0c1631'],
    themeColor: { light: '#ffffff', dark: '#0f1524' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    hint: 'Deep sea & cyan',
    swatch: ['#f2f7f9', '#086a84', '#07232e'],
    themeColor: { light: '#ffffff', dark: '#0c1c23' },
  },
  {
    id: 'emerald',
    label: 'Emerald',
    hint: 'Forest & gold',
    swatch: ['#f4f7f5', '#0d6a4a', '#a6771a'],
    themeColor: { light: '#ffffff', dark: '#0d1c17' },
  },
  {
    id: 'royal',
    label: 'Royal',
    hint: 'Indigo & violet',
    swatch: ['#f6f5fb', '#4a3fbf', '#17123f'],
    themeColor: { light: '#ffffff', dark: '#131128' },
  },
  {
    id: 'graphite',
    label: 'Graphite',
    hint: 'Charcoal & amber',
    swatch: ['#f7f6f4', '#964e07', '#1c1917'],
    themeColor: { light: '#ffffff', dark: '#1a1816' },
  },
];

export const DEFAULT_PALETTE: PaletteId = 'premium';

/** Palettes from earlier releases, mapped to their closest successor. */
const RENAMED: Record<string, PaletteId> = {
  harbor: 'ocean',
  meridian: 'premium',
  evergreen: 'emerald',
  iris: 'royal',
  ember: 'graphite',
};

export interface ModeOption {
  id: Mode;
  label: string;
  icon: 'sun' | 'moon' | 'monitor';
}

export const MODES: ModeOption[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'Auto', icon: 'monitor' },
];

const isPalette = (v: unknown): v is PaletteId => PALETTES.some((p) => p.id === v);
const isMode = (v: unknown): v is Mode => MODES.some((m) => m.id === v);

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/**
 * Owned by PreferencesProvider and read everywhere else through `useTheme`
 * in PreferencesContext — two independent copies of this hook would drift
 * apart the moment either one changed the theme.
 */
export function useThemeState() {
  const [palette, setPalette] = useState<PaletteId>(() => {
    const stored = readLocal<string>('palette', DEFAULT_PALETTE);
    // A palette chosen in an older build carries over to its successor;
    // anything unrecognised falls back to the default.
    if (isPalette(stored)) return stored;
    return RENAMED[stored] ?? DEFAULT_PALETTE;
  });

  const [mode, setMode] = useState<Mode>(() => {
    const stored = readLocal<Mode>('mode', 'system');
    return isMode(stored) ? stored : 'system';
  });

  // What "system" currently resolves to. Tracked so the OS switching
  // between light and dark repaints the app without a reload.
  const [systemMode, setSystemMode] = useState<ResolvedMode>(() =>
    prefersDark() ? 'dark' : 'light',
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemMode(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedMode: ResolvedMode = mode === 'system' ? systemMode : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', palette);
    root.setAttribute('data-mode', resolvedMode);
    writeLocal('palette', palette);
    writeLocal('mode', mode);

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const p = PALETTES.find((x) => x.id === palette) ?? PALETTES[0];
    if (meta) meta.content = p.themeColor[resolvedMode];
  }, [palette, mode, resolvedMode]);

  /** Keyboard shortcut: step through the palettes, keeping the mode. */
  const cyclePalette = useCallback(() => {
    setPalette((current) => {
      const i = PALETTES.findIndex((p) => p.id === current);
      return PALETTES[(i + 1) % PALETTES.length].id;
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  const paletteOption = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];

  return {
    palette,
    paletteOption,
    setPalette,
    mode,
    resolvedMode,
    setMode,
    cyclePalette,
    toggleMode,
  };
}

/**
 * Language is stored alongside the theme and mirrored onto <html lang>,
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
