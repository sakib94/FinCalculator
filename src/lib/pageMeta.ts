import { ALIASES, CALCULATORS, CATEGORIES, byId } from '@/data/catalog';
import { REGISTRY } from '@/calculators';
import { GUIDES, guideBySlug } from '@/content/guides';
import { INFO_PAGES, infoPageBySlug } from '@/content/pages';
import { SITE } from '@/data/site';
import { canonicalUrlFor } from './router';

/**
 * Title, description and structured data for every route.
 *
 * One function feeds both the browser (the tab title and meta tags update
 * as you navigate) and the pre-render step (which writes the same values
 * into each page's static HTML), so the two can never disagree.
 */

export interface PageMeta {
  title: string;
  description: string;
  /** schema.org objects, each emitted as its own JSON-LD script. */
  jsonLd: object[];
  /** Set for a route that does not exist. */
  notFound?: boolean;
  /** A real page that should stay out of search results (settings). */
  noindex?: boolean;
  /** An old address that forwards to another route. */
  redirect?: string;
}

const HOME_TITLE = `${SITE.name} — Free Financial Calculators for India: EMI, SIP, Tax & More`;
const HOME_DESCRIPTION =
  'Free, accurate Indian financial calculators with detailed guides: home, car, bike, personal and education loan EMI, SIP, EPF, PPF, NPS, FD, income tax, salary, GST and more.';

const withBrand = (title: string) => (title.includes(SITE.name) ? title : `${title} | ${SITE.name}`);

function breadcrumbs(items: { name: string; path: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: canonicalUrlFor(item.path),
    })),
  };
}

function faqPage(faqs: { q: string; a: string }[]): object[] {
  if (!faqs.length) return [];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];
}

const NOT_FOUND: PageMeta = {
  title: withBrand('Page not found'),
  description: 'The page you were looking for does not exist.',
  jsonLd: [],
  notFound: true,
};

export function metaForPath(path: string): PageMeta {
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE.name,
          url: `${SITE.url}/`,
        },
      ],
    };
  }

  const [head, id, ...rest] = segments;
  if (rest.length) return NOT_FOUND;

  if (head === 'c' && id) {
    if (ALIASES[id]) return { ...NOT_FOUND, notFound: false, redirect: `/c/${ALIASES[id]}` };
    const meta = byId(id);
    const def = REGISTRY[id];
    if (!meta || !def) return NOT_FOUND;
    const category = CATEGORIES.find((c) => c.id === meta.category);
    return {
      title: withBrand(meta.seoTitle),
      description: meta.seoDescription,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: meta.name,
          url: canonicalUrlFor(path),
          description: meta.seoDescription,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        },
        breadcrumbs([
          { name: 'Home', path: '/' },
          { name: category?.title ?? 'Calculators', path: `/category/${meta.category}` },
          { name: meta.name, path },
        ]),
        ...faqPage(def.content.faqs ?? []),
      ],
    };
  }

  if (head === 'category' && id) {
    const category = CATEGORIES.find((c) => c.id === id);
    if (!category) return NOT_FOUND;
    return {
      title: withBrand(category.seoTitle),
      description: category.seoDescription,
      jsonLd: [
        breadcrumbs([
          { name: 'Home', path: '/' },
          { name: category.title, path },
        ]),
      ],
    };
  }

  if (head === 'guides') {
    if (!id) {
      return {
        title: withBrand('Financial Guides – Loans, EMI, SIP, Tax & Savings Explained'),
        description:
          'Plain-English guides to Indian personal finance: how EMIs are calculated, home loan tax benefits, SIP vs lumpsum, compound interest, old vs new tax regime and more.',
        jsonLd: [
          breadcrumbs([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
          ]),
        ],
      };
    }
    const guide = guideBySlug(id);
    if (!guide) return NOT_FOUND;
    return {
      title: withBrand(guide.seoTitle),
      description: guide.description,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.title,
          description: guide.description,
          dateModified: guide.updated,
          mainEntityOfPage: canonicalUrlFor(path),
          author: { '@type': 'Organization', name: SITE.name, url: `${SITE.url}/` },
          publisher: { '@type': 'Organization', name: SITE.name },
        },
        breadcrumbs([
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: guide.title, path },
        ]),
        ...faqPage(guide.faqs ?? []),
      ],
    };
  }

  if (head === 'settings' && !id) {
    return {
      title: withBrand('Appearance settings'),
      description: 'Choose light, dark or system theme, an accent colour and interface density for FinCalc.',
      noindex: true,
      jsonLd: [],
    };
  }

  if (!id) {
    const page = infoPageBySlug(head);
    if (page) {
      return {
        title: withBrand(page.seoTitle),
        description: page.description,
        jsonLd: [
          breadcrumbs([
            { name: 'Home', path: '/' },
            { name: page.title, path },
          ]),
        ],
      };
    }
  }

  return NOT_FOUND;
}

/** Every indexable route, in sitemap order. */
export function allRoutes(): string[] {
  return [
    '/',
    ...CALCULATORS.map((c) => `/c/${c.id}`),
    ...CATEGORIES.map((c) => `/category/${c.id}`),
    '/guides',
    ...GUIDES.map((g) => `/guides/${g.slug}`),
    ...INFO_PAGES.map((p) => `/${p.slug}`),
  ];
}

/** Pages that are pre-rendered (so their address works) but not listed in the sitemap. */
export function utilityRoutes(): string[] {
  return ['/settings'];
}

/** Retired calculator ids that should still resolve, with where they now point. */
export function aliasRoutes(): { from: string; to: string }[] {
  return Object.entries(ALIASES).map(([from, to]) => ({ from: `/c/${from}`, to: `/c/${to}` }));
}
