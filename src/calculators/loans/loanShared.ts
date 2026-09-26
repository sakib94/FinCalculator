import type { ChartSpec, Field, Stat, TableSpec, Values } from '../types';
import type { EmiResult } from '@/engines/emi';
import type { LoanCharges } from '@/engines/loanTypes';
import { formatDuration, formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

/**
 * Pieces shared by the home, car, bike, personal and education loan
 * calculators. The maths is identical — a reducing-balance EMI — so the
 * results, charts and schedule are too; what differs per loan is the
 * inputs, the defaults and the explanation, which each module owns.
 */

/* ---------------- Fields ---------------- */

export interface AmountOptions {
  label: string;
  default: number;
  max: number;
  step: number;
  help: string;
  /** Adds a "Loan amount / Price & down payment" switch. */
  price?: {
    label: string;
    default: number;
    max: number;
    step: number;
    help: string;
    downPaymentDefault: number;
    downPaymentHelp: string;
    /** Which input the calculator opens with. */
    startWith: 'loan' | 'price';
  };
}

export const amountMode = (v: Values): 'loan' | 'price' => (str(v.amountMode, 'loan') === 'price' ? 'price' : 'loan');

export function amountFields(o: AmountOptions): Field[] {
  const loanField: Field = {
    name: 'principal',
    label: o.label,
    type: 'currency',
    default: o.default,
    min: 1000,
    max: o.max,
    step: o.step,
    slider: true,
    help: o.help,
  };
  if (!o.price) return [loanField];
  const p = o.price;
  return [
    {
      name: 'amountMode',
      label: 'Start from',
      type: 'segmented',
      default: p.startWith,
      wide: true,
      options: [
        { label: 'Loan amount', value: 'loan' },
        { label: 'Price & down payment', value: 'price' },
      ],
    },
    { ...loanField, visible: (v) => amountMode(v) === 'loan' },
    {
      name: 'price',
      label: p.label,
      type: 'currency',
      default: p.default,
      min: 1000,
      max: p.max,
      step: p.step,
      slider: true,
      help: p.help,
      visible: (v) => amountMode(v) === 'price',
    },
    {
      name: 'downPaymentPct',
      label: 'Down Payment',
      type: 'percent',
      default: p.downPaymentDefault,
      min: 0,
      max: 95,
      step: 1,
      slider: true,
      help: p.downPaymentHelp,
      visible: (v) => amountMode(v) === 'price',
    },
  ];
}

export function rateField(o: { default: number; max?: number; help: string }): Field {
  return {
    name: 'interestRate',
    label: 'Interest Rate',
    type: 'percent',
    default: o.default,
    min: 0.1,
    max: o.max ?? 36,
    step: 0.05,
    slider: true,
    help: o.help,
  };
}

export const tenureUnitOf = (v: Values): 'months' | 'years' =>
  str(v.tenureUnit, 'years') === 'months' ? 'months' : 'years';

export const tenureOf = (v: Values): number => (tenureUnitOf(v) === 'months' ? num(v.tenureMonths) : num(v.tenure));

/**
 * One field per unit, so each slider spans a sensible range — a single
 * 1–480 track would leave 20 years sitting at 4% of the way along.
 */
export function tenureFields(o: {
  defaultYears: number;
  maxYears: number;
  defaultMonths: number;
  startIn?: 'years' | 'months';
  help: string;
}): Field[] {
  return [
    {
      name: 'tenureUnit',
      label: 'Tenure unit',
      type: 'segmented',
      default: o.startIn ?? 'years',
      options: [
        { label: 'Years', value: 'years' },
        { label: 'Months', value: 'months' },
      ],
    },
    {
      name: 'tenure',
      label: 'Loan Tenure',
      type: 'number',
      default: o.defaultYears,
      min: 1,
      max: o.maxYears,
      unit: 'yrs',
      slider: true,
      visible: (v) => tenureUnitOf(v) === 'years',
      help: o.help,
    },
    {
      name: 'tenureMonths',
      label: 'Loan Tenure',
      type: 'number',
      default: o.defaultMonths,
      min: 1,
      max: o.maxYears * 12,
      step: 1,
      unit: 'months',
      slider: true,
      visible: (v) => tenureUnitOf(v) === 'months',
      help: o.help,
    },
  ];
}

export const CHARGES_GROUP = { id: 'charges', title: 'Processing fee (optional)', collapsible: true, defaultOpen: false };

export function feeField(o: { default: number; help: string }): Field {
  return {
    name: 'feePct',
    label: 'Processing Fee',
    type: 'percent',
    default: o.default,
    min: 0,
    max: 10,
    step: 0.05,
    group: 'charges',
    help: o.help,
  };
}

/* ---------------- Results ---------------- */

export function emiHeroCaption(r: EmiResult): string {
  return `${r.months} instalments · ${formatDuration(r.months)}`;
}

export function coreStats(r: EmiResult): Stat[] {
  return [
    { label: 'Loan amount', value: formatINR(r.principal) },
    { label: 'Total interest', value: formatINR(r.totalInterest), tone: 'negative' },
    { label: 'Total repayment', value: formatINR(r.totalPayment), tone: 'accent' },
    {
      label: 'Interest share',
      value: formatPercent(r.interestShare, 1),
      help: 'Share of everything you repay that is interest rather than principal.',
    },
  ];
}

export function chargeStats(r: LoanCharges, quotedRatePct: number): Stat[] {
  if (r.fee <= 0) return [];
  return [
    {
      label: 'Processing fee + 18% GST',
      value: formatINR(r.fee + r.gstOnFee),
      help: 'Usually deducted from the loan before it is paid out, so you receive less than you borrow.',
    },
    {
      label: 'Effective annual cost (APR)',
      value: formatPercent(r.aprPct),
      tone: r.aprPct > quotedRatePct + 0.25 ? 'negative' : 'default',
      help: 'The rate at which your EMIs repay what you actually receive after the fee. Compare loans on this, not on the headline rate.',
    },
  ];
}

export function emiCharts(r: EmiResult, opts: { balanceTitle?: string } = {}): ChartSpec[] {
  return [
    {
      kind: 'donut',
      title: 'Principal vs interest',
      centerLabel: 'Total paid',
      data: [
        { label: 'Principal', value: r.principal },
        { label: 'Interest', value: r.totalInterest },
      ],
    },
    {
      kind: 'bar',
      title: 'What each year’s instalments pay for',
      x: r.yearly.map((y) => `Y${y.year}`),
      xLabel: 'Year',
      stacked: true,
      series: [
        { name: 'Principal', values: r.yearly.map((y) => y.principalPaid) },
        { name: 'Interest', values: r.yearly.map((y) => y.interestPaid) },
      ],
    },
    {
      kind: 'line',
      title: opts.balanceTitle ?? 'Outstanding balance',
      x: r.yearly.map((y) => `Y${y.year}`),
      xLabel: 'Year',
      area: true,
      series: [{ name: 'Balance remaining', values: r.yearly.map((y) => y.balance) }],
    },
  ];
}

export function emiTable(r: EmiResult, csvName: string, note?: string): TableSpec {
  return {
    title: 'Amortisation schedule',
    previewRows: 12,
    csvName,
    columns: [
      { key: 'month', label: 'Month', align: 'left' },
      { key: 'emi', label: 'EMI' },
      { key: 'principal', label: 'Principal' },
      { key: 'interest', label: 'Interest' },
      { key: 'balance', label: 'Remaining Balance' },
    ],
    rows: r.schedule.map((row) => ({
      month: `${row.period}`,
      emi: formatINR(row.emi),
      principal: formatINR(row.principalPaid),
      interest: formatINR(row.interestPaid),
      balance: formatINR(row.balance),
    })),
    csvRows: r.schedule.map((row) => ({
      month: row.period,
      emi: Math.round(row.emi),
      principal: Math.round(row.principalPaid),
      interest: Math.round(row.interestPaid),
      balance: Math.round(row.balance),
    })),
    footer: {
      month: 'Total',
      emi: formatINR(r.totalPayment),
      principal: formatINR(r.principal),
      interest: formatINR(r.totalInterest),
      balance: formatINR(0),
    },
    note:
      note ??
      'For information only. Your lender’s schedule may differ slightly because of the disbursement date, day-count convention and rounding.',
  };
}

export function emiSummary(label: string, r: EmiResult): string {
  return `${label}: EMI ${formatINR(r.emi)} for ${r.months} months. Total interest ${formatINR(
    r.totalInterest,
  )}, total repayment ${formatINR(r.totalPayment)}.`;
}

/** The standard formula block, shared by every EMI calculator. */
export const EMI_FORMULA = `        P × r × (1 + r)ⁿ
EMI = ──────────────────────
          (1 + r)ⁿ − 1

P = loan amount    r = annual rate ÷ 12 ÷ 100    n = tenure in months`;
