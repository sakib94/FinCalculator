import type { CalculatorDef, ValidationErrors, Values } from '../types';
import { calculatePPF, type PpfResult, type PpfFrequency } from '@/engines/investment';
import { formatINR, formatINRCompact } from '@/lib/format';
import { num, str } from '@/lib/validate';

const PPF_RATE = 7.1;
const PPF_ANNUAL_CAP = 150000;

const toInput = (v: Values) => ({
  depositAmount: num(v.deposit),
  frequency: str(v.frequency, 'yearly') as PpfFrequency,
  interestRatePct: num(v.rate),
  years: num(v.years),
});

const ppf: CalculatorDef<PpfResult> = {
  id: 'ppf',

  fields: [
    {
      name: 'frequency',
      label: 'Deposit Frequency',
      type: 'segmented',
      default: 'yearly',
      options: [
        { label: 'Yearly', value: 'yearly' },
        { label: 'Monthly', value: 'monthly' },
      ],
      help: 'Monthly deposits are assumed to be made on or before the 5th, so they earn interest that month.',
    },
    {
      name: 'deposit',
      label: 'Deposit Amount',
      type: 'currency',
      default: 150000,
      min: 500,
      max: 150000,
      slider: true,
      step: 500,
      help: 'Per instalment. The combined annual limit across all your PPF accounts is ₹1.5 lakh.',
    },
    {
      name: 'rate',
      label: 'PPF Interest Rate',
      type: 'percent',
      default: PPF_RATE,
      min: 1,
      max: 15,
      step: 0.1,
      slider: true,
      help: 'Set by the government every quarter. It has been 7.1% since April 2020.',
    },
    {
      name: 'years',
      label: 'Investment Period',
      type: 'number',
      default: 15,
      min: 1,
      max: 50,
      unit: 'yrs',
      slider: true,
      help: 'A PPF account matures in 15 years and can then be extended in blocks of 5 years.',
    },
  ],

  validate: (v: Values): ValidationErrors => {
    const annual = str(v.frequency, 'yearly') === 'monthly' ? num(v.deposit) * 12 : num(v.deposit);
    if (annual > PPF_ANNUAL_CAP)
      return { deposit: `Total deposits cannot exceed ₹1,50,000 a year (you entered ₹${annual.toLocaleString('en-IN')}).` };
    return {};
  },

  compute: (v) => calculatePPF(toInput(v)),

  hero: (r, v) => ({
    label: 'Maturity amount',
    value: formatINR(r.maturity),
    caption: `${formatINRCompact(r.maturity)} after ${num(v.years)} years — entirely tax-free`,
  }),

  stats: (r) => [
    { label: 'Total deposited', value: formatINR(r.totalDeposited) },
    { label: 'Total interest earned', value: formatINR(r.totalInterest), tone: 'positive' },
    { label: 'Annual deposit', value: formatINR(r.annualDeposit) },
    {
      label: 'Interest as % of maturity',
      value: `${r.maturity > 0 ? ((r.totalInterest / r.maturity) * 100).toFixed(1) : '0'}%`,
      tone: 'accent',
    },
  ],

  charts: (r) => [
    {
      kind: 'line' as const,
      title: 'Deposits vs interest over time',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      stacked: true,
      series: [
        {
          name: 'Deposits',
          values: r.rows.map((_, i) => r.rows.slice(0, i + 1).reduce((s, x) => s + x.deposited, 0)),
        },
        {
          name: 'Interest',
          values: r.rows.map((_, i) => r.rows.slice(0, i + 1).reduce((s, x) => s + x.interest, 0)),
        },
      ],
    },
  ],

  table: (r) => ({
    title: 'Year-wise balance',
    previewRows: 15,
    csvName: 'finora-ppf-projection',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'opening', label: 'Opening' },
      { key: 'deposit', label: 'Deposit' },
      { key: 'interest', label: 'Interest' },
      { key: 'closing', label: 'Closing Balance' },
    ],
    rows: r.rows.map((row) => ({
      year: String(row.year),
      opening: formatINR(row.opening),
      deposit: formatINR(row.deposited),
      interest: formatINR(row.interest),
      closing: formatINR(row.closing),
    })),
    csvRows: r.rows.map((row) => ({
      year: row.year,
      opening: Math.round(row.opening),
      deposit: Math.round(row.deposited),
      interest: Math.round(row.interest),
      closing: Math.round(row.closing),
    })),
    footer: {
      year: 'Total',
      opening: '',
      deposit: formatINR(r.totalDeposited),
      interest: formatINR(r.totalInterest),
      closing: formatINR(r.maturity),
    },
  }),

  summary: (r) =>
    `PPF maturity ${formatINR(r.maturity)} — deposits ${formatINR(r.totalDeposited)} plus tax-free interest ${formatINR(
      r.totalInterest,
    )}.`,

  content: {
    howItWorks: [
      'The Public Provident Fund is a 15-year government-backed savings scheme. Interest is calculated on the lowest balance between the 5th and the last day of each month, and credited once a year on 31 March. That rule is why depositing before the 5th of the month matters — a deposit on the 6th earns nothing for that month.',
      'This calculator follows the monthly-minimum-balance rule rather than simple annual compounding, so the yearly figures line up with a real PPF passbook.',
      'PPF is one of the few Exempt-Exempt-Exempt investments left: the deposit is deductible under 80C, the interest is tax-free, and the maturity amount is tax-free too.',
    ],
    formula: `Monthly interest = lowest balance between the 5th and month-end × (rate ÷ 12)
Year-end balance = opening + deposits + total interest for the year (credited on 31 March)`,
    example: [
      '₹1,50,000 deposited at the start of every year for 15 years at 7.1%.',
      'Total deposited = ₹22,50,000.',
      'Maturity is roughly ₹40.7 lakh, of which about ₹18.2 lakh is interest — none of it taxable.',
    ],
    assumptions: [
      'The interest rate stays constant. In practice the government revises it every quarter.',
      'Yearly deposits are made in the first month of the financial year; monthly deposits on or before the 5th.',
      'No loans or partial withdrawals are taken against the account.',
    ],
    notes: [
      'Minimum ₹500 and maximum ₹1,50,000 per financial year, across all PPF accounts you hold.',
      'The account matures after 15 full financial years and can be extended indefinitely in 5-year blocks, with or without further deposits.',
      'Partial withdrawal is allowed from the 7th year, and a loan from the 3rd to the 6th year.',
    ],
    faqs: [
      {
        q: 'When is the best time to deposit in PPF?',
        a: 'Before the 5th of April if you deposit annually. Interest is calculated on the lowest balance between the 5th and the end of each month, so an early deposit earns a full year of interest.',
      },
      {
        q: 'Is PPF interest taxable?',
        a: 'No. PPF falls under the EEE category — the deposit qualifies for deduction under 80C in the old regime, and both the interest and maturity amount are completely tax-free.',
      },
      {
        q: 'What happens after 15 years?',
        a: 'You can withdraw the entire balance tax-free, or extend in blocks of 5 years. If you extend without fresh deposits, the balance keeps earning interest and you can withdraw once a year.',
      },
      {
        q: 'Can I open PPF accounts for my children too?',
        a: 'Yes, as a guardian, but the ₹1.5 lakh annual limit applies to your own and the minor’s account combined.',
      },
    ],
  },
};

export default ppf;
