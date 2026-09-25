import type { CalculatorDef, Values } from '../types';
import { calculateLeaveEncashment, type LeaveResult } from '@/engines/salary';
import { formatINR, formatNumber } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  monthlyBasicDA: num(v.monthlyBasicDA),
  leaveDays: num(v.leaveDays),
  yearsOfService: num(v.yearsOfService),
  governmentEmployee: str(v.employerType, 'private') === 'government',
  leaveEntitlementPerYear: num(v.entitlement),
});

const leaveEncashment: CalculatorDef<LeaveResult> = {
  id: 'leave-encashment',

  fields: [
    {
      name: 'monthlyBasicDA',
      label: 'Monthly Basic + DA',
      type: 'currency',
      default: 60000,
      min: 0,
      max: 10000000,
      slider: true,
      step: 5000,
      help: 'Leave encashment is paid on Basic + DA, not on gross salary.',
    },
    {
      name: 'leaveDays',
      label: 'Unused Leave Days',
      type: 'number',
      default: 45,
      min: 0,
      max: 500,
      unit: 'days',
      slider: true,
      help: 'The balance of earned or privilege leave you are encashing.',
    },
    {
      name: 'yearsOfService',
      label: 'Completed Years of Service',
      type: 'number',
      default: 8,
      min: 0,
      max: 50,
      unit: 'yrs',
      slider: true,
    },
    {
      name: 'entitlement',
      label: 'Leave Credited Per Year',
      type: 'number',
      default: 30,
      min: 1,
      max: 60,
      unit: 'days',
      help: 'For the tax exemption, only up to 30 days a year of service can be counted.',
    },
    {
      name: 'employerType',
      label: 'Employer type',
      type: 'segmented',
      default: 'private',
      options: [
        { label: 'Private / other', value: 'private' },
        { label: 'Government', value: 'government' },
      ],
      help: 'Leave encashment on retirement is fully tax-free for government employees.',
    },
  ],

  compute: (v) => calculateLeaveEncashment(toInput(v)),

  hero: (r) => [
    {
      label: 'Leave encashment amount',
      value: formatINR(r.amount),
      caption: `${formatNumber(r.maxEncashableDays)} days at ${formatINR(r.perDayWage)} a day`,
    },
    {
      label: 'Tax-free portion',
      value: formatINR(r.exempt),
      caption: r.taxable > 0 ? `${formatINR(r.taxable)} is taxable as salary` : 'Entirely exempt from tax',
    },
  ],

  stats: (r) => [
    { label: 'Per-day wage', value: formatINR(r.perDayWage), help: 'Monthly Basic + DA ÷ 30.' },
    { label: 'Days encashed', value: formatNumber(r.maxEncashableDays) },
    { label: 'Exempt amount', value: formatINR(r.exempt), tone: 'positive' },
    { label: 'Taxable amount', value: formatINR(r.taxable), tone: r.taxable > 0 ? 'negative' : 'default' },
  ],

  extra: (r) => (
    <section className="card card-pad">
      <div className="section-label" style={{ marginBottom: 10 }}>
        How the exemption is worked out — the least of these four
      </div>
      <dl style={{ margin: 0 }}>
        {r.limits.map((l) => (
          <div className="kv" key={l.label}>
            <dt>{l.label}</dt>
            <dd>{formatINR(l.amount)}</dd>
          </div>
        ))}
        <div className="kv total">
          <dt>Exemption allowed</dt>
          <dd>{formatINR(r.exempt)}</dd>
        </div>
      </dl>
    </section>
  ),

  charts: (r) =>
    r.taxable > 0
      ? [
          {
            kind: 'donut' as const,
            title: 'Exempt vs taxable',
            centerLabel: 'Encashment',
            data: [
              { label: 'Exempt', value: r.exempt },
              { label: 'Taxable', value: r.taxable },
            ],
          },
        ]
      : [],

  summary: (r) =>
    `Leave encashment ${formatINR(r.amount)} — exempt ${formatINR(r.exempt)}, taxable ${formatINR(r.taxable)}.`,

  content: {
    howItWorks: [
      'Leave encashment converts your unused earned leave into cash, usually when you resign or retire. The per-day rate is your monthly Basic + DA divided by 30, multiplied by the number of days being encashed.',
      'The tax treatment is where it gets interesting. For government employees the entire amount is exempt. For everyone else, section 10(10AA)(ii) allows the least of four limits — a statutory ceiling of ₹25 lakh, the actual amount received, ten months of average salary, and the cash value of 30 days of leave for each completed year of service.',
      'That last limit is the one that usually bites: it caps the exemption regardless of how much leave your employer actually allowed you to accumulate.',
    ],
    formula: `Per-day wage = monthly Basic + DA ÷ 30
Encashment   = per-day wage × leave days

Exemption (non-government) = least of:
  1. ₹25,00,000 (lifetime limit)
  2. Actual amount received
  3. 10 months × average monthly Basic + DA
  4. Per-day wage × 30 days × completed years of service`,
    example: [
      'Basic + DA ₹60,000 a month, 45 days of unused leave, 8 years of service.',
      'Per-day wage = ₹2,000; encashment = ₹90,000.',
      'The four limits are ₹25,00,000 / ₹90,000 / ₹6,00,000 / ₹4,80,000 — the least is ₹90,000, so the whole amount is exempt.',
    ],
    assumptions: [
      'Encashment happens at retirement or resignation. Leave encashed while still employed is fully taxable, whatever the limits say.',
      'Average salary is taken as the current Basic + DA. Strictly, it is the average of the last ten months.',
      'The ₹25 lakh exemption limit is a lifetime cap across all employers.',
    ],
    notes: [
      'The exemption ceiling was raised from ₹3 lakh to ₹25 lakh with effect from April 2023.',
      'Leave encashment paid to the family after an employee’s death is fully exempt.',
      'Any taxable portion is added to salary income for the year and taxed at your slab rate.',
    ],
    faqs: [
      {
        q: 'Is leave encashment during service taxable?',
        a: 'Yes, fully. The exemption under section 10(10AA) only applies to encashment at retirement or when leaving the job. Relief under section 89 may be available in some cases.',
      },
      {
        q: 'Why is the exemption limited to 30 days a year?',
        a: 'The law caps the calculation at 30 days of leave for each completed year of service, regardless of your employer’s more generous policy. Days beyond that are paid but not exempt.',
      },
      {
        q: 'Do government employees pay tax on leave encashment?',
        a: 'No. Leave encashment received on retirement by central or state government employees is fully exempt from income tax.',
      },
    ],
  },
};

export default leaveEncashment;
