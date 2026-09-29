import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ACCENTS,
  DEFAULT_APPEARANCE,
  applyAppearance,
  localAppearanceStore,
  resolveMode,
  withThemeTransition,
  type AccentColor,
  type AppearancePreferences,
  type AppearanceStore,
  type Density,
  type ResolvedMode,
  type ThemeMode,
} from './appearance';

const prefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export interface AppearanceState extends AppearancePreferences {
  /** What the page is actually showing: System resolved against the device. */
  resolvedMode: ResolvedMode;
  setThemeMode: (m: ThemeMode) => void;
  setAccentColor: (a: AccentColor) => void;
  setDensity: (d: Density) => void;
  resetAppearance: () => void;
  /** Keyboard shortcuts. */
  cycleAccent: () => void;
  toggleDarkMode: () => void;
}

/**
 * Owned once by PreferencesProvider and read everywhere else through
 * `useAppearance()`, so the header menu, the settings page and the keyboard
 * shortcuts always show the same state.
 *
 * Every change applies at once — attributes on <html>, no reload — and is
 * saved through the store. The boot script has already applied the saved
 * values before first paint, so the first run here changes nothing visible.
 */
export function useAppearanceState(store: AppearanceStore = localAppearanceStore): AppearanceState {
  const [prefs, setPrefs] = useState<AppearancePreferences>(() => store.load());

  // What "system" currently resolves to. Tracked so switching the device
  // between light and dark repaints the app while it is open.
  const [systemDark, setSystemDark] = useState(prefersDark);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedMode = resolveMode(prefs.themeMode, systemDark);

  const firstRun = useRef(true);
  const lastMode = useRef(resolvedMode);
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => applyAppearance(root, prefs, resolvedMode);
    // Cross-fade only when light/dark actually flips — not on load, and not
    // for an accent or density change, which should feel immediate.
    if (!firstRun.current && lastMode.current !== resolvedMode) withThemeTransition(root, apply);
    else apply();
    firstRun.current = false;
    lastMode.current = resolvedMode;
    store.save(prefs);
  }, [prefs, resolvedMode, store]);

  const setThemeMode = useCallback((themeMode: ThemeMode) => setPrefs((p) => ({ ...p, themeMode })), []);
  const setAccentColor = useCallback((accentColor: AccentColor) => setPrefs((p) => ({ ...p, accentColor })), []);
  const setDensity = useCallback((density: Density) => setPrefs((p) => ({ ...p, density })), []);
  const resetAppearance = useCallback(() => setPrefs(DEFAULT_APPEARANCE), []);

  const cycleAccent = useCallback(() => {
    setPrefs((p) => {
      const i = ACCENTS.findIndex((a) => a.id === p.accentColor);
      return { ...p, accentColor: ACCENTS[(i + 1) % ACCENTS.length].id };
    });
  }, []);

  // From System, the shortcut picks the opposite of what is showing.
  const toggleDarkMode = useCallback(() => {
    setPrefs((p) => ({ ...p, themeMode: resolveMode(p.themeMode, prefersDark()) === 'dark' ? 'light' : 'dark' }));
  }, []);

  return useMemo(
    () => ({
      ...prefs,
      resolvedMode,
      setThemeMode,
      setAccentColor,
      setDensity,
      resetAppearance,
      cycleAccent,
      toggleDarkMode,
    }),
    [prefs, resolvedMode, setThemeMode, setAccentColor, setDensity, resetAppearance, cycleAccent, toggleDarkMode],
  );
}
