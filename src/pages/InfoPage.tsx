import { infoPageBySlug } from '@/content/pages';
import { SectionBlock } from '@/components/Prose';
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

  return (
    <div>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{t('Home')}</Link>
        <span>/</span>
        <span aria-current="page">{page.title}</span>
      </nav>

      <article className="guide">
        <header className="guide-head">
          <h1>{page.title}</h1>
          <p className="guide-lead">{page.lead}</p>
          {page.legal && (
            <p className="guide-meta">
              <Icon name="calendar" size={13} /> Last updated {formatDate(SITE.legalUpdated)}
            </p>
          )}
        </header>

        {page.slug === 'contact' && (
          <a className="card card-pad contact-card" href={`mailto:${SITE.contactEmail}`}>
            <Icon name="mail" size={22} />
            <span>
              <span className="section-label">Email us</span>
              <strong>{SITE.contactEmail}</strong>
            </span>
          </a>
        )}

        <div className="card card-pad prose article">
          {page.sections.map((s, i) => (
            <SectionBlock key={i} section={s} />
          ))}
        </div>
      </article>
    </div>
  );
}
