import tokens from '../styles/tokens.css?raw';
import {
  ACCENTS,
  DEFAULT_APPEARANCE,
  DENSITIES,
  LEGACY_PALETTE_TO_ACCENT,
  THEME_MODES,
  normalizeAppearance,
  resolveMode,
} from '@/theme/appearance';
import { BOOT_CONFIG, boot, bootScript } from '@/theme/boot';
import { formatSignedINR } from '@/lib/format';

/** Declarations of the first block whose selector line is exactly `selector`. */
function block(selector: string): Record<string, string> {
  const i = tokens.indexOf(selector);
  if (i === -1) throw new Error(`missing block ${selector}`);
  const body = tokens.slice(tokens.indexOf('{', i), tokens.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

describe('appearance preferences', () => {
  it('defaults to System, Blue and Comfortable', () => {
    expect(DEFAULT_APPEARANCE).toEqual({ themeMode: 'system', accentColor: 'blue', density: 'comfortable' });
    expect(normalizeAppearance({})).toEqual(DEFAULT_APPEARANCE);
  });

  it('keeps valid stored values and drops anything else', () => {
    expect(normalizeAppearance({ themeMode: 'dark', accentColor: 'violet', density: 'compact' })).toEqual({
      themeMode: 'dark',
      accentColor: 'violet',
      density: 'compact',
    });
    expect(normalizeAppearance({ themeMode: 'auto', accentColor: 'pink', density: 42 })).toEqual(DEFAULT_APPEARANCE);
  });

  it('migrates every palette from earlier releases to an accent', () => {
    for (const [palette, accent] of Object.entries(LEGACY_PALETTE_TO_ACCENT)) {
      expect(normalizeAppearance({ legacyPalette: palette }).accentColor).toBe(accent);
    }
    expect(normalizeAppearance({ legacyPalette: 'royal' }).accentColor).toBe('indigo');
    expect(normalizeAppearance({ legacyPalette: 'graphite' }).accentColor).toBe('amber');
    // A saved accent wins over a leftover palette.
    expect(normalizeAppearance({ accentColor: 'emerald', legacyPalette: 'royal' }).accentColor).toBe('emerald');
  });

  it('resolves System against the device and leaves explicit choices alone', () => {
    expect(resolveMode('system', true)).toBe('dark');
    expect(resolveMode('system', false)).toBe('light');
    expect(resolveMode('light', true)).toBe('light');
    expect(resolveMode('dark', false)).toBe('dark');
  });

  it('offers exactly three modes, five accents and two densities', () => {
    expect(THEME_MODES.map((m) => m.id)).toEqual(['light', 'dark', 'system']);
    expect(ACCENTS.map((a) => a.id)).toEqual(['blue', 'indigo', 'emerald', 'violet', 'amber']);
    expect(DENSITIES.map((d) => d.id)).toEqual(['comfortable', 'compact']);
  });
});

describe('tokens.css', () => {
  const ACCENT_VARS = [
    '--brand-50',
    '--brand-100',
    '--brand-200',
    '--brand-500',
    '--brand-600',
    '--brand-700',
    '--brand-ink',
    '--hero-from',
    '--hero-to',
    '--series-1',
    '--series-2',
    '--series-3',
    '--series-4',
    '--series-5',
  ];

  it('defines every accent completely, in both modes', () => {
    for (const a of ACCENTS) {
      const light = block(`:root[data-accent='${a.id}'] {`);
      const dark = block(`:root[data-mode='dark'][data-accent='${a.id}'] {`);
      expect(Object.keys(light).sort()).toEqual([...ACCENT_VARS].sort());
      expect(Object.keys(dark).sort()).toEqual([...ACCENT_VARS].sort());
    }
  });

  it('keeps the settings swatches in step with the accent colours', () => {
    for (const a of ACCENTS) {
      expect(block(`:root[data-accent='${a.id}'] {`)['--brand-600']).toBe(a.swatch.light);
      expect(block(`:root[data-mode='dark'][data-accent='${a.id}'] {`)['--brand-600']).toBe(a.swatch.dark);
    }
  });

  it('never lets an accent redefine neutrals or status colours', () => {
    for (const a of ACCENTS) {
      for (const sel of [`:root[data-accent='${a.id}'] {`, `:root[data-mode='dark'][data-accent='${a.id}'] {`]) {
        const vars = Object.keys(block(sel));
        for (const v of ['--bg', '--surface', '--text', '--positive', '--negative', '--warning', '--info']) {
          expect(vars).not.toContain(v);
        }
      }
    }
  });
});

describe('pre-paint boot script', () => {
  type Attrs = Record<string, string>;

  function run(stored: Record<string, unknown>, prefersDark = false, viaString = false): Attrs {
    const attrs: Attrs = {};
    const meta = { content: '', setAttribute: (_: string, v: string) => (meta.content = v) };
    const g = globalThis as unknown as Record<string, unknown>;
    g.document = {
      documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) },
      querySelector: () => meta,
    };
    g.window = {
      localStorage: {
        getItem: (k: string) => (k.startsWith('finora:') && k.slice(7) in stored ? JSON.stringify(stored[k.slice(7)]) : null),
      },
      matchMedia: () => ({ matches: prefersDark }),
    };
    try {
      if (viaString) new Function(bootScript())();
      else boot(BOOT_CONFIG);
    } finally {
      delete g.document;
      delete g.window;
    }
    return { ...attrs, themeColor: meta.content };
  }

  it('applies saved preferences before the app loads', () => {
    expect(run({ mode: 'dark', accent: 'violet', density: 'compact' })).toEqual({
      'data-mode': 'dark',
      'data-accent': 'violet',
      'data-density': 'compact',
      themeColor: '#0f1524',
    });
  });

  it('follows the device when nothing is saved', () => {
    expect(run({}, true)['data-mode']).toBe('dark');
    expect(run({}, false)['data-mode']).toBe('light');
    expect(run({})['data-accent']).toBe('blue');
    expect(run({})['data-density']).toBe('comfortable');
  });

  it('migrates a legacy palette and ignores junk', () => {
    expect(run({ palette: 'royal' })['data-accent']).toBe('indigo');
    expect(run({ mode: 'sepia', accent: 'pink', density: 'huge' })).toMatchObject({
      'data-mode': 'light',
      'data-accent': 'blue',
      'data-density': 'comfortable',
    });
  });

  it('works as the serialised inline script', () => {
    expect(run({ mode: 'light', accent: 'amber' }, true, true)).toMatchObject({
      'data-mode': 'light',
      'data-accent': 'amber',
    });
  });
});

describe('signed amounts', () => {
  it('spells out the direction of a change', () => {
    expect(formatSignedINR(5000)).toBe('+₹5,000');
    expect(formatSignedINR(-5000)).toBe('−₹5,000');
    expect(formatSignedINR(0)).toBe('₹0');
    expect(formatSignedINR(0.2)).toBe('₹0');
    expect(formatSignedINR(-12.5, 2)).toBe('−₹12.50');
  });
});
