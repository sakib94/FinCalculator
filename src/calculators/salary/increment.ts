import type { CalculatorDef, ValidationErrors, Values } from '../types';
import {
  calculateIncrement,
  incrementPctBetween,
  type IncrementMode,
  type IncrementResult,
} from '@/engines/salary';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const mode = (v: Values) => str(v.mode, 'rate') as IncrementMode;
const isRate = (v: Values) => mode(v) === 'rate';
const isReverse = (v: Values) => mode(v) === 'reverse';

/**
 * Both modes end up in the same engine call. Reverse mode simply derives
 * the percentage from the two salaries first, so the projection, chart and
 * table below work identically whichever way the question was asked.
 */
const toInput = (v: Values) => {
  const basis = str(v.basis, 'monthly') as 'monthly' | 'annual';
  const projectionYears = num(v.projectionYears);

  if (isReverse(v)) {
    const previous = num(v.previousSalary);
    return {
      currentSalary: previous,
      incrementPct: incrementPctBetween(previous, num(v.revisedSalary)),
      basis,
      projectionYears,
      mode: 'reverse' as const,
    };
  }

  return {
    currentSalary: num(v.currentSalary),
    incrementPct: num(v.incrementPct),
    basis,
    projectionYears,
    mode: 'rate' as const,
  };
};

const increment: CalculatorDef<IncrementResult> = {
  id: 'salary-increment',

  fields: [
    {
      name: 'mode',
      label: 'What do you want to work out?',
      type: 'segmented',
      prominent: true,
      default: 'rate',
      options: [
        { label: 'New salary', value: 'rate' },
        { label: 'Increment %', value: 'reverse' },
      ],
    },
    {
      name: 'basis',
      label: 'Salary entered is',
      type: 'segmented',
      default: 'monthly',
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Annual', value: 'annual' },
      ],
    },

    /* ---- Knowing the percentage, working out the new salary ---- */
    {
      name: 'currentSalary',
      label: 'Current Salary',
      type: 'currency',
      default: 80000,
      min: 0,
      max: 100000000,
      slider: true,
      step: 5000,
      visible: isRate,
    },
    {
      name: 'incrementPct',
      label: 'Increment Percentage',
      type: 'percent',
      default: 10,
      min: -50,
      max: 200,
      step: 0.5,
      slider: true,
      visible: isRate,
      help: 'Average appraisal increments in India run 8–12%; a job change typically delivers 20–40%.',
    },

    /* ---- Knowing both salaries, working out the percentage ---- */
    {
      name: 'previousSalary',
      label: 'Previous Gross Salary',
      type: 'currency',
      default: 100000,
      min: 0,
      max: 100000000,
      slider: true,
      step: 5000,
      visible: isReverse,
      help: 'What you were paid before the revision. Compare like with like — gross against gross, or CTC against CTC.',
    },
    {
      name: 'revisedSalary',
      label: 'New Gross Salary',
      type: 'currency',
      default: 110000,
      min: 0,
      max: 100000000,
      slider: true,
      step: 5000,
      visible: isReverse,
      help: 'The revised figure from your increment letter, on the same basis as the previous salary.',
    },
    {
      name: 'projectionYears',
      label: 'Project For',
      type: 'number',
      default: 5,
      min: 1,
      max: 30,
      unit: 'yrs',
      slider: true,
      help: 'Assumes the same increment percentage every year.',
    },
  ],

  validate: (v: Values): ValidationErrors => {
    if (!isReverse(v)) return {};
    // Without a previous salary there is nothing to measure the rise against.
    if (num(v.previousSalary) <= 0)
      return { previousSalary: 'Enter the salary you were on before the revision.' };
    return {};
  },

  compute: (v) => calculateIncrement(toInput(v)),

  // Reverse mode leads with the percentage, because that is the answer the
  // user came for; the salaries they typed move down into the caption.
  hero: (r) =>
    r.mode === 'reverse'
      ? [
          {
            label: 'Your increment',
            value: formatPercent(r.incrementPct),
            caption: `${formatINR(r.currentMonthly)} → ${formatINR(r.newMonthly)} a month`,
          },
          {
            label: 'Increase a year',
            value: formatINR(r.increaseAnnual),
            caption: `${formatINR(r.increaseMonthly)} more every month`,
          },
        ]
      : [
          {
            label: 'New monthly salary',
            value: formatINR(r.newMonthly),
            caption: `Up ${formatINR(r.increaseMonthly)} a month (${formatPercent(r.incrementPct)})`,
          },
          {
            label: 'New annual salary',
            value: formatINR(r.newAnnual),
            caption: `An increase of ${formatINR(r.increaseAnnual)} a year`,
          },
        ],

  stats: (r) => {
    const tone = (n: number) => (n >= 0 ? ('positive' as const) : ('negative' as const));
    if (r.mode === 'reverse')
      return [
        { label: 'Previous monthly', value: formatINR(r.currentMonthly) },
        { label: 'New monthly', value: formatINR(r.newMonthly) },
        { label: 'Monthly increase', value: formatINR(r.increaseMonthly), tone: tone(r.increaseMonthly) },
        { label: 'Previous annual', value: formatINR(r.currentAnnual) },
        { label: 'New annual', value: formatINR(r.newAnnual) },
        { label: 'Annual increase', value: formatINR(r.increaseAnnual), tone: tone(r.increaseAnnual) },
      ];
    return [
      { label: 'Current monthly', value: formatINR(r.currentMonthly) },
      { label: 'Monthly increase', value: formatINR(r.increaseMonthly), tone: tone(r.increaseMonthly) },
      { label: 'Current annual', value: formatINR(r.currentAnnual) },
      { label: 'Annual increase', value: formatINR(r.increaseAnnual), tone: tone(r.increaseAnnual) },
    ];
  },

  charts: (r) => [
    {
      kind: 'bar' as const,
      title: 'Salary if this increment repeats every year',
      x: r.rows.map((row) => `Y${row.year}`),
      xLabel: 'Year',
      series: [{ name: 'Monthly salary', values: r.rows.map((row) => row.monthly) }],
    },
  ],

  table: (r) => ({
    title: 'Year-wise salary projection',
    previewRows: 10,
    csvName: 'finora-salary-projection',
    columns: [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'monthly', label: 'Monthly salary' },
      { key: 'annual', label: 'Annual salary' },
      { key: 'increase', label: 'Increase' },
    ],
    rows: r.rows.map((row) => ({
      year: String(row.year),
      monthly: formatINR(row.monthly),
      annual: formatINR(row.annual),
      increase: formatINR(row.increase),
    })),
    csvRows: r.rows.map((row) => ({
      year: row.year,
      monthly: Math.round(row.monthly),
      annual: Math.round(row.annual),
      increase: Math.round(row.increase),
    })),
  }),

  summary: (r) =>
    r.mode === 'reverse'
      ? `A ${formatPercent(r.incrementPct)} increment — ${formatINR(r.currentMonthly)} to ${formatINR(
          r.newMonthly,
        )} a month.`
      : `New salary ${formatINR(r.newMonthly)} a month (${formatINR(r.newAnnual)} a year) after a ${formatPercent(
          r.incrementPct,
        )} increment.`,

  content: {
    howItWorks: [
      'An increment multiplies your existing salary, so it compounds like interest. A 10% raise every year does not add 50% over five years — it adds about 61%, because each raise is applied to a larger base.',
      'That compounding is why an early-career jump matters disproportionately: a higher base carries forward through every future appraisal.',
      'Compare the projection against inflation. A 6% raise during 6% inflation leaves your purchasing power exactly where it was.',
      'Increment letters usually quote only the old and new figures and leave you to work out the percentage. Switch to Increment % and the calculator does that step for you.',
    ],
    formula: `New salary    = current salary × (1 + increment %)
Increment %   = (new salary − previous salary) ÷ previous salary × 100
After n years = current salary × (1 + increment %)ⁿ`,
    example: [
      'Current salary ₹80,000 a month with a 10% increment.',
      'New salary = 80,000 × 1.10 = ₹88,000 a month, an extra ₹96,000 a year.',
      'Repeated for five years it reaches about ₹1,28,841 a month.',
      'The other way round: a gross of ₹1,00,000 revised to ₹1,10,000 is (1,10,000 − 1,00,000) ÷ 1,00,000 × 100 = 10%.',
    ],
    assumptions: [
      'The same increment percentage applies every year, which rarely happens in practice.',
      'Figures are gross salary — tax will take a share of the increase, and a raise can move part of your income into a higher slab.',
      'Promotions, bonuses and job changes are not modelled.',
    ],
    faqs: [
      {
        q: 'What is a good annual increment in India?',
        a: 'Appraisal increments have typically averaged 8–12%, with higher numbers in technology and for top performers. Changing jobs usually delivers considerably more than an internal appraisal.',
      },
      {
        q: 'My letter only shows the old and new salary. How do I find the percentage?',
        a: 'Subtract the old salary from the new one, divide by the old salary and multiply by 100. Switch this calculator to Increment % and enter the two figures — just make sure both are on the same basis, either gross against gross or CTC against CTC, or the percentage will be wrong.',
      },
      {
        q: 'Is my increment real if it matches inflation?',
        a: 'No. Matching inflation keeps your purchasing power flat. Only the portion above inflation is a genuine raise.',
      },
      {
        q: 'How much of my raise will I actually see?',
        a: 'Less than the headline figure, because the increase is taxed at your marginal rate and PF rises with basic. Use the Salary or CTC calculators to see the take-home effect.',
      },
    ],
  },
};

export default increment;
