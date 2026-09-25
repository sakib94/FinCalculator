import type { CalculatorDef, Values } from '../types';
import { calculateNetWorth, type NetWorthResult } from '@/engines/utility';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  cash: num(v.cash),
  deposits: num(v.deposits),
  investments: num(v.investments),
  retirement: num(v.retirement),
  realEstate: num(v.realEstate),
  gold: num(v.gold),
  vehicles: num(v.vehicles),
  otherAssets: num(v.otherAssets),
  homeLoan: num(v.homeLoan),
  carLoan: num(v.carLoan),
  personalLoan: num(v.personalLoan),
  creditCard: num(v.creditCard),
  otherLiabilities: num(v.otherLiabilities),
  monthlyIncome: num(v.monthlyIncome),
  monthlyExpenses: num(v.monthlyExpenses),
});

const money = (name: string, label: string, def: number, group: string, help?: string) =>
  ({
    name,
    label,
    type: 'currency' as const,
    default: def,
    min: 0,
    max: 10000000000,
    optional: true,
    group,
    ...(help ? { help } : {}),
  });

const netWorth: CalculatorDef<NetWorthResult> = {
  id: 'net-worth',

  groups: [
    { id: 'assets', title: 'What you own' },
    { id: 'liabilities', title: 'What you owe' },
    { id: 'cashflow', title: 'Monthly cash flow', collapsible: true, defaultOpen: false },
  ],

  fields: [
    money('cash', 'Cash & bank balance', 200000, 'assets'),
    money('deposits', 'Fixed & recurring deposits', 500000, 'assets'),
    money('investments', 'Stocks & mutual funds', 1200000, 'assets'),
    money('retirement', 'EPF / PPF / NPS', 900000, 'assets', 'Retirement money you cannot easily access before maturity.'),
    money('realEstate', 'Real estate', 6000000, 'assets', 'Current market value, not what you paid.'),
    money('gold', 'Gold & jewellery', 400000, 'assets'),
    money('vehicles', 'Vehicles', 600000, 'assets', 'Resale value today, not the invoice price.'),
    money('otherAssets', 'Other assets', 0, 'assets'),

    money('homeLoan', 'Home loan outstanding', 3500000, 'liabilities'),
    money('carLoan', 'Car / vehicle loan', 300000, 'liabilities'),
    money('personalLoan', 'Personal loan', 0, 'liabilities'),
    money('creditCard', 'Credit card dues', 25000, 'liabilities'),
    money('otherLiabilities', 'Other liabilities', 0, 'liabilities'),

    money('monthlyIncome', 'Monthly take-home income', 150000, 'cashflow'),
    money('monthlyExpenses', 'Monthly expenses', 80000, 'cashflow', 'Including EMIs. Used for the emergency fund check.'),
  ],

  compute: (v) => calculateNetWorth(toInput(v)),

  hero: (r) => ({
    label: 'Your net worth',
    value: formatINR(r.netWorth),
    caption: `${formatINRCompact(r.totalAssets)} in assets less ${formatINRCompact(
      r.totalLiabilities,
    )} of debt`,
  }),

  stats: (r) => [
    { label: 'Total assets', value: formatINR(r.totalAssets), tone: 'positive' },
    { label: 'Total liabilities', value: formatINR(r.totalLiabilities), tone: 'negative' },
    {
      label: 'Liquid net worth',
      value: formatINR(r.liquidNetWorth),
      tone: 'accent',
      help: 'Cash, deposits and market investments less all debt — what you could actually realise quickly.',
    },
    {
      label: 'Debt to assets',
      value: formatPercent(r.debtToAssetPct, 1),
      tone: r.debtToAssetPct > 50 ? 'negative' : 'default',
      help: 'Below 50% is generally considered comfortable.',
    },
    {
      label: 'Emergency fund',
      value: `${r.emergencyFundMonths.toFixed(1)} months`,
      tone: r.emergencyFundMonths >= 6 ? 'positive' : 'negative',
      help: 'Liquid assets divided by monthly expenses. Six months is the usual target.',
    },
    {
      label: 'Annual savings',
      value: formatINR(r.annualSavings),
      tone: r.annualSavings > 0 ? 'positive' : 'negative',
    },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Where your assets sit',
      centerLabel: 'Assets',
      data: r.assetLines.map((l) => ({ label: l.label, value: l.amount })),
    },
    ...(r.liabilityLines.length > 0
      ? [
          {
            kind: 'donut' as const,
            title: 'What you owe',
            centerLabel: 'Debt',
            data: r.liabilityLines.map((l) => ({ label: l.label, value: l.amount })),
          },
        ]
      : []),
    {
      kind: 'bar' as const,
      title: 'Assets vs liabilities',
      x: ['Assets', 'Liabilities', 'Net worth'],
      series: [
        { name: 'Amount', values: [r.totalAssets, r.totalLiabilities, Math.max(0, r.netWorth)] },
      ],
    },
  ],

  table: (r) => ({
    title: 'Asset and liability breakdown',
    csvName: 'finora-net-worth',
    columns: [
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'type', label: 'Type', align: 'left' },
      { key: 'amount', label: 'Amount' },
      { key: 'share', label: 'Share' },
    ],
    rows: [
      ...r.assetLines.map((l) => ({
        item: l.label,
        type: 'Asset',
        amount: formatINR(l.amount),
        share: formatPercent(l.sharePct, 1),
      })),
      ...r.liabilityLines.map((l) => ({
        item: l.label,
        type: 'Liability',
        amount: formatINR(l.amount),
        share: formatPercent(l.sharePct, 1),
      })),
    ],
    footer: {
      item: 'Net worth',
      type: '',
      amount: formatINR(r.netWorth),
      share: '',
    },
    csvRows: [
      ...r.assetLines.map((l) => ({ item: l.label, type: 'Asset', amount: Math.round(l.amount) })),
      ...r.liabilityLines.map((l) => ({
        item: l.label,
        type: 'Liability',
        amount: Math.round(l.amount),
      })),
    ],
  }),

  summary: (r) =>
    `Net worth ${formatINR(r.netWorth)} — ${formatINR(r.totalAssets)} in assets, ${formatINR(
      r.totalLiabilities,
    )} in liabilities.`,

  content: {
    howItWorks: [
      'Net worth is the single most honest number in personal finance: everything you own, minus everything you owe. Income tells you what passes through your hands; net worth tells you what actually stayed.',
      'The headline figure matters less than its composition. Two people with ₹1 crore net worth are in very different positions if one holds it entirely in a house they live in and the other has half of it in liquid investments. That is what the liquid net worth figure separates out.',
      'The debt-to-assets ratio shows how much of what you "own" the lender still has a claim on. Below 50% is generally comfortable; above 70% leaves very little room if income stops or asset values fall.',
      'Track this once or twice a year rather than monthly. Net worth moves slowly, and checking it too often turns a long-term measure into noise.',
    ],
    formula: `Net worth       = total assets − total liabilities
Liquid net worth = (cash + deposits + market investments) − total liabilities
Debt to assets   = total liabilities ÷ total assets × 100
Emergency fund   = liquid assets ÷ monthly expenses`,
    example: [
      'Assets: ₹96 lakh (₹60L property, ₹12L investments, ₹9L retirement, ₹7L deposits, ₹6L vehicle, ₹2L cash).',
      'Liabilities: ₹38.25 lakh (₹35L home loan, ₹3L car loan, ₹25,000 card dues).',
      'Net worth is ₹57.75 lakh, but liquid net worth is negative — the debt exceeds what could be sold quickly.',
    ],
    assumptions: [
      'Assets are entered at current market value, not purchase price. Vehicles in particular are usually worth far less than people assume.',
      'Retirement balances are counted as assets even though they cannot be accessed freely, which is why they are excluded from the liquid figure.',
      'No allowance is made for capital gains tax that would be due if assets were actually sold.',
      'Future income and pension entitlements are not counted — net worth is a snapshot of today.',
    ],
    notes: [
      'A common benchmark is that net worth should reach roughly your annual income by 30, three times by 40 and six times by 50 — rough targets, not rules.',
      'Your own home is an asset but not an investment you can spend. Many planners exclude it when judging financial independence.',
      'Credit card dues carried month to month are the most expensive liability on this list, often 36–48% a year. Clear them before almost anything else.',
    ],
    faqs: [
      {
        q: 'Should I include my house in net worth?',
        a: 'Yes — it is genuinely an asset, offset by the outstanding home loan. But look at the liquid net worth figure too, because a house you live in cannot be spent without finding somewhere else to live.',
      },
      {
        q: 'What is a good net worth?',
        a: 'There is no universal figure; it depends on age, income and cost of living. Progress matters more than level — a net worth that rises every year, and a debt-to-assets ratio that falls, is the signal to watch.',
      },
      {
        q: 'Why is my liquid net worth negative?',
        a: 'Because your debts exceed the assets you could realise quickly. That is common for people early into a home loan and is not necessarily a problem, but it does mean a job loss would force you to sell something illiquid.',
      },
      {
        q: 'How often should I calculate this?',
        a: 'Once or twice a year is plenty. Net worth is a slow-moving measure, and checking it monthly mostly captures market noise rather than real progress.',
      },
    ],
  },
};

export default netWorth;
