import {
  getFinancialYear,
  deductionsFor,
  type AgeGroup,
  type RegimeId,
  type Slab,
  type RegimeRules,
} from '@/data/taxRules';

/**
 * Indian income tax engine.
 *
 * Contains NO slabs, thresholds or rates — every number comes from
 * src/data/taxRules.ts. This file only knows the *order of operations*
 * laid down by the Income-tax Act:
 *
 *   gross income → exemptions → deductions → taxable income
 *   → slab tax (+ special-rate tax) → rebate → surcharge → cess
 */

export interface TaxInput {
  fyId: string;
  regime: RegimeId;
  ageGroup: AgeGroup;
  salaryIncome: number;
  basicSalary: number;
  hraReceived: number;
  rentPaid: number;
  metroCity: boolean;
  interestIncome: number;
  rentalIncome: number;
  otherIncome: number;
  ltcgEquity: number;
  stcgEquity: number;
  deductions: Record<string, number>;
}

export interface SlabRow {
  from: number;
  to: number | null;
  rate: number;
  taxableInSlab: number;
  tax: number;
}

export interface LineItem {
  label: string;
  amount: number;
  note?: string;
}

export interface TaxResult {
  regime: RegimeId;
  regimeLabel: string;
  fyLabel: string;
  assessmentYear: string;

  grossTotalIncome: number;
  hraExemption: number;
  standardDeduction: number;
  exemptions: LineItem[];
  deductionItems: LineItem[];
  totalDeductions: number;

  taxableNormalIncome: number;
  taxableSpecialIncome: number;
  taxableIncome: number;

  slabRows: SlabRow[];
  slabTax: number;
  specialTax: number;
  specialItems: LineItem[];
  taxBeforeRebate: number;
  rebate: number;
  marginalReliefRebate: number;
  taxAfterRebate: number;
  surchargeRate: number;
  surcharge: number;
  cess: number;
  cessRate: number;
  totalTax: number;
  effectiveTaxRate: number;
  monthlyTax: number;
}

export interface RegimeComparison {
  old: TaxResult;
  new: TaxResult;
  betterRegime: RegimeId;
  difference: number;
}

const nn = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/** Rounds taxable income down to the nearest ₹10, as section 288A requires. */
const roundIncome = (n: number): number => Math.floor(Math.max(0, n) / 10) * 10;
/** Rounds the final tax to the nearest ₹10 (section 288B). */
const roundTax = (n: number): number => Math.round(Math.max(0, n) / 10) * 10;

export function slabTaxFor(taxable: number, slabs: Slab[]): { rows: SlabRow[]; tax: number } {
  const rows: SlabRow[] = [];
  let lower = 0;
  let tax = 0;

  for (const slab of slabs) {
    const upper = slab.upTo ?? Infinity;
    const inSlab = Math.max(0, Math.min(taxable, upper) - lower);
    const slabTax = (inSlab * slab.rate) / 100;
    rows.push({
      from: lower,
      to: slab.upTo,
      rate: slab.rate,
      taxableInSlab: inSlab,
      tax: slabTax,
    });
    tax += slabTax;
    lower = upper;
    if (taxable <= upper) break;
  }
  return { rows, tax };
}

/** HRA exemption u/s 10(13A): least of the three statutory limits. */
export function hraExemptionFor(
  basic: number,
  hraReceived: number,
  rentPaid: number,
  metro: boolean,
): number {
  if (hraReceived <= 0 || rentPaid <= 0 || basic <= 0) return 0;
  const limits = [
    hraReceived,
    Math.max(0, rentPaid - 0.1 * basic),
    basic * (metro ? 0.5 : 0.4),
  ];
  return Math.max(0, Math.min(...limits));
}

const basicExemptionLimit = (rules: RegimeRules, ageGroup: AgeGroup): number => {
  const first = rules.slabs[ageGroup][0];
  return first.rate === 0 ? (first.upTo ?? 0) : 0;
};

function surchargeRateFor(income: number, rules: RegimeRules): number {
  let rate = 0;
  for (const band of rules.surcharge) if (income > band.above) rate = band.rate;
  return rate;
}

/** Surcharge marginal relief: extra tax can never exceed the extra income. */
function surchargeWithRelief(
  income: number,
  baseTax: number,
  rules: RegimeRules,
  ageGroup: AgeGroup,
): { rate: number; surcharge: number } {
  const rate = surchargeRateFor(income, rules);
  if (rate === 0) return { rate: 0, surcharge: 0 };

  const threshold = [...rules.surcharge].reverse().find((b) => income > b.above)?.above ?? 0;
  let surcharge = (baseTax * rate) / 100;

  const taxAtThreshold = slabTaxFor(threshold, rules.slabs[ageGroup]).tax;
  const prevRate = [...rules.surcharge].reverse().find((b) => threshold > b.above)?.rate ?? 0;
  const surchargeAtThreshold = (taxAtThreshold * prevRate) / 100;

  const excessIncome = income - threshold;
  const excessTax = baseTax + surcharge - (taxAtThreshold + surchargeAtThreshold);
  if (excessTax > excessIncome) {
    surcharge = Math.max(0, surcharge - (excessTax - excessIncome));
  }
  return { rate, surcharge };
}

export function calculateTax(input: TaxInput): TaxResult {
  const fy = getFinancialYear(input.fyId);
  const rules = fy.regimes[input.regime];

  const salary = nn(input.salaryIncome);
  const interest = nn(input.interestIncome);
  const other = nn(input.otherIncome);
  const rentGross = nn(input.rentalIncome);
  const rentalNet = rentGross * 0.7; // 30% standard deduction u/s 24(a)
  const ltcg = nn(input.ltcgEquity);
  const stcg = nn(input.stcgEquity);

  /* --- Exemptions --- */
  const exemptions: LineItem[] = [];
  const hraExemption = rules.allowsHRA
    ? hraExemptionFor(nn(input.basicSalary), nn(input.hraReceived), nn(input.rentPaid), input.metroCity)
    : 0;
  if (hraExemption > 0) exemptions.push({ label: 'HRA exemption', amount: hraExemption, note: '10(13A)' });
  if (rentGross > 0)
    exemptions.push({
      label: 'Standard deduction on house property',
      amount: rentGross * 0.3,
      note: '24(a) — 30%',
    });

  const standardDeduction = salary > 0 ? Math.min(rules.standardDeduction, salary) : 0;

  /* --- Chapter VI-A deductions --- */
  const deductionItems: LineItem[] = [];
  for (const rule of deductionsFor(input.regime)) {
    const claimed = nn(input.deductions[rule.id]);
    if (claimed <= 0) continue;
    const allowed = rule.cap == null ? claimed : Math.min(claimed, rule.cap);
    deductionItems.push({
      label: rule.label,
      amount: allowed,
      note: claimed > allowed ? `${rule.section} — capped at ₹${rule.cap?.toLocaleString('en-IN')}` : rule.section,
    });
  }

  /* --- Income aggregation --- */
  const normalIncomeBeforeDeductions = Math.max(
    0,
    salary - hraExemption - standardDeduction + interest + other + rentalNet,
  );
  const deductionsTotalRaw = deductionItems.reduce((s, d) => s + d.amount, 0);
  // Chapter VI-A cannot create or increase a loss.
  const totalDeductions = Math.min(deductionsTotalRaw, normalIncomeBeforeDeductions);

  let taxableNormal = roundIncome(normalIncomeBeforeDeductions - totalDeductions);

  /* --- Special-rate income --- */
  let ltcgTaxable = Math.max(0, ltcg - fy.specialRates.ltcgEquity.exemption);
  let stcgTaxable = stcg;

  // A resident may set unused basic exemption against special-rate income.
  const exemptionLimit = basicExemptionLimit(rules, input.ageGroup);
  let unused = Math.max(0, exemptionLimit - taxableNormal);
  if (unused > 0 && stcgTaxable > 0) {
    const used = Math.min(unused, stcgTaxable);
    stcgTaxable -= used;
    unused -= used;
  }
  if (unused > 0 && ltcgTaxable > 0) {
    ltcgTaxable = Math.max(0, ltcgTaxable - unused);
  }

  const { rows: slabRows, tax: slabTaxRaw } = slabTaxFor(taxableNormal, rules.slabs[input.ageGroup]);

  const specialItems: LineItem[] = [];
  const ltcgTax = (ltcgTaxable * fy.specialRates.ltcgEquity.rate) / 100;
  const stcgTax = (stcgTaxable * fy.specialRates.stcgEquity.rate) / 100;
  if (ltcg > 0)
    specialItems.push({
      label: `${fy.specialRates.ltcgEquity.label} @ ${fy.specialRates.ltcgEquity.rate}%`,
      amount: ltcgTax,
      note: `₹${fy.specialRates.ltcgEquity.exemption.toLocaleString('en-IN')} exempt`,
    });
  if (stcg > 0)
    specialItems.push({
      label: `${fy.specialRates.stcgEquity.label} @ ${fy.specialRates.stcgEquity.rate}%`,
      amount: stcgTax,
    });

  const specialTax = ltcgTax + stcgTax;
  const taxableSpecial = ltcgTaxable + stcgTaxable;
  const taxableIncome = taxableNormal + taxableSpecial;
  const taxBeforeRebate = slabTaxRaw + specialTax;

  /* --- Rebate u/s 87A (never available on special-rate income) --- */
  let rebate = 0;
  if (taxableIncome <= rules.rebate.maxTaxableIncome) {
    rebate = Math.min(rules.rebate.maxRebate, slabTaxRaw);
  }
  let taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);

  /* --- Marginal relief at the rebate threshold (new regime) --- */
  let marginalReliefRebate = 0;
  if (rules.rebate.marginalRelief && taxableIncome > rules.rebate.maxTaxableIncome) {
    const excess = taxableIncome - rules.rebate.maxTaxableIncome;
    if (taxAfterRebate > excess) {
      marginalReliefRebate = taxAfterRebate - excess;
      taxAfterRebate = excess;
    }
  }

  /* --- Surcharge & cess --- */
  const { rate: surchargeRate, surcharge } = surchargeWithRelief(
    taxableIncome,
    taxAfterRebate,
    rules,
    input.ageGroup,
  );
  const cess = ((taxAfterRebate + surcharge) * rules.cessPct) / 100;
  const totalTax = roundTax(taxAfterRebate + surcharge + cess);

  const grossTotalIncome = salary + interest + other + rentalNet + ltcg + stcg;

  return {
    regime: input.regime,
    regimeLabel: rules.label,
    fyLabel: fy.label,
    assessmentYear: fy.assessmentYear,
    grossTotalIncome,
    hraExemption,
    standardDeduction,
    exemptions,
    deductionItems,
    totalDeductions: totalDeductions + standardDeduction + hraExemption + rentGross * 0.3,
    taxableNormalIncome: taxableNormal,
    taxableSpecialIncome: taxableSpecial,
    taxableIncome,
    slabRows,
    slabTax: slabTaxRaw,
    specialTax,
    specialItems,
    taxBeforeRebate,
    rebate,
    marginalReliefRebate,
    taxAfterRebate,
    surchargeRate,
    surcharge,
    cess,
    cessRate: rules.cessPct,
    totalTax,
    effectiveTaxRate: grossTotalIncome > 0 ? (totalTax / grossTotalIncome) * 100 : 0,
    monthlyTax: totalTax / 12,
  };
}

export function compareRegimes(input: Omit<TaxInput, 'regime'>): RegimeComparison {
  const oldResult = calculateTax({ ...input, regime: 'old' });
  const newResult = calculateTax({ ...input, regime: 'new' });
  const betterRegime: RegimeId = newResult.totalTax <= oldResult.totalTax ? 'new' : 'old';
  return {
    old: oldResult,
    new: newResult,
    betterRegime,
    difference: Math.abs(oldResult.totalTax - newResult.totalTax),
  };
}

/**
 * Quick estimate used by the salary and CTC calculators: annual tax on a
 * salary with no other income and (optionally) a set of deductions.
 */
export function quickTaxOnSalary(
  annualSalary: number,
  regime: RegimeId,
  fyId: string,
  deductions: Record<string, number> = {},
  ageGroup: AgeGroup = 'below60',
): number {
  return calculateTax({
    fyId,
    regime,
    ageGroup,
    salaryIncome: annualSalary,
    basicSalary: 0,
    hraReceived: 0,
    rentPaid: 0,
    metroCity: false,
    interestIncome: 0,
    rentalIncome: 0,
    otherIncome: 0,
    ltcgEquity: 0,
    stcgEquity: 0,
    deductions,
  }).totalTax;
}
