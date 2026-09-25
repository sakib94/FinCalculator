import type { CalculatorDef, Values } from '../types';
import { calculateFD, type FdCompounding, type FdResult } from '@/engines/investment';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  principal: num(v.principal),
  annualRatePct: num(v.rate),
  years: num(v.years),
  compounding: str(v.compounding, 'quarterly') as FdCompounding,
  taxSlabPct: num(v.taxSlab),
});

const fd: CalculatorDef<FdResult> = {
  id: 'fd',

  fields: [
    {
      name: 'principal',
      label: 'Deposit Amount',
      type: 'currency',
      default: 500000,
      min: 1000,
      max: 1000000000,
      slider: true,
      step: 10000,
    },
    {
      name: 'rate',
      label: 'Interest Rate',
      type: 'percent',
      default: 7,
      min: 0.5,
      max: 15,
      step: 0.05,
      slider: true,
      help: 'Senior citizens usually get 0.25–0.50% more than the card rate.',
    },
    {
      name: 'years',
      label: 'Tenure',
      type: 'number',
      default: 5,
      min: 0.25,
      max: 20,
      step: 0.25,
      unit: 'yrs',
      slider: true,
    },
    {
      name: 'compounding',
      label: 'Compounding',
      type: 'select',
      default: 'quarterly',
      options: [
        { label: 'Quarterly (bank standard)', value: 'quarterly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Half-yearly', value: 'half-yearly' },
        { label: 'Yearly', value: 'yearly' },
        { label: 'Simple interest (no compounding)', value: 'simple' },
      ],
      help: 'Indian banks compound cumulative FDs quarterly. Non-cumulative FDs pay out interest instead, which is simple interest.',
    },
    {
      name: 'taxSlab',
      label: 'Your Income Tax Slab',
      type: 'percent',
      default: 0,
      min: 0,
      max: 42.744,
      step: 0.1,
      optional: true,
      help: 'FD interest is fully taxable at your slab rate. Enter it to see the post-tax return.',
    },
  ],

  compute: (v) => calculateFD(toInput(v)),

  hero: (r) => ({
    label: 'Maturity amount',
    value: formatINR(r.maturity),
    caption: `${formatINRCompact(r.maturity)} · interest earned ${formatINRCompact(r.interest)}`,
  }),

  stats: (r, v) => [
    { label: 'Principal', value: formatINR(r.principal) },
    { label: 'Interest earned', value: formatINR(r.interest), tone: 'positive' },
    { label: 'Effective annual yield', value: formatPercent(r.effectiveYieldPct), tone: 'accent' },
    ...(num(v.taxSlab) > 0
      ? [
          { label: 'Tax on interest', value: formatINR(r.taxOnInterest), tone: 'negative' as const },
          { label: 'Post-tax maturity', value: formatINR(r.postTaxMaturity) },
          { label: 'Post-tax yield', value: formatPercent(r.postTaxYieldPct) },
        ]
      : []),
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Principal vs interest',
      centerLabel: 'Maturity',
      data: [
        { label: 'Principal', value: r.principal },
        { label: 'Interest', value: r.interest },
      ],
    },
    {
      kind: 'line' as const,
      title: 'Balance year by year',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      area: true,
      series: [{ name: 'Balance', values: r.rows.map((row) => row.closing) }],
    },
  ],

  table: (r) => ({
    title: 'Year-wise interest',
    previewRows: 10,
    csvName: 'finora-fd-projection',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'opening', label: 'Opening' },
      { key: 'interest', label: 'Interest' },
      { key: 'closing', label: 'Closing' },
    ],
    rows: r.rows.map((row) => ({
      year: String(row.year),
      opening: formatINR(row.opening),
      interest: formatINR(row.interest),
      closing: formatINR(row.closing),
    })),
    csvRows: r.rows.map((row) => ({
      year: row.year,
      opening: Math.round(row.opening),
      interest: Math.round(row.interest),
      closing: Math.round(row.closing),
    })),
  }),

  summary: (r) => `FD maturity ${formatINR(r.maturity)} — interest ${formatINR(r.interest)} at an effective ${formatPercent(r.effectiveYieldPct)} a year.`,

  content: {
    howItWorks: [
      'A cumulative fixed deposit reinvests the interest it earns, so the balance compounds. Indian banks compound quarterly by convention, which is why the effective yield is slightly higher than the rate printed on the receipt.',
      'A non-cumulative FD pays the interest out monthly or quarterly instead of reinvesting it. Choose “simple interest” for that case — the maturity amount is just the principal back, and the interest reaches you along the way.',
      'Because FD interest is taxed at your slab rate, the post-tax return matters far more than the headline rate. Enter your slab to see both.',
    ],
    formula: `Compound:  A = P × (1 + r/n)^(n × t)
Simple:    A = P × (1 + r × t)

P = principal   r = annual rate   n = compounding periods per year   t = years`,
    example: [
      '₹5,00,000 at 7% for 5 years, compounded quarterly.',
      'A = 5,00,000 × (1 + 0.07/4)^20 = about ₹7,07,389.',
      'Interest earned is roughly ₹2,07,000 — an effective yield of about 7.19% a year.',
    ],
    assumptions: [
      'The rate is fixed for the whole tenure, which is how FDs work once booked.',
      'The deposit runs to maturity. Breaking an FD early usually costs a penalty of 0.5–1% on the applicable rate.',
      'Tax is applied on the total interest at the slab you enter. In reality TDS is deducted each year once interest crosses the threshold.',
    ],
    notes: [
      'Banks deduct 10% TDS when FD interest crosses ₹50,000 in a year (₹1,00,000 for senior citizens) — 20% if PAN is not provided.',
      'Deposits with scheduled banks are insured by DICGC up to ₹5 lakh per depositor per bank, covering principal and interest together.',
      'A 5-year tax-saving FD qualifies for 80C in the old regime, but the interest remains fully taxable.',
    ],
    faqs: [
      {
        q: 'How often do banks compound FD interest?',
        a: 'Quarterly, for cumulative deposits. That is why ₹1 lakh at 7% grows to about ₹1,07,186 in a year rather than ₹1,07,000.',
      },
      {
        q: 'Is FD interest taxable?',
        a: 'Yes, fully, at your income tax slab rate, in the year it accrues. TDS is deducted at 10% above the threshold, but you owe the difference if your slab is higher.',
      },
      {
        q: 'Cumulative or non-cumulative?',
        a: 'Cumulative if you do not need the money in the meantime — the compounding adds meaningfully over a long tenure. Non-cumulative if you rely on the interest as regular income.',
      },
      {
        q: 'What happens if I break the FD early?',
        a: 'You earn the rate applicable for the period the deposit actually ran, usually with a penalty of 0.5% to 1%. Re-run the calculation with the lower rate and shorter tenure to see the effect.',
      },
    ],
  },
};

export default fd;
