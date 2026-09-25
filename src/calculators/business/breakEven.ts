import type { CalculatorDef, ValidationErrors, Values } from '../types';
import { calculateBreakEven, type BreakEvenResult } from '@/engines/businessPlus';
import { formatINR, formatNumber, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  fixedCosts: num(v.fixedCosts),
  pricePerUnit: num(v.pricePerUnit),
  variableCostPerUnit: num(v.variableCost),
  targetProfit: num(v.targetProfit),
  expectedUnits: num(v.expectedUnits),
});

const breakEven: CalculatorDef<BreakEvenResult> = {
  id: 'break-even',

  fields: [
    {
      name: 'fixedCosts',
      label: 'Fixed Costs (per period)',
      type: 'currency',
      default: 300000,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 10000,
      help: 'Costs that do not change with volume — rent, salaries, insurance, loan interest.',
    },
    {
      name: 'pricePerUnit',
      label: 'Selling Price per Unit',
      type: 'currency',
      default: 1000,
      min: 0,
      max: 10000000,
      slider: true,
      step: 50,
    },
    {
      name: 'variableCost',
      label: 'Variable Cost per Unit',
      type: 'currency',
      default: 600,
      min: 0,
      max: 10000000,
      slider: true,
      step: 50,
      help: 'Costs incurred only when you make or sell one more unit — materials, packing, commission.',
    },
    {
      name: 'expectedUnits',
      label: 'Units You Expect to Sell',
      type: 'number',
      default: 1200,
      min: 0,
      max: 10000000,
      slider: true,
      step: 50,
      unit: 'units',
      help: 'Used to work out your margin of safety — how far sales can fall before you lose money.',
    },
    {
      name: 'targetProfit',
      label: 'Target Profit',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 25000,
      optional: true,
      help: 'Optional. Shows the volume needed to earn a specific profit, not just to break even.',
    },
  ],

  validate: (v: Values): ValidationErrors => {
    if (num(v.variableCost) >= num(v.pricePerUnit))
      return {
        variableCost:
          'Variable cost must be below the selling price, or every sale loses money and there is no break-even.',
      };
    return {};
  },

  compute: (v) => calculateBreakEven(toInput(v)),

  hero: (r) => [
    {
      label: 'Break-even point',
      value: `${formatNumber(r.breakEvenUnits)} units`,
      caption: `${formatINR(r.breakEvenRevenue)} of revenue covers all your costs`,
    },
    {
      label: 'Contribution per unit',
      value: formatINR(r.contributionPerUnit),
      caption: `${formatPercent(r.contributionMarginPct, 1)} of the selling price`,
    },
  ],

  stats: (r, v) => [
    { label: 'Break-even revenue', value: formatINR(r.breakEvenRevenue) },
    { label: 'Contribution margin', value: formatPercent(r.contributionMarginPct, 2), tone: 'accent' },
    {
      label: 'Expected profit',
      value: formatINR(r.expectedProfit),
      tone: r.expectedProfit >= 0 ? 'positive' : 'negative',
      help: 'At the sales volume you entered.',
    },
    {
      label: 'Margin of safety',
      value: formatPercent(r.marginOfSafetyPct, 1),
      tone: r.marginOfSafetyPct >= 20 ? 'positive' : 'negative',
      help: 'How far sales can fall before you start losing money. Above 20% is comfortable.',
    },
    {
      label: 'Safety in units',
      value: `${formatNumber(r.marginOfSafetyUnits)} units`,
    },
    ...(num(v.targetProfit) > 0
      ? [
          {
            label: 'Units for target profit',
            value: `${formatNumber(r.unitsForTargetProfit)} units`,
            tone: 'accent' as const,
          },
          {
            label: 'Revenue for target profit',
            value: formatINR(r.revenueForTargetProfit),
          },
        ]
      : []),
  ],

  charts: (r) => [
    {
      kind: 'line' as const,
      title: 'Revenue and cost — they cross at break-even',
      x: r.rows.map((row) => formatNumber(row.units)),
      xLabel: 'Units',
      series: [
        { name: 'Revenue', values: r.rows.map((row) => row.revenue) },
        { name: 'Total cost', values: r.rows.map((row) => row.totalCost) },
      ],
    },
    {
      kind: 'donut' as const,
      title: 'Where each unit of revenue goes',
      centerLabel: 'Price',
      data: [
        { label: 'Variable cost', value: r.minimumViablePrice },
        { label: 'Contribution', value: r.contributionPerUnit },
      ],
    },
  ],

  table: (r) => ({
    title: 'Profit at different volumes',
    csvName: 'finora-break-even',
    columns: [
      { key: 'units', label: 'Units', align: 'left' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'cost', label: 'Total cost' },
      { key: 'profit', label: 'Profit / (loss)' },
    ],
    rows: r.rows.map((row) => ({
      units: formatNumber(row.units),
      revenue: formatINR(row.revenue),
      cost: formatINR(row.totalCost),
      profit: formatINR(row.profit),
    })),
    csvRows: r.rows.map((row) => ({
      units: row.units,
      revenue: Math.round(row.revenue),
      totalCost: Math.round(row.totalCost),
      profit: Math.round(row.profit),
    })),
    note: 'Profit turns positive once volume passes the break-even point.',
  }),

  summary: (r) =>
    `Break-even at ${formatNumber(r.breakEvenUnits)} units (${formatINR(
      r.breakEvenRevenue,
    )}), contribution ${formatINR(r.contributionPerUnit)} per unit.`,

  content: {
    howItWorks: [
      'Every unit you sell brings in its price and costs you its variable cost. The difference — the contribution — goes towards paying the fixed costs. Break-even is simply the point at which enough units have been sold for those contributions to cover the fixed costs entirely. Past it, each further contribution is profit.',
      'This is why the contribution margin matters more than the headline price. Two products selling at ₹1,000 are completely different businesses if one has a ₹600 variable cost and the other ₹200: the second breaks even in a third of the volume.',
      'The margin of safety is the number most worth watching. It tells you how far sales can fall before you start losing money. A business breaking even at 90% of expected sales has almost no room for a bad quarter; one breaking even at 50% can absorb a serious downturn.',
      'Fixed costs are only fixed within a range. Doubling volume usually means another shift, another machine or a bigger unit — at which point the fixed cost steps up and the break-even point resets.',
    ],
    formula: `Contribution per unit = price − variable cost

                    fixed costs
Break-even units = ──────────────────
                   contribution/unit

Break-even revenue = break-even units × price

                            fixed costs + target profit
Units for target profit = ─────────────────────────────
                              contribution per unit

Margin of safety = (expected − break-even) ÷ expected × 100`,
    example: [
      'Fixed costs ₹3,00,000 a month, selling price ₹1,000, variable cost ₹600.',
      'Contribution is ₹400 a unit, so break-even is 3,00,000 ÷ 400 = 750 units, or ₹7,50,000 of revenue.',
      'Expecting 1,200 units gives a margin of safety of 37.5% and a profit of ₹1,80,000.',
    ],
    assumptions: [
      'Selling price stays the same at every volume. In practice, larger volumes often require discounting.',
      'Variable cost per unit is constant. Bulk purchasing usually reduces it as volume rises.',
      'Fixed costs stay fixed across the whole range shown. They step up once capacity is exceeded.',
      'Everything produced is sold, with no inventory build-up.',
      'Only one product, or a constant sales mix across products.',
    ],
    notes: [
      'For a business selling many products, work in contribution margin ratio terms: break-even revenue = fixed costs ÷ contribution margin ratio.',
      'Include the owner’s salary and loan interest in fixed costs. Leaving them out produces a break-even point that looks achievable but is not.',
      'A margin of safety below 20% is fragile. Either raise price, cut variable cost, or reduce the fixed cost base.',
      'The fastest lever is usually price: a 10% price rise with an unchanged cost base moves break-even far more than a 10% cost cut.',
    ],
    faqs: [
      {
        q: 'What is the difference between fixed and variable costs?',
        a: 'Fixed costs are incurred whether you sell anything or not — rent, salaries, insurance. Variable costs arise only when you make or sell one more unit — materials, packaging, sales commission. Some costs are mixed; split them.',
      },
      {
        q: 'How do I break even faster?',
        a: 'Three levers: raise the price, cut the variable cost per unit, or reduce fixed costs. Price usually has the largest effect because it increases contribution directly without any operational change.',
      },
      {
        q: 'What if my variable cost exceeds the selling price?',
        a: 'Then there is no break-even point at all — every additional sale increases the loss. This is worth knowing before scaling up, because volume makes it worse rather than better.',
      },
      {
        q: 'How does this work with multiple products?',
        a: 'Use the weighted-average contribution margin ratio across your sales mix, and compute break-even in revenue rather than units. The result holds only while the mix stays roughly constant.',
      },
    ],
  },
};

export default breakEven;
