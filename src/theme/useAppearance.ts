import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_APPEARANCE,
  THEMES,
  applyAppearance,
  localAppearanceStore,
  resolveMode,
  withThemeTransition,
  type AppearancePreferences,
  type AppearanceStore,
  type Density,
  type ResolvedMode,
  type ThemeId,
  type ThemeMode,
} from './appearance';

const prefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export interface AppearanceState extends AppearancePreferences {
  /** What the page is actually showing: Auto resolved against the device. */
  resolvedMode: ResolvedMode;
  setThemeMode: (m: ThemeMode) => void;
  setTheme: (t: ThemeId) => void;
  setDensity: (d: Density) => void;
  resetAppearance: () => void;
  /** Keyboard shortcuts. */
  cycleTheme: () => void;
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
  const lastLook = useRef(`${resolvedMode}/${prefs.theme}`);
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => applyAppearance(root, prefs, resolvedMode);
    // Cross-fade only when the colours actually change — light/dark or the
    // theme — not on load, and not for density, which should feel immediate.
    const look = `${resolvedMode}/${prefs.theme}`;
    if (!firstRun.current && lastLook.current !== look) withThemeTransition(root, apply);
    else apply();
    firstRun.current = false;
    lastLook.current = look;
    store.save(prefs);
  }, [prefs, resolvedMode, store]);

  const setThemeMode = useCallback((themeMode: ThemeMode) => setPrefs((p) => ({ ...p, themeMode })), []);
  const setTheme = useCallback((theme: ThemeId) => setPrefs((p) => ({ ...p, theme })), []);
  const setDensity = useCallback((density: Density) => setPrefs((p) => ({ ...p, density })), []);
  const resetAppearance = useCallback(() => setPrefs(DEFAULT_APPEARANCE), []);

  const cycleTheme = useCallback(() => {
    setPrefs((p) => {
      const i = THEMES.findIndex((t) => t.id === p.theme);
      return { ...p, theme: THEMES[(i + 1) % THEMES.length].id };
    });
  }, []);

  // From Auto, the shortcut picks the opposite of what is showing.
  const toggleDarkMode = useCallback(() => {
    setPrefs((p) => ({ ...p, themeMode: resolveMode(p.themeMode, prefersDark()) === 'dark' ? 'light' : 'dark' }));
  }, []);

  return useMemo(
    () => ({
      ...prefs,
      resolvedMode,
      setThemeMode,
      setTheme,
      setDensity,
      resetAppearance,
      cycleTheme,
      toggleDarkMode,
    }),
    [prefs, resolvedMode, setThemeMode, setTheme, setDensity, resetAppearance, cycleTheme, toggleDarkMode],
  );
}
