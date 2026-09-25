import { cagr, compoundFutureValue, pct, realRate, safe } from './core';
import { calculateSIP } from './investment';

/* ==================================================================
 * CAGR — solve for the growth rate, or project a value at a known rate
 * ================================================================== */

export type CagrMode = 'rate' | 'value';

export interface CagrInput {
  mode: CagrMode;
  initial: number;
  /** Used when mode = 'rate'. */
  final: number;
  /** Used when mode = 'value'. */
  ratePct: number;
  years: number;
  inflationPct: number;
}

export interface CagrResult {
  mode: CagrMode;
  initial: number;
  final: number;
  years: number;
  cagrPct: number;
  absoluteReturnPct: number;
  multiple: number;
  gain: number;
  /** Years to double at this CAGR; 0 when the rate is not positive. */
  doublingYears: number;
  realCagrPct: number;
  rows: { year: number; value: number }[];
}

export function calculateCAGR(input: CagrInput): CagrResult {
  const initial = Math.max(0, input.initial);
  const years = Math.max(0, input.years);

  const final =
    input.mode === 'rate' ? Math.max(0, input.final) : compoundFutureValue(initial, input.ratePct, years, 1);
  const rate = input.mode === 'rate' ? cagr(initial, final, years) : input.ratePct;

  const rows: CagrResult['rows'] = [{ year: 0, value: initial }];
  for (let y = 1; y <= Math.ceil(years); y++) {
    rows.push({ year: y, value: initial * Math.pow(1 + pct(rate), Math.min(y, years)) });
  }

  return {
    mode: input.mode,
    initial,
    final: safe(final),
    years,
    cagrPct: safe(rate),
    absoluteReturnPct: initial > 0 ? ((final - initial) / initial) * 100 : 0,
    multiple: initial > 0 ? final / initial : 0,
    gain: safe(final - initial),
    doublingYears: rate > 0 ? Math.log(2) / Math.log(1 + pct(rate)) : 0,
    realCagrPct: realRate(rate, Math.max(0, input.inflationPct)),
    rows,
  };
}

/* ==================================================================
 * Goal SIP — the monthly investment that reaches a target
 *
 * The goal is quoted in today's money and inflated to the target year.
 * Whatever is already saved grows alongside; the SIP only has to cover
 * the rest. Because a SIP's future value is linear in its starting
 * amount, the required SIP is simply the gap divided by what ₹1 a month
 * (with the same step-up) grows to.
 * ================================================================== */

export interface GoalSipInput {
  goalToday: number;
  years: number;
  expectedReturnPct: number;
  inflationPct: number;
  existingSavings: number;
  annualStepUpPct: number;
}

export interface GoalSipResult {
  goalToday: number;
  goalFuture: number;
  existingFuture: number;
  gap: number;
  monthlySip: number;
  finalMonthlySip: number;
  lumpsumToday: number;
  totalInvested: number;
  wealthGained: number;
  alreadyCovered: boolean;
  rows: { year: number; monthly: number; invested: number; value: number }[];
}

export function calculateGoalSIP(input: GoalSipInput): GoalSipResult {
  const years = Math.max(0, input.years);
  const goalToday = Math.max(0, input.goalToday);
  const goalFuture = compoundFutureValue(goalToday, Math.max(0, input.inflationPct), years, 1);
  const existing = Math.max(0, input.existingSavings);
  const existingFuture = compoundFutureValue(existing, input.expectedReturnPct, years, 1);
  const gap = Math.max(0, goalFuture - existingFuture);

  const unit = calculateSIP({
    monthlyInvestment: 1,
    expectedReturnPct: input.expectedReturnPct,
    years,
    annualStepUpPct: input.annualStepUpPct,
  });
  const monthlySip = unit.futureValue > 0 ? gap / unit.futureValue : 0;

  const plan = calculateSIP({
    monthlyInvestment: monthlySip,
    expectedReturnPct: input.expectedReturnPct,
    years,
    annualStepUpPct: input.annualStepUpPct,
  });

  const rows: GoalSipResult['rows'] = plan.rows.map((row) => {
    const t = Math.min(row.year, years);
    return {
      year: row.year,
      monthly: row.monthlyInvestment,
      invested: row.totalInvested,
      value: row.balance + existing * Math.pow(1 + pct(input.expectedReturnPct), t),
    };
  });

  const lumpsumToday = years > 0 ? gap / Math.pow(1 + pct(input.expectedReturnPct), years) : gap;

  return {
    goalToday,
    goalFuture: safe(goalFuture),
    existingFuture: safe(existingFuture),
    gap: safe(gap),
    monthlySip: safe(monthlySip),
    finalMonthlySip: safe(plan.finalMonthly),
    lumpsumToday: safe(lumpsumToday),
    totalInvested: safe(plan.totalInvested),
    wealthGained: safe(plan.futureValue - plan.totalInvested),
    alreadyCovered: gap <= 0,
    rows,
  };
}

/* ==================================================================
 * Stock average — weighted average cost across purchases, and the
 * quantity needed at today's price to move the average to a target.
 * ================================================================== */

export interface StockLot {
  quantity: number;
  price: number;
}

export interface StockAverageInput {
  lots: StockLot[];
  currentPrice: number;
  targetAverage: number;
}

export interface StockAverageResult {
  lots: (StockLot & { cost: number })[];
  totalQuantity: number;
  totalCost: number;
  averagePrice: number;
  currentValue: number;
  profit: number;
  profitPct: number;
  /** Units to buy at the current price to reach the target average; null if unreachable. */
  unitsForTarget: number | null;
  costForTarget: number;
  targetReason: '' | 'no-target' | 'no-price' | 'unreachable' | 'already';
}

export function calculateStockAverage(input: StockAverageInput): StockAverageResult {
  const lots = input.lots
    .filter((l) => l.quantity > 0 && l.price >= 0)
    .map((l) => ({ ...l, cost: l.quantity * l.price }));
  const totalQuantity = lots.reduce((s, l) => s + l.quantity, 0);
  const totalCost = lots.reduce((s, l) => s + l.cost, 0);
  const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  const cmp = Math.max(0, input.currentPrice);
  const currentValue = cmp * totalQuantity;
  const profit = cmp > 0 ? currentValue - totalCost : 0;

  // Buying n more at price c:  (Q·A + n·c) ÷ (Q + n) = T  →  n = Q(A − T) ÷ (T − c).
  // Only reachable when T lies strictly between c and the current average.
  const target = Math.max(0, input.targetAverage);
  let unitsForTarget: number | null = null;
  let targetReason: StockAverageResult['targetReason'] = '';
  if (!target) targetReason = 'no-target';
  else if (!cmp) targetReason = 'no-price';
  else if (Math.abs(target - averagePrice) < 1e-9) {
    unitsForTarget = 0;
    targetReason = 'already';
  } else if ((target - cmp) * (averagePrice - target) > 0) {
    unitsForTarget = Math.ceil((totalQuantity * (averagePrice - target)) / (target - cmp) - 1e-9);
  } else targetReason = 'unreachable';

  return {
    lots,
    totalQuantity,
    totalCost: safe(totalCost),
    averagePrice: safe(averagePrice),
    currentValue: safe(currentValue),
    profit: safe(profit),
    profitPct: totalCost > 0 && cmp > 0 ? (profit / totalCost) * 100 : 0,
    unitsForTarget,
    costForTarget: unitsForTarget ? unitsForTarget * cmp : 0,
    targetReason,
  };
}
