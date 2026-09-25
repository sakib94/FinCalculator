import type { CalculatorDef, Values } from '../types';
import { calculateInflation, type InflationResult } from '@/engines/investment';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  amount: num(v.amount),
  inflationRatePct: num(v.inflation),
  years: num(v.years),
  investmentReturnPct: num(v.returnRate),
});

const inflation: CalculatorDef<InflationResult> = {
  id: 'inflation',

  fields: [
    {
      name: 'amount',
      label: 'Amount Today',
      type: 'currency',
      default: 100000,
      min: 1,
      max: 1000000000,
      slider: true,
      step: 10000,
      help: 'A cost you know today — a monthly budget, a fee, a purchase price.',
    },
    {
      name: 'inflation',
      label: 'Expected Inflation Rate',
      type: 'percent',
      default: 6,
      min: 0,
      max: 25,
      step: 0.25,
      slider: true,
      help: 'India’s CPI inflation has averaged roughly 5–6% over the last decade. Education and healthcare run higher.',
    },
    {
      name: 'years',
      label: 'Number of Years',
      type: 'number',
      default: 15,
      min: 1,
      max: 60,
      unit: 'yrs',
      slider: true,
    },
    {
      name: 'returnRate',
      label: 'Your Investment Return',
      type: 'percent',
      default: 10,
      min: 0,
      max: 30,
      step: 0.5,
      slider: true,
      optional: true,
      help: 'Used to show whether your money is actually growing after inflation.',
    },
  ],

  compute: (v) => calculateInflation(toInput(v)),

  hero: (r, v) => [
    {
      label: `What ${formatINRCompact(num(v.amount))} will cost in ${num(v.years)} years`,
      value: formatINR(r.futureCost),
      caption: `At ${formatPercent(num(v.inflation))} inflation a year`,
    },
    {
      label: 'What today’s money will be worth then',
      value: formatINR(r.purchasingPower),
      caption: `You lose ${formatPercent(r.valueLostPct, 1)} of its purchasing power`,
    },
  ],

  stats: (r) => [
    { label: 'Purchasing power lost', value: formatINR(r.valueLost), tone: 'negative' },
    { label: 'Real (inflation-adjusted) return', value: formatPercent(r.realReturnPct), tone: r.realReturnPct >= 0 ? 'positive' : 'negative' },
    { label: 'Investment value then', value: formatINR(r.investmentValue) },
    {
      label: 'That value in today’s money',
      value: formatINR(r.investmentValueInTodaysMoney),
      tone: 'accent',
      help: 'What your investment would buy if prices had stayed where they are now.',
    },
  ],

  charts: (r) => [
    {
      kind: 'line' as const,
      title: 'Rising cost vs falling purchasing power',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      series: [
        { name: 'What it will cost', values: r.rows.map((row) => row.cost) },
        { name: 'What today’s money buys', values: r.rows.map((row) => row.purchasingPower) },
      ],
    },
  ],

  table: (r) => ({
    title: 'Year-wise impact',
    previewRows: 10,
    csvName: 'finora-inflation-projection',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'cost', label: 'Cost then' },
      { key: 'power', label: 'Value of today’s money' },
    ],
    rows: r.rows.map((row) => ({
      year: String(row.year),
      cost: formatINR(row.cost),
      power: formatINR(row.purchasingPower),
    })),
    csvRows: r.rows.map((row) => ({
      year: row.year,
      cost: Math.round(row.cost),
      power: Math.round(row.purchasingPower),
    })),
  }),

  summary: (r) =>
    `Future cost ${formatINR(r.futureCost)}; today’s money will be worth ${formatINR(
      r.purchasingPower,
    )}. Real return ${formatPercent(r.realReturnPct)}.`,

  content: {
    howItWorks: [
      'Inflation works exactly like compound interest, but against you. A cost of ₹1,00,000 growing at 6% a year becomes ₹1,79,085 in ten years — and the ₹1,00,000 sitting in your account buys only ₹55,839 worth of the same goods.',
      'The figure that really matters is the real return: what your investment earns after inflation is stripped out. An 8% return during 6% inflation is not an 8% gain, it is roughly 1.9% of genuine purchasing power.',
    ],
    formula: `Future cost       = amount × (1 + inflation)ᵗ
Purchasing power  = amount ÷ (1 + inflation)ᵗ
Real return       = (1 + return) ÷ (1 + inflation) − 1`,
    example: [
      '₹1,00,000 with 6% inflation over 15 years.',
      'Future cost = 1,00,000 × 1.06¹⁵ = about ₹2,39,656.',
      'The same ₹1,00,000 kept in cash would buy only about ₹41,727 worth of goods by then.',
    ],
    assumptions: [
      'Inflation is constant every year. In reality it moves with fuel prices, food supply and monetary policy.',
      'Your personal inflation may differ from the headline CPI — education and healthcare have historically risen faster than 6%.',
      'The real return formula uses the exact Fisher relation, not the rough “return minus inflation” shortcut.',
    ],
    faqs: [
      {
        q: 'What inflation rate should I use for planning?',
        a: '6% is a reasonable general assumption for India. Use 8–10% for education costs and healthcare, which have consistently risen faster than the overall index.',
      },
      {
        q: 'Why is real return not simply return minus inflation?',
        a: 'Because both compound. The exact formula is (1 + return) ÷ (1 + inflation) − 1. At low rates the shortcut is close; at high rates it overstates your gain noticeably.',
      },
      {
        q: 'Does this mean holding cash is bad?',
        a: 'Cash loses purchasing power steadily, so it is poorly suited to long-term goals. It remains the right place for an emergency fund, where availability matters more than return.',
      },
    ],
  },
};

export default inflation;
