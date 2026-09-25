import { safe } from './core';

/* ==================================================================
 * HRA exemption — section 10(13A) read with rule 2A
 *
 * The exemption is the LEAST of three amounts. That "least of" is the
 * whole rule, and it is what catches people out: paying more rent does
 * not help once one of the other two limits binds.
 *
 * "Salary" here means basic + dearness allowance (to the extent it
 * forms part of retirement benefits) + commission on turnover. It is
 * not gross salary, and using gross is the most common mistake.
 * ================================================================== */

export interface HraInput {
  basicSalary: number;
  dearnessAllowance: number;
  hraReceived: number;
  rentPaid: number;
  metroCity: boolean;
  /** Months the rent was actually paid during the year. */
  months: number;
}

export interface HraLimit {
  label: string;
  amount: number;
  applied: boolean;
}

export interface HraResult {
  salaryForHra: number;
  hraReceived: number;
  rentPaid: number;
  exemptAmount: number;
  taxableHra: number;
  limits: HraLimit[];
  cityRatePct: number;
  /** Rent below this earns no exemption at all — it never clears 10% of salary. */
  rentThreshold: number;
  /** Rent beyond this adds nothing, because another limit takes over. */
  optimalRent: number;
  noBenefit: boolean;
}

export function calculateHRA(input: HraInput): HraResult {
  const months = Math.min(12, Math.max(0, input.months));
  const factor = months / 12;

  const salaryForHra = (Math.max(0, input.basicSalary) + Math.max(0, input.dearnessAllowance)) * factor;
  const hraReceived = Math.max(0, input.hraReceived) * factor;
  const rentPaid = Math.max(0, input.rentPaid) * factor;
  const cityRate = input.metroCity ? 50 : 40;

  const tenPercentOfSalary = 0.1 * salaryForHra;
  const rentMinusTen = Math.max(0, rentPaid - tenPercentOfSalary);
  const cityLimit = (salaryForHra * cityRate) / 100;

  const candidates = [
    { label: 'Actual HRA received', amount: hraReceived },
    { label: `Rent paid − 10% of salary`, amount: rentMinusTen },
    { label: `${cityRate}% of salary (${input.metroCity ? 'metro' : 'non-metro'})`, amount: cityLimit },
  ];

  const exemptAmount = Math.min(...candidates.map((c) => c.amount));
  const limits: HraLimit[] = candidates.map((c) => ({
    ...c,
    applied: Math.abs(c.amount - exemptAmount) < 0.5,
  }));

  return {
    salaryForHra: safe(salaryForHra),
    hraReceived: safe(hraReceived),
    rentPaid: safe(rentPaid),
    exemptAmount: safe(Math.max(0, exemptAmount)),
    taxableHra: safe(Math.max(0, hraReceived - Math.max(0, exemptAmount))),
    limits,
    cityRatePct: cityRate,
    rentThreshold: safe(tenPercentOfSalary),
    // Past this point the HRA received or the city cap binds instead.
    optimalRent: safe(Math.min(hraReceived, cityLimit) + tenPercentOfSalary),
    noBenefit: exemptAmount <= 0,
  };
}

/* ==================================================================
 * TDS — tax deducted at source
 *
 * Each section carries its own rate and its own threshold, and the
 * threshold matters as much as the rate: below it nothing is deducted
 * at all. Where no PAN is furnished, section 206AA overrides the
 * section rate with the higher of that rate or 20%.
 *
 * Rates below reflect FY 2025-26 / FY 2026-27. Verify against the
 * current Finance Act before relying on them for a live deduction.
 * ================================================================== */

export interface TdsSection {
  id: string;
  code: string;
  label: string;
  /** Rate for an individual or HUF deductee. */
  individualRate: number;
  /** Rate for a company, firm or other non-individual deductee. */
  companyRate: number;
  /** Single-payment threshold; 0 when only the annual one applies. */
  singleThreshold: number;
  /** Aggregate annual threshold. */
  annualThreshold: number;
  note: string;
}

export const TDS_SECTIONS: TdsSection[] = [
  {
    id: '194c',
    code: '194C',
    label: 'Contractor / sub-contractor payments',
    individualRate: 1,
    companyRate: 2,
    singleThreshold: 30000,
    annualThreshold: 100000,
    note: '1% for individual/HUF contractors, 2% for companies and firms.',
  },
  {
    id: '194j-prof',
    code: '194J',
    label: 'Professional fees',
    individualRate: 10,
    companyRate: 10,
    singleThreshold: 0,
    annualThreshold: 50000,
    note: 'Legal, medical, engineering, architectural, accountancy and similar services.',
  },
  {
    id: '194j-tech',
    code: '194J',
    label: 'Technical services',
    individualRate: 2,
    companyRate: 2,
    singleThreshold: 0,
    annualThreshold: 50000,
    note: 'Technical services attract 2%, not the 10% that applies to professional fees.',
  },
  {
    id: '194i-building',
    code: '194I(b)',
    label: 'Rent — land, building or furniture',
    individualRate: 10,
    companyRate: 10,
    singleThreshold: 0,
    annualThreshold: 600000,
    note: 'The threshold is per payer per financial year.',
  },
  {
    id: '194i-machinery',
    code: '194I(a)',
    label: 'Rent — plant and machinery',
    individualRate: 2,
    companyRate: 2,
    singleThreshold: 0,
    annualThreshold: 600000,
    note: 'Equipment hire is taxed at a lower rate than premises.',
  },
  {
    id: '194h',
    code: '194H',
    label: 'Commission or brokerage',
    individualRate: 2,
    companyRate: 2,
    singleThreshold: 0,
    annualThreshold: 20000,
    note: 'Reduced from 5% to 2% with effect from 1 October 2024.',
  },
  {
    id: '194a',
    code: '194A',
    label: 'Interest other than on securities',
    individualRate: 10,
    companyRate: 10,
    singleThreshold: 0,
    annualThreshold: 50000,
    note: 'Bank and post office deposits. The senior-citizen threshold is ₹1,00,000.',
  },
  {
    id: '194',
    code: '194',
    label: 'Dividend',
    individualRate: 10,
    companyRate: 10,
    singleThreshold: 0,
    annualThreshold: 10000,
    note: 'Deducted by the company before the dividend reaches you.',
  },
  {
    id: '194ib',
    code: '194-IB',
    label: 'Rent paid by individual / HUF',
    individualRate: 2,
    companyRate: 2,
    singleThreshold: 0,
    annualThreshold: 600000,
    note: 'Applies when rent exceeds ₹50,000 a month and the payer is not subject to audit.',
  },
  {
    id: '194q',
    code: '194Q',
    label: 'Purchase of goods',
    individualRate: 0.1,
    companyRate: 0.1,
    singleThreshold: 0,
    annualThreshold: 5000000,
    note: 'Applies to buyers with turnover above ₹10 crore, on value above ₹50 lakh.',
  },
  {
    id: '194o',
    code: '194-O',
    label: 'E-commerce participant payments',
    individualRate: 0.1,
    companyRate: 0.1,
    singleThreshold: 0,
    annualThreshold: 500000,
    note: 'Deducted by the e-commerce operator on gross sales.',
  },
  {
    id: '194ia',
    code: '194-IA',
    label: 'Purchase of immovable property',
    individualRate: 1,
    companyRate: 1,
    singleThreshold: 5000000,
    annualThreshold: 5000000,
    note: 'Buyer deducts 1% where the consideration is ₹50 lakh or more.',
  },
];

export const NO_PAN_RATE = 20;

export type DeducteeType = 'individual' | 'company';

export interface TdsInput {
  sectionId: string;
  paymentAmount: number;
  /** Everything already paid to this deductee this year under this section. */
  previousPayments: number;
  deducteeType: DeducteeType;
  panAvailable: boolean;
}

export interface TdsResult {
  section: TdsSection;
  paymentAmount: number;
  aggregateAmount: number;
  applicableRate: number;
  baseRate: number;
  tdsAmount: number;
  netPayable: number;
  thresholdCrossed: boolean;
  thresholdApplied: number;
  panPenaltyApplied: boolean;
  /** Payment at which deduction begins, given what has already been paid. */
  remainingBeforeThreshold: number;
}

export function calculateTDS(input: TdsInput): TdsResult {
  const section = TDS_SECTIONS.find((s) => s.id === input.sectionId) ?? TDS_SECTIONS[0];
  const payment = Math.max(0, input.paymentAmount);
  const previous = Math.max(0, input.previousPayments);
  const aggregate = payment + previous;

  const baseRate =
    input.deducteeType === 'company' ? section.companyRate : section.individualRate;

  // Section 206AA: no PAN means the higher of the section rate and 20%.
  const panPenaltyApplied = !input.panAvailable && baseRate < NO_PAN_RATE;
  const applicableRate = panPenaltyApplied ? NO_PAN_RATE : baseRate;

  // Either threshold can trigger the deduction independently.
  const singleCrossed = section.singleThreshold > 0 && payment >= section.singleThreshold;
  const annualCrossed = aggregate > section.annualThreshold;
  const thresholdCrossed = singleCrossed || annualCrossed;

  const thresholdApplied = singleCrossed ? section.singleThreshold : section.annualThreshold;
  const tdsAmount = thresholdCrossed ? (payment * applicableRate) / 100 : 0;

  return {
    section,
    paymentAmount: payment,
    aggregateAmount: safe(aggregate),
    applicableRate,
    baseRate,
    tdsAmount: safe(tdsAmount),
    netPayable: safe(payment - tdsAmount),
    thresholdCrossed,
    thresholdApplied,
    panPenaltyApplied,
    remainingBeforeThreshold: safe(Math.max(0, section.annualThreshold - previous)),
  };
}

/* ==================================================================
 * Capital gains tax
 *
 * The Finance (No. 2) Act 2024 reset this regime with effect from
 * 23 July 2024: holding periods collapsed to 12 months for listed
 * securities and 24 months for everything else, indexation was
 * withdrawn, and the long-term rate became a flat 12.5% across asset
 * classes. Debt funds bought on or after 1 April 2023 are outside all
 * of that — their gains are always taxed at slab rates.
 * ================================================================== */

export type AssetClass = 'equity' | 'debt-mf' | 'property' | 'gold' | 'unlisted';

export interface AssetRule {
  id: AssetClass;
  label: string;
  /** Months of holding needed to qualify as long-term. */
  longTermMonths: number;
  shortTermRatePct: number;
  longTermRatePct: number;
  /** Annual LTCG exemption; only equity has one. */
  exemption: number;
  slabTaxed: boolean;
  note: string;
}

export const ASSET_RULES: Record<AssetClass, AssetRule> = {
  equity: {
    id: 'equity',
    label: 'Listed shares / equity mutual funds',
    longTermMonths: 12,
    shortTermRatePct: 20,
    longTermRatePct: 12.5,
    exemption: 125000,
    slabTaxed: false,
    note: 'STT-paid equity. LTCG above ₹1.25 lakh a year is taxed at 12.5%; STCG at 20%.',
  },
  'debt-mf': {
    id: 'debt-mf',
    label: 'Debt mutual funds (bought after 31 Mar 2023)',
    longTermMonths: 24,
    shortTermRatePct: 0,
    longTermRatePct: 0,
    exemption: 0,
    slabTaxed: true,
    note: 'Always taxed at your slab rate regardless of how long you hold them.',
  },
  property: {
    id: 'property',
    label: 'Immovable property',
    longTermMonths: 24,
    shortTermRatePct: 0,
    longTermRatePct: 12.5,
    exemption: 0,
    slabTaxed: false,
    note: 'STCG is added to income and taxed at slab. LTCG is 12.5% without indexation.',
  },
  gold: {
    id: 'gold',
    label: 'Gold, jewellery and ETFs',
    longTermMonths: 24,
    shortTermRatePct: 0,
    longTermRatePct: 12.5,
    exemption: 0,
    slabTaxed: false,
    note: 'STCG at slab rate; LTCG at 12.5% after 24 months.',
  },
  unlisted: {
    id: 'unlisted',
    label: 'Unlisted shares / ESOPs',
    longTermMonths: 24,
    shortTermRatePct: 0,
    longTermRatePct: 12.5,
    exemption: 0,
    slabTaxed: false,
    note: 'STCG at slab rate; LTCG at 12.5% after 24 months.',
  },
};

export interface CapitalGainsInput {
  assetClass: AssetClass;
  purchasePrice: number;
  salePrice: number;
  /** Brokerage, stamp duty, registration, improvement cost. */
  expenses: number;
  holdingMonths: number;
  /** Used where the gain is taxed at slab rates instead of a flat rate. */
  slabRatePct: number;
  /** Equity LTCG already realised this year, against the ₹1.25 lakh exemption. */
  exemptionUsed: number;
}

export interface CapitalGainsResult {
  rule: AssetRule;
  netSaleValue: number;
  totalCost: number;
  capitalGain: number;
  isLongTerm: boolean;
  gainType: 'LTCG' | 'STCG';
  exemptionAvailable: number;
  exemptionApplied: number;
  taxableGain: number;
  taxRatePct: number;
  taxAmount: number;
  cess: number;
  totalTax: number;
  netProceeds: number;
  effectiveTaxPct: number;
  /** Months still to run before the gain would qualify as long-term. */
  monthsToLongTerm: number;
}

const CESS_RATE = 4;

export function calculateCapitalGains(input: CapitalGainsInput): CapitalGainsResult {
  const rule = ASSET_RULES[input.assetClass] ?? ASSET_RULES.equity;

  const netSaleValue = Math.max(0, input.salePrice) - Math.max(0, input.expenses);
  const totalCost = Math.max(0, input.purchasePrice);
  const capitalGain = netSaleValue - totalCost;

  const isLongTerm = input.holdingMonths >= rule.longTermMonths;
  const gainType: 'LTCG' | 'STCG' = isLongTerm ? 'LTCG' : 'STCG';

  // Only equity carries an annual exemption, and only on long-term gains.
  const exemptionAvailable =
    rule.exemption > 0 && isLongTerm ? Math.max(0, rule.exemption - Math.max(0, input.exemptionUsed)) : 0;
  const exemptionApplied = capitalGain > 0 ? Math.min(capitalGain, exemptionAvailable) : 0;
  const taxableGain = Math.max(0, capitalGain - exemptionApplied);

  // Debt funds are always slab-taxed; other assets are slab-taxed only short-term.
  const slabApplies = rule.slabTaxed || (!isLongTerm && rule.shortTermRatePct === 0);
  const taxRatePct = slabApplies
    ? Math.max(0, input.slabRatePct)
    : isLongTerm
      ? rule.longTermRatePct
      : rule.shortTermRatePct;

  const taxAmount = (taxableGain * taxRatePct) / 100;
  const cess = (taxAmount * CESS_RATE) / 100;
  const totalTax = taxAmount + cess;

  return {
    rule,
    netSaleValue: safe(netSaleValue),
    totalCost: safe(totalCost),
    capitalGain: safe(capitalGain),
    isLongTerm,
    gainType,
    exemptionAvailable: safe(exemptionAvailable),
    exemptionApplied: safe(exemptionApplied),
    taxableGain: safe(taxableGain),
    taxRatePct,
    taxAmount: safe(taxAmount),
    cess: safe(cess),
    totalTax: safe(totalTax),
    netProceeds: safe(netSaleValue - totalTax),
    effectiveTaxPct: capitalGain > 0 ? safe((totalTax / capitalGain) * 100) : 0,
    monthsToLongTerm: Math.max(0, rule.longTermMonths - Math.max(0, input.holdingMonths)),
  };
}
