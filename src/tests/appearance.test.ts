import tokens from '../styles/tokens.css?raw';
import {
  DEFAULT_APPEARANCE,
  DENSITIES,
  LEGACY_TO_THEME,
  THEME_COLOR,
  THEME_MODES,
  THEMES,
  describeAppearance,
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

const lightBlock = (id: string) => block(`:root[data-theme='${id}'] {`);
const darkBlock = (id: string) => block(`:root[data-mode='dark'][data-theme='${id}'] {`);

describe('appearance preferences', () => {
  it('defaults to Auto, Classic and Comfortable — the original look', () => {
    expect(DEFAULT_APPEARANCE).toEqual({ themeMode: 'system', theme: 'classic', density: 'comfortable' });
    expect(normalizeAppearance({})).toEqual(DEFAULT_APPEARANCE);
  });

  it('keeps valid stored values and drops anything else', () => {
    expect(normalizeAppearance({ themeMode: 'dark', theme: 'bordeaux', density: 'compact' })).toEqual({
      themeMode: 'dark',
      theme: 'bordeaux',
      density: 'compact',
    });
    expect(normalizeAppearance({ themeMode: 'auto', theme: 'pink', density: 42 })).toEqual(DEFAULT_APPEARANCE);
  });

  it('migrates saved accents and palettes from earlier releases to a theme', () => {
    for (const [old, theme] of Object.entries(LEGACY_TO_THEME)) {
      expect(normalizeAppearance({ legacyAccent: old }).theme).toBe(theme);
      expect(normalizeAppearance({ legacyPalette: old }).theme).toBe(theme);
    }
    expect(normalizeAppearance({ legacyAccent: 'blue' }).theme).toBe('classic');
    expect(normalizeAppearance({ legacyAccent: 'amber' }).theme).toBe('parchment');
    // A saved theme wins over leftovers, and the newer accent wins over a palette.
    expect(normalizeAppearance({ theme: 'graphite', legacyAccent: 'violet' }).theme).toBe('graphite');
    expect(normalizeAppearance({ legacyAccent: 'emerald', legacyPalette: 'royal' }).theme).toBe('verdigris');
    // Inherited object keys are not themes.
    expect(normalizeAppearance({ legacyAccent: 'toString' }).theme).toBe('classic');
  });

  it('resolves Auto against the device and leaves explicit choices alone', () => {
    expect(resolveMode('system', true)).toBe('dark');
    expect(resolveMode('system', false)).toBe('light');
    expect(resolveMode('light', true)).toBe('light');
    expect(resolveMode('dark', false)).toBe('dark');
  });

  it('offers Light · Dark · Auto, seven themes and two densities', () => {
    expect(THEME_MODES.map((m) => m.label)).toEqual(['Light', 'Dark', 'Auto']);
    expect(THEME_MODES.map((m) => m.id)).toEqual(['light', 'dark', 'system']);
    expect(THEMES.map((t) => t.id)).toEqual([
      'heritage',
      'parchment',
      'bordeaux',
      'verdigris',
      'graphite',
      'aubergine',
      'classic',
    ]);
    expect(DENSITIES.map((d) => d.id)).toEqual(['comfortable', 'compact']);
  });

  it('summarises the choice the way the Appearance heading shows it', () => {
    expect(describeAppearance({ theme: 'heritage', themeMode: 'system' }, 'light')).toBe('Heritage · Auto, light now');
    expect(describeAppearance({ theme: 'graphite', themeMode: 'system' }, 'dark')).toBe('Graphite · Auto, dark now');
    expect(describeAppearance({ theme: 'parchment', themeMode: 'dark' }, 'dark')).toBe('Parchment · Dark');
  });
});

describe('tokens.css', () => {
  const THEME_VARS = [
    '--bg',
    '--bg-subtle',
    '--surface',
    '--surface-2',
    '--surface-3',
    '--border',
    '--border-strong',
    '--brand-50',
    '--brand-100',
    '--brand-200',
    '--brand-500',
    '--brand-600',
    '--brand-700',
    '--brand-ink',
    '--signature',
    '--hero-from',
    '--hero-to',
    '--series-1',
    '--series-2',
    '--series-3',
    '--series-4',
    '--series-5',
  ];

  it('defines every theme completely and identically in both modes', () => {
    // The same variables in light and dark, so a light block can never leak into dark.
    for (const th of THEMES) {
      expect(Object.keys(lightBlock(th.id)).sort()).toEqual([...THEME_VARS].sort());
      expect(Object.keys(darkBlock(th.id)).sort()).toEqual([...THEME_VARS].sort());
    }
  });

  it('draws every theme card with the colours the theme really uses', () => {
    for (const th of THEMES) {
      for (const [mode, vars] of [
        ['light', lightBlock(th.id)],
        ['dark', darkBlock(th.id)],
      ] as const) {
        expect({ theme: th.id, mode, ...th.preview[mode] }).toEqual({
          theme: th.id,
          mode,
          ground: vars['--bg'],
          card: vars['--surface'],
          bar: mode === 'light' ? vars['--brand-600'] : vars['--hero-to'],
          line: vars['--border-strong'],
          dot: vars['--signature'],
        });
        expect(THEME_COLOR[th.id][mode]).toBe(vars['--surface']);
      }
    }
  });

  it('never lets a theme redefine text or status colours', () => {
    for (const th of THEMES) {
      for (const vars of [lightBlock(th.id), darkBlock(th.id)]) {
        for (const v of ['--text', '--text-2', '--text-3', '--positive', '--negative', '--warning', '--info']) {
          expect(Object.keys(vars)).not.toContain(v);
        }
      }
    }
  });

  it('keeps Classic exactly the original PaiseWise blue, and the fallback', () => {
    expect(lightBlock('classic')['--brand-600']).toBe('#2450c4');
    expect(darkBlock('classic')['--brand-600']).toBe('#82a0ff');
    // Before the boot script runs there is no data-theme: Classic applies.
    expect(tokens).toMatch(/:root,\r?\n:root\[data-theme='classic'\] \{/);
    expect(tokens).toMatch(/:root\[data-mode='dark'\]:not\(\[data-theme\]\),\r?\n:root\[data-mode='dark'\]\[data-theme='classic'\] \{/);
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
    expect(run({ mode: 'dark', theme: 'aubergine', density: 'compact' })).toEqual({
      'data-mode': 'dark',
      'data-theme': 'aubergine',
      'data-density': 'compact',
      themeColor: '#19111a',
    });
  });

  it('follows the device when nothing is saved', () => {
    expect(run({}, true)['data-mode']).toBe('dark');
    expect(run({}, false)['data-mode']).toBe('light');
    expect(run({})['data-theme']).toBe('classic');
    expect(run({})['data-density']).toBe('comfortable');
  });

  it('migrates a saved accent or palette and ignores junk', () => {
    expect(run({ accent: 'amber' })['data-theme']).toBe('parchment');
    expect(run({ palette: 'royal' })['data-theme']).toBe('aubergine');
    expect(run({ accent: 'toString' })['data-theme']).toBe('classic');
    expect(run({ mode: 'sepia', theme: 'pink', density: 'huge' })).toMatchObject({
      'data-mode': 'light',
      'data-theme': 'classic',
      'data-density': 'comfortable',
    });
  });

  it('works as the serialised inline script', () => {
    expect(run({ mode: 'light', theme: 'verdigris' }, true, true)).toMatchObject({
      'data-mode': 'light',
      'data-theme': 'verdigris',
      themeColor: '#ffffff',
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
