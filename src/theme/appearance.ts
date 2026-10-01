/**
 * Appearance: three independent preferences, one small data model.
 *
 *   themeMode   light | dark | system   — shown as Light · Dark · Auto
 *   theme       heritage | parchment | bordeaux | verdigris | graphite
 *               | aubergine | classic   — a named pair of tones
 *   density     comfortable | compact
 *
 * Each is written to <html> as an attribute (data-mode, data-theme,
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
export type ThemeId = 'heritage' | 'parchment' | 'bordeaux' | 'verdigris' | 'graphite' | 'aubergine' | 'classic';
export type Density = 'comfortable' | 'compact';

export interface AppearancePreferences {
  themeMode: ThemeMode;
  theme: ThemeId;
  density: Density;
}

/** Classic is the original FinCalc look, so nobody's page changes unasked. */
export const DEFAULT_APPEARANCE: AppearancePreferences = {
  themeMode: 'system',
  theme: 'classic',
  density: 'comfortable',
};

export interface ModeOption {
  id: ThemeMode;
  label: string;
  icon: 'sun' | 'moon' | 'contrast';
}

/** "Auto" is the label; the stored value stays `system` for saved settings. */
export const THEME_MODES: ModeOption[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'Auto', icon: 'contrast' },
];

/** The colours a theme card draws its miniature with. */
export interface ThemePreview {
  /** Page ground (--bg). */
  ground: string;
  /** Card surface (--surface) — also the browser chrome colour. */
  card: string;
  /** Header bar: the accent in light mode, the result-card ink in dark. */
  bar: string;
  /** The muted line on the card (--border-strong). */
  line: string;
  /** The second tone (--signature). */
  dot: string;
}

export interface ThemeOption {
  id: ThemeId;
  label: string;
  /** The two tones, in words — shown under the name. */
  hint: string;
  preview: Record<ResolvedMode, ThemePreview>;
}

/**
 * The themes, in the order the Appearance cards show them. The preview
 * colours are copies of tokens.css values; src/tests/appearance.test.ts
 * fails if the two ever disagree.
 */
export const THEMES: ThemeOption[] = [
  {
    id: 'heritage',
    label: 'Heritage',
    hint: 'Navy & brass',
    preview: {
      light: { ground: '#f4f3ee', card: '#ffffff', bar: '#1f3b70', line: '#bab5a6', dot: '#a8822f' },
      dark: { ground: '#080d19', card: '#0f1628', bar: '#22396b', line: '#384563', dot: '#d9b36a' },
    },
  },
  {
    id: 'parchment',
    label: 'Parchment',
    hint: 'Sepia & sienna',
    preview: {
      light: { ground: '#f5efe3', card: '#fffdf8', bar: '#96461a', line: '#bfae8f', dot: '#a07a3c' },
      dark: { ground: '#110c07', card: '#1b140d', bar: '#5c3015', line: '#554330', dot: '#d8b26e' },
    },
  },
  {
    id: 'bordeaux',
    label: 'Bordeaux',
    hint: 'Wine & rosewood',
    preview: {
      light: { ground: '#f7f1f1', card: '#ffffff', bar: '#7c1f3b', line: '#c4aeb2', dot: '#a8695a' },
      dark: { ground: '#11080b', card: '#1b0f14', bar: '#5e1a2f', line: '#58363f', dot: '#d9a090' },
    },
  },
  {
    id: 'verdigris',
    label: 'Verdigris',
    hint: 'Patina & copper',
    preview: {
      light: { ground: '#f0f5f4', card: '#ffffff', bar: '#1b6862', line: '#b0c1bc', dot: '#b06a3b' },
      dark: { ground: '#070f0e', card: '#0e1918', bar: '#0f5a50', line: '#35504c', dot: '#e09a6a' },
    },
  },
  {
    id: 'graphite',
    label: 'Graphite',
    hint: 'Charcoal & gold',
    preview: {
      light: { ground: '#f3f3f2', card: '#ffffff', bar: '#2f3237', line: '#b9b9b4', dot: '#b8901f' },
      dark: { ground: '#0a0a0b', card: '#141416', bar: '#3a3a40', line: '#48484f', dot: '#e2c06a' },
    },
  },
  {
    id: 'aubergine',
    label: 'Aubergine',
    hint: 'Plum & antique rose',
    preview: {
      light: { ground: '#f6f2f5', card: '#ffffff', bar: '#5c2b60', line: '#c1b2be', dot: '#b77880' },
      dark: { ground: '#0e0a0f', card: '#19111a', bar: '#50254f', line: '#553e56', dot: '#e0a8ae' },
    },
  },
  {
    id: 'classic',
    label: 'Classic',
    hint: 'Sapphire blue (the original)',
    preview: {
      light: { ground: '#f4f6fa', card: '#ffffff', bar: '#2450c4', line: '#b9c2d3', dot: '#c8952c' },
      dark: { ground: '#080c16', card: '#0f1524', bar: '#22408f', line: '#37435f', dot: '#e2b457' },
    },
  },
];

export const themeById = (id: ThemeId): ThemeOption => THEMES.find((t) => t.id === id) ?? THEMES[THEMES.length - 1];

export interface DensityOption {
  id: Density;
  label: string;
  hint: string;
}

export const DENSITIES: DensityOption[] = [
  { id: 'comfortable', label: 'Comfortable', hint: 'More breathing room' },
  { id: 'compact', label: 'Compact', hint: 'More on screen' },
];

/** Browser chrome colour (<meta name="theme-color">): the theme's surface. */
export const THEME_COLOR: Record<ThemeId, Record<ResolvedMode, string>> = Object.fromEntries(
  THEMES.map((t) => [t.id, { light: t.preview.light.card, dark: t.preview.dark.card }]),
) as Record<ThemeId, Record<ResolvedMode, string>>;

/**
 * localStorage keys (under the app's "finora:" prefix, kept from earlier
 * releases so saved settings survive). `accent` and `palette` are only
 * read, to migrate.
 */
export const STORAGE_PREFIX = 'finora:';
export const STORAGE_KEYS = {
  themeMode: 'mode',
  theme: 'theme',
  density: 'density',
  legacyAccent: 'accent',
  legacyPalette: 'palette',
} as const;

/**
 * Earlier releases saved an accent colour, and before that a palette. Each
 * maps to the theme nearest its hue, so a returning reader keeps roughly
 * the colour they picked.
 */
export const LEGACY_TO_THEME: Record<string, ThemeId> = {
  // accents (the release before themes)
  blue: 'classic',
  indigo: 'heritage',
  emerald: 'verdigris',
  violet: 'aubergine',
  amber: 'parchment',
  // palettes
  premium: 'classic',
  ocean: 'verdigris',
  royal: 'aubergine',
  graphite: 'graphite',
  // palette names from before they were renamed
  meridian: 'classic',
  harbor: 'verdigris',
  evergreen: 'verdigris',
  iris: 'aubergine',
  ember: 'parchment',
};

export const isThemeMode = (v: unknown): v is ThemeMode => THEME_MODES.some((m) => m.id === v);
export const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);
export const isDensity = (v: unknown): v is Density => DENSITIES.some((d) => d.id === v);

const fromLegacy = (v: unknown): ThemeId | undefined =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_TO_THEME, v) ? LEGACY_TO_THEME[v] : undefined;

/** Stored values may be anything (older builds, hand edits): keep what is valid. */
export function normalizeAppearance(
  raw: Partial<Record<keyof AppearancePreferences, unknown>> & { legacyAccent?: unknown; legacyPalette?: unknown },
): AppearancePreferences {
  const theme = isTheme(raw.theme)
    ? raw.theme
    : fromLegacy(raw.legacyAccent) ?? fromLegacy(raw.legacyPalette) ?? DEFAULT_APPEARANCE.theme;
  return {
    themeMode: isThemeMode(raw.themeMode) ? raw.themeMode : DEFAULT_APPEARANCE.themeMode,
    theme,
    density: isDensity(raw.density) ? raw.density : DEFAULT_APPEARANCE.density,
  };
}

export function resolveMode(mode: ThemeMode, systemPrefersDark: boolean): ResolvedMode {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return mode;
}

/** "Heritage · Auto, light now" — the summary beside the Appearance heading. */
export function describeAppearance(
  prefs: Pick<AppearancePreferences, 'theme' | 'themeMode'>,
  resolved: ResolvedMode,
  t: (en: string) => string = (s) => s,
): string {
  const name = t(themeById(prefs.theme).label);
  if (prefs.themeMode === 'system') return `${name} · ${t(resolved === 'dark' ? 'Auto, dark now' : 'Auto, light now')}`;
  return `${name} · ${t(prefs.themeMode === 'dark' ? 'Dark' : 'Light')}`;
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
      theme: readKey(STORAGE_KEYS.theme),
      density: readKey(STORAGE_KEYS.density),
      legacyAccent: readKey(STORAGE_KEYS.legacyAccent),
      legacyPalette: readKey(STORAGE_KEYS.legacyPalette),
    });
  },
  save(prefs) {
    writeKey(STORAGE_KEYS.themeMode, prefs.themeMode);
    writeKey(STORAGE_KEYS.theme, prefs.theme);
    writeKey(STORAGE_KEYS.density, prefs.density);
    for (const legacy of [STORAGE_KEYS.legacyAccent, STORAGE_KEYS.legacyPalette]) {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + legacy);
      } catch {
        /* no-op */
      }
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
  root.setAttribute('data-theme', prefs.theme);
  root.setAttribute('data-density', prefs.density);
  const meta = root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[prefs.theme][mode];
}

/**
 * Cross-fades colours when the mode or theme changes. The class switches
 * on a short colour-only transition for every element, then removes
 * itself, so normal interaction speeds are untouched. Skipped under
 * reduced motion.
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
