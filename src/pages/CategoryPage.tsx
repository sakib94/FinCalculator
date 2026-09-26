import { CATEGORIES, byCategory, type CategoryId } from '@/data/catalog';
import { CalculatorTile } from '@/components/CalculatorTile';
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

  return (
    <div>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{t('Home')}</Link>
        <span>/</span>
        <span aria-current="page">{t(category.title)}</span>
      </nav>

      <header className="calc-head">
        <div className="c-icon">
          <Icon name={category.icon} size={24} />
        </div>
        <div>
          <h1>{t(category.title)}</h1>
          <p className="c-sub" style={{ margin: 0 }}>
            {calcs.length} calculator{calcs.length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <div className="category-intro prose">
        {category.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="tile-grid">
        {calcs.map((c) => (
          <CalculatorTile key={c.id} calc={c} />
        ))}
      </div>

      {guides.length > 0 && (
        <section className="section" aria-labelledby="cat-guides">
          <div className="section-head">
            <h2 id="cat-guides">{t('Guides')}</h2>
            <Link to="/guides" className="link">
              {t('View all')}
            </Link>
          </div>
          <div className="guide-grid">
            {guides.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
