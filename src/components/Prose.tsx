import type { ContentSection, FAQ } from '@/calculators/types';

/**
 * Long-form building blocks shared by calculator pages, guides and the
 * information pages, so every article on the site reads the same way:
 * real H2/H3 headings, short paragraphs, lists and scrollable tables.
 */

export function SectionBlock({ section, level = 2 }: { section: ContentSection; level?: 2 | 3 }) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <section className="prose-section">
      <Heading>{section.heading}</Heading>
      {section.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
      {section.bullets && section.bullets.length > 0 && (
        <ul>
          {section.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {section.table && (
        <div className="prose-table" role="region" aria-label={section.table.caption ?? section.heading} tabIndex={0}>
          <table>
            {section.table.caption && <caption>{section.table.caption}</caption>}
            <thead>
              <tr>
                {section.table.columns.map((c, i) => (
                  <th key={i} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (c === 0 ? <th key={c} scope="row">{cell}</th> : <td key={c}>{cell}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section.after?.map((p, i) => <p key={`a${i}`}>{p}</p>)}
    </section>
  );
}

export function FaqList({ faqs, heading = 'Frequently asked questions' }: { faqs: FAQ[]; heading?: string }) {
  if (!faqs.length) return null;
  return (
    <section className="prose-section">
      <h2>{heading}</h2>
      <div className="faq-list">
        {faqs.map((f, i) => (
          <details className="acc faq" key={i} open={i === 0}>
            <summary>
              <h3>{f.q}</h3>
            </summary>
            <div className="acc-body">
              <p>{f.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
