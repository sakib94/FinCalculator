import { safe } from './core';

/**
 * Loan EMI and amortisation.
 *
 *            P × r × (1 + r)^n
 *   EMI =  ──────────────────────      r = annual rate ÷ 12 ÷ 100
 *             (1 + r)^n − 1            n = tenure in months
 *
 * The schedule carries the running balance forward month by month, and the
 * final instalment absorbs the rounding residue so the balance closes at
 * exactly zero — the way a lender's schedule does.
 */

export interface EmiInput {
  principal: number;
  annualRatePct: number;
  tenure: number;
  tenureUnit: 'months' | 'years';
}

export interface AmortRow {
  period: number;
  month: number;
  year: number;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

export interface EmiYearSummary {
  year: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
}

export interface EmiResult {
  emi: number;
  months: number;
  principal: number;
  totalInterest: number;
  totalPayment: number;
  interestShare: number;
  schedule: AmortRow[];
  yearly: EmiYearSummary[];
}

export const monthsFrom = (tenure: number, unit: 'months' | 'years'): number =>
  Math.max(1, Math.round(unit === 'years' ? tenure * 12 : tenure));

export function emiAmount(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

export function calculateEMI(input: EmiInput): EmiResult {
  const months = monthsFrom(input.tenure, input.tenureUnit);
  const principal = Math.max(0, input.principal);
  const r = input.annualRatePct / 100 / 12;
  const emi = emiAmount(principal, input.annualRatePct, months);

  const schedule: AmortRow[] = [];
  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;

  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    let principalPaid = emi - interest;
    if (i === months) principalPaid = balance; // close out any rounding residue
    balance = Math.max(0, balance - principalPaid);
    cumulativePrincipal += principalPaid;
    cumulativeInterest += interest;
    schedule.push({
      period: i,
      month: ((i - 1) % 12) + 1,
      year: Math.ceil(i / 12),
      emi: i === months ? principalPaid + interest : emi,
      principalPaid,
      interestPaid: interest,
      balance,
      cumulativePrincipal,
      cumulativeInterest,
    });
  }

  const yearly: EmiYearSummary[] = [];
  for (const row of schedule) {
    const bucket = yearly[row.year - 1] ?? { year: row.year, principalPaid: 0, interestPaid: 0, balance: 0 };
    bucket.principalPaid += row.principalPaid;
    bucket.interestPaid += row.interestPaid;
    bucket.balance = row.balance;
    yearly[row.year - 1] = bucket;
  }

  const totalInterest = cumulativeInterest;
  const totalPayment = principal + totalInterest;

  return {
    emi: safe(emi),
    months,
    principal,
    totalInterest: safe(totalInterest),
    totalPayment: safe(totalPayment),
    interestShare: totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0,
    schedule,
    yearly,
  };
}
