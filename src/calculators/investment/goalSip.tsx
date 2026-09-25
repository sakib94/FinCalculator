import type { CalculatorDef, Values } from '../types';
import { calculateGoalSIP, type GoalSipResult } from '@/engines/planning';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num } from '@/lib/validate';
import { Note } from '@/components/Results';

const toInput = (v: Values) => ({
  goalToday: num(v.goal),
  years: num(v.years),
  expectedReturnPct: num(v.expectedReturn),
  inflationPct: num(v.inflation),
  existingSavings: num(v.existing),
  annualStepUpPct: num(v.stepUp),
});

const goalSip: CalculatorDef<GoalSipResult> = {
  id: 'goal-sip',

  groups: [{ id: 'advanced', title: 'Savings already set aside & step-up', collapsible: true }],

  fields: [
    {
      name: 'goal',
      label: 'Goal Amount (today’s cost)',
      type: 'currency',
      default: 2500000,
      min: 10000,
      max: 1000000000,
      slider: true,
      step: 50000,
      help: 'What the goal would cost if you bought it today — a child’s education, a house down payment, a car. Inflation is added for you.',
    },
    {
      name: 'years',
      label: 'Years to Goal',
      type: 'number',
      default: 12,
      min: 1,
      max: 40,
      unit: 'yrs',
      slider: true,
    },
    {
      name: 'expectedReturn',
      label: 'Expected Rate of Return',
      type: 'percent',
      default: 12,
      min: 1,
      max: 30,
      step: 0.5,
      slider: true,
      help: 'Long-run planning figures: equity funds 11–13%, hybrid 8–10%, debt 6–7%.',
    },
    {
      name: 'inflation',
      label: 'Inflation on the Goal',
      type: 'percent',
      default: 6,
      min: 0,
      max: 20,
      step: 0.5,
      slider: true,
      help: 'How fast the cost of this goal rises. Education costs in India have been rising 8–10% a year; set 0 if the target is a fixed amount.',
    },
    {
      name: 'existing',
      label: 'Already Saved for This Goal',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      optional: true,
      group: 'advanced',
      help: 'Money already earmarked. It is assumed to grow at the same expected return.',
    },
    {
      name: 'stepUp',
      label: 'Annual Step-up',
      type: 'percent',
      default: 0,
      min: 0,
      max: 50,
      step: 1,
      slider: true,
      optional: true,
      group: 'advanced',
      help: 'Raise the SIP by this much every year as your income grows. A 10% step-up lowers the starting SIP considerably.',
    },
  ],

  compute: (v) => calculateGoalSIP(toInput(v)),

  hero: (r, v) =>
    r.alreadyCovered
      ? {
          label: 'Monthly SIP needed',
          value: formatINR(0),
          caption: 'Your existing savings are projected to cover this goal on their own',
        }
      : [
          {
            label: num(v.stepUp) > 0 ? 'Starting monthly SIP needed' : 'Monthly SIP needed',
            value: formatINR(r.monthlySip),
            caption: `To reach ${formatINRCompact(r.goalFuture)} in ${num(v.years)} years`,
          },
          {
            label: 'Or invest once, today',
            value: formatINR(r.lumpsumToday),
            caption: 'A single lumpsum at the same expected return',
          },
        ],

  stats: (r, v) => [
    {
      label: 'Goal cost in future',
      value: formatINR(r.goalFuture),
      tone: 'accent',
      help: 'Today’s cost inflated to the year you need the money.',
    },
    { label: 'Total you will invest', value: formatINR(r.totalInvested) },
    { label: 'Growth from returns', value: formatINR(r.wealthGained), tone: 'positive' },
    ...(num(v.existing) > 0
      ? [{ label: 'Existing savings grow to', value: formatINR(r.existingFuture) }]
      : []),
    ...(num(v.stepUp) > 0
      ? [{ label: 'SIP in the final year', value: formatINR(r.finalMonthlySip), help: 'After annual step-ups.' }]
      : []),
  ],

  charts: (r) =>
    r.rows.length > 0 && !r.alreadyCovered
      ? [
          {
            kind: 'line' as const,
            title: 'Your path to the goal',
            x: r.rows.map((row) => `Y${row.year}`),
            xLabel: 'Year',
            series: [
              { name: 'Projected value', values: r.rows.map((row) => row.value) },
              { name: 'Amount invested', values: r.rows.map((row) => row.invested) },
            ],
          },
          {
            kind: 'donut' as const,
            title: 'Where the goal money comes from',
            centerLabel: 'Goal',
            data: [
              { label: 'Your SIPs', value: r.totalInvested },
              { label: 'Returns on SIPs', value: Math.max(0, r.wealthGained) },
              { label: 'Existing savings', value: Math.min(r.existingFuture, r.goalFuture) },
            ].filter((d) => d.value > 0),
          },
        ]
      : [],

  table: (r) =>
    r.alreadyCovered
      ? null
      : {
          title: 'Year-by-year plan',
          previewRows: 10,
          csvName: 'finora-goal-sip-plan',
          columns: [
            { key: 'year', label: 'Year', align: 'left' },
            { key: 'monthly', label: 'Monthly SIP' },
            { key: 'invested', label: 'Invested so far' },
            { key: 'value', label: 'Projected value' },
          ],
          rows: r.rows.map((row) => ({
            year: String(row.year),
            monthly: formatINR(row.monthly),
            invested: formatINR(row.invested),
            value: formatINR(row.value),
          })),
          csvRows: r.rows.map((row) => ({
            year: row.year,
            monthly: Math.round(row.monthly),
            invested: Math.round(row.invested),
            value: Math.round(row.value),
          })),
        },

  extra: (_r, v) =>
    num(v.expectedReturn) <= num(v.inflation) ? (
      <Note tone="warn">
        Your expected return ({formatPercent(num(v.expectedReturn))}) does not beat inflation on the goal (
        {formatPercent(num(v.inflation))}). The goal gets further away in real terms every year — consider a
        growth-oriented investment or a longer horizon.
      </Note>
    ) : null,

  summary: (r, v) =>
    r.alreadyCovered
      ? 'Existing savings are projected to cover this goal without a SIP.'
      : `To reach ${formatINR(r.goalFuture)} in ${num(v.years)} years, invest ${formatINR(
          r.monthlySip,
        )} a month (or ${formatINR(r.lumpsumToday)} once today) at ${formatPercent(num(v.expectedReturn))}.`,

  content: {
    howItWorks: [
      'Start from what the goal costs today. The calculator inflates that to the year you need the money, because a ₹25 lakh education will not cost ₹25 lakh twelve years from now.',
      'Anything you have already saved for the goal grows alongside. The SIP only needs to cover what is left, and the calculator solves for the exact monthly amount — with an optional yearly step-up — that grows to that gap.',
      'It also shows the single lumpsum that would do the same job, which is useful if you have a bonus or a maturing deposit to put to work.',
    ],
    formula: `Future goal   = Goal today × (1 + inflation)^years
Gap           = Future goal − Existing savings × (1 + return)^years
Monthly SIP   = Gap ÷ FV of ₹1 a month
FV of ₹1/mo   = [(1 + r)ⁿ − 1] ÷ r × (1 + r)     r = return ÷ 12,  n = months`,
    example: [
      'A goal that costs ₹25 lakh today, needed in 12 years, with 6% inflation and a 12% expected return.',
      'Future cost = 25,00,000 × 1.06^12 ≈ ₹50.3 lakh.',
      'Monthly SIP needed ≈ ₹15,600. You invest about ₹22.5 lakh; returns supply the other ₹27.8 lakh.',
    ],
    assumptions: [
      'Returns are steady at the rate you enter. Real market returns vary year to year, so build in a margin for important goals.',
      'SIP instalments go in at the start of each month; the step-up is applied once a year.',
      'Taxes on gains and fund expense ratios are not deducted.',
    ],
    notes: [
      'As the goal gets closer — typically three years out — move the corpus gradually from equity to debt so a market fall just before the deadline does not derail it.',
      'Run each goal separately. Mixing a 3-year car goal and a 15-year retirement goal in one SIP hides the fact that they need different investments.',
    ],
    faqs: [
      {
        q: 'How much SIP do I need for ₹1 crore?',
        a: 'At a 12% expected return and no inflation adjustment, roughly ₹10,000 a month for 20 years, ₹20,000 a month for 15 years, or ₹43,000 a month for 10 years. Set inflation to 0 and enter ₹1 crore to see the exact figure.',
      },
      {
        q: 'Should I adjust the goal for inflation?',
        a: 'Almost always. Unless the target is a fixed sum (like repaying a known loan), the cost of what you are saving for will rise. Education and healthcare costs in India have historically risen faster than general inflation.',
      },
      {
        q: 'What does step-up do?',
        a: 'It raises the SIP every year. Because you invest more later, when your income is higher, the starting SIP needed today is much smaller.',
      },
    ],
  },
};

export default goalSip;
