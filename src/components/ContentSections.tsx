import { useT } from '@/hooks/PreferencesContext';
import type { Content } from '@/calculators/types';

/** SEO-visible explanatory content: how it works, formula, example, FAQ. */
export function ContentSections({ content, name }: { content: Content; name: string }) {
  const t = useT();
  return (
    <section className="stack sm" aria-label={`About the ${name}`}>
      <details className="acc" open>
        <summary>{t('How this calculator works')}</summary>
        <div className="acc-body prose">
          {content.howItWorks.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {content.formula && (
            <>
              <h3>Formula</h3>
              <pre className="formula">{content.formula}</pre>
            </>
          )}
          {content.example && content.example.length > 0 && (
            <>
              <h3>{t('Worked example')}</h3>
              <ul>
                {content.example.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </details>

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

      {content.faqs && content.faqs.length > 0 && (
        <details className="acc">
          <summary>{t('Frequently asked questions')}</summary>
          <div className="acc-body prose">
            {content.faqs.map((f, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <h3>{f.q}</h3>
                <p style={{ margin: 0 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
