import type { ReactNode } from 'react';
import type { ChartSpec } from '@/calculators/types';
import type { AmountScenarios, PrepaymentPlan, ScenarioRow, TenureRow, TopUpInput, TopUpResult } from '@/engines/topup';
import type { PinnedOption, TopUpState } from '@/calculators/loans/topUpModel';
import {
  TENURE_CSV_COLUMNS,
  amountTakeaway,
  bottomLine,
  compareTakeaway,
  lakh,
  matrixAdvice,
  money,
  personalPoints,
  prepayTakeaway,
  ratePct,
  recommendationText,
  scheduleTable,
  tenureCsvRows,
  tenureTakeaway,
  verdictTitle,
  when,
  yrAdj,
  yrs,
} from '@/calculators/loans/topUpReport';
import { formatINR, formatSignedINR } from '@/lib/format';
import { downloadCSV, toCSV } from '@/lib/export';
import { TweenedText } from '@/lib/tween';
import { useT } from '@/hooks/PreferencesContext';
import { Chart } from './Chart';
import { DataTable } from './DataTable';
import { Icon, type IconName } from './Icon';
import { Num, Seg } from './WorkspaceFields';
import { useToast } from './Toast';

interface Props {
  r: TopUpResult;
  input: TopUpInput;
  state: TopUpState;
  errors: Record<string, string>;
  onScenarios: (part: Partial<AmountScenarios>) => void;
  onRequired: (v: number) => void;
  onPrepay: (part: Partial<PrepaymentPlan>) => void;
  onComfortable: (v: number) => void;
  onChooseTenure: (months: number) => void;
  onSchedule: (view: 'monthly' | 'yearly') => void;
  onPin: () => void;
  onUnpin: (id: string) => void;
}

/**
 * Everything under the inputs, numbered on from the three input steps so
 * the page reads as one journey: 4 compare → 5 tenure → 6 amount →
 * 7 prepayment → 8 decision, then the schedule. Each section opens with a
 * one-line takeaway, its key figure in bold.
 */
export function TopUpSections(p: Props) {
  return (
    <>
      <CompareSection r={p.r} />
      <TenureSection r={p.r} input={p.input} onComfortable={p.onComfortable} onChooseTenure={p.onChooseTenure} />
      <AmountSection r={p.r} input={p.input} errors={p.errors} onScenarios={p.onScenarios} onRequired={p.onRequired} />
      <PrepaySection r={p.r} input={p.input} errors={p.errors} onPrepay={p.onPrepay} />
      <DecisionSection r={p.r} input={p.input} pinned={p.state.pinned} onPin={p.onPin} onUnpin={p.onUnpin} />
      <ScheduleSection r={p.r} view={p.state.schedule} onSchedule={p.onSchedule} />
    </>
  );
}

/* ================================================================== */
/* Shared pieces                                                       */
/* ================================================================== */

/**
 * Text with its figures marked by meaning — ++gain++, ~~cost~~,
 * **key fact** — drawn as coloured, bold highlights.
 */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*.+?\*\*|\+\+.+?\+\+|~~.+?~~)/).map((part, i) => {
        const mark = part.slice(0, 2);
        const tone = mark === '++' ? 'good' : mark === '~~' ? 'cost' : mark === '**' ? 'key' : null;
        return tone && part.length > 4 ? (
          <strong key={i} className={`tu-hl ${tone}`}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        );
      })}
    </>
  );
}

function SectionHead({
  id,
  n,
  eyebrow,
  title,
  takeaway,
  icon = 'sparkle',
  tone = 'info',
  children,
}: {
  id: string;
  n?: number;
  eyebrow: string;
  title: string;
  takeaway?: string | null;
  icon?: IconName;
  tone?: 'info' | 'good' | 'warn';
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="block-head tu-block-head">
      <div className="tu-sec-title">
        {n != null && (
          <span className="tu-step-n" aria-hidden="true">
            {n}
          </span>
        )}
        <div>
          <p className="eyebrow">{t(eyebrow)}</p>
          <h2 id={id}>{t(title)}</h2>
        </div>
      </div>
      {children}
      {takeaway && (
        <p className={`tu-takeaway ${tone}`}>
          <Icon name={icon} size={17} className="tu-takeaway-i" />
          <span>
            <Rich text={takeaway} />
          </span>
        </p>
      )}
    </div>
  );
}

/** Never let a negative figure draw a bar below the axis. */
const pos = (v: number) => Math.max(0, v);

/* ================================================================== */
/* 4 · Compare options                                                 */
/* ================================================================== */

type Better = 'good' | 'warn' | 'neutral';

function CompareSection({ r }: { r: TopUpResult }) {
  const t = useT();
  const e = r.existing;
  const o = r.option;
  const saving = o.additionalInterest < 0;
  const chart: ChartSpec = {
    kind: 'bar',
    title: 'Existing loan vs top-up, from today',
    x: ['Principal', 'Future interest', 'Total payments'],
    series: [
      { name: 'Without top-up', values: [e.outstanding, e.futureInterest, e.remainingPayments] },
      { name: 'With top-up', values: [o.loan, o.futureInterest, o.totalPayments] },
    ],
  };
  const tone = (v: number, lowerIsBetter = true): Better => (Math.abs(v) < 0.5 ? 'neutral' : v < 0 === lowerIsBetter ? 'good' : 'warn');
  const rows: { label: string; a: string; b: string; change: string; better: Better; key?: boolean }[] = [
    { label: 'Loan amount', a: money(e.outstanding), b: money(o.loan), change: formatSignedINR(o.loan - e.outstanding), better: 'neutral' },
    { label: 'Cash in your hand', a: '—', b: money(o.charges.net), change: formatSignedINR(o.charges.net), better: 'good' },
    { label: 'Monthly EMI', a: money(e.emi), b: money(o.emi), change: formatSignedINR(o.emiChange), better: tone(o.emiChange) },
    {
      label: 'Time left to pay',
      a: yrs(e.remainingMonths),
      b: yrs(o.months),
      change: o.extensionMonths === 0 ? '—' : `${o.extensionMonths > 0 ? '+' : '−'}${yrs(Math.abs(o.extensionMonths))}`,
      better: tone(o.extensionMonths),
    },
    { label: 'Total payments', a: money(e.remainingPayments), b: money(o.totalPayments), change: formatSignedINR(o.additionalPayments), better: 'neutral' },
    {
      label: 'Interest from today',
      a: money(e.futureInterest),
      b: money(o.futureInterest),
      change: formatSignedINR(o.additionalInterest),
      better: tone(o.additionalInterest),
      key: true,
    },
    { label: 'Last EMI', a: when(e.completion), b: when(o.completion), change: '', better: 'neutral' },
  ];

  return (
    <section className="calc-block" id="tu-compare" aria-labelledby="tu-compare-head">
      <SectionHead
        id="tu-compare-head"
        n={4}
        eyebrow="Compare options"
        title="Continue as you are, or take the top-up?"
        takeaway={compareTakeaway(r)}
        icon="scale"
        tone={saving ? 'good' : o.interestPerRupee > 0.5 ? 'warn' : 'info'}
      />

      <div className="card tu-cmp" role="table" aria-label={t('Without top-up compared with the top-up, from today')}>
        <div className="tu-cmp-row tu-cmp-head" role="row">
          <span role="columnheader" className="tu-cmp-label">
            <span className="sr-only">{t('Item')}</span>
          </span>
          <span role="columnheader">
            <span className="tu-cmp-tag">A</span>
            <span className="tu-cmp-long">{t('Without top-up')}</span>
            <span className="tu-cmp-short">{t('Without')}</span>
          </span>
          <span role="columnheader" className="b">
            <span className="tu-cmp-tag">B</span>
            <span className="tu-cmp-long">{t('With top-up')}</span>
            <span className="tu-cmp-short">{t('With')}</span>
          </span>
          <span role="columnheader">{t('Change')}</span>
        </div>
        {rows.map((row) => (
          <div className={`tu-cmp-row${row.key ? ' key' : ''}`} role="row" key={row.label}>
            <span role="rowheader" className="tu-cmp-label">
              {t(row.label)}
              {row.key && <span className="tu-key-tag">{t('Key figure')}</span>}
            </span>
            <span role="cell" className="num">
              {row.a}
            </span>
            <span role="cell" className="num b">
              {row.key ? <TweenedText value={row.b} /> : row.b}
            </span>
            <span role="cell" className={`num tu-change ${row.better}`}>
              {row.change}
            </span>
          </div>
        ))}
      </div>

      <div className="tu-metrics">
        <div className="card tu-metric">
          <span className="tu-metric-label">{t('Additional financing cost')}</span>
          <strong className="tu-metric-value num">
            <TweenedText value={formatSignedINR(o.additionalPayments)} />
          </strong>
          <p>
            {t('You receive')} <strong className="num">{lakh(o.charges.net)}</strong> {t('but commit to approximately')}{' '}
            <strong className="num">{lakh(o.additionalPayments)}</strong>{' '}
            {t('of additional future loan payments. This includes repayment of the borrowed principal, so not all of it is cost.')}
          </p>
        </div>
        <div className={`card tu-metric key ${saving ? 'good' : o.interestPerRupee > 0.5 ? 'warn' : 'calm'}`}>
          <span className="tu-metric-label">
            {saving ? t('Interest saved') : t('Additional interest')}
            <span className="tu-key-tag">{t('Key decision figure')}</span>
          </span>
          <strong className="tu-metric-value num">
            <TweenedText value={money(Math.abs(o.additionalInterest))} />
          </strong>
          <p>
            {saving
              ? t('The new terms are cheap enough that you pay less interest from today than on your current loan.')
              : `${t('The real cost of the top-up —')} ${formatINR(o.interestPerRupee, 2)} ${t('for every ₹1 you receive.')}`}
          </p>
          {!saving && o.interestSplit.existingBalance > 0 && (
            <dl className="tu-split">
              <div>
                <dt>
                  {t('Stretching today’s')} {lakh(e.outstanding)} {t('over')} {yrs(o.months)}
                </dt>
                <dd className="num">{money(o.interestSplit.existingBalance)}</dd>
              </div>
              <div>
                <dt>
                  {t('Interest on the new')} {lakh(o.grossTopUp)}
                </dt>
                <dd className="num">{money(o.interestSplit.newMoney)}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      <div className="chart-grid tu-charts">
        <div className="card card-pad lift chart-card">
          <Chart spec={chart} />
        </div>
        <div className="card card-pad lift">
          <Timeline r={r} />
        </div>
      </div>

      <div className="tu-sunk">
        <Icon name="calendarCheck" size={18} className="tu-sunk-i" />
        <div>
          <h3>{t('What about the interest you already paid?')}</h3>
          <p>
            {t('About')} <strong className="num">{money(e.historicalInterest)}</strong> {t('of your')} {e.emisPaid}{' '}
            {t(
              'EMIs so far went to interest. That is a sunk cost: it has already been paid and cannot be recovered whether you take the top-up or not. So the comparison above counts only what you pay from today — your outstanding principal and the EMIs still to come.',
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

/** How long each option runs, as two bars on one time scale. */
function Timeline({ r }: { r: TopUpResult }) {
  const t = useT();
  const a = r.existing.remainingMonths;
  const b = r.option.months;
  const max = Math.max(a, b, 1);
  const bar = (label: string, months: number, end: Date, extra: number, cls: string) => (
    <div className="tu-tl-row">
      <div className="tu-tl-label">
        <span>{label}</span>
        <span className="num">
          {yrs(months)} · {t('ends')} {when(end)}
        </span>
      </div>
      <div className="tu-tl-track">
        <span className={`tu-tl-fill ${cls}`} style={{ width: `${((months - extra) / max) * 100}%` }} />
        {extra > 0 && <span className="tu-tl-fill extra" style={{ width: `${(extra / max) * 100}%` }} />}
      </div>
    </div>
  );
  return (
    <figure className="tu-timeline">
      <figcaption className="section-label">{t('How long you keep paying')}</figcaption>
      {bar(t('Without top-up'), a, r.existing.completion, 0, 'a')}
      {bar(t('With top-up'), b, r.option.completion, Math.max(0, b - a), 'b')}
      <p className="tu-tl-note">
        {b > a && <span className="tu-tl-swatch" aria-hidden="true" />}
        <span>
          {b > a ? (
            <>
              {t('The top-up keeps you paying')} <strong>{yrs(b - a)}</strong> {t('longer.')}
            </>
          ) : b < a ? (
            <>
              {t('The top-up finishes')} <strong>{yrs(a - b)}</strong> {t('sooner.')}
            </>
          ) : (
            t('Both finish in the same month.')
          )}
        </span>
      </p>
    </figure>
  );
}

/* ================================================================== */
/* 5 · Choose tenure                                                   */
/* ================================================================== */

const TAG_LABEL: Record<string, string> = {
  'lowest-interest': 'Lowest interest',
  'lowest-emi': 'Lowest EMI',
  'best-balance': 'Recommended',
  selected: 'Your choice',
};

function TenureSection({
  r,
  input,
  onComfortable,
  onChooseTenure,
}: {
  r: TopUpResult;
  input: TopUpInput;
  onComfortable: (v: number) => void;
  onChooseTenure: (m: number) => void;
}) {
  const t = useT();
  const { notify } = useToast();
  const rec = r.recommendation;
  const o = r.option;
  const x = r.tenures.map((row) => yrs(row.months).replace(' years', ' yrs').replace(' year', ' yr'));
  const emiChart: ChartSpec = { kind: 'bar', title: 'EMI by tenure', xLabel: 'Tenure', x, series: [{ name: 'EMI', values: r.tenures.map((row) => row.emi) }] };
  const interestChart: ChartSpec = {
    kind: 'bar',
    title: 'Interest by tenure',
    xLabel: 'Tenure',
    x,
    series: [
      { name: 'Total interest', values: r.tenures.map((row) => row.interest) },
      { name: 'Additional interest', values: r.tenures.map((row) => pos(row.additionalInterest)) },
    ],
  };
  const exportCsv = () => {
    downloadCSV('paisewise-top-up-tenures', toCSV(TENURE_CSV_COLUMNS, tenureCsvRows(r)));
    notify(t('CSV downloaded'));
  };

  return (
    <section className="calc-block" id="tu-tenure" aria-labelledby="tu-tenure-head">
      <SectionHead
        id="tu-tenure-head"
        n={5}
        eyebrow="Choose tenure"
        title="Which tenure gives the best balance?"
        takeaway={tenureTakeaway(r)}
        icon="target"
        tone="good"
      />

      <div className="card tu-rec">
        <div className="tu-rec-main">
          <span className="tu-rec-icon" aria-hidden="true">
            <Icon name="target" size={20} />
          </span>
          <div>
            <p className="tu-rec-label">{rec.basis === 'none-fit' ? t('Closest balance') : t('Recommended tenure')}</p>
            <p className="tu-rec-value num">
              {yrs(rec.months)} <span>· EMI {money(rec.row.emi)}</span>
            </p>
            <p className="tu-rec-text">{t(recommendationText(r, input))}</p>
            {rec.months !== o.months && (
              <button type="button" className="btn primary sm no-print" onClick={() => onChooseTenure(rec.months)}>
                {t('Use')} {yrs(rec.months)}
                <Icon name="chevronRight" size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="tu-rec-field no-print">
          <Num
            path="tenure.comfortableEmi"
            label="Comfortable EMI"
            type="currency"
            value={input.topup.comfortableEmi}
            onChange={onComfortable}
            help="The most you can pay every month without strain. The recommendation is the shortest tenure within it."
          />
        </div>
      </div>

      <div className="card tu-table-card">
        <div className="card-head">
          <h3>{t('Tenure comparison')}</h3>
          <button type="button" className="btn outline sm no-print" style={{ marginLeft: 'auto' }} onClick={exportCsv}>
            <Icon name="download" size={15} />
            CSV
          </button>
        </div>
        <div className="table-scroll">
          <table className="data tu-tenure-table">
            <thead>
              <tr>
                <th scope="col">{t('Tenure')}</th>
                <th scope="col" className="num">
                  {t('EMI')}
                </th>
                <th scope="col" className="num">
                  {t('Total payment')}
                </th>
                <th scope="col" className="num">
                  {t('Interest')}
                </th>
                <th scope="col" className="num">
                  {t('Extra vs today')}
                </th>
                <th scope="col" className="num">
                  {t('Last EMI')}
                </th>
                <th scope="col" className="no-print">
                  <span className="sr-only">{t('Choose')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {r.tenures.map((row) => {
                const selected = row.tags.includes('selected');
                const best = row.tags.includes('best-balance');
                return (
                  <tr key={row.months} className={`${selected ? 'is-selected' : ''}${best ? ' is-best' : ''}`}>
                    <th scope="row">
                      <span className="tu-tenure-cell">
                        <span className="num">{yrs(row.months)}</span>
                        {row.tags
                          .filter((tag) => tag !== 'selected')
                          .map((tag) => (
                            <span key={tag} className={`tu-badge ${tag}`}>
                              {t(TAG_LABEL[tag])}
                            </span>
                          ))}
                      </span>
                    </th>
                    <td className="num">
                      {money(row.emi)}
                      {row.affordable === false && <span className="tu-over">{t('above comfort')}</span>}
                    </td>
                    <td className="num">{lakh(row.totalPayment)}</td>
                    <td className="num">{lakh(row.interest)}</td>
                    <td className="num">{formatSignedINR(row.additionalInterest)}</td>
                    <td className="num">{when(row.completion)}</td>
                    <td className="no-print">
                      <button type="button" className="btn subtle sm tu-choose" aria-pressed={selected} onClick={() => onChooseTenure(row.months)}>
                        {selected ? (
                          <>
                            <Icon name="check" size={14} strokeWidth={2.4} />
                            {t('Chosen')}
                          </>
                        ) : (
                          t('Choose')
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted tu-table-note">
          {t('Extra vs today is the interest from today with the top-up, minus the interest left on your current loan.')}
        </p>
      </div>

      {r.lesson && <LowerEmiCard r={r} />}

      {r.matrix.length > 0 && (
        <div className="card tu-table-card">
          <div className="card-head">
            <h3>{t('Flexibility vs interest')}</h3>
          </div>
          <div className="tu-matrix">
            {r.matrix.map((m) => (
              <div key={m.band} className={`tu-matrix-item ${m.band}${m.row.months === rec.months ? ' is-best' : ''}`}>
                <span className="tu-matrix-band">{t(m.band === 'long' ? 'Long tenure' : m.band === 'medium' ? 'Medium tenure' : 'Short tenure')}</span>
                <strong className="tu-matrix-years num">{yrs(m.row.months)}</strong>
                <dl>
                  <div>
                    <dt>{t('EMI')}</dt>
                    <dd className="num">{money(m.row.emi)}</dd>
                  </div>
                  <div>
                    <dt>{t('Interest')}</dt>
                    <dd className="num">{lakh(m.row.interest)}</dd>
                  </div>
                  <div>
                    <dt>{t('Flexibility')}</dt>
                    <dd>
                      <span className={`tu-flex ${m.flexibility.toLowerCase()}`}>
                        <span className="tu-flex-bars" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        {t(m.flexibility)}
                      </span>
                    </dd>
                  </div>
                </dl>
                <p className="tu-matrix-advice">{t(matrixAdvice(m.band, m.row))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chart-grid tu-charts">
        <div className="card card-pad lift chart-card">
          <Chart spec={emiChart} />
        </div>
        <div className="card card-pad lift chart-card">
          <Chart spec={interestChart} />
        </div>
      </div>
    </section>
  );
}

/**
 * Lower EMI ≠ cheaper loan: the borrower's tenure (or the longest)
 * against the recommendation, principal and interest to scale, with the
 * long-tenure warning on top when the tenure is 7 years or more.
 */
function LowerEmiCard({ r }: { r: TopUpResult }) {
  const t = useT();
  const l = r.lesson!;
  const warn = r.longTenure;
  const loan = r.option.loan;
  const max = Math.max(l.long.totalPayment, l.short.totalPayment, 1);
  const row = (x: TenureRow, tag: string) => (
    <div className="tu-lesson-row" key={x.months}>
      <div className="tu-lesson-sum">
        <span className="tu-lesson-tag">{tag}</span>
        <span className="num">
          {money(x.emi)} × {x.months} {t('EMIs')} = <strong>{lakh(x.totalPayment)}</strong>
        </span>
      </div>
      <div className="tu-lesson-bar" role="img" aria-label={`${yrs(x.months)}: ${t('principal')} ${lakh(loan)}, ${t('interest')} ${lakh(x.interest)}`}>
        <span className="p" style={{ width: `${(loan / max) * 100}%` }} />
        <span className="i" style={{ width: `${(x.interest / max) * 100}%` }}>
          <em className="num">{lakh(x.interest)}</em>
        </span>
      </div>
    </div>
  );
  return (
    <div className={`card tu-lesson${warn ? ' warn' : ''}`} role={warn ? 'note' : undefined}>
      <div className="tu-lesson-head">
        {warn && <Icon name="alert" size={18} className="tu-lesson-i" />}
        <div>
          <h3>{warn ? t('Lower EMI doesn’t necessarily mean lower cost') : t('Lower EMI ≠ cheaper loan')}</h3>
          <p className="small muted">
            {t('The same')} {lakh(loan)} {t('over')} {yrs(l.long.months)} {t('and')} {yrs(l.short.months)}.
          </p>
        </div>
      </div>

      <div className="tu-lesson-stats">
        <div>
          <span>{t('EMI difference')}</span>
          <strong className="num">+{money(l.emiIncrease)}</strong>
          <small>
            {t('a month for')} {yrs(l.short.months)}
          </small>
        </div>
        <div className="good">
          <span>{t('Interest saved')}</span>
          <strong className="num">≈ {lakh(l.interestSaved)}</strong>
          <small>
            {t('with')} {yrs(l.short.months)}
          </small>
        </div>
        <div className="good">
          <span>{t('Finishes earlier')}</span>
          <strong className="num">{yrs(l.monthsSooner)}</strong>
          <small>
            {when(l.short.completion)} {t('vs')} {when(l.long.completion)}
          </small>
        </div>
      </div>

      <div className="tu-lesson-bars">
        {row(l.long, yrs(l.long.months))}
        {row(l.short, yrs(l.short.months))}
        <ul className="tu-lesson-key small muted">
          <li>
            <span className="sw p" aria-hidden="true" />
            {t('Principal')}
          </li>
          <li>
            <span className="sw i" aria-hidden="true" />
            {t('Interest')}
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ================================================================== */
/* 6 · How much to borrow                                              */
/* ================================================================== */

const SCENARIO_META: { key: ScenarioRow['key']; label: string; note: string }[] = [
  { key: 'minimum', label: 'Minimum', note: 'The least that would do' },
  { key: 'recommended', label: 'Recommended', note: 'What you need' },
  { key: 'higher', label: 'Higher', note: 'A cushion' },
  { key: 'maximum', label: 'Maximum', note: 'The most you are considering' },
];

function AmountSection({
  r,
  input,
  errors,
  onScenarios,
  onRequired,
}: {
  r: TopUpResult;
  input: TopUpInput;
  errors: Record<string, string>;
  onScenarios: (part: Partial<AmountScenarios>) => void;
  onRequired: (v: number) => void;
}) {
  const t = useT();
  const s = input.scenarios;
  const valueOf = (key: ScenarioRow['key']) => (key === 'recommended' ? input.topup.required : s[key]);
  const chart: ChartSpec = {
    kind: 'bar',
    title: 'Cash received vs additional interest',
    x: r.scenarios.map((row) => lakh(row.amount)),
    series: [
      { name: 'Cash received', values: r.scenarios.map((row) => row.option.charges.net) },
      { name: 'Additional interest', values: r.scenarios.map((row) => pos(row.option.additionalInterest)) },
    ],
  };
  const l = r.larger;

  return (
    <section className="calc-block" id="tu-amounts" aria-labelledby="tu-amounts-head">
      <SectionHead id="tu-amounts-head" n={6} eyebrow="Borrowing amount" title="How much top-up should you take?" takeaway={amountTakeaway(r)} icon="coins">
        <p className="muted tu-block-lede">
          {t('Every amount below uses')} {ratePct(r.option.ratePct)} {t('over')} {yrs(r.option.months)}. {t('Edit any amount to compare.')}
        </p>
      </SectionHead>

      <div className="tu-scenarios">
        {SCENARIO_META.map((m) => {
          const row = r.scenarios.find((x) => x.key === m.key);
          return (
            <div className={`card tu-scenario${m.key === 'recommended' ? ' rec' : ''}`} key={m.key}>
              <div className="tu-scenario-head">
                <span className="tu-scenario-label">{t(m.label)}</span>
                <span className="small muted">{t(m.note)}</span>
              </div>
              <Num
                path={`scenarios.${m.key}`}
                label={m.key === 'recommended' ? 'Top-up (your need)' : 'Top-up amount'}
                type="currency"
                value={valueOf(m.key)}
                error={m.key === 'recommended' ? undefined : errors[`scenarios.${m.key}`]}
                onChange={(v) => (m.key === 'recommended' ? onRequired(v) : onScenarios({ [m.key]: v }))}
              />
              {row ? (
                <>
                  <div className="tu-scenario-hero">
                    <span>{t('Additional interest')}</span>
                    <strong className="num">{formatSignedINR(row.option.additionalInterest)}</strong>
                  </div>
                  <dl className="tu-scenario-dl">
                    <div>
                      <dt>{t('Cash in hand')}</dt>
                      <dd className="num">{money(row.option.charges.net)}</dd>
                    </div>
                    <div>
                      <dt>{t('EMI')}</dt>
                      <dd className="num">{money(row.option.emi)}</dd>
                    </div>
                    <div>
                      <dt>{t('New loan')}</dt>
                      <dd className="num">{lakh(row.option.loan)}</dd>
                    </div>
                    <div>
                      <dt>{t('Per ₹1 received')}</dt>
                      <dd className="num">{formatINR(row.option.interestPerRupee, 2)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="small muted">{t('Enter an amount to compare.')}</p>
              )}
            </div>
          );
        })}
      </div>

      {r.scenarios.length > 1 && (
        <div className="card card-pad lift chart-card tu-chart-wide">
          <Chart spec={chart} />
        </div>
      )}

      {l && (
        <div className="card tu-table-card tu-larger">
          <div className="card-head">
            <h3>
              {lakh(l.base.loan)} {t('vs')} {lakh(l.larger.loan)}
            </h3>
          </div>
          <p className="note warn tu-larger-note">
            <Icon name="alert" size={16} className="i" />
            <span>
              {t('You requested')} <strong>{lakh(l.base.grossTopUp)}</strong>, {t('but you’re considering borrowing')}{' '}
              <strong>{lakh(l.larger.grossTopUp)}</strong>. {t('The extra')} {lakh(l.extraTopUp)} {t('may increase your total interest by approximately')}{' '}
              <strong>{lakh(l.extraInterest)}</strong> {t('and every EMI by')} <strong>{money(l.extraEmi)}</strong>.
            </span>
          </p>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">{t('Item')}</span>
                  </th>
                  <th scope="col" className="num">
                    {lakh(l.base.loan)}
                    <span className="tu-th-sub">{t('what you need')}</span>
                  </th>
                  <th scope="col" className="num">
                    {lakh(l.larger.loan)}
                    <span className="tu-th-sub">{l.source === 'sanctioned' ? t('bank’s offer') : t('maximum')}</span>
                  </th>
                  <th scope="col" className="num">
                    {t('Difference')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Cash received', l.base.charges.net, l.larger.charges.net, false],
                    ['EMI', l.base.emi, l.larger.emi, false],
                    ['Total payment', l.base.totalPayments, l.larger.totalPayments, false],
                    ['Total interest', l.base.futureInterest, l.larger.futureInterest, true],
                    ['Additional interest vs today', l.base.additionalInterest, l.larger.additionalInterest, false],
                    ['Monthly burden vs today’s EMI', l.base.emiChange, l.larger.emiChange, false],
                  ] as [string, number, number, boolean][]
                ).map(([label, a, b, key]) => (
                  <tr key={label} className={key ? 'is-key' : undefined}>
                    <th scope="row">{t(label)}</th>
                    <td className="num">{label.startsWith('Monthly') ? formatSignedINR(a) : money(a)}</td>
                    <td className="num">{label.startsWith('Monthly') ? formatSignedINR(b) : money(b)}</td>
                    <td className="num">{formatSignedINR(b - a)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">{t('Completion date')}</th>
                  <td className="num">{when(l.base.completion)}</td>
                  <td className="num">{when(l.larger.completion)}</td>
                  <td className="num">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

/* ================================================================== */
/* 7 · Part prepayment                                                 */
/* ================================================================== */

function PrepaySection({
  r,
  input,
  errors,
  onPrepay,
}: {
  r: TopUpResult;
  input: TopUpInput;
  errors: Record<string, string>;
  onPrepay: (part: Partial<PrepaymentPlan>) => void;
}) {
  const t = useT();
  const p = r.prepayment;
  const plan = input.prepay;
  const chart: ChartSpec = {
    kind: 'line',
    title: 'Outstanding balance',
    xLabel: 'Year',
    x: ['Now', ...p.yearly.map((y) => `Y${y.year}`)],
    series: [
      { name: 'Without prepayment', values: [r.option.loan, ...p.yearly.map((y) => y.without)] },
      { name: 'With prepayment', values: [r.option.loan, ...p.yearly.map((y) => y.with)] },
    ],
  };
  const err = (k: string) => (errors[k] ? t(errors[k]) : undefined);

  return (
    <section className="calc-block" id="tu-prepay" aria-labelledby="tu-prepay-head">
      <SectionHead
        id="tu-prepay-head"
        n={7}
        eyebrow="Part prepayment"
        title="Close the top-up loan sooner"
        takeaway={prepayTakeaway(r)}
        icon="trendingDown"
        tone="good"
      >
        <p className="muted tu-block-lede">{t('Extra payments go straight to principal; the EMI stays the same and the loan ends earlier.')}</p>
      </SectionHead>
      <div className="card tu-prepay">
        <div className="fields tu-prepay-fields">
          <Num path="prepay.initial" label="Part Payment" type="currency" value={plan.initial} error={err('prepay.initial')} onChange={(v) => onPrepay({ initial: v })} />
          <Num
            path="prepay.initialMonth"
            label="Paid With EMI No."
            value={plan.initialMonth}
            error={err('prepay.initialMonth')}
            onChange={(v) => onPrepay({ initialMonth: v })}
            help="Many lenders allow part payment only after the first 6 to 12 EMIs."
          />
          <Num
            path="prepay.monthlyExtra"
            label="Extra Every Month"
            type="currency"
            value={plan.monthlyExtra}
            error={err('prepay.monthlyExtra')}
            onChange={(v) => onPrepay({ monthlyExtra: v })}
          />
          <Num
            path="prepay.annualLump"
            label="Lump Sum Every Year"
            type="currency"
            value={plan.annualLump}
            error={err('prepay.annualLump')}
            onChange={(v) => onPrepay({ annualLump: v })}
            help="Paid with every 12th EMI — a bonus or annual savings."
          />
        </div>

        {p.active ? (
          <div className="tu-prepay-results">
            <div className="tu-prepay-hero">
              <span>{t('Interest saved')}</span>
              <strong className="num">
                <TweenedText value={money(p.interestSaved)} />
              </strong>
              <small>
                {t('Loan closes')} {yrs(p.monthsSaved)} {t('early, in')} {when(p.completion)}
              </small>
            </div>
            <dl className="tu-prepay-dl">
              <div>
                <dt>{t('New effective tenure')}</dt>
                <dd className="num">{yrs(p.months)}</dd>
              </div>
              <div>
                <dt>{t('Time saved')}</dt>
                <dd className="num">{yrs(p.monthsSaved)}</dd>
              </div>
              <div>
                <dt>{t('Total interest')}</dt>
                <dd className="num">{money(p.interest)}</dd>
              </div>
              <div>
                <dt>{t('Extra paid in')}</dt>
                <dd className="num">{money(p.prepaid)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="small muted">{t('Enter a part payment, an extra monthly amount or a yearly lump sum to see the effect.')}</p>
        )}
      </div>
      {p.active && (
        <div className="card card-pad lift chart-card tu-chart-wide">
          <Chart spec={chart} />
        </div>
      )}
      <p className="small muted tu-fine">
        {t('Floating-rate loans to individuals usually carry no prepayment charge; fixed-rate and some other loans may. Check your loan agreement.')}
      </p>
    </section>
  );
}

/* ================================================================== */
/* 8 · Final decision                                                  */
/* ================================================================== */

function DecisionSection({
  r,
  input,
  pinned,
  onPin,
  onUnpin,
}: {
  r: TopUpResult;
  input: TopUpInput;
  pinned: PinnedOption[];
  onPin: () => void;
  onUnpin: (id: string) => void;
}) {
  const t = useT();
  const level = r.verdict.level;
  return (
    <section className="calc-block" id="tu-decision" aria-labelledby="tu-decision-head">
      <SectionHead id="tu-decision-head" n={8} eyebrow="Final decision" title="Your personalised recommendation" />
      <div className={`card tu-final ${level}`}>
        <p className="tu-final-title">
          <span className="tu-dot" aria-hidden="true" />
          {t(verdictTitle(r))}
        </p>
        <p className="tu-final-need">
          {t('You need')} <strong className="num">{lakh(input.topup.required)}</strong>. {t('Here is what the numbers say:')}
        </p>
        <ul className="tu-points">
          {personalPoints(r, input).map((pt, i) => (
            <li key={i} className={pt.tone}>
              <span className="tu-point-mark" aria-hidden="true">
                <Icon name={pt.tone === 'good' ? 'check' : pt.tone === 'warn' ? 'alert' : 'info'} size={13} strokeWidth={2.4} />
              </span>
              <span>
                <Rich text={pt.text} />
              </span>
            </li>
          ))}
        </ul>
        <p className="tu-bottom-line">
          <span className="tu-bottom-label">{t('Bottom line')}</span>
          {t(bottomLine(r))}
        </p>
        <p className="small muted tu-final-note">{t('This is an estimate from the numbers you entered, not personal financial advice.')}</p>
      </div>

      <div className="card tu-table-card tu-saved">
        <div className="card-head">
          <h3>{t('Saved options')}</h3>
          <button type="button" className="btn outline sm no-print" style={{ marginLeft: 'auto' }} onClick={onPin}>
            <Icon name="star" size={15} />
            {t('Save current option')}
          </button>
        </div>
        {pinned.length ? (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">{t('Option')}</th>
                  <th scope="col" className="num">
                    {t('EMI')}
                  </th>
                  <th scope="col" className="num">
                    {t('Cash in hand')}
                  </th>
                  <th scope="col" className="num">
                    {t('Additional interest')}
                  </th>
                  <th scope="col" className="num">
                    {t('Extra payments')}
                  </th>
                  <th scope="col" className="no-print">
                    <span className="sr-only">{t('Remove')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pinned.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">
                      <span className="tu-saved-name">
                        <span className={`tu-dot ${p.level}`} aria-hidden="true" />
                        {lakh(p.loan)} · {ratePct(p.ratePct)} · {yrs(p.months)}
                      </span>
                    </th>
                    <td className="num">{money(p.emi)}</td>
                    <td className="num">{money(p.netCash)}</td>
                    <td className="num">{formatSignedINR(p.additionalInterest)}</td>
                    <td className="num">{formatSignedINR(p.additionalPayments)}</td>
                    <td className="no-print">
                      <button type="button" className="btn ghost sm" onClick={() => onUnpin(p.id)} aria-label={t('Remove saved option')}>
                        <Icon name="close" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="small muted tu-saved-empty">
            {t('Save an option, then change the rate, tenure or amount — your earlier results stay here for comparison.')}
          </p>
        )}
      </div>
    </section>
  );
}

/* ================================================================== */
/* Schedule                                                            */
/* ================================================================== */

function ScheduleSection({ r, view, onSchedule }: { r: TopUpResult; view: 'monthly' | 'yearly'; onSchedule: (v: 'monthly' | 'yearly') => void }) {
  const t = useT();
  return (
    <section className="calc-block" id="tu-schedule" aria-labelledby="tu-schedule-head">
      <details className="acc tu-schedule">
        <summary>
          <span id="tu-schedule-head">{t('Amortization schedule')}</span>
          <span className="tu-acc-value num">
            {yrs(r.option.months)} · {r.option.months} × {money(r.option.emi)}
          </span>
        </summary>
        <div className="acc-body">
          <div className="tu-schedule-switch">
            <Seg
              label={t('Schedule view')}
              value={view}
              options={[
                ['yearly', t('Yearly summary')],
                ['monthly', t('Monthly')],
              ]}
              onChange={(v) => onSchedule(v as 'monthly' | 'yearly')}
            />
            <span className="small muted">
              {lakh(r.option.loan)} · {ratePct(r.option.ratePct)} · {yrAdj(r.option.months)} {t('tenure')}
            </span>
          </div>
          <DataTable spec={scheduleTable(r, view)} />
        </div>
      </details>
    </section>
  );
}
