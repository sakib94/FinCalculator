import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Field, WorkspaceProps } from '@/calculators/types';
import {
  SKIRTING,
  calculateFlooringEstimate,
  validateFlooring,
  type FlooringInput,
  type FlooringResult,
  type Quantity,
  type SupportingKey,
} from '@/engines/flooring';
import {
  blankInput,
  defaultState,
  restoreState,
  type FlooringState,
  type FlooringTab,
} from '@/calculators/everyday/flooringModel';
import {
  ESTIMATE_CSV_COLUMNS,
  SUPPORTING_META,
  estimateCsvRows,
  rate,
  reqQuantity,
  sqft,
  summaryText,
  workings,
} from '@/calculators/everyday/flooringReport';
import { formatDate, formatINR, formatPercent, toISODate } from '@/lib/format';
import { copyText, downloadCSV, printPage, toCSV } from '@/lib/export';
import { readLocal, writeLocal } from '@/lib/storage';
import { useT } from '@/hooks/PreferencesContext';
import { FieldControl } from './FieldControl';
import { CompositionBar } from './CalcPageParts';
import { CalcPopup } from './CalcPopup';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';
import { useToast } from './Toast';

/** v3: automatic skirting and two marble areas. Saves from earlier versions are not read. */
const STORAGE_KEY = 'flooring-estimate-v3';

/**
 * Tile & Marble Cost Calculator.
 *
 * Two tabs — Tile and Marble — over one project. The homeowner enters the
 * areas they have worked out and today's rates; skirting, wastage, labour,
 * setting materials and an
 * extra-expenses allowance are added automatically. A running project
 * total sits beside the inputs, and the combined summary, with the
 * working behind every figure, follows underneath.
 */
export function FlooringWorkspace({ heroRef, onHero }: WorkspaceProps) {
  const t = useT();
  const { notify } = useToast();
  const [state, setState] = useState<FlooringState>(() => restoreState(readLocal<unknown>(STORAGE_KEY, null)));
  const { input, tab, projectName } = state;

  useEffect(() => {
    const timer = window.setTimeout(() => writeLocal(STORAGE_KEY, state), 300);
    return () => window.clearTimeout(timer);
  }, [state]);

  const setInput = (fn: (i: FlooringInput) => FlooringInput) => setState((s) => ({ ...s, input: fn(s.input) }));
  function patch<K extends PatchKey>(key: K, part: Partial<FlooringInput[K]>) {
    setInput((i) => ({ ...i, [key]: { ...i[key], ...part } }));
  }
  const setTab = (next: FlooringTab) => setState((s) => ({ ...s, tab: next }));

  const issues = useMemo(() => validateFlooring(input), [input]);
  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const i of issues) map[i.path] ??= i.message;
    return map;
  }, [issues]);
  const err = (path: string) => (errors[path] ? t(errors[path]) : undefined);
  const valid = issues.length === 0;
  // Always priced, so the tab totals keep moving while one field is wrong;
  // the project total is shown only when every input is valid.
  const r = useMemo(() => calculateFlooringEstimate(input), [input]);

  useEffect(() => {
    onHero(
      valid
        ? {
            label: 'Total project cost',
            value: formatINR(r.grandTotal),
            caption: r.averagePerSqft != null ? `${rate(round2(r.averagePerSqft))} per sq ft` : undefined,
          }
        : null,
    );
  }, [valid, r.grandTotal, r.averagePerSqft, onHero]);

  const today = useMemo(() => new Date(), []);
  const tileIssues = issues.some((i) => i.path.startsWith('tile.'));
  const marbleIssues = issues.some((i) => i.path.startsWith('marble.'));

  /* ---------------- Actions ---------------- */

  const resetExample = () => {
    setState((s) => ({ ...defaultState(), tab: s.tab }));
    notify(t('Example restored'));
  };
  const startBlank = () => {
    setState({ input: blankInput(), tab: 'tile', projectName: '' });
    notify(t('Cleared — enter your own areas and rates'));
  };
  const onCopy = async () => {
    const ok = await copyText(`${t('Tile & Marble Cost Calculator')}\n${summaryText(r, projectName)}`);
    notify(ok ? t('Result copied') : t('Could not copy'));
  };
  const onCsv = () => {
    const rows = estimateCsvRows(r, projectName, toISODate(today));
    const slug = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadCSV(`paisewise-tile-marble-estimate${slug ? `-${slug}` : ''}`, toCSV(ESTIMATE_CSV_COLUMNS, rows));
    notify(t('CSV downloaded'));
  };

  const actions = (
    <div className="btn-row no-print fl-actions">
      <button type="button" className="btn subtle sm" onClick={onCopy}>
        <Icon name="copy" size={15} />
        {t('Copy')}
      </button>
      <button type="button" className="btn subtle sm" onClick={printPage}>
        <Icon name="printer" size={15} />
        {t('Print / PDF')}
      </button>
      <button type="button" className="btn subtle sm" onClick={onCsv}>
        <Icon name="download" size={15} />
        CSV
      </button>
    </div>
  );

  /* ---------------- Tabs ---------------- */

  const tabRefs = useRef<Record<FlooringTab, HTMLButtonElement | null>>({ tile: null, marble: null });
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next: FlooringTab = e.key === 'Home' ? 'tile' : e.key === 'End' ? 'marble' : tab === 'tile' ? 'marble' : 'tile';
    setTab(next);
    tabRefs.current[next]?.focus();
  };
  /** Switch tab from elsewhere on the page and bring the tabs into view. */
  const goTo = (next: FlooringTab) => {
    setTab(next);
    requestAnimationFrame(() => {
      const el = tabRefs.current[next];
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const tabButton = (id: FlooringTab, label: string, icon: ReactNode, area: number, total: number, hasIssue: boolean) => (
    <button
      ref={(el) => {
        tabRefs.current[id] = el;
      }}
      type="button"
      role="tab"
      id={`fl-tab-${id}`}
      aria-selected={tab === id}
      aria-controls={`fl-panel-${id}`}
      tabIndex={tab === id ? 0 : -1}
      className={`fl-tab${tab === id ? ' on' : ''}`}
      onClick={() => setTab(id)}
      onKeyDown={onTabKey}
    >
      <span className="fl-tab-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="fl-tab-text">
        <span className="fl-tab-name">
          {label}
          {hasIssue && (
            <span className="fl-tab-alert" title={t('Needs attention')}>
              <span className="sr-only">{t('Needs attention')}</span>
            </span>
          )}
        </span>
        <span className="fl-tab-meta num">
          <span>{sqft(area)}</span>
          <span className="fl-tab-total">{formatINR(total)}</span>
        </span>
      </span>
    </button>
  );

  /* ================================================================ */

  return (
    <>
      <div className="fl-grid" id="calc-tool">
        <div className="fl-main no-print">
          {/* ------------------------- Tile | Marble ------------------------- */}
          <div className="card panel-input fl-card">
            <div className="fl-tabs" role="tablist" aria-label={t('Tile or marble')}>
              {tabButton('tile', t('Tile'), <TileGlyph />, r.tile.quantity.area, r.tile.total, tileIssues)}
              {tabButton('marble', t('Marble'), <MarbleGlyph />, r.marble.quantity.area, r.marble.total, marbleIssues)}
            </div>

            {tab === 'tile' ? (
              <div className="fl-panel" role="tabpanel" id="fl-panel-tile" aria-labelledby="fl-tab-tile">
                <AreaField
                  path="tile.area"
                  label="Total Tile Area"
                  help="Enter the total usable tile area. Include all rooms, hall, kitchen, bathroom, etc. that will use tiles."
                  value={input.tile.area}
                  error={err('tile.area') ?? (errors.area ? t(errors.area) : undefined)}
                  onChange={(v) => patch('tile', { area: v })}
                />

                <SkirtingToggle
                  checked={input.tile.skirting}
                  onChange={(on) => patch('tile', { skirting: on })}
                  label={t('Add tile skirting')}
                  q={r.tile.quantity}
                />

                <QuantityFlow q={r.tile.quantity} noun="tile" />

                <div className="fields">
                  <Num
                    path="tile.rate"
                    label="Tile Rate"
                    type="currency"
                    unit="/ sq ft"
                    value={input.tile.rate}
                    error={err('tile.rate')}
                    onChange={(v) => patch('tile', { rate: v })}
                    help="The price per sq ft you are quoted — any tile, any brand."
                  />
                  <Num
                    path="tile.labourRate"
                    label="Tile Labour Cost"
                    type="currency"
                    unit="/ sq ft"
                    value={input.tile.labourRate}
                    error={err('tile.labourRate')}
                    onChange={(v) => patch('tile', { labourRate: v })}
                    help="Laying charge per sq ft, paid on the tile area you entered."
                  />
                </div>

                <TabSummary
                  title={t('Tile Summary')}
                  rows={[
                    [t('Base tile area'), sqft(r.tile.quantity.area)],
                    [t('Estimated skirting'), sqft(r.tile.quantity.skirting)],
                    [t('Wastage'), sqft(r.tile.quantity.wastage)],
                    [t('Total tile required'), sqft(r.tile.quantity.required)],
                    [t('Tile rate'), `${rate(r.tile.rate)} / sq ft`],
                    [t('Tile material cost'), formatINR(r.tile.material)],
                    [t('Tile labour'), formatINR(r.tile.labour)],
                  ]}
                  totalLabel={t('Tile Total')}
                  total={r.tile.total}
                />

                <button type="button" className="btn outline sm fl-next" onClick={() => goTo('marble')}>
                  {t('Next: Marble')}
                  <Icon name="chevronRight" size={15} />
                </button>
              </div>
            ) : (
              <div className="fl-panel" role="tabpanel" id="fl-panel-marble" aria-labelledby="fl-tab-marble">
                <SubCard icon="home" title={t('Marble Floor & Kitchen Platform')} total={r.marble.floorLabour}>
                  <AreaField
                    path="marble.floorArea"
                    label="Total Marble Area (Floor & Kitchen)"
                    help="Marble floor and kitchen platform, as you have worked it out."
                    value={input.marble.floorArea}
                    error={err('marble.floorArea') ?? (errors.area ? t(errors.area) : undefined)}
                    onChange={(v) => patch('marble', { floorArea: v })}
                  />
                  <div className="fields">
                    <Num
                      path="marble.floorLabourRate"
                      label="Labour Cost (floor & platform)"
                      type="currency"
                      unit="/ sq ft"
                      value={input.marble.floorLabourRate}
                      error={err('marble.floorLabourRate')}
                      onChange={(v) => patch('marble', { floorLabourRate: v })}
                      help="Laying charge per sq ft for the marble floor and kitchen platform."
                    />
                  </div>
                  <SkirtingToggle
                    checked={input.marble.skirting}
                    onChange={(on) => patch('marble', { skirting: on })}
                    label={t('Do you want marble skirting?')}
                    q={r.marble.quantity}
                  />
                </SubCard>

                <SubCard icon="layers" title={t('Marble Windows & Stairs')} total={r.marble.trimLabour}>
                  <AreaField
                    path="marble.trimArea"
                    label="Total Marble Area (Windows & Stairs)"
                    help="Window sills, frames and stair treads and risers, as you have worked them out."
                    value={input.marble.trimArea}
                    error={err('marble.trimArea')}
                    onChange={(v) => patch('marble', { trimArea: v })}
                  />
                  <div className="fields">
                    <Num
                      path="marble.trimLabourRate"
                      label="Labour Cost (windows & stairs)"
                      type="currency"
                      unit="/ sq ft"
                      value={input.marble.trimLabourRate}
                      error={err('marble.trimLabourRate')}
                      onChange={(v) => patch('marble', { trimLabourRate: v })}
                      help="Finishing charge per sq ft for windows and stairs — usually higher than floor laying."
                    />
                  </div>
                </SubCard>

                <div className="fields">
                  <Num
                    path="marble.rate"
                    label="Marble Rate"
                    type="currency"
                    unit="/ sq ft"
                    value={input.marble.rate}
                    error={err('marble.rate')}
                    onChange={(v) => patch('marble', { rate: v })}
                    help="The price per sq ft you are quoted — for all the marble above."
                  />
                </div>

                <QuantityFlow q={r.marble.quantity} noun="marble" />

                <TabSummary
                  title={t('Marble Summary')}
                  rows={[
                    [t('Floor & platform area'), sqft(r.marble.floorArea)],
                    [t('Windows & stairs area'), sqft(r.marble.trimArea)],
                    [t('Estimated skirting'), sqft(r.marble.quantity.skirting)],
                    [t('Wastage'), sqft(r.marble.quantity.wastage)],
                    [t('Total marble required'), sqft(r.marble.quantity.required)],
                    [t('Marble rate'), `${rate(r.marble.rate)} / sq ft`],
                    [t('Marble material'), formatINR(r.marble.material)],
                    [t('Floor & platform labour'), formatINR(r.marble.floorLabour)],
                    [t('Window & stair labour'), formatINR(r.marble.trimLabour)],
                  ]}
                  totalLabel={t('Marble Section Total')}
                  total={r.marble.total}
                />

                <button type="button" className="btn outline sm fl-next" onClick={() => goTo('tile')}>
                  <Icon name="arrowLeft" size={15} />
                  {t('Back to Tile')}
                </button>
              </div>
            )}
          </div>

          {/* ------------------------- Shared: materials & extras ------------------------- */}
          <div className="card panel-input fl-card">
            <div className="card-head">
              <span className="fl-head-icon" aria-hidden="true">
                <Icon name="layers" size={16} />
              </span>
              <h2 className="fl-card-title">{t('Estimated Supporting Materials')}</h2>
              <span className="fl-card-sum num">{formatINR(r.material.supporting)}</span>
            </div>
            <div className="card-pad fl-panel">
              <p className="small muted fl-intro">{t('Enter today’s rates — the quantities are worked out for you from the tile and marble areas.')}</p>
              <div className="fl-materials">
                {r.supporting.map((s) => (
                  <MaterialRow
                    key={s.key}
                    k={s.key}
                    value={input.rates[s.key]}
                    error={err(`rates.${s.key}`)}
                    onChange={(v) => setInput((i) => ({ ...i, rates: { ...i.rates, [s.key]: v } }))}
                    quantity={reqQuantity(s)}
                    cost={s.cost}
                  />
                ))}
              </div>
              <p className="fl-fine">
                <Icon name="info" size={13} />
                <strong>{t('Estimated quantities:')}</strong>{' '}
                {t(
                  'Sand, cement, white cement and grout are calculated using configurable assumptions. Actual requirements may vary depending on site conditions and installation method.',
                )}
              </p>
            </div>

            <div className="card-pad fl-panel fl-card-foot">
              <TextField
                id="fl-project"
                label={t('Name this estimate (optional)')}
                value={projectName}
                placeholder={t('e.g. Sharma residence')}
                onChange={(v) => setState((s) => ({ ...s, projectName: v }))}
                maxLength={80}
              />

              <div className="btn-row live-row">
                <span className="live-note">
                  <Icon name="refresh" size={14} className="i" />
                  {t('Results update as you type')}
                </span>
                <span className="btn-row">
                  <button type="button" className="btn ghost sm" onClick={startBlank}>
                    {t('Start blank')}
                  </button>
                  <button type="button" className="btn ghost sm" onClick={resetExample}>
                    <Icon name="refresh" size={15} />
                    {t('Reset')}
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------- Running project total ------------------------- */}
        <aside className="fl-side no-print" aria-label={t('Project total')}>
          <div className="card panel-result fl-result" id="calc-result">
            <div className="card-head">
              <span className="section-label">{t('Project total')}</span>
            </div>
            <div className="card-pad stack">
              {valid ? (
                <>
                  <div ref={heroRef} className="anim-zoom">
                    <div className="hero-result">
                      <div className="h-label">{t('Total project cost')}</div>
                      <div className={`h-value num value-in${fit(formatINR(r.grandTotal))}`}>{formatINR(r.grandTotal)}</div>
                      <div className="h-caption">
                        {r.averagePerSqft != null
                          ? `${rate(round2(r.averagePerSqft))} ${t('average per sq ft')} · ${sqft(r.baseArea)}`
                          : t('Enter an area to see the cost per sq ft')}
                      </div>
                    </div>
                  </div>

                  <div className="fl-tabtotals">
                    <button type="button" className={`fl-tt${tab === 'tile' ? ' on' : ''}`} onClick={() => goTo('tile')}>
                      <span>{t('Tile')}</span>
                      <strong className="num">{formatINR(r.tile.total)}</strong>
                    </button>
                    <button type="button" className={`fl-tt${tab === 'marble' ? ' on' : ''}`} onClick={() => goTo('marble')}>
                      <span>{t('Marble')}</span>
                      <strong className="num">{formatINR(r.marble.total)}</strong>
                    </button>
                  </div>

                  <CompositionBar
                    spec={{
                      kind: 'donut',
                      title: 'Where the money goes',
                      data: [
                        { label: 'Tile & marble', value: r.material.flooring },
                        { label: 'Labour', value: r.labour.total },
                        { label: 'Supporting materials', value: r.material.supporting },
                        { label: 'Extra expenses', value: r.extra },
                      ],
                      format: (n) => formatINR(n),
                    }}
                  />

                  <TotalsList r={r} />
                  {actions}
                </>
              ) : (
                <div className="result-placeholder fl-issues">
                  <span className="p-ring">
                    <Icon name="alert" size={24} />
                  </span>
                  <span className="p-title">{t('Fix these to see your project total')}</span>
                  <ul>
                    {issues.slice(0, 6).map((i) => (
                      <li key={i.path}>
                        {tabFor(i.path) ? (
                          <button type="button" className="fl-link" onClick={() => goTo(tabFor(i.path) as FlooringTab)}>
                            {t(i.message)}
                          </button>
                        ) : (
                          t(i.message)
                        )}
                      </li>
                    ))}
                    {issues.length > 6 && <li>{t('…and {n} more').replace('{n}', String(issues.length - 6))}</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {valid && (
        <>
          <ProjectSummary r={r} projectName={projectName} date={today} />
          <Workings r={r} />
        </>
      )}

      <p className="note warn fl-disclaimer">
        <Icon name="alert" size={16} className="i" />
        <span>
          <strong>{t('Estimate only:')}</strong>{' '}
          {t(
            'Sand, cement, white cement and grout quantities are estimated using configurable consumption assumptions. Actual quantities may vary based on surface condition, mortar thickness, installation method, material thickness and site conditions. Verify final quantities with your contractor before purchasing materials.',
          )}
        </span>
      </p>
    </>
  );
}

type PatchKey = 'tile' | 'marble';

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Steps the headline size down for long figures, as the other calculators do. */
const fit = (value: string) => (value.length > 13 ? ' xs' : value.length > 10 ? ' sm' : '');

/** Which tab holds the input an issue is about; null for the shared inputs. */
function tabFor(path: string): FlooringTab | null {
  if (path === 'area' || path.startsWith('tile.')) return 'tile';
  if (path.startsWith('marble.')) return 'marble';
  return null;
}

/* ================================================================== */
/* Results                                                             */
/* ================================================================== */

/** Material · Labour · Supporting · Extra — adds up to the project total. */
function TotalsList({ r }: { r: FlooringResult }) {
  const t = useT();
  return (
    <dl className="fl-split">
      <div>
        <dt>{t('Tile & marble material')}</dt>
        <dd className="num">{formatINR(r.material.flooring)}</dd>
      </div>
      <div>
        <dt>{t('Total labour')}</dt>
        <dd className="num">{formatINR(r.labour.total)}</dd>
      </div>
      <div>
        <dt>{t('Supporting materials')}</dt>
        <dd className="num">{formatINR(r.material.supporting)}</dd>
      </div>
      <div>
        <dt>
          {t('Extra expenses')} ({formatPercent(r.extraPct, 2)})
        </dt>
        <dd className="num">{formatINR(r.extra)}</dd>
      </div>
      <div className="fl-split-total">
        <dt>{t('Total project cost')}</dt>
        <dd className="num">{formatINR(r.grandTotal)}</dd>
      </div>
    </dl>
  );
}

/**
 * One compact bill: four sections — flooring, labour, supporting materials,
 * other — each with its items and a subtotal, every amount in one column,
 * and the total underneath. Copy, print and CSV live in the result panel.
 */
function ProjectSummary({ r, projectName, date }: { r: FlooringResult; projectName: string; date: Date }) {
  const t = useT();
  const m = r.marble;
  const section = (title: string, rows: [string, string, number][], totalLabel?: string, total?: number) => (
    <tbody>
      <tr className="fl-bill-section">
        <th scope="rowgroup" colSpan={3}>
          {title}
        </th>
      </tr>
      {rows.map(([label, qty, cost]) => (
        <tr key={label}>
          <th scope="row">{label}</th>
          <td className="num fl-bill-qty">{qty}</td>
          <td className="num">{formatINR(cost)}</td>
        </tr>
      ))}
      {totalLabel && total != null && (
        <tr className="fl-bill-sub">
          <th scope="row" colSpan={2}>
            {totalLabel}
          </th>
          <td className="num">{formatINR(total)}</td>
        </tr>
      )}
    </tbody>
  );

  return (
    <section className="calc-block" id="fl-summary" aria-labelledby="fl-summary-head">
      <div className="card fl-summary">
        <div className="fl-summary-head">
          <p className="eyebrow">{t('Combined Project Summary')}</p>
          <h2 id="fl-summary-head">{projectName.trim() || t('Tile & marble estimate')}</h2>
          <p className="small muted">
            {t('Prepared on')} {formatDate(date)} · {t('Tile')} {sqft(r.tile.quantity.area)} · {t('Marble')} {sqft(m.quantity.area)}
          </p>
        </div>

        <table className="fl-bill">
          <thead className="sr-only">
            <tr>
              <th scope="col">{t('Item')}</th>
              <th scope="col">{t('Quantity')}</th>
              <th scope="col">{t('Cost')}</th>
            </tr>
          </thead>
          {section(
            t('Flooring'),
            [
              [t('Tile material'), sqft(r.tile.quantity.required), r.tile.material],
              [t('Marble material'), sqft(m.quantity.required), m.material],
            ],
            t('Flooring Material Total'),
            r.material.flooring,
          )}
          {section(
            t('Labour'),
            [
              [t('Tile labour'), sqft(r.tile.quantity.area), r.labour.tile],
              [t('Marble floor & platform labour'), sqft(m.floorArea), r.labour.marbleFloor],
              [t('Marble window & stair labour'), sqft(m.trimArea), r.labour.marbleTrim],
            ],
            t('Total Labour'),
            r.labour.total,
          )}
          {section(
            t('Supporting Materials'),
            r.supporting.map((s) => [t(SUPPORTING_META[s.key].label), reqQuantity(s), s.cost] as [string, string, number]),
            t('Supporting Material Total'),
            r.material.supporting,
          )}
          {section(t('Other'), [[t('Extra expenses'), formatPercent(r.extraPct, 2), r.extra]])}
        </table>

        <div className="fl-grand">
          <div className="fl-grand-main">
            <span className="fl-grand-label">{t('Total Project Cost')}</span>
            <span className="fl-grand-value num">{formatINR(r.grandTotal)}</span>
          </div>
          {r.averagePerSqft != null && (
            <div className="fl-grand-avg-box">
              <span className="fl-grand-label">{t('Average flooring cost')}</span>
              <span className="fl-grand-avg num">{rate(round2(r.averagePerSqft))} / sq ft</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Workings({ r }: { r: FlooringResult }) {
  const t = useT();
  return (
    <section className="calc-block" id="fl-working" aria-labelledby="fl-working-head">
      <div className="block-head fl-block-head">
        <p className="eyebrow">{t('Calculation transparency')}</p>
        <h2 id="fl-working-head">{t('How each figure was worked out')}</h2>
      </div>
      <div className="fl-workings">
        {workings(r).map((b) => (
          <details className="acc" key={b.title}>
            <summary>
              <span>{t(b.title)}</span>
              <span className="fl-acc-value num">{formatINR(b.total)}</span>
            </summary>
            <div className="acc-body">
              <ul className="fl-steps">
                {b.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/* Input pieces                                                        */
/* ================================================================== */

/** Area → + skirting → subtotal → + wastage → total required, as a short ladder. */
function QuantityFlow({ q, noun }: { q: Quantity; noun: 'tile' | 'marble' }) {
  const t = useT();
  return (
    <div className="fl-flow" role="group" aria-label={noun === 'tile' ? t('Tile quantity') : t('Marble quantity')}>
      <div className="fl-flow-row">
        <span>{noun === 'tile' ? t('Base tile area') : t('Base marble area')}</span>
        <span className="num">{sqft(q.area)}</span>
      </div>
      <div className="fl-flow-row add">
        <span>+ {q.skirtingOn ? t('Skirting') : t('Skirting (not added)')}</span>
        <span className="num">{sqft(q.skirting)}</span>
      </div>
      <div className="fl-flow-row sub">
        <span>{t('Subtotal')}</span>
        <span className="num">{sqft(q.subtotal)}</span>
      </div>
      <div className="fl-flow-row add">
        <span>
          + {t('Wastage')} ({formatPercent(q.wastagePct, 2)})
        </span>
        <span className="num">{sqft(q.wastage)}</span>
      </div>
      <div className="fl-flow-row total">
        <span>{noun === 'tile' ? t('Total tile required') : t('Total marble required')}</span>
        <span className="num">{sqft(q.required)}</span>
      </div>
      <p className="fl-flow-note">
        {t('Labour is charged on your {area}. Skirting and wastage are added only to the material you buy.').replace('{area}', sqft(q.area))}
      </p>
    </div>
  );
}

/**
 * Skirting is worked out, never typed: area × 4 sides × 0.5 ft height ÷ a
 * 12 ft room side, i.e. area ÷ 6. The checkbox only says whether to add it.
 */
function SkirtingToggle({ checked, onChange, label, q }: { checked: boolean; onChange: (on: boolean) => void; label: string; q: Quantity }) {
  const t = useT();
  return (
    <label className={`fl-toggle${checked ? ' on' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="fl-toggle-box" aria-hidden="true">
        <Icon name="check" size={13} strokeWidth={3} />
      </span>
      <span className="fl-toggle-text">
        <span className="fl-toggle-label">
          {label}
          {checked && q.skirtingBase > 0 && <strong className="num"> + {sqft(q.skirting)}</strong>}
          {/* A button inside a label does not toggle the checkbox when clicked. */}
          <Tooltip
            text={t('Worked out for you: 6-inch skirting along the walls, estimated from {side} × {side} ft rooms (area ÷ 6).').replace(
              /\{side\}/g,
              String(SKIRTING.roomSideFt),
            )}
          />
        </span>
      </span>
    </label>
  );
}

function TabSummary({ title, rows, totalLabel, total }: { title: string; rows: [string, string][]; totalLabel: string; total: number }) {
  return (
    <div className="fl-tabsum">
      <h3>{title}</h3>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="num">{v}</dd>
          </div>
        ))}
        <div className="fl-tabsum-total">
          <dt>{totalLabel}</dt>
          <dd className="num">{formatINR(total)}</dd>
        </div>
      </dl>
    </div>
  );
}

function SubCard({ icon, title, total, children }: { icon: 'layers' | 'home'; title: string; total: number; children: ReactNode }) {
  return (
    <section className="fl-sub">
      <div className="fl-sub-head">
        <Icon name={icon} size={16} />
        <h3>{title}</h3>
        <span className="num">{formatINR(total)}</span>
      </div>
      <div className="fl-sub-body">{children}</div>
    </section>
  );
}

function MaterialRow({
  k,
  value,
  error,
  onChange,
  quantity,
  cost,
}: {
  k: SupportingKey;
  value: number;
  error?: string;
  onChange: (v: number) => void;
  quantity: string;
  cost: number;
}) {
  const t = useT();
  const m = SUPPORTING_META[k];
  return (
    <div className="fl-mat">
      <Num path={`rates.${k}`} label={`${m.label} rate`} type="currency" unit={`/ ${m.rateUnit}`} value={value} error={error} onChange={onChange} />
      <div className="fl-mat-est" aria-live="polite">
        <span className="fl-mat-label">
          {t('Required')} <span className="fl-est-tag">{t('estimated')}</span>
        </span>
        <strong className="num">{quantity}</strong>
        <span className="num fl-mat-cost">{value > 0 ? formatINR(cost) : t('add a rate')}</span>
      </div>
    </div>
  );
}

interface NumProps {
  path: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  type?: 'number' | 'currency' | 'percent';
  unit?: string;
  help?: string;
  error?: string;
  wide?: boolean;
}

/** A numeric field. Empty reads as zero, so it shows as a blank box rather than "0". */
function Num({ path, label, value, onChange, type = 'number', unit, help, error, wide }: NumProps) {
  const field = useMemo<Field>(
    () => ({ name: path, label, type, default: 0, unit, help, wide, placeholder: '0' }),
    [path, label, type, unit, help, wide],
  );
  return (
    <FieldControl
      field={field}
      value={value === 0 ? '' : value}
      error={error}
      onChange={(_, v) => onChange(v === '' ? 0 : typeof v === 'number' ? v : Number(v) || 0)}
    />
  );
}

/** The headline input of each tab, with its helper text always in view. */
function AreaField({
  path,
  label,
  help,
  value,
  error,
  onChange,
}: {
  path: string;
  label: string;
  help: string;
  value: number;
  error?: string;
  onChange: (v: number) => void;
}) {
  const t = useT();
  const [calcOpen, setCalcOpen] = useState(false);
  return (
    <div className="fl-area-field">
      <div className="fl-area-row">
        <Num path={path} label={label} unit="sq ft" value={value} error={error} onChange={onChange} />
        <button
          type="button"
          className="fl-calc-btn"
          onClick={() => setCalcOpen(true)}
          aria-haspopup="dialog"
          aria-label={t('Open calculator for {field}').replace('{field}', t(label))}
          title={t('Calculator')}
        >
          <Icon name="calculator" size={19} />
          <span>{t('Calculator')}</span>
        </button>
      </div>
      <p className="fl-help">{t(help)}</p>
      <CalcPopup
        open={calcOpen}
        title={t(label)}
        unit="sq ft"
        initial={value}
        onUse={onChange}
        onClose={() => setCalcOpen(false)}
      />
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field fl-text">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-wrap">
        <input
          id={id}
          className="input"
          type="text"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/** A 2 × 2 tile grid. */
function TileGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

/** A single slab with veining. */
function MarbleGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 14c3-1 4-4 7-4s3 3 6 2 3-4 5-4" opacity="0.7" />
      <path d="M8 21c1-2 3-3 5-3s3-2 4-3" opacity="0.5" />
    </svg>
  );
}
