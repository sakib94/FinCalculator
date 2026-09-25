import { safe } from './core';
import { quickTaxOnSalary } from './tax';
import type { RegimeId } from '@/data/taxRules';

/* ==================================================================
 * Monthly salary: gross → net take-home
 * ================================================================== */

export interface SalaryInput {
  monthlyGross: number;
  basicPct: number;
  hraPct: number; // % of basic
  pfOnCeiling: boolean; // restrict PF to the ₹15,000 wage ceiling
  professionalTaxMonthly: number;
  otherDeductionsMonthly: number;
  regime: RegimeId;
  fyId: string;
}

export interface SalaryResult {
  monthlyGross: number;
  annualGross: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  employeePF: number;
  employerPF: number;
  professionalTax: number;
  otherDeductions: number;
  monthlyIncomeTax: number;
  annualIncomeTax: number;
  totalMonthlyDeductions: number;
  monthlyNet: number;
  annualNet: number;
  takeHomePct: number;
}

export const PF_WAGE_CEILING = 15000;
export const EMPLOYEE_PF_RATE = 12;

export function calculateSalary(input: SalaryInput): SalaryResult {
  const gross = Math.max(0, input.monthlyGross);
  const basic = (gross * input.basicPct) / 100;
  const hra = (basic * input.hraPct) / 100;
  const specialAllowance = Math.max(0, gross - basic - hra);

  const pfBase = input.pfOnCeiling ? Math.min(basic, PF_WAGE_CEILING) : basic;
  const employeePF = (pfBase * EMPLOYEE_PF_RATE) / 100;
  const employerPF = (pfBase * EMPLOYEE_PF_RATE) / 100;

  const annualGross = gross * 12;
  const annualIncomeTax = quickTaxOnSalary(annualGross, input.regime, input.fyId, {
    sec80C: input.regime === 'old' ? employeePF * 12 : 0,
    professionalTax: input.regime === 'old' ? input.professionalTaxMonthly * 12 : 0,
  });

  const monthlyIncomeTax = annualIncomeTax / 12;
  const totalMonthlyDeductions =
    employeePF + input.professionalTaxMonthly + input.otherDeductionsMonthly + monthlyIncomeTax;
  const monthlyNet = gross - totalMonthlyDeductions;

  return {
    monthlyGross: gross,
    annualGross,
    basic: safe(basic),
    hra: safe(hra),
    specialAllowance: safe(specialAllowance),
    employeePF: safe(employeePF),
    employerPF: safe(employerPF),
    professionalTax: Math.max(0, input.professionalTaxMonthly),
    otherDeductions: Math.max(0, input.otherDeductionsMonthly),
    monthlyIncomeTax: safe(monthlyIncomeTax),
    annualIncomeTax: safe(annualIncomeTax),
    totalMonthlyDeductions: safe(totalMonthlyDeductions),
    monthlyNet: safe(monthlyNet),
    annualNet: safe(monthlyNet * 12),
    takeHomePct: gross > 0 ? (monthlyNet / gross) * 100 : 0,
  };
}

/* ==================================================================
 * CTC → in-hand
 * ================================================================== */

export interface CtcInput {
  annualCTC: number;
  basicPctOfCTC: number;
  hraPctOfBasic: number;
  includesGratuity: boolean;
  pfOnCeiling: boolean;
  otherEmployerBenefits: number; // annual: insurance, meal cards, etc.
  professionalTaxAnnual: number;
  regime: RegimeId;
  fyId: string;
}

export interface CtcResult {
  annualCTC: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  employerPF: number;
  gratuity: number;
  otherBenefits: number;
  grossSalary: number;
  employeePF: number;
  professionalTax: number;
  incomeTax: number;
  totalDeductions: number;
  annualInHand: number;
  monthlyInHand: number;
  monthlyGross: number;
  inHandPctOfCTC: number;
}

/** Gratuity is accrued in CTC at 4.81% of basic (15/26 ÷ 12). */
export const GRATUITY_CTC_RATE = 4.81;

export function calculateCTC(input: CtcInput): CtcResult {
  const ctc = Math.max(0, input.annualCTC);
  const basic = (ctc * input.basicPctOfCTC) / 100;
  const hra = (basic * input.hraPctOfBasic) / 100;

  const monthlyPfBase = input.pfOnCeiling ? Math.min(basic / 12, PF_WAGE_CEILING) : basic / 12;
  const employerPF = monthlyPfBase * (EMPLOYEE_PF_RATE / 100) * 12;
  const employeePF = employerPF;
  const gratuity = input.includesGratuity ? (basic * GRATUITY_CTC_RATE) / 100 : 0;
  const otherBenefits = Math.max(0, input.otherEmployerBenefits);

  const grossSalary = Math.max(0, ctc - employerPF - gratuity - otherBenefits);
  const specialAllowance = Math.max(0, grossSalary - basic - hra);

  const incomeTax = quickTaxOnSalary(grossSalary, input.regime, input.fyId, {
    sec80C: input.regime === 'old' ? employeePF : 0,
    professionalTax: input.regime === 'old' ? input.professionalTaxAnnual : 0,
  });

  const totalDeductions = employeePF + Math.max(0, input.professionalTaxAnnual) + incomeTax;
  const annualInHand = grossSalary - totalDeductions;

  return {
    annualCTC: ctc,
    basic: safe(basic),
    hra: safe(hra),
    specialAllowance: safe(specialAllowance),
    employerPF: safe(employerPF),
    gratuity: safe(gratuity),
    otherBenefits,
    grossSalary: safe(grossSalary),
    employeePF: safe(employeePF),
    professionalTax: Math.max(0, input.professionalTaxAnnual),
    incomeTax: safe(incomeTax),
    totalDeductions: safe(totalDeductions),
    annualInHand: safe(annualInHand),
    monthlyInHand: safe(annualInHand / 12),
    monthlyGross: safe(grossSalary / 12),
    inHandPctOfCTC: ctc > 0 ? (annualInHand / ctc) * 100 : 0,
  };
}

/* ==================================================================
 * Gratuity
 * ================================================================== */

export interface GratuityInput {
  monthlyBasicDA: number;
  years: number;
  months: number;
  coveredUnderAct: boolean;
}

export interface GratuityResult {
  eligible: boolean;
  completedYears: number;
  roundedYears: number;
  gratuity: number;
  exempt: number;
  taxable: number;
  cap: number;
  perDayWage: number;
}

export const GRATUITY_EXEMPTION_CAP = 2000000;

export function calculateGratuity(input: GratuityInput): GratuityResult {
  const salary = Math.max(0, input.monthlyBasicDA);
  const years = Math.max(0, Math.floor(input.years));
  const months = Math.max(0, Math.min(11, Math.floor(input.months)));
  const totalYears = years + months / 12;
  const eligible = totalYears >= 5;

  // Covered establishments round a part-year up when ≥ 6 months.
  const roundedYears = input.coveredUnderAct ? (months >= 6 ? years + 1 : years) : years;

  const divisor = input.coveredUnderAct ? 26 : 30;
  const gratuity = eligible ? (15 / divisor) * salary * roundedYears : 0;
  const exempt = Math.min(gratuity, GRATUITY_EXEMPTION_CAP);

  return {
    eligible,
    completedYears: years,
    roundedYears,
    gratuity: safe(gratuity),
    exempt: safe(exempt),
    taxable: safe(Math.max(0, gratuity - exempt)),
    cap: GRATUITY_EXEMPTION_CAP,
    perDayWage: safe(salary / divisor),
  };
}

/* ==================================================================
 * Salary increment
 * ================================================================== */

/**
 * Two ways to ask the same question. 'rate' knows the percentage and wants
 * the new salary; 'reverse' has the old and new salary from an offer letter
 * and wants the percentage between them.
 */
export type IncrementMode = 'rate' | 'reverse';

export interface IncrementInput {
  currentSalary: number;
  incrementPct: number;
  basis: 'monthly' | 'annual';
  projectionYears: number;
  mode?: IncrementMode;
}

/**
 * The reverse question: two gross salaries in, the increment between them
 * out. A raise from nothing has no meaningful percentage, so a previous
 * salary of zero reports 0 rather than Infinity.
 */
export function incrementPctBetween(previous: number, revised: number): number {
  if (previous <= 0) return 0;
  return safe(((revised - previous) / previous) * 100);
}

export interface IncrementResult {
  currentMonthly: number;
  newMonthly: number;
  increaseMonthly: number;
  currentAnnual: number;
  newAnnual: number;
  increaseAnnual: number;
  incrementPct: number;
  mode: IncrementMode;
  rows: { year: number; monthly: number; annual: number; increase: number }[];
}

export function calculateIncrement(input: IncrementInput): IncrementResult {
  const monthly = input.basis === 'monthly' ? Math.max(0, input.currentSalary) : Math.max(0, input.currentSalary) / 12;
  const factor = 1 + input.incrementPct / 100;
  const newMonthly = monthly * factor;

  const rows: IncrementResult['rows'] = [];
  let running = monthly;
  for (let y = 1; y <= Math.max(1, Math.round(input.projectionYears)); y++) {
    const next = running * factor;
    rows.push({ year: y, monthly: next, annual: next * 12, increase: next - running });
    running = next;
  }

  return {
    currentMonthly: safe(monthly),
    newMonthly: safe(newMonthly),
    increaseMonthly: safe(newMonthly - monthly),
    currentAnnual: safe(monthly * 12),
    newAnnual: safe(newMonthly * 12),
    increaseAnnual: safe((newMonthly - monthly) * 12),
    incrementPct: input.incrementPct,
    mode: input.mode ?? 'rate',
    rows,
  };
}

/* ==================================================================
 * Leave encashment
 * ================================================================== */

export interface LeaveInput {
  monthlyBasicDA: number;
  leaveDays: number;
  yearsOfService: number;
  governmentEmployee: boolean;
  leaveEntitlementPerYear: number; // days credited per year of service
}

export interface LeaveResult {
  perDayWage: number;
  amount: number;
  exempt: number;
  taxable: number;
  limits: { label: string; amount: number }[];
  maxEncashableDays: number;
}

export const LEAVE_EXEMPTION_CAP = 2500000;

export function calculateLeaveEncashment(input: LeaveInput): LeaveResult {
  const salary = Math.max(0, input.monthlyBasicDA);
  const perDay = salary / 30;
  const days = Math.max(0, input.leaveDays);
  const amount = perDay * days;

  if (input.governmentEmployee) {
    return {
      perDayWage: safe(perDay),
      amount: safe(amount),
      exempt: safe(amount),
      taxable: 0,
      limits: [{ label: 'Government employee — fully exempt u/s 10(10AA)(i)', amount }],
      maxEncashableDays: days,
    };
  }

  // Section 10(10AA)(ii): exemption is the LEAST of four limits.
  const tenMonthsSalary = salary * 10;
  const entitlementDays = Math.min(30, Math.max(0, input.leaveEntitlementPerYear));
  const cashEquivalent = perDay * entitlementDays * Math.max(0, Math.floor(input.yearsOfService));

  const limits = [
    { label: 'Statutory ceiling', amount: LEAVE_EXEMPTION_CAP },
    { label: 'Actual leave encashment received', amount },
    { label: '10 months average salary', amount: tenMonthsSalary },
    { label: `Cash equivalent of ${entitlementDays} days leave per completed year`, amount: cashEquivalent },
  ];
  const exempt = Math.min(...limits.map((l) => l.amount));

  return {
    perDayWage: safe(perDay),
    amount: safe(amount),
    exempt: safe(exempt),
    taxable: safe(Math.max(0, amount - exempt)),
    limits,
    maxEncashableDays: days,
  };
}
