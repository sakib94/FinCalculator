import { safe } from './core';
import { calculateEMI, type EmiResult } from './emi';
import { impliedReducingRate } from './loanTools';

/**
 * What makes each kind of retail loan different from a plain EMI:
 *
 *   - home, car and bike loans are usually worked out from a price and a
 *     down payment rather than a loan amount;
 *   - most loans carry a processing fee plus 18% GST on it, which raises
 *     the true annual cost above the quoted rate;
 *   - home loans earn tax deductions on interest and principal;
 *   - education loans start with a moratorium while the student studies,
 *     during which simple interest accrues on what has been disbursed.
 *
 * The EMI itself always comes from the standard reducing-balance engine.
 */

/** GST charged on a lender's processing fee. */
export const FEE_GST_PCT = 18;

export interface LoanCharges {
  /** Processing fee before GST. */
  fee: number;
  gstOnFee: number;
  /** What actually reaches the borrower: loan minus fee and GST. */
  netDisbursal: number;
  /**
   * Annual reducing-balance rate at which the EMIs repay the net disbursal
   * — the loan's true cost once the fee is counted (an APR).
   */
  aprPct: number;
}

export function loanCharges(principal: number, emi: number, months: number, feePct: number): LoanCharges {
  const fee = Math.max(0, principal * (Math.max(0, feePct) / 100));
  const gstOnFee = fee * (FEE_GST_PCT / 100);
  const netDisbursal = Math.max(0, principal - fee - gstOnFee);
  return {
    fee: safe(fee),
    gstOnFee: safe(gstOnFee),
    netDisbursal: safe(netDisbursal),
    aprPct: safe(impliedReducingRate(netDisbursal, emi, months)),
  };
}

/** Loan amount after a percentage down payment on a price. */
export function financedAmount(price: number, downPaymentPct: number): { loan: number; downPayment: number } {
  const p = Math.max(0, price);
  const down = p * (Math.min(100, Math.max(0, downPaymentPct)) / 100);
  return { loan: p - down, downPayment: down };
}

export interface LoanEmiInput {
  principal: number;
  annualRatePct: number;
  tenure: number;
  tenureUnit: 'months' | 'years';
  feePct: number;
  /** Set when the loan was derived from a price and down payment. */
  price?: number;
  downPayment?: number;
}

export interface LoanEmiResult extends EmiResult, LoanCharges {
  price?: number;
  downPayment?: number;
  /** Loan-to-value, % of the price financed. Only when a price is known. */
  ltvPct?: number;
}

export function calculateLoanEmi(input: LoanEmiInput): LoanEmiResult {
  const base = calculateEMI(input);
  const charges = loanCharges(base.principal, base.emi, base.months, input.feePct);
  const ltvPct = input.price && input.price > 0 ? (base.principal / input.price) * 100 : undefined;
  return { ...base, ...charges, price: input.price, downPayment: input.downPayment, ltvPct };
}

/* ================================================================== *
 * Home loans: RBI loan-to-value caps and income tax deductions.
 * ================================================================== */

/**
 * The most a bank may lend against a home, as a % of its value
 * (RBI master circular on housing finance).
 */
export function homeLoanLtvCap(loanAmount: number): number {
  if (loanAmount <= 3000000) return 90;
  if (loanAmount <= 7500000) return 80;
  return 75;
}

/** Section 24(b) cap on interest for a self-occupied home (old regime). */
export const SEC_24B_LIMIT = 200000;
/** Section 80C cap — shared with EPF, PPF, ELSS, insurance and the rest. */
export const SEC_80C_LIMIT = 150000;
export const CESS_PCT = 4;

export interface HomeTaxBenefit {
  interest: number;
  principal: number;
  interestDeduction: number;
  principalDeduction: number;
  /** Tax saved at the chosen slab rate, including 4% cess. */
  taxSaved: number;
}

/** Old-regime deductions on a self-occupied home for one year of repayments. */
export function homeLoanTaxBenefit(
  year: { interestPaid: number; principalPaid: number } | undefined,
  slabPct: number,
): HomeTaxBenefit {
  const interest = year?.interestPaid ?? 0;
  const principal = year?.principalPaid ?? 0;
  const interestDeduction = Math.min(interest, SEC_24B_LIMIT);
  const principalDeduction = Math.min(principal, SEC_80C_LIMIT);
  const taxSaved =
    (interestDeduction + principalDeduction) * (Math.max(0, slabPct) / 100) * (1 + CESS_PCT / 100);
  return { interest, principal, interestDeduction, principalDeduction, taxSaved: safe(taxSaved) };
}

/* ================================================================== *
 * Education loans: moratorium, then EMIs.
 *
 * During the course and a grace period after it, the student pays no EMI.
 * Simple interest accrues on whatever has been disbursed so far. It is
 * either paid monthly as it falls due, or added to the principal
 * ("capitalised") when repayment starts — the default at most Indian banks.
 * ================================================================== */

export interface EducationLoanInput {
  principal: number;
  annualRatePct: number;
  /** Length of the course in years. */
  courseYears: number;
  /** Months after the course ends before EMIs begin. */
  graceMonths: number;
  /** All at once, or in equal yearly instalments at the start of each course year. */
  disbursement: 'upfront' | 'yearly';
  /** Pay the moratorium interest as it accrues, or add it to the loan. */
  moratoriumInterest: 'capitalise' | 'pay';
  repaymentYears: number;
  feePct: number;
}

export interface EducationLoanResult extends LoanEmiResult {
  /** The amount borrowed (EmiResult.principal is what EMIs repay). */
  sanctioned: number;
  moratoriumMonths: number;
  /** Simple interest that accrues during the moratorium. */
  moratoriumInterest: number;
  /** Interest paid monthly during the moratorium when it is not capitalised. */
  moratoriumMonthlyInterest: number;
  /** Interest charged over the whole life of the loan, moratorium included. */
  lifetimeInterest: number;
  /** Everything paid: moratorium interest (if paid) plus all EMIs. */
  lifetimePaid: number;
}

export function calculateEducationLoan(input: EducationLoanInput): EducationLoanResult {
  const sanctioned = Math.max(0, input.principal);
  const courseYears = Math.max(0, Math.round(input.courseYears));
  const moratoriumMonths = Math.max(0, courseYears * 12 + Math.round(Math.max(0, input.graceMonths)));
  const monthlyRate = Math.max(0, input.annualRatePct) / 100 / 12;

  // Tranche k is released at the start of course year k and accrues
  // interest for the rest of the moratorium.
  const tranches =
    input.disbursement === 'yearly' && courseYears > 1
      ? Array.from({ length: courseYears }, (_, k) => ({ amount: sanctioned / courseYears, month: k * 12 }))
      : [{ amount: sanctioned, month: 0 }];
  const moratoriumInterest = tranches.reduce(
    (sum, t) => sum + t.amount * monthlyRate * Math.max(0, moratoriumMonths - t.month),
    0,
  );

  const capitalise = input.moratoriumInterest === 'capitalise';
  const repayPrincipal = capitalise ? sanctioned + moratoriumInterest : sanctioned;
  const base = calculateEMI({
    principal: repayPrincipal,
    annualRatePct: input.annualRatePct,
    tenure: input.repaymentYears,
    tenureUnit: 'years',
  });

  // The fee is charged on the sanctioned amount; the APR is measured on the
  // cash the student actually receives against every rupee paid back.
  const fee = sanctioned * (Math.max(0, input.feePct) / 100);
  const gstOnFee = fee * (FEE_GST_PCT / 100);
  const netDisbursal = Math.max(0, sanctioned - fee - gstOnFee);
  const moratoriumMonthlyInterest = capitalise ? 0 : sanctioned * monthlyRate;
  const lifetimeInterest = capitalise ? base.totalPayment - sanctioned : moratoriumInterest + base.totalInterest;
  const lifetimePaid = capitalise ? base.totalPayment : moratoriumInterest + base.totalPayment;

  return {
    ...base,
    sanctioned,
    moratoriumMonths,
    moratoriumInterest: safe(moratoriumInterest),
    moratoriumMonthlyInterest: safe(moratoriumMonthlyInterest),
    lifetimeInterest: safe(lifetimeInterest),
    lifetimePaid: safe(lifetimePaid),
    fee: safe(fee),
    gstOnFee: safe(gstOnFee),
    netDisbursal: safe(netDisbursal),
    aprPct: safe(
      educationApr(tranches, fee + gstOnFee, monthlyRate, capitalise, moratoriumMonths, base.emi, base.months),
    ),
  };
}

/**
 * Internal rate of return of the student's cash flows, as an annual %:
 * tranches in, the fee out at the start, interest out during the
 * moratorium if it is paid, then the EMIs. Found by bisection on the
 * monthly rate.
 */
function educationApr(
  tranches: { amount: number; month: number }[],
  upfrontCharges: number,
  monthlyRate: number,
  capitalise: boolean,
  moratoriumMonths: number,
  emi: number,
  months: number,
): number {
  const flows = new Map<number, number>();
  const add = (m: number, v: number) => flows.set(m, (flows.get(m) ?? 0) + v);
  let disbursed = 0;
  for (const t of tranches) add(t.month, t.amount);
  add(0, -upfrontCharges);
  for (let m = 1; m <= moratoriumMonths; m++) {
    for (const t of tranches) if (t.month === m - 1) disbursed += t.amount;
    if (!capitalise) add(m, -disbursed * monthlyRate);
  }
  for (let m = 1; m <= months; m++) add(moratoriumMonths + m, -emi);

  const npv = (r: number) => {
    let total = 0;
    for (const [m, v] of flows) total += v / Math.pow(1 + r, m);
    return total;
  };
  let lo = 0;
  let hi = 0.2;
  if (npv(lo) >= 0) return 0;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) < 0) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 12 * 100;
}
