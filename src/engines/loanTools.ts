import { safe } from './core';
import { emiAmount } from './emi';

/* ==================================================================
 * Loan prepayment
 *
 * A prepayment goes straight against principal, so every rupee stops
 * accruing interest for the whole remaining tenure. The borrower then
 * picks what to do with the headroom:
 *
 *   reduce-tenure → keep paying the same EMI, finish sooner (saves most)
 *   reduce-emi    → keep the same end date, pay less each month
 *
 * Both branches are simulated month by month against the same baseline
 * so the interest saved is a like-for-like comparison, not an estimate.
 * ================================================================== */

export type PrepayMode = 'reduce-tenure' | 'reduce-emi';

export interface PrepaymentInput {
  outstandingPrincipal: number;
  annualRatePct: number;
  remainingMonths: number;
  /** One-off amount handed over today, fee included. */
  lumpSum: number;
  /**
   * Lender's prepayment charge, as a percentage of the lump sum. It is
   * taken out of what you hand over rather than added on top, so only
   * (lumpSum − fee) ever reaches the principal.
   */
  prepaymentFeePct: number;
  /** Additional amount added to every future instalment. */
  extraMonthly: number;
  mode: PrepayMode;
}

interface RunResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
}

/** Amortises a balance to zero and reports what it cost. */
function runLoan(balance: number, monthlyRate: number, payment: number, capMonths = 1200): RunResult {
  let months = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  while (balance > 0.01 && months < capMonths) {
    const interest = balance * monthlyRate;
    // A payment that does not cover the interest never closes the loan.
    if (payment <= interest) return { months: capMonths, totalInterest: Infinity, totalPaid: Infinity };
    const principalPaid = Math.min(balance, payment - interest);
    balance -= principalPaid;
    totalInterest += interest;
    totalPaid += principalPaid + interest;
    months++;
  }
  return { months, totalInterest, totalPaid };
}

export interface PrepaymentResult {
  originalEmi: number;
  originalMonths: number;
  originalInterest: number;
  originalTotal: number;

  newEmi: number;
  newMonths: number;
  newInterest: number;
  newTotal: number;

  /** What the lender keeps as a charge. */
  feeAmount: number;
  /** The part of the lump sum that actually reduces the balance. */
  principalReduction: number;
  prepaidAmount: number;
  interestSaved: number;
  monthsSaved: number;
  emiReduction: number;
  /** Interest saved for each rupee prepaid. */
  returnOnPrepayment: number;
  feasible: boolean;
  rows: { label: string; before: number; after: number }[];
}

export function calculatePrepayment(input: PrepaymentInput): PrepaymentResult {
  const principal = Math.max(0, input.outstandingPrincipal);
  const months = Math.max(1, Math.round(input.remainingMonths));
  const r = input.annualRatePct / 100 / 12;
  const lumpSum = Math.max(0, input.lumpSum);
  const extra = Math.max(0, input.extraMonthly);

  // The charge comes out of the lump sum, so the balance only falls by
  // what is left after it. Capped at the principal — you cannot reduce a
  // balance below zero however much you hand over.
  const feePct = Math.min(100, Math.max(0, input.prepaymentFeePct));
  const feeAmount = (lumpSum * feePct) / 100;
  const principalReduction = Math.min(principal, Math.max(0, lumpSum - feeAmount));

  const originalEmi = emiAmount(principal, input.annualRatePct, months);
  const baseline = runLoan(principal, r, originalEmi);

  const balanceAfterLumpSum = principal - principalReduction;

  let newEmi: number;
  let after: RunResult;

  if (input.mode === 'reduce-emi') {
    // Same end date, smaller instalment.
    newEmi = emiAmount(balanceAfterLumpSum, input.annualRatePct, months) + extra;
    after = runLoan(balanceAfterLumpSum, r, newEmi);
  } else {
    // Same instalment, earlier end date.
    newEmi = originalEmi + extra;
    after = runLoan(balanceAfterLumpSum, r, newEmi);
  }

  const feasible = Number.isFinite(after.totalInterest);
  const newInterest = feasible ? after.totalInterest : 0;
  const newMonths = feasible ? after.months : 0;
  const interestSaved = feasible ? baseline.totalInterest - newInterest : 0;
  const prepaidAmount = lumpSum + extra * newMonths;

  return {
    originalEmi: safe(originalEmi),
    originalMonths: baseline.months,
    originalInterest: safe(baseline.totalInterest),
    originalTotal: safe(principal + baseline.totalInterest),

    newEmi: safe(newEmi),
    newMonths,
    newInterest: safe(newInterest),
    newTotal: safe(lumpSum + balanceAfterLumpSum + newInterest),

    feeAmount: safe(feeAmount),
    principalReduction: safe(principalReduction),
    prepaidAmount: safe(prepaidAmount),
    interestSaved: safe(interestSaved),
    monthsSaved: Math.max(0, baseline.months - newMonths),
    emiReduction: safe(Math.max(0, originalEmi - newEmi)),
    returnOnPrepayment: prepaidAmount > 0 ? safe((interestSaved / prepaidAmount) * 100) : 0,
    feasible,
    rows: [
      { label: 'Monthly EMI', before: originalEmi, after: newEmi },
      { label: 'Months remaining', before: baseline.months, after: newMonths },
      { label: 'Total interest', before: baseline.totalInterest, after: newInterest },
    ],
  };
}

/* ==================================================================
 * Loan eligibility
 *
 * Lenders cap total instalments at a share of net income — the FOIR
 * (fixed obligation to income ratio), typically 40–55%. The loan you
 * qualify for is the present value of that spare EMI capacity. For a
 * secured loan the property's LTV caps it a second time, and the
 * lower of the two is what is actually sanctioned.
 * ================================================================== */

export interface EligibilityInput {
  monthlyIncome: number;
  otherMonthlyIncome: number;
  existingEmi: number;
  annualRatePct: number;
  tenureYears: number;
  foirPct: number;
  /** 0 disables the LTV cap (personal loans and the like). */
  propertyValue: number;
  ltvPct: number;
}

export interface EligibilityResult {
  totalIncome: number;
  maxEmiAllowed: number;
  availableEmi: number;
  eligibleByIncome: number;
  eligibleByLtv: number;
  eligibleAmount: number;
  cappedBy: 'income' | 'property' | 'none';
  emiForEligible: number;
  totalInterest: number;
  totalPayable: number;
  downPayment: number;
  qualifies: boolean;
}

/** Present value of an ordinary annuity — the classic loan-amount formula. */
function loanForEmi(emi: number, monthlyRate: number, months: number): number {
  if (emi <= 0 || months <= 0) return 0;
  if (monthlyRate === 0) return emi * months;
  return (emi * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate;
}

export function calculateEligibility(input: EligibilityInput): EligibilityResult {
  const totalIncome = Math.max(0, input.monthlyIncome) + Math.max(0, input.otherMonthlyIncome);
  const foir = Math.min(100, Math.max(0, input.foirPct)) / 100;
  const months = Math.max(1, Math.round(input.tenureYears * 12));
  const r = input.annualRatePct / 100 / 12;

  const maxEmiAllowed = totalIncome * foir;
  const availableEmi = Math.max(0, maxEmiAllowed - Math.max(0, input.existingEmi));
  const eligibleByIncome = loanForEmi(availableEmi, r, months);

  const propertyValue = Math.max(0, input.propertyValue);
  const eligibleByLtv =
    propertyValue > 0 ? (propertyValue * Math.min(100, Math.max(0, input.ltvPct))) / 100 : Infinity;

  const eligibleAmount = Math.min(eligibleByIncome, eligibleByLtv);
  const emiForEligible = emiAmount(eligibleAmount, input.annualRatePct, months);
  const totalPayable = emiForEligible * months;

  return {
    totalIncome: safe(totalIncome),
    maxEmiAllowed: safe(maxEmiAllowed),
    availableEmi: safe(availableEmi),
    eligibleByIncome: safe(eligibleByIncome),
    eligibleByLtv: Number.isFinite(eligibleByLtv) ? safe(eligibleByLtv) : 0,
    eligibleAmount: safe(eligibleAmount),
    cappedBy:
      eligibleAmount <= 0 ? 'none' : eligibleByLtv < eligibleByIncome ? 'property' : 'income',
    emiForEligible: safe(emiForEligible),
    totalInterest: safe(totalPayable - eligibleAmount),
    totalPayable: safe(totalPayable),
    downPayment: propertyValue > 0 ? safe(Math.max(0, propertyValue - eligibleAmount)) : 0,
    qualifies: eligibleAmount > 0,
  };
}

/* ==================================================================
 * Flat rate vs reducing balance
 *
 * A flat rate charges interest on the ORIGINAL principal for the whole
 * tenure, even though you repay part of it every month. The same EMI on a
 * reducing-balance loan implies a much higher rate — usually 1.6 to 1.85
 * times the flat figure. That implied rate is the true cost, and the only
 * number that can be compared with a bank's reducing-balance quote.
 *
 *   Flat interest  = P × flat rate × years
 *   Flat EMI       = (P + flat interest) ÷ months
 *   Effective rate = the r that makes emiAmount(P, r, months) = flat EMI
 * ================================================================== */

export interface FlatRateInput {
  principal: number;
  flatRatePct: number;
  years: number;
}

export interface FlatRateResult {
  principal: number;
  months: number;
  flatEmi: number;
  flatInterest: number;
  flatTotal: number;
  /** Reducing-balance rate that produces the same EMI. */
  effectiveRatePct: number;
  /** A genuine reducing-balance loan at the flat rate's headline figure. */
  reducingEmi: number;
  reducingInterest: number;
  extraCost: number;
  ratio: number;
  yearly: { year: number; principalPaid: number; interestPaid: number; balance: number }[];
}

/** Annual reducing-balance rate (%) whose EMI equals `emi`. */
export function impliedReducingRate(principal: number, emi: number, months: number): number {
  if (principal <= 0 || months <= 0 || emi * months <= principal) return 0;
  let lo = 0;
  let hi = 200;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (emiAmount(principal, mid, months) > emi) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function calculateFlatRate(input: FlatRateInput): FlatRateResult {
  const principal = Math.max(0, input.principal);
  const months = Math.max(1, Math.round(input.years * 12));
  const flatInterest = principal * (Math.max(0, input.flatRatePct) / 100) * (months / 12);
  const flatTotal = principal + flatInterest;
  const flatEmi = flatTotal / months;
  const effectiveRatePct = impliedReducingRate(principal, flatEmi, months);

  const reducingEmi = emiAmount(principal, input.flatRatePct, months);
  const reducingInterest = reducingEmi * months - principal;

  // The real split inside each flat-rate EMI: amortise at the effective rate.
  const r = effectiveRatePct / 100 / 12;
  const yearly: FlatRateResult['yearly'] = [];
  let balance = principal;
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const principalPaid = m === months ? balance : flatEmi - interest;
    balance = Math.max(0, balance - principalPaid);
    const y = Math.ceil(m / 12);
    const row = yearly[y - 1] ?? { year: y, principalPaid: 0, interestPaid: 0, balance: 0 };
    row.principalPaid += principalPaid;
    row.interestPaid += interest;
    row.balance = balance;
    yearly[y - 1] = row;
  }

  return {
    principal,
    months,
    flatEmi: safe(flatEmi),
    flatInterest: safe(flatInterest),
    flatTotal: safe(flatTotal),
    effectiveRatePct: safe(effectiveRatePct),
    reducingEmi: safe(reducingEmi),
    reducingInterest: safe(reducingInterest),
    extraCost: safe(flatInterest - reducingInterest),
    ratio: input.flatRatePct > 0 ? effectiveRatePct / input.flatRatePct : 0,
    yearly,
  };
}
