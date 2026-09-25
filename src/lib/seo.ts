const BASE_TITLE = 'Finora';

/** Keeps document title / meta description / canonical in sync with the route. */
export function setPageMeta(opts: { title: string; description: string; path?: string }): void {
  document.title = opts.title.includes(BASE_TITLE) ? opts.title : `${opts.title} | ${BASE_TITLE}`;
  setMeta('name', 'description', opts.description);
  setMeta('property', 'og:title', document.title);
  setMeta('property', 'og:description', opts.description);

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical && opts.path) {
    const origin = canonical.href.split('#')[0].replace(/\/$/, '');
    canonical.href = opts.path === '/' ? `${origin}/` : `${origin}/#${opts.path}`;
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

/** FAQPage structured data for calculators that ship an FAQ block. */
export function setFaqJsonLd(faqs: { q: string; a: string }[]): void {
  const id = 'faq-jsonld';
  document.getElementById(id)?.remove();
  if (!faqs.length) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });
  document.head.appendChild(script);
}
