import type { CalculatorDef, Values } from '../types';
import { calculateRetirement, type RetirementResult } from '@/engines/investment';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';
import { Note } from '@/components/Results';

const toInput = (v: Values) => ({
  currentAge: num(v.currentAge),
  retirementAge: num(v.retirementAge),
  lifeExpectancy: num(v.lifeExpectancy),
  monthlyExpense: num(v.monthlyExpense),
  inflationPct: num(v.inflation),
  currentSavings: num(v.currentSavings),
  monthlyInvestment: num(v.monthlyInvestment),
  preReturnPct: num(v.preReturn),
  postReturnPct: num(v.postReturn),
});

const retirement: CalculatorDef<RetirementResult> = {
  id: 'retirement',

  groups: [
    { id: 'expenses', title: 'Expenses in retirement' },
    { id: 'savings', title: 'What you are saving' },
    { id: 'returns', title: 'Return assumptions' },
  ],

  fields: [
    { name: 'currentAge', label: 'Current Age', type: 'number', default: 32, min: 18, max: 70, unit: 'yrs', slider: true },
    { name: 'retirementAge', label: 'Retirement Age', type: 'number', default: 60, min: 35, max: 75, unit: 'yrs', slider: true },
    {
      name: 'lifeExpectancy',
      label: 'Plan Until Age',
      type: 'number',
      default: 85,
      min: 60,
      max: 100,
      unit: 'yrs',
      slider: true,
      help: 'Plan for longer than you expect. Running out of money at 82 is a far worse error than leaving some behind.',
    },
    {
      name: 'monthlyExpense',
      label: 'Current Monthly Expenses',
      type: 'currency',
      default: 60000,
      min: 1000,
      max: 10000000,
      group: 'expenses',
      slider: true,
      step: 5000,
      help: 'What you spend today, in today’s prices. The calculator inflates it to your retirement date.',
    },
    {
      name: 'inflation',
      label: 'Expected Inflation',
      type: 'percent',
      default: 6,
      min: 0,
      max: 20,
      step: 0.25,
      slider: true,
      group: 'expenses',
    },
    {
      name: 'currentSavings',
      label: 'Current Retirement Savings',
      type: 'currency',
      default: 1500000,
      min: 0,
      max: 1000000000,
      group: 'savings',
      help: 'EPF, NPS, mutual funds and anything else earmarked for retirement.',
    },
    {
      name: 'monthlyInvestment',
      label: 'Monthly Investment',
      type: 'currency',
      default: 25000,
      min: 0,
      max: 10000000,
      group: 'savings',
      slider: true,
      step: 2500,
    },
    {
      name: 'preReturn',
      label: 'Return Before Retirement',
      type: 'percent',
      default: 11,
      min: 1,
      max: 25,
      step: 0.5,
      slider: true,
      group: 'returns',
      help: 'While you are still working you can hold more equity, so the return assumption is higher.',
    },
    {
      name: 'postReturn',
      label: 'Return After Retirement',
      type: 'percent',
      default: 7,
      min: 1,
      max: 20,
      step: 0.5,
      slider: true,
      group: 'returns',
      help: 'After retiring the portfolio is usually more conservative, so assume a lower return.',
    },
  ],

  validate: (v) => {
    const errors: Record<string, string> = {};
    if (num(v.retirementAge) <= num(v.currentAge))
      errors.retirementAge = 'Retirement age must be greater than your current age.';
    if (num(v.lifeExpectancy) <= num(v.retirementAge))
      errors.lifeExpectancy = 'Plan-until age must be greater than your retirement age.';
    return errors;
  },

  compute: (v) => calculateRetirement(toInput(v)),

  hero: (r) => [
    {
      label: 'Corpus you will need at retirement',
      value: formatINR(r.corpusRequired),
      caption: `To fund ${formatINRCompact(r.monthlyExpenseAtRetirement)} a month for ${r.retirementYears} years`,
    },
    {
      label: r.onTrack ? 'Projected surplus' : 'Projected shortfall',
      value: formatINR(Math.abs(r.surplusOrGap)),
      caption: r.onTrack
        ? 'You are on track with your current savings plan'
        : `Invest ${formatINR(r.additionalMonthlyNeeded)} more a month to close it`,
    },
  ],

  stats: (r) => [
    { label: 'Years to retirement', value: `${r.yearsToRetire}` },
    { label: 'Years in retirement', value: `${r.retirementYears}` },
    { label: 'Monthly expense at retirement', value: formatINR(r.monthlyExpenseAtRetirement) },
    { label: 'Projected corpus', value: formatINR(r.projectedCorpus), tone: 'accent' },
    { label: 'From existing savings', value: formatINR(r.fromCurrentSavings) },
    { label: 'From monthly investing', value: formatINR(r.fromMonthlyInvestment) },
    {
      label: 'Real return in retirement',
      value: formatPercent(r.realReturnPct),
      help: 'Post-retirement return after inflation — what actually keeps your withdrawals going.',
    },
    ...(r.onTrack
      ? []
      : [{ label: 'Extra monthly investment needed', value: formatINR(r.additionalMonthlyNeeded), tone: 'negative' as const }]),
  ],

  extra: (r) => (
    <Note tone={r.onTrack ? 'info' : 'warn'}>
      {r.onTrack ? (
        <>
          On these assumptions your savings reach <strong>{formatINRCompact(r.projectedCorpus)}</strong>, about{' '}
          {formatINRCompact(Math.abs(r.surplusOrGap))} more than the {formatINRCompact(r.corpusRequired)} you need.
          Revisit the plan every couple of years — inflation and lifestyle both drift.
        </>
      ) : (
        <>
          Your projected corpus of <strong>{formatINRCompact(r.projectedCorpus)}</strong> falls short of the{' '}
          {formatINRCompact(r.corpusRequired)} needed. Closing it takes roughly{' '}
          <strong>{formatINR(r.additionalMonthlyNeeded)}</strong> more each month — or a later retirement date, or
          lower expenses. Small increases now matter more than large ones later.
        </>
      )}
    </Note>
  ),

  charts: (r) => [
    {
      kind: 'line' as const,
      title: 'Projected corpus vs what you will need',
      x: r.rows.map((row) => String(row.age)),
      xLabel: 'Age',
      series: [
        { name: 'Projected corpus', values: r.rows.map((row) => row.corpus) },
        { name: 'Corpus required', values: r.rows.map((row) => row.required) },
      ],
    },
    {
      kind: 'donut' as const,
      title: 'Where the corpus comes from',
      centerLabel: 'Projected',
      data: [
        { label: 'Existing savings, grown', value: r.fromCurrentSavings },
        { label: 'Future monthly investing', value: r.fromMonthlyInvestment },
      ],
    },
  ],

  summary: (r) =>
    `Retirement corpus needed ${formatINR(r.corpusRequired)}; projected ${formatINR(r.projectedCorpus)} — ${
      r.onTrack ? 'on track' : `short by ${formatINR(Math.abs(r.surplusOrGap))}`
    }.`,

  content: {
    howItWorks: [
      'Retirement planning runs in two halves. First, your current monthly expenses are inflated to the day you retire — that is what your lifestyle will actually cost then. Second, the calculator works out the lump sum needed on that day to pay those expenses, rising with inflation, until your plan-until age.',
      'The corpus is discounted at the inflation-adjusted post-retirement return, not the nominal one. This matters: a 7% return during 6% inflation supports withdrawals at only about 0.94% real, so the corpus required is much larger than a naive calculation suggests.',
      'Against that requirement it projects what your existing savings and monthly investments will actually grow to, and reports the gap plus the extra monthly investment that would close it.',
    ],
    formula: `Expense at retirement = current expense × (1 + inflation)^years to retire
Real return           = (1 + post-retirement return) ÷ (1 + inflation) − 1
Corpus required       = annual expense × [1 − (1 + real)^−n] ÷ real × (1 + real)
Projected corpus      = savings × (1 + pre-return)^years + future value of SIPs`,
    example: [
      'Age 32, retiring at 60, planning until 85. Expenses ₹60,000 a month, inflation 6%.',
      'At 60 the same lifestyle costs about ₹3,07,000 a month.',
      'Funding that for 25 years at a 7% post-retirement return needs a corpus of roughly ₹8.2 crore.',
      'Existing savings of ₹15 lakh plus ₹25,000 a month at 11% gets to about ₹7.5 crore — a gap worth acting on early.',
    ],
    assumptions: [
      'Expenses stay level in real terms throughout retirement. In practice discretionary spending often falls after 75 while medical spending rises.',
      'Returns are constant. Sequence-of-returns risk — a bad market in the first few years of retirement — is not modelled and is a real danger.',
      'No pension, rental income, annuity or property sale is counted. Add such income by reducing your monthly expense figure.',
      'The corpus is drawn down to zero by your plan-until age, leaving no estate.',
    ],
    notes: [
      'Healthcare costs rise faster than general inflation. Health insurance alongside the corpus is usually cheaper than self-funding medical risk.',
      'Delaying retirement by even two or three years helps twice: the corpus grows longer and it has to last fewer years.',
      'Review the plan every two years. Small course corrections early are far cheaper than large ones late.',
    ],
    faqs: [
      {
        q: 'Why is the corpus required so large?',
        a: 'Because it has to survive both inflation and longevity. Twenty-five years of retirement with prices doubling roughly every twelve years needs far more capital than a simple “expenses × years” calculation suggests.',
      },
      {
        q: 'Is the 4% withdrawal rule useful in India?',
        a: 'It was derived from US market history and lower inflation. With Indian inflation, a real withdrawal rate closer to 3–3.5% is a safer starting point. This calculator works out the requirement directly from your own numbers instead of using a rule of thumb.',
      },
      {
        q: 'Should EPF and NPS be counted in current savings?',
        a: 'Yes, include the balances you intend to keep until retirement. If you plan to convert part of NPS into an annuity, treat that pension as income instead by reducing your monthly expense figure.',
      },
      {
        q: 'What if I cannot invest the extra amount needed?',
        a: 'There are three other levers: retire later, spend less in retirement, or increase investments gradually as your income grows. A 10% annual step-up in your investment usually closes a moderate gap on its own.',
      },
    ],
  },
};

export default retirement;
