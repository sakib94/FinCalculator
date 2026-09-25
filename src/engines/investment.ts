import {
  annuityPresentValue,
  cagr,
  compoundFutureValue,
  paymentForFutureValue,
  pct,
  realRate,
  safe,
  simpleFutureValue,
} from './core';

/* ==================================================================
 * SIP — monthly investing, optional annual step-up
 * ================================================================== */

export interface SipInput {
  monthlyInvestment: number;
  expectedReturnPct: number;
  years: number;
  annualStepUpPct: number;
}

export interface SipYearRow {
  year: number;
  monthlyInvestment: number;
  invested: number;
  totalInvested: number;
  wealthGained: number;
  balance: number;
}

export interface SipResult {
  totalInvested: number;
  estimatedReturns: number;
  futureValue: number;
  finalMonthly: number;
  absoluteReturnPct: number;
  rows: SipYearRow[];
}

export function calculateSIP(input: SipInput): SipResult {
  const months = Math.max(0, Math.round(input.years * 12));
  const r = pct(input.expectedReturnPct) / 12;
  const stepUp = 1 + input.annualStepUpPct / 100;

  let balance = 0;
  let monthly = Math.max(0, input.monthlyInvestment);
  let totalInvested = 0;
  const rows: SipYearRow[] = [];
  let yearInvested = 0;
  let yearStartMonthly = monthly;

  for (let m = 1; m <= months; m++) {
    balance = (balance + monthly) * (1 + r); // invested at the start of the month
    totalInvested += monthly;
    yearInvested += monthly;

    if (m % 12 === 0) {
      const year = m / 12;
      rows.push({
        year,
        monthlyInvestment: yearStartMonthly,
        invested: yearInvested,
        totalInvested,
        wealthGained: balance - totalInvested,
        balance,
      });
      monthly *= stepUp;
      yearStartMonthly = monthly;
      yearInvested = 0;
    }
  }

  // Partial trailing year (e.g. 10.5 years)
  if (months % 12 !== 0) {
    rows.push({
      year: Math.ceil(months / 12),
      monthlyInvestment: yearStartMonthly,
      invested: yearInvested,
      totalInvested,
      wealthGained: balance - totalInvested,
      balance,
    });
  }

  return {
    totalInvested: safe(totalInvested),
    estimatedReturns: safe(balance - totalInvested),
    futureValue: safe(balance),
    finalMonthly: safe(rows.length ? rows[rows.length - 1].monthlyInvestment : monthly),
    absoluteReturnPct: totalInvested > 0 ? ((balance - totalInvested) / totalInvested) * 100 : 0,
    rows,
  };
}

/* ==================================================================
 * Lumpsum / mutual fund
 * ================================================================== */

export interface LumpsumInput {
  amount: number;
  expectedReturnPct: number;
  years: number;
}

export interface LumpsumResult {
  invested: number;
  futureValue: number;
  estimatedReturns: number;
  absoluteReturnPct: number;
  cagrPct: number;
  rows: { year: number; opening: number; growth: number; balance: number }[];
}

export function calculateLumpsum(input: LumpsumInput): LumpsumResult {
  const amount = Math.max(0, input.amount);
  const years = Math.max(0, input.years);
  const fv = compoundFutureValue(amount, input.expectedReturnPct, years, 1);

  const rows: LumpsumResult['rows'] = [];
  let balance = amount;
  for (let y = 1; y <= Math.ceil(years); y++) {
    const span = Math.min(1, years - (y - 1));
    const opening = balance;
    balance = opening * Math.pow(1 + pct(input.expectedReturnPct), span);
    rows.push({ year: y, opening, growth: balance - opening, balance });
  }

  return {
    invested: amount,
    futureValue: safe(fv),
    estimatedReturns: safe(fv - amount),
    absoluteReturnPct: amount > 0 ? ((fv - amount) / amount) * 100 : 0,
    cagrPct: cagr(amount, fv, years),
    rows,
  };
}

/* ==================================================================
 * PPF — 15-year account, extendable in 5-year blocks
 * ================================================================== */

export type PpfFrequency = 'monthly' | 'yearly';

export interface PpfInput {
  depositAmount: number; // per instalment
  frequency: PpfFrequency;
  interestRatePct: number;
  years: number;
}

export interface PpfYearRow {
  year: number;
  opening: number;
  deposited: number;
  interest: number;
  closing: number;
}

export interface PpfResult {
  totalDeposited: number;
  totalInterest: number;
  maturity: number;
  annualDeposit: number;
  rows: PpfYearRow[];
}

/**
 * PPF interest is calculated on the lowest balance between the 5th and the
 * last day of each month, and credited on 31 March. Monthly deposits are
 * assumed to be made on or before the 5th so they earn interest that month.
 */
export function calculatePPF(input: PpfInput): PpfResult {
  const years = Math.max(1, Math.round(input.years));
  const monthlyRate = input.interestRatePct / 100 / 12;
  const perInstalment = Math.max(0, input.depositAmount);
  const annualDeposit = input.frequency === 'monthly' ? perInstalment * 12 : perInstalment;

  let balance = 0;
  let totalDeposited = 0;
  let totalInterest = 0;
  const rows: PpfYearRow[] = [];

  for (let y = 1; y <= years; y++) {
    const opening = balance;
    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      if (input.frequency === 'monthly') balance += perInstalment;
      else if (m === 0) balance += perInstalment;
      yearInterest += balance * monthlyRate;
    }
    balance += yearInterest;
    totalDeposited += annualDeposit;
    totalInterest += yearInterest;
    rows.push({ year: y, opening, deposited: annualDeposit, interest: yearInterest, closing: balance });
  }

  return {
    totalDeposited: safe(totalDeposited),
    totalInterest: safe(totalInterest),
    maturity: safe(balance),
    annualDeposit,
    rows,
  };
}

/* ==================================================================
 * Fixed deposit
 * ================================================================== */

export type FdCompounding = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'simple';

export interface FdInput {
  principal: number;
  annualRatePct: number;
  years: number;
  compounding: FdCompounding;
  taxSlabPct: number;
}

export interface FdResult {
  principal: number;
  maturity: number;
  interest: number;
  effectiveYieldPct: number;
  taxOnInterest: number;
  postTaxMaturity: number;
  postTaxYieldPct: number;
  rows: { year: number; opening: number; interest: number; closing: number }[];
}

const COMPOUNDS: Record<Exclude<FdCompounding, 'simple'>, number> = {
  monthly: 12,
  quarterly: 4,
  'half-yearly': 2,
  yearly: 1,
};

export function calculateFD(input: FdInput): FdResult {
  const principal = Math.max(0, input.principal);
  const years = Math.max(0, input.years);

  const maturity =
    input.compounding === 'simple'
      ? simpleFutureValue(principal, input.annualRatePct, years)
      : compoundFutureValue(principal, input.annualRatePct, years, COMPOUNDS[input.compounding]);

  const interest = maturity - principal;
  const tax = (interest * Math.max(0, input.taxSlabPct)) / 100;

  const rows: FdResult['rows'] = [];
  let balance = principal;
  for (let y = 1; y <= Math.ceil(years); y++) {
    const span = Math.min(1, years - (y - 1));
    const opening = balance;
    balance =
      input.compounding === 'simple'
        ? opening + principal * pct(input.annualRatePct) * span
        : opening *
          Math.pow(
            1 + pct(input.annualRatePct) / COMPOUNDS[input.compounding],
            COMPOUNDS[input.compounding] * span,
          );
    rows.push({ year: y, opening, interest: balance - opening, closing: balance });
  }

  return {
    principal,
    maturity: safe(maturity),
    interest: safe(interest),
    effectiveYieldPct: principal > 0 && years > 0 ? cagr(principal, maturity, years) : 0,
    taxOnInterest: safe(tax),
    postTaxMaturity: safe(maturity - tax),
    postTaxYieldPct: principal > 0 && years > 0 ? cagr(principal, maturity - tax, years) : 0,
    rows,
  };
}

/* ==================================================================
 * Inflation
 * ================================================================== */

export interface InflationInput {
  amount: number;
  inflationRatePct: number;
  years: number;
  investmentReturnPct: number;
}

export interface InflationResult {
  futureCost: number;
  purchasingPower: number;
  valueLost: number;
  valueLostPct: number;
  realReturnPct: number;
  investmentValue: number;
  investmentValueInTodaysMoney: number;
  rows: { year: number; cost: number; purchasingPower: number }[];
}

export function calculateInflation(input: InflationInput): InflationResult {
  const amount = Math.max(0, input.amount);
  const years = Math.max(0, input.years);
  const factor = Math.pow(1 + pct(input.inflationRatePct), years);

  const futureCost = amount * factor;
  const purchasingPower = amount / factor;
  const investmentValue = compoundFutureValue(amount, input.investmentReturnPct, years, 1);

  const rows: InflationResult['rows'] = [];
  for (let y = 1; y <= Math.ceil(years); y++) {
    const f = Math.pow(1 + pct(input.inflationRatePct), Math.min(y, years));
    rows.push({ year: y, cost: amount * f, purchasingPower: amount / f });
  }

  return {
    futureCost: safe(futureCost),
    purchasingPower: safe(purchasingPower),
    valueLost: safe(amount - purchasingPower),
    valueLostPct: amount > 0 ? ((amount - purchasingPower) / amount) * 100 : 0,
    realReturnPct: realRate(input.investmentReturnPct, input.inflationRatePct),
    investmentValue: safe(investmentValue),
    investmentValueInTodaysMoney: safe(investmentValue / factor),
    rows,
  };
}

/* ==================================================================
 * Retirement planning
 * ================================================================== */

export interface RetirementInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  monthlyExpense: number;
  inflationPct: number;
  currentSavings: number;
  monthlyInvestment: number;
  preReturnPct: number;
  postReturnPct: number;
}

export interface RetirementResult {
  yearsToRetire: number;
  retirementYears: number;
  monthlyExpenseAtRetirement: number;
  annualExpenseAtRetirement: number;
  corpusRequired: number;
  projectedCorpus: number;
  fromCurrentSavings: number;
  fromMonthlyInvestment: number;
  surplusOrGap: number;
  onTrack: boolean;
  additionalMonthlyNeeded: number;
  realReturnPct: number;
  rows: { age: number; corpus: number; required: number }[];
}

export function calculateRetirement(input: RetirementInput): RetirementResult {
  const yearsToRetire = Math.max(0, Math.round(input.retirementAge - input.currentAge));
  const retirementYears = Math.max(1, Math.round(input.lifeExpectancy - input.retirementAge));

  const inflationFactor = Math.pow(1 + pct(input.inflationPct), yearsToRetire);
  const monthlyExpenseAtRetirement = Math.max(0, input.monthlyExpense) * inflationFactor;
  const annualExpenseAtRetirement = monthlyExpenseAtRetirement * 12;

  // Drawdown is discounted at the INFLATION-ADJUSTED post-retirement return,
  // so withdrawals keep pace with prices through retirement.
  const realPost = pct(realRate(input.postReturnPct, input.inflationPct));
  const corpusRequired = annuityPresentValue(annualExpenseAtRetirement, realPost, retirementYears, true);

  const monthlyRate = pct(input.preReturnPct) / 12;
  const months = yearsToRetire * 12;
  const fromCurrentSavings = compoundFutureValue(
    Math.max(0, input.currentSavings),
    input.preReturnPct,
    yearsToRetire,
    1,
  );

  let sipValue = 0;
  for (let m = 0; m < months; m++) sipValue = (sipValue + Math.max(0, input.monthlyInvestment)) * (1 + monthlyRate);

  const projectedCorpus = fromCurrentSavings + sipValue;
  const gap = projectedCorpus - corpusRequired;
  const additionalMonthlyNeeded =
    gap >= 0 ? 0 : paymentForFutureValue(-gap, monthlyRate, months, true);

  const rows: RetirementResult['rows'] = [];
  let corpus = Math.max(0, input.currentSavings);
  for (let y = 1; y <= yearsToRetire; y++) {
    let yearBalance = corpus * (1 + pct(input.preReturnPct));
    for (let m = 0; m < 12; m++) {
      yearBalance += Math.max(0, input.monthlyInvestment) * Math.pow(1 + monthlyRate, 12 - m);
    }
    corpus = yearBalance;
    rows.push({ age: input.currentAge + y, corpus, required: corpusRequired });
  }

  return {
    yearsToRetire,
    retirementYears,
    monthlyExpenseAtRetirement: safe(monthlyExpenseAtRetirement),
    annualExpenseAtRetirement: safe(annualExpenseAtRetirement),
    corpusRequired: safe(corpusRequired),
    projectedCorpus: safe(projectedCorpus),
    fromCurrentSavings: safe(fromCurrentSavings),
    fromMonthlyInvestment: safe(sipValue),
    surplusOrGap: safe(gap),
    onTrack: gap >= 0,
    additionalMonthlyNeeded: safe(additionalMonthlyNeeded),
    realReturnPct: realRate(input.postReturnPct, input.inflationPct),
    rows,
  };
}
