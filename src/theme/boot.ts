import {
  ACCENTS,
  DEFAULT_APPEARANCE,
  DENSITIES,
  LEGACY_PALETTE_TO_ACCENT,
  STORAGE_KEYS,
  STORAGE_PREFIX,
  THEME_COLOR,
  THEME_MODES,
} from './appearance';

/**
 * The pre-paint appearance script.
 *
 * Pages are pre-rendered HTML and the app's JavaScript is deferred, so
 * without this a reader who chose Dark would see a white page for a moment
 * before React set the theme. This runs inline in <head>, before anything
 * paints, reads the saved preferences and writes data-mode, data-accent and
 * data-density exactly as `applyAppearance` does later.
 *
 * Vite's `transformIndexHtml` (vite.config.ts) inlines `bootScript()` into
 * index.html, and the pre-renderer copies it into every page. The options,
 * defaults and keys are passed in from appearance.ts, so there is one
 * definition of them — `boot` itself must stay self-contained because it
 * is serialised with Function#toString.
 */

export interface BootConfig {
  prefix: string;
  keys: typeof STORAGE_KEYS;
  modes: string[];
  accents: string[];
  densities: string[];
  defaults: typeof DEFAULT_APPEARANCE;
  legacy: Record<string, string>;
  themeColor: Record<string, string>;
}

export function boot(c: BootConfig): void {
  const root = document.documentElement;
  const read = (key: string): unknown => {
    try {
      const raw = window.localStorage.getItem(c.prefix + key);
      return raw == null ? null : JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };
  let mode = read(c.keys.themeMode) as string;
  if (c.modes.indexOf(mode) < 0) mode = c.defaults.themeMode;
  let accent = read(c.keys.accentColor) as string;
  if (c.accents.indexOf(accent) < 0) {
    const legacy = read(c.keys.legacyPalette) as string;
    accent = (typeof legacy === 'string' && c.legacy[legacy]) || c.defaults.accentColor;
  }
  let density = read(c.keys.density) as string;
  if (c.densities.indexOf(density) < 0) density = c.defaults.density;
  const dark =
    mode === 'dark' ||
    (mode === 'system' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolved = dark ? 'dark' : 'light';
  root.setAttribute('data-mode', resolved);
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-density', density);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', c.themeColor[resolved]);
}

export const BOOT_CONFIG: BootConfig = {
  prefix: STORAGE_PREFIX,
  keys: STORAGE_KEYS,
  modes: THEME_MODES.map((m) => m.id),
  accents: ACCENTS.map((a) => a.id),
  densities: DENSITIES.map((d) => d.id),
  defaults: DEFAULT_APPEARANCE,
  legacy: LEGACY_PALETTE_TO_ACCENT,
  themeColor: THEME_COLOR,
};

/** The inline script: `boot` applied to the shared configuration. */
export function bootScript(): string {
  return `(${boot.toString()})(${JSON.stringify(BOOT_CONFIG)});`;
}
