import type { CalculatorDef, ValidationErrors, Values } from '../types';
import {
  calculateSSY,
  SSY_DEPOSIT_YEARS,
  SSY_MAX_DEPOSIT,
  SSY_RATE,
  SSY_TERM_YEARS,
  type SsyResult,
} from '@/engines/investmentPlus';
import { formatINR } from '@/lib/format';
import { num } from '@/lib/validate';

const thisYear = new Date().getFullYear();

const toInput = (v: Values) => ({
  yearlyDeposit: num(v.yearlyDeposit),
  ratePct: num(v.rate),
  girlAge: num(v.girlAge),
  startYear: num(v.startYear, thisYear),
});

const ssy: CalculatorDef<SsyResult> = {
  id: 'sukanya-samriddhi',

  fields: [
    {
      name: 'yearlyDeposit',
      label: 'Yearly Deposit',
      type: 'currency',
      default: 150000,
      min: 250,
      max: SSY_MAX_DEPOSIT,
      slider: true,
      step: 5000,
      help: `Minimum ₹250, maximum ₹1,50,000 a year. Deposits run for the first ${SSY_DEPOSIT_YEARS} years only.`,
    },
    {
      name: 'girlAge',
      label: 'Girl’s Age at Opening',
      type: 'number',
      default: 3,
      min: 0,
      max: 10,
      unit: 'yrs',
      slider: true,
      help: 'Up to 10 years. Strictly, the account must be opened before she attains 10 — enter her completed age.',
    },
    {
      name: 'startYear',
      label: 'Year of Opening',
      type: 'number',
      default: thisYear,
      min: 2015,
      max: thisYear + 5,
      help: 'The scheme started in 2015. Maturity is 21 years from this year.',
    },
    {
      name: 'rate',
      label: 'Interest Rate',
      type: 'percent',
      default: SSY_RATE,
      min: 5,
      max: 12,
      step: 0.1,
      slider: true,
      help: `Currently ${SSY_RATE}% a year. The government revises it quarterly, so the real outcome will vary.`,
    },
  ],

  validate: (v: Values): ValidationErrors => {
    const deposit = num(v.yearlyDeposit);
    if (deposit > SSY_MAX_DEPOSIT)
      return { yearlyDeposit: 'Deposits are capped at ₹1,50,000 per financial year.' };
    if (num(v.girlAge) > 10)
      return { girlAge: 'The account cannot be opened once the girl is over 10.' };
    return {};
  },

  compute: (v) => calculateSSY(toInput(v)),

  hero: (r) => ({
    label: 'Maturity amount',
    value: formatINR(r.maturityValue),
    caption: `Payable in ${r.maturityYear}, when she turns ${r.ageAtMaturity}`,
  }),

  stats: (r) => [
    { label: 'Total deposited', value: formatINR(r.totalDeposited), help: `${SSY_DEPOSIT_YEARS} yearly deposits.` },
    { label: 'Interest earned', value: formatINR(r.totalInterest), tone: 'positive' },
    {
      label: 'Growth multiple',
      value: `${(r.maturityValue / Math.max(1, r.totalDeposited)).toFixed(2)}×`,
      tone: 'accent',
    },
    { label: 'Matures in', value: String(r.maturityYear) },
  ],

  charts: (r) => [
    {
      kind: 'line' as const,
      title: 'Balance growth over 21 years',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      stacked: true,
      series: [
        {
          name: 'Deposits',
          values: r.rows.map((_, i) =>
            r.rows.slice(0, i + 1).reduce((s, row) => s + row.deposit, 0),
          ),
        },
        {
          name: 'Interest',
          values: r.rows.map((row, i) =>
            row.closingBalance - r.rows.slice(0, i + 1).reduce((s, x) => s + x.deposit, 0),
          ),
        },
      ],
    },
    {
      kind: 'donut' as const,
      title: 'Maturity value split',
      centerLabel: 'Maturity',
      data: [
        { label: 'Your deposits', value: r.totalDeposited },
        { label: 'Interest earned', value: r.totalInterest },
      ],
    },
  ],

  table: (r) => ({
    title: 'Year-wise account statement',
    previewRows: 12,
    csvName: 'finora-ssy-projection',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'calendar', label: 'Financial year', align: 'left' },
      { key: 'deposit', label: 'Deposit' },
      { key: 'interest', label: 'Interest' },
      { key: 'balance', label: 'Closing balance' },
    ],
    rows: r.rows.map((row) => ({
      year: String(row.year),
      calendar: `${row.calendarYear}-${String((row.calendarYear + 1) % 100).padStart(2, '0')}`,
      deposit: row.deposit > 0 ? formatINR(row.deposit) : '—',
      interest: formatINR(row.interest),
      balance: formatINR(row.closingBalance),
    })),
    csvRows: r.rows.map((row) => ({
      year: row.year,
      financialYear: `${row.calendarYear}-${row.calendarYear + 1}`,
      deposit: Math.round(row.deposit),
      interest: Math.round(row.interest),
      balance: Math.round(row.closingBalance),
    })),
    note: `Deposits are made for the first ${SSY_DEPOSIT_YEARS} years; the balance then compounds untouched until year ${SSY_TERM_YEARS}.`,
  }),

  summary: (r) =>
    `Sukanya Samriddhi: ${formatINR(r.totalDeposited)} deposited grows to ${formatINR(
      r.maturityValue,
    )} by ${r.maturityYear}.`,

  content: {
    howItWorks: [
      'Sukanya Samriddhi Yojana is a government small-savings scheme for a girl child, opened by a parent or guardian before she turns 10. It carries one of the highest fixed rates the government offers, and the rate is set by the Ministry of Finance each quarter.',
      `The structure has two distinct phases. You deposit for the first ${SSY_DEPOSIT_YEARS} years — anywhere between ₹250 and ₹1,50,000 a financial year. The account then stops accepting deposits but keeps compounding for another six years, maturing ${SSY_TERM_YEARS} years after opening. That silent tail is where a large share of the interest is actually earned.`,
      'Interest is compounded annually on the balance. Because nothing is withdrawn along the way, the effect over 21 years is substantial — deposits typically roughly triple.',
      'The scheme is EEE: the deposit qualifies for deduction under section 80C, the interest accrues tax-free, and the maturity amount is exempt. Very few Indian instruments are tax-free at all three stages.',
    ],
    formula: `Years 1–${SSY_DEPOSIT_YEARS}:   balance = (balance + deposit) × (1 + r)
Years ${SSY_DEPOSIT_YEARS + 1}–${SSY_TERM_YEARS}:  balance = balance × (1 + r)

r = annual interest rate (currently ${SSY_RATE}%)
Maturity = ${SSY_TERM_YEARS} years from the date of opening`,
    example: [
      `₹1,50,000 deposited every year for ${SSY_DEPOSIT_YEARS} years at ${SSY_RATE}%.`,
      'Total deposited is ₹22,50,000.',
      `By year ${SSY_TERM_YEARS} the balance is roughly ₹69 lakh — over three times the amount paid in, entirely tax-free.`,
    ],
    assumptions: [
      `The interest rate stays at the figure you enter for all ${SSY_TERM_YEARS} years. In practice the government revises it every quarter, and it has ranged from 7.6% to 9.2% since the scheme began.`,
      'Deposits are made at the start of each financial year, which maximises the interest. Depositing later in the year earns slightly less.',
      'The same amount is deposited every year. Real deposits can vary between ₹250 and ₹1.5 lakh.',
      'No partial withdrawal is taken. Withdrawing for education would reduce the maturity amount accordingly.',
    ],
    notes: [
      'Only two accounts are allowed per family, one per girl child, except where twins or triplets are born.',
      'Up to 50% of the balance can be withdrawn after the girl turns 18, for higher education.',
      'The account can be closed early if she marries after turning 18.',
      'If a year is missed, the account becomes dormant. A ₹50 penalty plus the ₹250 minimum revives it.',
      'Deposits qualify under section 80C, which is only available under the old tax regime.',
    ],
    faqs: [
      {
        q: 'Who can open a Sukanya Samriddhi account?',
        a: 'A parent or legal guardian, for a girl child under 10, at any post office or authorised bank branch. Two accounts per family is the limit.',
      },
      {
        q: 'What happens after 15 years of deposits?',
        a: 'The account stops accepting deposits but continues earning interest until it matures at 21 years. Those six deposit-free years add a large share of the total interest, so closing early is usually a poor idea.',
      },
      {
        q: 'Is the maturity amount taxable?',
        a: 'No. The scheme is exempt-exempt-exempt: deposits qualify for 80C deduction, interest accrues tax-free, and maturity proceeds are entirely exempt from tax.',
      },
      {
        q: 'How does it compare with PPF?',
        a: 'SSY usually pays a slightly higher rate and has the same EEE status, but it locks the money for 21 years and can only be used for one girl child. PPF is more flexible — any adult, 15-year term, partial withdrawals from year 7.',
      },
      {
        q: 'What if I cannot deposit in a particular year?',
        a: 'The account goes dormant. You can revive it by paying ₹250 for each missed year plus a ₹50 penalty per year. Interest continues to accrue on the existing balance in the meantime.',
      },
    ],
  },
};

export default ssy;
