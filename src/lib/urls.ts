/**
 * Mapping between the app's internal routes and the public URLs.
 *
 * Internally every screen is addressed the way it always was:
 *
 *   /                    dashboard
 *   /c/<id>              a calculator
 *   /category/<id>       a category
 *   /guides, /guides/<slug>, /about, /privacy-policy, …
 *
 * Publicly, calculators get keyword-bearing, crawlable paths and every page
 * is a directory so a static host can serve a pre-rendered index.html:
 *
 *   /c/home-loan-emi     →  /home-loan-emi-calculator/
 *   /category/loans      →  /category/loans/
 *   /guides/what-is-emi  →  /guides/what-is-emi/
 *
 * Search engines treat everything after "#" as part of one page, which is
 * why these are real paths rather than the hash routes the app used before.
 * Pure functions only, so the pre-render script and the tests share them.
 */

const CALC_SUFFIX = '-calculator';

/** Internal route → public path relative to the site root ('' for the home page). */
export function toUrlPath(internal: string): string {
  const clean = internal.replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  const calc = /^c\/([a-z0-9-]+)$/.exec(clean);
  if (calc) return `${calc[1]}${CALC_SUFFIX}/`;
  return `${clean}/`;
}

/** Public path relative to the site root → internal route. */
export function fromUrlPath(relative: string): string {
  const clean = relative.replace(/^\/+|\/+$/g, '').replace(/\/index\.html$|^index\.html$/, '');
  if (!clean) return '/';
  if (!clean.includes('/') && clean.endsWith(CALC_SUFFIX) && clean.length > CALC_SUFFIX.length) {
    return `/c/${clean.slice(0, -CALC_SUFFIX.length)}`;
  }
  return `/${clean}`;
}

/** Splits "/c/emi?principal=1" into its route and query (without "?"). */
export function splitRoute(to: string): { path: string; search: string } {
  const q = to.indexOf('?');
  const path = q === -1 ? to : to.slice(0, q);
  return { path: path.startsWith('/') ? path : `/${path}`, search: q === -1 ? '' : to.slice(q + 1) };
}

/** Relative prefix from a page's directory back to the site root, e.g. "../../". */
export function relativeRootFor(internal: string): string {
  const depth = toUrlPath(internal).split('/').filter(Boolean).length;
  return depth === 0 ? './' : '../'.repeat(depth);
}
