import { infoPageBySlug } from '@/content/pages';
import { SectionBlock } from '@/components/Prose';
import { ArticleToc } from '@/components/ArticleToc';
import { PageHeader } from '@/components/PageHeader';
import { slugId } from '@/lib/scroll';
import { Icon } from '@/components/Icon';
import { Link } from '@/lib/router';
import { useT } from '@/hooks/PreferencesContext';
import { SITE } from '@/data/site';
import { NotFound } from './NotFound';

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/** About, Contact, Privacy Policy, Terms and Disclaimer. */
export function InfoPage({ slug }: { slug: string }) {
  const t = useT();
  const page = infoPageBySlug(slug);
  if (!page) return <NotFound />;

  const toc = page.sections.length >= 4 ? page.sections.map((s) => ({ id: slugId('p', s.heading), label: s.heading })) : [];

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{t('Home')}</Link>
        <span>/</span>
        <span aria-current="page">{page.title}</span>
      </nav>

      <PageHeader
        eyebrow={page.legal ? t('Legal') : SITE.name}
        title={page.title}
        lead={page.lead}
        meta={
          page.legal ? (
            <>
              <Icon name="calendar" size={13} /> {t('Last updated')} {formatDate(SITE.legalUpdated)}
            </>
          ) : undefined
        }
      />

      {page.slug === 'contact' && (
        <a className="contact-card" href={`mailto:${SITE.contactEmail}`}>
          <Icon name="mail" size={22} />
          <span>
            <span className="section-label">{t('Email us')}</span>
            <strong>{SITE.contactEmail}</strong>
          </span>
        </a>
      )}

      <div className={toc.length ? 'article-layout' : 'article-solo'}>
        <ArticleToc items={toc} />
        <article className="prose article" aria-label={page.title}>
          {page.sections.map((s, i) => (
            <SectionBlock key={i} section={s} id={slugId('p', s.heading)} />
          ))}
        </article>
      </div>
    </div>
  );
}
