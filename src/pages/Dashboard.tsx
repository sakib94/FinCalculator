import { useEffect, useMemo, useState } from 'react';
import { CALCULATORS, CATEGORIES, POPULAR, byCategory, searchCalculators } from '@/data/catalog';
import type { CategoryId } from '@/data/catalog';
import { CalculatorTile } from '@/components/CalculatorTile';
import { Icon } from '@/components/Icon';
import { setPageMeta } from '@/lib/seo';
import { useFavorites, useRecents, useT } from '@/hooks/PreferencesContext';
import { Link } from '@/lib/router';

export function Dashboard() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const { recents, clear } = useRecents();
  const { favorites } = useFavorites();
  const t = useT();

  useEffect(() => {
    setPageMeta({
      title: 'Finora — All-in-One Financial Calculator',
      description:
        'Free, accurate Indian financial calculators: EPF, income tax, NPS, EMI, SIP, PPF, FD, salary, gratuity, GST, age and more.',
      path: '/',
    });
  }, []);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const found = searchCalculators(query);
    return category ? found.filter((c) => c.category === category) : found;
  }, [query, category]);
  const popular = POPULAR;
  const fresh = CALCULATORS.filter((c) => c.isNew);
  const recentCalcs = recents
    .map((id) => CALCULATORS.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const favCalcs = favorites
    .map((id) => CALCULATORS.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <div>
      <section className="hero">
        <h1>{t('All-in-One Calculator')}</h1>
        <p>
          {t('Calculate smarter. Plan better.')}{' '}
          {t('{n} accurate tools for money, tax and everyday maths.').replace(
            '{n}',
            String(CALCULATORS.length),
          )}
        </p>

        <div className="hero-search">
          <div className="input-wrap">
            <span className="affix left" aria-hidden="true">
              <Icon name="search" size={17} />
            </span>
            <input
              className="input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search calculators…')}
              aria-label={t('Search calculators')}
              style={{ fontWeight: 500 }}
            />
          </div>
        </div>

        {/* Same filter row as the search palette, so browsing behaves the
            same whether you use the box or the ⌘K dialog. */}
        <div className="hero-cats" role="group" aria-label={t('Filter by category')}>
          <button
            type="button"
            className={`cat-chip${category === null ? ' on' : ''}`}
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            {t('All')}
            <span className="cat-count">{CALCULATORS.length}</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-chip${category === cat.id ? ' on' : ''}`}
              aria-pressed={category === cat.id}
              onClick={() => setCategory((c) => (c === cat.id ? null : cat.id))}
            >
              <Icon name={cat.icon} size={14} />
              {t(cat.short)}
              <span className="cat-count">{byCategory(cat.id).length}</span>
            </button>
          ))}
        </div>

        <ul className="hero-facts" aria-label={t('Why Finora')}>
          <li>
            <Icon name="lock" size={14} />
            {t('Private — nothing leaves your device')}
          </li>
          <li>
            <Icon name="check" size={14} />
            {t('Formulas checked against published figures')}
          </li>
          <li>
            <Icon name="link" size={14} />
            {t('Shareable links that keep your inputs')}
          </li>
          <li>
            <Icon name="globe" size={14} />
            English · हिंदी
          </li>
        </ul>
      </section>

      {query.trim() ? (
        <section className="section" aria-live="polite">
          <div className="section-head">
            <h2>
              {matches.length} {matches.length === 1 ? t('result') : t('results')} {t('for')} “
              {query}”
            </h2>
          </div>
          {matches.length ? (
            <div className="tile-grid">
              {matches.map((c) => (
                <CalculatorTile key={c.id} calc={c} />
              ))}
            </div>
          ) : (
            <div className="empty">
              {t('Nothing matched. Try “tax”, “loan”, “salary”, “age” or “gst”.')}
            </div>
          )}
        </section>
      ) : category ? (
        <section className="section" aria-live="polite">
          <div className="section-head">
            <h2>{t(CATEGORIES.find((c) => c.id === category)?.title ?? '')}</h2>
            <Link to={`/category/${category}`} className="link">
              {t('View all')}
            </Link>
          </div>
          <div className="tile-grid">
            {byCategory(category).map((c) => (
              <CalculatorTile key={c.id} calc={c} />
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="section">
            <div className="section-head">
              <h2>{t('Popular calculators')}</h2>
            </div>
            <div className="tile-grid">
              {popular.map((c) => (
                <CalculatorTile key={c.id} calc={c} />
              ))}
            </div>
          </section>

          {fresh.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2>
                  <Icon name="sparkle" size={16} /> {t('Newly added')}
                </h2>
              </div>
              <div className="tile-grid">
                {fresh.map((c) => (
                  <CalculatorTile key={c.id} calc={c} />
                ))}
              </div>
            </section>
          )}

          {favCalcs.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2>
                  <Icon name="star" size={16} filled /> {t('Favourites')}
                </h2>
              </div>
              <div className="tile-grid">
                {favCalcs.map((c) => (
                  <CalculatorTile key={c.id} calc={c} />
                ))}
              </div>
            </section>
          )}

          {recentCalcs.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2>{t('Recently used')}</h2>
                <button type="button" className="link btn ghost sm" onClick={clear} style={{ marginLeft: 'auto' }}>
                  {t('Clear')}
                </button>
              </div>
              <div className="chip-row">
                {recentCalcs.map((c) => (
                  <CalculatorTile key={c.id} calc={c} compact />
                ))}
              </div>
            </section>
          )}

          {CATEGORIES.map((cat) => (
            <section className="section" key={cat.id}>
              <div className="section-head">
                <h2>{t(cat.title)}</h2>
                <Link to={`/category/${cat.id}`} className="link">
                  {t('View all')}
                </Link>
              </div>
              <div className="tile-grid">
                {byCategory(cat.id).map((c) => (
                  <CalculatorTile key={c.id} calc={c} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <section className="section">
        <div className="note">
          <Icon name="info" size={16} className="i" />
          <div>
            <strong>Your data stays on your device.</strong> Every calculation runs in your browser — nothing
            you type is uploaded. Favourites and recent calculators are stored locally too. Results are
            estimates for planning, not financial or tax advice.
          </div>
        </div>
      </section>
    </div>
  );
}
