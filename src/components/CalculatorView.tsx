import { useEffect, useMemo, useRef, useState } from 'react';
import type { Field, Values } from '@/calculators/types';
import { defaults } from '@/calculators/types';
import type { AnyCalculator } from '@/calculators';
import type { CalculatorMeta } from '@/data/catalog';
import { CATEGORIES, relatedTo } from '@/data/catalog';
import { hasErrors, validateFields } from '@/lib/validate';
import { copyText, printPage, shareResult } from '@/lib/export';
import { setFaqJsonLd, setPageMeta } from '@/lib/seo';
import { Link, useRouter } from '@/lib/router';
import { scenarioHref, searchFromValues, valuesFromSearch } from '@/lib/scenario';
import { FieldControl } from './FieldControl';
import { Chart } from './Chart';
import { DataTable } from './DataTable';
import { HeroResult, StatGrid } from './Results';
import { ContentSections } from './ContentSections';
import { CalculatorTile } from './CalculatorTile';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { useFavorites, useT } from '@/hooks/PreferencesContext';

interface Props {
  meta: CalculatorMeta;
  def: AnyCalculator;
}

/** URL writes are debounced: Safari throws after ~100 replaceState calls in 30s. */
const URL_SYNC_MS = 350;

/**
 * The shared calculator screen. Every calculator flows through here, which
 * is what keeps the modules looking and behaving like one product:
 *
 *   values → validate → compute → hero/stats/charts/table
 *
 * Results follow the inputs live. The inputs are mirrored into the URL
 * (only those that differ from the defaults), so a link or bookmark reopens
 * exactly the same scenario. The page is keyed by calculator id, so moving
 * to another calculator always starts from a fresh component.
 */
export function CalculatorView({ meta, def }: Props) {
  const { search } = useRouter();
  // Fields a link filled in start out "touched", so an out-of-range value
  // explains itself instead of silently hiding the result.
  const [values, setValues] = useState<Values>(() => ({
    ...defaults(def.fields),
    ...valuesFromSearch(def.fields, search),
  }));
  const [touched, setTouched] = useState<Record<string, boolean>>(() =>
    touchedFor(valuesFromSearch(def.fields, search)),
  );
  const resultRef = useRef<HTMLDivElement>(null);
  const t = useT();
  const { notify } = useToast();
  const { isFavorite, toggle } = useFavorites();

  // A link to this same calculator with different inputs (the back button,
  // or an alias such as /c/scss) replaces the current values.
  const lastSearch = useRef(search);
  useEffect(() => {
    if (search === lastSearch.current) return;
    lastSearch.current = search;
    const linked = valuesFromSearch(def.fields, search);
    setValues({ ...defaults(def.fields), ...linked });
    setTouched(touchedFor(linked));
  }, [search, def]);

  const query = useMemo(() => searchFromValues(def.fields, values), [def.fields, values]);

  // Mirror the inputs into the address bar without adding history entries.
  useEffect(() => {
    const route = `#/c/${meta.id}`;
    const timer = window.setTimeout(() => {
      // The reader may have navigated away while the timer was pending.
      const hash = window.location.hash;
      if (hash !== route && !hash.startsWith(`${route}?`)) return;
      const next = query ? `${route}?${query}` : route;
      if (hash === next) return;
      lastSearch.current = query;
      try {
        window.history.replaceState(window.history.state, '', next);
      } catch {
        /* rate-limited or sandboxed — the link simply stays as it was */
      }
    }, URL_SYNC_MS);
    return () => window.clearTimeout(timer);
  }, [query, meta.id]);

  useEffect(() => {
    setPageMeta({ title: meta.seoTitle, description: meta.seoDescription, path: `/c/${meta.id}` });
    setFaqJsonLd(def.content.faqs ?? []);
    return () => setFaqJsonLd([]);
  }, [meta, def]);

  const visibleFields = useMemo(
    () => def.fields.filter((f) => !f.visible || f.visible(values)),
    [def.fields, values],
  );

  const errors = useMemo(() => {
    const fieldErrors = validateFields(visibleFields, values);
    if (!hasErrors(fieldErrors) && def.validate) Object.assign(fieldErrors, def.validate(values));
    return fieldErrors;
  }, [visibleFields, values, def]);

  const valid = !hasErrors(errors);

  // Live: every keystroke and slider drag recomputes. The engines are pure
  // and cheap (the longest is a 420-month amortisation loop), so this runs
  // inside the same render rather than needing a debounce.
  const result = useMemo(() => {
    if (!valid) return null;
    try {
      return def.compute(values);
    } catch {
      return null;
    }
  }, [valid, values, def]);

  const onChange = (name: string, value: number | string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setTouched((t) => ({ ...t, [name]: true }));
  };

  const reset = () => {
    setValues(defaults(def.fields));
    setTouched({});
    notify(t('Inputs reset'));
  };

  // Only complain about a field the reader has actually been in, so an
  // untouched form never opens covered in red.
  const errorFor = (f: Field) => (touched[f.name] ? errors[f.name] : undefined);

  const summaryText = result && def.summary ? def.summary(result, values) : '';

  const onCopy = async () => {
    const ok = await copyText(`${meta.name}\n${summaryText}`);
    notify(ok ? t('Result copied') : t('Could not copy'));
  };

  const link = () => scenarioHref(meta.id, query);

  const onShare = async () => {
    const outcome = await shareResult(meta.name, `${meta.name}\n${summaryText}`, link());
    if (outcome === 'copied') notify(t('Link and result copied'));
  };

  const onCopyLink = async () => {
    const ok = await copyText(link());
    notify(ok ? t('Link copied — it opens with these inputs') : t('Could not copy'));
  };

  const groups = def.groups ?? [];
  const ungrouped = visibleFields.filter((f) => !f.group);
  const category = CATEGORIES.find((c) => c.id === meta.category);

  const heroValue = result ? def.hero(result, values) : null;
  const heroes = heroValue == null ? [] : Array.isArray(heroValue) ? heroValue : [heroValue];
  const stats = result && def.stats ? def.stats(result, values) : [];
  const charts = result && def.charts ? def.charts(result, values) : [];
  const table = result && def.table ? def.table(result, values) : null;
  const extra = result && def.extra ? def.extra(result, values) : null;
  const related = relatedTo(meta);

  return (
    <article>
      <nav className="crumbs no-print" aria-label="Breadcrumb">
        <Link to="/">{t('Home')}</Link>
        <span>/</span>
        <Link to={`/category/${meta.category}`}>{t(category?.title ?? '')}</Link>
        <span>/</span>
        <span aria-current="page">{t(meta.name)}</span>
      </nav>

      <header className="calc-head anim-rise">
        <div className="c-icon">
          <Icon name={meta.icon} size={24} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1>{t(meta.name)}</h1>
          <p className="c-sub" style={{ margin: 0 }}>
            {t(meta.tagline)}
          </p>
        </div>
        <div className="c-actions no-print">
          <button
            type="button"
            className={`icon-btn bordered${isFavorite(meta.id) ? ' on' : ''}`}
            aria-pressed={isFavorite(meta.id)}
            aria-label={isFavorite(meta.id) ? t('Remove from favourites') : t('Add to favourites')}
            onClick={() => {
              toggle(meta.id);
              notify(isFavorite(meta.id) ? t('Removed from favourites') : t('Added to favourites'));
            }}
            style={isFavorite(meta.id) ? { color: 'var(--series-4)' } : undefined}
          >
            <Icon name="star" size={18} filled={isFavorite(meta.id)} />
          </button>
        </div>
      </header>

      <div className="calc-grid">
        {/* ---------------- Inputs ---------------- */}
        <div className="card accent-top lift panel-input">
          <div className="card-head">
            <span className="step-dot" aria-hidden="true">
              1
            </span>
            <span className="section-label">{t('Inputs')}</span>
          </div>
          <div className="card-pad stack">
            {ungrouped.length > 0 && (
              <div className="fields">
                {ungrouped.map((f) => (
                  <FieldControl
                    key={f.name}
                    field={f}
                    value={values[f.name]}
                    error={errorFor(f)}
                    onChange={onChange}
                  />
                ))}
              </div>
            )}

            {groups.map((g) => {
              const groupFields = visibleFields.filter((f) => f.group === g.id);
              if (!groupFields.length) return null;
              const body = (
                <div className="fields">
                  {groupFields.map((f) => (
                    <FieldControl
                      key={f.name}
                      field={f}
                      value={values[f.name]}
                      error={errorFor(f)}
                      onChange={onChange}
                    />
                  ))}
                </div>
              );
              return g.collapsible ? (
                <details className="acc" key={g.id} open={g.defaultOpen}>
                  <summary>{t(g.title)}</summary>
                  <div className="acc-body">{body}</div>
                </details>
              ) : (
                <fieldset key={g.id} style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="section-label" style={{ marginBottom: 10 }}>
                    {t(g.title)}
                  </legend>
                  {body}
                </fieldset>
              );
            })}

            <div className="btn-row no-print live-row">
              <span className="live-note">
                <Icon name="refresh" size={14} />
                {t('Results update as you type')}
              </span>
              <button type="button" className="btn ghost sm" onClick={reset}>
                <Icon name="refresh" size={15} />
                {t('Reset')}
              </button>
            </div>

            {!valid && (
              <div className="error" role="alert">
                <Icon name="alert" size={14} strokeWidth={2} />
                {t('Please fix the highlighted fields to see your result.')}
              </div>
            )}
          </div>
        </div>

        {/* ---------------- Results ---------------- */}
        {/* Mirrors the inputs card: same shape, same numbered header, its own
            tint — so the two halves read as two labelled steps rather than a
            form on the left and loose tiles on the right. */}
        <div className="card accent-top lift panel-result" ref={resultRef}>
          <div className="card-head">
            <span className="step-dot" aria-hidden="true">
              2
            </span>
            <span className="section-label">{t('Results')}</span>
          </div>

          <div className="card-pad stack">
            {result ? (
              <>
                <div className="anim-zoom">
                  <HeroResult heroes={heroes} />
                </div>

                {stats.length > 0 && <StatGrid stats={stats} />}

                {extra}

                <div className="btn-row no-print" style={{ justifyContent: 'flex-start' }}>
                  <button type="button" className="btn subtle sm" onClick={onCopy}>
                    <Icon name="copy" size={15} />
                    {t('Copy')}
                  </button>
                  <button type="button" className="btn subtle sm" onClick={onShare}>
                    <Icon name="share" size={15} />
                    {t('Share')}
                  </button>
                  <button type="button" className="btn subtle sm" onClick={onCopyLink}>
                    <Icon name="link" size={15} />
                    {t('Copy link')}
                  </button>
                  <button type="button" className="btn subtle sm" onClick={printPage}>
                    <Icon name="printer" size={15} />
                    {t('Print / PDF')}
                  </button>
                </div>
              </>
            ) : (
              <div className="result-placeholder">
                <span className="p-ring">
                  <Icon name="calculator" size={26} />
                </span>
                <span className="p-title">{t('Your result appears here')}</span>
                <p className="p-text">{t('Fill in the details on the left to see your result.')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {charts.length > 0 && (
        <div className="stack" style={{ marginTop: 16 }}>
          {charts.map((spec, i) => (
            <section className="card card-pad lift" key={i}>
              <Chart spec={spec} />
            </section>
          ))}
        </div>
      )}

      {table && (
        <div style={{ marginTop: 16 }}>
          <DataTable spec={table} />
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <ContentSections content={def.content} name={meta.name} />
      </div>

      {related.length > 0 && (
        <section className="section no-print" aria-labelledby="related-head">
          <div className="section-head">
            <h2 id="related-head">{t('Related calculators')}</h2>
          </div>
          <div className="tile-grid">
            {related.map((c) => (
              <CalculatorTile key={c.id} calc={c} />
            ))}
          </div>
        </section>
      )}

      <p className="small muted" style={{ marginTop: 18 }}>
        Finora runs entirely in your browser — the figures you enter are never sent anywhere. Results are
        estimates for planning only, not financial, tax or investment advice.
      </p>
    </article>
  );
}

const touchedFor = (linked: Values): Record<string, boolean> =>
  Object.fromEntries(Object.keys(linked).map((k) => [k, true]));
