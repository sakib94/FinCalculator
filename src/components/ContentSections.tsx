import { useT } from '@/hooks/PreferencesContext';
import type { Content } from '@/calculators/types';
import { guideBySlug } from '@/content/guides';
import { Link } from '@/lib/router';
import { FaqList, SectionBlock } from './Prose';
import { Icon } from './Icon';

/**
 * The explanation under every calculator: what it is, how it works, the
 * formula, a worked example, deeper sections, FAQs and further reading.
 * Rendered open with real headings — this is the part of the page that
 * answers a reader's question, and the part search engines read.
 */
export function ContentSections({ content, name }: { content: Content; name: string }) {
  const t = useT();
  const guides = (content.guides ?? []).map(guideBySlug).filter((g): g is NonNullable<typeof g> => !!g);

  return (
    <div className="stack sm">
      <article className="card card-pad prose article" aria-label={`About the ${name}`}>
        {content.intro && (
          <section className="prose-section">
            <h2>{content.intro.heading}</h2>
            {content.intro.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        )}

        <section className="prose-section">
          <h2>{t('How this calculator works')}</h2>
          {content.howItWorks.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        {content.formula && (
          <section className="prose-section">
            <h2>Formula</h2>
            <pre className="formula">{content.formula}</pre>
          </section>
        )}

        {content.example && content.example.length > 0 && (
          <section className="prose-section">
            <h2>{t('Worked example')}</h2>
            <ul>
              {content.example.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </section>
        )}

        {content.sections?.map((s, i) => <SectionBlock key={i} section={s} />)}

        {content.faqs && content.faqs.length > 0 && <FaqList faqs={content.faqs} heading={t('Frequently asked questions')} />}
      </article>

      {(content.assumptions?.length || content.notes?.length) && (
        <details className="acc">
          <summary>{t('Assumptions & important notes')}</summary>
          <div className="acc-body prose">
            {content.assumptions && content.assumptions.length > 0 && (
              <>
                <h3>What this calculator assumes</h3>
                <ul>
                  {content.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </>
            )}
            {content.notes && content.notes.length > 0 && (
              <>
                <h3>Important notes</h3>
                <ul>
                  {content.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </details>
      )}

      {guides.length > 0 && (
        <section className="card card-pad" aria-labelledby="guides-head">
          <h2 id="guides-head" className="section-label" style={{ marginBottom: 10 }}>
            {t('Read the guide')}
          </h2>
          <ul className="guide-links">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link to={`/guides/${g.slug}`}>
                  <Icon name="book" size={15} />
                  <span>{g.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
