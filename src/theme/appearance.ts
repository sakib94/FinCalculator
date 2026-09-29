/**
 * Appearance: three independent preferences, one small data model.
 *
 *   themeMode    light | dark | system    — system follows the device
 *   accentColor  blue | indigo | emerald | violet | amber
 *   density      comfortable | compact
 *
 * Each is written to <html> as an attribute (data-mode, data-accent,
 * data-density) and tokens.css does the rest. This module is framework-free
 * so the React hook, the pre-paint boot script (boot.ts) and the tests all
 * share one definition of the options, the defaults and the storage keys.
 *
 * Storage goes through an `AppearanceStore`. Today that is localStorage;
 * after sign-in it can be `user.preferences` — swap the store, nothing
 * else changes.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';
export type AccentColor = 'blue' | 'indigo' | 'emerald' | 'violet' | 'amber';
export type Density = 'comfortable' | 'compact';

export interface AppearancePreferences {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  density: Density;
}

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  themeMode: 'system',
  accentColor: 'blue',
  density: 'comfortable',
};

export interface ModeOption {
  id: ThemeMode;
  label: string;
  icon: 'sun' | 'moon' | 'monitor';
}

export const THEME_MODES: ModeOption[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'monitor' },
];

export interface AccentOption {
  id: AccentColor;
  label: string;
  /** Swatch colour per mode — the accent's --brand-600 in tokens.css. */
  swatch: Record<ResolvedMode, string>;
}

export const ACCENTS: AccentOption[] = [
  { id: 'blue', label: 'Blue', swatch: { light: '#2450c4', dark: '#82a0ff' } },
  { id: 'indigo', label: 'Indigo', swatch: { light: '#4338ca', dark: '#9ba3ff' } },
  { id: 'emerald', label: 'Emerald', swatch: { light: '#047857', dark: '#3dd49a' } },
  { id: 'violet', label: 'Violet', swatch: { light: '#6d28d9', dark: '#b39afb' } },
  { id: 'amber', label: 'Amber', swatch: { light: '#b04f08', dark: '#f5b547' } },
];

export interface DensityOption {
  id: Density;
  label: string;
  hint: string;
}

export const DENSITIES: DensityOption[] = [
  { id: 'comfortable', label: 'Comfortable', hint: 'More breathing room' },
  { id: 'compact', label: 'Compact', hint: 'More on screen' },
];

/** Browser chrome colour (<meta name="theme-color">) — the header surface. */
export const THEME_COLOR: Record<ResolvedMode, string> = { light: '#ffffff', dark: '#0f1524' };

/**
 * localStorage keys (under the app's "finora:" prefix, kept from earlier
 * releases so saved settings survive). `palette` is only read, to migrate.
 */
export const STORAGE_PREFIX = 'finora:';
export const STORAGE_KEYS = {
  themeMode: 'mode',
  accentColor: 'accent',
  density: 'density',
  legacyPalette: 'palette',
} as const;

/**
 * Earlier releases offered five complete palettes. Each maps to the accent
 * nearest its hue; the neutrals, status colours and charts they used to
 * redefine are now shared (see tokens.css).
 */
export const LEGACY_PALETTE_TO_ACCENT: Record<string, AccentColor> = {
  premium: 'blue',
  ocean: 'blue',
  emerald: 'emerald',
  royal: 'indigo',
  graphite: 'amber',
  // names from before the palettes were renamed
  meridian: 'blue',
  harbor: 'blue',
  evergreen: 'emerald',
  iris: 'indigo',
  ember: 'amber',
};

export const isThemeMode = (v: unknown): v is ThemeMode => THEME_MODES.some((m) => m.id === v);
export const isAccent = (v: unknown): v is AccentColor => ACCENTS.some((a) => a.id === v);
export const isDensity = (v: unknown): v is Density => DENSITIES.some((d) => d.id === v);

/** Stored values may be anything (older builds, hand edits): keep what is valid. */
export function normalizeAppearance(
  raw: Partial<Record<keyof AppearancePreferences, unknown>> & { legacyPalette?: unknown },
): AppearancePreferences {
  const accentColor = isAccent(raw.accentColor)
    ? raw.accentColor
    : typeof raw.legacyPalette === 'string' && LEGACY_PALETTE_TO_ACCENT[raw.legacyPalette]
      ? LEGACY_PALETTE_TO_ACCENT[raw.legacyPalette]
      : DEFAULT_APPEARANCE.accentColor;
  return {
    themeMode: isThemeMode(raw.themeMode) ? raw.themeMode : DEFAULT_APPEARANCE.themeMode,
    accentColor,
    density: isDensity(raw.density) ? raw.density : DEFAULT_APPEARANCE.density,
  };
}

export function resolveMode(mode: ThemeMode, systemPrefersDark: boolean): ResolvedMode {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return mode;
}

/* ------------------------------------------------------------------ */
/* Storage                                                              */
/* ------------------------------------------------------------------ */

export interface AppearanceStore {
  load(): AppearancePreferences;
  save(prefs: AppearancePreferences): void;
}

function readKey(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw == null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeKey(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the choice still applies for this visit */
  }
}

/** This browser only. Private windows and blocked storage degrade to defaults. */
export const localAppearanceStore: AppearanceStore = {
  load() {
    if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
    return normalizeAppearance({
      themeMode: readKey(STORAGE_KEYS.themeMode),
      accentColor: readKey(STORAGE_KEYS.accentColor),
      density: readKey(STORAGE_KEYS.density),
      legacyPalette: readKey(STORAGE_KEYS.legacyPalette),
    });
  },
  save(prefs) {
    writeKey(STORAGE_KEYS.themeMode, prefs.themeMode);
    writeKey(STORAGE_KEYS.accentColor, prefs.accentColor);
    writeKey(STORAGE_KEYS.density, prefs.density);
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + STORAGE_KEYS.legacyPalette);
    } catch {
      /* no-op */
    }
  },
};

/* ------------------------------------------------------------------ */
/* Applying to the document                                             */
/* ------------------------------------------------------------------ */

/**
 * Writes the three attributes and the browser chrome colour. Mirrors
 * boot.ts, which does the same before the app's JavaScript has loaded.
 */
export function applyAppearance(root: HTMLElement, prefs: AppearancePreferences, mode: ResolvedMode): void {
  root.setAttribute('data-mode', mode);
  root.setAttribute('data-accent', prefs.accentColor);
  root.setAttribute('data-density', prefs.density);
  const meta = root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[mode];
}

/**
 * Cross-fades colours when the mode changes. The class switches on a short
 * colour-only transition for every element, then removes itself, so normal
 * interaction speeds are untouched. Skipped under reduced motion.
 */
export function withThemeTransition(root: HTMLElement, apply: () => void): void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    apply();
    return;
  }
  root.classList.add('theme-transition');
  apply();
  window.setTimeout(() => root.classList.remove('theme-transition'), 260);
}
