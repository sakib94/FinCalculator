import type { CalculatorDef, Values } from '../types';
import { calculateSWP, type SwpResult } from '@/engines/investmentPlus';
import { formatINR, formatINRCompact, formatDuration } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  initialInvestment: num(v.initialInvestment),
  monthlyWithdrawal: num(v.monthlyWithdrawal),
  expectedReturnPct: num(v.expectedReturn),
  years: num(v.years),
  annualIncreasePct: num(v.annualIncrease),
});

const swp: CalculatorDef<SwpResult> = {
  id: 'swp',

  fields: [
    {
      name: 'initialInvestment',
      label: 'Total Investment',
      type: 'currency',
      default: 5000000,
      min: 10000,
      max: 1000000000,
      slider: true,
      step: 100000,
      help: 'The corpus you start with — typically a retirement lumpsum or accumulated savings.',
    },
    {
      name: 'monthlyWithdrawal',
      label: 'Monthly Withdrawal',
      type: 'currency',
      default: 30000,
      min: 500,
      max: 10000000,
      slider: true,
      step: 1000,
      help: 'The amount you take out each month for living expenses.',
    },
    {
      name: 'expectedReturn',
      label: 'Expected Return',
      type: 'percent',
      default: 9,
      min: 1,
      max: 25,
      step: 0.5,
      slider: true,
      help: 'A withdrawal portfolio is usually more conservative than a growth one — 8–10% for a balanced fund.',
    },
    {
      name: 'years',
      label: 'Withdrawal Period',
      type: 'number',
      default: 20,
      min: 1,
      max: 50,
      unit: 'yrs',
      slider: true,
    },
    {
      name: 'annualIncrease',
      label: 'Annual Increase in Withdrawal',
      type: 'percent',
      default: 0,
      min: 0,
      max: 20,
      step: 1,
      slider: true,
      help: 'Raise the withdrawal every year to keep pace with inflation. Without it, your real income falls each year.',
    },
  ],

  compute: (v) => calculateSWP(toInput(v)),

  hero: (r, v) => [
    {
      label: r.lasts ? 'Balance left at the end' : 'Corpus runs out after',
      value: r.lasts ? formatINR(r.finalBalance) : formatDuration(r.depletedInMonth),
      caption: r.lasts
        ? `After withdrawing ${formatINRCompact(r.totalWithdrawn)} over ${num(v.years)} years`
        : `You withdrew ${formatINRCompact(r.totalWithdrawn)} before it was exhausted`,
    },
    {
      label: 'Total withdrawn',
      value: formatINR(r.totalWithdrawn),
      caption: `From a corpus of ${formatINRCompact(r.initialInvestment)}`,
    },
  ],

  stats: (r, v) => [
    { label: 'Total invested', value: formatINR(r.initialInvestment) },
    { label: 'Returns earned', value: formatINR(r.totalGrowth), tone: 'positive' },
    {
      label: 'Safe monthly withdrawal',
      value: formatINR(r.sustainableMonthly),
      tone: 'accent',
      help: 'Withdrawing only the monthly return leaves your capital untouched forever.',
    },
    ...(num(v.annualIncrease) > 0
      ? [{ label: 'Final monthly withdrawal', value: formatINR(r.finalMonthlyWithdrawal) }]
      : []),
  ],

  charts: (r) => [
    {
      kind: 'line' as const,
      title: 'Corpus balance over time',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      area: true,
      series: [{ name: 'Balance', values: r.rows.map((row) => row.closing) }],
    },
    {
      kind: 'donut' as const,
      title: 'Where the money went',
      centerLabel: 'Corpus',
      data: [
        { label: 'Withdrawn', value: r.totalWithdrawn },
        { label: 'Still invested', value: Math.max(0, r.finalBalance) },
      ],
    },
  ],

  table: (r) => ({
    title: 'Year-wise withdrawal schedule',
    previewRows: 10,
    csvName: 'finora-swp-schedule',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'opening', label: 'Opening balance' },
      { key: 'withdrawn', label: 'Withdrawn' },
      { key: 'growth', label: 'Returns' },
      { key: 'closing', label: 'Closing balance' },
    ],
    rows: r.rows.map((row) => ({
      year: String(row.year),
      opening: formatINR(row.opening),
      withdrawn: formatINR(row.withdrawn),
      growth: formatINR(row.growth),
      closing: formatINR(row.closing),
    })),
    csvRows: r.rows.map((row) => ({
      year: row.year,
      opening: Math.round(row.opening),
      withdrawn: Math.round(row.withdrawn),
      growth: Math.round(row.growth),
      closing: Math.round(row.closing),
    })),
  }),

  summary: (r) =>
    r.lasts
      ? `SWP: withdrew ${formatINR(r.totalWithdrawn)} and still has ${formatINR(r.finalBalance)} left.`
      : `SWP: corpus exhausted after ${formatDuration(r.depletedInMonth)}, having paid out ${formatINR(
          r.totalWithdrawn,
        )}.`,

  content: {
    howItWorks: [
      'A systematic withdrawal plan is a SIP in reverse. A lumpsum stays invested and a fixed amount is redeemed every month, so the corpus keeps earning on whatever is left while it pays you an income. It is the standard way retirees draw from mutual funds instead of buying an annuity.',
      'Each month the balance first earns a month of return and the withdrawal is then deducted — the order every fund house uses. Whether the corpus outlives you comes down to the gap between the return rate and the withdrawal rate: if you withdraw less than you earn, the balance grows even while paying you.',
      'The safe monthly withdrawal figure shown above is the amount equal to one month of return. Take exactly that and your capital never shrinks. Take more and you are eating into the principal — which may be perfectly sensible, as long as you know how long it will last.',
      'The annual increase option matters more than it looks. At 6% inflation, ₹30,000 a month buys roughly half as much after twelve years, so a flat withdrawal is a quietly shrinking income.',
    ],
    formula: `Each month:
  balance = balance × (1 + r) − withdrawal

  r = annual return ÷ 12

Safe withdrawal = corpus × r     (capital stays intact)`,
    example: [
      '₹50,00,000 invested at 9%, withdrawing ₹30,000 a month.',
      'One month of return is 50,00,000 × 0.0075 = ₹37,500 — more than the withdrawal.',
      'The corpus therefore grows despite paying out, and after 20 years it is larger than when you started.',
    ],
    assumptions: [
      'Returns are steady every month. Real markets are not, and a run of bad years early in the withdrawal period does disproportionate damage — this is called sequence-of-returns risk.',
      'Withdrawals happen at the end of each month, after that month has earned its return.',
      'Capital gains tax on each redemption is not deducted. Every SWP withdrawal is a partial redemption and is taxable.',
      'No exit load is applied. Many funds charge one if you redeem within a year of investing.',
    ],
    notes: [
      'Each withdrawal is treated as a redemption for tax: equity fund gains are taxed at 12.5% above ₹1.25 lakh a year if held over a year, and at 20% if held for less.',
      'Only the gain portion of each withdrawal is taxed, not the whole amount — which makes an SWP considerably more tax-efficient than an annuity or interest income.',
      'A widely used rule of thumb is to withdraw no more than 4% of the corpus a year. On ₹50 lakh that is about ₹16,600 a month.',
    ],
    faqs: [
      {
        q: 'How is an SWP better than a fixed deposit for income?',
        a: 'FD interest is fully taxed at your slab rate every year. In an SWP only the capital gain within each withdrawal is taxed, and long-term equity gains enjoy a lower rate plus an annual exemption. The trade-off is that SWP returns are not guaranteed.',
      },
      {
        q: 'What happens if the market falls early on?',
        a: 'You redeem more units to raise the same rupee amount, permanently reducing the corpus. This sequence-of-returns risk is why withdrawal portfolios are usually more conservative than accumulation portfolios.',
      },
      {
        q: 'How much can I safely withdraw?',
        a: 'If you never want the capital to fall, withdraw no more than one month of return. If you are happy to run the corpus down over a defined period, you can withdraw considerably more — set the period above and check the balance lasts.',
      },
      {
        q: 'Can I change the withdrawal amount later?',
        a: 'Yes. SWPs can be stopped, paused or revised at any time without penalty, which is the main advantage over an annuity, where the rate is locked for life.',
      },
    ],
  },
};

export default swp;
