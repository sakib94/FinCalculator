import { useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { WorkspaceProps } from '@/calculators/types';
import {
  NEW_TENURE_MONTHS,
  ORIGINAL_TENURE_YEARS,
  calculateTopUp,
  isCoreIssue,
  validateTopUp,
  type AmountScenarios,
  type ExistingLoanInput,
  type PrepaymentPlan,
  type TopUpResult,
  type TopUpTerms,
} from '@/engines/topup';
import { MAX_PINNED, blankInput, defaultState, isOriginalChoice, restoreState, type TopUpState } from '@/calculators/loans/topUpModel';
import { checkText, emiChangeWords, lakh, mo, money, summaryText, verdictLead, verdictTitle, when } from '@/calculators/loans/topUpReport';
import { copyText, printPage } from '@/lib/export';
import { readLocal, writeLocal } from '@/lib/storage';
import { scrollToSection } from '@/lib/scroll';
import { TweenedText } from '@/lib/tween';
import { useT } from '@/hooks/PreferencesContext';
import { Num, Seg } from './WorkspaceFields';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';
import { useToast } from './Toast';
import { TopUpSections } from './TopUpSections';

const STORAGE_KEY = 'loan-top-up-v1';

/**
 * Loan Top-Up Calculator.
 *
 * Three steps of inputs — the existing loan, the money needed, the new
 * terms — beside a decision panel that answers the question first: is the
 * top-up reasonable, and what does it cost from today? The comparison,
 * tenure table, amount scenarios, prepayment simulator and schedule
 * follow underneath, all live.
 */
export function TopUpWorkspace({ heroRef, onHero }: WorkspaceProps) {
  const t = useT();
  const { notify } = useToast();
  const [state, setState] = useState<TopUpState>(() => restoreState(readLocal<unknown>(STORAGE_KEY, null)));
  const { input } = state;
  const e = input.existing;
  const tu = input.topup;

  useEffect(() => {
    const timer = window.setTimeout(() => writeLocal(STORAGE_KEY, state), 300);
    return () => window.clearTimeout(timer);
  }, [state]);

  const setExisting = (part: Partial<ExistingLoanInput>) =>
    setState((s) => ({ ...s, input: { ...s.input, existing: { ...s.input.existing, ...part } } }));
  const setTopup = (part: Partial<TopUpTerms>) => setState((s) => ({ ...s, input: { ...s.input, topup: { ...s.input.topup, ...part } } }));
  const setScenarios = (part: Partial<AmountScenarios>) =>
    setState((s) => ({ ...s, input: { ...s.input, scenarios: { ...s.input.scenarios, ...part } } }));
  const setPrepay = (part: Partial<PrepaymentPlan>) => setState((s) => ({ ...s, input: { ...s.input, prepay: { ...s.input.prepay, ...part } } }));

  const issues = useMemo(() => validateTopUp(input), [input]);
  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const i of issues) map[i.path] ??= i.message;
    return map;
  }, [issues]);
  const err = (path: string) => (errors[path] ? t(errors[path]) : undefined);
  const core = issues.filter(isCoreIssue);
  const valid = core.length === 0;

  const today = useMemo(() => new Date(), []);
  const r = useMemo(() => calculateTopUp(input, today), [input, today]);
  const o = r.option;

  useEffect(() => {
    if (!valid) return onHero(null);
    const saving = o.additionalInterest < 0;
    onHero({
      label: saving ? 'Interest saved' : 'Additional interest',
      value: money(Math.abs(o.additionalInterest)),
      caption: `${lakh(o.charges.net)} in hand · ${mo(o.months)}`,
    });
  }, [valid, o.additionalInterest, o.charges.net, o.months, onHero]);

  /* ---------------- Actions ---------------- */

  const resetExample = () => {
    setState((s) => ({ ...defaultState(), pinned: s.pinned }));
    notify(t('Example restored'));
  };
  const startBlank = () => {
    setState((s) => ({ ...defaultState(), input: blankInput(), pinned: s.pinned }));
    notify(t('Cleared — enter your own loan'));
  };
  const onCopy = async () => {
    const ok = await copyText(`${t('Loan Top-Up Calculator')}\n${summaryText(r, input)}`);
    notify(ok ? t('Result copied') : t('Could not copy'));
  };
  const pin = () => {
    const snap = {
      id: `${o.loan}-${o.ratePct}-${o.months}-${Date.now().toString(36)}`,
      loan: o.loan,
      ratePct: o.ratePct,
      months: o.months,
      emi: o.emi,
      netCash: o.charges.net,
      additionalInterest: o.additionalInterest,
      additionalPayments: o.additionalPayments,
      level: r.verdict.level,
    };
    setState((s) => ({ ...s, pinned: [snap, ...s.pinned].slice(0, MAX_PINNED) }));
    notify(t('Option saved — change the inputs to compare'));
  };
  const unpin = (id: string) => setState((s) => ({ ...s, pinned: s.pinned.filter((p) => p.id !== id) }));
  const chooseTenure = (m: number) =>
    setState((s) => ({
      ...s,
      tenureCustom: !(NEW_TENURE_MONTHS as readonly number[]).includes(m),
      input: { ...s.input, topup: { ...s.input.topup, tenureMonths: m } },
    }));

  /* ---------------- Step helpers ---------------- */

  const calculatedRemaining = Math.max(0, Math.round(e.originalTenureMonths || 0) - Math.round(e.emisPaid || 0));
  const autoLoan = (e.outstanding || 0) + (tu.required || 0);

  const setRemainingMode = (mode: 'auto' | 'manual') =>
    setExisting(mode === 'manual' && !(e.remainingMonths > 0) ? { remainingMode: mode, remainingMonths: calculatedRemaining } : { remainingMode: mode });
  const setLoanMode = (mode: 'auto' | 'sanctioned') =>
    setTopup(mode === 'sanctioned' && !(tu.sanctionedLoan > (e.outstanding || 0)) ? { loanMode: mode, sanctionedLoan: autoLoan } : { loanMode: mode });

  return (
    <>
      <div className="tu-grid" id="calc-tool">
        <div className="tu-main no-print">
          {/* ------------------------- 1. Existing loan ------------------------- */}
          <Step n={1} title={t('Your existing loan')} hint={t('From your latest loan statement')}>
            <div className="fields">
              <Num
                path="existing.originalAmount"
                label="Original Loan Amount"
                type="currency"
                value={e.originalAmount}
                error={err('existing.originalAmount')}
                onChange={(v) => setExisting({ originalAmount: v })}
                help="The amount first sanctioned — not what you owe today."
              />
              <Num
                path="existing.originalRatePct"
                label="Original Interest Rate"
                type="percent"
                value={e.originalRatePct}
                error={err('existing.originalRatePct')}
                onChange={(v) => setExisting({ originalRatePct: v })}
                help="If the rate has changed since, enter today’s rate."
              />
              <OriginalTenure
                months={e.originalTenureMonths}
                custom={state.originalCustom}
                error={err('existing.originalTenureMonths')}
                onPick={(months, custom) =>
                  setState((s) => ({
                    ...s,
                    originalCustom: custom,
                    input: { ...s.input, existing: { ...s.input.existing, originalTenureMonths: months } },
                  }))
                }
              />
              <Num
                path="existing.emisPaid"
                label="EMIs Already Paid"
                unit="EMIs"
                value={e.emisPaid}
                error={err('existing.emisPaid')}
                onChange={(v) => setExisting({ emisPaid: v })}
              />
              <Num
                path="existing.currentEmi"
                label="Current EMI"
                type="currency"
                value={e.currentEmi}
                error={err('existing.currentEmi')}
                onChange={(v) => setExisting({ currentEmi: v })}
              />
              <Num
                path="existing.outstanding"
                label="Current Outstanding Principal"
                type="currency"
                value={e.outstanding}
                error={err('existing.outstanding')}
                onChange={(v) => setExisting({ outstanding: v })}
                help="The principal still owed today, from your statement or the lender’s app."
              />
            </div>

            <div className="tu-remaining">
              <div className="tu-row-head">
                <span className="field-label">
                  {t('Remaining Tenure')}
                  <Tooltip text={t('Calculated as original tenure minus EMIs paid, or enter the figure on your statement.')} />
                </span>
                <Seg
                  label={t('Remaining tenure')}
                  value={e.remainingMode}
                  options={[
                    ['auto', t('Calculate')],
                    ['manual', t('Enter myself')],
                  ]}
                  onChange={(v) => setRemainingMode(v as 'auto' | 'manual')}
                />
              </div>
              {e.remainingMode === 'auto' ? (
                <p className="tu-derived">
                  <strong className="num">{mo(calculatedRemaining)}</strong>
                  <span className="muted">
                    {Math.round(e.originalTenureMonths || 0)} − {Math.round(e.emisPaid || 0)} {t('EMIs paid')}
                  </span>
                </p>
              ) : (
                <div className="fields">
                  <Num
                    path="existing.remainingMonths"
                    label="Months Left on Your Statement"
                    unit="months"
                    value={e.remainingMonths}
                    error={err('existing.remainingMonths')}
                    onChange={(v) => setExisting({ remainingMonths: v })}
                  />
                </div>
              )}
            </div>

            {valid && r.mismatches.length > 0 && (
              <div className="note warn" role="status">
                <Icon name="alert" size={16} className="i" />
                <div>
                  <strong>{t('Your entered values and calculated values differ. Please verify your loan statement.')}</strong>
                  <ul className="tu-mismatch">
                    {r.mismatches.map((m) =>
                      m.field === 'remaining' ? (
                        <li key="remaining">
                          {t('Remaining tenure')}: {t('you entered')} {mo(m.entered)}; {t('original tenure − EMIs paid gives')} {mo(m.calculated)}.{' '}
                          {t('Your figure is used.')}
                        </li>
                      ) : (
                        <li key="emi">
                          {t('Current EMI')}: {t('you entered')} {money(m.entered)}; {money(m.calculated)} {t('would clear the outstanding in the months left at this rate. Your figure is used.')}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            )}
          </Step>

          {/* ------------------------- 2. Top-up requirement ------------------------- */}
          <Step n={2} title={t('Your top-up requirement')} hint={t('What you need, and what the bank will pay out')}>
            <div className="fields">
              <Num
                path="topup.required"
                label="Additional Money Required"
                type="currency"
                value={tu.required}
                error={err('topup.required')}
                onChange={(v) => setTopup({ required: v })}
                help="The cash you actually need in hand."
              />
              <Num
                path="topup.eligibility"
                label="Top-Up Eligibility (optional)"
                type="currency"
                value={tu.eligibility}
                error={err('topup.eligibility')}
                onChange={(v) => setTopup({ eligibility: v })}
                help="The top-up your bank says you can get, if you know it. Leave blank otherwise."
              />
            </div>

            <div className="tu-newloan">
              <div className="tu-row-head">
                <span className="field-label">{t('New / Consolidated Loan Amount')}</span>
                <Seg
                  label={t('New loan amount')}
                  value={tu.loanMode}
                  options={[
                    ['auto', t('Outstanding + top-up')],
                    ['sanctioned', t('Bank’s figure')],
                  ]}
                  onChange={(v) => setLoanMode(v as 'auto' | 'sanctioned')}
                />
              </div>
              {tu.loanMode === 'auto' ? (
                <p className="tu-derived">
                  <strong className="num">{money(autoLoan)}</strong>
                  <span className="muted">
                    {money(e.outstanding || 0)} {t('outstanding')} + {money(tu.required || 0)} {t('top-up')}
                  </span>
                </p>
              ) : (
                <div className="fields">
                  <Num
                    path="topup.sanctionedLoan"
                    label="Loan Amount Sanctioned"
                    type="currency"
                    value={tu.sanctionedLoan}
                    error={err('topup.sanctionedLoan')}
                    onChange={(v) => setTopup({ sanctionedLoan: v })}
                    help="The total new loan in the bank’s offer. Your top-up is this minus the outstanding principal."
                  />
                </div>
              )}
            </div>

            <details className="acc tu-charges" open={tu.feePct > 0 || tu.otherCharges > 0 || tu.insurance > 0 ? true : undefined}>
              <summary>
                <span>{t('Charges & deductions (optional)')}</span>
                <span className="tu-acc-value num">{o.charges.total > 0 ? `− ${money(o.charges.total)}` : t('None')}</span>
              </summary>
              <div className="acc-body">
                <div className="fields">
                  <Num
                    path="topup.feePct"
                    label="Processing Fee"
                    type="percent"
                    value={tu.feePct}
                    error={err('topup.feePct')}
                    onChange={(v) => setTopup({ feePct: v })}
                    help="18% GST is added to the fee automatically."
                  />
                  <div className="field">
                    <span className="field-label">{t('Fee charged on')}</span>
                    <Seg
                      label={t('Fee charged on')}
                      value={tu.feeOn}
                      options={[
                        ['topup', t('Top-up')],
                        ['loan', t('Whole loan')],
                      ]}
                      onChange={(v) => setTopup({ feeOn: v as 'topup' | 'loan' })}
                    />
                  </div>
                  <Num
                    path="topup.otherCharges"
                    label="GST / Other Charges"
                    type="currency"
                    value={tu.otherCharges}
                    error={err('topup.otherCharges')}
                    onChange={(v) => setTopup({ otherCharges: v })}
                    help="Stamp duty, legal, valuation or any other charge taken from the payout."
                  />
                  <Num
                    path="topup.insurance"
                    label="Insurance / Other Deductions"
                    type="currency"
                    value={tu.insurance}
                    error={err('topup.insurance')}
                    onChange={(v) => setTopup({ insurance: v })}
                    help="Loan insurance or any product bundled and deducted from the payout."
                  />
                </div>
              </div>
            </details>

            <CashLadder r={r} />
            {errors['topup.charges'] && (
              <p className="error" role="alert">
                <Icon name="alert" size={13} strokeWidth={2} />
                {t(errors['topup.charges'])}
              </p>
            )}
          </Step>

          {/* ------------------------- 3. New loan terms ------------------------- */}
          <Step n={3} title={t('New loan terms')} hint={t('The rate and tenure on offer')}>
            <div className="fields">
              <Num
                path="topup.newRatePct"
                label="New Interest Rate"
                type="percent"
                value={tu.newRatePct}
                error={err('topup.newRatePct')}
                onChange={(v) => setTopup({ newRatePct: v })}
              />
              <Num
                path="topup.comfortableEmi"
                label="Comfortable EMI (optional)"
                type="currency"
                value={tu.comfortableEmi}
                error={err('topup.comfortableEmi')}
                onChange={(v) => setTopup({ comfortableEmi: v })}
                help="The most you can pay every month without strain. Used to recommend the best tenure."
              />
            </div>
            <TenurePicker
              months={tu.tenureMonths}
              custom={state.tenureCustom}
              error={err('topup.tenureMonths')}
              onPick={(months, custom) =>
                setState((s) => ({ ...s, tenureCustom: custom, input: { ...s.input, topup: { ...s.input.topup, tenureMonths: months } } }))
              }
            />

            <div className="tu-ctas">
              <button type="button" className="btn primary" onClick={() => scrollToSection('tu-compare')} disabled={!valid}>
                {t('Compare My Loan Options')}
              </button>
              <button type="button" className="btn outline" onClick={() => scrollToSection('tu-tenure')} disabled={!valid}>
                {t('Find My Best Tenure')}
              </button>
              <button type="button" className="btn outline" onClick={() => scrollToSection('tu-amounts')} disabled={!valid}>
                {t('Compare All Scenarios')}
              </button>
            </div>

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
          </Step>
        </div>

        {/* ------------------------- The decision ------------------------- */}
        <aside className="tu-side" aria-label={t('Your decision')}>
          <div className="card panel-result tu-result" id="calc-result">
            {valid ? (
              <>
                <Verdict r={r} />
                <div className="card-pad stack">
                  <div ref={heroRef} className="anim-zoom">
                    <div className="hero-result">
                      <div className="h-label">{o.additionalInterest < 0 ? t('Interest saved from today') : t('Additional interest from today')}</div>
                      <div className={`h-value num value-in${fit(money(o.additionalInterest))}`}>
                        <TweenedText value={money(Math.abs(o.additionalInterest))} />
                      </div>
                      <div className="h-caption">
                        {t('versus continuing your current loan')} · {lakh(o.charges.net)} {t('in hand')}
                      </div>
                    </div>
                  </div>

                  <dl className="tu-quick">
                    <div>
                      <dt>{t('New EMI')}</dt>
                      <dd className="num">{money(o.emi)}</dd>
                      <dd className="tu-sub">{t(emiChangeWords(o.emiChange))}</dd>
                    </div>
                    <div>
                      <dt>{t('Tenure')}</dt>
                      <dd className="num">{mo(o.months)}</dd>
                      <dd className="tu-sub">
                        {t('ends')} {when(o.completion)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t('Recommended')}</dt>
                      <dd className="num">{mo(r.recommendation.months)}</dd>
                      <dd className="tu-sub">EMI {money(r.recommendation.row.emi)}</dd>
                    </div>
                  </dl>

                  <ul className="tu-checks">
                    {r.verdict.checks.map((c) => (
                      <li key={c.id} className={c.tone}>
                        <span className="tu-check-mark" aria-hidden="true">
                          <Icon name={c.tone === 'good' ? 'check' : 'alert'} size={13} strokeWidth={2.4} />
                        </span>
                        <span className="sr-only">{c.tone === 'good' ? t('Fine:') : c.tone === 'warn' ? t('Caution:') : t('Problem:')}</span>
                        {t(checkText(c, r, input))}
                      </li>
                    ))}
                  </ul>

                  {issues
                    .filter((i) => i.level === 'warn')
                    .map((i) => (
                      <p className="note warn" key={i.path}>
                        <Icon name="alert" size={16} className="i" />
                        <span>{t(i.message)}</span>
                      </p>
                    ))}

                  <div className="btn-row no-print tu-actions">
                    <button type="button" className="btn subtle sm" onClick={pin} title={t('Keep this result to compare after you change the inputs')}>
                      <Icon name="star" size={15} />
                      {t('Save option')}
                    </button>
                    <button type="button" className="btn subtle sm" onClick={onCopy}>
                      <Icon name="copy" size={15} />
                      {t('Copy')}
                    </button>
                    <button type="button" className="btn subtle sm" onClick={printPage}>
                      <Icon name="printer" size={15} />
                      {t('Print / PDF')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="card-pad">
                <div className="result-placeholder tu-issues">
                  <span className="p-ring">
                    <Icon name="alert" size={24} />
                  </span>
                  <span className="p-title">{t('Fix these to see your comparison')}</span>
                  <ul>
                    {core.slice(0, 6).map((i) => (
                      <li key={i.path}>{t(i.message)}</li>
                    ))}
                    {core.length > 6 && <li>{t('…and {n} more').replace('{n}', String(core.length - 6))}</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {valid && (
        <TopUpSections
          r={r}
          input={input}
          state={state}
          errors={errors}
          onScenarios={setScenarios}
          onRequired={(v) => setTopup({ required: v })}
          onPrepay={setPrepay}
          onComfortable={(v) => setTopup({ comfortableEmi: v })}
          onChooseTenure={chooseTenure}
          onSchedule={(view) => setState((s) => ({ ...s, schedule: view }))}
          onPin={pin}
          onUnpin={unpin}
        />
      )}

      <p className="note tu-disclaimer">
        <Icon name="info" size={16} className="i" />
        <span>
          <strong>{t('Estimates only:')}</strong>{' '}
          {t(
            'This calculator provides estimates for comparison and educational purposes. Actual loan terms, interest calculations, processing fees, taxes, insurance, prepayment charges and foreclosure conditions may vary by lender and loan agreement. Verify the final figures with your lender before making a financial decision.',
          )}
        </span>
      </p>
    </>
  );
}

/** Steps the headline size down for long figures, as the other calculators do. */
const fit = (value: string) => (value.length > 13 ? ' xs' : value.length > 10 ? ' sm' : '');

/* ================================================================== */
/* Pieces                                                              */
/* ================================================================== */

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="card panel-input tu-step" aria-labelledby={id}>
      <div className="tu-step-head">
        <span className="tu-step-n" aria-hidden="true">
          {n}
        </span>
        <div>
          <h2 id={id} className="tu-step-title">
            {title}
          </h2>
          <p className="tu-step-hint">{hint}</p>
        </div>
      </div>
      <div className="tu-step-body">{children}</div>
    </section>
  );
}

/** Original tenure: 1–10 years, or a custom number of months. */
function OriginalTenure({
  months,
  custom,
  error,
  onPick,
}: {
  months: number;
  custom: boolean;
  error?: string;
  onPick: (months: number, custom: boolean) => void;
}) {
  const t = useT();
  const id = useId();
  const isCustom = custom || !isOriginalChoice(months);
  return (
    <div className={`field${isCustom ? ' tu-tenure-custom' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {t('Original Tenure')}
      </label>
      <div className="tu-tenure-pair">
        <div className="input-wrap select-wrap">
          <select
            id={id}
            className="input"
            value={isCustom ? 'custom' : String(months)}
            onChange={(ev) => (ev.target.value === 'custom' ? onPick(months, true) : onPick(Number(ev.target.value), false))}
          >
            {ORIGINAL_TENURE_YEARS.map((y) => (
              <option key={y} value={y * 12}>
                {y} {y === 1 ? t('year') : t('years')} ({y * 12} {t('mo')})
              </option>
            ))}
            <option value="custom">{t('Custom')}</option>
          </select>
        </div>
        {isCustom && (
          <Num path="existing.originalTenureMonths" label="Custom tenure" unit="months" value={months} error={error} onChange={(v) => onPick(v, true)} />
        )}
      </div>
      {!isCustom && error && (
        <div className="error" role="alert">
          <Icon name="alert" size={13} strokeWidth={2} />
          {error}
        </div>
      )}
    </div>
  );
}

/** New tenure: one-tap choices from 12 to 120 months, or custom. */
function TenurePicker({
  months,
  custom,
  error,
  onPick,
}: {
  months: number;
  custom: boolean;
  error?: string;
  onPick: (months: number, custom: boolean) => void;
}) {
  const t = useT();
  const id = useId();
  const isCustom = custom || !(NEW_TENURE_MONTHS as readonly number[]).includes(months);
  return (
    <div className="tu-tenure" role="group" aria-labelledby={id}>
      <span className="field-label" id={id}>
        {t('New Tenure')}
        <span className="tu-tenure-years muted">{months > 0 ? `· ${formatYears(months)}` : ''}</span>
      </span>
      <div className="tu-chips">
        {NEW_TENURE_MONTHS.map((m) => (
          <button key={m} type="button" className="tu-chip" aria-pressed={!isCustom && months === m} onClick={() => onPick(m, false)}>
            {m}
            <span className="sr-only"> {t('months')}</span>
          </button>
        ))}
        <button type="button" className="tu-chip" aria-pressed={isCustom} onClick={() => onPick(months, true)}>
          {t('Custom')}
        </button>
      </div>
      {isCustom ? (
        <div className="fields">
          <Num path="topup.tenureMonths" label="Custom tenure" unit="months" value={months} error={error} onChange={(v) => onPick(v, true)} />
        </div>
      ) : (
        error && (
          <div className="error" role="alert">
            <Icon name="alert" size={13} strokeWidth={2} />
            {error}
          </div>
        )
      )}
    </div>
  );
}

const formatYears = (m: number) => {
  const y = m / 12;
  return Number.isInteger(y) ? `${y} ${y === 1 ? 'year' : 'years'}` : `${Math.round(y * 10) / 10} years`;
};

/** Top-up → − fee − GST − other − insurance → cash in hand. */
function CashLadder({ r }: { r: TopUpResult }) {
  const t = useT();
  const c = r.option.charges;
  const rows: [string, number][] = [
    [t('Processing fee'), c.fee],
    [t('GST on fee (18%)'), c.gst],
    [t('Other charges'), c.other],
    [t('Insurance / other deductions'), c.insurance],
  ];
  return (
    <div className="tu-ladder" role="group" aria-label={t('Cash you actually receive')}>
      <div className="tu-ladder-row">
        <span>{t('Gross top-up')}</span>
        <span className="num">{money(r.option.grossTopUp)}</span>
      </div>
      {rows
        .filter(([, v]) => v > 0)
        .map(([label, v]) => (
          <div className="tu-ladder-row less" key={label}>
            <span>− {label}</span>
            <span className="num">{money(v)}</span>
          </div>
        ))}
      <div className="tu-ladder-row total">
        <span>{t('Net cash you receive')}</span>
        <span className="num">{money(c.net)}</span>
      </div>
      {r.topUpForFullCash != null && (
        <p className="tu-ladder-note">
          {t('To have the full amount in hand, ask for a top-up of about')} <strong className="num">{money(r.topUpForFullCash)}</strong>.
        </p>
      )}
    </div>
  );
}

function Verdict({ r }: { r: TopUpResult }) {
  const t = useT();
  const level = r.verdict.level;
  const label = level === 'green' ? t('Looks reasonable') : level === 'amber' ? t('Worth a second look') : t('Serious concerns');
  return (
    <div className={`tu-verdict ${level}`}>
      <span className="tu-verdict-pill">
        <span className="tu-dot" aria-hidden="true" />
        {label}
      </span>
      <h2 className="tu-verdict-title">{t(verdictTitle(r))}</h2>
      <p className="tu-verdict-lead">{t(verdictLead(r))}</p>
    </div>
  );
}
