import { byId, displayName } from '@/data/catalog';
import { GUIDES, GUIDE_TOPICS, guideBySlug, readingMinutes } from '@/content/guides';
import type { Guide } from '@/content/guides';
import { CalculatorTile } from '@/components/CalculatorTile';
import { FaqList, SectionBlock } from '@/components/Prose';
import { ArticleToc } from '@/components/ArticleToc';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { AdSlot } from '@/components/AdSlot';
import { Link } from '@/lib/router';
import { scrollToSection, slugId } from '@/lib/scroll';
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
  const topics = GUIDE_TOPICS.filter((topic) => GUIDES.some((g) => g.topic === topic));
  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{t('Home')}</Link>
        <span>/</span>
        <span aria-current="page">{t('Guides')}</span>
      </nav>

      <PageHeader
        icon="book"
        eyebrow={t('Learn')}
        title={t('Financial guides')}
        lead={t(
          'Plain-English explanations of loans, investing, tax and saving — each paired with the calculator that puts it into numbers.',
        )}
      >
        <div className="topic-row" aria-label={t('Jump to a topic')}>
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              className="quick-chip"
              onClick={() => scrollToSection(slugId('topic', topic))}
            >
              {t(topic)}
              <span className="chip-count num">{GUIDES.filter((g) => g.topic === topic).length}</span>
            </button>
          ))}
        </div>
      </PageHeader>

      {topics.map((topic) => {
        const guides = GUIDES.filter((g) => g.topic === topic);
        const id = slugId('topic', topic);
        return (
          <section className="page-section" key={topic} id={id} aria-labelledby={`${id}-h`}>
            <div className="section-head">
              <h2 id={`${id}-h`}>{t(topic)}</h2>
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
  const toc = [
    { id: 'g-key-points', label: t('Key points') },
    ...guide.sections.map((s) => ({ id: slugId('g', s.heading), label: s.heading })),
    ...(guide.faqs?.length ? [{ id: 'g-faq', label: t('Frequently asked questions') }] : []),
  ];

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{t('Home')}</Link>
        <span>/</span>
        <Link to="/guides">{t('Guides')}</Link>
        <span>/</span>
        <span aria-current="page">{guide.title}</span>
      </nav>

      <PageHeader
        eyebrow={t(guide.topic)}
        title={guide.title}
        lead={guide.description}
        meta={
          <>
            <Icon name="calendar" size={13} /> {t('Updated')} {formatDate(guide.updated)}
            <span aria-hidden="true">·</span>
            <Icon name="book" size={13} /> {readingMinutes(guide)} {t('min read')}
          </>
        }
      />

      <div className="article-layout guide-layout">
        <ArticleToc items={toc}>
          {calculators.length > 0 && (
            <div className="toc-tools">
              <p className="toc-tools-title">{t('Put it into numbers')}</p>
              {calculators.map((c) => (
                <Link key={c.id} to={`/c/${c.id}`} className="toc-tool">
                  <Icon name={c.icon} size={15} />
                  {t(displayName(c))}
                  <Icon name="chevronRight" size={14} />
                </Link>
              ))}
            </div>
          )}
        </ArticleToc>

        <article className="prose article" aria-label={guide.title}>
          <section className="key-points" id="g-key-points" aria-labelledby="g-key-points-h">
            <h2 id="g-key-points-h" className="kp-title">
              {t('Key points')}
            </h2>
            <ul>
              {guide.keyPoints.map((k, i) => (
                <li key={i}>
                  <Icon name="check" size={15} />
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </section>

          {guide.sections.map((s, i) => (
            <SectionBlock key={i} section={s} id={slugId('g', s.heading)} />
          ))}
          {guide.faqs && <FaqList faqs={guide.faqs} heading={t('Frequently asked questions')} id="g-faq" />}
        </article>
      </div>

      <AdSlot placement="article-end" />

      {calculators.length > 0 && (
        <section className="page-section" aria-labelledby="try-head">
          <div className="section-head">
            <div>
              <p className="eyebrow">{t('Next steps')}</p>
              <h2 id="try-head">{t('Try the calculator')}</h2>
            </div>
          </div>
          <div className="tile-grid">
            {calculators.map((c) => (
              <CalculatorTile key={c.id} calc={c} />
            ))}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="page-section" aria-labelledby="more-head">
          <div className="section-head">
            <h2 id="more-head">{t('More guides on this topic')}</h2>
            <Link to="/guides" className="link">
              {t('View all')} →
            </Link>
          </div>
          <div className="guide-grid">
            {more.map((g) => (
              <GuideCard key={g.slug} guide={g} showTopic={false} />
            ))}
          </div>
        </section>
      )}

      <p className="trust-line">
        <Icon name="info" size={14} />
        <span>
          {t(
            'This guide is general information, not financial, tax or investment advice. Rates, limits and rules change — check current terms with your lender or the relevant authority.',
          )}{' '}
          <Link to="/disclaimer">{t('Read the disclaimer')}</Link>.
        </span>
      </p>
    </div>
  );
}
