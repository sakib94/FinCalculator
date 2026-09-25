import type { CalculatorDef, Values } from '../types';
import { calculateHRA, type HraResult } from '@/engines/taxTools';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  basicSalary: num(v.basicSalary),
  dearnessAllowance: num(v.da),
  hraReceived: num(v.hraReceived),
  rentPaid: num(v.rentPaid),
  metroCity: str(v.city, 'metro') === 'metro',
  months: num(v.months, 12),
});

const hra: CalculatorDef<HraResult> = {
  id: 'hra-exemption',

  fields: [
    {
      name: 'city',
      label: 'City type',
      type: 'segmented',
      prominent: true,
      default: 'metro',
      options: [
        { label: 'Metro', value: 'metro' },
        { label: 'Non-Metro', value: 'non-metro' },
      ],
    },
    {
      name: 'basicSalary',
      label: 'Annual Basic Salary',
      type: 'currency',
      default: 600000,
      min: 0,
      max: 100000000,
      slider: true,
      step: 50000,
      help: 'Basic pay only — not gross salary. Using gross is the most common mistake here.',
    },
    {
      name: 'da',
      label: 'Annual Dearness Allowance',
      type: 'currency',
      default: 0,
      min: 0,
      max: 50000000,
      slider: true,
      step: 10000,
      optional: true,
      help: 'Only DA that forms part of retirement benefits counts. Most private-sector employees have none.',
    },
    {
      name: 'hraReceived',
      label: 'Annual HRA Received',
      type: 'currency',
      default: 240000,
      min: 0,
      max: 50000000,
      slider: true,
      step: 10000,
      help: 'The house rent allowance component shown on your payslip.',
    },
    {
      name: 'rentPaid',
      label: 'Annual Rent Paid',
      type: 'currency',
      default: 300000,
      min: 0,
      max: 50000000,
      slider: true,
      step: 10000,
      help: 'Total rent actually paid for the year. You need rent receipts, and the landlord’s PAN if rent exceeds ₹1 lakh a year.',
    },
    {
      name: 'months',
      label: 'Months rent was paid',
      type: 'number',
      default: 12,
      min: 1,
      max: 12,
      unit: 'mo',
      slider: true,
      help: 'Reduce this if you rented for only part of the year.',
    },
  ],

  compute: (v) => calculateHRA(toInput(v)),

  hero: (r) => [
    {
      label: 'HRA exempt from tax',
      value: formatINR(r.exemptAmount),
      caption: r.noBenefit
        ? 'No exemption — your rent does not exceed 10% of salary'
        : `${formatPercent((r.exemptAmount / Math.max(1, r.hraReceived)) * 100, 0)} of the HRA you receive`,
    },
    {
      label: 'Taxable HRA',
      value: formatINR(r.taxableHra),
      caption: 'Added to your salary income and taxed at your slab rate',
    },
  ],

  stats: (r) => [
    { label: 'Salary for HRA (Basic + DA)', value: formatINR(r.salaryForHra) },
    { label: 'HRA received', value: formatINR(r.hraReceived) },
    { label: 'Rent paid', value: formatINR(r.rentPaid) },
    {
      label: 'Rent must exceed',
      value: formatINR(r.rentThreshold),
      help: '10% of salary. Rent below this earns no exemption at all.',
    },
    {
      label: 'Optimal rent',
      value: formatINR(r.optimalRent),
      tone: 'accent',
      help: 'Paying more rent than this adds nothing, because another limit takes over.',
    },
  ],

  charts: (r) => [
    {
      kind: 'bar' as const,
      title: 'The three limits — the least one wins',
      x: ['HRA received', 'Rent − 10% salary', `${r.cityRatePct}% of salary`],
      series: [{ name: 'Limit', values: r.limits.map((l) => l.amount) }],
    },
    {
      kind: 'donut' as const,
      title: 'How your HRA splits',
      centerLabel: 'HRA',
      data: [
        { label: 'Exempt', value: r.exemptAmount },
        { label: 'Taxable', value: r.taxableHra },
      ],
    },
  ],

  table: (r) => ({
    title: 'Statutory limits under rule 2A',
    csvName: 'finora-hra-exemption',
    columns: [
      { key: 'limit', label: 'Limit', align: 'left' },
      { key: 'amount', label: 'Amount' },
      { key: 'applied', label: 'Applied', align: 'left' },
    ],
    rows: r.limits.map((l) => ({
      limit: l.label,
      amount: formatINR(l.amount),
      applied: l.applied ? '← least, so this applies' : '',
    })),
    footer: {
      limit: 'Exempt under section 10(13A)',
      amount: formatINR(r.exemptAmount),
      applied: '',
    },
    note: 'The exemption is always the least of the three. Increasing rent stops helping once one of the other two binds.',
  }),

  summary: (r) =>
    `HRA exemption ${formatINR(r.exemptAmount)} of ${formatINR(r.hraReceived)} received — ${formatINR(
      r.taxableHra,
    )} remains taxable.`,

  content: {
    howItWorks: [
      'House rent allowance is exempt under section 10(13A) read with rule 2A, but only up to the LEAST of three amounts: the actual HRA you receive, the rent you paid less 10% of salary, and 50% of salary for a metro city or 40% elsewhere. That "least of" is the entire rule, and it is what surprises people — paying more rent stops helping the moment one of the other two limits becomes the smallest.',
      '"Salary" here has a specific meaning: basic pay plus dearness allowance that forms part of retirement benefits, plus any commission based on a fixed percentage of turnover. It is not gross salary, and it does not include other allowances. Using gross salary inflates every limit and produces a wrong answer.',
      'Notice the 10% deduction. If your rent is less than 10% of your basic salary, the second limit is zero and you get no exemption at all, no matter how much HRA you receive. The "rent must exceed" figure above is that threshold.',
      'The metro definition is narrow and fixed by statute: only Delhi, Mumbai, Kolkata and Chennai qualify for the 50% rate. Bengaluru, Hyderabad, Pune and every other city are non-metro at 40%, however expensive they have become.',
    ],
    formula: `Exempt HRA = LEAST of:

  1. Actual HRA received
  2. Rent paid − 10% of salary
  3. 50% of salary  (Delhi, Mumbai, Kolkata, Chennai)
     40% of salary  (everywhere else)

Salary = Basic + DA (forming part of retirement benefits)
         + commission on turnover`,
    example: [
      'Basic ₹6,00,000, HRA received ₹2,40,000, rent paid ₹3,00,000, living in Mumbai.',
      'Limit 1: ₹2,40,000. Limit 2: 3,00,000 − 60,000 = ₹2,40,000. Limit 3: 50% of 6,00,000 = ₹3,00,000.',
      'The least is ₹2,40,000 — the whole HRA is exempt, and nothing is added to taxable salary.',
    ],
    assumptions: [
      'You actually pay the rent and can produce receipts. A claim without supporting evidence will not survive scrutiny.',
      'DA is included only where it forms part of retirement benefits, which is typical for government employees and rare in the private sector.',
      'The same rent and salary apply for the whole period entered. If either changed mid-year, compute each period separately and add the results.',
      'You are not claiming a home loan interest deduction on a self-occupied property in the same city — that combination invites questions.',
    ],
    notes: [
      'HRA exemption is available ONLY under the old tax regime. The new regime removes it entirely, which is often the deciding factor between the two for people paying significant rent.',
      'If annual rent exceeds ₹1,00,000, you must report the landlord’s PAN to your employer. Without it the exemption is usually denied.',
      'Where rent exceeds ₹50,000 a month, the tenant must deduct TDS at 2% under section 194-IB.',
      'You can claim HRA and home loan interest together if the property you own is in a different city, or genuinely cannot be occupied — but be prepared to justify it.',
      'Rent paid to a parent is allowed if the arrangement is genuine: they must own the property, and must declare the rent as income.',
    ],
    faqs: [
      {
        q: 'Which cities count as metro for HRA?',
        a: 'Only four: Delhi, Mumbai, Kolkata and Chennai. The list is fixed in the Income Tax Act and has not been updated, so Bengaluru, Hyderabad, Pune and Gurgaon are all treated as non-metro at 40%.',
      },
      {
        q: 'Can I claim HRA under the new tax regime?',
        a: 'No. Section 10(13A) is one of the exemptions withdrawn under the new regime. If you pay substantial rent, run both regimes through the income tax calculator before choosing.',
      },
      {
        q: 'Can I pay rent to my parents and claim HRA?',
        a: 'Yes, provided the arrangement is real. Your parents must own the property, you must actually transfer the rent, and they must declare it as income in their own return. Keep the bank transfers and a rent agreement.',
      },
      {
        q: 'What if I do not receive HRA at all?',
        a: 'Then section 10(13A) does not apply, but you may be able to claim a deduction under section 80GG instead — the least of ₹5,000 a month, 25% of total income, or rent paid less 10% of income.',
      },
      {
        q: 'Why is my exemption lower than the rent I pay?',
        a: 'Because one of the other two limits is smaller. Check the chart above: whichever bar is shortest is what you get. Usually it is the HRA actually received, which no amount of extra rent can increase.',
      },
    ],
  },
};

export default hra;
