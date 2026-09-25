import { pct, safe } from './core';

/* ==================================================================
 * SWP — systematic withdrawal plan
 *
 * The mirror image of a SIP: a corpus stays invested while a fixed
 * amount is taken out every month. Each month the balance earns a
 * month's return and the withdrawal is then deducted, which is the
 * order every AMC uses. Whether the corpus survives the period is the
 * whole question, so the engine reports the month it runs dry.
 * ================================================================== */

export interface SwpInput {
  initialInvestment: number;
  monthlyWithdrawal: number;
  expectedReturnPct: number;
  years: number;
  /** Raise the withdrawal once a year to keep pace with inflation. */
  annualIncreasePct: number;
}

export interface SwpYearRow {
  year: number;
  opening: number;
  withdrawn: number;
  growth: number;
  closing: number;
}

export interface SwpResult {
  initialInvestment: number;
  totalWithdrawn: number;
  totalGrowth: number;
  finalBalance: number;
  /** 0 when the corpus outlives the period. */
  depletedInMonth: number;
  lasts: boolean;
  /** The withdrawal the corpus could sustain indefinitely. */
  sustainableMonthly: number;
  finalMonthlyWithdrawal: number;
  rows: SwpYearRow[];
}

export function calculateSWP(input: SwpInput): SwpResult {
  const months = Math.max(0, Math.round(input.years * 12));
  const r = pct(input.expectedReturnPct) / 12;
  const step = 1 + Math.max(0, input.annualIncreasePct) / 100;

  let balance = Math.max(0, input.initialInvestment);
  let withdrawal = Math.max(0, input.monthlyWithdrawal);
  let totalWithdrawn = 0;
  let totalGrowth = 0;
  let depletedInMonth = 0;

  const rows: SwpYearRow[] = [];
  let yearOpening = balance;
  let yearWithdrawn = 0;
  let yearGrowth = 0;

  for (let m = 1; m <= months; m++) {
    const growth = balance * r;
    balance += growth;

    // You cannot withdraw more than is left.
    const taken = Math.min(withdrawal, balance);
    balance -= taken;

    totalGrowth += growth;
    totalWithdrawn += taken;
    yearGrowth += growth;
    yearWithdrawn += taken;

    if (balance <= 0.01 && depletedInMonth === 0) {
      balance = 0;
      depletedInMonth = m;
    }

    if (m % 12 === 0 || m === months) {
      rows.push({
        year: Math.ceil(m / 12),
        opening: yearOpening,
        withdrawn: yearWithdrawn,
        growth: yearGrowth,
        closing: balance,
      });
      yearOpening = balance;
      yearWithdrawn = 0;
      yearGrowth = 0;
      if (m % 12 === 0) withdrawal *= step;
    }
  }

  return {
    initialInvestment: Math.max(0, input.initialInvestment),
    totalWithdrawn: safe(totalWithdrawn),
    totalGrowth: safe(totalGrowth),
    finalBalance: safe(balance),
    depletedInMonth,
    lasts: depletedInMonth === 0,
    // Withdrawing only the monthly return leaves the capital untouched.
    sustainableMonthly: safe(Math.max(0, input.initialInvestment) * r),
    finalMonthlyWithdrawal: safe(withdrawal),
    rows,
  };
}

/* ==================================================================
 * Sukanya Samriddhi Yojana
 *
 * Deposits run for 15 years from opening; the account then sits and
 * compounds untouched until it matures 21 years from opening. Interest
 * is compounded annually. Deposits are capped at ₹1.5 lakh a year and
 * the girl must be under 10 when the account is opened.
 * ================================================================== */

export const SSY_RATE = 8.2;
export const SSY_MIN_DEPOSIT = 250;
export const SSY_MAX_DEPOSIT = 150000;
export const SSY_DEPOSIT_YEARS = 15;
export const SSY_TERM_YEARS = 21;

export interface SsyInput {
  yearlyDeposit: number;
  ratePct: number;
  girlAge: number;
  startYear: number;
}

export interface SsyYearRow {
  year: number;
  calendarYear: number;
  deposit: number;
  openingBalance: number;
  interest: number;
  closingBalance: number;
}

export interface SsyResult {
  totalDeposited: number;
  totalInterest: number;
  maturityValue: number;
  maturityYear: number;
  /** The girl's age when the account matures. */
  ageAtMaturity: number;
  eligible: boolean;
  rows: SsyYearRow[];
}

export function calculateSSY(input: SsyInput): SsyResult {
  const deposit = Math.min(SSY_MAX_DEPOSIT, Math.max(0, input.yearlyDeposit));
  const rate = pct(input.ratePct);

  let balance = 0;
  let totalDeposited = 0;
  let totalInterest = 0;
  const rows: SsyYearRow[] = [];

  for (let y = 1; y <= SSY_TERM_YEARS; y++) {
    const opening = balance;
    // Deposits only in the first 15 years; the rest is pure compounding.
    const thisDeposit = y <= SSY_DEPOSIT_YEARS ? deposit : 0;
    balance += thisDeposit;
    const interest = balance * rate;
    balance += interest;

    totalDeposited += thisDeposit;
    totalInterest += interest;

    rows.push({
      year: y,
      calendarYear: input.startYear + y - 1,
      deposit: thisDeposit,
      openingBalance: opening,
      interest,
      closingBalance: balance,
    });
  }

  return {
    totalDeposited: safe(totalDeposited),
    totalInterest: safe(totalInterest),
    maturityValue: safe(balance),
    maturityYear: input.startYear + SSY_TERM_YEARS,
    ageAtMaturity: Math.max(0, input.girlAge) + SSY_TERM_YEARS,
    eligible: input.girlAge <= 10,
    rows,
  };
}

/* ==================================================================
 * Compound interest, with optional recurring contributions
 * ================================================================== */

export type CompoundFrequency = 'yearly' | 'half-yearly' | 'quarterly' | 'monthly' | 'daily';

export const COMPOUNDS_PER_YEAR: Record<CompoundFrequency, number> = {
  yearly: 1,
  'half-yearly': 2,
  quarterly: 4,
  monthly: 12,
  daily: 365,
};

export interface CompoundInput {
  principal: number;
  ratePct: number;
  years: number;
  frequency: CompoundFrequency;
  /** Added every month on top of the principal; 0 for a plain lumpsum. */
  monthlyContribution: number;
}

export interface CompoundYearRow {
  year: number;
  opening: number;
  contributed: number;
  interest: number;
  closing: number;
}

export interface CompoundResult {
  principal: number;
  totalContributed: number;
  totalInvested: number;
  totalInterest: number;
  maturityValue: number;
  effectiveAnnualRatePct: number;
  simpleInterestValue: number;
  compoundingAdvantage: number;
  rows: CompoundYearRow[];
}

export function calculateCompoundInterest(input: CompoundInput): CompoundResult {
  const principal = Math.max(0, input.principal);
  const monthly = Math.max(0, input.monthlyContribution);
  const years = Math.max(0, input.years);
  const n = COMPOUNDS_PER_YEAR[input.frequency] ?? 1;
  const annual = pct(input.ratePct);

  // Work the whole thing month by month so contributions and a compounding
  // frequency that is not monthly can coexist without approximation.
  const monthlyGrowth = Math.pow(1 + annual / n, n / 12) - 1;
  const totalMonths = Math.round(years * 12);

  let balance = principal;
  let totalContributed = 0;
  let totalInterest = 0;
  const rows: CompoundYearRow[] = [];

  let yearOpening = balance;
  let yearContributed = 0;
  let yearInterest = 0;

  for (let m = 1; m <= totalMonths; m++) {
    balance += monthly;
    totalContributed += monthly;
    yearContributed += monthly;

    const interest = balance * monthlyGrowth;
    balance += interest;
    totalInterest += interest;
    yearInterest += interest;

    if (m % 12 === 0 || m === totalMonths) {
      rows.push({
        year: Math.ceil(m / 12),
        opening: yearOpening,
        contributed: yearContributed,
        interest: yearInterest,
        closing: balance,
      });
      yearOpening = balance;
      yearContributed = 0;
      yearInterest = 0;
    }
  }

  const totalInvested = principal + totalContributed;
  const simpleInterestValue = principal * (1 + annual * years) + totalContributed;

  return {
    principal,
    totalContributed: safe(totalContributed),
    totalInvested: safe(totalInvested),
    totalInterest: safe(totalInterest),
    maturityValue: safe(balance),
    // What the quoted nominal rate actually earns once compounding is applied.
    effectiveAnnualRatePct: safe((Math.pow(1 + annual / n, n) - 1) * 100),
    simpleInterestValue: safe(simpleInterestValue),
    compoundingAdvantage: safe(balance - simpleInterestValue),
    rows,
  };
}
