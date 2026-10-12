import type { TableSpec } from '../types';
import type { Check, TopUpInput, TopUpResult, TenureRow } from '@/engines/topup';
import { THRESHOLDS } from '@/engines/topup';
import { formatINR, formatINRCompact, formatMonthYear, formatNumber, formatPercent } from '@/lib/format';

/**
 * Words for the top-up decision: the verdict, the reasons behind it, the
 * personal recommendation, the one-line takeaway for each section, and
 * the plain-text, CSV and schedule versions used by copy and export.
 * Pure — the screen and the tests share it.
 *
 * Tenures are spoken in years ("7 years"); only counts of EMIs are in
 * months. Takeaways and points mark the figures to stress, by what they
 * mean: ++…++ money you get or save, ~~…~~ extra cost, **…** a key
 * fact. The screen colours them; copy and share strip the marks.
 */

export const money = (v: number): string => formatINR(v);
/** ₹3.00 L for headline amounts; small amounts in full. */
export const lakh = (v: number): string => (Math.abs(v) >= 1e5 ? formatINRCompact(v) : formatINR(v));
/** A count of EMIs: "56 months". */
export const mo = (m: number): string => `${formatNumber(m)} ${Math.round(m) === 1 ? 'month' : 'months'}`;
/** A tenure or a span of time, in years: "7 years", "4.5 years", or "2 yrs 4 mo" when it is not a whole half-year. */
export function yrs(m: number): string {
  const months = Math.max(0, Math.round(m));
  const y = months / 12;
  if (months % 6 === 0) return `${formatNumber(y, 1)} ${y === 1 ? 'year' : 'years'}`;
  const whole = Math.floor(y);
  const rest = months - whole * 12;
  return whole ? `${whole} ${whole === 1 ? 'yr' : 'yrs'} ${rest} mo` : `${rest} ${rest === 1 ? 'month' : 'months'}`;
}
/** "5-year", as in a 5-year tenure. */
export const yrAdj = (m: number): string => (Math.round(m) % 6 === 0 ? `${formatNumber(m / 12, 1)}-year` : `${formatNumber(m)}-month`);
export const when = (d: Date): string => formatMonthYear(d);
export const ratePct = (v: number): string => `${formatNumber(v, 2)}%`;
const b = (text: string) => `**${text}**`;
const up = (text: string) => `++${text}++`;
const down = (text: string) => `~~${text}~~`;
/** Removes the emphasis marks, for plain text. */
export const plain = (text: string): string => text.replace(/\*\*|\+\+|~~/g, '');

/* ------------------------------------------------------------------ */
/* The verdict                                                         */
/* ------------------------------------------------------------------ */

const isTenureCost = (c: Check) => (c.id === 'tenure' || c.id === 'interest') && c.tone !== 'good';

export function verdictTitle(r: TopUpResult): string {
  const v = r.verdict;
  if (v.level === 'green') return 'Top-Up May Be Reasonable';
  if (v.level === 'red') return 'Top-Up May Not Be Financially Attractive';
  return v.checks.some(isTenureCost) && r.recommendation.months < r.option.months
    ? 'Top-Up Is Possible, But Consider a Shorter Tenure'
    : 'Top-Up Is Possible — Check the Points Below';
}

export function verdictLead(r: TopUpResult): string {
  const o = r.option;
  const v = r.verdict;
  if (v.level === 'green')
    return 'Based on the numbers entered, this top-up appears reasonable: it covers what you need without stretching the loan or the interest too far.';
  if (v.level === 'red')
    return `Based on the numbers entered, this top-up does not appear financially attractive as it stands. ${redAdvice(r)}`;
  if (v.checks.some(isTenureCost) && r.recommendation.months < o.months)
    return `Based on the numbers entered, the top-up appears workable, but ${yrs(o.months)} adds about ${lakh(o.additionalInterest)} of interest. A ${yrAdj(r.recommendation.months)} tenure would cost about ${lakh(r.recommendation.interestSaved)} less.`;
  return 'Based on the numbers entered, the top-up appears workable, but a few points deserve a second look.';
}

/** One plain sentence for each check behind the verdict. */
export function checkText(c: Check, r: TopUpResult, input: TopUpInput): string {
  const o = r.option;
  const e = r.existing;
  const t = input.topup;
  switch (c.id) {
    case 'cash-need':
      return `You receive ${lakh(o.charges.net)} — what you need.`;
    case 'cash-short':
      return `After charges you receive ${lakh(o.charges.net)}, ${money(t.required - o.charges.net)} short of the ${lakh(t.required)} you need.`;
    case 'over-borrow':
      return `You would borrow ${lakh(o.grossTopUp)} — ${lakh(o.grossTopUp - t.required)} more than the ${lakh(t.required)} you need.`;
    case 'eligibility':
      return `A top-up of ${lakh(o.grossTopUp)} is more than the ${lakh(t.eligibility)} your bank says you are eligible for.`;
    case 'emi-comfort':
      return c.tone === 'good'
        ? `The EMI of ${money(o.emi)} is within your comfortable ${money(t.comfortableEmi)}.`
        : `The EMI of ${money(o.emi)} is ${c.tone === 'bad' ? 'well ' : ''}above your comfortable ${money(t.comfortableEmi)}.`;
    case 'emi-unknown':
      return `The EMI would be ${money(o.emi)}, ${emiChangeWords(o.emiChange)}. Add a comfortable EMI to check affordability.`;
    case 'tenure': {
      if (c.tone === 'bad') return `${yrs(o.months)} is a very long tenure — interest keeps building all that time.`;
      if (o.extensionMonths > 0)
        return `The loan would end in ${when(o.completion)}, ${yrs(o.extensionMonths)} later than today’s ${when(e.completion)}.`;
      return o.extensionMonths < 0
        ? `The loan would end in ${when(o.completion)}, ${yrs(-o.extensionMonths)} sooner than today’s ${when(e.completion)}.`
        : `The loan would end in ${when(o.completion)}, the same month as today’s loan.`;
    }
    case 'interest':
      return o.additionalInterest <= 0
        ? `You would pay ${lakh(-o.additionalInterest)} less interest than on today’s loan.`
        : `It adds about ${lakh(o.additionalInterest)} of interest — ${formatINR(o.interestPerRupee, 2)} for every ₹1 you receive.`;
    case 'charges':
      return `Charges of ${money(o.charges.total)} take ${formatPercent(o.charges.pctOfTopUp, 1)} of the top-up.`;
  }
}

/** What to change when the verdict is red, led by its most serious problem. */
export function redAdvice(r: TopUpResult): string {
  const first = r.verdict.checks.find((c) => c.tone === 'bad')?.id;
  if (first === 'emi-comfort') return 'The EMI is the problem: a longer tenure or a smaller top-up would bring it within your budget.';
  if (first === 'over-borrow') return 'Borrowing only what you need would cut both the EMI and the interest.';
  if (first === 'eligibility') return 'Your bank may not sanction this much — check your eligibility or borrow less.';
  if (first === 'charges') return 'The charges take too much of the money — ask the lender to waive or reduce them, or compare other lenders.';
  return 'A shorter tenure or a smaller top-up would cut the extra interest — compare those before you decide.';
}

export function emiChangeWords(change: number): string {
  if (Math.abs(change) < 0.5) return 'the same as today';
  return change < 0 ? `${money(-change)} less than today` : `${money(change)} more than today`;
}

/* ------------------------------------------------------------------ */
/* The recommendation                                                  */
/* ------------------------------------------------------------------ */

/** "Recommended tenure: 5 years" and why, in two sentences. */
export function recommendationText(r: TopUpResult, input: TopUpInput): string {
  const rec = r.recommendation;
  const comfortable = input.topup.comfortableEmi;
  const vs = rec.against
    ? ` while saving approximately ${lakh(rec.interestSaved)} in interest compared with the ${yrAdj(rec.against.months)} option`
    : '';
  if (rec.basis === 'comfortable')
    return `This keeps your EMI at ${money(rec.row.emi)}, within your comfortable ${money(comfortable)},${vs}.`;
  if (rec.basis === 'none-fit')
    return `No tenure up to ${yrs(r.tenures[r.tenures.length - 1].months)} keeps the EMI within ${money(comfortable)} — the lowest is ${money(
      r.tenures[r.tenures.length - 1].emi,
    )}. ${yrs(rec.months)} is the closest balance of EMI and interest; consider a smaller top-up.`;
  return `It sits closest to both the lowest EMI and the lowest interest${vs}. Add a comfortable EMI to tailor this.`;
}

export interface Point {
  tone: 'info' | 'good' | 'warn';
  text: string;
}

/** The personal recommendation as short points, built from the borrower’s own numbers. */
export function personalPoints(r: TopUpResult, input: TopUpInput): Point[] {
  const o = r.option;
  const e = r.existing;
  const t = input.topup;
  const rec = r.recommendation;
  const p: Point[] = [];

  const charges = o.charges.total > 0 ? ` after ${money(o.charges.total)} of charges` : '';
  p.push({
    tone: 'info',
    text: `A top-up at ${ratePct(o.ratePct)} over ${yrs(o.months)} puts ${up(lakh(o.charges.net))} in your hands${charges} and moves your EMI from ${money(e.emi)} to ${b(
      money(o.emi),
    )} (${emiChangeWords(o.emiChange)}).`,
  });

  if (o.extensionMonths > 0)
    p.push({ tone: 'warn', text: `Your loan would run until ${when(o.completion)} instead of ${when(e.completion)} — ${down(yrs(o.extensionMonths))} longer.` });
  else if (o.extensionMonths < 0)
    p.push({ tone: 'good', text: `Your loan would still finish by ${when(o.completion)}, ${up(yrs(-o.extensionMonths))} ahead of today’s ${when(e.completion)}.` });

  p.push(
    o.additionalInterest > 0
      ? {
          tone: o.interestPerRupee > THRESHOLDS.interestPerRupee.warn ? 'warn' : 'info',
          text: `Compared with simply continuing today’s loan, you would pay about ${down(`${lakh(o.additionalInterest)} more in interest`)} from today.`,
        }
      : { tone: 'good', text: `Compared with continuing today’s loan, you would pay about ${up(`${lakh(-o.additionalInterest)} less in interest`)}, because the new terms are cheaper.` },
  );

  if (rec.months < o.months) {
    const fits = rec.basis === 'comfortable' ? `, within your ${money(t.comfortableEmi)} comfort level,` : '';
    p.push({
      tone: 'good',
      text: `A ${yrAdj(rec.months)} tenure would raise the EMI to ${money(rec.row.emi)}${fits} but cut the interest by about ${up(lakh(o.futureInterest - rec.row.interest))} and finish ${yrs(o.months - rec.months)} sooner.`,
    });
  } else if (rec.months > o.months && t.comfortableEmi > 0 && o.emi > t.comfortableEmi) {
    p.push({
      tone: 'warn',
      text: `At ${money(o.emi)} the EMI is above your comfort level; ${b(yrs(rec.months))} brings it to ${money(rec.row.emi)} for about ${lakh(
        rec.row.interest - o.futureInterest,
      )} more interest.`,
    });
  }

  if (r.larger?.source === 'sanctioned')
    p.push({ tone: 'warn', text: `You would be borrowing ${down(lakh(r.larger.extraTopUp))} more than you need, which alone adds about ${lakh(r.larger.extraInterest)} of interest.` });
  if (r.topUpForFullCash != null)
    p.push({ tone: 'warn', text: `To have the full ${lakh(t.required)} in hand after charges, the top-up would need to be about ${b(lakh(r.topUpForFullCash))}.` });
  if (r.prepayment.active && r.prepayment.interestSaved > 0)
    p.push({
      tone: 'good',
      text: `Prepaying as planned would save a further ${up(lakh(r.prepayment.interestSaved))} and close the loan ${yrs(r.prepayment.monthsSaved)} early.`,
    });
  return p;
}

/** The one sentence to act on. */
export function bottomLine(r: TopUpResult): string {
  const rec = r.recommendation;
  if (r.verdict.level === 'green') return 'If the EMI fits comfortably in your budget, the top-up looks like a reasonable way to raise the money.';
  if (r.verdict.level === 'amber')
    return rec.months < r.option.months
      ? `If you can manage the higher EMI, the ${yrAdj(rec.months)} tenure is the stronger choice.`
      : 'Check the points above with your lender before you decide.';
  return redAdvice(r);
}

/** The whole recommendation as one paragraph, for copy and share. */
export function personalRecommendation(r: TopUpResult, input: TopUpInput): string {
  return plain([`You need ${lakh(input.topup.required)}.`, ...personalPoints(r, input).map((x) => x.text), bottomLine(r)].join(' '));
}

/* ------------------------------------------------------------------ */
/* Takeaways: one line under each section heading                     */
/* ------------------------------------------------------------------ */

export function compareTakeaway(r: TopUpResult): string {
  const o = r.option;
  return o.additionalInterest >= 0
    ? `The top-up puts ${up(lakh(o.charges.net))} in your hands and costs ${down(`${lakh(o.additionalInterest)} more in interest`)} than keeping today’s loan.`
    : `The top-up puts ${up(lakh(o.charges.net))} in your hands and still costs ${up(`${lakh(-o.additionalInterest)} less in interest`)} than today’s loan.`;
}

export function tenureTakeaway(r: TopUpResult): string {
  const rec = r.recommendation;
  if (!rec.against) return `${b(yrs(rec.months))} is the best balance of EMI and interest here, at ${money(rec.row.emi)} a month.`;
  return `${b(yrs(rec.months))} is the sweet spot: ${money(rec.emiIncrease)} more a month than ${yrs(rec.against.months)}, but ${up(
    `${lakh(rec.interestSaved)} less interest`,
  )}.`;
}

/** What each extra lakh of borrowing adds, from the scenarios. */
export function amountTakeaway(r: TopUpResult): string | null {
  const rows = r.scenarios;
  if (rows.length < 2) return null;
  const lo = rows.reduce((a, x) => (x.amount < a.amount ? x : a));
  const hi = rows.reduce((a, x) => (x.amount > a.amount ? x : a));
  const span = hi.amount - lo.amount;
  if (span <= 0) return null;
  const perLakh = ((hi.option.futureInterest - lo.option.futureInterest) / span) * 1e5;
  const emiPerLakh = ((hi.option.emi - lo.option.emi) / span) * 1e5;
  return `Every extra ${b('₹1 L')} you borrow adds about ${down(`${money(perLakh)} of interest`)} and ${money(emiPerLakh)} to the EMI — borrow what you need.`;
}

export function prepayTakeaway(r: TopUpResult): string | null {
  const p = r.prepayment;
  if (!p.active || p.interestSaved <= 0) return null;
  return `Prepaying as planned saves ${up(lakh(p.interestSaved))} and closes the loan ${up(`${yrs(p.monthsSaved)} early`)}, in ${when(p.completion)}.`;
}

/** Advice for each band of the flexibility-versus-interest matrix. */
export function matrixAdvice(band: 'long' | 'medium' | 'short', row: TenureRow): string {
  if (row.affordable === false) return 'Above your comfortable EMI';
  if (band === 'long') return 'Only if monthly cash flow is tight';
  if (band === 'medium') return 'Often a reasonable balance';
  return row.affordable ? 'Best — and within your comfortable EMI' : 'Best if affordable';
}

/* ------------------------------------------------------------------ */
/* Copy, CSV, schedule                                                 */
/* ------------------------------------------------------------------ */

export function summaryText(r: TopUpResult, input: TopUpInput): string {
  const o = r.option;
  const e = r.existing;
  return [
    `${verdictTitle(r)}`,
    '',
    `WITHOUT TOP-UP: ${money(e.outstanding)} outstanding, EMI ${money(e.emi)} for ${mo(e.remainingMonths)} (${yrs(e.remainingMonths)}); remaining payments ${money(
      e.remainingPayments,
    )}, of which interest ${money(e.futureInterest)}. Ends ${when(e.completion)}.`,
    `WITH TOP-UP: ${money(o.loan)} at ${ratePct(o.ratePct)} for ${yrs(o.months)}; EMI ${money(o.emi)}; cash received ${money(
      o.charges.net,
    )}; future payments ${money(o.totalPayments)}, of which interest ${money(o.futureInterest)}. Ends ${when(o.completion)}.`,
    '',
    `Additional future payments: ${money(o.additionalPayments)} (includes the borrowed principal)`,
    `Additional interest: ${money(o.additionalInterest)}`,
    `Recommended tenure: ${yrs(r.recommendation.months)} — EMI ${money(r.recommendation.row.emi)}`,
    '',
    personalRecommendation(r, input),
  ].join('\n');
}

export const TENURE_CSV_COLUMNS = [
  { key: 'years', label: 'Tenure (years)' },
  { key: 'emi', label: 'EMI' },
  { key: 'total', label: 'Total payment' },
  { key: 'interest', label: 'Interest' },
  { key: 'additional', label: 'Additional interest vs existing loan' },
  { key: 'ends', label: 'Last EMI' },
];

export function tenureCsvRows(r: TopUpResult) {
  return r.tenures.map((x) => ({
    years: Math.round((x.months / 12) * 100) / 100,
    emi: Math.round(x.emi),
    total: Math.round(x.totalPayment),
    interest: Math.round(x.interest),
    additional: Math.round(x.additionalInterest),
    ends: when(x.completion),
  }));
}

export function scheduleTable(r: TopUpResult, view: 'monthly' | 'yearly'): TableSpec {
  const s = r.schedule;
  const note = 'For information only. Your lender’s schedule may differ slightly because of the disbursement date, day-count convention and rounding.';
  if (view === 'yearly')
    return {
      title: 'Yearly summary',
      csvName: 'paisewise-top-up-yearly',
      previewRows: 12,
      columns: [
        { key: 'year', label: 'Year', align: 'left' },
        { key: 'principal', label: 'Principal Paid' },
        { key: 'interest', label: 'Interest Paid' },
        { key: 'balance', label: 'Closing Balance' },
      ],
      rows: s.yearly.map((y) => ({
        year: `${y.year}`,
        principal: money(y.principalPaid),
        interest: money(y.interestPaid),
        balance: money(y.balance),
      })),
      csvRows: s.yearly.map((y) => ({
        year: y.year,
        principal: Math.round(y.principalPaid),
        interest: Math.round(y.interestPaid),
        balance: Math.round(y.balance),
      })),
      footer: { year: 'Total', principal: money(s.principal), interest: money(s.totalInterest), balance: money(0) },
      note,
    };
  return {
    title: 'Monthly schedule',
    csvName: 'paisewise-top-up-schedule',
    previewRows: 12,
    columns: [
      { key: 'month', label: 'Month', align: 'left' },
      { key: 'emi', label: 'EMI' },
      { key: 'principal', label: 'Principal' },
      { key: 'interest', label: 'Interest' },
      { key: 'balance', label: 'Outstanding' },
    ],
    rows: s.schedule.map((row) => ({
      month: `${row.period}`,
      emi: money(row.emi),
      principal: money(row.principalPaid),
      interest: money(row.interestPaid),
      balance: money(row.balance),
    })),
    csvRows: s.schedule.map((row) => ({
      month: row.period,
      emi: Math.round(row.emi),
      principal: Math.round(row.principalPaid),
      interest: Math.round(row.interestPaid),
      balance: Math.round(row.balance),
    })),
    footer: { month: 'Total', emi: money(s.totalPayment), principal: money(s.principal), interest: money(s.totalInterest), balance: money(0) },
    note,
  };
}

