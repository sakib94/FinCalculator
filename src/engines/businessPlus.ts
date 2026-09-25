import { safe } from './core';

/* ==================================================================
 * Profit margin — the three margins from one P&L
 *
 * Margin is always profit ÷ REVENUE. Markup is profit ÷ COST. They are
 * different numbers for the same trade and confusing them is the most
 * expensive arithmetic mistake in small business: a 50% markup is only
 * a 33.3% margin.
 * ================================================================== */

export interface ProfitMarginInput {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  otherIncome: number;
  interestExpense: number;
  taxRatePct: number;
}

export interface ProfitMarginResult {
  revenue: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingProfit: number;
  operatingMarginPct: number;
  profitBeforeTax: number;
  taxAmount: number;
  netProfit: number;
  netMarginPct: number;
  markupPct: number;
  costRatioPct: number;
  profitable: boolean;
}

export function calculateProfitMargin(input: ProfitMarginInput): ProfitMarginResult {
  const revenue = Math.max(0, input.revenue);
  const cogs = Math.max(0, input.cogs);
  const opex = Math.max(0, input.operatingExpenses);
  const other = Math.max(0, input.otherIncome);
  const interest = Math.max(0, input.interestExpense);

  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - opex;
  const profitBeforeTax = operatingProfit + other - interest;
  // Losses carry no tax charge.
  const taxAmount = profitBeforeTax > 0 ? (profitBeforeTax * Math.max(0, input.taxRatePct)) / 100 : 0;
  const netProfit = profitBeforeTax - taxAmount;

  const marginOf = (profit: number) => (revenue > 0 ? (profit / revenue) * 100 : 0);

  return {
    revenue,
    grossProfit: safe(grossProfit),
    grossMarginPct: safe(marginOf(grossProfit)),
    operatingProfit: safe(operatingProfit),
    operatingMarginPct: safe(marginOf(operatingProfit)),
    profitBeforeTax: safe(profitBeforeTax),
    taxAmount: safe(taxAmount),
    netProfit: safe(netProfit),
    netMarginPct: safe(marginOf(netProfit)),
    // Same profit, expressed against cost instead of revenue.
    markupPct: cogs > 0 ? safe((grossProfit / cogs) * 100) : 0,
    costRatioPct: revenue > 0 ? safe(((cogs + opex) / revenue) * 100) : 0,
    profitable: netProfit > 0,
  };
}

/* ==================================================================
 * Break-even
 *
 * Every unit sold contributes (price − variable cost) towards the
 * fixed costs. Break-even is simply the point at which those
 * contributions have covered the fixed costs entirely; past it, the
 * contribution is profit.
 * ================================================================== */

export interface BreakEvenInput {
  fixedCosts: number;
  pricePerUnit: number;
  variableCostPerUnit: number;
  targetProfit: number;
  /** Units you actually expect to sell — drives the margin of safety. */
  expectedUnits: number;
}

export interface BreakEvenResult {
  contributionPerUnit: number;
  contributionMarginPct: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  unitsForTargetProfit: number;
  revenueForTargetProfit: number;
  expectedRevenue: number;
  expectedProfit: number;
  marginOfSafetyUnits: number;
  marginOfSafetyPct: number;
  viable: boolean;
  /** Price at which the product stops losing money on every sale. */
  minimumViablePrice: number;
  rows: { units: number; revenue: number; totalCost: number; profit: number }[];
}

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  const fixed = Math.max(0, input.fixedCosts);
  const price = Math.max(0, input.pricePerUnit);
  const variable = Math.max(0, input.variableCostPerUnit);
  const target = Math.max(0, input.targetProfit);
  const expected = Math.max(0, input.expectedUnits);

  const contribution = price - variable;
  // A non-positive contribution means every extra sale deepens the loss.
  const viable = contribution > 0;

  const breakEvenUnits = viable ? fixed / contribution : 0;
  const unitsForTargetProfit = viable ? (fixed + target) / contribution : 0;

  const expectedRevenue = expected * price;
  const expectedProfit = expected * contribution - fixed;
  const marginOfSafetyUnits = Math.max(0, expected - breakEvenUnits);

  // A handful of points around break-even, for the chart.
  const span = viable ? Math.max(breakEvenUnits * 2, expected * 1.2, 10) : Math.max(expected, 10);
  const rows = Array.from({ length: 7 }, (_, i) => {
    const units = Math.round((span * i) / 6);
    return {
      units,
      revenue: units * price,
      totalCost: fixed + units * variable,
      profit: units * contribution - fixed,
    };
  });

  return {
    contributionPerUnit: safe(contribution),
    contributionMarginPct: price > 0 ? safe((contribution / price) * 100) : 0,
    breakEvenUnits: safe(Math.ceil(breakEvenUnits)),
    breakEvenRevenue: safe(Math.ceil(breakEvenUnits) * price),
    unitsForTargetProfit: safe(Math.ceil(unitsForTargetProfit)),
    revenueForTargetProfit: safe(Math.ceil(unitsForTargetProfit) * price),
    expectedRevenue: safe(expectedRevenue),
    expectedProfit: safe(expectedProfit),
    marginOfSafetyUnits: safe(Math.floor(marginOfSafetyUnits)),
    marginOfSafetyPct: expected > 0 ? safe((marginOfSafetyUnits / expected) * 100) : 0,
    viable,
    minimumViablePrice: safe(variable),
    rows,
  };
}

/* ==================================================================
 * Depreciation
 *
 * Straight line spreads the cost evenly. Written-down value applies a
 * fixed percentage to the shrinking book value, so it front-loads the
 * charge — which is what the Income Tax Act prescribes for most Indian
 * block-of-assets computations. Double declining is WDV at twice the
 * straight-line rate, switching off once salvage value is reached.
 * ================================================================== */

export type DepreciationMethod = 'slm' | 'wdv' | 'ddb';

export interface DepreciationInput {
  assetCost: number;
  salvageValue: number;
  usefulLife: number;
  method: DepreciationMethod;
  /** Used by WDV; ignored by the other methods. */
  wdvRatePct: number;
}

export interface DepreciationRow {
  year: number;
  openingValue: number;
  depreciation: number;
  accumulated: number;
  closingValue: number;
}

export interface DepreciationResult {
  method: DepreciationMethod;
  methodLabel: string;
  assetCost: number;
  salvageValue: number;
  depreciableAmount: number;
  annualDepreciation: number;
  effectiveRatePct: number;
  totalDepreciation: number;
  finalBookValue: number;
  firstYearDepreciation: number;
  rows: DepreciationRow[];
}

const METHOD_LABELS: Record<DepreciationMethod, string> = {
  slm: 'Straight line (SLM)',
  wdv: 'Written down value (WDV)',
  ddb: 'Double declining balance',
};

export function calculateDepreciation(input: DepreciationInput): DepreciationResult {
  const cost = Math.max(0, input.assetCost);
  const salvage = Math.min(cost, Math.max(0, input.salvageValue));
  const life = Math.max(1, Math.round(input.usefulLife));
  const depreciable = cost - salvage;

  const slmAnnual = depreciable / life;
  const rate =
    input.method === 'wdv'
      ? Math.max(0, input.wdvRatePct) / 100
      : input.method === 'ddb'
        ? 2 / life
        : 0;

  const rows: DepreciationRow[] = [];
  let book = cost;
  let accumulated = 0;

  for (let year = 1; year <= life; year++) {
    const opening = book;
    let charge: number;

    if (input.method === 'slm') {
      charge = slmAnnual;
    } else {
      charge = opening * rate;
    }

    // Depreciation never takes the book value below salvage.
    charge = Math.max(0, Math.min(charge, opening - salvage));

    book = opening - charge;
    accumulated += charge;

    rows.push({
      year,
      openingValue: opening,
      depreciation: charge,
      accumulated,
      closingValue: book,
    });
  }

  return {
    method: input.method,
    methodLabel: METHOD_LABELS[input.method],
    assetCost: cost,
    salvageValue: salvage,
    depreciableAmount: safe(depreciable),
    annualDepreciation: safe(input.method === 'slm' ? slmAnnual : rows[0]?.depreciation ?? 0),
    effectiveRatePct: safe(cost > 0 ? ((rows[0]?.depreciation ?? 0) / cost) * 100 : 0),
    totalDepreciation: safe(accumulated),
    finalBookValue: safe(book),
    firstYearDepreciation: safe(rows[0]?.depreciation ?? 0),
    rows,
  };
}

/* ==================================================================
 * Discount — single, stacked ("20% + 10% extra") or flat-rupee
 *
 * Stacked discounts multiply, they do not add: 20% then 10% off is
 * 1 − 0.8 × 0.9 = 28% off, not 30%. Tax, when there is any, is charged
 * on the price after every discount.
 * ================================================================== */

export type DiscountMode = 'percent' | 'amount';

export interface DiscountInput {
  mode: DiscountMode;
  price: number;
  discountPct: number;
  discountAmount: number;
  extraDiscountPct: number;
  taxPct: number;
}

export interface DiscountResult {
  price: number;
  firstDiscount: number;
  afterFirst: number;
  extraDiscount: number;
  afterDiscounts: number;
  totalSaved: number;
  effectiveDiscountPct: number;
  tax: number;
  finalPrice: number;
}

export function calculateDiscount(input: DiscountInput): DiscountResult {
  const price = Math.max(0, input.price);
  const firstDiscount =
    input.mode === 'amount'
      ? Math.min(price, Math.max(0, input.discountAmount))
      : price * Math.min(1, Math.max(0, input.discountPct) / 100);
  const afterFirst = price - firstDiscount;
  const extraDiscount = afterFirst * Math.min(1, Math.max(0, input.extraDiscountPct) / 100);
  const afterDiscounts = afterFirst - extraDiscount;
  const totalSaved = price - afterDiscounts;
  const tax = afterDiscounts * (Math.max(0, input.taxPct) / 100);

  return {
    price,
    firstDiscount: safe(firstDiscount),
    afterFirst: safe(afterFirst),
    extraDiscount: safe(extraDiscount),
    afterDiscounts: safe(afterDiscounts),
    totalSaved: safe(totalSaved),
    effectiveDiscountPct: price > 0 ? (totalSaved / price) * 100 : 0,
    tax: safe(tax),
    finalPrice: safe(afterDiscounts + tax),
  };
}
