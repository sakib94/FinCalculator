/**
 * Site-wide settings that change between deployments.
 *
 * Everything that has to be edited before going live lives here, so the
 * build, the canonical URLs, the sitemap, the legal pages and the ad setup
 * all read one source. `npm run build` prints a warning for any value that
 * is still a placeholder.
 */
export type AdPlacement = 'after-results' | 'article-end';

interface SiteConfig {
  name: string;
  url: string;
  contactEmail: string;
  adsenseClient: string;
  adSlots: Record<AdPlacement, string>;
  legalUpdated: string;
}

export const SITE: SiteConfig = {
  name: 'FinCalc',

  /**
   * The production origin, with no trailing slash. Canonical URLs, the
   * sitemap, robots.txt and Open Graph links are built from it — set it to
   * the domain the site is actually served from.
   */
  url: 'https://finora.app',

  /**
   * Shown on the Contact, Privacy and Terms pages. Use an inbox you read:
   * AdSense reviewers and visitors both expect a working contact address.
   */
  contactEmail: 'contact@finora.app',

  /**
   * Google AdSense publisher id, e.g. "ca-pub-1234567890123456".
   * Leave empty until AdSense gives you one. While empty, no ad code,
   * ad slots or ads.txt are emitted anywhere.
   */
  adsenseClient: '',

  /**
   * Ad unit ids for the two fixed ad positions, created under
   * AdSense → Ads → By ad unit. A position with no id shows nothing.
   * (Auto ads, switched on in the AdSense dashboard, need only the
   * publisher id above.) Ads never sit inside or between the calculator's
   * inputs and results.
   */
  adSlots: {
    /** Below the charts and schedule, above the explanation. */
    'after-results': '',
    /** At the end of a guide, before "Try the calculator". */
    'article-end': '',
  },

  /** "Last updated" date printed on the legal pages (YYYY-MM-DD). */
  legalUpdated: '2026-09-26',
};

/** Values above that are still the shipped placeholders. */
export const PLACEHOLDER_SETTINGS: { key: keyof SiteConfig; why: string }[] =
  SITE.contactEmail === 'contact@finora.app'
    ? [{ key: 'contactEmail', why: 'replace with an inbox you actually read' }]
    : [];
