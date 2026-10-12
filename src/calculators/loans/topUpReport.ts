import type { TableSpec } from '../types';
import type { Check, TopUpInput, TopUpResult, TenureRow } from '@/engines/topup';
import { THRESHOLDS } from '@/engines/topup';
import { formatINR, formatINRCompact, formatMonthYear, formatNumber, formatPercent } from '@/lib/format';

/**
 * Words for the top-up decision: the verdict, the reasons behind it, the
 * personal recommendation, and the plain-text, CSV and schedule versions
 * used by copy and export. Pure — the screen and the tests share it.
 */

export const money = (v: number): string => formatINR(v);
/** ₹3.00 L for headline amounts; small amounts in full. */
export const lakh = (v: number): string => (Math.abs(v) >= 1e5 ? formatINRCompact(v) : formatINR(v));
export const mo = (m: number): string => `${formatNumber(m)} months`;
/** "60-month", as in a 60-month tenure. */
export const moAdj = (m: number): string => `${formatNumber(m)}-month`;
export const when = (d: Date): string => formatMonthYear(d);
export const ratePct = (v: number): string => `${formatNumber(v, 2)}%`;

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
    return `Based on the numbers entered, the top-up appears workable, but ${mo(o.months)} adds about ${lakh(o.additionalInterest)} of interest. A ${moAdj(r.recommendation.months)} tenure would cost about ${lakh(r.recommendation.interestSaved)} less.`;
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
      if (c.tone === 'bad') return `${mo(o.months)} is a very long tenure — interest keeps building for ${formatNumber(o.months / 12, 1)} years.`;
      if (o.extensionMonths > 0)
        return `The loan would end in ${when(o.completion)}, ${mo(o.extensionMonths)} later than today’s ${when(e.completion)}.`;
      return o.extensionMonths < 0
        ? `The loan would end in ${when(o.completion)}, ${mo(-o.extensionMonths)} sooner than today’s ${when(e.completion)}.`
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

/** "Recommended tenure: 60 months" and why, in two sentences. */
export function recommendationText(r: TopUpResult, input: TopUpInput): string {
  const rec = r.recommendation;
  const comfortable = input.topup.comfortableEmi;
  const vs = rec.against
    ? ` while saving approximately ${lakh(rec.interestSaved)} in interest compared with the ${moAdj(rec.against.months)} option`
    : '';
  if (rec.basis === 'comfortable')
    return `This keeps your EMI at ${money(rec.row.emi)}, within your comfortable ${money(comfortable)},${vs}.`;
  if (rec.basis === 'none-fit')
    return `No tenure up to ${mo(r.tenures[r.tenures.length - 1].months)} keeps the EMI within ${money(comfortable)} — the lowest is ${money(
      r.tenures[r.tenures.length - 1].emi,
    )}. ${mo(rec.months)} is the closest balance of EMI and interest; consider a smaller top-up.`;
  return `It sits closest to both the lowest EMI and the lowest interest${vs}. Add a comfortable EMI to tailor this.`;
}

/** The personal paragraph under the decision, built from the borrower’s own numbers. */
export function personalRecommendation(r: TopUpResult, input: TopUpInput): string {
  const o = r.option;
  const e = r.existing;
  const t = input.topup;
  const rec = r.recommendation;
  const s: string[] = [];

  const charges = o.charges.total > 0 ? ` after ${money(o.charges.total)} of charges` : '';
  s.push(
    `You need ${lakh(t.required)}. A top-up at ${ratePct(o.ratePct)} over ${mo(o.months)} puts ${lakh(o.charges.net)} in your hands${charges} and moves your EMI from ${money(
      e.emi,
    )} to ${money(o.emi)} (${emiChangeWords(o.emiChange)}).`,
  );

  if (o.extensionMonths > 0)
    s.push(`Your loan would run until ${when(o.completion)} instead of ${when(e.completion)} — ${mo(o.extensionMonths)} longer.`);
  else if (o.extensionMonths < 0) s.push(`Your loan would still finish by ${when(o.completion)}, ahead of today’s ${when(e.completion)}.`);

  s.push(
    o.additionalInterest > 0
      ? `Compared with simply continuing today’s loan, you would pay about ${lakh(o.additionalInterest)} more in interest from today.`
      : `Compared with continuing today’s loan, you would pay about ${lakh(-o.additionalInterest)} less in interest, because the new rate is lower.`,
  );

  if (rec.months < o.months) {
    const fits = rec.basis === 'comfortable' ? `, within your ${money(t.comfortableEmi)} comfort level,` : '';
    s.push(
      `A ${moAdj(rec.months)} tenure would raise the EMI to ${money(rec.row.emi)}${fits} but cut the interest by about ${lakh(
        o.futureInterest - rec.row.interest,
      )} and finish ${mo(o.months - rec.months)} sooner.`,
    );
  } else if (rec.months > o.months && t.comfortableEmi > 0 && o.emi > t.comfortableEmi) {
    s.push(`At ${money(o.emi)} the EMI is above your comfort level; ${mo(rec.months)} brings it to ${money(rec.row.emi)} for about ${lakh(rec.row.interest - o.futureInterest)} more interest.`);
  }

  if (r.larger?.source === 'sanctioned')
    s.push(`You would be borrowing ${lakh(r.larger.extraTopUp)} more than you need, which alone adds about ${lakh(r.larger.extraInterest)} of interest.`);
  if (r.topUpForFullCash != null)
    s.push(`To have the full ${lakh(t.required)} in hand after charges, the top-up would need to be about ${lakh(r.topUpForFullCash)}.`);
  if (r.prepayment.active && r.prepayment.interestSaved > 0)
    s.push(
      `Prepaying as planned would save a further ${lakh(r.prepayment.interestSaved)} and close the loan ${mo(r.prepayment.monthsSaved)} early.`,
    );

  if (r.verdict.level === 'green') s.push('If the EMI fits comfortably in your budget, the top-up looks like a reasonable way to raise the money.');
  else if (r.verdict.level === 'amber')
    s.push(
      rec.months < o.months
        ? 'If you can manage the higher EMI, the shorter tenure is the stronger choice.'
        : 'Check the points above with your lender before you decide.',
    );
  else s.push(redAdvice(r));

  return s.join(' ');
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
    `WITHOUT TOP-UP: ${money(e.outstanding)} outstanding, EMI ${money(e.emi)} for ${mo(e.remainingMonths)}; remaining payments ${money(
      e.remainingPayments,
    )}, of which interest ${money(e.futureInterest)}. Ends ${when(e.completion)}.`,
    `WITH TOP-UP: ${money(o.loan)} at ${ratePct(o.ratePct)} for ${mo(o.months)}; EMI ${money(o.emi)}; cash received ${money(
      o.charges.net,
    )}; future payments ${money(o.totalPayments)}, of which interest ${money(o.futureInterest)}. Ends ${when(o.completion)}.`,
    '',
    `Additional future payments: ${money(o.additionalPayments)} (includes the borrowed principal)`,
    `Additional interest: ${money(o.additionalInterest)}`,
    `Recommended tenure: ${mo(r.recommendation.months)} — EMI ${money(r.recommendation.row.emi)}`,
    '',
    personalRecommendation(r, input),
  ].join('\n');
}

export const TENURE_CSV_COLUMNS = [
  { key: 'months', label: 'Tenure (months)' },
  { key: 'emi', label: 'EMI' },
  { key: 'total', label: 'Total payment' },
  { key: 'interest', label: 'Interest' },
  { key: 'additional', label: 'Additional interest vs existing loan' },
  { key: 'ends', label: 'Last EMI' },
];

export function tenureCsvRows(r: TopUpResult) {
  return r.tenures.map((x) => ({
    months: x.months,
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

/** The tenure warning threshold, for the copy that quotes it. */
export const LONG_TENURE = THRESHOLDS.longTenureMonths;
