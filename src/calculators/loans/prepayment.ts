import type { CalculatorDef, ValidationErrors, Values } from '../types';
import { calculatePrepayment, type PrepayMode, type PrepaymentResult } from '@/engines/loanTools';
import { formatINR, formatINRCompact, formatDuration, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  outstandingPrincipal: num(v.outstandingPrincipal),
  annualRatePct: num(v.rate),
  remainingMonths: num(v.remainingMonths),
  lumpSum: num(v.lumpSum),
  prepaymentFeePct: num(v.prepaymentFee),
  extraMonthly: num(v.extraMonthly),
  mode: str(v.mode, 'reduce-tenure') as PrepayMode,
});

const prepayment: CalculatorDef<PrepaymentResult> = {
  id: 'loan-prepayment',

  fields: [
    {
      name: 'mode',
      label: 'What should the prepayment do?',
      type: 'segmented',
      prominent: true,
      default: 'reduce-tenure',
      options: [
        { label: 'Reduce Tenure', value: 'reduce-tenure' },
        { label: 'Reduce EMI', value: 'reduce-emi' },
      ],
    },
    {
      name: 'outstandingPrincipal',
      label: 'Outstanding Loan Amount',
      type: 'currency',
      default: 4000000,
      min: 10000,
      max: 1000000000,
      slider: true,
      step: 100000,
      help: 'The principal still owed today — not the original loan amount.',
    },
    {
      name: 'rate',
      label: 'Interest Rate',
      type: 'percent',
      default: 8.75,
      min: 1,
      max: 30,
      step: 0.05,
      slider: true,
    },
    {
      name: 'remainingMonths',
      label: 'Remaining Tenure',
      type: 'number',
      default: 216,
      min: 1,
      max: 420,
      step: 1,
      unit: 'mo',
      slider: true,
      help: 'Instalments still left on the loan. Your statement or amortisation schedule shows this.',
    },
    {
      name: 'lumpSum',
      label: 'One-time Prepayment',
      type: 'currency',
      default: 500000,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 50000,
      optional: true,
      help: 'A single amount paid today against the principal — a bonus, maturity proceeds or savings.',
    },
    {
      name: 'prepaymentFee',
      label: 'Prepayment Fee',
      type: 'percent',
      default: 0,
      min: 0,
      max: 10,
      step: 0.25,
      slider: true,
      optional: true,
      help: 'Charged as a percentage of the amount you hand over, and kept by the lender — only the remainder reduces your principal. Floating-rate home loans to individuals carry no charge; fixed-rate, personal and business loans often do.',
    },
    {
      name: 'extraMonthly',
      label: 'Extra Amount Every Month',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000,
      slider: true,
      step: 1000,
      optional: true,
      help: 'Added to every future EMI. Even a small amount compounds into a large saving.',
    },
  ],

  validate: (v: Values): ValidationErrors => {
    const lump = num(v.lumpSum);
    // Only the amount net of the fee reaches the balance, so that is what
    // has to fit inside the outstanding principal.
    const netOfFee = lump - (lump * num(v.prepaymentFee)) / 100;
    if (netOfFee > num(v.outstandingPrincipal))
      return {
        lumpSum: 'After the fee, this is more than the outstanding principal.',
      };
    return {};
  },

  compute: (v) => calculatePrepayment(toInput(v)),

  hero: (r, v) => [
    {
      label: 'Interest saved',
      value: formatINR(r.interestSaved),
      caption:
        str(v.mode) === 'reduce-emi'
          ? `EMI drops by ${formatINRCompact(r.emiReduction)} a month`
          : `Loan closes ${formatDuration(r.monthsSaved)} earlier`,
    },
    {
      label: str(v.mode) === 'reduce-emi' ? 'New monthly EMI' : 'New tenure',
      value: str(v.mode) === 'reduce-emi' ? formatINR(r.newEmi) : formatDuration(r.newMonths),
      caption:
        str(v.mode) === 'reduce-emi'
          ? `Down from ${formatINR(r.originalEmi)}`
          : `Down from ${formatDuration(r.originalMonths)}`,
    },
  ],

  stats: (r) => [
    { label: 'Current EMI', value: formatINR(r.originalEmi) },
    { label: 'Interest without prepaying', value: formatINR(r.originalInterest), tone: 'negative' },
    { label: 'Interest after prepaying', value: formatINR(r.newInterest), tone: 'positive' },
    {
      label: 'Return on prepayment',
      value: formatPercent(r.returnOnPrepayment, 1),
      tone: 'accent',
      help: 'Interest saved for every rupee prepaid. Compare this against what the same money would earn if invested instead.',
    },
    { label: 'Months saved', value: r.monthsSaved > 0 ? formatDuration(r.monthsSaved) : '—' },
    ...(r.feeAmount > 0
      ? [
          {
            label: 'Prepayment fee',
            value: formatINR(r.feeAmount),
            tone: 'negative' as const,
            help: 'Kept by the lender. This part never touches your principal.',
          },
          {
            label: 'Applied to principal',
            value: formatINR(r.principalReduction),
            tone: 'positive' as const,
            help: 'The lump sum less the fee — the only part that reduces your balance.',
          },
        ]
      : []),
    { label: 'Total prepaid', value: formatINR(r.prepaidAmount) },
  ],

  charts: (r) => [
    {
      kind: 'bar' as const,
      title: 'Total interest: before vs after',
      x: ['Without prepayment', 'With prepayment'],
      series: [{ name: 'Interest paid', values: [r.originalInterest, r.newInterest] }],
    },
  ],

  table: (r) => ({
    title: 'Side-by-side comparison',
    csvName: 'finora-prepayment',
    columns: [
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'before', label: 'Without prepaying' },
      { key: 'after', label: 'After prepaying' },
      { key: 'change', label: 'Difference' },
    ],
    rows: [
      {
        item: 'Monthly EMI',
        before: formatINR(r.originalEmi),
        after: formatINR(r.newEmi),
        change: formatINR(r.newEmi - r.originalEmi),
      },
      {
        item: 'Tenure',
        before: formatDuration(r.originalMonths),
        after: formatDuration(r.newMonths),
        change: r.monthsSaved > 0 ? `− ${formatDuration(r.monthsSaved)}` : '—',
      },
      {
        item: 'Total interest',
        before: formatINR(r.originalInterest),
        after: formatINR(r.newInterest),
        change: `− ${formatINR(r.interestSaved)}`,
      },
      ...(r.feeAmount > 0
        ? [
            {
              item: 'Lump sum handed over',
              before: '—',
              after: formatINR(r.principalReduction + r.feeAmount),
              change: '',
            },
            {
              item: 'Less: prepayment fee',
              before: '—',
              after: formatINR(r.feeAmount),
              change: '',
            },
            {
              item: 'Applied to principal',
              before: '—',
              after: formatINR(r.principalReduction),
              change: '',
            },
          ]
        : []),
    ],
    note:
      r.feeAmount > 0
        ? 'The fee is taken out of the lump sum, so only the remainder reduces your balance.'
        : undefined,
  }),

  summary: (r) =>
    `Prepaying ${formatINR(r.prepaidAmount)}${
      r.feeAmount > 0 ? ` (${formatINR(r.principalReduction)} after fees)` : ''
    } saves ${formatINR(r.interestSaved)} in interest${
      r.monthsSaved > 0 ? ` and ${formatDuration(r.monthsSaved)}` : ''
    }.`,

  content: {
    howItWorks: [
      'A prepayment goes entirely against principal. Because interest each month is charged on the outstanding balance, every rupee you prepay stops accruing interest for the whole remaining tenure — which is why prepaying early in a loan saves so much more than prepaying late.',
      'You then choose what to do with the headroom. Reducing the tenure keeps your EMI the same and finishes the loan sooner; reducing the EMI keeps the end date and lowers the monthly outgo. Reducing the tenure almost always saves more interest, because the balance falls faster. Reducing the EMI helps cash flow instead.',
      'The return-on-prepayment figure is the one to judge this by. It tells you the interest saved per rupee prepaid — the effective, guaranteed, tax-free return you earn by paying down debt. Compare it against what the same money would earn invested, after tax.',
      'A small extra amount every month is often more powerful than people expect, because it acts on every remaining month of the loan rather than once.',
      'Where the lender charges a prepayment fee, it is deducted from the amount you hand over rather than added on top — so a ₹5,00,000 prepayment at a 2% charge only takes ₹4,90,000 off your balance. The fee reduces both the interest saved and the return on the money, which is why the calculator shows the split.',
    ],
    formula: `Prepayment fee   = lump sum × fee %
Applied to principal = lump sum − prepayment fee

Each month:
  interest  = balance × (annual rate ÷ 12)
  principal = EMI − interest
  balance   = balance − principal

The balance falls by the amount applied to principal, so
every subsequent month's interest is computed on less.
The fee buys nothing — it is pure cost.`,
    example: [
      '₹40,00,000 outstanding at 8.75% with 18 years left. The EMI is about ₹36,700.',
      'Prepay ₹5,00,000 today and keep paying the same EMI.',
      'The loan finishes roughly 4 years early and saves close to ₹15 lakh in interest — a return of about 300% on the amount prepaid.',
    ],
    assumptions: [
      'The interest rate stays fixed for the remaining tenure. On a floating-rate loan the actual saving will differ as the rate moves.',
      'The prepayment is applied immediately and in full against principal.',
      'The prepayment fee is treated as a percentage of the lump sum, deducted from it. Some lenders instead charge on the outstanding principal, or add GST on top of the fee — check your sanction letter and adjust the percentage to match.',
      'Any tax deduction you were claiming on the interest is not adjusted for — see the notes.',
    ],
    notes: [
      'The RBI prohibits prepayment penalties on floating-rate home loans taken by individuals — leave the fee at 0 for those. Fixed-rate loans, and most personal and business loans, may still carry a charge of 2–4%, usually plus 18% GST on the fee itself.',
      'If you claim the section 24(b) deduction of up to ₹2 lakh on home loan interest under the old regime, prepaying reduces that benefit. Your effective saving is lower than the headline figure by roughly your marginal tax rate.',
      'Prepay the most expensive debt first. Credit cards and personal loans at 14–45% should be cleared long before a home loan at 9%.',
      'Keep an emergency fund intact before prepaying. Money put into a loan is very hard to get back out.',
    ],
    faqs: [
      {
        q: 'Should I reduce the tenure or the EMI?',
        a: 'Reduce the tenure if you can afford the current EMI — it saves substantially more interest because the balance falls faster. Reduce the EMI only if you need the monthly cash flow.',
      },
      {
        q: 'Is prepaying better than investing the money?',
        a: 'Compare the return-on-prepayment figure above against your expected post-tax investment return. Prepaying a 9% loan is a guaranteed, risk-free 9%; beating that reliably after tax is harder than it sounds. But prepayment is irreversible, whereas investments stay accessible.',
      },
      {
        q: 'When is the best time to prepay?',
        a: 'As early as possible. In the first years of a loan most of each EMI is interest, so a prepayment then removes far more future interest than the same amount paid in the final years.',
      },
      {
        q: 'Will the bank charge me for prepaying?',
        a: 'Not on a floating-rate home loan taken by an individual — the RBI prohibits it. Fixed-rate home loans, personal loans and business loans may carry a charge, typically 2–4% of the amount prepaid.',
      },
    ],
  },
};

export default prepayment;
