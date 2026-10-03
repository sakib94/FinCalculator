import type { CalculatorDef, Values } from '../types';
import { calculateRD, type RdResult } from '@/engines/savings';
import { formatDuration, formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  monthlyDeposit: num(v.monthlyDeposit),
  annualRatePct: num(v.rate),
  months: num(v.months),
});

const rd: CalculatorDef<RdResult> = {
  id: 'rd',

  fields: [
    {
      name: 'monthlyDeposit',
      label: 'Monthly Deposit',
      type: 'currency',
      default: 5000,
      min: 100,
      max: 10000000,
      slider: true,
      step: 500,
      help: 'The fixed amount you deposit every month. Post Office RDs start at ₹100; most banks at ₹100–₹1,000.',
    },
    {
      name: 'rate',
      label: 'Interest Rate',
      type: 'percent',
      default: 6.7,
      min: 1,
      max: 15,
      step: 0.05,
      slider: true,
      help: 'Post Office 5-year RD pays 6.7%. Bank RD rates usually match the FD rate for the same tenure.',
    },
    {
      name: 'months',
      label: 'Tenure',
      type: 'number',
      default: 60,
      min: 6,
      max: 120,
      step: 3,
      unit: 'months',
      slider: true,
      help: 'Banks offer 6 months to 10 years. The Post Office RD runs for exactly 60 months.',
    },
  ],

  compute: (v) => calculateRD(toInput(v)),

  hero: (r) => ({
    label: 'Maturity amount',
    value: formatINR(r.maturity),
    caption: `${r.months} deposits · ${formatDuration(r.months)} · interest ${formatINRCompact(r.interest)}`,
  }),

  stats: (r) => [
    { label: 'Total deposited', value: formatINR(r.totalDeposited) },
    { label: 'Interest earned', value: formatINR(r.interest), tone: 'positive' },
    {
      label: 'Effective annual yield',
      value: formatPercent(r.effectiveYieldPct),
      tone: 'accent',
      help: 'The annual return on your money allowing for when each instalment went in. Higher than the quoted rate because of quarterly compounding.',
    },
    {
      label: 'Interest share',
      value: formatPercent(r.maturity > 0 ? (r.interest / r.maturity) * 100 : 0, 1),
      help: 'The part of the maturity amount that is interest rather than your own deposits.',
    },
  ],

  charts: (r) => [
    {
      kind: 'line' as const,
      title: 'Deposits vs balance',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      stacked: true,
      series: [
        { name: 'Deposited', values: r.rows.map((row) => row.deposited) },
        { name: 'Interest', values: r.rows.map((row) => row.interest) },
      ],
    },
    {
      kind: 'donut' as const,
      title: 'Maturity split',
      centerLabel: 'Maturity',
      data: [
        { label: 'Deposited', value: r.totalDeposited },
        { label: 'Interest', value: r.interest },
      ],
    },
  ],

  table: (r) => ({
    title: 'Year-wise growth',
    csvName: 'paisewise-rd-projection',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'deposited', label: 'Deposited so far' },
      { key: 'interest', label: 'Interest so far' },
      { key: 'balance', label: 'Balance' },
    ],
    rows: r.rows.map((row) => ({
      year: String(row.year),
      deposited: formatINR(row.deposited),
      interest: formatINR(row.interest),
      balance: formatINR(row.balance),
    })),
    csvRows: r.rows.map((row) => ({
      year: row.year,
      deposited: Math.round(row.deposited),
      interest: Math.round(row.interest),
      balance: Math.round(row.balance),
    })),
  }),

  summary: (r) =>
    `RD of ${formatINR(r.monthlyDeposit)} a month for ${r.months} months matures at ${formatINR(
      r.maturity,
    )} — ${formatINR(r.interest)} interest on ${formatINR(r.totalDeposited)} deposited.`,

  content: {
    intro: {
      heading: 'What is a recurring deposit (RD)?',
      paragraphs: [
        'A recurring deposit lets you save a fixed amount every month for a fixed period — typically 6 months to 10 years — and earn a fixed interest rate on it. It combines the discipline of a monthly saving habit with the certainty of a fixed deposit, which makes it popular for short-term goals such as a vacation, a gadget or a festival budget.',
        'This RD calculator works out the maturity amount and total interest for bank and Post Office recurring deposits, using quarterly compounding as banks and the post office do.',
      ],
    },
    sections: [
      {
        heading: 'RD maturity for common monthly deposits',
        table: {
          caption: 'At 7% a year, compounded quarterly',
          columns: ['Monthly deposit', '1 year', '3 years', '5 years'],
          rows: [
            ['₹5,000', '₹62,311', '₹2,00,686', '₹3,59,664'],
            ['₹10,000', '₹1,24,621', '₹4,01,373', '₹7,19,328'],
            ['₹25,000', '₹3,11,553', '₹10,03,432', '₹17,98,320'],
          ],
        },
      },
      {
        heading: 'Bank RD vs Post Office RD',
        table: {
          columns: ['', 'Bank RD', 'Post Office RD'],
          rows: [
            ['Tenure', 'Usually 6 months to 10 years', '5 years, extendable by 5'],
            [
              'Rate',
              'Set by each bank; senior citizen bonus common',
              'Set by the government each quarter',
            ],
            [
              'Safety',
              'DICGC insurance up to ₹5 lakh per bank',
              'Backed by the Government of India',
            ],
            [
              'Missed instalment',
              'Penalty varies by bank',
              'Small penalty per ₹100 per month; account discontinued after 4 defaults',
            ],
            [
              'Loan facility',
              'Often up to 90% of balance',
              'Up to 50% after one year',
            ],
          ],
        },
      },
    ],
    guides: ['sip-vs-fd-rd', 'fd-interest-and-tax', 'power-of-compounding'],
    howItWorks: [
      'A recurring deposit takes the same amount from you every month and pays a fixed rate on the growing balance. Banks and India Post compound RD interest every quarter, so interest itself starts earning interest.',
      'Each instalment earns for a different length of time — the first one for the whole tenure, the last one for just a month. The calculator adds all of them up exactly the way the bank does, rather than treating the deposits as one lump sum.',
      'Because later instalments are in the account for a shorter time, an RD’s interest is much lower than an FD of the same total amount. It is a savings habit, not a higher-yield product.',
    ],
    formula: `            (1 + i)ⁿ − 1
M = R × ──────────────────────
          1 − (1 + i)^(−1/3)

R = monthly deposit   i = annual rate ÷ 400 (quarterly)   n = months ÷ 3`,
    example: [
      '₹5,000 a month for 60 months at 6.7% (the Post Office 5-year RD rate).',
      'Total deposited: 60 × ₹5,000 = ₹3,00,000.',
      'Maturity comes to about ₹3,56,829, so interest earned is roughly ₹56,829.',
    ],
    assumptions: [
      'Every instalment is paid on time. Missed instalments usually attract a small monthly penalty and can close the account.',
      'Interest is compounded quarterly, the convention used by Indian banks and India Post.',
      'The rate is fixed at the time you open the RD and does not change for its tenure.',
    ],
    notes: [
      'RD interest is fully taxable at your slab rate. Banks deduct TDS once total deposit interest crosses ₹50,000 in a year (₹1,00,000 for senior citizens).',
      'Most banks allow a loan or overdraft against an RD, typically up to 90% of the balance.',
      'If you can deposit the whole amount today, an FD will earn more — money in an RD is invested gradually.',
    ],
    faqs: [
      {
        q: 'Is an RD better than a SIP?',
        a: 'They do different jobs. An RD guarantees its return and suits short, fixed goals. A SIP in an equity fund has historically earned far more over five years or longer, but its value moves with the market and nothing is guaranteed.',
      },
      {
        q: 'How is Post Office RD interest calculated?',
        a: 'At 6.7% a year, compounded quarterly, for 60 monthly instalments. ₹1,000 a month grows to about ₹71,366 at maturity.',
      },
      {
        q: 'Can I withdraw an RD early?',
        a: 'Yes, usually with a penalty of around 1% on the rate. A Post Office RD can be closed after three years; the interest then falls to the savings account rate.',
      },
      {
        q: 'Is RD interest taxable?',
        a: 'Yes. RD interest is taxed at your income tax slab rate, and banks deduct TDS once your total interest from the bank — FDs and RDs combined — crosses ₹50,000 in a year (₹1 lakh for senior citizens).',
      },
      {
        q: 'What happens if I miss an RD instalment?',
        a: 'Most banks charge a small penalty on the missed amount and may close the RD after several missed instalments. The post office charges a penalty per ₹100 for each month of default. Set up an auto-debit to avoid misses.',
      },
    ],
  },
};

export default rd;
