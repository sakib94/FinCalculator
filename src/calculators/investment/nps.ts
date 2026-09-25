import type { CalculatorDef, Values } from '../types';
import { calculateNPS, type NpsResult } from '@/engines/nps';
import { formatINR, formatINRCompact } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  currentAge: num(v.currentAge),
  retirementAge: num(v.retirementAge),
  currentCorpus: num(v.currentCorpus),
  monthlyContribution: num(v.monthlyContribution),
  annualIncreasePct: num(v.annualIncrease),
  expectedReturnPct: num(v.expectedReturn),
  annuityPct: num(v.annuityPct),
  annuityReturnPct: num(v.annuityReturn),
});

const nps: CalculatorDef<NpsResult> = {
  id: 'nps',

  groups: [
    { id: 'contribution', title: 'Contributions' },
    { id: 'annuity', title: 'At retirement' },
  ],

  fields: [
    { name: 'currentAge', label: 'Current Age', type: 'number', default: 30, min: 18, max: 70, unit: 'yrs', slider: true },
    {
      name: 'retirementAge',
      label: 'Retirement Age',
      type: 'number',
      default: 60,
      min: 40,
      max: 75,
      unit: 'yrs',
      slider: true,
      help: 'NPS Tier-I matures at 60, and can be continued up to 75.',
    },
    {
      name: 'currentCorpus',
      label: 'Current NPS Corpus',
      type: 'currency',
      default: 200000,
      min: 0,
      max: 500000000,
      group: 'contribution',
      help: 'Your existing Tier-I balance. Enter 0 if you are opening a new account.',
    },
    {
      name: 'monthlyContribution',
      label: 'Monthly Contribution',
      type: 'currency',
      default: 10000,
      min: 0,
      max: 10000000,
      group: 'contribution',
    },
    {
      name: 'annualIncrease',
      label: 'Annual Increase in Contribution',
      type: 'percent',
      default: 5,
      min: 0,
      max: 30,
      step: 0.5,
      slider: true,
      group: 'contribution',
      help: 'Step up your contribution each year, typically in line with your salary.',
    },
    {
      name: 'expectedReturn',
      label: 'Expected Annual Return',
      type: 'percent',
      default: 10,
      min: 1,
      max: 20,
      step: 0.25,
      slider: true,
      group: 'contribution',
      help: 'Depends on your equity/corporate bond/government security mix. Equity-heavy funds have historically returned 10–12%, with more volatility.',
    },
    {
      name: 'annuityPct',
      label: 'Annuity Percentage',
      type: 'percent',
      default: 40,
      min: 40,
      max: 100,
      step: 1,
      slider: true,
      group: 'annuity',
      help: 'At least 40% of the corpus must buy an annuity. The rest can be withdrawn as a tax-free lump sum.',
    },
    {
      name: 'annuityReturn',
      label: 'Expected Annuity Return',
      type: 'percent',
      default: 6,
      min: 1,
      max: 15,
      step: 0.25,
      slider: true,
      group: 'annuity',
      help: 'The annual rate your annuity provider pays. Typical Indian annuity rates are 5.5–7%.',
    },
  ],

  validate: (v) => {
    const errors: Record<string, string> = {};
    if (num(v.retirementAge) <= num(v.currentAge))
      errors.retirementAge = 'Retirement age must be greater than your current age.';
    if (num(v.annuityPct) < 40) errors.annuityPct = 'At least 40% of the corpus must go into an annuity.';
    return errors;
  },

  compute: (v) => calculateNPS(toInput(v)),

  hero: (r) => [
    {
      label: 'Estimated corpus at retirement',
      value: formatINR(r.corpus),
      caption: `${formatINRCompact(r.corpus)} after ${r.years} years of investing`,
    },
    {
      label: 'Estimated monthly pension',
      value: formatINR(r.monthlyPension),
      caption: `From an annuity of ${formatINRCompact(r.annuityCorpus)}`,
    },
  ],

  stats: (r) => [
    { label: 'Total contribution', value: formatINR(r.totalContribution) },
    { label: 'Total investment', value: formatINR(r.totalInvestment), help: 'Contributions plus your opening corpus.' },
    { label: 'Estimated returns', value: formatINR(r.estimatedReturns), tone: 'positive' },
    { label: 'Lump sum withdrawal', value: formatINR(r.lumpSum), tone: 'accent', help: 'Tax-free at maturity.' },
    { label: 'Amount into annuity', value: formatINR(r.annuityCorpus) },
    { label: 'Annual pension', value: formatINR(r.annualPension) },
  ],

  charts: (r) => {
    if (!r.rows.length) return [];
    let invested = r.rows[0].openingBalance;
    const investedSeries: number[] = [];
    const corpusSeries: number[] = [];
    for (const row of r.rows) {
      invested += row.yearContribution;
      investedSeries.push(invested);
      corpusSeries.push(row.closingBalance);
    }
    return [
      {
        kind: 'line' as const,
        title: 'Corpus growth vs money invested',
        x: r.rows.map((row) => String(row.age)),
        xLabel: 'Age',
        area: true,
        series: [
          { name: 'Total corpus', values: corpusSeries },
          { name: 'Amount invested', values: investedSeries },
        ],
      },
      {
        kind: 'donut' as const,
        title: 'Corpus split at retirement',
        centerLabel: 'Corpus',
        data: [
          { label: 'Lump sum (tax-free)', value: r.lumpSum },
          { label: 'Annuity purchase', value: r.annuityCorpus },
        ],
      },
    ];
  },

  table: (r) => ({
    title: 'Year-wise projection',
    previewRows: 10,
    csvName: 'finora-nps-projection',
    columns: [
      { key: 'age', label: 'Age', align: 'left' },
      { key: 'monthly', label: 'Monthly' },
      { key: 'yearly', label: 'Invested in year' },
      { key: 'interest', label: 'Returns' },
      { key: 'balance', label: 'Corpus' },
    ],
    rows: r.rows.map((row) => ({
      age: String(row.age),
      monthly: formatINR(row.monthlyContribution),
      yearly: formatINR(row.yearContribution),
      interest: formatINR(row.interest),
      balance: formatINR(row.closingBalance),
    })),
    csvRows: r.rows.map((row) => ({
      age: row.age,
      monthly: Math.round(row.monthlyContribution),
      yearly: Math.round(row.yearContribution),
      interest: Math.round(row.interest),
      balance: Math.round(row.closingBalance),
    })),
    footer: {
      age: 'Total',
      monthly: '',
      yearly: formatINR(r.totalContribution),
      interest: formatINR(r.estimatedReturns),
      balance: formatINR(r.corpus),
    },
  }),

  summary: (r) =>
    `NPS corpus at retirement ${formatINR(r.corpus)} — lump sum ${formatINR(r.lumpSum)}, annuity ${formatINR(
      r.annuityCorpus,
    )}, estimated monthly pension ${formatINR(r.monthlyPension)}.`,

  content: {
    howItWorks: [
      'The National Pension System invests your monthly contribution across equity, corporate bonds and government securities. The balance compounds every month until you retire, and each year your contribution steps up by the percentage you set.',
      'At maturity the rules split the corpus: at least 40% must be used to buy an annuity that pays you a pension for life, and the remaining 60% can be withdrawn as a tax-free lump sum. Your monthly pension is the annuity amount multiplied by the annuity rate, divided by twelve.',
      'Because the annuity rate is usually lower than the return you earned while investing, putting more than the minimum into an annuity gives a bigger pension but a smaller lump sum. The slider lets you see that trade-off immediately.',
    ],
    formula: `Corpus       = Σ monthly contributions compounded at (return ÷ 12)
Annuity      = corpus × annuity %
Lump sum     = corpus − annuity
Monthly pension = (annuity × annuity rate) ÷ 12`,
    example: [
      '₹10,000 a month from age 30 to 60, stepped up 5% a year, at a 10% return, starting from ₹2,00,000.',
      'The corpus grows past ₹3 crore because thirty years of monthly compounding does most of the work.',
      'At 40% annuity and a 6% annuity rate, that is a lump sum of about ₹1.9 crore and a pension of roughly ₹65,000 a month.',
    ],
    assumptions: [
      'Returns are constant every year. Real NPS returns vary with markets and with your asset allocation choice.',
      'Contributions are made at the start of each month and never skipped.',
      'The annuity rate available at retirement equals the rate you entered. Actual rates depend on the annuity plan, your age and the provider at that time.',
      'No partial withdrawals are made during the accumulation period.',
    ],
    notes: [
      'Contributions qualify for deduction up to ₹1.5 lakh under 80CCD(1) within the 80C ceiling, plus an extra ₹50,000 under 80CCD(1B) — both only in the old regime.',
      'Employer contributions under 80CCD(2) are deductible in both regimes: up to 14% of Basic + DA in the new regime.',
      'The 60% lump sum is tax-free. Pension received from the annuity is taxed as income in the year you receive it.',
      'Estimates only — NPS returns are market-linked and not guaranteed.',
    ],
    faqs: [
      {
        q: 'How much of the NPS corpus can I withdraw at 60?',
        a: 'Up to 60% as a tax-free lump sum. The balance must buy an annuity. If the total corpus is ₹5 lakh or less, the entire amount can be withdrawn.',
      },
      {
        q: 'What return should I assume?',
        a: 'It depends on your asset mix. Equity-heavy allocations have historically delivered around 10–12% over long periods, government-security-heavy ones closer to 7–9%. Use a conservative figure and treat the result as a range, not a promise.',
      },
      {
        q: 'Is the pension taxable?',
        a: 'Yes. The annuity pension is added to your income and taxed at your slab rate in the year you receive it. The lump-sum withdrawal at retirement is exempt.',
      },
      {
        q: 'Can I retire before 60?',
        a: 'Early exit is allowed after three years, but then at least 80% of the corpus must go into an annuity and only 20% can be withdrawn — the reverse of the rule at 60.',
      },
    ],
  },
};

export default nps;
