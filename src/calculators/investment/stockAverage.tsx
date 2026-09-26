import type { CalculatorDef, ValidationErrors, Values } from '../types';
import { calculateStockAverage, type StockAverageResult } from '@/engines/planning';
import { formatINR, formatNumber, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';
import { Note } from '@/components/Results';

const LOTS = [1, 2, 3] as const;
const price = (n: number) => formatINR(n, 2);

const toInput = (v: Values) => ({
  lots: LOTS.map((i) => ({ quantity: num(v[`qty${i}`]), price: num(v[`price${i}`]) })),
  currentPrice: num(v.currentPrice),
  targetAverage: num(v.targetAverage),
});

const stockAverage: CalculatorDef<StockAverageResult> = {
  id: 'stock-average',

  groups: [
    { id: 'lot1', title: 'First purchase' },
    { id: 'lot2', title: 'Second purchase' },
    { id: 'lot3', title: 'Third purchase (optional)', collapsible: true },
    { id: 'market', title: 'Today’s price & target (optional)', collapsible: true, defaultOpen: true },
  ],

  fields: [
    { name: 'qty1', label: 'Quantity', type: 'number', default: 50, min: 0, max: 100000000, unit: 'shares', group: 'lot1' },
    { name: 'price1', label: 'Buy Price', type: 'currency', default: 1250, min: 0, max: 10000000, group: 'lot1' },
    { name: 'qty2', label: 'Quantity', type: 'number', default: 30, min: 0, max: 100000000, unit: 'shares', group: 'lot2' },
    { name: 'price2', label: 'Buy Price', type: 'currency', default: 980, min: 0, max: 10000000, group: 'lot2' },
    { name: 'qty3', label: 'Quantity', type: 'number', default: 0, min: 0, max: 100000000, unit: 'shares', optional: true, group: 'lot3' },
    { name: 'price3', label: 'Buy Price', type: 'currency', default: 0, min: 0, max: 10000000, optional: true, group: 'lot3' },
    {
      name: 'currentPrice',
      label: 'Current Market Price',
      type: 'currency',
      default: 1020,
      min: 0,
      max: 10000000,
      optional: true,
      group: 'market',
      help: 'Optional. Used to show your profit or loss, and to work out how many shares to buy to reach a target average.',
    },
    {
      name: 'targetAverage',
      label: 'Target Average Price',
      type: 'currency',
      default: 0,
      min: 0,
      max: 10000000,
      optional: true,
      group: 'market',
      help: 'Optional. The average price you want to bring your holding to by buying more at the current price.',
    },
  ],

  validate: (v): ValidationErrors =>
    LOTS.every((i) => num(v[`qty${i}`]) <= 0 || num(v[`price${i}`]) <= 0)
      ? { qty1: 'Enter at least one purchase with a quantity and a price.' }
      : {},

  compute: (v) => calculateStockAverage(toInput(v)),

  hero: (r) => ({
    label: 'Average buy price',
    value: price(r.averagePrice),
    caption: `${formatNumber(r.totalQuantity)} shares · ${formatINR(r.totalCost)} invested`,
  }),

  stats: (r, v) => [
    { label: 'Total shares', value: formatNumber(r.totalQuantity) },
    { label: 'Total invested', value: formatINR(r.totalCost) },
    ...(num(v.currentPrice) > 0
      ? [
          { label: 'Current value', value: formatINR(r.currentValue), tone: 'accent' as const },
          {
            label: r.profit >= 0 ? 'Unrealised profit' : 'Unrealised loss',
            value: `${formatINR(Math.abs(r.profit))} (${formatPercent(Math.abs(r.profitPct), 2)})`,
            tone: r.profit >= 0 ? ('positive' as const) : ('negative' as const),
          },
          {
            label: 'Breakeven move needed',
            value:
              r.averagePrice > 0 ? formatPercent(((r.averagePrice - num(v.currentPrice)) / num(v.currentPrice)) * 100, 2) : '—',
            help: 'How far the share price must move from here for the whole holding to break even (before brokerage and taxes).',
          },
        ]
      : []),
    ...(r.unitsForTarget != null && r.unitsForTarget > 0
      ? [
          {
            label: `Buy to reach ${price(num(v.targetAverage))}`,
            value: `${formatNumber(r.unitsForTarget)} shares`,
            tone: 'accent' as const,
            help: `Costs about ${formatINR(r.costForTarget)} at the current price.`,
          },
        ]
      : []),
  ],

  charts: (r) =>
    r.lots.length > 1
      ? [
          {
            kind: 'donut' as const,
            title: 'Money invested by purchase',
            centerLabel: 'Invested',
            data: r.lots.map((l, i) => ({ label: `Buy ${i + 1} @ ${price(l.price)}`, value: l.cost })),
          },
        ]
      : [],

  table: (r) => ({
    title: 'Your purchases',
    columns: [
      { key: 'lot', label: 'Purchase', align: 'left' },
      { key: 'qty', label: 'Quantity' },
      { key: 'price', label: 'Price' },
      { key: 'cost', label: 'Amount' },
    ],
    rows: r.lots.map((l, i) => ({
      lot: `Buy ${i + 1}`,
      qty: formatNumber(l.quantity),
      price: price(l.price),
      cost: formatINR(l.cost),
    })),
    csvName: 'finora-stock-average',
    footer: {
      lot: 'Total / average',
      qty: formatNumber(r.totalQuantity),
      price: price(r.averagePrice),
      cost: formatINR(r.totalCost),
    },
  }),

  extra: (r, v) => {
    if (r.targetReason === 'unreachable')
      return (
        <Note tone="warn">
          A target of {price(num(v.targetAverage))} cannot be reached by buying at {price(num(v.currentPrice))}. Buying
          more can only move your average towards the current price — the target has to lie between your average (
          {price(r.averagePrice)}) and today’s price.
        </Note>
      );
    if (r.targetReason === 'no-price')
      return <Note>Enter the current market price to see how many shares reach your target average.</Note>;
    return null;
  },

  summary: (r) =>
    `Average price ${price(r.averagePrice)} across ${formatNumber(r.totalQuantity)} shares (${formatINR(r.totalCost)} invested).`,

  content: {
    intro: {
      heading: 'What is a stock average calculator?',
      paragraphs: [
        'When you buy the same share at different prices, your cost per share is the weighted average of all your purchases: total amount paid divided by total shares held. That average decides your profit or loss, and how far the price must move for you to break even.',
        'This stock average calculator combines up to three purchases, shows your average buy price, total investment, current value and unrealised profit or loss, the move needed to break even, and how many shares you would need to buy at today’s price to bring your average down to a target.',
      ],
    },
    sections: [
      {
        heading: 'Worked example: averaging down',
        paragraphs: [
          'You bought 50 shares at ₹1,250 and later 30 more at ₹980. You now hold 80 shares for ₹91,900, an average of ₹1,148.75. At today’s price of ₹1,020 the holding is worth ₹81,600 — an unrealised loss of ₹10,300 (11.2%). The share has to rise about 12.6% from here for you to break even.',
          'Buying more at a lower price reduced the average from ₹1,250, but it also increased the amount at risk in a share that was falling.',
        ],
      },
      {
        heading: 'When averaging down makes sense — and when it does not',
        bullets: [
          'It can make sense when the fall is due to market-wide weakness and the company’s business and outlook are unchanged.',
          'It is dangerous when the price is falling because the business has deteriorated — a lower average does not help if the share keeps falling.',
          'Set a limit on how much of your portfolio any single stock can become before you add more.',
          'For diversified mutual funds, regular SIPs achieve the same averaging automatically and with far less concentration risk.',
        ],
      },
    ],
    guides: ['what-is-cagr', 'how-to-calculate-percentage'],
    howItWorks: [
      'When you buy the same share at different prices, your cost per share is the weighted average: the total amount paid divided by the total number of shares. Bigger purchases pull the average further towards their price.',
      'Enter today’s market price to see your unrealised profit or loss. Add a target average and the calculator works out how many shares you would need to buy at today’s price to bring your average to that level — the question behind “averaging down”.',
      'It works equally for mutual fund units, ETFs, gold or crypto — anything bought in lots at different prices.',
    ],
    formula: `Average price = (q₁ × p₁ + q₂ × p₂ + …) ÷ (q₁ + q₂ + …)

Shares to buy at price c to reach target T:
n = Q × (A − T) ÷ (T − c)      Q = shares held, A = current average`,
    example: [
      '50 shares at ₹1,250 and 30 more at ₹980.',
      'Average = (62,500 + 29,400) ÷ 80 = ₹1,148.75.',
      'At a market price of ₹1,020, bringing the average to ₹1,100 needs 80 × 48.75 ÷ 80 ≈ 49 more shares.',
    ],
    assumptions: [
      'Brokerage, STT, stamp duty and other charges are not included in the cost. Add them to the buy price if you want the exact figure.',
      'For tax purposes, India uses first-in-first-out when you sell, not the average — this average is for tracking, not for computing capital gains.',
    ],
    notes: [
      'Averaging down lowers your breakeven, but it also increases your exposure to a share that is falling. Buy more only if your reason for owning it still holds.',
      'Bonus issues and splits change the quantity and price but not the total cost — adjust the quantities and prices accordingly.',
    ],
    faqs: [
      {
        q: 'How do I calculate my average share price?',
        a: 'Multiply each purchase’s quantity by its price, add the results, and divide by the total number of shares. The calculator does this for up to three purchases.',
      },
      {
        q: 'Does averaging down work?',
        a: 'Mathematically it lowers your average cost. Whether it is a good decision depends on the business — averaging into a fundamentally weak company only increases the loss.',
      },
      {
        q: 'Why can’t I reach my target average?',
        a: 'Buying at today’s price can only move your average towards today’s price. If your target is below the current market price (while averaging down), no quantity will get you there.',
      },
      {
        q: 'Does the average price include brokerage and charges?',
        a: 'For an accurate picture, yes: add brokerage, STT, stamp duty and exchange charges to each purchase’s cost. Your broker’s contract notes list them.',
      },
      {
        q: 'Is the average price used to calculate capital gains tax?',
        a: 'Not exactly. For tax, shares are treated as sold on a first-in, first-out basis, so the gain on each sale uses the cost of the earliest shares you still hold, not the average. Your broker’s capital gains statement applies this rule.',
      },
    ],
  },
};

export default stockAverage;
