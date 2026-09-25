import type { CalculatorDef, Values } from '../types';
import { calculatePercentage, type PercentMode, type PercentResult } from '@/engines/business';
import { formatNumber, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const mode = (v: Values): PercentMode => str(v.mode, 'percentOf') as PercentMode;

const percentage: CalculatorDef<PercentResult> = {
  id: 'percentage',

  fields: [
    {
      name: 'mode',
      label: 'Calculation',
      type: 'select',
      default: 'percentOf',
      wide: true,
      options: [
        { label: 'What is X% of Y?', value: 'percentOf' },
        { label: 'X is what percent of Y?', value: 'isWhatPercent' },
        { label: 'Percentage change from X to Y', value: 'change' },
        { label: 'Increase X by Y%', value: 'increase' },
        { label: 'Decrease X by Y%', value: 'decrease' },
      ],
    },
    {
      name: 'a',
      label: 'First value',
      type: 'number',
      default: 15,
      min: -1000000000,
      max: 1000000000,
      step: 0.01,
    },
    {
      name: 'b',
      label: 'Second value',
      type: 'number',
      default: 2500,
      min: -1000000000,
      max: 1000000000,
      step: 0.01,
    },
  ],

  compute: (v) => calculatePercentage({ mode: mode(v), a: num(v.a), b: num(v.b) }),

  hero: (r) => ({
    label: r.expression,
    value: r.isPercent ? formatPercent(r.value, 2) : formatNumber(r.value, 2),
    caption: r.caption,
  }),

  stats: (r, v) => {
    const a = num(v.a);
    const b = num(v.b);
    switch (r.mode) {
      case 'change':
        return [
          { label: 'Absolute change', value: formatNumber(b - a, 2), tone: b >= a ? 'positive' : 'negative' },
          { label: 'Direction', value: b >= a ? 'Increase' : 'Decrease' },
        ];
      case 'increase':
      case 'decrease':
        return [
          { label: 'Original value', value: formatNumber(a, 2) },
          { label: 'Difference', value: formatNumber(Math.abs(r.value - a), 2), tone: r.mode === 'increase' ? 'positive' : 'negative' },
        ];
      case 'percentOf':
        return [{ label: 'Remaining', value: formatNumber(b - r.value, 2), help: 'The part of the number not covered by that percentage.' }];
      default:
        return [{ label: 'Difference', value: formatNumber(b - a, 2) }];
    }
  },

  summary: (r) => `${r.expression} = ${r.isPercent ? formatPercent(r.value, 2) : formatNumber(r.value, 2)}`,

  content: {
    howItWorks: [
      'All five operations come from one idea: a percentage is a fraction out of a hundred. “X% of Y” multiplies, “X is what percent of Y” divides, and increase and decrease apply the percentage to the original number before adding or subtracting.',
      'Percentage change is the one that trips people up, because it is always measured against the starting value. Going from 50 to 75 is a 50% increase, but going back from 75 to 50 is a 33.3% decrease — the same absolute change measured against a different base.',
    ],
    formula: `X% of Y              = X ÷ 100 × Y
X is what % of Y     = X ÷ Y × 100
Change from X to Y   = (Y − X) ÷ |X| × 100
Increase X by Y%     = X × (1 + Y ÷ 100)
Decrease X by Y%     = X × (1 − Y ÷ 100)`,
    example: [
      '15% of 2,500 = 0.15 × 2,500 = 375.',
      '375 is what percent of 2,500? 375 ÷ 2,500 × 100 = 15%.',
      'Change from 2,500 to 2,875 = 375 ÷ 2,500 × 100 = a 15% increase.',
    ],
    notes: [
      'A percentage increase followed by the same percentage decrease does not return you to the start: +10% then −10% leaves you 1% down.',
      'Percentage points and percent are different. Moving from 5% to 7% is a rise of 2 percentage points, but a 40% increase.',
    ],
    faqs: [
      {
        q: 'Why do a 50% rise and a 33% fall cancel out?',
        a: 'Because each is measured against a different base. Rising from 50 to 75 is 25 on a base of 50 (50%); falling from 75 to 50 is 25 on a base of 75 (33.3%).',
      },
      {
        q: 'How do I calculate a percentage in reverse?',
        a: 'Use “X is what percent of Y”. To find the original before a known increase, divide by (1 + rate ÷ 100) rather than subtracting the percentage.',
      },
    ],
  },
};

export default percentage;
