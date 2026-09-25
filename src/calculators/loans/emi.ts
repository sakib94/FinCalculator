import type { CalculatorDef, Values } from '../types';
import { calculateEMI, type EmiResult } from '@/engines/emi';
import { formatDuration, formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const unitOf = (v: Values): 'months' | 'years' => (str(v.tenureUnit, 'years') === 'months' ? 'months' : 'years');

const toInput = (v: Values) => ({
  principal: num(v.principal),
  annualRatePct: num(v.interestRate),
  tenure: unitOf(v) === 'months' ? num(v.tenureMonths) : num(v.tenure),
  tenureUnit: unitOf(v),
});

const emi: CalculatorDef<EmiResult> = {
  id: 'emi',

  fields: [
    {
      name: 'principal',
      label: 'Loan Amount',
      type: 'currency',
      default: 2500000,
      min: 1000,
      max: 1000000000,
      slider: true,
      step: 50000,
      help: 'The amount you actually borrow, after any down payment.',
    },
    {
      name: 'interestRate',
      label: 'Interest Rate',
      type: 'percent',
      default: 8.75,
      min: 0.1,
      max: 36,
      step: 0.05,
      slider: true,
      help: 'The annual rate your lender quotes. Floating rates change with the repo rate.',
    },
    {
      name: 'tenureUnit',
      label: 'Tenure unit',
      type: 'segmented',
      default: 'years',
      options: [
        { label: 'Years', value: 'years' },
        { label: 'Months', value: 'months' },
      ],
    },
    // One field per unit, so each slider spans a sensible range — a single
    // 1–480 track left 20 years sitting at 4% of the way along.
    {
      name: 'tenure',
      label: 'Loan Tenure',
      type: 'number',
      default: 20,
      min: 1,
      max: 40,
      unit: 'yrs',
      slider: true,
      visible: (v) => unitOf(v) === 'years',
      help: 'A longer tenure lowers the EMI but raises the total interest sharply.',
    },
    {
      name: 'tenureMonths',
      label: 'Loan Tenure',
      type: 'number',
      default: 60,
      min: 1,
      max: 480,
      step: 1,
      unit: 'months',
      slider: true,
      visible: (v) => unitOf(v) === 'months',
      help: 'A longer tenure lowers the EMI but raises the total interest sharply.',
    },
  ],

  compute: (v) => calculateEMI(toInput(v)),

  hero: (r) => ({
    label: 'Monthly EMI',
    value: formatINR(r.emi),
    caption: `${r.months} instalments · ${formatDuration(r.months)}`,
  }),

  stats: (r) => [
    { label: 'Principal amount', value: formatINR(r.principal) },
    { label: 'Total interest', value: formatINR(r.totalInterest), tone: 'negative' },
    { label: 'Total repayment', value: formatINR(r.totalPayment), tone: 'accent' },
    {
      label: 'Interest share',
      value: formatPercent(r.interestShare, 1),
      help: 'Share of everything you repay that is interest rather than principal.',
    },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Principal vs interest',
      centerLabel: 'Total paid',
      data: [
        { label: 'Principal', value: r.principal },
        { label: 'Interest', value: r.totalInterest },
      ],
    },
    {
      kind: 'bar' as const,
      title: 'What each year’s instalments pay for',
      x: r.yearly.map((y) => `Y${y.year}`),
      xLabel: 'Year',
      stacked: true,
      series: [
        { name: 'Principal', values: r.yearly.map((y) => y.principalPaid) },
        { name: 'Interest', values: r.yearly.map((y) => y.interestPaid) },
      ],
    },
    {
      kind: 'line' as const,
      title: 'Outstanding balance',
      x: r.yearly.map((y) => `Y${y.year}`),
      xLabel: 'Year',
      area: true,
      series: [{ name: 'Balance remaining', values: r.yearly.map((y) => y.balance) }],
    },
  ],

  table: (r) => ({
    title: 'Amortisation schedule',
    previewRows: 12,
    csvName: 'finora-emi-schedule',
    columns: [
      { key: 'month', label: 'Month', align: 'left' },
      { key: 'emi', label: 'EMI' },
      { key: 'principal', label: 'Principal' },
      { key: 'interest', label: 'Interest' },
      { key: 'balance', label: 'Remaining Balance' },
    ],
    rows: r.schedule.map((row) => ({
      month: `${row.period}`,
      emi: formatINR(row.emi),
      principal: formatINR(row.principalPaid),
      interest: formatINR(row.interestPaid),
      balance: formatINR(row.balance),
    })),
    csvRows: r.schedule.map((row) => ({
      month: row.period,
      emi: Math.round(row.emi),
      principal: Math.round(row.principalPaid),
      interest: Math.round(row.interestPaid),
      balance: Math.round(row.balance),
    })),
    footer: {
      month: 'Total',
      emi: formatINR(r.totalPayment),
      principal: formatINR(r.principal),
      interest: formatINR(r.totalInterest),
      balance: formatINR(0),
    },
    note: 'For information only. Your lender’s schedule may differ slightly because of the disbursement date, day-count convention and rounding.',
  }),

  summary: (r) =>
    `EMI ${formatINR(r.emi)} for ${r.months} months. Total interest ${formatINR(
      r.totalInterest,
    )}, total repayment ${formatINR(r.totalPayment)}.`,

  content: {
    howItWorks: [
      'An EMI is a level payment: the same amount every month for the whole tenure. What changes is the split inside it. Interest is charged on the balance still outstanding, so early instalments are mostly interest and later ones are mostly principal.',
      'That is why prepaying early saves far more than prepaying late, and why stretching the tenure to lower the EMI can quietly double the interest you pay over the life of the loan.',
      'The schedule below carries the balance forward month by month, exactly as a lender’s amortisation table does, with the final instalment adjusted so the balance closes at zero.',
    ],
    formula: `        P × r × (1 + r)ⁿ
EMI = ──────────────────────
          (1 + r)ⁿ − 1

P = loan amount    r = annual rate ÷ 12 ÷ 100    n = tenure in months`,
    example: [
      'A ₹25,00,000 loan at 8.75% for 20 years (240 months).',
      'Monthly rate r = 8.75 ÷ 12 ÷ 100 = 0.0072917.',
      'EMI works out to about ₹22,093 — roughly ₹53.0 lakh repaid in total, of which ₹28.0 lakh is interest.',
    ],
    assumptions: [
      'The interest rate stays fixed for the entire tenure. On a floating-rate loan, lenders usually adjust the tenure rather than the EMI when rates move.',
      'Every instalment is paid in full and on time, with no prepayment, moratorium or missed payment.',
      'Processing fees, insurance premiums and other charges are excluded — they are usually paid up front, not through the EMI.',
      'Interest is compounded monthly, the standard convention for retail loans in India.',
    ],
    notes: [
      'A higher EMI with a shorter tenure almost always costs less overall. Try reducing the tenure and watch the total interest fall.',
      'Lenders typically expect all your EMIs together to stay under 40–50% of your net monthly income.',
      'Prepayments on floating-rate loans to individuals cannot attract a penalty, so surplus cash is best used early.',
    ],
    faqs: [
      {
        q: 'Does a longer tenure save money?',
        a: 'No. It lowers the monthly outgo but increases the total interest, often substantially. Doubling a tenure from 10 to 20 years can more than double the interest paid, because the balance stays high for far longer.',
      },
      {
        q: 'What happens to my EMI if interest rates change?',
        a: 'On a floating-rate loan most lenders keep the EMI unchanged and extend or shorten the tenure instead. If the tenure cannot be extended further, the EMI itself is revised. Re-run the calculation with the new rate to see the effect.',
      },
      {
        q: 'How much does prepaying help?',
        a: 'A prepayment goes entirely against the principal, so it removes all future interest on that amount. The earlier it is made, the larger the saving — a prepayment in year two saves far more than the same amount in year twelve.',
      },
      {
        q: 'Why does my bank’s EMI differ by a few rupees?',
        a: 'Lenders vary in how they treat the disbursement date, the first partial month (pre-EMI interest) and rounding. The difference is usually a handful of rupees on a level EMI.',
      },
    ],
  },
};

export default emi;
