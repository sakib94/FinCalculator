import { byId } from '@/data/catalog';
import { GUIDES, GUIDE_TOPICS, guideBySlug, readingMinutes } from '@/content/guides';
import type { Guide } from '@/content/guides';
import { CalculatorTile } from '@/components/CalculatorTile';
import { FaqList, SectionBlock } from '@/components/Prose';
import { Icon } from '@/components/Icon';
import { AdSlot } from '@/components/AdSlot';
import { Link } from '@/lib/router';
import { useT } from '@/hooks/PreferencesContext';
import { NotFound } from './NotFound';

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export function GuideCard({ guide, showTopic = true }: { guide: Guide; showTopic?: boolean }) {
  return (
    <Link to={`/guides/${guide.slug}`} className="guide-card">
      {showTopic && <span className="guide-topic">{guide.topic}</span>}
      <span className="guide-title">{guide.title}</span>
      <span className="guide-desc">{guide.description}</span>
      <span className="guide-meta">
        <Icon name="book" size={13} /> {readingMinutes(guide)} min read
      </span>
    </Link>
  );
}

export function GuidesIndex() {
  const t = useT();
  return (
    <div>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{t('Home')}</Link>
        <span>/</span>
        <span aria-current="page">{t('Guides')}</span>
      </nav>

      <header className="calc-head">
        <div className="c-icon">
          <Icon name="book" size={24} />
        </div>
        <div>
          <h1>{t('Financial guides')}</h1>
          <p className="c-sub" style={{ margin: 0 }}>
            Plain-English explanations of loans, investing, tax and saving — each paired with the calculator that
            puts it into numbers.
          </p>
        </div>
      </header>

      {GUIDE_TOPICS.map((topic) => {
        const guides = GUIDES.filter((g) => g.topic === topic);
        if (!guides.length) return null;
        return (
          <section className="section" key={topic}>
            <div className="section-head">
              <h2>{topic}</h2>
            </div>
            <div className="guide-grid">
              {guides.map((g) => (
                <GuideCard key={g.slug} guide={g} showTopic={false} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function GuidePage({ slug }: { slug: string }) {
  const t = useT();
  const guide = guideBySlug(slug);
  if (!guide) return <NotFound />;

  const calculators = guide.calculators.map(byId).filter((c): c is NonNullable<typeof c> => !!c);
  const more = GUIDES.filter((g) => g.slug !== guide.slug && g.topic === guide.topic).slice(0, 3);

  return (
    <div>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{t('Home')}</Link>
        <span>/</span>
        <Link to="/guides">{t('Guides')}</Link>
        <span>/</span>
        <span aria-current="page">{guide.title}</span>
      </nav>

      <article className="guide">
        <header className="guide-head">
          <span className="guide-topic">{guide.topic}</span>
          <h1>{guide.title}</h1>
          <p className="guide-lead">{guide.description}</p>
          <p className="guide-meta">
            <Icon name="calendar" size={13} /> Updated {formatDate(guide.updated)} ·{' '}
            <Icon name="book" size={13} /> {readingMinutes(guide)} min read
          </p>
        </header>

        <aside className="card card-pad key-points" aria-label="Key points">
          <h2 className="section-label">Key points</h2>
          <ul>
            {guide.keyPoints.map((k, i) => (
              <li key={i}>
                <Icon name="check" size={15} />
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="card card-pad prose article">
          {guide.sections.map((s, i) => (
            <SectionBlock key={i} section={s} />
          ))}
          {guide.faqs && <FaqList faqs={guide.faqs} />}
        </div>

        <AdSlot placement="article-end" />

        {calculators.length > 0 && (
          <section className="section" aria-labelledby="try-head">
            <div className="section-head">
              <h2 id="try-head">Try the calculator</h2>
            </div>
            <div className="tile-grid">
              {calculators.map((c) => (
                <CalculatorTile key={c.id} calc={c} />
              ))}
            </div>
          </section>
        )}

        {more.length > 0 && (
          <section className="section" aria-labelledby="more-head">
            <div className="section-head">
              <h2 id="more-head">More {guide.topic.toLowerCase()} guides</h2>
              <Link to="/guides" className="link">
                {t('View all')}
              </Link>
            </div>
            <div className="guide-grid">
              {more.map((g) => (
                <GuideCard key={g.slug} guide={g} showTopic={false} />
              ))}
            </div>
          </section>
        )}

        <p className="small muted" style={{ marginTop: 18 }}>
          This guide is general information, not financial, tax or investment advice. Rates, limits and rules
          change — check current terms with your lender or the relevant authority. See our{' '}
          <Link to="/disclaimer">disclaimer</Link>.
        </p>
      </article>
    </div>
  );
}
