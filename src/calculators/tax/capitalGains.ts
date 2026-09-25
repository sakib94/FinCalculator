import type { CalculatorDef, Values } from '../types';
import {
  ASSET_RULES,
  calculateCapitalGains,
  type AssetClass,
  type CapitalGainsResult,
} from '@/engines/taxTools';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  assetClass: str(v.assetClass, 'equity') as AssetClass,
  purchasePrice: num(v.purchasePrice),
  salePrice: num(v.salePrice),
  expenses: num(v.expenses),
  holdingMonths: num(v.holdingMonths),
  slabRatePct: num(v.slabRate),
  exemptionUsed: num(v.exemptionUsed),
});

const isSlabAsset = (v: Values) => {
  const rule = ASSET_RULES[str(v.assetClass, 'equity') as AssetClass];
  if (!rule) return false;
  // Debt funds are always slab-taxed; others only when short-term.
  return rule.slabTaxed || (num(v.holdingMonths) < rule.longTermMonths && rule.shortTermRatePct === 0);
};

const isEquity = (v: Values) => str(v.assetClass, 'equity') === 'equity';

const capitalGains: CalculatorDef<CapitalGainsResult> = {
  id: 'capital-gains',

  fields: [
    {
      name: 'assetClass',
      label: 'Asset type',
      type: 'select',
      default: 'equity',
      wide: true,
      options: Object.values(ASSET_RULES).map((r) => ({ label: r.label, value: r.id })),
      help: 'Holding period and tax rate both depend on what you sold.',
    },
    {
      name: 'purchasePrice',
      label: 'Purchase Price',
      type: 'currency',
      default: 500000,
      min: 0,
      max: 10000000000,
      slider: true,
      step: 50000,
      help: 'What you originally paid, including any cost of improvement.',
    },
    {
      name: 'salePrice',
      label: 'Sale Price',
      type: 'currency',
      default: 900000,
      min: 0,
      max: 10000000000,
      slider: true,
      step: 50000,
    },
    {
      name: 'expenses',
      label: 'Transfer Expenses',
      type: 'currency',
      default: 0,
      min: 0,
      max: 100000000,
      slider: true,
      step: 10000,
      optional: true,
      help: 'Brokerage, stamp duty, registration and legal costs on the sale. These reduce the gain.',
    },
    {
      name: 'holdingMonths',
      label: 'Holding Period',
      type: 'number',
      default: 24,
      min: 1,
      max: 480,
      unit: 'mo',
      slider: true,
      help: 'Months between purchase and sale. This decides short-term versus long-term.',
    },
    {
      name: 'slabRate',
      label: 'Your Income Tax Slab Rate',
      type: 'percent',
      default: 30,
      min: 0,
      max: 42.744,
      step: 5,
      slider: true,
      visible: isSlabAsset,
      help: 'This gain is taxed at your slab rate, so the calculator needs to know it.',
    },
    {
      name: 'exemptionUsed',
      label: 'LTCG exemption already used',
      type: 'currency',
      default: 0,
      min: 0,
      max: 125000,
      slider: true,
      step: 5000,
      optional: true,
      visible: isEquity,
      help: 'Equity LTCG you have already booked this year against the ₹1.25 lakh annual exemption.',
    },
  ],

  compute: (v) => calculateCapitalGains(toInput(v)),

  hero: (r) => [
    {
      label: `Tax on your ${r.gainType}`,
      value: formatINR(r.totalTax),
      caption:
        r.capitalGain <= 0
          ? 'No tax — this is a capital loss'
          : `${formatPercent(r.taxRatePct, 2)} plus 4% cess on ${formatINRCompact(r.taxableGain)}`,
    },
    {
      label: 'Net proceeds after tax',
      value: formatINR(r.netProceeds),
      caption: `From a ${r.capitalGain >= 0 ? 'gain' : 'loss'} of ${formatINRCompact(Math.abs(r.capitalGain))}`,
    },
  ],

  stats: (r) => [
    {
      label: 'Capital gain',
      value: formatINR(r.capitalGain),
      tone: r.capitalGain >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Gain type',
      value: r.isLongTerm ? 'Long term' : 'Short term',
      tone: r.isLongTerm ? 'positive' : 'negative',
      help: `This asset becomes long-term after ${r.rule.longTermMonths} months.`,
    },
    ...(r.exemptionApplied > 0
      ? [
          {
            label: 'Exemption applied',
            value: formatINR(r.exemptionApplied),
            tone: 'positive' as const,
            help: 'Equity LTCG up to ₹1.25 lakh a year is exempt.',
          },
        ]
      : []),
    { label: 'Taxable gain', value: formatINR(r.taxableGain) },
    { label: 'Tax before cess', value: formatINR(r.taxAmount) },
    { label: 'Health & education cess', value: formatINR(r.cess) },
    {
      label: 'Effective tax on gain',
      value: formatPercent(r.effectiveTaxPct, 2),
      tone: 'accent',
    },
    ...(!r.isLongTerm && r.monthsToLongTerm > 0
      ? [
          {
            label: 'Hold longer by',
            value: `${r.monthsToLongTerm} months`,
            help: 'Waiting until the asset turns long-term usually reduces the tax substantially.',
          },
        ]
      : []),
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Where the sale proceeds go',
      centerLabel: 'Sale',
      data: [
        { label: 'Original cost', value: r.totalCost },
        { label: 'Gain kept', value: Math.max(0, r.capitalGain - r.totalTax) },
        { label: 'Tax paid', value: r.totalTax },
      ],
    },
  ],

  table: (r, v) => ({
    title: 'Capital gains computation',
    csvName: 'finora-capital-gains',
    columns: [
      { key: 'item', label: 'Particulars', align: 'left' },
      { key: 'amount', label: 'Amount' },
    ],
    rows: [
      { item: 'Sale consideration', amount: formatINR(num(v.salePrice)) },
      { item: 'Less: transfer expenses', amount: formatINR(num(v.expenses)) },
      { item: 'Net sale value', amount: formatINR(r.netSaleValue) },
      { item: 'Less: cost of acquisition', amount: formatINR(r.totalCost) },
      { item: `${r.gainType}`, amount: formatINR(r.capitalGain) },
      { item: 'Less: exemption', amount: formatINR(r.exemptionApplied) },
      { item: 'Taxable gain', amount: formatINR(r.taxableGain) },
      { item: `Tax at ${formatPercent(r.taxRatePct, 2)}`, amount: formatINR(r.taxAmount) },
      { item: 'Add: cess at 4%', amount: formatINR(r.cess) },
    ],
    footer: { item: 'Total tax payable', amount: formatINR(r.totalTax) },
    note: r.rule.note,
  }),

  summary: (r) =>
    `${r.gainType} of ${formatINR(r.capitalGain)} — tax ${formatINR(r.totalTax)}, net ${formatINR(
      r.netProceeds,
    )}.`,

  content: {
    howItWorks: [
      'Capital gains tax applies to the profit on selling an asset, not the sale value. The gain is sale price less transfer expenses less what you paid for it. How that gain is taxed depends on two things: what the asset is, and how long you held it.',
      'The Finance (No. 2) Act 2024 reset this regime with effect from 23 July 2024. Holding periods were simplified to 12 months for listed securities and 24 months for everything else. Indexation — which used to let you inflate your purchase cost — was withdrawn. And the long-term rate became a flat 12.5% across asset classes, up from 10% for equity and down from 20% for property.',
      'Only listed equity carries an annual exemption: the first ₹1.25 lakh of long-term gains each year is tax-free. Everything else is taxed from the first rupee.',
      'Short-term gains on property, gold and unlisted shares are simply added to your income and taxed at your slab rate, which for a 30% taxpayer is considerably worse than the 12.5% long-term rate. The months-to-long-term figure above is often the single most valuable number on this page.',
    ],
    formula: `Capital gain = sale price − transfer expenses − cost of acquisition

Long term if holding ≥ 12 months (listed securities)
                     ≥ 24 months (property, gold, unlisted)

Equity   LTCG 12.5% above ₹1.25 lakh  ·  STCG 20%
Property LTCG 12.5%                   ·  STCG at slab
Gold     LTCG 12.5%                   ·  STCG at slab
Debt MF  always at slab rate

Plus 4% health and education cess on the tax.`,
    example: [
      'Equity shares bought for ₹5,00,000 and sold for ₹9,00,000 after 24 months.',
      'Gain is ₹4,00,000, long-term. The first ₹1,25,000 is exempt, leaving ₹2,75,000 taxable.',
      'Tax = 12.5% of 2,75,000 = ₹34,375, plus 4% cess = ₹35,750 in total.',
    ],
    assumptions: [
      'The sale takes place on or after 23 July 2024, under the current regime. Earlier sales follow the old rules including indexation.',
      'For property acquired before 23 July 2024, resident individuals and HUFs may choose 20% with indexation instead of 12.5% without — this calculator applies the 12.5% option only.',
      'Surcharge is not applied. It becomes relevant above ₹50 lakh of total income and is capped at 15% for capital gains.',
      'No reinvestment exemption under sections 54, 54F or 54EC is applied — see the notes.',
      'Set-off of capital losses against other gains is not modelled.',
    ],
    notes: [
      'Section 54 exempts long-term gains on a residential house if you buy another within two years or construct within three.',
      'Section 54EC allows up to ₹50 lakh of property gains to be exempted by investing in NHAI or REC bonds within six months, locked for five years.',
      'Section 54F extends similar relief to gains on any long-term asset if the entire net consideration goes into a residential house.',
      'Long-term capital losses can only be set off against long-term gains; short-term losses can be set off against either. Unabsorbed losses carry forward for eight years, but only if you file your return on time.',
      'Debt mutual funds bought on or after 1 April 2023 have no long-term treatment at all — gains are taxed at your slab rate however long you hold them.',
    ],
    faqs: [
      {
        q: 'What changed in the July 2024 budget?',
        a: 'Three things: holding periods were simplified to 12 and 24 months, indexation benefit was removed, and the long-term rate became a uniform 12.5%. Equity LTCG rose from 10% to 12.5% but the exemption rose from ₹1 lakh to ₹1.25 lakh; property LTCG fell from 20% with indexation to 12.5% without.',
      },
      {
        q: 'Is indexation completely gone?',
        a: 'For most cases, yes. The one carve-out is property acquired before 23 July 2024 by a resident individual or HUF, who may choose whichever of 20%-with-indexation or 12.5%-without produces the lower tax.',
      },
      {
        q: 'How is the ₹1.25 lakh exemption applied?',
        a: 'It is an annual, per-taxpayer exemption on long-term equity gains only. Enter what you have already used this year so the calculator applies only the balance.',
      },
      {
        q: 'Can I avoid capital gains tax on property?',
        a: 'You can defer it by reinvesting: section 54 for buying another house, or section 54EC for capital gains bonds up to ₹50 lakh. Both carry strict time limits and lock-in periods.',
      },
      {
        q: 'What if I made a loss?',
        a: 'A capital loss can be set off against capital gains — long-term losses only against long-term gains, short-term against either. Anything left over carries forward for eight years, provided you file your return by the due date.',
      },
    ],
  },
};

export default capitalGains;
