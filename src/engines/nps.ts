import { safe } from './core';

/**
 * NPS (National Pension System) projection.
 *
 * Contributions compound monthly at the expected return; the contribution
 * steps up once a year. At retirement a minimum of 40% of the corpus must
 * buy an annuity — the rest can be withdrawn tax-free as a lump sum.
 * Monthly pension = annuity corpus × annuity rate ÷ 12.
 */

export interface NpsInput {
  currentAge: number;
  retirementAge: number;
  currentCorpus: number;
  monthlyContribution: number;
  annualIncreasePct: number;
  expectedReturnPct: number;
  annuityPct: number;
  annuityReturnPct: number;
}

export interface NpsYearRow {
  year: number;
  age: number;
  monthlyContribution: number;
  yearContribution: number;
  openingBalance: number;
  interest: number;
  closingBalance: number;
}

export interface NpsResult {
  years: number;
  totalContribution: number;
  totalInvestment: number;
  estimatedReturns: number;
  corpus: number;
  lumpSum: number;
  annuityCorpus: number;
  monthlyPension: number;
  annualPension: number;
  rows: NpsYearRow[];
}

export function calculateNPS(input: NpsInput): NpsResult {
  const years = Math.max(0, Math.round(input.retirementAge - input.currentAge));
  const monthlyRate = input.expectedReturnPct / 100 / 12;
  const growth = 1 + input.annualIncreasePct / 100;

  let balance = Math.max(0, input.currentCorpus);
  let monthly = Math.max(0, input.monthlyContribution);
  let totalContribution = 0;

  const rows: NpsYearRow[] = [];

  for (let y = 1; y <= years; y++) {
    const opening = balance;
    let interest = 0;
    for (let m = 0; m < 12; m++) {
      balance += monthly; // contribution at the start of the month
      const monthInterest = balance * monthlyRate;
      interest += monthInterest;
      balance += monthInterest;
    }
    totalContribution += monthly * 12;
    rows.push({
      year: y,
      age: input.currentAge + y,
      monthlyContribution: monthly,
      yearContribution: monthly * 12,
      openingBalance: opening,
      interest,
      closingBalance: balance,
    });
    monthly *= growth;
  }

  const corpus = balance;
  const annuityShare = Math.min(100, Math.max(0, input.annuityPct)) / 100;
  const annuityCorpus = corpus * annuityShare;
  const lumpSum = corpus - annuityCorpus;
  const annualPension = (annuityCorpus * input.annuityReturnPct) / 100;

  const totalInvestment = totalContribution + Math.max(0, input.currentCorpus);

  return {
    years,
    totalContribution: safe(totalContribution),
    totalInvestment: safe(totalInvestment),
    estimatedReturns: safe(corpus - totalInvestment),
    corpus: safe(corpus),
    lumpSum: safe(lumpSum),
    annuityCorpus: safe(annuityCorpus),
    monthlyPension: safe(annualPension / 12),
    annualPension: safe(annualPension),
    rows,
  };
}
