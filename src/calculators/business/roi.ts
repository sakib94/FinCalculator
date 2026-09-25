import type { CalculatorDef, Values } from '../types';
import { calculateROI, type RoiResult } from '@/engines/business';
import { formatINR, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  amountInvested: num(v.amountInvested),
  currentValue: num(v.currentValue),
  years: num(v.years),
  additionalCosts: num(v.additionalCosts),
});

const roi: CalculatorDef<RoiResult> = {
  id: 'roi',

  fields: [
    {
      name: 'amountInvested',
      label: 'Amount Invested',
      type: 'currency',
      default: 500000,
      min: 0,
      max: 1000000000,
      help: 'The capital you put in at the start.',
    },
    {
      name: 'currentValue',
      label: 'Current / Final Value',
      type: 'currency',
      default: 850000,
      min: 0,
      max: 1000000000,
      help: 'What the investment is worth now, or what you sold it for.',
    },
    {
      name: 'additionalCosts',
      label: 'Additional Costs',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      optional: true,
      help: 'Brokerage, stamp duty, maintenance, renovation — anything else you spent on it.',
    },
    {
      name: 'years',
      label: 'Holding Period',
      type: 'number',
      default: 4,
      min: 0,
      max: 60,
      step: 0.25,
      unit: 'yrs',
      slider: true,
      optional: true,
      help: 'Needed for the annualised return. Leave at 0 for a plain ROI.',
    },
  ],

  compute: (v) => calculateROI(toInput(v)),

  hero: (r) => [
    {
      label: 'Return on investment',
      value: formatPercent(r.roiPct, 2),
      caption: r.profitable ? `A gain of ${formatINR(r.netGain)}` : `A loss of ${formatINR(Math.abs(r.netGain))}`,
    },
    {
      label: 'Annualised return',
      value: r.annualisedPct ? formatPercent(r.annualisedPct, 2) : '—',
      caption: r.annualisedPct ? 'CAGR — comparable across holding periods' : 'Enter a holding period to see this',
    },
  ],

  stats: (r) => [
    { label: 'Total cost', value: formatINR(r.totalCost) },
    { label: 'Net gain', value: formatINR(r.netGain), tone: r.profitable ? 'positive' : 'negative' },
    { label: 'Money multiple', value: `${r.multiple.toFixed(2)}×`, tone: 'accent' },
  ],

  charts: (r) => [
    {
      kind: 'bar' as const,
      title: 'Cost vs value',
      x: ['Total cost', 'Current value'],
      series: [{ name: 'Amount', values: [r.totalCost, r.totalCost + r.netGain] }],
    },
  ],

  summary: (r) =>
    `ROI ${formatPercent(r.roiPct, 2)} — ${r.profitable ? 'gain' : 'loss'} of ${formatINR(
      Math.abs(r.netGain),
    )}${r.annualisedPct ? `, annualised ${formatPercent(r.annualisedPct, 2)}` : ''}.`,

  content: {
    howItWorks: [
      'ROI measures how much you made relative to what you put in. It is deliberately simple — gain divided by cost — which makes it easy to compare across very different investments, from a property to a marketing campaign.',
      'Its weakness is that it ignores time. Doubling your money in two years and in twenty are both 100% ROI. That is why the annualised return matters: it converts the total gain into a per-year rate you can compare with a fixed deposit or an index fund.',
    ],
    formula: `ROI          = (final value − total cost) ÷ total cost × 100
Total cost   = amount invested + additional costs
Annualised   = (final value ÷ total cost)^(1 ÷ years) − 1`,
    example: [
      '₹5,00,000 invested, worth ₹8,50,000 after 4 years, with no extra costs.',
      'ROI = (8,50,000 − 5,00,000) ÷ 5,00,000 = 70%.',
      'Annualised = (8.5 ÷ 5)^(1/4) − 1 = about 14.2% a year.',
    ],
    assumptions: [
      'All costs are entered up front. Costs incurred later in the holding period slightly overstate the annualised figure.',
      'No interim income such as dividends or rent is counted — add it to the final value if you want the total return.',
      'Tax is not deducted. Post-tax ROI can be materially lower.',
    ],
    faqs: [
      {
        q: 'Is a higher ROI always better?',
        a: 'Not on its own. Compare annualised returns, and factor in risk and liquidity. A 40% ROI over ten years is under 3.5% a year — less than a fixed deposit.',
      },
      {
        q: 'Should I include brokerage and taxes?',
        a: 'Include every cost you actually paid in “additional costs” for a realistic figure. Ignoring them can flatter a return by a surprising margin on short holdings.',
      },
      {
        q: 'What is the difference between ROI and CAGR?',
        a: 'ROI is the total percentage gain over the whole period. CAGR spreads that gain evenly across the years to give an annual rate, which is what lets you compare investments held for different lengths of time.',
      },
    ],
  },
};

export default roi;
