import type { TopUpInput } from '@/engines/topup';

/**
 * The top-up calculator's inputs: the example the page opens with, a
 * blank start, saved comparisons, and a restore step that accepts only
 * well-formed saved data.
 */

/** A result kept aside so the inputs can change without losing it. */
export interface PinnedOption {
  id: string;
  loan: number;
  ratePct: number;
  months: number;
  emi: number;
  netCash: number;
  additionalInterest: number;
  additionalPayments: number;
  level: 'green' | 'amber' | 'red';
}

export interface TopUpState {
  input: TopUpInput;
  schedule: 'monthly' | 'yearly';
  pinned: PinnedOption[];
}

export const MAX_PINNED = 4;

/**
 * ₹12.10 lakh at 11.25% over six years, 16 EMIs of ₹23,104 paid and ₹10
 * lakh still owed; ₹3 lakh more is needed, offered at 10.5% over seven
 * years. ₹28,000 a month is comfortable.
 */
export function defaultInput(): TopUpInput {
  return {
    existing: {
      originalAmount: 1210000,
      originalRatePct: 11.25,
      originalTenureMonths: 72,
      emisPaid: 16,
      currentEmi: 23104,
      outstanding: 1000000,
      remainingMode: 'auto',
      remainingMonths: 56,
    },
    topup: {
      required: 300000,
      loanMode: 'auto',
      sanctionedLoan: 1300000,
      newRatePct: 10.5,
      tenureMonths: 84,
      feePct: 0,
      feeOn: 'topup',
      otherCharges: 0,
      insurance: 0,
      eligibility: 0,
      comfortableEmi: 28000,
    },
    scenarios: { minimum: 200000, higher: 400000, maximum: 500000 },
    prepay: { initial: 50000, initialMonth: 6, monthlyExtra: 3000, annualLump: 50000 },
  };
}

/** Every amount cleared; the choices that shape the form are kept. */
export function blankInput(): TopUpInput {
  const d = defaultInput();
  return {
    existing: { ...d.existing, originalAmount: 0, originalRatePct: 0, emisPaid: 0, currentEmi: 0, outstanding: 0, remainingMonths: 0 },
    topup: { ...d.topup, required: 0, sanctionedLoan: 0, newRatePct: 0, comfortableEmi: 0 },
    scenarios: { minimum: 0, higher: 0, maximum: 0 },
    prepay: { initial: 0, initialMonth: 6, monthlyExtra: 0, annualLump: 0 },
  };
}

export const defaultState = (): TopUpState => ({
  input: defaultInput(),
  schedule: 'yearly',
  pinned: [],
});


/* ------------------------------------------------------------------ */
/* Restoring saved state                                               */
/* ------------------------------------------------------------------ */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const numOr = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const oneOf = <T extends string>(v: unknown, options: readonly T[], d: T): T => (options.includes(v as T) ? (v as T) : d);

/** The numeric fields of `fallback`, taken from `v` wherever they are numbers. */
function numbers<T extends object>(v: unknown, fallback: T): T {
  const out: Record<string, unknown> = { ...(fallback as Record<string, unknown>) };
  if (!isObj(v)) return out as T;
  for (const [k, d] of Object.entries(fallback as Record<string, unknown>)) if (typeof d === 'number') out[k] = numOr(v[k], d);
  return out as T;
}

function pinnedFrom(v: unknown): PinnedOption[] {
  if (!Array.isArray(v)) return [];
  const out: PinnedOption[] = [];
  for (const p of v.slice(0, MAX_PINNED)) {
    if (!isObj(p) || typeof p.id !== 'string') continue;
    const nums = ['loan', 'ratePct', 'months', 'emi', 'netCash', 'additionalInterest', 'additionalPayments'] as const;
    if (!nums.every((k) => typeof p[k] === 'number' && Number.isFinite(p[k]))) continue;
    out.push({
      id: p.id.slice(0, 40),
      loan: p.loan as number,
      ratePct: p.ratePct as number,
      months: p.months as number,
      emi: p.emi as number,
      netCash: p.netCash as number,
      additionalInterest: p.additionalInterest as number,
      additionalPayments: p.additionalPayments as number,
      level: oneOf(p.level, ['green', 'amber', 'red'] as const, 'amber'),
    });
  }
  return out;
}

/**
 * Saved state from an earlier visit, checked field by field. Anything
 * missing or malformed falls back to the example, so a damaged save can
 * never break the page.
 */
export function restoreState(raw: unknown): TopUpState {
  const d = defaultState();
  if (!isObj(raw) || !isObj(raw.input)) return d;
  const v = raw.input;
  const di = d.input;
  const existing = numbers(v.existing, di.existing);
  const topup = numbers(v.topup, di.topup);
  if (isObj(v.existing)) existing.remainingMode = oneOf(v.existing.remainingMode, ['auto', 'manual'] as const, 'auto');
  if (isObj(v.topup)) {
    topup.loanMode = oneOf(v.topup.loanMode, ['auto', 'sanctioned'] as const, 'auto');
    topup.feeOn = oneOf(v.topup.feeOn, ['topup', 'loan'] as const, 'topup');
  }
  return {
    input: {
      existing,
      topup,
      scenarios: numbers(v.scenarios, di.scenarios),
      prepay: numbers(v.prepay, di.prepay),
    },
    schedule: oneOf(raw.schedule, ['monthly', 'yearly'] as const, 'yearly'),
    pinned: pinnedFrom(raw.pinned),
  };
}
