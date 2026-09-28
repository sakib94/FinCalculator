import { useMemo } from 'react';
import { useT } from '@/hooks/PreferencesContext';
import type { Content } from '@/calculators/types';
import { slugId } from '@/lib/scroll';
import { ArticleToc } from './ArticleToc';
import { FaqList, SectionBlock } from './Prose';

/**
 * The explanation under every calculator: what it is, how it works, the
 * formula, a worked example, deeper sections, assumptions and FAQs.
 * Rendered open with real headings — this is the part of the page that
 * answers a reader's question, and the part search engines read.
 *
 * It reads as an article on the page itself rather than a box inside a
 * box, with an "On this page" index beside it on wide screens and folded
 * above it on phones.
 */
export function ContentSections({ content, name }: { content: Content; name: string }) {
  const t = useT();

  const toc = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (content.intro) items.push({ id: slugId('a', content.intro.heading), label: content.intro.heading });
    items.push({ id: 'a-how-it-works', label: t('How this calculator works') });
    if (content.formula) items.push({ id: 'a-formula', label: t('Formula') });
    if (content.example?.length) items.push({ id: 'a-example', label: t('Worked example') });
    content.sections?.forEach((s) => items.push({ id: slugId('a', s.heading), label: s.heading }));
    if (content.assumptions?.length || content.notes?.length)
      items.push({ id: 'a-assumptions', label: t('Assumptions & important notes') });
    if (content.faqs?.length) items.push({ id: 'calc-faq', label: t('Frequently asked questions') });
    return items;
  }, [content, t]);

  return (
    <div className="article-layout">
      <ArticleToc items={toc} />

      <article className="prose article" aria-label={`About the ${name}`}>
        {content.intro && (
          <section className="prose-section" id={toc[0].id}>
            <h2>{content.intro.heading}</h2>
            {content.intro.paragraphs.map((p, i) => (
              <p key={i} className={i === 0 ? 'lead' : undefined}>
                {p}
              </p>
            ))}
          </section>
        )}

        <section className="prose-section" id="a-how-it-works">
          <h2>{t('How this calculator works')}</h2>
          {content.howItWorks.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        {content.formula && (
          <section className="prose-section" id="a-formula">
            <h2>{t('Formula')}</h2>
            <pre className="formula">{content.formula}</pre>
          </section>
        )}

        {content.example && content.example.length > 0 && (
          <section className="prose-section" id="a-example">
            <h2>{t('Worked example')}</h2>
            <ol className="steps">
              {content.example.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ol>
          </section>
        )}

        {content.sections?.map((s, i) => <SectionBlock key={i} section={s} id={slugId('a', s.heading)} />)}

        {(content.assumptions?.length || content.notes?.length) && (
          <section className="prose-section" id="a-assumptions">
            <h2>{t('Assumptions & important notes')}</h2>
            <div className="assume-grid">
              {content.assumptions && content.assumptions.length > 0 && (
                <div className="assume-col">
                  <h3>{t('What this calculator assumes')}</h3>
                  <ul>
                    {content.assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {content.notes && content.notes.length > 0 && (
                <div className="assume-col">
                  <h3>{t('Important notes')}</h3>
                  <ul>
                    {content.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {content.faqs && content.faqs.length > 0 && (
          <FaqList faqs={content.faqs} heading={t('Frequently asked questions')} id="calc-faq" />
        )}
      </article>
    </div>
  );
}
