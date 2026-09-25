/**
 * Formatting helpers.
 *
 * Rule of the codebase: calculations always run on raw JavaScript numbers.
 * Formatting happens only at the edge, right before a value is painted.
 */

const inr0 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inr2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const num2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** ₹5,00,000 — Indian digit grouping (lakh/crore), no decimals by default. */
export function formatINR(value: number, decimals = 0): string {
  if (!isFiniteNumber(value)) return '—';
  const abs = Math.abs(value) < 0.005 ? 0 : value; // avoid "-₹0"
  return decimals ? inr2.format(abs) : inr0.format(Math.round(abs));
}

/** ₹1.24 Cr / ₹8.50 L / ₹45,000 — for headline figures and axis labels. */
export function formatINRCompact(value: number, decimals = 2): string {
  if (!isFiniteNumber(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const v = Math.abs(value);
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(decimals)} Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(decimals)} L`;
  if (v >= 1e3) return `${sign}₹${num0.format(Math.round(v))}`;
  return `${sign}₹${num0.format(Math.round(v))}`;
}

/** Short axis labels: 1.2Cr / 8.5L / 45k */
export function formatAxisINR(value: number): string {
  const sign = value < 0 ? '-' : '';
  const v = Math.abs(value);
  if (v >= 1e7) return `${sign}${trimZero(v / 1e7)}Cr`;
  if (v >= 1e5) return `${sign}${trimZero(v / 1e5)}L`;
  if (v >= 1e3) return `${sign}${trimZero(v / 1e3)}k`;
  return `${sign}${Math.round(v)}`;
}

function trimZero(n: number): string {
  const s = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/** Words for the amount in lakh/crore, e.g. "8.45 Lakh". */
export function toIndianWords(value: number): string {
  const v = Math.abs(value);
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)} Crore`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)} Lakh`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)} Thousand`;
  return num0.format(Math.round(v));
}

export function formatNumber(value: number, decimals = 0): string {
  if (!isFiniteNumber(value)) return '—';
  return decimals ? num2.format(round(value, decimals)) : num0.format(Math.round(value));
}

export function formatPercent(value: number, decimals = 2): string {
  if (!isFiniteNumber(value)) return '—';
  const s = round(value, decimals).toFixed(decimals);
  return `${s.replace(/\.?0+$/, (m) => (m.includes('.') ? '' : m))}%`;
}

export function round(value: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** "5 yrs 4 mo" from a month count. */
export function formatDuration(totalMonths: number): string {
  const m = Math.max(0, Math.round(totalMonths));
  const y = Math.floor(m / 12);
  const rem = m % 12;
  if (y && rem) return `${y} yr${y > 1 ? 's' : ''} ${rem} mo`;
  if (y) return `${y} yr${y > 1 ? 's' : ''}`;
  return `${rem} mo`;
}

/** Parses user text into a number; returns null when nothing usable was typed. */
export function parseNumeric(raw: string): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/[₹,\s_]/g, '').replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Adds Indian digit grouping to what the user is typing, decimals preserved. */
export function groupIndian(raw: string): string {
  const neg = raw.trim().startsWith('-');
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (cleaned === '') return neg ? '-' : '';
  const [intPart, ...rest] = cleaned.split('.');
  const decPart = rest.length ? `.${rest.join('').slice(0, 2)}` : '';
  const grouped = num0.format(Number(intPart || '0'));
  return `${neg ? '-' : ''}${grouped}${decPart}`;
}

export const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const toISODate = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
