import { useMemo, useState } from 'react';
import { CALCULATORS, CATEGORIES, POPULAR, byCategory, byId, displayName, searchCalculators } from '@/data/catalog';
import { CalculatorTile } from '@/components/CalculatorTile';
import { HeroCalculator } from '@/components/HeroCalculator';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { useFavorites, useRecents, useT } from '@/hooks/PreferencesContext';
import { Link } from '@/lib/router';
import { GUIDES } from '@/content/guides';
import { SITE } from '@/data/site';
import { GuideCard } from './GuidePages';

/** One-tap starting points under the hero search — the most common jobs. */
const QUICK_STARTS = ['home-loan-emi', 'mutual-fund', 'income-tax', 'fd', 'ppf', 'gst'];

/** Guides featured on the home page. */
const FEATURED_GUIDES = ['how-emi-is-calculated', 'what-is-sip', 'old-vs-new-tax-regime']
  .map((slug) => GUIDES.find((g) => g.slug === slug))
  .filter((g): g is NonNullable<typeof g> => !!g);

const WHY: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'lock',
    title: 'Private by design',
    text: 'Every calculation runs in your browser. Nothing you type is uploaded, stored or shared.',
  },
  {
    icon: 'check',
    title: 'Accurate to the rupee',
    text: 'Real formulas — reducing-balance EMIs, EPFO interest, slab-wise tax with rebate and cess — tested against published figures.',
  },
  {
    icon: 'book',
    title: 'Explained, not just computed',
    text: 'Every result comes with the formula, a worked example and answers in plain English.',
  },
  {
    icon: 'sparkle',
    title: 'Free, fast and bilingual',
    text: 'No sign-up, no paywall. Works on any phone, and in English or हिंदी.',
  },
];

/**
 * The home page tells the story in the order a visitor needs it:
 * what PaiseWise is → try it right now → the tools people use most →
 * everything else by category → learn → why trust it → the full index.
 */
export function Dashboard() {
  const [query, setQuery] = useState('');
  const { recents, clear } = useRecents();
  const { favorites } = useFavorites();
  const t = useT();

  const matches = useMemo(() => (query.trim() ? searchCalculators(query) : []), [query]);
  const recentCalcs = recents.map((id) => byId(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const favCalcs = favorites.map((id) => byId(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const personal = [...favCalcs, ...recentCalcs.filter((c) => !favorites.includes(c.id))].slice(0, 8);

  return (
    <div className="home">
      {/* ---------------- Hero ---------------- */}
      <section className="home-hero">
        <div className="hh-copy">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            {t('Free financial calculators for India')}
          </p>
          <h1 className="hh-title">
            {t('Every money decision,')} <span className="hh-accent">{t('calculated.')}</span>
          </h1>
          {/* The brand line stays in English in both languages, like the name. */}
          <p className="hh-tagline">{SITE.tagline}</p>
          <p className="hh-lead">
            {t(
              'Loans, investments, tax and salary — worked out to the rupee, explained in plain English, and private to your device.',
            )}
          </p>

          <div className="hh-search">
            <div className="input-wrap hh-search-box">
              <span className="affix left" aria-hidden="true">
                <Icon name="search" size={18} />
              </span>
              <input
                className="input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Search {n} calculators — try “home loan” or “tax”').replace('{n}', String(CALCULATORS.length))}
                aria-label={t('Search calculators')}
              />
            </div>
          </div>

          <div className="hh-quick" aria-label={t('Popular starting points')}>
            {QUICK_STARTS.map((id) => {
              const c = byId(id);
              return c ? (
                <Link key={id} to={`/c/${id}`} className="quick-chip">
                  <Icon name={c.icon} size={15} />
                  {t(displayName(c))}
                </Link>
              ) : null;
            })}
          </div>
        </div>

        <div className="hh-demo">
          <HeroCalculator />
        </div>
      </section>

      {query.trim() ? (
        <section className="home-section" aria-live="polite">
          <div className="section-head">
            <h2>
              {matches.length} {matches.length === 1 ? t('result') : t('results')} {t('for')} “{query}”
            </h2>
          </div>
          {matches.length ? (
            <div className="tile-grid">
              {matches.map((c) => (
                <CalculatorTile key={c.id} calc={c} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Icon name="search" size={22} />
              <p className="es-title">{t('No calculator matches that yet')}</p>
              <p className="es-text">{t('Try a simpler word such as “loan”, “tax”, “salary”, “age” or “gst”.')}</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ---------------- Trust figures ---------------- */}
          <section className="trust-band" aria-label={t('PaiseWise in numbers')}>
            <div className="tb-item">
              <span className="tb-num num">{CALCULATORS.length}</span>
              <span className="tb-label">{t('free calculators')}</span>
            </div>
            <div className="tb-item">
              <span className="tb-num num">{GUIDES.length}</span>
              <span className="tb-label">{t('in-depth guides')}</span>
            </div>
            <div className="tb-item">
              <span className="tb-num num">0</span>
              <span className="tb-label">{t('bytes sent')}</span>
            </div>
            <div className="tb-item">
              <span className="tb-num">EN · हिं</span>
              <span className="tb-label">{t('two languages')}</span>
            </div>
          </section>

          {/* ---------------- Personal ---------------- */}
          {personal.length > 0 && (
            <section className="home-section compact" aria-labelledby="home-personal">
              <div className="section-head">
                <h2 id="home-personal">{t('Pick up where you left off')}</h2>
                {recentCalcs.length > 0 && (
                  <button type="button" className="btn ghost sm" onClick={clear} style={{ marginLeft: 'auto' }}>
                    {t('Clear recent')}
                  </button>
                )}
              </div>
              <div className="chip-row">
                {personal.map((c) => (
                  <Link key={c.id} to={`/c/${c.id}`} className="quick-chip">
                    <Icon name={favorites.includes(c.id) ? 'star' : c.icon} size={15} filled={favorites.includes(c.id)} />
                    {t(displayName(c))}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ---------------- Most used ---------------- */}
          <section className="home-section" aria-labelledby="home-popular">
            <div className="section-head">
              <div>
                <p className="eyebrow">{t('Most used')}</p>
                <h2 id="home-popular">{t('The calculators people reach for first')}</h2>
              </div>
            </div>
            <div className="tile-grid home-tiles">
              {POPULAR.slice(0, 6).map((c) => (
                <CalculatorTile key={c.id} calc={c} />
              ))}
            </div>
          </section>

          {/* ---------------- Categories ---------------- */}
          <section className="home-section" aria-labelledby="home-cats">
            <div className="section-head">
              <div>
                <p className="eyebrow">{t('Explore')}</p>
                <h2 id="home-cats">{t('Every kind of money question')}</h2>
              </div>
            </div>
            <div className="cat-grid">
              {CATEGORIES.map((cat) => {
                const calcs = byCategory(cat.id);
                return (
                  <Link key={cat.id} to={`/category/${cat.id}`} className="cat-card">
                    <span className="cc-top">
                      <span className="cc-icon">
                        <Icon name={cat.icon} size={20} />
                      </span>
                      <span className="cc-count">
                        <span className="num">{calcs.length}</span> {t('tools')}
                      </span>
                    </span>
                    <span className="cc-title">{t(cat.title)}</span>
                    <span className="cc-list">
                      {calcs
                        .slice(0, 3)
                        .map((c) => t(displayName(c)))
                        .join(' · ')}
                    </span>
                    <span className="cc-more">
                      {t('Explore')} <Icon name="chevronRight" size={14} />
                    </span>
                  </Link>
                );
              })}
              <Link to="/guides" className="cat-card cc-ink">
                <span className="cc-top">
                  <span className="cc-icon">
                    <Icon name="book" size={20} />
                  </span>
                  <span className="cc-count">
                    <span className="num">{GUIDES.length}</span> {t('guides')}
                  </span>
                </span>
                <span className="cc-title">{t('Money guides')}</span>
                <span className="cc-list">{t('EMI, SIP, tax regimes, PPF, GST — the ideas behind the numbers, in plain English.')}</span>
                <span className="cc-more">
                  {t('Start reading')} <Icon name="chevronRight" size={14} />
                </span>
              </Link>
            </div>
          </section>

          {/* ---------------- Guides ---------------- */}
          <section className="home-section" aria-labelledby="home-guides">
            <div className="section-head">
              <div>
                <p className="eyebrow">{t('Learn')}</p>
                <h2 id="home-guides">{t('Understand the numbers behind the decision')}</h2>
              </div>
              <Link to="/guides" className="link">
                {t('All')} {GUIDES.length} {t('guides')} →
              </Link>
            </div>
            <div className="guide-grid">
              {FEATURED_GUIDES.map((g) => (
                <GuideCard key={g.slug} guide={g} />
              ))}
            </div>
          </section>

          {/* ---------------- Why ---------------- */}
          <section className="home-section why" aria-labelledby="home-why">
            <div className="section-head">
              <div>
                <p className="eyebrow">{t('Why {site}').replace('{site}', SITE.name)}</p>
                <h2 id="home-why">{t('Built to be trusted with your numbers')}</h2>
              </div>
            </div>
            <div className="why-grid">
              {WHY.map((w) => (
                <div className="why-item" key={w.title}>
                  <span className="why-icon">
                    <Icon name={w.icon} size={18} />
                  </span>
                  <h3>{t(w.title)}</h3>
                  <p>{t(w.text)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ---------------- Directory ---------------- */}
          <section className="home-section" aria-labelledby="home-all">
            <div className="section-head">
              <div>
                <p className="eyebrow">{t('Directory')}</p>
                <h2 id="home-all">{t('All calculators')}</h2>
              </div>
              <span className="dir-legend" aria-hidden="true">
                <span className="new-dot" /> {t('Recently added')}
              </span>
            </div>
            <div className="directory">
              {CATEGORIES.map((cat) => (
                <div className="dir-col" key={cat.id}>
                  <Link to={`/category/${cat.id}`} className="dir-head">
                    <Icon name={cat.icon} size={15} />
                    {t(cat.title)}
                  </Link>
                  <ul>
                    {byCategory(cat.id).map((c) => (
                      <li key={c.id}>
                        <Link to={`/c/${c.id}`}>
                          {t(displayName(c))}
                          {c.isNew && (
                            <>
                              <span className="new-dot" aria-hidden="true" />
                              <span className="sr-only">({t('New')})</span>
                            </>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
