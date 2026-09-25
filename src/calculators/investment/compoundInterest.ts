import type { CalculatorDef, Values } from '../types';
import {
  calculateCompoundInterest,
  type CompoundFrequency,
  type CompoundResult,
} from '@/engines/investmentPlus';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  principal: num(v.principal),
  ratePct: num(v.rate),
  years: num(v.years),
  frequency: str(v.frequency, 'yearly') as CompoundFrequency,
  monthlyContribution: num(v.monthlyContribution),
});

const compoundInterest: CalculatorDef<CompoundResult> = {
  id: 'compound-interest',

  fields: [
    {
      name: 'principal',
      label: 'Principal Amount',
      type: 'currency',
      default: 100000,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 10000,
      help: 'The amount you start with.',
    },
    {
      name: 'rate',
      label: 'Annual Interest Rate',
      type: 'percent',
      default: 10,
      min: 0.1,
      max: 40,
      step: 0.25,
      slider: true,
    },
    {
      name: 'years',
      label: 'Time Period',
      type: 'number',
      default: 10,
      min: 0.5,
      max: 50,
      step: 0.5,
      unit: 'yrs',
      slider: true,
    },
    {
      name: 'frequency',
      label: 'Compounding Frequency',
      type: 'select',
      default: 'yearly',
      options: [
        { label: 'Yearly', value: 'yearly' },
        { label: 'Half-yearly', value: 'half-yearly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Daily', value: 'daily' },
      ],
      help: 'How often interest is added to the principal. More frequent compounding earns slightly more from the same quoted rate.',
    },
    {
      name: 'monthlyContribution',
      label: 'Monthly Addition',
      type: 'currency',
      default: 0,
      min: 0,
      max: 10000000,
      slider: true,
      step: 1000,
      optional: true,
      help: 'Optional. Money added every month on top of the principal.',
    },
  ],

  compute: (v) => calculateCompoundInterest(toInput(v)),

  hero: (r) => ({
    label: 'Maturity value',
    value: formatINR(r.maturityValue),
    caption: `${formatINRCompact(r.totalInterest)} of it is interest on ${formatINRCompact(
      r.totalInvested,
    )} invested`,
  }),

  stats: (r) => [
    { label: 'Total invested', value: formatINR(r.totalInvested) },
    { label: 'Interest earned', value: formatINR(r.totalInterest), tone: 'positive' },
    {
      label: 'Effective annual rate',
      value: formatPercent(r.effectiveAnnualRatePct, 3),
      tone: 'accent',
      help: 'What the quoted nominal rate actually earns once compounding is applied.',
    },
    {
      label: 'Gain over simple interest',
      value: formatINR(r.compoundingAdvantage),
      help: 'The extra you earn compared with simple interest at the same rate.',
    },
  ],

  charts: (r) => [
    {
      kind: 'line' as const,
      title: 'Principal vs interest over time',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      stacked: true,
      series: [
        {
          name: 'Amount invested',
          values: r.rows.map(
            (_, i) => r.principal + r.rows.slice(0, i + 1).reduce((s, row) => s + row.contributed, 0),
          ),
        },
        {
          name: 'Interest earned',
          values: r.rows.map(
            (row, i) =>
              row.closing -
              r.principal -
              r.rows.slice(0, i + 1).reduce((s, x) => s + x.contributed, 0),
          ),
        },
      ],
    },
    {
      kind: 'donut' as const,
      title: 'Maturity value split',
      centerLabel: 'Maturity',
      data: [
        { label: 'Amount invested', value: r.totalInvested },
        { label: 'Interest earned', value: Math.max(0, r.totalInterest) },
      ],
    },
  ],

  table: (r) => ({
    title: 'Year-wise breakdown',
    previewRows: 10,
    csvName: 'finora-compound-interest',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'opening', label: 'Opening' },
      { key: 'added', label: 'Added' },
      { key: 'interest', label: 'Interest' },
      { key: 'closing', label: 'Closing' },
    ],
    rows: r.rows.map((row) => ({
      year: String(row.year),
      opening: formatINR(row.opening),
      added: row.contributed > 0 ? formatINR(row.contributed) : '—',
      interest: formatINR(row.interest),
      closing: formatINR(row.closing),
    })),
    csvRows: r.rows.map((row) => ({
      year: row.year,
      opening: Math.round(row.opening),
      added: Math.round(row.contributed),
      interest: Math.round(row.interest),
      closing: Math.round(row.closing),
    })),
  }),

  summary: (r) =>
    `Compound interest: ${formatINR(r.totalInvested)} grows to ${formatINR(
      r.maturityValue,
    )} — ${formatINR(r.totalInterest)} earned.`,

  content: {
    howItWorks: [
      'Compound interest is interest earning interest. Simple interest pays only on the original principal, so it grows in a straight line. Compound interest adds each period’s interest back to the balance, so the next period earns on a larger base — and the curve bends upward.',
      'Compounding frequency matters, though less than people expect. The same 10% quoted rate is worth 10% compounded yearly, 10.25% half-yearly, 10.38% quarterly and 10.47% monthly. That gap is the difference between the nominal rate a bank advertises and the effective rate you actually receive, which is why the effective annual rate is the number to compare across products.',
      'Adding a monthly contribution turns this into a recurring-deposit or SIP calculation: the principal compounds, and each new contribution starts its own smaller compounding stream.',
      'Time does far more work than rate. Doubling the rate roughly doubles the outcome; doubling the years can multiply it several times over.',
    ],
    formula: `A = P × (1 + r/n)^(n × t)

P = principal   r = annual rate   t = years
n = compounding periods per year

Effective annual rate = (1 + r/n)^n − 1`,
    example: [
      '₹1,00,000 at 10% a year for 10 years, compounded yearly.',
      'A = 1,00,000 × 1.10¹⁰ = ₹2,59,374.',
      'Simple interest at the same rate would pay only ₹2,00,000 — compounding adds ₹59,374 on its own.',
    ],
    assumptions: [
      'The rate stays constant for the whole period. Real deposit rates move with the rate cycle.',
      'Interest is reinvested rather than withdrawn. Taking the interest out converts this to simple interest.',
      'Monthly contributions are added at the start of each month.',
      'Tax is not deducted. Interest on deposits is taxable at your slab rate every year, which materially reduces the compounding effect.',
    ],
    notes: [
      'A useful shortcut is the Rule of 72: divide 72 by the rate to get the years needed to double your money. At 9%, that is about eight years.',
      'For taxable deposits, the post-tax rate is what compounds. At a 30% slab, a 7% FD effectively compounds at 4.9%.',
      'Banks in India compound savings account interest quarterly and fixed deposits usually quarterly too.',
    ],
    faqs: [
      {
        q: 'What is the difference between simple and compound interest?',
        a: 'Simple interest is always calculated on the original principal, so it grows linearly. Compound interest is calculated on principal plus accumulated interest, so it accelerates. The stat above shows exactly what that difference is worth for your inputs.',
      },
      {
        q: 'Does more frequent compounding make a big difference?',
        a: 'Less than most people assume. Moving from yearly to monthly compounding on a 10% rate raises the effective rate from 10% to about 10.47%. Going from monthly to daily adds barely another 0.04%.',
      },
      {
        q: 'What is the effective annual rate?',
        a: 'The rate that, compounded once a year, produces the same result as the quoted nominal rate compounded more often. It is the only fair way to compare two products with different compounding frequencies.',
      },
      {
        q: 'How do I use the Rule of 72?',
        a: 'Divide 72 by the annual rate to estimate the years to double. At 12% it is six years, at 8% it is nine. It is an approximation but accurate enough for mental arithmetic at ordinary rates.',
      },
    ],
  },
};

export default compoundInterest;
