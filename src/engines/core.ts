/**
 * Shared financial primitives.
 *
 * Every function here is pure and unit-tested. Rates are always passed as
 * percentages (8.25 means 8.25%) and converted internally — the single most
 * common source of bugs in calculators like these.
 */

export const pct = (rate: number): number => rate / 100;

/** Effective periodic rate from an annual nominal rate. */
export const periodicRate = (annualRatePct: number, periodsPerYear: number): number =>
  pct(annualRatePct) / periodsPerYear;

/** A = P(1 + r/n)^(nt) */
export function compoundFutureValue(
  principal: number,
  annualRatePct: number,
  years: number,
  compoundsPerYear = 1,
): number {
  if (principal <= 0) return 0;
  if (compoundsPerYear <= 0) return principal;
  const r = periodicRate(annualRatePct, compoundsPerYear);
  const n = compoundsPerYear * years;
  return principal * Math.pow(1 + r, n);
}

/** Simple interest: A = P(1 + rt) */
export const simpleFutureValue = (principal: number, annualRatePct: number, years: number): number =>
  principal * (1 + pct(annualRatePct) * years);

/**
 * Future value of a level annuity.
 * `due = true` invests at the START of each period (SIP convention).
 */
export function annuityFutureValue(
  payment: number,
  ratePerPeriod: number,
  periods: number,
  due = true,
): number {
  if (periods <= 0 || payment <= 0) return 0;
  if (Math.abs(ratePerPeriod) < 1e-12) return payment * periods;
  const fv = payment * ((Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod);
  return due ? fv * (1 + ratePerPeriod) : fv;
}

/** Present value of a level annuity (used for retirement drawdown). */
export function annuityPresentValue(
  payment: number,
  ratePerPeriod: number,
  periods: number,
  due = true,
): number {
  if (periods <= 0 || payment <= 0) return 0;
  if (Math.abs(ratePerPeriod) < 1e-12) return payment * periods;
  const pv = payment * ((1 - Math.pow(1 + ratePerPeriod, -periods)) / ratePerPeriod);
  return due ? pv * (1 + ratePerPeriod) : pv;
}

/** Level payment that grows to a target future value. */
export function paymentForFutureValue(
  target: number,
  ratePerPeriod: number,
  periods: number,
  due = true,
): number {
  if (periods <= 0 || target <= 0) return 0;
  if (Math.abs(ratePerPeriod) < 1e-12) return target / periods;
  const factor = (Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod;
  return target / (due ? factor * (1 + ratePerPeriod) : factor);
}

/** Compound annual growth rate as a percentage. */
export function cagr(initial: number, final: number, years: number): number {
  if (initial <= 0 || years <= 0 || final <= 0) return 0;
  return (Math.pow(final / initial, 1 / years) - 1) * 100;
}

/** Inflation-adjusted ("real") return: (1+r)/(1+i) - 1, as a percentage. */
export const realRate = (nominalPct: number, inflationPct: number): number =>
  ((1 + pct(nominalPct)) / (1 + pct(inflationPct)) - 1) * 100;

export const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

/** Guards every engine entry point against NaN/Infinity leaking into the UI. */
export const safe = (n: number): number => (Number.isFinite(n) ? n : 0);
