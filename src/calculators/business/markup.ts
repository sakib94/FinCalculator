import type { CalculatorDef, Values } from '../types';
import { calculateMarkup, type MarkupMode, type MarkupResult } from '@/engines/business';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  mode: str(v.mode, 'fromMarkup') as MarkupMode,
  cost: num(v.cost),
  markupPct: num(v.markupPct),
  sellingPrice: num(v.sellingPrice),
  marginPct: num(v.marginPct),
});

const markup: CalculatorDef<MarkupResult> = {
  id: 'markup',

  fields: [
    {
      name: 'mode',
      label: 'I want to find',
      type: 'select',
      default: 'fromMarkup',
      wide: true,
      options: [
        { label: 'Selling price from cost + markup %', value: 'fromMarkup' },
        { label: 'Markup & margin from cost + selling price', value: 'fromPrice' },
        { label: 'Selling price from cost + target margin %', value: 'fromMargin' },
      ],
    },
    {
      name: 'cost',
      label: 'Cost Price',
      type: 'currency',
      default: 1000,
      min: 0,
      max: 1000000000,
      help: 'What the item costs you, landed.',
    },
    {
      name: 'markupPct',
      label: 'Markup',
      type: 'percent',
      default: 40,
      min: 0,
      max: 1000,
      step: 0.5,
      slider: true,
      visible: (v) => v.mode === 'fromMarkup',
      help: 'Profit as a percentage of cost.',
    },
    {
      name: 'marginPct',
      label: 'Target Margin',
      type: 'percent',
      default: 30,
      min: 0,
      max: 99,
      step: 0.5,
      slider: true,
      visible: (v) => v.mode === 'fromMargin',
      help: 'Profit as a percentage of the selling price.',
    },
    {
      name: 'sellingPrice',
      label: 'Selling Price',
      type: 'currency',
      default: 1400,
      min: 0,
      max: 1000000000,
      visible: (v) => v.mode === 'fromPrice',
    },
  ],

  compute: (v) => calculateMarkup(toInput(v)),

  hero: (r, v) =>
    str(v.mode, 'fromMarkup') === 'fromPrice'
      ? [
          { label: 'Markup', value: formatPercent(r.markupPct, 2), caption: 'Profit as a percentage of cost' },
          { label: 'Gross margin', value: formatPercent(r.marginPct, 2), caption: 'Profit as a percentage of the selling price' },
        ]
      : [
          { label: 'Selling price', value: formatINR(r.sellingPrice, 2), caption: `Profit of ${formatINR(r.profit, 2)} per unit` },
          { label: 'Gross margin', value: formatPercent(r.marginPct, 2), caption: `Markup ${formatPercent(r.markupPct, 2)}` },
        ],

  stats: (r) => [
    { label: 'Cost price', value: formatINR(r.cost, 2) },
    { label: 'Selling price', value: formatINR(r.sellingPrice, 2) },
    { label: 'Profit per unit', value: formatINR(r.profit, 2), tone: r.profit >= 0 ? 'positive' : 'negative' },
    { label: 'Markup', value: formatPercent(r.markupPct, 2) },
    { label: 'Margin', value: formatPercent(r.marginPct, 2), tone: 'accent' },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Selling price split',
      centerLabel: 'Price',
      format: (n: number) => formatINR(n, 2),
      data: [
        { label: 'Cost', value: r.cost },
        { label: 'Profit', value: Math.max(0, r.profit) },
      ],
    },
  ],

  summary: (r) =>
    `Cost ${formatINR(r.cost, 2)} → selling price ${formatINR(r.sellingPrice, 2)}: markup ${formatPercent(
      r.markupPct,
      2,
    )}, margin ${formatPercent(r.marginPct, 2)}.`,

  content: {
    intro: {
      heading: 'What is markup?',
      paragraphs: [
        'Markup is the amount added to a product’s cost to arrive at its selling price, expressed as a percentage of cost. A product that costs ₹1,000 and sells for ₹1,400 has a 40% markup. It is how many shops and manufacturers set prices — but it is easily confused with margin, which is profit as a percentage of the selling price.',
        'This markup calculator finds the selling price from a markup or target margin, or the markup and margin from a cost and a selling price, and converts between the two.',
      ],
    },
    sections: [
      {
        heading: 'Markup vs margin conversion',
        table: {
          columns: ['Markup on cost', 'Equivalent margin on price'],
          rows: [
            ['10%', '9.1%'],
            ['20%', '16.7%'],
            ['25%', '20%'],
            ['33.3%', '25%'],
            ['50%', '33.3%'],
            ['100%', '50%'],
          ],
        },
        after: [
          'Margin = markup ÷ (100 + markup) × 100; markup = margin ÷ (100 − margin) × 100. A 100% markup — doubling the cost — gives only a 50% margin.',
        ],
      },
    ],
    guides: ['how-to-calculate-percentage', 'how-gst-works'],
    howItWorks: [
      'Markup and margin describe the same profit from two different angles, and confusing them is one of the most common pricing mistakes in small business. Markup is profit as a percentage of what you paid. Margin is profit as a percentage of what you charged.',
      'Because the denominators differ, the two numbers are never equal. A 50% markup is only a 33.3% margin. Pricing at a “50% margin” when you meant markup leaves a large hole in your numbers.',
    ],
    formula: `Selling price = cost × (1 + markup ÷ 100)
Markup %      = (price − cost) ÷ cost × 100
Margin %      = (price − cost) ÷ price × 100
Price from margin = cost ÷ (1 − margin ÷ 100)`,
    example: [
      'Cost ₹1,000 with a 40% markup: selling price = 1,000 × 1.40 = ₹1,400.',
      'Profit is ₹400, which is 40% of cost (markup) but 28.6% of the ₹1,400 price (margin).',
      'To hit a 40% margin instead, you would price at 1,000 ÷ 0.60 = ₹1,667.',
    ],
    assumptions: [
      'Cost is the landed cost — purchase price plus freight, duty and other direct costs.',
      'GST is not included. Add it on top of the selling price using the GST calculator.',
      'This is gross margin. Overheads, salaries and rent come out of it before you see net profit.',
    ],
    faqs: [
      {
        q: 'What is the difference between markup and margin?',
        a: 'Markup is profit ÷ cost; margin is profit ÷ selling price. A 100% markup doubles the price and gives a 50% margin. Margin can never exceed 100%, but markup can.',
      },
      {
        q: 'How do I price for a target margin?',
        a: 'Divide the cost by (1 − margin). For a 30% margin on a ₹1,000 cost: 1,000 ÷ 0.70 = ₹1,429. Multiplying by 1.30 gives you a 30% markup instead, which is only a 23% margin.',
      },
      {
        q: 'What margin should I aim for?',
        a: 'It depends entirely on the industry — grocery retail runs on single-digit margins and turns stock fast, while software and services often exceed 70%. Compare against your own overheads, not a general benchmark.',
      },
      {
        q: 'Should I use markup or margin to set prices?',
        a: 'Margin is what matters for profitability, because costs and discounts are usually discussed as a share of sales. Work out the margin you need to cover overheads and profit, then convert it to the markup to apply on cost.',
      },
    ],
  },
};

export default markup;
