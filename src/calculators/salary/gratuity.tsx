import type { CalculatorDef, Values } from '../types';
import { calculateGratuity, GRATUITY_EXEMPTION_CAP, type GratuityResult } from '@/engines/salary';
import { formatINR } from '@/lib/format';
import { num, str } from '@/lib/validate';
import { Note } from '@/components/Results';

const toInput = (v: Values) => ({
  monthlyBasicDA: num(v.monthlyBasicDA),
  years: num(v.years),
  months: num(v.months),
  coveredUnderAct: str(v.covered, 'yes') === 'yes',
});

const gratuity: CalculatorDef<GratuityResult> = {
  id: 'gratuity',

  fields: [
    {
      name: 'monthlyBasicDA',
      label: 'Last Drawn Monthly Basic + DA',
      type: 'currency',
      default: 60000,
      min: 0,
      max: 10000000,
      slider: true,
      step: 5000,
      help: 'Gratuity is calculated on Basic + Dearness Allowance only, at the time you leave.',
    },
    {
      name: 'years',
      label: 'Completed Years of Service',
      type: 'number',
      default: 7,
      min: 0,
      max: 50,
      unit: 'yrs',
      slider: true,
    },
    {
      name: 'months',
      label: 'Additional Months',
      type: 'number',
      default: 8,
      min: 0,
      max: 11,
      unit: 'mo',
      slider: true,
      help: 'Six months or more counts as a full extra year for establishments covered by the Act.',
    },
    {
      name: 'covered',
      label: 'Employer covered by the Gratuity Act?',
      type: 'segmented',
      default: 'yes',
      options: [
        { label: 'Yes (10+ employees)', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      help: 'The Payment of Gratuity Act, 1972 applies to establishments with 10 or more employees. Covered employers use 15/26; others use 15/30.',
    },
  ],

  compute: (v) => calculateGratuity(toInput(v)),

  hero: (r) => ({
    label: r.eligible ? 'Gratuity payable' : 'Not yet eligible',
    value: r.eligible ? formatINR(r.gratuity) : '—',
    caption: r.eligible
      ? `For ${r.roundedYears} years of service`
      : 'Five years of continuous service are needed to qualify',
  }),

  stats: (r) =>
    r.eligible
      ? [
          { label: 'Years counted', value: `${r.roundedYears}` },
          { label: 'Per-day wage used', value: formatINR(r.perDayWage) },
          { label: 'Tax-exempt portion', value: formatINR(r.exempt), tone: 'positive' },
          { label: 'Taxable portion', value: formatINR(r.taxable), tone: r.taxable > 0 ? 'negative' : 'default' },
        ]
      : [
          { label: 'Completed years', value: `${r.completedYears}` },
          { label: 'Years still needed', value: `${Math.max(0, 5 - r.completedYears)}` },
        ],

  extra: (r) => (
    <>
      {r.eligible && r.taxable > 0 && (
        <Note tone="warn">
          Gratuity above the lifetime exemption cap of {formatINR(GRATUITY_EXEMPTION_CAP)} is taxable as salary
          income. {formatINR(r.taxable)} of this payment would be added to your taxable income.
        </Note>
      )}
      {!r.eligible && (
        <Note>
          Gratuity requires five years of continuous service. The rule is waived if service ends because of
          death or disablement, in which case gratuity is paid regardless of tenure.
        </Note>
      )}
    </>
  ),

  charts: (r) =>
    r.eligible && r.taxable > 0
      ? [
          {
            kind: 'donut' as const,
            title: 'Exempt vs taxable',
            centerLabel: 'Gratuity',
            data: [
              { label: 'Tax-exempt', value: r.exempt },
              { label: 'Taxable', value: r.taxable },
            ],
          },
        ]
      : [],

  summary: (r) =>
    r.eligible
      ? `Gratuity payable ${formatINR(r.gratuity)} for ${r.roundedYears} years of service (exempt ${formatINR(
          r.exempt,
        )}).`
      : 'Not eligible for gratuity yet — five years of continuous service are required.',

  content: {
    howItWorks: [
      'Gratuity is a lump sum your employer pays for long service, governed by the Payment of Gratuity Act, 1972. You become eligible after five years of continuous service, and the amount depends only on your last drawn Basic + DA and how long you served.',
      'For establishments covered by the Act, each year of service earns 15 days of wages, and a month is treated as 26 working days — hence the 15/26 formula. A part-year of six months or more is rounded up to a full year, which can be worth a meaningful amount.',
      'Employers not covered by the Act use 15/30 instead, based on the average salary of the last ten months, and part-years are not rounded up.',
    ],
    formula: `Covered by the Act:
  Gratuity = (15 ÷ 26) × last drawn Basic + DA × completed years
             (part-year of 6 months or more counts as a full year)

Not covered:
  Gratuity = (15 ÷ 30) × average Basic + DA of last 10 months × completed years`,
    example: [
      'Last drawn Basic + DA of ₹60,000, 7 years and 8 months of service, covered employer.',
      '8 months rounds up, so 8 years count.',
      'Gratuity = (15 ÷ 26) × 60,000 × 8 = ₹2,76,923 — fully exempt, being below the ₹20 lakh cap.',
    ],
    assumptions: [
      'Service is continuous. Breaks in service may reset the five-year clock depending on the circumstances.',
      'The calculation uses last drawn Basic + DA. For employers not covered by the Act it should be the average of the last ten months.',
      'The ₹20 lakh exemption is a lifetime limit across all employers, not per employer.',
    ],
    notes: [
      'The five-year rule is waived where employment ends due to death or disablement.',
      'For government employees the entire gratuity is exempt from tax.',
      'Gratuity must be paid within 30 days of becoming payable; delays attract simple interest.',
    ],
    faqs: [
      {
        q: 'Do I get gratuity if I leave after 4 years and 8 months?',
        a: 'Generally no — five years of continuous service is the threshold. Some court rulings have treated 4 years and 240 days as sufficient in the fifth year, but employers differ in whether they apply this.',
      },
      {
        q: 'Why divide by 26 and not 30?',
        a: 'The Act treats a month as 26 working days, excluding the four weekly rest days. This makes the per-day wage higher and the gratuity larger than a 15/30 calculation would give.',
      },
      {
        q: 'Is gratuity taxable?',
        a: 'Up to ₹20 lakh is exempt over your lifetime for non-government employees. Anything above that is added to your salary income and taxed at your slab rate.',
      },
      {
        q: 'Does gratuity in my CTC mean I will definitely get it?',
        a: 'No. Many employers show gratuity as 4.81% of basic inside CTC, but it is only paid once you complete five years. Leave earlier and that part of your CTC never materialises.',
      },
    ],
  },
};

export default gratuity;
