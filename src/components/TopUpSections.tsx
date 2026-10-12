import type { ReactNode } from 'react';
import type { ChartSpec } from '@/calculators/types';
import type { AmountScenarios, PrepaymentPlan, ScenarioRow, TenureRow, TopUpInput, TopUpResult } from '@/engines/topup';
import type { PinnedOption, TopUpState } from '@/calculators/loans/topUpModel';
import {
  TENURE_CSV_COLUMNS,
  emiChangeWords,
  lakh,
  matrixAdvice,
  mo,
  moAdj,
  money,
  personalRecommendation,
  ratePct,
  recommendationText,
  scheduleTable,
  tenureCsvRows,
  verdictTitle,
  when,
} from '@/calculators/loans/topUpReport';
import { formatINR, formatSignedINR } from '@/lib/format';
import { downloadCSV, toCSV } from '@/lib/export';
import { useT } from '@/hooks/PreferencesContext';
import { Chart } from './Chart';
import { DataTable } from './DataTable';
import { Icon } from './Icon';
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

/** Everything under the inputs: compare, tenure, amount, prepayment, decision, schedule. */
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

function Head({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children?: ReactNode }) {
  const t = useT();
  return (
    <div className="block-head tu-block-head">
      <p className="eyebrow">{t(eyebrow)}</p>
      <h2 id={id}>{t(title)}</h2>
      {children}
    </div>
  );
}

/** Never let a negative figure draw a bar below the axis. */
const pos = (v: number) => Math.max(0, v);

/* ================================================================== */
/* 4 · Compare options                                                 */
/* ================================================================== */

function CompareSection({ r }: { r: TopUpResult }) {
  const t = useT();
  const e = r.existing;
  const o = r.option;
  const chart: ChartSpec = {
    kind: 'bar',
    title: 'Existing loan vs top-up, from today',
    x: ['Principal', 'Future interest', 'Total payments'],
    series: [
      { name: 'Without top-up', values: [e.outstanding, e.futureInterest, e.remainingPayments] },
      { name: 'With top-up', values: [o.loan, o.futureInterest, o.totalPayments] },
    ],
  };
  const saving = o.additionalInterest < 0;

  return (
    <section className="calc-block" id="tu-compare" aria-labelledby="tu-compare-head">
      <Head id="tu-compare-head" eyebrow="Compare options" title="Continue as you are, or take the top-up?" />

      <div className="tu-options">
        <OptionCard
          tone="a"
          tag={t('Option A')}
          title={t('Without top-up')}
          rows={[
            [t('Outstanding principal'), money(e.outstanding)],
            [t('Remaining tenure'), mo(e.remainingMonths)],
            [t('EMI'), money(e.emi)],
            [t('Remaining total payments'), money(e.remainingPayments)],
            [t('Remaining interest'), money(e.futureInterest)],
            [t('Loan completion'), when(e.completion)],
          ]}
        />
        <OptionCard
          tone="b"
          tag={t('Option B')}
          title={t('With top-up')}
          rows={[
            [t('New loan amount'), money(o.loan)],
            [t('Top-up cash received'), money(o.charges.net)],
            [t('New interest rate'), ratePct(o.ratePct)],
            [t('New tenure'), mo(o.months)],
            [t('New EMI'), money(o.emi)],
            [t('Total future payments'), money(o.totalPayments)],
            [t('Future interest'), money(o.futureInterest)],
            [t('Loan completion'), when(o.completion)],
          ]}
        />
      </div>

      <div className="tu-metrics">
        <div className="card tu-metric">
          <span className="tu-metric-label">{t('Additional financing cost')}</span>
          <strong className="tu-metric-value num">{formatSignedINR(o.additionalPayments)}</strong>
          <p>
            {t('You receive')} <strong className="num">{lakh(o.charges.net)}</strong> {t('but commit to approximately')}{' '}
            <strong className="num">{lakh(o.additionalPayments)}</strong>{' '}
            {t('of additional future loan payments. This includes repayment of the borrowed principal plus additional interest and the longer loan.')}
          </p>
          <p className="tu-formula num">
            {money(o.totalPayments)} − {money(e.remainingPayments)}
          </p>
        </div>
        <div className={`card tu-metric key ${saving ? 'good' : o.interestPerRupee > 0.5 ? 'warn' : 'calm'}`}>
          <span className="tu-metric-label">
            {saving ? t('Interest saved') : t('Additional interest')}
            <span className="tu-key-tag">{t('Key decision figure')}</span>
          </span>
          <strong className="tu-metric-value num">{money(Math.abs(o.additionalInterest))}</strong>
          <p>
            {saving
              ? t('The new rate is low enough that you pay less interest from today than on your current loan.')
              : `${t('The real cost of the top-up: interest from today with it, minus interest from today without it.')} ${t('That is')} ${formatINR(
                  o.interestPerRupee,
                  2,
                )} ${t('for every ₹1 you receive.')}`}
          </p>
          <p className="tu-formula num">
            {money(o.futureInterest)} − {money(e.futureInterest)}
          </p>
          {!saving && o.interestSplit.existingBalance > 0 && (
            <dl className="tu-split">
              <div>
                <dt>
                  {t('Re-stretching today’s')} {lakh(e.outstanding)} {t('over')} {mo(o.months)}
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

      <div className="card tu-sunk">
        <div className="tu-sunk-head">
          <Icon name="calendarCheck" size={18} />
          <h3>{t('What about the interest you already paid?')}</h3>
        </div>
        <p>
          {t('Across your')} {e.emisPaid} {t('EMIs so far, roughly')} <strong className="num">{money(e.historicalInterest)}</strong>{' '}
          {t('went to interest (estimated from your original schedule).')}
        </p>
        <p>
          {t(
            'The interest already paid on your existing loan is a sunk cost. It has already been paid and cannot be recovered whether you take the top-up or not. This calculator focuses only on the costs you will pay from today onward. That is why the main comparison uses your current outstanding principal and remaining EMIs.',
          )}
        </p>
      </div>
    </section>
  );
}

function OptionCard({ tone, tag, title, rows }: { tone: 'a' | 'b'; tag: string; title: string; rows: [string, string][] }) {
  return (
    <div className={`card tu-option ${tone}`}>
      <div className="tu-option-head">
        <span className="tu-option-tag">{tag}</span>
        <h3>{title}</h3>
      </div>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="num">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
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
          {mo(months)} · {t('ends')} {when(end)}
        </span>
      </div>
      <div className="tu-tl-track">
        <span className={`tu-tl-fill ${cls}`} style={{ width: `${(Math.min(months, months - extra) / max) * 100}%` }} />
        {extra > 0 && <span className="tu-tl-fill extra" style={{ width: `${(extra / max) * 100}%` }} />}
      </div>
    </div>
  );
  return (
    <figure className="tu-timeline">
      <figcaption className="section-label">{t('How long you keep paying')}</figcaption>
      {bar(t('Without top-up'), a, r.existing.completion, 0, 'a')}
      {bar(t('With top-up'), b, r.option.completion, Math.max(0, b - a), 'b')}
      <p className="small muted">
        {b > a
          ? `${t('The top-up keeps you paying for')} ${mo(b - a)} ${t('longer.')}`
          : b < a
            ? `${t('The top-up finishes')} ${mo(a - b)} ${t('sooner.')}`
            : t('Both finish in the same month.')}
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
  'best-balance': 'Best balance',
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
  const comfortable = input.topup.comfortableEmi;
  const x = r.tenures.map((row) => `${row.months}`);
  const emiChart: ChartSpec = { kind: 'bar', title: 'EMI by tenure', xLabel: 'Months', x, series: [{ name: 'EMI', values: r.tenures.map((row) => row.emi) }] };
  const interestChart: ChartSpec = {
    kind: 'bar',
    title: 'Interest by tenure',
    xLabel: 'Months',
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
      <Head id="tu-tenure-head" eyebrow="Choose tenure" title="Which tenure gives the best balance?" />

      <div className="card tu-rec">
        <div className="tu-rec-main">
          <span className="tu-rec-icon" aria-hidden="true">
            <Icon name="target" size={20} />
          </span>
          <div>
            <p className="tu-rec-label">{rec.basis === 'none-fit' ? t('Closest balance') : t('Recommended tenure')}</p>
            <p className="tu-rec-value num">
              {mo(rec.months)} <span>· EMI {money(rec.row.emi)}</span>
            </p>
            <p className="tu-rec-text">{t(recommendationText(r, input))}</p>
            {rec.months !== o.months && (
              <button type="button" className="btn outline sm" onClick={() => onChooseTenure(rec.months)}>
                {t('Use')} {mo(rec.months)}
              </button>
            )}
          </div>
        </div>
        <div className="tu-rec-field">
          <Num
            path="tenure.comfortableEmi"
            label="Comfortable EMI"
            type="currency"
            value={comfortable}
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
              {r.tenures.map((row) => (
                <tr key={row.months} className={row.tags.includes('selected') ? 'is-selected' : row.tags.includes('best-balance') ? 'is-best' : ''}>
                  <th scope="row">
                    <span className="tu-tenure-cell">
                      <span className="num">{mo(row.months)}</span>
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
                    <button
                      type="button"
                      className="btn subtle sm tu-choose"
                      aria-pressed={row.tags.includes('selected')}
                      onClick={() => onChooseTenure(row.months)}
                    >
                      {row.tags.includes('selected') ? t('Chosen') : t('Choose')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted tu-table-note">
          {t('Extra vs today is the interest from today with the top-up, minus the interest left on your current loan.')}
        </p>
      </div>

      {r.longTenure && <LongTenureWarning r={r} />}
      {r.lesson && <Lesson r={r} />}

      {r.matrix.length > 0 && (
        <div className="card tu-table-card">
          <div className="card-head">
            <h3>{t('Flexibility vs interest')}</h3>
          </div>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">{t('Option')}</th>
                  <th scope="col" className="num">
                    {t('Tenure')}
                  </th>
                  <th scope="col" className="num">
                    {t('EMI')}
                  </th>
                  <th scope="col" className="num">
                    {t('Interest')}
                  </th>
                  <th scope="col" className="txt">
                    {t('Flexibility')}
                  </th>
                  <th scope="col" className="txt">
                    {t('Recommendation')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.matrix.map((m) => (
                  <tr key={m.band}>
                    <th scope="row">{t(m.band === 'long' ? 'Long tenure' : m.band === 'medium' ? 'Medium tenure' : 'Short tenure')}</th>
                    <td className="num">{mo(m.row.months)}</td>
                    <td className="num">{money(m.row.emi)}</td>
                    <td className="num">{lakh(m.row.interest)}</td>
                    <td className="txt">
                      <span className={`tu-flex ${m.flexibility.toLowerCase()}`}>{t(m.flexibility)}</span>
                    </td>
                    <td className="txt">{t(matrixAdvice(m.band, m.row))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted tu-table-note">
            {t('A longer tenure leaves more room in the monthly budget; a shorter one costs less in total. Most loans also allow part prepayment, which can shorten a long tenure later.')}
          </p>
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

function LongTenureWarning({ r }: { r: TopUpResult }) {
  const t = useT();
  const p = r.longTenure!;
  return (
    <div className="card tu-warning" role="note">
      <div className="tu-warning-head">
        <Icon name="alert" size={18} />
        <h3>{t('Lower EMI doesn’t necessarily mean lower cost')}</h3>
      </div>
      <p>
        {mo(p.long.months)} {t('compared with')} {mo(p.short.months)}:
      </p>
      <div className="tu-warning-stats">
        <div>
          <span>{t('EMI difference')}</span>
          <strong className="num">+{money(p.emiIncrease)}</strong>
          <small>{t('per month')}</small>
        </div>
        <div className="good">
          <span>{t('Interest saved')}</span>
          <strong className="num">≈ {lakh(p.interestSaved)}</strong>
          <small>
            {t('with')} {mo(p.short.months)}
          </small>
        </div>
        <div className="good">
          <span>{t('Finishes earlier')}</span>
          <strong className="num">{mo(p.monthsSooner)}</strong>
          <small>
            {when(p.short.completion)} {t('vs')} {when(p.long.completion)}
          </small>
        </div>
      </div>
    </div>
  );
}

/** "Lower EMI ≠ cheaper loan": the same loan over a long and a shorter tenure, principal and interest to scale. */
function Lesson({ r }: { r: TopUpResult }) {
  const t = useT();
  const l = r.lesson!;
  const loan = r.option.loan;
  const max = Math.max(l.long.totalPayment, l.short.totalPayment, 1);
  const row = (x: TenureRow) => (
    <div className="tu-lesson-row" key={x.months}>
      <p className="tu-lesson-sum num">
        {money(x.emi)} × {x.months} = <strong>{lakh(x.totalPayment)}</strong>
      </p>
      <div className="tu-lesson-bar" role="img" aria-label={`${mo(x.months)}: ${t('principal')} ${lakh(loan)}, ${t('interest')} ${lakh(x.interest)}`}>
        <span className="p" style={{ width: `${(loan / max) * 100}%` }} />
        <span className="i" style={{ width: `${(x.interest / max) * 100}%` }} />
      </div>
    </div>
  );
  return (
    <div className="card tu-lesson">
      <div className="tu-lesson-head">
        <h3>{t('Lower EMI ≠ cheaper loan')}</h3>
        <p className="small muted">
          {t('The same')} {lakh(loan)} {t('over two tenures. A lower EMI usually means paying for longer — and more interest overall.')}
        </p>
      </div>
      {row(l.long)}
      {row(l.short)}
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
      <p className="tu-lesson-out">
        {t('The')} {moAdj(l.long.months)} {t('option costs')} <strong className="num">{lakh(l.interestSaved)}</strong> {t('more for an EMI that is')}{' '}
        <strong className="num">{money(l.emiIncrease)}</strong> {t('lower.')}
      </p>
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
      <Head id="tu-amounts-head" eyebrow="Borrowing amount" title="How much top-up should you take?">
        <p className="muted tu-block-lede">
          {t('Every amount below uses')} {ratePct(r.option.ratePct)} {t('over')} {mo(r.option.months)}. {t('Edit any amount to compare.')}
        </p>
      </Head>

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
                <dl className="tu-scenario-dl">
                  <div>
                    <dt>{t('New loan')}</dt>
                    <dd className="num">{lakh(row.option.loan)}</dd>
                  </div>
                  <div>
                    <dt>{t('Cash in hand')}</dt>
                    <dd className="num">{money(row.option.charges.net)}</dd>
                  </div>
                  <div>
                    <dt>{t('EMI')}</dt>
                    <dd className="num">{money(row.option.emi)}</dd>
                  </div>
                  <div>
                    <dt>{t('Additional interest')}</dt>
                    <dd className="num">{formatSignedINR(row.option.additionalInterest)}</dd>
                  </div>
                  <div>
                    <dt>{t('Per ₹1 received')}</dt>
                    <dd className="num">{formatINR(row.option.interestPerRupee, 2)}</dd>
                  </div>
                </dl>
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
                    ['Cash received', l.base.charges.net, l.larger.charges.net],
                    ['EMI', l.base.emi, l.larger.emi],
                    ['Total payment', l.base.totalPayments, l.larger.totalPayments],
                    ['Total interest', l.base.futureInterest, l.larger.futureInterest],
                    ['Additional interest vs today', l.base.additionalInterest, l.larger.additionalInterest],
                    ['Monthly burden vs today’s EMI', l.base.emiChange, l.larger.emiChange],
                  ] as [string, number, number][]
                ).map(([label, a, b]) => (
                  <tr key={label}>
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
      <Head id="tu-prepay-head" eyebrow="Part prepayment" title="Close the top-up loan sooner">
        <p className="muted tu-block-lede">{t('Extra payments go straight to principal; the EMI stays the same and the loan ends earlier.')}</p>
      </Head>
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
          <div className="stat-grid tu-prepay-stats">
            <Stat label={t('New completion date')} value={when(p.completion)} />
            <Stat label={t('Interest saved')} value={money(p.interestSaved)} tone="positive" />
            <Stat label={t('Months saved')} value={mo(p.monthsSaved)} tone="positive" />
            <Stat label={t('New effective tenure')} value={mo(p.months)} />
            <Stat label={t('Total interest')} value={money(p.interest)} />
            <Stat label={t('Extra paid in')} value={money(p.prepaid)} />
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'positive' }) {
  return (
    <div className={`stat${tone ? ` ${tone}` : ''}`}>
      <div className="s-label">{label}</div>
      <div className="s-value num">{value}</div>
    </div>
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
      <Head id="tu-decision-head" eyebrow="Final decision" title="Your personalised recommendation" />
      <div className={`card tu-final ${level}`}>
        <p className="tu-final-title">
          <span className="tu-dot" aria-hidden="true" />
          {t(verdictTitle(r))}
        </p>
        <p className="tu-final-text">{t(personalRecommendation(r, input))}</p>
        <p className="small muted">{t('This is an estimate from the numbers you entered, not personal financial advice.')}</p>
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
                        {lakh(p.loan)} · {ratePct(p.ratePct)} · {mo(p.months)}
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
/* 9 · Schedule                                                        */
/* ================================================================== */

function ScheduleSection({ r, view, onSchedule }: { r: TopUpResult; view: 'monthly' | 'yearly'; onSchedule: (v: 'monthly' | 'yearly') => void }) {
  const t = useT();
  return (
    <section className="calc-block" id="tu-schedule" aria-labelledby="tu-schedule-head">
      <details className="acc tu-schedule">
        <summary>
          <span id="tu-schedule-head">{t('Amortization schedule')}</span>
          <span className="tu-acc-value num">
            {r.option.months} × {money(r.option.emi)}
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
              {lakh(r.option.loan)} · {ratePct(r.option.ratePct)} · {emiChangeWords(r.option.emiChange)}
            </span>
          </div>
          <DataTable spec={scheduleTable(r, view)} />
        </div>
      </details>
    </section>
  );
}
