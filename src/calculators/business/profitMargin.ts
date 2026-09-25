import type { CalculatorDef, Values } from '../types';
import { calculateProfitMargin, type ProfitMarginResult } from '@/engines/businessPlus';
import { formatINR, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  revenue: num(v.revenue),
  cogs: num(v.cogs),
  operatingExpenses: num(v.operatingExpenses),
  otherIncome: num(v.otherIncome),
  interestExpense: num(v.interestExpense),
  taxRatePct: num(v.taxRate),
});

const profitMargin: CalculatorDef<ProfitMarginResult> = {
  id: 'profit-margin',

  fields: [
    {
      name: 'revenue',
      label: 'Revenue / Net Sales',
      type: 'currency',
      default: 5000000,
      min: 0,
      max: 10000000000,
      slider: true,
      step: 100000,
      help: 'Total sales for the period, net of returns and discounts.',
    },
    {
      name: 'cogs',
      label: 'Cost of Goods Sold',
      type: 'currency',
      default: 3000000,
      min: 0,
      max: 10000000000,
      slider: true,
      step: 100000,
      help: 'Direct costs only — materials, direct labour, freight inward. Not rent or salaries of admin staff.',
    },
    {
      name: 'operatingExpenses',
      label: 'Operating Expenses',
      type: 'currency',
      default: 1200000,
      min: 0,
      max: 10000000000,
      slider: true,
      step: 50000,
      help: 'Rent, salaries, marketing, utilities, depreciation — the cost of running the business.',
    },
    {
      name: 'otherIncome',
      label: 'Other Income',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 10000,
      optional: true,
      help: 'Interest earned, rent received, scrap sales — income not from your main trade.',
    },
    {
      name: 'interestExpense',
      label: 'Interest Expense',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 10000,
      optional: true,
      help: 'Interest on business loans and working capital.',
    },
    {
      name: 'taxRate',
      label: 'Effective Tax Rate',
      type: 'percent',
      default: 25,
      min: 0,
      max: 50,
      step: 1,
      slider: true,
      help: 'Domestic companies are typically at 25% or 22% under section 115BAA.',
    },
  ],

  compute: (v) => calculateProfitMargin(toInput(v)),

  hero: (r) => [
    {
      label: 'Net profit margin',
      value: formatPercent(r.netMarginPct, 2),
      caption: `${formatINR(r.netProfit)} of net profit on ${formatINR(r.revenue)} of revenue`,
    },
    {
      label: 'Gross profit margin',
      value: formatPercent(r.grossMarginPct, 2),
      caption: `${formatINR(r.grossProfit)} after direct costs`,
    },
  ],

  stats: (r) => [
    { label: 'Gross profit', value: formatINR(r.grossProfit), tone: 'positive' },
    {
      label: 'Operating profit',
      value: formatINR(r.operatingProfit),
      tone: r.operatingProfit >= 0 ? 'positive' : 'negative',
    },
    { label: 'Operating margin', value: formatPercent(r.operatingMarginPct, 2) },
    { label: 'Profit before tax', value: formatINR(r.profitBeforeTax) },
    { label: 'Tax', value: formatINR(r.taxAmount), tone: 'negative' },
    {
      label: 'Net profit',
      value: formatINR(r.netProfit),
      tone: r.profitable ? 'positive' : 'negative',
    },
    {
      label: 'Markup on cost',
      value: formatPercent(r.markupPct, 2),
      tone: 'accent',
      help: 'The same gross profit expressed against cost instead of revenue. Always higher than the margin.',
    },
    {
      label: 'Cost ratio',
      value: formatPercent(r.costRatioPct, 1),
      help: 'Total costs as a share of revenue.',
    },
  ],

  charts: (r) => [
    {
      kind: 'bar' as const,
      title: 'From revenue to net profit',
      x: ['Revenue', 'Gross profit', 'Operating profit', 'Net profit'],
      series: [
        {
          name: 'Amount',
          values: [
            r.revenue,
            Math.max(0, r.grossProfit),
            Math.max(0, r.operatingProfit),
            Math.max(0, r.netProfit),
          ],
        },
      ],
    },
    {
      kind: 'donut' as const,
      title: 'Where every rupee of revenue goes',
      centerLabel: 'Revenue',
      data: [
        { label: 'Cost of goods sold', value: Math.max(0, r.revenue - r.grossProfit) },
        { label: 'Operating expenses', value: Math.max(0, r.grossProfit - r.operatingProfit) },
        { label: 'Tax', value: Math.max(0, r.taxAmount) },
        { label: 'Net profit', value: Math.max(0, r.netProfit) },
      ],
    },
  ],

  table: (r) => ({
    title: 'Profit and loss summary',
    csvName: 'finora-profit-margin',
    columns: [
      { key: 'item', label: 'Particulars', align: 'left' },
      { key: 'amount', label: 'Amount' },
      { key: 'margin', label: '% of revenue' },
    ],
    rows: [
      { item: 'Revenue', amount: formatINR(r.revenue), margin: '100.00%' },
      { item: 'Less: cost of goods sold', amount: formatINR(r.revenue - r.grossProfit), margin: formatPercent(100 - r.grossMarginPct, 2) },
      { item: 'Gross profit', amount: formatINR(r.grossProfit), margin: formatPercent(r.grossMarginPct, 2) },
      { item: 'Less: operating expenses', amount: formatINR(r.grossProfit - r.operatingProfit), margin: formatPercent(r.grossMarginPct - r.operatingMarginPct, 2) },
      { item: 'Operating profit (EBIT)', amount: formatINR(r.operatingProfit), margin: formatPercent(r.operatingMarginPct, 2) },
      { item: 'Profit before tax', amount: formatINR(r.profitBeforeTax), margin: formatPercent((r.profitBeforeTax / Math.max(1, r.revenue)) * 100, 2) },
      { item: 'Less: tax', amount: formatINR(r.taxAmount), margin: formatPercent((r.taxAmount / Math.max(1, r.revenue)) * 100, 2) },
    ],
    footer: {
      item: 'Net profit',
      amount: formatINR(r.netProfit),
      margin: formatPercent(r.netMarginPct, 2),
    },
  }),

  summary: (r) =>
    `Net margin ${formatPercent(r.netMarginPct, 2)} — ${formatINR(r.netProfit)} on ${formatINR(
      r.revenue,
    )} revenue. Gross margin ${formatPercent(r.grossMarginPct, 2)}.`,

  content: {
    howItWorks: [
      'Margin is always profit divided by REVENUE. Markup is profit divided by COST. They describe the same trade but produce different numbers, and confusing them is the most expensive arithmetic mistake in small business: a 50% markup is only a 33.3% margin, and a 100% markup is a 50% margin.',
      'Three margins are worth tracking, and they answer different questions. Gross margin shows whether the product itself makes money after direct costs. Operating margin shows whether the business makes money after the cost of running it. Net margin shows what is actually left for the owners after interest and tax.',
      'The gap between them is diagnostic. A healthy gross margin with a poor operating margin means the product works but overheads are too heavy. A weak gross margin means the problem is pricing or input costs, and no amount of cost-cutting elsewhere will fix it.',
      'Margins are only meaningful against an industry benchmark. Groceries run on 2–3% net margins and survive on volume; software can exceed 25%. Comparing your margin to a different industry’s tells you nothing.',
    ],
    formula: `Gross profit     = revenue − cost of goods sold
Operating profit = gross profit − operating expenses
Profit before tax = operating profit + other income − interest
Net profit       = profit before tax − tax

Margin = profit ÷ revenue × 100
Markup = gross profit ÷ cost × 100`,
    example: [
      'Revenue ₹50,00,000, COGS ₹30,00,000, operating expenses ₹12,00,000, tax at 25%.',
      'Gross profit ₹20,00,000 → 40% gross margin. Operating profit ₹8,00,000 → 16% operating margin.',
      'After 25% tax, net profit is ₹6,00,000 — a 12% net margin. The markup on cost, by contrast, is 66.7%.',
    ],
    assumptions: [
      'Revenue is net of returns, discounts and GST. GST is not your income and must be excluded.',
      'COGS includes only direct costs. Putting overheads here understates the gross margin and misleads pricing decisions.',
      'Depreciation is treated as an operating expense, which is standard but does mean operating profit is an accounting figure, not cash.',
      'The tax rate is applied to profit before tax as a flat percentage. Actual liability depends on disallowances, deductions and MAT.',
    ],
    notes: [
      'Indicative net margins: FMCG 5–10%, retail 2–5%, restaurants 3–8%, manufacturing 5–12%, professional services 15–25%, software 15–30%.',
      'To convert markup to margin: margin = markup ÷ (100 + markup) × 100. A 50% markup becomes a 33.3% margin.',
      'Rising revenue with a falling gross margin usually means you are discounting to buy growth. It is worth knowing before it becomes a habit.',
      'Operating profit is often called EBIT. Add depreciation and amortisation back and you get EBITDA, which lenders use as a rough proxy for cash generation.',
    ],
    faqs: [
      {
        q: 'What is the difference between margin and markup?',
        a: 'Margin is profit as a share of the selling price; markup is profit as a share of cost. A product costing ₹100 sold at ₹150 carries a 50% markup but a 33.3% margin. Quoting one while thinking of the other is how businesses accidentally underprice.',
      },
      {
        q: 'Which margin should I focus on?',
        a: 'Gross margin for pricing and product decisions, operating margin for judging how efficiently the business runs, and net margin for what owners actually keep. If only one, watch gross margin — it is the earliest warning of trouble.',
      },
      {
        q: 'What counts as cost of goods sold?',
        a: 'Only costs that vary directly with production: raw materials, direct labour, freight inward, packaging. Rent, admin salaries, marketing and depreciation belong in operating expenses.',
      },
      {
        q: 'Is a high margin always better?',
        a: 'Not necessarily. A lower margin at much higher volume can produce more absolute profit, which is the entire business model of supermarkets. What matters is margin multiplied by volume, against the capital employed.',
      },
    ],
  },
};

export default profitMargin;
