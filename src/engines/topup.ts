import { safe } from './core';
import { calculateEMI, emiAmount, type EmiResult } from './emi';
import { FEE_GST_PCT } from './loanTypes';

/* ------------------------------------------------------------------ *
 * Loan top-up decision engine.
 *
 * Two options from today onwards:
 *
 *   A. Keep the existing loan     — pay today's EMI for the months left.
 *   B. Take the top-up            — the outstanding principal and the new
 *                                   money become one loan, at a new rate
 *                                   and tenure.
 *
 * Everything is compared from today. Interest already paid on the
 * existing loan is a sunk cost: neither option gets it back, so it is
 * reported on its own and never counted as a saving or a loss.
 *
 *   Remaining payments (A)  = current EMI × months left
 *   Future interest (A)     = remaining payments − outstanding principal
 *   Future payments (B)     = new EMI × new tenure
 *   Future interest (B)     = future payments − new loan
 *   Additional payments     = B − A   (principal included — not all of it is cost)
 *   Additional interest     = interest B − interest A   (the cost of the decision)
 *
 * The lender's charges come out of the money paid to you, so the cash
 * you actually receive is the top-up less the processing fee, GST on it,
 * insurance and any other deductions.
 * ------------------------------------------------------------------ */

/** Original tenures offered as one-tap choices, in years; anything else is entered as a custom tenure. */
export const ORIGINAL_TENURE_YEARS = [1, 2, 3, 4, 5, 6, 7, 8, 10] as const;

/** New tenures offered as one-tap choices, in months. */
export const NEW_TENURE_MONTHS = [12, 24, 36, 48, 54, 60, 66, 72, 84, 96, 120] as const;

/** The tenures every comparison is drawn across (the chosen tenure is added if it is not one of them). */
export const COMPARE_TENURES = [48, 54, 60, 66, 72, 84] as const;

export const LIMITS = {
  /** ₹100 crore — far above any retail top-up, low enough to catch a slipped key. */
  maxAmount: 1_000_000_000,
  maxRatePct: 50,
  maxTenureMonths: 360,
  maxOriginalTenureMonths: 480,
} as const;

/**
 * Where the decision card draws its lines. Each threshold is a plain
 * judgement, not a rule from a regulator, so they live here in one place.
 */
export const THRESHOLDS = {
  /** A tenure this long or longer earns the "lower EMI ≠ lower cost" warning. */
  longTenureMonths: 84,
  veryLongTenureMonths: 120,
  /** Stretching the loan past today's end date by more than this is a long extension. */
  extensionMonths: 24,
  /** Additional interest for each ₹1 of cash received. */
  interestPerRupee: { warn: 0.5, bad: 1 },
  /** Charges as a share of the top-up. */
  chargesPct: { warn: 3, bad: 6 },
  /** Borrowing more than the stated need, as a share of the need. */
  overBorrowPct: { warn: 10, bad: 25 },
  /** An EMI this far above the comfortable EMI is a serious problem; within it, a caution. */
  emiOverComfortPct: 10,
  /** Entered and calculated EMIs further apart than this are flagged for checking. */
  emiMismatchPct: 3,
} as const;

/* ================================================================== */
/* Inputs                                                              */
/* ================================================================== */

export interface ExistingLoanInput {
  originalAmount: number;
  originalRatePct: number;
  originalTenureMonths: number;
  emisPaid: number;
  currentEmi: number;
  outstanding: number;
  /** 'auto': original tenure − EMIs paid. 'manual': the figure entered below. */
  remainingMode: 'auto' | 'manual';
  remainingMonths: number;
}

export interface TopUpTerms {
  /** The money the borrower needs. */
  required: number;
  /** 'auto': outstanding + required. 'sanctioned': the amount the bank offers. */
  loanMode: 'auto' | 'sanctioned';
  sanctionedLoan: number;
  newRatePct: number;
  tenureMonths: number;
  /** Processing fee, % — GST is added on top of it automatically. */
  feePct: number;
  /** Whether the fee is charged on the top-up alone or the whole new loan. */
  feeOn: 'topup' | 'loan';
  /** Stamp duty, legal, valuation and other charges, ₹. */
  otherCharges: number;
  /** Insurance and any other deductions from the payout, ₹. */
  insurance: number;
  /** Top-up the bank says you are eligible for; 0 when not known. */
  eligibility: number;
  /** The EMI the borrower is comfortable with; 0 when not given. */
  comfortableEmi: number;
}

/** Other top-up amounts to compare. The recommended amount is always the stated need. */
export interface AmountScenarios {
  minimum: number;
  higher: number;
  maximum: number;
}

export interface PrepaymentPlan {
  /** One part payment… */
  initial: number;
  /** …made with this EMI (1 = the first). */
  initialMonth: number;
  /** Added to every EMI. */
  monthlyExtra: number;
  /** Paid every 12th month. */
  annualLump: number;
}

export interface TopUpInput {
  existing: ExistingLoanInput;
  topup: TopUpTerms;
  scenarios: AmountScenarios;
  prepay: PrepaymentPlan;
}

/* ================================================================== */
/* Results                                                             */
/* ================================================================== */

export interface ExistingAnalysis {
  outstanding: number;
  emi: number;
  ratePct: number;
  remainingMonths: number;
  /** Original tenure − EMIs paid. */
  calculatedRemaining: number;
  remainingPayments: number;
  futureInterest: number;
  /** Interest inside the EMIs already paid, from the original schedule. Sunk. */
  historicalInterest: number;
  emisPaid: number;
  paidSoFar: number;
  principalRepaid: number;
  /** EMI on the original loan, rate and tenure. */
  scheduledEmi: number;
  /** EMI that clears today's outstanding in the months left at the rate entered. */
  impliedEmi: number;
  completion: Date;
}

export interface Charges {
  fee: number;
  gst: number;
  other: number;
  insurance: number;
  total: number;
  /** Cash that reaches the borrower. */
  net: number;
  /** Charges as a share of the top-up. */
  pctOfTopUp: number;
}

export interface TopUpOption {
  loan: number;
  /** New loan − outstanding: the new money before charges. */
  grossTopUp: number;
  charges: Charges;
  ratePct: number;
  months: number;
  emi: number;
  totalPayments: number;
  futureInterest: number;
  completion: Date;
  /** Future payments with the top-up − without. Includes principal. */
  additionalPayments: number;
  /** Future interest with the top-up − without. The cost of the decision. */
  additionalInterest: number;
  /** New EMI − current EMI. */
  emiChange: number;
  /** Months beyond today's end date (negative: finishes sooner). */
  extensionMonths: number;
  /** Additional interest for each ₹1 of cash received. */
  interestPerRupee: number;
  /**
   * Where the additional interest comes from. Interest is proportional to
   * principal at a given rate and tenure, so the new loan's interest splits
   * by share: the part on today's balance, less what that balance would
   * have cost anyway, is the cost of re-stretching it; the rest is the
   * interest on the new money.
   */
  interestSplit: { existingBalance: number; newMoney: number };
}

export type TenureTag = 'lowest-interest' | 'lowest-emi' | 'best-balance' | 'selected';

export interface TenureRow {
  months: number;
  emi: number;
  totalPayment: number;
  interest: number;
  additionalInterest: number;
  completion: Date;
  /** Null when no comfortable EMI was given. */
  affordable: boolean | null;
  tags: TenureTag[];
}

export interface Recommendation {
  months: number;
  /**
   * 'comfortable': the shortest tenure whose EMI fits the comfortable EMI.
   * 'balance':     no comfortable EMI given — the tenure closest to both the lowest EMI and the lowest interest.
   * 'none-fit':    a comfortable EMI was given but no tenure in the table fits it.
   */
  basis: 'comfortable' | 'balance' | 'none-fit';
  row: TenureRow;
  /** The longer tenure it is compared with, when there is one. */
  against: TenureRow | null;
  interestSaved: number;
  emiIncrease: number;
  monthsSooner: number;
}

/** A long tenure set against a shorter one. */
export interface TenurePair {
  long: TenureRow;
  short: TenureRow;
  emiIncrease: number;
  interestSaved: number;
  monthsSooner: number;
}

export interface ScenarioRow {
  key: 'minimum' | 'recommended' | 'higher' | 'maximum';
  amount: number;
  option: TopUpOption;
}

export interface LargerBorrowing {
  /** What borrowing more is set against: the stated need. */
  base: TopUpOption;
  larger: TopUpOption;
  /** Where the larger amount came from. */
  source: 'sanctioned' | 'maximum';
  extraTopUp: number;
  extraCash: number;
  extraEmi: number;
  extraPayments: number;
  extraInterest: number;
  extraMonthlyBurden: number;
}

export interface PrepaymentResult {
  active: boolean;
  baseMonths: number;
  baseInterest: number;
  months: number;
  interest: number;
  monthsSaved: number;
  interestSaved: number;
  /** Everything paid on top of the EMIs. */
  prepaid: number;
  completion: Date;
  /** Balance at the end of each year, with and without the prepayments. */
  yearly: { year: number; without: number; with: number }[];
}

export interface MatrixRow {
  band: 'long' | 'medium' | 'short';
  row: TenureRow;
  flexibility: 'High' | 'Medium' | 'Low';
}

export type CheckId =
  | 'cash-need'
  | 'cash-short'
  | 'over-borrow'
  | 'eligibility'
  | 'emi-comfort'
  | 'emi-unknown'
  | 'tenure'
  | 'interest'
  | 'charges';

export interface Check {
  id: CheckId;
  tone: 'good' | 'warn' | 'bad';
}

export interface Verdict {
  level: 'green' | 'amber' | 'red';
  checks: Check[];
}

export interface Mismatch {
  field: 'remaining' | 'emi';
  entered: number;
  calculated: number;
}

export interface TopUpResult {
  existing: ExistingAnalysis;
  option: TopUpOption;
  tenures: TenureRow[];
  recommendation: Recommendation;
  /** Set when the chosen tenure is long enough for the warning. */
  longTenure: TenurePair | null;
  /** "Lower EMI ≠ cheaper loan": the longest tenure against a shorter one. */
  lesson: TenurePair | null;
  scenarios: ScenarioRow[];
  larger: LargerBorrowing | null;
  prepayment: PrepaymentResult;
  matrix: MatrixRow[];
  verdict: Verdict;
  /** Top-up needed to receive the full requirement after charges; null when charges leave it intact. */
  topUpForFullCash: number | null;
  mismatches: Mismatch[];
  schedule: EmiResult;
}

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

/** A usable non-negative number: NaN, Infinity and negatives read as 0. */
const n = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 0);
const months = (v: number): number => Math.round(n(v));
const rate = (v: number): number => Math.min(LIMITS.maxRatePct, n(v));

/** The first day of the month `count` months after `start` — when the last of `count` EMIs falls. */
export function addMonths(start: Date, count: number): Date {
  return new Date(start.getFullYear(), start.getMonth() + Math.max(0, Math.round(count)), 1);
}

/** Months left on the existing loan: entered, or original tenure − EMIs paid. */
export function remainingMonthsOf(e: ExistingLoanInput): number {
  const calculated = Math.max(0, months(e.originalTenureMonths) - months(e.emisPaid));
  return e.remainingMode === 'manual' ? months(e.remainingMonths) : calculated;
}

/** The new loan: outstanding + need, or what the bank sanctions. */
export function newLoanOf(e: ExistingLoanInput, t: TopUpTerms): number {
  return t.loanMode === 'sanctioned' ? n(t.sanctionedLoan) : n(e.outstanding) + n(t.required);
}

/* ================================================================== */
/* Option A — keep the existing loan                                   */
/* ================================================================== */

export function analyseExisting(e: ExistingLoanInput, today: Date): ExistingAnalysis {
  const outstanding = n(e.outstanding);
  const emi = n(e.currentEmi);
  const ratePct = rate(e.originalRatePct);
  const original = n(e.originalAmount);
  const tenure = months(e.originalTenureMonths);
  const emisPaid = Math.min(months(e.emisPaid), tenure);
  const remainingMonths = remainingMonthsOf(e);
  const calculatedRemaining = Math.max(0, tenure - months(e.emisPaid));

  const remainingPayments = emi * remainingMonths;
  // An EMI too small to clear the balance is a validation error; the
  // figure is held at zero so nothing downstream goes negative.
  const futureInterest = Math.max(0, remainingPayments - outstanding);

  const scheduledEmi = emiAmount(original, ratePct, tenure);
  let historicalInterest = 0;
  if (emisPaid > 0 && tenure > 0 && original > 0) {
    const schedule = calculateEMI({ principal: original, annualRatePct: ratePct, tenure, tenureUnit: 'months' }).schedule;
    historicalInterest = schedule[emisPaid - 1]?.cumulativeInterest ?? 0;
  }

  return {
    outstanding,
    emi,
    ratePct,
    remainingMonths,
    calculatedRemaining,
    remainingPayments: safe(remainingPayments),
    futureInterest: safe(futureInterest),
    historicalInterest: safe(historicalInterest),
    emisPaid,
    paidSoFar: safe(emi * emisPaid),
    principalRepaid: Math.max(0, original - outstanding),
    scheduledEmi: safe(scheduledEmi),
    impliedEmi: safe(emiAmount(outstanding, ratePct, remainingMonths)),
    completion: addMonths(today, remainingMonths),
  };
}

/* ================================================================== */
/* Option B — take the top-up                                          */
/* ================================================================== */

/** What the lender keeps, and what reaches the borrower. */
export function calculateCharges(
  grossTopUp: number,
  loan: number,
  t: Pick<TopUpTerms, 'feePct' | 'feeOn' | 'otherCharges' | 'insurance'>,
): Charges {
  const top = n(grossTopUp);
  const base = t.feeOn === 'loan' ? n(loan) : top;
  const fee = (base * Math.min(100, n(t.feePct))) / 100;
  const gst = (fee * FEE_GST_PCT) / 100;
  const other = n(t.otherCharges);
  const insurance = n(t.insurance);
  const total = fee + gst + other + insurance;
  return {
    fee: safe(fee),
    gst: safe(gst),
    other,
    insurance,
    total: safe(total),
    net: Math.max(0, safe(top - total)),
    pctOfTopUp: top > 0 ? safe((total / top) * 100) : 0,
  };
}

/** A top-up of `loan` at the given rate and tenure, against keeping the existing loan. */
export function topUpOption(
  existing: ExistingAnalysis,
  t: TopUpTerms,
  loan: number,
  tenureMonths: number,
  today: Date,
): TopUpOption {
  const amount = n(loan);
  const term = Math.max(1, months(tenureMonths));
  const ratePct = rate(t.newRatePct);
  const grossTopUp = Math.max(0, amount - existing.outstanding);
  const charges = calculateCharges(grossTopUp, amount, t);
  const emi = emiAmount(amount, ratePct, term);
  const totalPayments = emi * term;
  const futureInterest = Math.max(0, totalPayments - amount);
  const additionalInterest = futureInterest - existing.futureInterest;
  const share = amount > 0 ? Math.min(1, existing.outstanding / amount) : 0;
  return {
    loan: amount,
    grossTopUp,
    charges,
    ratePct,
    months: term,
    emi: safe(emi),
    totalPayments: safe(totalPayments),
    futureInterest: safe(futureInterest),
    completion: addMonths(today, term),
    additionalPayments: safe(totalPayments - existing.remainingPayments),
    additionalInterest: safe(additionalInterest),
    emiChange: safe(emi - existing.emi),
    extensionMonths: term - existing.remainingMonths,
    interestPerRupee: charges.net > 0 ? safe(additionalInterest / charges.net) : 0,
    interestSplit: {
      existingBalance: safe(futureInterest * share - existing.futureInterest),
      newMoney: safe(futureInterest * (1 - share)),
    },
  };
}

/**
 * The top-up that leaves exactly `need` in hand once the charges are taken
 * out. With the fee on the top-up alone:
 *   need = top-up × (1 − f) − fixed  →  top-up = (need + fixed) ÷ (1 − f)
 * and on the whole loan the fee on the outstanding part is added to the need.
 */
export function topUpForCash(need: number, outstanding: number, t: Pick<TopUpTerms, 'feePct' | 'feeOn' | 'otherCharges' | 'insurance'>): number | null {
  const f = (Math.min(100, n(t.feePct)) / 100) * (1 + FEE_GST_PCT / 100);
  if (f >= 1) return null;
  const fixed = n(t.otherCharges) + n(t.insurance);
  const onOutstanding = t.feeOn === 'loan' ? f * n(outstanding) : 0;
  return safe((n(need) + fixed + onOutstanding) / (1 - f));
}

/* ================================================================== */
/* Tenures                                                             */
/* ================================================================== */

export function tenureRows(existing: ExistingAnalysis, t: TopUpTerms, loan: number, selected: number, today: Date): TenureRow[] {
  const set = new Set<number>(COMPARE_TENURES);
  if (selected > 0) set.add(Math.round(selected));
  const comfortable = n(t.comfortableEmi);
  const rows: TenureRow[] = [...set]
    .sort((a, b) => a - b)
    .map((m) => {
      const o = topUpOption(existing, t, loan, m, today);
      return {
        months: o.months,
        emi: o.emi,
        totalPayment: o.totalPayments,
        interest: o.futureInterest,
        additionalInterest: o.additionalInterest,
        completion: o.completion,
        affordable: comfortable > 0 ? o.emi <= comfortable + 0.5 : null,
        tags: [],
      };
    });
  if (!rows.length) return rows;
  rows[0].tags.push('lowest-interest');
  rows[rows.length - 1].tags.push('lowest-emi');
  for (const r of rows) if (r.months === Math.round(selected)) r.tags.push('selected');
  return rows;
}

/**
 * The tenure that sits closest to both ends at once: EMI and interest are
 * each scaled 0–1 across the table and the smallest sum wins, the shorter
 * tenure on a tie.
 */
function balancedRow(rows: TenureRow[]): TenureRow {
  const emis = rows.map((r) => r.emi);
  const ints = rows.map((r) => r.interest);
  const span = (v: number[]) => Math.max(...v) - Math.min(...v) || 1;
  const eMin = Math.min(...emis);
  const iMin = Math.min(...ints);
  let best = rows[0];
  let bestScore = Infinity;
  for (const r of rows) {
    const score = (r.emi - eMin) / span(emis) + (r.interest - iMin) / span(ints);
    if (score < bestScore - 1e-9) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}

function pair(long: TenureRow, short: TenureRow): TenurePair {
  return {
    long,
    short,
    emiIncrease: safe(short.emi - long.emi),
    interestSaved: safe(long.interest - short.interest),
    monthsSooner: long.months - short.months,
  };
}

export function recommendTenure(rows: TenureRow[], comfortableEmi: number, selected: number): Recommendation {
  const affordable = rows.filter((r) => r.affordable);
  let basis: Recommendation['basis'];
  let row: TenureRow;
  if (n(comfortableEmi) > 0 && affordable.length) {
    basis = 'comfortable';
    row = affordable[0];
  } else {
    basis = n(comfortableEmi) > 0 ? 'none-fit' : 'balance';
    row = balancedRow(rows);
  }
  row.tags.push('best-balance');
  // Set it against the tenure the borrower picked when that is longer,
  // otherwise against the longest in the table.
  const chosen = rows.find((r) => r.months === Math.round(selected));
  const longest = rows[rows.length - 1];
  const against = chosen && chosen.months > row.months ? chosen : longest.months > row.months ? longest : null;
  const p = against ? pair(against, row) : null;
  return {
    months: row.months,
    basis,
    row,
    against,
    interestSaved: p?.interestSaved ?? 0,
    emiIncrease: p?.emiIncrease ?? 0,
    monthsSooner: p?.monthsSooner ?? 0,
  };
}

/** Long · medium · short, for the flexibility-versus-interest matrix. */
function matrixRows(rows: TenureRow[], rec: Recommendation): MatrixRow[] {
  if (rows.length < 3) return [];
  const short = rows[0];
  const long = rows[rows.length - 1];
  const middle = rows.slice(1, -1);
  const mid = (short.months + long.months) / 2;
  const medium =
    middle.find((r) => r.months === rec.months) ??
    middle.reduce((a, b) => (Math.abs(b.months - mid) < Math.abs(a.months - mid) ? b : a));
  return [
    { band: 'long', row: long, flexibility: 'High' },
    { band: 'medium', row: medium, flexibility: 'Medium' },
    { band: 'short', row: short, flexibility: 'Low' },
  ];
}

/* ================================================================== */
/* Amounts                                                             */
/* ================================================================== */

function scenarioRows(existing: ExistingAnalysis, input: TopUpInput, today: Date): ScenarioRow[] {
  const t = input.topup;
  const s = input.scenarios;
  const list: [ScenarioRow['key'], number][] = [
    ['minimum', n(s.minimum)],
    ['recommended', n(t.required)],
    ['higher', n(s.higher)],
    ['maximum', n(s.maximum)],
  ];
  return list
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({
      key,
      amount,
      option: topUpOption(existing, t, existing.outstanding + amount, t.tenureMonths, today),
    }));
}

function largerBorrowing(existing: ExistingAnalysis, input: TopUpInput, option: TopUpOption, today: Date): LargerBorrowing | null {
  const t = input.topup;
  const need = n(t.required);
  if (need <= 0) return null;
  const base = topUpOption(existing, t, existing.outstanding + need, t.tenureMonths, today);
  let larger: TopUpOption | null = null;
  let source: LargerBorrowing['source'] = 'maximum';
  if (t.loanMode === 'sanctioned' && option.grossTopUp > need + 0.5) {
    larger = option;
    source = 'sanctioned';
  } else if (n(input.scenarios.maximum) > need + 0.5) {
    larger = topUpOption(existing, t, existing.outstanding + n(input.scenarios.maximum), t.tenureMonths, today);
  }
  if (!larger) return null;
  return {
    base,
    larger,
    source,
    extraTopUp: larger.grossTopUp - base.grossTopUp,
    extraCash: larger.charges.net - base.charges.net,
    extraEmi: larger.emi - base.emi,
    extraPayments: larger.totalPayments - base.totalPayments,
    extraInterest: larger.futureInterest - base.futureInterest,
    extraMonthlyBurden: larger.emi - existing.emi,
  };
}

/* ================================================================== */
/* Part prepayment                                                     */
/* ================================================================== */

/**
 * The top-up loan month by month with the EMI held and every extra rupee
 * going to principal, so the loan ends sooner. The one-off part payment
 * is made with its EMI; the yearly lump sum with every 12th EMI.
 */
export function simulatePrepayment(option: TopUpOption, plan: PrepaymentPlan, today: Date): PrepaymentResult {
  const r = option.ratePct / 100 / 12;
  const initial = n(plan.initial);
  const initialMonth = Math.max(1, months(plan.initialMonth));
  const extra = n(plan.monthlyExtra);
  const annual = n(plan.annualLump);
  const active = initial > 0 || extra > 0 || annual > 0;

  const run = (prepaying: boolean) => {
    let balance = option.loan;
    let month = 0;
    let interest = 0;
    let prepaid = 0;
    const yearEnd: number[] = [];
    while (balance > 0.005 && month < option.months) {
      month++;
      const due = balance * r;
      interest += due;
      // The final EMI is only what is left; an EMI never overpays.
      const pay = Math.min(balance + due, option.emi + (prepaying ? extra : 0));
      const toPrincipal = Math.min(balance, pay - due);
      // Whatever goes in beyond the EMI that month is the extra.
      if (prepaying) prepaid += Math.max(0, pay - Math.min(balance + due, option.emi));
      balance -= toPrincipal;
      if (prepaying) {
        let lump = 0;
        if (month === initialMonth) lump += initial;
        if (month % 12 === 0) lump += annual;
        const used = Math.min(balance, lump);
        balance -= used;
        prepaid += used;
      }
      if (balance < 0.005) balance = 0;
      if (month % 12 === 0) yearEnd.push(balance);
    }
    if (month % 12 !== 0) yearEnd.push(balance);
    return { months: month, interest, prepaid, yearEnd };
  };

  const base = run(false);
  const withPlan = active ? run(true) : base;
  const years = Math.ceil(option.months / 12);
  const yearly = Array.from({ length: years }, (_, i) => ({
    year: i + 1,
    without: safe(base.yearEnd[i] ?? 0),
    with: safe(withPlan.yearEnd[i] ?? 0),
  }));
  return {
    active,
    baseMonths: base.months,
    baseInterest: safe(base.interest),
    months: withPlan.months,
    interest: safe(withPlan.interest),
    monthsSaved: Math.max(0, base.months - withPlan.months),
    interestSaved: Math.max(0, safe(base.interest - withPlan.interest)),
    prepaid: safe(withPlan.prepaid),
    completion: addMonths(today, withPlan.months),
    yearly,
  };
}

/* ================================================================== */
/* The decision                                                        */
/* ================================================================== */

export function decide(t: TopUpTerms, option: TopUpOption): Verdict {
  const T = THRESHOLDS;
  const checks: Check[] = [];
  const need = n(t.required);
  const comfortable = n(t.comfortableEmi);

  // Does it give the money needed — and no more than that?
  if (need > 0 && option.charges.net + 0.5 < need) checks.push({ id: 'cash-short', tone: 'warn' });
  const overPct = need > 0 ? ((option.grossTopUp - need) / need) * 100 : 0;
  if (overPct > T.overBorrowPct.bad) checks.push({ id: 'over-borrow', tone: 'bad' });
  else if (overPct > T.overBorrowPct.warn) checks.push({ id: 'over-borrow', tone: 'warn' });
  else if (option.charges.net + 0.5 >= need) checks.push({ id: 'cash-need', tone: 'good' });

  if (n(t.eligibility) > 0 && option.grossTopUp > n(t.eligibility) + 0.5) checks.push({ id: 'eligibility', tone: 'bad' });

  // Can the EMI be carried?
  if (comfortable > 0) {
    const over = ((option.emi - comfortable) / comfortable) * 100;
    checks.push({ id: 'emi-comfort', tone: over > T.emiOverComfortPct ? 'bad' : over > 0.01 ? 'warn' : 'good' });
  } else {
    checks.push({ id: 'emi-unknown', tone: 'good' });
  }

  // How far does it stretch the loan?
  const long = option.months >= T.longTenureMonths || option.extensionMonths > T.extensionMonths;
  checks.push({ id: 'tenure', tone: option.months >= T.veryLongTenureMonths ? 'bad' : long ? 'warn' : 'good' });

  // What does the money cost?
  const ratio = option.interestPerRupee;
  checks.push({ id: 'interest', tone: ratio > T.interestPerRupee.bad ? 'bad' : ratio > T.interestPerRupee.warn ? 'warn' : 'good' });

  if (option.charges.total > 0) {
    const pct = option.charges.pctOfTopUp;
    checks.push({ id: 'charges', tone: pct > T.chargesPct.bad ? 'bad' : pct > T.chargesPct.warn ? 'warn' : 'good' });
  }

  const level = checks.some((c) => c.tone === 'bad') ? 'red' : checks.some((c) => c.tone === 'warn') ? 'amber' : 'green';
  // Keep the decision readable: problems first, then what is fine.
  const order = { bad: 0, warn: 1, good: 2 } as const;
  checks.sort((a, b) => order[a.tone] - order[b.tone]);
  return { level, checks };
}

function mismatchesOf(e: ExistingLoanInput, existing: ExistingAnalysis): Mismatch[] {
  const list: Mismatch[] = [];
  if (e.remainingMode === 'manual' && existing.remainingMonths !== existing.calculatedRemaining) {
    list.push({ field: 'remaining', entered: existing.remainingMonths, calculated: existing.calculatedRemaining });
  }
  const implied = existing.impliedEmi;
  if (implied > 0 && existing.emi > 0 && (Math.abs(existing.emi - implied) / implied) * 100 > THRESHOLDS.emiMismatchPct) {
    list.push({ field: 'emi', entered: existing.emi, calculated: implied });
  }
  return list;
}

/* ================================================================== */
/* Everything                                                          */
/* ================================================================== */

export function calculateTopUp(input: TopUpInput, today: Date = new Date()): TopUpResult {
  const existing = analyseExisting(input.existing, today);
  const t = input.topup;
  const loan = newLoanOf(input.existing, t);
  const selected = Math.max(1, months(t.tenureMonths));
  const option = topUpOption(existing, t, loan, selected, today);

  const tenures = tenureRows(existing, t, loan, selected, today);
  const recommendation = recommendTenure(tenures, t.comfortableEmi, selected);

  const chosen = tenures.find((r) => r.months === selected) ?? tenures[tenures.length - 1];
  let longTenure: TenurePair | null = null;
  if (selected >= THRESHOLDS.longTenureMonths) {
    const shorter =
      recommendation.months < selected
        ? recommendation.row
        : tenures.find((r) => r.months === 60) ?? tenures[0];
    if (shorter.months < selected) longTenure = pair(chosen, shorter);
  }
  const longest = tenures[tenures.length - 1];
  const lessonShort = recommendation.months < longest.months ? recommendation.row : tenures[0];
  const lesson = lessonShort.months < longest.months ? pair(longest, lessonShort) : null;

  const need = n(t.required);
  const fullCash = option.charges.total > 0 && option.charges.net + 0.5 < need ? topUpForCash(need, existing.outstanding, t) : null;

  return {
    existing,
    option,
    tenures,
    recommendation,
    longTenure,
    lesson,
    scenarios: scenarioRows(existing, input, today),
    larger: largerBorrowing(existing, input, option, today),
    prepayment: simulatePrepayment(option, input.prepay, today),
    matrix: matrixRows(tenures, recommendation),
    verdict: decide(t, option),
    topUpForFullCash: fullCash,
    mismatches: mismatchesOf(input.existing, existing),
    schedule: calculateEMI({ principal: option.loan, annualRatePct: option.ratePct, tenure: option.months, tenureUnit: 'months' }),
  };
}

/* ================================================================== */
/* Validation                                                          */
/* ================================================================== */

export interface TopUpIssue {
  path: string;
  message: string;
  /** 'error' stops the comparison; 'warn' is shown beside it. */
  level: 'error' | 'warn';
}

const RUPEE = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr = (v: number) => `₹${RUPEE.format(Math.round(v))}`;

export function validateTopUp(input: TopUpInput): TopUpIssue[] {
  const issues: TopUpIssue[] = [];
  const e = input.existing;
  const t = input.topup;
  const err = (path: string, message: string) => issues.push({ path, message, level: 'error' });
  const bad = (v: number) => !Number.isFinite(v) || v < 0;

  const amount = (path: string, v: number, label: string, required = true) => {
    if (bad(v)) err(path, `${label} can’t be negative.`);
    else if (required && v <= 0) err(path, `Enter the ${label.charAt(0).toLowerCase()}${label.slice(1)}.`);
    else if (v > LIMITS.maxAmount) err(path, `${label} looks too large — enter up to ₹100 crore.`);
    else return true;
    return false;
  };
  const ratePct = (path: string, v: number) => {
    if (bad(v)) err(path, 'Enter an interest rate of 0% or more.');
    else if (v > LIMITS.maxRatePct) err(path, `Enter an interest rate up to ${LIMITS.maxRatePct}%.`);
  };
  const tenure = (path: string, v: number, max: number, label: string) => {
    if (bad(v) || Math.round(v) < 1) err(path, `Enter the ${label} in months — at least 1.`);
    else if (v > max) err(path, `Enter a ${label} up to ${max} months.`);
    else return true;
    return false;
  };

  /* -------- Existing loan -------- */
  const originalOk = amount('existing.originalAmount', e.originalAmount, 'Original loan amount');
  ratePct('existing.originalRatePct', e.originalRatePct);
  const tenureOk = tenure('existing.originalTenureMonths', e.originalTenureMonths, LIMITS.maxOriginalTenureMonths, 'original tenure');
  if (bad(e.emisPaid)) err('existing.emisPaid', 'EMIs already paid can’t be negative.');
  else if (tenureOk && Math.round(e.emisPaid) > Math.round(e.originalTenureMonths))
    err('existing.emisPaid', `EMIs already paid (${Math.round(e.emisPaid)}) can’t be more than the original tenure of ${Math.round(e.originalTenureMonths)} months.`);
  else if (tenureOk && e.remainingMode === 'auto' && Math.round(e.emisPaid) === Math.round(e.originalTenureMonths))
    err('existing.emisPaid', 'Every EMI on the original tenure is paid, so no months are left. If the loan is still running, enter the remaining tenure yourself.');

  const emiOk = amount('existing.currentEmi', e.currentEmi, 'Current EMI');
  const outOk = amount('existing.outstanding', e.outstanding, 'Outstanding principal');
  if (originalOk && outOk && e.outstanding > e.originalAmount)
    err('existing.outstanding', `The outstanding principal can’t be more than the original loan of ${inr(e.originalAmount)}. Check your loan statement.`);

  let remainingOk = true;
  if (e.remainingMode === 'manual') remainingOk = tenure('existing.remainingMonths', e.remainingMonths, LIMITS.maxOriginalTenureMonths, 'remaining tenure');
  const left = remainingMonthsOf(e);
  if (emiOk && outOk && remainingOk && left > 0) {
    const r = Math.min(LIMITS.maxRatePct, Math.max(0, e.originalRatePct)) / 100 / 12;
    if (e.currentEmi * left + 0.5 < e.outstanding)
      err(
        'existing.currentEmi',
        `An EMI of ${inr(e.currentEmi)} for ${left} months repays only ${inr(e.currentEmi * left)} — less than the ${inr(e.outstanding)} outstanding. Check the EMI, outstanding principal and remaining tenure.`,
      );
    else if (r > 0 && e.currentEmi <= e.outstanding * r)
      err('existing.currentEmi', `An EMI of ${inr(e.currentEmi)} does not cover the monthly interest of ${inr(e.outstanding * r)}, so the loan would never be repaid.`);
  }

  /* -------- Top-up -------- */
  const needOk = amount('topup.required', t.required, 'Additional money required');
  if (t.loanMode === 'sanctioned' && amount('topup.sanctionedLoan', t.sanctionedLoan, 'New loan amount') && outOk && t.sanctionedLoan <= e.outstanding)
    err('topup.sanctionedLoan', `The new loan has to be more than the ${inr(e.outstanding)} outstanding — the difference is your top-up.`);
  ratePct('topup.newRatePct', t.newRatePct);
  tenure('topup.tenureMonths', t.tenureMonths, LIMITS.maxTenureMonths, 'new tenure');

  if (bad(t.feePct)) err('topup.feePct', 'The processing fee can’t be negative.');
  else if (t.feePct >= 100) err('topup.feePct', 'A processing fee of 100% or more would take the whole loan.');
  amount('topup.otherCharges', t.otherCharges, 'Other charges', false);
  amount('topup.insurance', t.insurance, 'Insurance and other deductions', false);
  amount('topup.eligibility', t.eligibility, 'Top-up eligibility', false);
  amount('topup.comfortableEmi', t.comfortableEmi, 'Comfortable EMI', false);

  if (!issues.length && needOk) {
    const loan = newLoanOf(e, t);
    const gross = Math.max(0, loan - e.outstanding);
    const charges = calculateCharges(gross, loan, t);
    if (charges.total >= gross)
      err('topup.charges', `Charges of ${inr(charges.total)} take up the whole top-up of ${inr(gross)} — you would receive nothing.`);
    if (t.eligibility > 0 && gross > t.eligibility + 0.5)
      issues.push({
        path: 'topup.eligibility',
        level: 'warn',
        message: `The top-up of ${inr(gross)} is more than the ${inr(t.eligibility)} your bank says you are eligible for.`,
      });
  }

  /* -------- Scenarios and prepayment -------- */
  for (const k of ['minimum', 'higher', 'maximum'] as const) amount(`scenarios.${k}`, input.scenarios[k], 'Scenario amount', false);
  const p = input.prepay;
  amount('prepay.initial', p.initial, 'Part payment', false);
  amount('prepay.monthlyExtra', p.monthlyExtra, 'Extra monthly payment', false);
  amount('prepay.annualLump', p.annualLump, 'Yearly lump sum', false);
  if (p.initial > 0 && (bad(p.initialMonth) || Math.round(p.initialMonth) < 1 || p.initialMonth > Math.max(1, t.tenureMonths)))
    err('prepay.initialMonth', `Choose a month between 1 and ${Math.max(1, Math.round(t.tenureMonths) || 1)}.`);

  return issues;
}

/** Errors that stop the comparison, as opposed to the inputs for the optional extras below it. */
export const isCoreIssue = (i: TopUpIssue): boolean => i.level === 'error' && !i.path.startsWith('scenarios.') && !i.path.startsWith('prepay.');
