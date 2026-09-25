/**
 * ─────────────────────────────────────────────────────────────────────
 *  INDIAN INCOME TAX — RULE CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────
 *  This file is DATA, not logic. When the Budget changes a slab, a rebate
 *  or a surcharge threshold, edit this file only — the engine in
 *  src/engines/tax.ts and every component stay untouched.
 *
 *  To add a financial year: copy the newest entry, change the id/label and
 *  the numbers, and add it to FINANCIAL_YEARS. It appears in the UI
 *  automatically.
 *
 *  Sources: Income-tax Act slabs as amended by the Finance Acts; rates
 *  current for FY 2024-25 to FY 2026-27. Verify against the latest Finance
 *  Act before filing.
 * ─────────────────────────────────────────────────────────────────────
 */

export type RegimeId = 'old' | 'new';
export type AgeGroup = 'below60' | 'senior' | 'superSenior';

/** `upTo: null` means "and above". Rate is a percentage. */
export interface Slab {
  upTo: number | null;
  rate: number;
}

export interface SurchargeBand {
  /** Applies when total income EXCEEDS this figure. */
  above: number;
  rate: number;
}

export interface DeductionRule {
  id: string;
  label: string;
  /** Section shown next to the field. */
  section: string;
  cap: number | null;
  help?: string;
  /** Regimes in which the deduction is allowed. */
  regimes: RegimeId[];
}

export interface RegimeRules {
  id: RegimeId;
  label: string;
  slabs: Record<AgeGroup, Slab[]>;
  /** Salaried standard deduction under section 16(ia). */
  standardDeduction: number;
  rebate: {
    /** Rebate applies when taxable income is at or below this figure. */
    maxTaxableIncome: number;
    maxRebate: number;
    /** Marginal relief just above the rebate threshold (new regime). */
    marginalRelief: boolean;
  };
  surcharge: SurchargeBand[];
  cessPct: number;
  /** Chapter VI-A deductions permitted under this regime. */
  allowsChapterVIA: boolean;
  /** HRA exemption u/s 10(13A) available. */
  allowsHRA: boolean;
}

export interface FinancialYear {
  id: string;
  label: string;
  assessmentYear: string;
  /** Marks the year the app defaults to. */
  current?: boolean;
  regimes: Record<RegimeId, RegimeRules>;
  /** Special-rate incomes taxed outside the slabs. */
  specialRates: {
    ltcgEquity: { rate: number; exemption: number; label: string };
    stcgEquity: { rate: number; label: string };
  };
}

/* ---------------- Slab tables ---------------- */

const OLD_SLABS: Record<AgeGroup, Slab[]> = {
  below60: [
    { upTo: 250000, rate: 0 },
    { upTo: 500000, rate: 5 },
    { upTo: 1000000, rate: 20 },
    { upTo: null, rate: 30 },
  ],
  senior: [
    { upTo: 300000, rate: 0 },
    { upTo: 500000, rate: 5 },
    { upTo: 1000000, rate: 20 },
    { upTo: null, rate: 30 },
  ],
  superSenior: [
    { upTo: 500000, rate: 0 },
    { upTo: 1000000, rate: 20 },
    { upTo: null, rate: 30 },
  ],
};

/** New regime slabs from FY 2025-26 (Finance Act 2025), unchanged for FY 2026-27. */
const NEW_SLABS_2025: Slab[] = [
  { upTo: 400000, rate: 0 },
  { upTo: 800000, rate: 5 },
  { upTo: 1200000, rate: 10 },
  { upTo: 1600000, rate: 15 },
  { upTo: 2000000, rate: 20 },
  { upTo: 2400000, rate: 25 },
  { upTo: null, rate: 30 },
];

const NEW_SLABS_2024: Slab[] = [
  { upTo: 300000, rate: 0 },
  { upTo: 700000, rate: 5 },
  { upTo: 1000000, rate: 10 },
  { upTo: 1200000, rate: 15 },
  { upTo: 1500000, rate: 20 },
  { upTo: null, rate: 30 },
];

const OLD_SURCHARGE: SurchargeBand[] = [
  { above: 5000000, rate: 10 },
  { above: 10000000, rate: 15 },
  { above: 20000000, rate: 25 },
  { above: 50000000, rate: 37 },
];

/** The new regime caps surcharge at 25%. */
const NEW_SURCHARGE: SurchargeBand[] = [
  { above: 5000000, rate: 10 },
  { above: 10000000, rate: 15 },
  { above: 20000000, rate: 25 },
];

const oldRegime = (): RegimeRules => ({
  id: 'old',
  label: 'Old Regime',
  slabs: OLD_SLABS,
  standardDeduction: 50000,
  rebate: { maxTaxableIncome: 500000, maxRebate: 12500, marginalRelief: false },
  surcharge: OLD_SURCHARGE,
  cessPct: 4,
  allowsChapterVIA: true,
  allowsHRA: true,
});

const newRegime = (slabs: Slab[], rebateMaxIncome: number, rebateMax: number): RegimeRules => ({
  id: 'new',
  label: 'New Regime',
  slabs: { below60: slabs, senior: slabs, superSenior: slabs },
  standardDeduction: 75000,
  rebate: { maxTaxableIncome: rebateMaxIncome, maxRebate: rebateMax, marginalRelief: true },
  surcharge: NEW_SURCHARGE,
  cessPct: 4,
  allowsChapterVIA: false,
  allowsHRA: false,
});

const SPECIAL_RATES_CURRENT = {
  ltcgEquity: { rate: 12.5, exemption: 125000, label: 'LTCG on listed equity u/s 112A' },
  stcgEquity: { rate: 20, label: 'STCG on listed equity u/s 111A' },
};

export const FINANCIAL_YEARS: FinancialYear[] = [
  {
    id: '2026-27',
    label: 'FY 2026-27',
    assessmentYear: 'AY 2027-28',
    current: true,
    regimes: { old: oldRegime(), new: newRegime(NEW_SLABS_2025, 1200000, 60000) },
    specialRates: SPECIAL_RATES_CURRENT,
  },
  {
    id: '2025-26',
    label: 'FY 2025-26',
    assessmentYear: 'AY 2026-27',
    regimes: { old: oldRegime(), new: newRegime(NEW_SLABS_2025, 1200000, 60000) },
    specialRates: SPECIAL_RATES_CURRENT,
  },
  {
    id: '2024-25',
    label: 'FY 2024-25',
    assessmentYear: 'AY 2025-26',
    regimes: { old: oldRegime(), new: newRegime(NEW_SLABS_2024, 700000, 25000) },
    specialRates: SPECIAL_RATES_CURRENT,
  },
];

export const DEFAULT_FY = FINANCIAL_YEARS.find((f) => f.current) ?? FINANCIAL_YEARS[0];

export const getFinancialYear = (id: string): FinancialYear =>
  FINANCIAL_YEARS.find((f) => f.id === id) ?? DEFAULT_FY;

/* ---------------- Chapter VI-A deductions ---------------- */

export const DEDUCTIONS: DeductionRule[] = [
  {
    id: 'sec80C',
    label: 'Section 80C investments',
    section: '80C',
    cap: 150000,
    help: 'EPF, PPF, ELSS, life insurance premium, principal on home loan, tuition fees, NSC, 5-year FD.',
    regimes: ['old'],
  },
  {
    id: 'sec80CCD1B',
    label: 'NPS self contribution',
    section: '80CCD(1B)',
    cap: 50000,
    help: 'Additional ₹50,000 for NPS Tier-I, over and above the 80C ceiling.',
    regimes: ['old'],
  },
  {
    id: 'sec80D',
    label: 'Health insurance premium',
    section: '80D',
    cap: 100000,
    help: 'Up to ₹25,000 for self and family (₹50,000 if senior), plus the same again for parents.',
    regimes: ['old'],
  },
  {
    id: 'homeLoanInterest',
    label: 'Home loan interest',
    section: '24(b)',
    cap: 200000,
    help: 'Interest on a self-occupied house property. Let-out property has no cap but loss set-off is limited to ₹2 lakh.',
    regimes: ['old'],
  },
  {
    id: 'sec80E',
    label: 'Education loan interest',
    section: '80E',
    cap: null,
    help: 'Full interest on an education loan, for up to 8 years. No upper limit.',
    regimes: ['old'],
  },
  {
    id: 'sec80TTA',
    label: 'Savings account interest',
    section: '80TTA / 80TTB',
    cap: 50000,
    help: '₹10,000 for savings interest (80TTA). Senior citizens get ₹50,000 on all deposit interest (80TTB).',
    regimes: ['old'],
  },
  {
    id: 'sec80G',
    label: 'Donations',
    section: '80G',
    cap: null,
    help: 'Enter the eligible deduction amount (50% or 100% of the donation, as applicable).',
    regimes: ['old'],
  },
  {
    id: 'professionalTax',
    label: 'Professional tax paid',
    section: '16(iii)',
    cap: 2500,
    help: 'Professional tax deducted by your employer, capped at ₹2,500 a year.',
    regimes: ['old'],
  },
  {
    id: 'sec80CCD2',
    label: 'Employer NPS contribution',
    section: '80CCD(2)',
    cap: null,
    help: 'Employer NPS contribution: up to 14% of Basic + DA in the new regime, 10% in the old regime. Allowed under both.',
    regimes: ['old', 'new'],
  },
];

export const deductionsFor = (regime: RegimeId): DeductionRule[] =>
  DEDUCTIONS.filter((d) => d.regimes.includes(regime));
