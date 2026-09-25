/**
 * Parses tokens.css and checks WCAG contrast for the pairs that actually
 * carry meaning on screen. Run with: node contrast.mjs <path-to-tokens.css>
 *
 * Blocks are located by their single-line selector, so CRLF vs LF and the
 * `:root,` prefix on the default palette both stop mattering.
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(process.argv[2], 'utf8');

function block(selector) {
  const i = css.indexOf(selector);
  if (i === -1) throw new Error('missing block: ' + selector);
  const open = css.indexOf('{', i);
  const close = css.indexOf('}', open);
  const body = css.slice(open, close);
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const hexToRgb = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
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

const PALETTES = ['harbor', 'meridian', 'evergreen', 'ember', 'iris'];

// [label, foreground token, background token, minimum ratio]
// 4.5 is WCAG AA for body text; lower thresholds are for decorative roles.
const CHECKS = [
  ['body text on surface', '--text', '--surface', 4.5],
  ['body text on page bg', '--text', '--bg', 4.5],
  ['secondary text on surface', '--text-2', '--surface', 4.5],
  ['secondary text on surface-3', '--text-2', '--surface-3', 4.5],
  ['muted text on surface', '--text-3', '--surface', 3.5],
  ['brand link on surface', '--brand-600', '--surface', 4.5],
  ['button label on brand', '--brand-ink', '--brand-600', 4.5],
  ['hero text on hero start', '#ffffff', '--hero-from', 4.5],
  ['hero text on hero end', '#ffffff', '--hero-to', 4.5],
  ['positive on surface', '--positive', '--surface', 4.5],
  ['negative on surface', '--negative', '--surface', 4.5],
  ['warning on surface', '--warning', '--surface', 4.5],
  ['strong border vs surface', '--border-strong', '--surface', 1.6],
];

const SERIES = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5'];

let failures = 0;
let checked = 0;
const report = [];

for (const p of PALETTES) {
  for (const mode of ['light', 'dark']) {
    const selector =
      mode === 'light'
        ? ":root[data-palette='" + p + "'] {"
        : ":root[data-palette='" + p + "'][data-mode='dark'] {";

    const t = block(selector);
    const get = (k) => (k.startsWith('#') ? k : t[k]);
    let worst = { label: '', ratio: Infinity };

    for (const [label, fg, bg, min] of CHECKS) {
      const f = get(fg);
      const b = get(bg);
      if (!f || !b || !f.startsWith('#') || !b.startsWith('#')) continue;
      checked++;
      const ratio = contrast(f, b);
      if (label.includes('text') && ratio < worst.ratio) worst = { label, ratio };
      if (ratio < min) {
        failures++;
        console.log(
          'FAIL ' + p + '/' + mode + '  ' + label.padEnd(28) + f + ' on ' + b +
            ' = ' + ratio.toFixed(2) + ' (need ' + min + ')',
        );
      }
    }

    // Chart series must stand off the surface they are drawn on.
    for (const s of SERIES) {
      const c = get(s);
      if (!c) continue;
      checked++;
      const ratio = contrast(c, t['--surface']);
      if (ratio < 2.4) {
        failures++;
        console.log(
          'FAIL ' + p + '/' + mode + '  ' + s.padEnd(28) + c + ' on surface = ' + ratio.toFixed(2),
        );
      }
    }

    report.push(
      '  ' + (p + '/' + mode).padEnd(18) +
        'body ' + contrast(t['--text'], t['--surface']).toFixed(1).padStart(5) + ':1' +
        '   brand ' + contrast(t['--brand-600'], t['--surface']).toFixed(1).padStart(4) + ':1' +
        '   weakest text ' + worst.ratio.toFixed(1) + ':1',
    );
  }
}

console.log('\nContrast summary');
console.log(report.join('\n'));
console.log('\n' + checked + ' pairs checked, ' + failures + ' below target.');
process.exit(failures ? 1 : 0);
