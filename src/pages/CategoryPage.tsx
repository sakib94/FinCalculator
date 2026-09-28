import { CATEGORIES, byCategory, type CategoryId } from '@/data/catalog';
import { CalculatorTile } from '@/components/CalculatorTile';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Link } from '@/lib/router';
import { useT } from '@/hooks/PreferencesContext';
import { GUIDES } from '@/content/guides';
import { GuideCard } from './GuidePages';
import { NotFound } from './NotFound';

export function CategoryPage({ id }: { id: string }) {
  const t = useT();
  const category = CATEGORIES.find((c) => c.id === (id as CategoryId));

  if (!category) return <NotFound />;
  const calcs = byCategory(category.id);
  const ids = new Set(calcs.map((c) => c.id));
  const guides = GUIDES.filter((g) => g.calculators.some((id) => ids.has(id))).slice(0, 6);
  const [lead, ...rest] = category.intro;

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{t('Home')}</Link>
        <span>/</span>
        <span aria-current="page">{t(category.title)}</span>
      </nav>

      <PageHeader
        icon={category.icon}
        eyebrow={`${calcs.length} ${calcs.length === 1 ? t('calculator') : t('calculators')}`}
        title={t(category.title)}
        lead={lead}
      />

      <div className="tile-grid">
        {calcs.map((c) => (
          <CalculatorTile key={c.id} calc={c} />
        ))}
      </div>

      {rest.length > 0 && (
        <div className="category-intro prose">
          {rest.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {guides.length > 0 && (
        <section className="page-section" aria-labelledby="cat-guides">
          <div className="section-head">
            <div>
              <p className="eyebrow">{t('Learn')}</p>
              <h2 id="cat-guides">{t('Guides')}</h2>
            </div>
            <Link to="/guides" className="link">
              {t('View all')} →
            </Link>
          </div>
          <div className="guide-grid">
            {guides.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </section>
      )}

      <section className="page-section" aria-labelledby="cat-more">
        <div className="section-head">
          <h2 id="cat-more">{t('Other categories')}</h2>
        </div>
        <div className="chip-row">
          {CATEGORIES.filter((c) => c.id !== category.id).map((c) => (
            <Link key={c.id} to={`/category/${c.id}`} className="quick-chip">
              <Icon name={c.icon} size={15} />
              {t(c.title)}
              <span className="chip-count num">{byCategory(c.id).length}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
