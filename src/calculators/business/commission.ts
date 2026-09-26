import type { CalculatorDef, Values } from '../types';
import { calculateCommission, type CommissionResult } from '@/engines/business';
import { formatINR, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  saleValue: num(v.saleValue),
  commissionPct: num(v.commissionPct),
  flatFee: num(v.flatFee),
  splitPct: num(v.splitPct),
  units: num(v.units),
});

const commission: CalculatorDef<CommissionResult> = {
  id: 'commission',

  fields: [
    {
      name: 'saleValue',
      label: 'Sale Value',
      type: 'currency',
      default: 5000000,
      min: 0,
      max: 10000000000,
      help: 'The total value of the transaction the commission is calculated on.',
    },
    {
      name: 'commissionPct',
      label: 'Commission Rate',
      type: 'percent',
      default: 2,
      min: 0,
      max: 100,
      step: 0.1,
      slider: true,
    },
    {
      name: 'flatFee',
      label: 'Fixed Fee',
      type: 'currency',
      default: 0,
      min: 0,
      max: 100000000,
      optional: true,
      help: 'Any flat amount charged on top of the percentage.',
    },
    {
      name: 'splitPct',
      label: 'Your Share of the Commission',
      type: 'percent',
      default: 100,
      min: 0,
      max: 100,
      step: 1,
      slider: true,
      help: 'Use this when the commission is shared with a brokerage, a co-agent or a referrer.',
    },
    {
      name: 'units',
      label: 'Number of Deals / Units',
      type: 'number',
      default: 1,
      min: 1,
      max: 100000,
      optional: true,
      help: 'Splits the commission across deals to show a per-deal figure.',
    },
  ],

  compute: (v) => calculateCommission(toInput(v)),

  hero: (r, v) => [
    {
      label: 'Commission earned',
      value: formatINR(r.grossCommission),
      caption: `Effective rate ${formatPercent(r.effectiveRatePct, 2)} of the sale value`,
    },
    ...(num(v.splitPct) < 100
      ? [
          {
            label: 'Your share',
            value: formatINR(r.yourShare),
            caption: `${formatPercent(num(v.splitPct))} of the total commission`,
          },
        ]
      : []),
  ],

  stats: (r, v) => [
    { label: 'Gross commission', value: formatINR(r.grossCommission), tone: 'positive' },
    ...(num(v.splitPct) < 100
      ? [
          { label: 'Your share', value: formatINR(r.yourShare), tone: 'accent' as const },
          { label: 'Partner share', value: formatINR(r.partnerShare) },
        ]
      : []),
    { label: 'Net to seller', value: formatINR(r.netToSeller) },
    ...(num(v.units) > 1 ? [{ label: 'Per deal', value: formatINR(r.perUnitCommission) }] : []),
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Sale value split',
      centerLabel: 'Sale',
      data: [
        { label: 'Net to seller', value: Math.max(0, r.netToSeller) },
        { label: 'Commission', value: r.grossCommission },
      ],
    },
  ],

  summary: (r) =>
    `Commission ${formatINR(r.grossCommission)} (${formatPercent(
      r.effectiveRatePct,
      2,
    )} effective); net to seller ${formatINR(r.netToSeller)}.`,

  content: {
    intro: {
      heading: 'What is a commission calculator?',
      paragraphs: [
        'A commission is a payment for arranging a sale, usually a percentage of the sale value, sometimes plus a flat fee. Real estate brokers, insurance and mutual fund distributors, sales staff and marketplace sellers are all paid this way. When several agents share a deal, the commission is split between them.',
        'This commission calculator works out the commission on a sale from the rate, any flat fee and your share of a split, and the effective percentage you earn.',
      ],
    },
    sections: [
      {
        heading: 'Commission, GST and TDS on a property sale',
        table: {
          caption: '₹50 lakh sale at a 2% brokerage',
          columns: ['Item', 'Amount'],
          rows: [
            ['Commission (2%)', '₹1,00,000'],
            ['GST at 18% (if the broker is GST-registered)', '₹18,000'],
            ['Total paid by the client', '₹1,18,000'],
            ['TDS under 194H at 2% (if the payer must deduct)', '₹2,000'],
          ],
        },
        after: [
          'Commission for services is subject to 18% GST when the agent is registered. Businesses paying commission above ₹20,000 in a year generally deduct 2% TDS under Section 194H; individuals not running a business usually do not.',
        ],
      },
    ],
    guides: ['how-to-calculate-percentage', 'how-gst-works'],
    howItWorks: [
      'Commission is a percentage of the transaction value, sometimes with a fixed fee added. The effective rate shown accounts for that fixed fee, which is why it can differ from the percentage you entered.',
      'Where the commission is shared — between a brokerage and an agent, or with a referrer — the split percentage separates your share from the rest.',
    ],
    formula: `Commission     = sale value × rate ÷ 100 + fixed fee
Your share     = commission × split ÷ 100
Net to seller  = sale value − commission
Effective rate = commission ÷ sale value × 100`,
    example: [
      'A ₹50,00,000 property sale at 2% commission.',
      'Commission = ₹1,00,000; the seller nets ₹49,00,000.',
      'On a 50/50 split with the brokerage, the agent receives ₹50,000.',
    ],
    assumptions: [
      'The commission is calculated on the full sale value, not on profit.',
      'GST on the commission and TDS deducted by the payer are not included.',
    ],
    notes: [
      'Commission income is taxable. Payers usually deduct TDS under section 194H at 2% (5% before the 2024 revision).',
      'If your commission income crosses the GST threshold, GST applies on the commission itself.',
    ],
    faqs: [
      {
        q: 'What is a typical real-estate commission in India?',
        a: 'Usually 1–2% from each side of a sale, and one to two months’ rent on a rental agreement. Rates are negotiable and vary by city.',
      },
      {
        q: 'Is TDS deducted on commission?',
        a: 'Yes. Section 194H requires TDS on commission and brokerage above the annual threshold. You claim credit for it when filing your return.',
      },
      {
        q: 'How are sales commissions usually structured?',
        a: 'Common structures are a flat percentage of sales, tiered rates that rise once targets are met, a fixed fee per sale, or a base salary plus commission. For shared deals, the commission is split in agreed percentages before any deductions.',
      },
      {
        q: 'Is commission income taxable?',
        a: 'Yes. Commission paid to an employee is part of salary. Commission earned as an independent agent is business or professional income, taxed after deducting related expenses; any TDS deducted by payers is credited against the final tax.',
      },
    ],
  },
};

export default commission;
