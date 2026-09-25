import { cagr, compoundFutureValue, pct, safe, simpleFutureValue } from './core';

/* ==================================================================
 * Recurring deposit
 *
 * Indian banks and India Post take a fixed deposit every month and
 * compound the balance quarterly. Each instalment therefore earns
 * (1 + i)^(k/3), where i is the quarterly rate and k the months it stays
 * in the account — the first instalment compounds for the full tenure,
 * the last for a single month. Summed, that is the closed form lenders
 * publish:
 *
 *              (1 + i)^n − 1
 *   M = R × ─────────────────────      i = rate ÷ 400,  n = months ÷ 3
 *            1 − (1 + i)^(−1/3)
 * ================================================================== */

export interface RdInput {
  monthlyDeposit: number;
  annualRatePct: number;
  months: number;
}

export interface RdYearRow {
  year: number;
  deposited: number;
  interest: number;
  balance: number;
}

export interface RdResult {
  monthlyDeposit: number;
  months: number;
  totalDeposited: number;
  maturity: number;
  interest: number;
  /** Annualised return on the money actually deposited (money-weighted). */
  effectiveYieldPct: number;
  rows: RdYearRow[];
}

/** Value after `monthsElapsed` months of deposits, compounded quarterly. */
function rdBalance(deposit: number, quarterlyRate: number, monthsElapsed: number): number {
  if (monthsElapsed <= 0 || deposit <= 0) return 0;
  if (Math.abs(quarterlyRate) < 1e-12) return deposit * monthsElapsed;
  const g = Math.pow(1 + quarterlyRate, 1 / 3); // one month of quarterly compounding
  return (deposit * g * (Math.pow(g, monthsElapsed) - 1)) / (g - 1);
}

export function calculateRD(input: RdInput): RdResult {
  const deposit = Math.max(0, input.monthlyDeposit);
  const months = Math.max(1, Math.round(input.months));
  const i = pct(input.annualRatePct) / 4;

  const maturity = rdBalance(deposit, i, months);
  const totalDeposited = deposit * months;

  const rows: RdYearRow[] = [];
  for (let y = 1; y <= Math.ceil(months / 12); y++) {
    const m = Math.min(months, y * 12);
    const balance = rdBalance(deposit, i, m);
    rows.push({ year: y, deposited: deposit * m, interest: balance - deposit * m, balance });
  }

  return {
    monthlyDeposit: deposit,
    months,
    totalDeposited,
    maturity: safe(maturity),
    interest: safe(maturity - totalDeposited),
    effectiveYieldPct: safe(monthlyIrr(deposit, months, maturity) * 100),
    rows,
  };
}

/**
 * Annual yield that turns `months` start-of-month deposits into `target`.
 * Solved by bisection — the function is monotonic in the rate, so this
 * always converges and never divides by zero.
 */
function monthlyIrr(deposit: number, months: number, target: number): number {
  if (deposit <= 0 || target <= deposit * months) return 0;
  const fv = (annual: number) => {
    const r = Math.pow(1 + annual, 1 / 12) - 1;
    return (deposit * (Math.pow(1 + r, months) - 1) * (1 + r)) / r;
  };
  let lo = 1e-9;
  let hi = 1;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (fv(mid) > target) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/* ==================================================================
 * Simple interest
 * ================================================================== */

export type TimeUnit = 'years' | 'months' | 'days';

export interface SimpleInterestInput {
  principal: number;
  annualRatePct: number;
  time: number;
  timeUnit: TimeUnit;
}

export interface SimpleInterestResult {
  principal: number;
  years: number;
  interest: number;
  amount: number;
  /** What annual compounding would have produced over the same period. */
  compoundAmount: number;
  compoundInterest: number;
  compoundingAdvantage: number;
  interestPerYear: number;
  rows: { year: number; simple: number; compound: number }[];
}

export const yearsFrom = (time: number, unit: TimeUnit): number =>
  unit === 'months' ? time / 12 : unit === 'days' ? time / 365 : time;

export function calculateSimpleInterest(input: SimpleInterestInput): SimpleInterestResult {
  const principal = Math.max(0, input.principal);
  const years = Math.max(0, yearsFrom(input.time, input.timeUnit));
  const amount = simpleFutureValue(principal, input.annualRatePct, years);
  const compoundAmount = compoundFutureValue(principal, input.annualRatePct, years, 1);

  const rows: SimpleInterestResult['rows'] = [];
  const whole = Math.ceil(years);
  for (let y = 1; y <= whole; y++) {
    const t = Math.min(y, years);
    rows.push({
      year: y,
      simple: simpleFutureValue(principal, input.annualRatePct, t),
      compound: compoundFutureValue(principal, input.annualRatePct, t, 1),
    });
  }

  return {
    principal,
    years,
    interest: safe(amount - principal),
    amount: safe(amount),
    compoundAmount: safe(compoundAmount),
    compoundInterest: safe(compoundAmount - principal),
    compoundingAdvantage: safe(compoundAmount - amount),
    interestPerYear: (principal * input.annualRatePct) / 100,
    rows,
  };
}

/* ==================================================================
 * Post Office small savings schemes
 *
 * Five schemes, two shapes:
 *   cumulative — interest is reinvested and paid at maturity (NSC, KVP)
 *   payout     — interest is paid out as income, principal comes back
 *                at the end (MIS monthly, SCSS quarterly, TD yearly)
 *
 * Rates are the Ministry of Finance's quarterly notification. They are
 * only defaults here — every scheme's rate is editable in the UI.
 * ================================================================== */

export type PostOfficeSchemeId = 'nsc' | 'kvp' | 'mis' | 'scss' | 'td1' | 'td2' | 'td3' | 'td5';

export interface PostOfficeScheme {
  id: PostOfficeSchemeId;
  name: string;
  short: string;
  rate: number;
  /** Lock-in / maturity in months. KVP's tenure is derived from its rate. */
  months: number;
  kind: 'cumulative' | 'payout';
  /** Payouts per year for payout schemes. */
  payoutsPerYear?: number;
  minDeposit: number;
  maxDeposit: number | null;
  section80C: boolean;
}

export const POST_OFFICE_SCHEMES: PostOfficeScheme[] = [
  { id: 'nsc', name: 'National Savings Certificate (NSC)', short: 'NSC', rate: 7.7, months: 60, kind: 'cumulative', minDeposit: 1000, maxDeposit: null, section80C: true },
  { id: 'kvp', name: 'Kisan Vikas Patra (KVP)', short: 'KVP', rate: 7.5, months: 115, kind: 'cumulative', minDeposit: 1000, maxDeposit: null, section80C: false },
  { id: 'mis', name: 'Monthly Income Scheme (MIS)', short: 'MIS', rate: 7.4, months: 60, kind: 'payout', payoutsPerYear: 12, minDeposit: 1000, maxDeposit: 1500000, section80C: false },
  { id: 'scss', name: 'Senior Citizens Savings Scheme (SCSS)', short: 'SCSS', rate: 8.2, months: 60, kind: 'payout', payoutsPerYear: 4, minDeposit: 1000, maxDeposit: 3000000, section80C: true },
  { id: 'td1', name: 'Time Deposit — 1 year', short: 'TD 1-yr', rate: 6.9, months: 12, kind: 'payout', payoutsPerYear: 1, minDeposit: 1000, maxDeposit: null, section80C: false },
  { id: 'td2', name: 'Time Deposit — 2 years', short: 'TD 2-yr', rate: 7.0, months: 24, kind: 'payout', payoutsPerYear: 1, minDeposit: 1000, maxDeposit: null, section80C: false },
  { id: 'td3', name: 'Time Deposit — 3 years', short: 'TD 3-yr', rate: 7.1, months: 36, kind: 'payout', payoutsPerYear: 1, minDeposit: 1000, maxDeposit: null, section80C: false },
  { id: 'td5', name: 'Time Deposit — 5 years', short: 'TD 5-yr', rate: 7.5, months: 60, kind: 'payout', payoutsPerYear: 1, minDeposit: 1000, maxDeposit: null, section80C: true },
];

export const schemeById = (id: string): PostOfficeScheme =>
  POST_OFFICE_SCHEMES.find((s) => s.id === id) ?? POST_OFFICE_SCHEMES[0];

export interface PostOfficeInput {
  scheme: PostOfficeSchemeId;
  amount: number;
  annualRatePct: number;
}

export interface PostOfficeResult {
  scheme: PostOfficeScheme;
  ratePct: number;
  amount: number;
  months: number;
  /** Cumulative schemes: principal + interest at the end. Payout: principal back. */
  maturity: number;
  totalInterest: number;
  /** Payout schemes: the regular interest cheque. 0 for cumulative schemes. */
  payout: number;
  payoutLabel: 'Monthly' | 'Quarterly' | 'Yearly' | '';
  effectiveYieldPct: number;
  rows: { year: number; opening: number; interest: number; closing: number; paidOut: number }[];
}

/**
 * KVP doubles the deposit; its maturity is however long that takes at the
 * notified rate, compounded annually (115 months at 7.5%).
 */
export const kvpMonths = (ratePct: number): number =>
  ratePct > 0 ? Math.round((Math.log(2) / Math.log(1 + ratePct / 100)) * 12) : 0;

export function calculatePostOffice(input: PostOfficeInput): PostOfficeResult {
  const scheme = schemeById(input.scheme);
  const amount = Math.max(0, input.amount);
  const rate = Math.max(0, input.annualRatePct);
  const months = scheme.id === 'kvp' ? kvpMonths(rate) : scheme.months;
  const years = months / 12;

  const rows: PostOfficeResult['rows'] = [];

  if (scheme.kind === 'cumulative') {
    const maturity =
      scheme.id === 'kvp' && rate > 0 ? amount * 2 : compoundFutureValue(amount, rate, years, 1);
    let balance = amount;
    for (let y = 1; y <= Math.ceil(years); y++) {
      const span = Math.min(1, years - (y - 1));
      const opening = balance;
      balance = y === Math.ceil(years) ? maturity : opening * Math.pow(1 + pct(rate), span);
      rows.push({ year: y, opening, interest: balance - opening, closing: balance, paidOut: 0 });
    }
    return {
      scheme,
      ratePct: rate,
      amount,
      months,
      maturity: safe(maturity),
      totalInterest: safe(maturity - amount),
      payout: 0,
      payoutLabel: '',
      effectiveYieldPct: cagr(amount, maturity, years),
      rows,
    };
  }

  // Payout schemes. MIS and SCSS pay simple interest at rate ÷ payouts.
  // Time deposits compute interest quarterly but pay it once a year, so a
  // year's cheque is P × ((1 + r/4)^4 − 1).
  const perYear = scheme.payoutsPerYear ?? 1;
  const isTD = scheme.id.startsWith('td');
  const annualInterest = isTD
    ? amount * (Math.pow(1 + pct(rate) / 4, 4) - 1)
    : amount * pct(rate);
  const payout = annualInterest / perYear;

  for (let y = 1; y <= Math.ceil(years); y++) {
    const span = Math.min(1, years - (y - 1));
    rows.push({ year: y, opening: amount, interest: annualInterest * span, closing: amount, paidOut: annualInterest * span });
  }
  const totalInterest = annualInterest * years;

  return {
    scheme,
    ratePct: rate,
    amount,
    months,
    maturity: amount,
    totalInterest: safe(totalInterest),
    payout: safe(payout),
    payoutLabel: perYear === 12 ? 'Monthly' : perYear === 4 ? 'Quarterly' : 'Yearly',
    effectiveYieldPct: amount > 0 ? (annualInterest / amount) * 100 : 0,
    rows,
  };
}
