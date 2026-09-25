import type { CalculatorDef, ValidationErrors, Values } from '../types';
import {
  calculateDepreciation,
  type DepreciationMethod,
  type DepreciationResult,
} from '@/engines/businessPlus';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  assetCost: num(v.assetCost),
  salvageValue: num(v.salvageValue),
  usefulLife: num(v.usefulLife),
  method: str(v.method, 'slm') as DepreciationMethod,
  wdvRatePct: num(v.wdvRate),
});

const depreciation: CalculatorDef<DepreciationResult> = {
  id: 'depreciation',

  fields: [
    {
      name: 'method',
      label: 'Depreciation method',
      type: 'segmented',
      prominent: true,
      default: 'slm',
      options: [
        { label: 'Straight Line', value: 'slm' },
        { label: 'WDV', value: 'wdv' },
        { label: 'Double Declining', value: 'ddb' },
      ],
    },
    {
      name: 'assetCost',
      label: 'Asset Cost',
      type: 'currency',
      default: 1000000,
      min: 0,
      max: 10000000000,
      slider: true,
      step: 50000,
      help: 'Purchase price plus freight, installation and any cost of bringing the asset into use.',
    },
    {
      name: 'salvageValue',
      label: 'Salvage / Residual Value',
      type: 'currency',
      default: 50000,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 10000,
      help: 'Expected resale value at the end of its life. Companies Act practice is 5% of cost.',
    },
    {
      name: 'usefulLife',
      label: 'Useful Life',
      type: 'number',
      default: 10,
      min: 1,
      max: 60,
      unit: 'yrs',
      slider: true,
      help: 'Schedule II of the Companies Act prescribes lives: 60 years for buildings, 15 for plant, 3 for computers.',
    },
    {
      name: 'wdvRate',
      label: 'WDV Rate',
      type: 'percent',
      default: 15,
      min: 1,
      max: 100,
      step: 0.5,
      slider: true,
      visible: (v) => str(v.method, 'slm') === 'wdv',
      help: 'Income Tax Act block rates: 15% plant & machinery, 10% buildings, 40% computers.',
    },
  ],

  validate: (v: Values): ValidationErrors => {
    if (num(v.salvageValue) > num(v.assetCost))
      return { salvageValue: 'Salvage value cannot exceed the asset cost.' };
    return {};
  },

  compute: (v) => calculateDepreciation(toInput(v)),

  hero: (r) => [
    {
      label: 'First year depreciation',
      value: formatINR(r.firstYearDepreciation),
      caption: `${formatPercent(r.effectiveRatePct, 2)} of cost — ${r.methodLabel}`,
    },
    {
      label: 'Book value at end of life',
      value: formatINR(r.finalBookValue),
      caption: `After ${formatINR(r.totalDepreciation)} of total depreciation`,
    },
  ],

  stats: (r) => [
    { label: 'Asset cost', value: formatINR(r.assetCost) },
    { label: 'Salvage value', value: formatINR(r.salvageValue) },
    {
      label: 'Depreciable amount',
      value: formatINR(r.depreciableAmount),
      help: 'Cost less salvage — the total that gets written off over the life.',
    },
    { label: 'Total depreciation', value: formatINR(r.totalDepreciation), tone: 'negative' },
    { label: 'Closing book value', value: formatINR(r.finalBookValue), tone: 'accent' },
  ],

  charts: (r) => [
    {
      kind: 'line' as const,
      title: 'Book value over the asset’s life',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      area: true,
      series: [{ name: 'Book value', values: r.rows.map((row) => row.closingValue) }],
    },
    {
      kind: 'bar' as const,
      title: 'Depreciation charged each year',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      series: [{ name: 'Depreciation', values: r.rows.map((row) => row.depreciation) }],
    },
  ],

  table: (r) => ({
    title: 'Depreciation schedule',
    previewRows: 12,
    csvName: 'finora-depreciation',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'opening', label: 'Opening value' },
      { key: 'depreciation', label: 'Depreciation' },
      { key: 'accumulated', label: 'Accumulated' },
      { key: 'closing', label: 'Closing value' },
    ],
    rows: r.rows.map((row) => ({
      year: String(row.year),
      opening: formatINR(row.openingValue),
      depreciation: formatINR(row.depreciation),
      accumulated: formatINR(row.accumulated),
      closing: formatINR(row.closingValue),
    })),
    csvRows: r.rows.map((row) => ({
      year: row.year,
      opening: Math.round(row.openingValue),
      depreciation: Math.round(row.depreciation),
      accumulated: Math.round(row.accumulated),
      closing: Math.round(row.closingValue),
    })),
    note: `${r.methodLabel}. Depreciation never takes the book value below the salvage value.`,
  }),

  summary: (r) =>
    `${r.methodLabel}: ${formatINR(r.firstYearDepreciation)} in year one, ${formatINR(
      r.totalDepreciation,
    )} total, closing book value ${formatINR(r.finalBookValue)}.`,

  content: {
    howItWorks: [
      'Depreciation spreads the cost of a long-lived asset across the years that actually benefit from it, instead of charging the whole amount in the year of purchase. It is an accounting allocation, not a cash outflow — the money left when you bought the asset.',
      'Straight line divides the depreciable amount evenly across the useful life. It is simple, predictable, and what the Companies Act expects for most financial reporting. Every year carries the same charge.',
      'Written-down value applies a fixed percentage to the shrinking book value, so the charge is heavy early and light later. This is what the Income Tax Act prescribes for most Indian assets, which are grouped into blocks with statutory rates — 15% for plant and machinery, 40% for computers.',
      'Double declining is WDV at twice the straight-line rate. It front-loads the charge even more aggressively, which suits assets that genuinely lose most of their value in the first years — vehicles and IT equipment being the obvious examples.',
      'This is why companies commonly keep two sets of depreciation figures: straight line for the books under the Companies Act, and WDV for the tax computation under the Income Tax Act. The difference creates deferred tax.',
    ],
    formula: `Straight line (SLM)
  Annual charge = (cost − salvage) ÷ useful life

Written down value (WDV)
  Annual charge = opening book value × rate

Double declining
  rate = 2 ÷ useful life
  Annual charge = opening book value × rate

In every method the book value never falls below salvage.`,
    example: [
      'Machine costing ₹10,00,000, salvage ₹50,000, useful life 10 years.',
      'Straight line: (10,00,000 − 50,000) ÷ 10 = ₹95,000 every year.',
      'WDV at 15%: ₹1,50,000 in year one, ₹1,27,500 in year two, falling each year thereafter.',
    ],
    assumptions: [
      'Depreciation runs for a full year from year one. In practice the Companies Act requires pro-rata charging from the date the asset is put to use.',
      'Useful life and salvage value are estimates fixed at the outset. Both can be revised, and a revision changes the charge prospectively.',
      'No additions, disposals or impairment during the life of the asset.',
      'The Income Tax Act works on blocks of assets rather than individual items, and applies half the rate if an asset is used for under 180 days in the year of purchase.',
    ],
    notes: [
      'Schedule II useful lives under the Companies Act: buildings 30–60 years, plant and machinery 15 years, furniture 10 years, vehicles 8–10 years, computers 3 years.',
      'Income Tax block rates: 10% buildings, 15% plant and machinery, 40% computers and software, 30% certain vehicles.',
      'Additional depreciation of 20% is available on new plant and machinery acquired by a manufacturing business, in the year of purchase.',
      'Land is never depreciated. It has no finite useful life.',
      'The Companies Act permits a residual value of no more than 5% of original cost unless justified.',
    ],
    faqs: [
      {
        q: 'Which method should I use?',
        a: 'Straight line for financial statements under the Companies Act, and written-down value for the income tax computation, because that is what each statute expects. Most Indian companies maintain both.',
      },
      {
        q: 'Why does WDV never reach zero?',
        a: 'Because each year takes a percentage of what remains, and a percentage of a positive number is always positive. Under the Income Tax Act the residue stays in the block until every asset in it is sold.',
      },
      {
        q: 'Is depreciation a cash expense?',
        a: 'No. The cash left when you paid for the asset. Depreciation reduces accounting profit and therefore tax, but no money moves — which is why it is added back when calculating cash flow.',
      },
      {
        q: 'What is the difference between depreciation and amortisation?',
        a: 'They are the same allocation applied to different things: depreciation for tangible assets like machinery and buildings, amortisation for intangibles like patents, goodwill and software licences.',
      },
    ],
  },
};

export default depreciation;
