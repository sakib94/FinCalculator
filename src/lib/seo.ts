import type { PageMeta } from './pageMeta';
import { canonicalUrlFor } from './router';

/**
 * Keeps the document head in sync with the route as the reader navigates:
 * title, description, canonical, Open Graph and JSON-LD. The pre-rendered
 * HTML already carries the same values for the page that was loaded.
 */
export function applyPageMeta(meta: PageMeta, path: string): void {
  document.title = meta.title;
  setMeta('name', 'description', meta.description);
  setMeta('property', 'og:title', meta.title);
  setMeta('property', 'og:description', meta.description);
  setMeta('name', 'robots', meta.notFound || meta.noindex ? 'noindex' : 'index, follow');

  const url = canonicalUrlFor(path);
  setMeta('property', 'og:url', url);
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  document.head.querySelectorAll('script[data-page-jsonld]').forEach((el) => el.remove());
  for (const data of meta.jsonLd) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-page-jsonld', '');
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
