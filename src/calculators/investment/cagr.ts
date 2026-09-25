import type { CalculatorDef, Values } from '../types';
import { calculateCAGR, type CagrMode, type CagrResult } from '@/engines/planning';
import { formatINR, formatNumber, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const modeOf = (v: Values): CagrMode => (str(v.mode, 'rate') === 'value' ? 'value' : 'rate');

const cagr: CalculatorDef<CagrResult> = {
  id: 'cagr',

  fields: [
    {
      name: 'mode',
      label: 'What do you want to find?',
      type: 'segmented',
      prominent: true,
      default: 'rate',
      options: [
        { label: 'Growth rate (CAGR)', value: 'rate' },
        { label: 'Future value', value: 'value' },
      ],
    },
    {
      name: 'initial',
      label: 'Initial Value',
      type: 'currency',
      default: 100000,
      min: 1,
      max: 10000000000,
      slider: true,
      step: 1000,
      help: 'What the investment was worth, or what you paid, at the start.',
    },
    {
      name: 'final',
      label: 'Final Value',
      type: 'currency',
      default: 250000,
      min: 0,
      max: 10000000000,
      slider: true,
      step: 1000,
      visible: (v) => modeOf(v) === 'rate',
      help: 'What it is worth now, or what you sold it for.',
    },
    {
      name: 'rate',
      label: 'Annual Growth Rate (CAGR)',
      type: 'percent',
      default: 12,
      min: -50,
      max: 100,
      step: 0.5,
      slider: true,
      visible: (v) => modeOf(v) === 'value',
    },
    {
      name: 'years',
      label: 'Duration',
      type: 'number',
      default: 7,
      min: 0.25,
      max: 60,
      step: 0.25,
      unit: 'yrs',
      slider: true,
      help: 'Fractions work too — 2 years 6 months is 2.5.',
    },
    {
      name: 'inflation',
      label: 'Inflation',
      type: 'percent',
      default: 6,
      min: 0,
      max: 20,
      step: 0.25,
      optional: true,
      help: 'Optional. Used to show the real, after-inflation growth rate.',
    },
  ],

  compute: (v) =>
    calculateCAGR({
      mode: modeOf(v),
      initial: num(v.initial),
      final: num(v.final),
      ratePct: num(v.rate),
      years: num(v.years),
      inflationPct: num(v.inflation),
    }),

  hero: (r) =>
    r.mode === 'rate'
      ? {
          label: 'Compound annual growth rate',
          value: formatPercent(r.cagrPct),
          caption: `${formatINR(r.initial)} → ${formatINR(r.final)} in ${formatNumber(r.years, 2)} years`,
        }
      : {
          label: 'Future value',
          value: formatINR(r.final),
          caption: `${formatINR(r.initial)} growing at ${formatPercent(r.cagrPct)} a year for ${formatNumber(
            r.years,
            2,
          )} years`,
        },

  stats: (r, v) => [
    {
      label: r.mode === 'rate' ? 'Total gain' : 'Estimated gain',
      value: formatINR(r.gain),
      tone: r.gain >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Absolute return',
      value: formatPercent(r.absoluteReturnPct, 1),
      help: 'Total growth over the whole period, not annualised.',
    },
    { label: 'Growth multiple', value: `${formatNumber(r.multiple, 2)}×`, tone: 'accent' },
    ...(r.doublingYears > 0
      ? [
          {
            label: 'Doubles every',
            value: `${formatNumber(r.doublingYears, 1)} yrs`,
            help: 'How long money takes to double at this rate. The Rule of 72 gives a quick estimate: 72 ÷ rate.',
          },
        ]
      : []),
    ...(num(v.inflation) > 0
      ? [
          {
            label: 'Real CAGR after inflation',
            value: formatPercent(r.realCagrPct),
            tone: r.realCagrPct >= 0 ? ('positive' as const) : ('negative' as const),
            help: 'Growth in purchasing power: (1 + CAGR) ÷ (1 + inflation) − 1.',
          },
        ]
      : []),
  ],

  charts: (r) =>
    r.rows.length > 2
      ? [
          {
            kind: 'line' as const,
            title: 'Value at a steady CAGR',
            x: r.rows.map((row) => (row.year === 0 ? 'Start' : `Y${row.year}`)),
            xLabel: 'Year',
            area: true,
            series: [{ name: 'Value', values: r.rows.map((row) => row.value) }],
          },
        ]
      : [],

  table: (r) =>
    r.rows.length > 2
      ? {
          title: 'Year-wise value at this CAGR',
          previewRows: 12,
          csvName: 'finora-cagr',
          columns: [
            { key: 'year', label: 'Year', align: 'left' },
            { key: 'value', label: 'Value' },
            { key: 'gain', label: 'Gain so far' },
          ],
          rows: r.rows.map((row) => ({
            year: row.year === 0 ? 'Start' : String(row.year),
            value: formatINR(row.value),
            gain: formatINR(row.value - r.initial),
          })),
          csvRows: r.rows.map((row) => ({
            year: row.year,
            value: Math.round(row.value),
            gain: Math.round(row.value - r.initial),
          })),
          note: 'A CAGR is a smoothed rate. The real investment will have moved up and down along the way; this table shows the steady path that ends at the same value.',
        }
      : null,

  summary: (r) =>
    r.mode === 'rate'
      ? `CAGR ${formatPercent(r.cagrPct)}: ${formatINR(r.initial)} grew to ${formatINR(r.final)} in ${formatNumber(
          r.years,
          2,
        )} years (${formatNumber(r.multiple, 2)}×).`
      : `${formatINR(r.initial)} at ${formatPercent(r.cagrPct)} CAGR for ${formatNumber(
          r.years,
          2,
        )} years grows to ${formatINR(r.final)}.`,

  content: {
    howItWorks: [
      'CAGR — compound annual growth rate — is the single steady yearly rate that would take a starting value to an ending value over a given time. It turns an uneven journey (up 30% one year, down 10% the next) into one comparable number.',
      'That is why CAGR is the standard way to compare mutual funds, stocks, property and business revenue over different periods. Absolute return tells you how much you made in total; CAGR tells you how fast.',
      'Switch to “Future value” to run it the other way: start from an amount and a rate, and see what it grows to.',
    ],
    formula: `CAGR = (Final ÷ Initial)^(1 ÷ years) − 1
Future value = Initial × (1 + CAGR)^years
Doubling time = ln 2 ÷ ln(1 + CAGR)  ≈ 72 ÷ CAGR%`,
    example: [
      'An investment of ₹1,00,000 is worth ₹2,50,000 after 7 years.',
      'CAGR = (2,50,000 ÷ 1,00,000)^(1/7) − 1 = 2.5^0.1429 − 1 ≈ 13.99% a year.',
      'The absolute return is 150%, but spread over seven years the money grew about 14% a year.',
    ],
    assumptions: [
      'No money was added or withdrawn in between. For SIPs or irregular cash flows the right measure is XIRR, not CAGR.',
      'The result is a smoothed average; it says nothing about how volatile the path was.',
    ],
    notes: [
      'For periods under a year, CAGR annualises a short-term return and can look misleadingly large. Absolute return is more honest there.',
      'Compare CAGRs only over the same period — a fund’s 3-year and 10-year CAGRs describe very different market conditions.',
    ],
    faqs: [
      {
        q: 'What is the difference between CAGR and absolute return?',
        a: 'Absolute return is the total percentage gain regardless of time. CAGR spreads that gain over the years it took. Doubling your money is a 100% absolute return, but a 14.9% CAGR over 5 years and only a 7.2% CAGR over 10.',
      },
      {
        q: 'What is a good CAGR?',
        a: 'It depends on the asset and the risk. Beating inflation (around 5–6% in India) is the minimum. Fixed deposits give roughly 6.5–7.5%, and diversified equity funds have historically delivered around 11–13% over long periods, with no guarantee.',
      },
      {
        q: 'Can CAGR be used for SIP returns?',
        a: 'Not directly. A SIP invests at many dates, so each instalment has a different holding period. Use XIRR for SIP returns, or the Mutual Fund calculator to project them.',
      },
    ],
  },
};

export default cagr;
