import type { CalculatorDef, Values } from '../types';
import { calculateFlatRate, type FlatRateResult } from '@/engines/loanTools';
import { formatINR, formatNumber, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  principal: num(v.principal),
  flatRatePct: num(v.flatRate),
  years: num(v.years),
});

const flatVsReducing: CalculatorDef<FlatRateResult> = {
  id: 'flat-vs-reducing',

  fields: [
    {
      name: 'principal',
      label: 'Loan Amount',
      type: 'currency',
      default: 500000,
      min: 1000,
      max: 100000000,
      slider: true,
      step: 10000,
    },
    {
      name: 'flatRate',
      label: 'Flat Interest Rate',
      type: 'percent',
      default: 9,
      min: 0.5,
      max: 40,
      step: 0.1,
      slider: true,
      help: 'The rate the dealer or lender quotes as “flat”. Common on car, two-wheeler, consumer-durable and some personal loans.',
    },
    {
      name: 'years',
      label: 'Loan Tenure',
      type: 'number',
      default: 5,
      min: 0.5,
      max: 30,
      step: 0.5,
      unit: 'yrs',
      slider: true,
    },
  ],

  compute: (v) => calculateFlatRate(toInput(v)),

  hero: (r, v) => [
    {
      label: 'Effective (reducing) interest rate',
      value: formatPercent(r.effectiveRatePct),
      caption: `A ${formatPercent(num(v.flatRate))} flat rate really costs ${formatNumber(r.ratio, 2)}× as much`,
    },
    {
      label: 'Monthly EMI',
      value: formatINR(r.flatEmi),
      caption: `${r.months} instalments on a flat-rate loan`,
    },
  ],

  stats: (r, v) => [
    { label: 'Interest at flat rate', value: formatINR(r.flatInterest), tone: 'negative' },
    { label: 'Total repayment', value: formatINR(r.flatTotal) },
    {
      label: `EMI at ${formatPercent(num(v.flatRate))} reducing`,
      value: formatINR(r.reducingEmi),
      help: 'What the EMI would be if the same headline rate were charged on the reducing balance, as banks do.',
    },
    { label: `Interest at ${formatPercent(num(v.flatRate))} reducing`, value: formatINR(r.reducingInterest) },
    {
      label: 'Extra cost of the flat rate',
      value: formatINR(r.extraCost),
      tone: 'negative',
      help: 'How much more interest the flat-rate loan charges than a reducing-balance loan at the same quoted rate.',
    },
  ],

  charts: (r) => [
    {
      kind: 'bar' as const,
      title: 'Total interest: flat vs reducing',
      x: ['Flat rate', 'Reducing balance'],
      series: [{ name: 'Interest', values: [r.flatInterest, r.reducingInterest] }],
    },
    {
      kind: 'bar' as const,
      title: 'What each year’s flat-rate EMIs really pay for',
      x: r.yearly.map((y) => `Y${y.year}`),
      xLabel: 'Year',
      stacked: true,
      series: [
        { name: 'Principal', values: r.yearly.map((y) => y.principalPaid) },
        { name: 'Interest', values: r.yearly.map((y) => y.interestPaid) },
      ],
    },
  ],

  table: (r) => ({
    title: 'True amortisation of the flat-rate loan',
    csvName: 'finora-flat-rate-schedule',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'principal', label: 'Principal repaid' },
      { key: 'interest', label: 'Interest paid' },
      { key: 'balance', label: 'Balance' },
    ],
    rows: r.yearly.map((y) => ({
      year: String(y.year),
      principal: formatINR(y.principalPaid),
      interest: formatINR(y.interestPaid),
      balance: formatINR(y.balance),
    })),
    csvRows: r.yearly.map((y) => ({
      year: y.year,
      principal: Math.round(y.principalPaid),
      interest: Math.round(y.interestPaid),
      balance: Math.round(y.balance),
    })),
    note: `Each flat-rate EMI split at the effective ${formatPercent(r.effectiveRatePct)} reducing rate — how the loan actually amortises.`,
  }),

  summary: (r, v) =>
    `A ${formatPercent(num(v.flatRate))} flat rate on ${formatINR(r.principal)} over ${r.months} months is an effective ${formatPercent(
      r.effectiveRatePct,
    )} reducing rate. EMI ${formatINR(r.flatEmi)}; ${formatINR(r.extraCost)} more interest than a reducing-balance loan at the same rate.`,

  content: {
    howItWorks: [
      'A flat rate charges interest on the full loan amount for the entire tenure, even though you pay part of it back every month. By the last year you might owe only a fraction of the original sum, but you are still paying interest on all of it.',
      'Banks quote home and most personal loans on a reducing balance: interest is charged only on what you still owe. The two rates are not comparable — a flat rate always looks much cheaper than it is.',
      'The calculator finds the reducing-balance rate that produces exactly the same EMI. That effective rate is the loan’s true cost, and it is the number to compare against any bank offer.',
    ],
    formula: `Flat interest   = P × flat rate × years
Flat EMI        = (P + flat interest) ÷ months
Effective rate  = r such that  P × r(1 + r)ⁿ ÷ [(1 + r)ⁿ − 1] = flat EMI
(solved numerically; r is monthly, × 12 for the annual rate)`,
    example: [
      'A ₹5,00,000 loan at a 9% flat rate for 5 years.',
      'Flat interest = 5,00,000 × 9% × 5 = ₹2,25,000; EMI = ₹7,25,000 ÷ 60 = ₹12,083.',
      'That EMI corresponds to about 15.7% on a reducing balance — 1.75 times the quoted rate.',
    ],
    assumptions: [
      'Interest is fixed for the tenure and every EMI is paid on time.',
      'Processing fees, insurance and other charges are excluded; including them would push the effective rate higher still.',
    ],
    notes: [
      'Rule of thumb: the effective rate is roughly 1.6–1.85 times the flat rate. The multiple is highest on short, low-rate loans and falls as the tenure and rate rise.',
      'The RBI requires lenders to disclose the annual percentage rate (APR) in the Key Fact Statement. Ask for it — it is the effective rate including fees.',
      'Prepaying a flat-rate loan saves far less than you expect, because the interest was fixed on the original amount from day one.',
    ],
    faqs: [
      {
        q: 'Is a 9% flat rate better than a 14% reducing rate?',
        a: 'No. A 9% flat rate over 5 years is about 15.7% on a reducing balance, so the 14% reducing-rate loan is cheaper. Always convert before comparing.',
      },
      {
        q: 'Why do car dealers quote flat rates?',
        a: 'Because the number looks smaller. A flat rate is simple to calculate and easy to advertise, but it understates the true cost of borrowing.',
      },
      {
        q: 'How do I convert a flat rate to a reducing rate quickly?',
        a: 'Multiply by about 1.75 for a rough estimate (a little more for short loans, a little less for long ones). For the exact figure, enter the loan here — the calculator solves for the rate that gives the same EMI.',
      },
    ],
  },
};

export default flatVsReducing;
