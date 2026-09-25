import type { CalculatorDef, Values } from '../types';
import { calculateSimpleInterest, type SimpleInterestResult, type TimeUnit } from '@/engines/savings';
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const unitOf = (v: Values): TimeUnit => str(v.timeUnit, 'years') as TimeUnit;

const toInput = (v: Values) => ({
  principal: num(v.principal),
  annualRatePct: num(v.rate),
  time: unitOf(v) === 'years' ? num(v.years) : unitOf(v) === 'months' ? num(v.months) : num(v.days),
  timeUnit: unitOf(v),
});

const periodText = (r: SimpleInterestResult, v: Values): string => {
  const unit = unitOf(v);
  if (unit === 'months') return `${formatNumber(num(v.months))} months`;
  if (unit === 'days') return `${formatNumber(num(v.days))} days`;
  return `${formatNumber(r.years, 2)} years`;
};

const simpleInterest: CalculatorDef<SimpleInterestResult> = {
  id: 'simple-interest',

  fields: [
    {
      name: 'principal',
      label: 'Principal Amount',
      type: 'currency',
      default: 100000,
      min: 1,
      max: 1000000000,
      slider: true,
      step: 5000,
      help: 'The amount lent or borrowed.',
    },
    {
      name: 'rate',
      label: 'Annual Interest Rate',
      type: 'percent',
      default: 8,
      min: 0.1,
      max: 60,
      step: 0.1,
      slider: true,
      help: 'The yearly rate. For a monthly rate (common on informal loans), multiply by 12 — 2% a month is 24% a year.',
    },
    {
      name: 'timeUnit',
      label: 'Time in',
      type: 'segmented',
      default: 'years',
      options: [
        { label: 'Years', value: 'years' },
        { label: 'Months', value: 'months' },
        { label: 'Days', value: 'days' },
      ],
    },
    {
      name: 'years',
      label: 'Time Period',
      type: 'number',
      default: 3,
      min: 0.1,
      max: 50,
      step: 0.5,
      unit: 'yrs',
      slider: true,
      visible: (v) => unitOf(v) === 'years',
    },
    {
      name: 'months',
      label: 'Time Period',
      type: 'number',
      default: 18,
      min: 1,
      max: 600,
      unit: 'months',
      slider: true,
      visible: (v) => unitOf(v) === 'months',
    },
    {
      name: 'days',
      label: 'Time Period',
      type: 'number',
      default: 90,
      min: 1,
      max: 18250,
      unit: 'days',
      visible: (v) => unitOf(v) === 'days',
      help: 'Interest for a number of days uses a 365-day year, the convention for Indian deposits and loans.',
    },
  ],

  compute: (v) => calculateSimpleInterest(toInput(v)),

  hero: (r, v) => ({
    label: 'Simple interest',
    value: formatINR(r.interest, r.interest < 1000 ? 2 : 0),
    caption: `Total amount ${formatINR(r.amount)} after ${periodText(r, v)}`,
  }),

  stats: (r) => [
    { label: 'Principal', value: formatINR(r.principal) },
    { label: 'Total amount', value: formatINR(r.amount), tone: 'accent' },
    { label: 'Interest per year', value: formatINR(r.interestPerYear) },
    {
      label: 'With yearly compounding',
      value: formatINR(r.compoundAmount),
      help: 'What the same principal and rate would reach if interest were added to the balance every year.',
    },
    {
      label: 'Compounding would earn',
      value: `${r.compoundingAdvantage >= 0 ? '+' : ''}${formatINRCompact(r.compoundingAdvantage)}`,
      tone: 'positive',
      help: 'The extra interest compounding earns over simple interest for this period.',
    },
  ],

  charts: (r) =>
    r.rows.length > 1
      ? [
          {
            kind: 'line' as const,
            title: 'Simple vs compound interest',
            x: r.rows.map((row) => `Y${row.year}`),
            xLabel: 'Year',
            series: [
              { name: 'Simple interest', values: r.rows.map((row) => row.simple) },
              { name: 'Compounded yearly', values: r.rows.map((row) => row.compound) },
            ],
          },
          {
            kind: 'donut' as const,
            title: 'Principal vs interest',
            centerLabel: 'Total',
            data: [
              { label: 'Principal', value: r.principal },
              { label: 'Interest', value: r.interest },
            ],
          },
        ]
      : [
          {
            kind: 'donut' as const,
            title: 'Principal vs interest',
            centerLabel: 'Total',
            data: [
              { label: 'Principal', value: r.principal },
              { label: 'Interest', value: r.interest },
            ],
          },
        ],

  table: (r) =>
    r.rows.length > 1
      ? {
          title: 'Year by year',
          previewRows: 10,
          csvName: 'finora-simple-interest',
          columns: [
            { key: 'year', label: 'Year', align: 'left' },
            { key: 'simple', label: 'Simple interest balance' },
            { key: 'compound', label: 'Compounded balance' },
            { key: 'gap', label: 'Difference' },
          ],
          rows: r.rows.map((row) => ({
            year: String(row.year),
            simple: formatINR(row.simple),
            compound: formatINR(row.compound),
            gap: formatINR(row.compound - row.simple),
          })),
          csvRows: r.rows.map((row) => ({
            year: row.year,
            simple: Math.round(row.simple),
            compound: Math.round(row.compound),
            gap: Math.round(row.compound - row.simple),
          })),
        }
      : null,

  summary: (r, v) =>
    `Simple interest on ${formatINR(r.principal)} at ${formatPercent(num(v.rate))} for ${periodText(
      r,
      v,
    )}: ${formatINR(r.interest)}. Total ${formatINR(r.amount)}.`,

  content: {
    howItWorks: [
      'Simple interest is charged only on the original principal. The interest never joins the balance, so every year earns exactly the same amount and the total grows in a straight line.',
      'That is the key difference from compound interest, where each year’s interest is added to the balance and earns interest itself. Over one year the two are identical; over longer periods compounding pulls steadily ahead, and the comparison above shows by how much.',
      'Simple interest is how most informal loans, gold loans, some car loans and non-cumulative deposits are quoted — the interest is paid out or settled rather than left to accumulate.',
    ],
    formula: `SI = P × R × T ÷ 100
Amount = P + SI

P = principal   R = annual rate (%)   T = time in years
(months ÷ 12, or days ÷ 365)`,
    example: [
      '₹1,00,000 at 8% a year for 3 years.',
      'SI = 1,00,000 × 8 × 3 ÷ 100 = ₹24,000, so the total amount is ₹1,24,000.',
      'Compounded yearly, the same money would reach ₹1,25,971 — ₹1,971 more.',
    ],
    assumptions: [
      'Interest accrues evenly through the period and is not added to the principal.',
      'Periods in days use a 365-day year.',
    ],
    notes: [
      'A rate quoted “per month” must be multiplied by 12 before you enter it. 1.5% a month is 18% a year.',
      'A “flat rate” loan charges simple interest on the original amount for the whole tenure — its true cost is much higher. Use the Flat vs Reducing Rate calculator to see the real rate.',
    ],
    faqs: [
      {
        q: 'What is the difference between simple and compound interest?',
        a: 'Simple interest is always calculated on the original principal. Compound interest is calculated on the principal plus the interest already earned, so it grows faster the longer the money stays invested.',
      },
      {
        q: 'How do I calculate interest for a few months?',
        a: 'Convert the time to years: 18 months is 1.5 years, 90 days is 90 ÷ 365 years. Choose Months or Days above and the calculator does the conversion.',
      },
      {
        q: 'How do I find the rate if I know the interest?',
        a: 'Rearrange the formula: R = SI × 100 ÷ (P × T). For ₹24,000 interest on ₹1,00,000 over 3 years, R = 24,000 × 100 ÷ 3,00,000 = 8%.',
      },
    ],
  },
};

export default simpleInterest;
