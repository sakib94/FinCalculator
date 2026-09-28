/**
 * In-page navigation. Hash links cannot be used for this: in file:// mode
 * the router lives in the hash, so "#faq" would be read as a route. Scroll
 * the section into view instead, then move focus to it so keyboard and
 * screen-reader users land where sighted users do.
 *
 * The sticky header's height is handled by `scroll-padding-top` on <html>.
 */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/** A stable, URL-safe id for a heading. */
export const slugId = (prefix: string, text: string): string =>
  `${prefix}-${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)}`;
