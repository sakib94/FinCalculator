/**
 * Parses tokens.css and checks WCAG contrast for the pairs that carry
 * meaning on screen, for every mode × theme combination (2 × 7).
 * Run with: node scripts/check-contrast.mjs src/styles/tokens.css
 *
 * Mode blocks hold text and status colours; theme blocks hold the grounds,
 * the accent scale, the second tone, the result-card tint and the chart
 * palette. Each combination is the mode's primitives overlaid with the
 * theme's.
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(process.argv[2], 'utf8');

/** Merges every block whose selector list contains `selector` exactly. */
function block(selector) {
  const out = {};
  let from = 0;
  let found = false;
  for (;;) {
    const i = css.indexOf(selector, from);
    if (i === -1) break;
    found = true;
    const open = css.indexOf('{', i);
    const close = css.indexOf('}', open);
    for (const m of css.slice(open, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
    from = close;
  }
  if (!found) throw new Error('missing block: ' + selector);
  return out;
}

const hexToRgb = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** color-mix(in srgb, a p%, b) */
const mix = (a, pct, b) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => (pct / 100) * v + (1 - pct / 100) * y[i]));
};

const lum = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const THEMES = ['heritage', 'parchment', 'bordeaux', 'verdigris', 'graphite', 'aubergine', 'classic'];

// Soft status grounds, as tokens.css mixes them: [token, primitive, % light, % dark].
const SOFT = [
  ['success-soft', '--positive', 10, 12],
  ['danger-soft', '--negative', 9, 12],
  ['warning-soft', '--warning', 12, 12],
  ['info-soft', '--info', 8, 11],
];

// [label, foreground, background, minimum ratio]. Foreground/background
// are a token, a literal hex, "white@0.88" (white at 88% over the
// background) or a computed name from `derived` below.
// 4.5 is WCAG AA for body text; lower thresholds are for non-text roles.
const CHECKS = [
  ['body text on surface', '--text', '--surface', 4.5],
  ['body text on page bg', '--text', '--bg', 4.5],
  ['secondary text on surface', '--text-2', '--surface', 4.5],
  ['secondary text on surface-3', '--text-2', '--surface-3', 4.5],
  ['muted text on surface', '--text-3', '--surface', 4.5],
  ['muted text on page bg', '--text-3', '--bg', 4.5],
  ['muted text on surface-3', '--text-3', '--surface-3', 4.5],
  ['accent link on surface', '--brand-600', '--surface', 4.5],
  ['accent link on page bg', '--brand-600', '--bg', 4.5],
  ['accent text on accent-soft', '--brand-700', '--brand-50', 4.5],
  ['body text on accent-soft', '--text', '--brand-50', 4.5],
  ['button label on accent', '--brand-ink', '--brand-600', 4.5],
  ['button label on hover', '--brand-ink', '--brand-700', 4.5],
  ['text on selected row', '--text', 'selected', 4.5],
  ['hero text on hero start', '#ffffff', '--hero-from', 4.5],
  ['hero text on hero end', '#ffffff', '--hero-to', 4.5],
  ['muted hero text on hero start', 'white@0.88', '--hero-from', 4.5],
  ['muted hero text on hero end', 'white@0.88', '--hero-to', 4.5],
  ['success text on surface', '--positive', '--surface', 4.5],
  ['danger text on surface', '--negative', '--surface', 4.5],
  ['warning text on surface', '--warning', '--surface', 4.5],
  ['info text on surface', '--info', '--surface', 4.5],
  ['success text on page bg', '--positive', '--bg', 4.5],
  ['danger text on page bg', '--negative', '--bg', 4.5],
  ['success text on its soft ground', '--positive', 'success-soft', 4.5],
  ['danger text on its soft ground', '--negative', 'danger-soft', 4.5],
  ['warning text on its soft ground', '--warning', 'warning-soft', 4.5],
  ['info text on its soft ground', '--info', 'info-soft', 4.5],
  ['label on solid success button', '--on-status', '--positive', 4.5],
  ['label on solid danger button', '--on-status', '--negative', 4.5],
  ['wordmark on surface', '--brand-word', '--surface', 4.5],
  ['strong border vs surface', '--border-strong', '--surface', 1.6],
];

const SERIES = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5'];

let failures = 0;
let checked = 0;
const report = [];

for (const mode of ['light', 'dark']) {
  const modeTokens = block(":root[data-mode='" + mode + "'] {");
  for (const theme of THEMES) {
    const themeTokens = block(
      mode === 'light'
        ? ":root[data-theme='" + theme + "'] {"
        : ":root[data-mode='dark'][data-theme='" + theme + "'] {",
    );
    const t = { ...modeTokens, ...themeTokens };
    const derived = {
      selected: mix(t['--brand-500'], mode === 'light' ? 10 : 14, t['--surface']),
    };
    for (const [name, prim, pl, pd] of SOFT) derived[name] = mix(t[prim], mode === 'light' ? pl : pd, t['--surface']);

    const get = (k) => (k.startsWith('#') ? k : derived[k] ?? t[k]);
    let worst = { label: '', ratio: Infinity };

    for (const [label, fg, bg, min] of CHECKS) {
      const b = get(bg);
      // "white@0.88": white at 88% opacity, composited over the background.
      const f = fg.startsWith('white@') && b ? mix('#ffffff', Number(fg.slice(6)) * 100, b) : get(fg);
      if (!f || !b || !f.startsWith('#') || !b.startsWith('#')) {
        failures++;
        console.log('MISSING ' + mode + '/' + theme + '  ' + label + ' (' + fg + ' on ' + bg + ')');
        continue;
      }
      checked++;
      const ratio = contrast(f, b);
      if (min >= 4.5 && ratio < worst.ratio) worst = { label, ratio };
      if (ratio < min) {
        failures++;
        console.log(
          'FAIL ' + mode + '/' + theme + '  ' + label.padEnd(34) + f + ' on ' + b +
            ' = ' + ratio.toFixed(2) + ' (need ' + min + ')',
        );
      }
    }

    // Chart series must stand off the surface they are drawn on.
    for (const s of SERIES) {
      const c = get(s);
      checked++;
      if (!c) {
        failures++;
        console.log('MISSING ' + mode + '/' + theme + '  ' + s);
        continue;
      }
      const ratio = contrast(c, t['--surface']);
      if (ratio < 3) {
        failures++;
        console.log('FAIL ' + mode + '/' + theme + '  ' + s.padEnd(34) + c + ' on surface = ' + ratio.toFixed(2));
      }
    }

    report.push(
      '  ' + (mode + '/' + theme).padEnd(16) +
        'body ' + contrast(t['--text'], t['--surface']).toFixed(1).padStart(5) + ':1' +
        '   accent ' + contrast(t['--brand-600'], t['--surface']).toFixed(1).padStart(4) + ':1' +
        '   weakest text ' + worst.ratio.toFixed(1) + ':1 (' + worst.label + ')',
    );
  }
}

console.log('\nContrast summary (mode/theme)');
console.log(report.join('\n'));
console.log('\n' + checked + ' pairs checked, ' + failures + ' below target.');
process.exit(failures ? 1 : 0);
