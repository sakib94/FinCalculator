import type { CalculatorDef, Values } from '../types';
import { calculateEligibility, type EligibilityResult } from '@/engines/loanTools';
import { formatINR, formatINRCompact } from '@/lib/format';
import { num } from '@/lib/validate';

const toInput = (v: Values) => ({
  monthlyIncome: num(v.monthlyIncome),
  otherMonthlyIncome: num(v.otherIncome),
  existingEmi: num(v.existingEmi),
  annualRatePct: num(v.rate),
  tenureYears: num(v.tenure),
  foirPct: num(v.foir),
  propertyValue: num(v.propertyValue),
  ltvPct: num(v.ltv),
});

const eligibility: CalculatorDef<EligibilityResult> = {
  id: 'loan-eligibility',

  groups: [
    { id: 'income', title: 'Your income and obligations' },
    { id: 'loan', title: 'Loan terms' },
    { id: 'property', title: 'Property (home loans only)', collapsible: true, defaultOpen: true },
  ],

  fields: [
    {
      name: 'monthlyIncome',
      label: 'Monthly Take-home Salary',
      type: 'currency',
      default: 100000,
      min: 5000,
      max: 100000000,
      slider: true,
      step: 5000,
      group: 'income',
      help: 'Net salary after tax and deductions — what actually reaches your account.',
    },
    {
      name: 'otherIncome',
      label: 'Other Monthly Income',
      type: 'currency',
      default: 0,
      min: 0,
      max: 10000000,
      slider: true,
      step: 5000,
      optional: true,
      group: 'income',
      help: 'Rent received, freelance income or a co-applicant’s salary. Lenders usually count only documented income.',
    },
    {
      name: 'existingEmi',
      label: 'Existing Monthly EMIs',
      type: 'currency',
      default: 0,
      min: 0,
      max: 10000000,
      slider: true,
      step: 1000,
      optional: true,
      group: 'income',
      help: 'All current loan instalments — car, personal, other home loans. These eat directly into your capacity.',
    },
    {
      name: 'foir',
      label: 'FOIR (income share allowed for EMIs)',
      type: 'percent',
      default: 50,
      min: 20,
      max: 75,
      step: 5,
      slider: true,
      group: 'income',
      help: 'Fixed obligation to income ratio. Most lenders allow 40–55%, higher for larger incomes.',
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
      group: 'loan',
    },
    {
      name: 'tenure',
      label: 'Loan Tenure',
      type: 'number',
      default: 20,
      min: 1,
      max: 35,
      unit: 'yrs',
      slider: true,
      group: 'loan',
      help: 'A longer tenure raises the amount you qualify for, but costs far more in total interest.',
    },

    {
      name: 'propertyValue',
      label: 'Property Value',
      type: 'currency',
      default: 8000000,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 100000,
      optional: true,
      group: 'property',
      help: 'Leave at 0 for a personal or unsecured loan, where no property cap applies.',
    },
    {
      name: 'ltv',
      label: 'Loan to Value allowed',
      type: 'percent',
      default: 80,
      min: 50,
      max: 90,
      step: 5,
      slider: true,
      group: 'property',
      help: 'RBI caps this at 90% for loans up to ₹30 lakh, 80% up to ₹75 lakh and 75% above that.',
    },
  ],

  compute: (v) => calculateEligibility(toInput(v)),

  hero: (r) => ({
    label: 'Loan you qualify for',
    value: formatINR(r.eligibleAmount),
    caption:
      r.cappedBy === 'property'
        ? `Limited by the property value, not your income`
        : `At an EMI of ${formatINRCompact(r.emiForEligible)} a month`,
  }),

  stats: (r) => [
    { label: 'Total income counted', value: formatINR(r.totalIncome) },
    {
      label: 'Max EMI allowed',
      value: formatINR(r.maxEmiAllowed),
      help: 'Your income multiplied by the FOIR.',
    },
    {
      label: 'EMI capacity left',
      value: formatINR(r.availableEmi),
      tone: r.availableEmi > 0 ? 'positive' : 'negative',
      help: 'After subtracting your existing EMIs.',
    },
    { label: 'EMI on this loan', value: formatINR(r.emiForEligible), tone: 'accent' },
    { label: 'Total interest', value: formatINR(r.totalInterest), tone: 'negative' },
    ...(r.downPayment > 0
      ? [
          {
            label: 'Down payment needed',
            value: formatINR(r.downPayment),
            help: 'Property value less the sanctioned loan — you fund this yourself.',
          },
        ]
      : []),
  ],

  charts: (r) => [
    {
      kind: 'bar' as const,
      title: 'What caps your loan',
      x: ['Based on income', 'Based on property', 'Sanctioned'],
      series: [
        {
          name: 'Amount',
          values: [r.eligibleByIncome, r.eligibleByLtv || r.eligibleByIncome, r.eligibleAmount],
        },
      ],
    },
    {
      kind: 'donut' as const,
      title: 'How your income is committed',
      centerLabel: 'Income',
      data: [
        { label: 'New loan EMI', value: r.emiForEligible },
        { label: 'Existing EMIs', value: Math.max(0, r.maxEmiAllowed - r.availableEmi) },
        {
          label: 'Free income',
          value: Math.max(0, r.totalIncome - r.maxEmiAllowed),
        },
      ],
    },
  ],

  summary: (r) =>
    `Eligible for a loan of ${formatINR(r.eligibleAmount)} at an EMI of ${formatINR(
      r.emiForEligible,
    )} — capped by ${r.cappedBy === 'property' ? 'property value' : 'income'}.`,

  content: {
    howItWorks: [
      'Lenders do not ask what you want to borrow; they work out what you can repay. The calculation starts from your net income, applies a FOIR — the share of income they will let go towards all loan instalments combined — and subtracts what you already pay each month. Whatever EMI capacity remains is then converted into a loan amount.',
      'That conversion is the present value of an annuity: given an EMI you can afford, an interest rate and a tenure, how much principal does that stream of payments support? Longer tenures and lower rates both increase it.',
      'For a secured loan there is a second cap. The RBI limits the loan-to-value ratio on home loans, so the bank will not lend more than 75–90% of the property value regardless of your income. Your sanction is the lower of the two limits — which is what the chart above shows.',
      'Raising the tenure is the easiest way to qualify for more, but it is not free: a 30-year loan qualifies you for roughly 15% more than a 20-year one while costing dramatically more in total interest.',
    ],
    formula: `Max EMI        = (income × FOIR) − existing EMIs

                 EMI × [1 − (1 + r)^−n]
Loan by income = ──────────────────────
                          r

Loan by LTV    = property value × LTV%
Sanctioned     = lower of the two

r = annual rate ÷ 12      n = tenure in months`,
    example: [
      '₹1,00,000 monthly net income, no existing EMIs, 50% FOIR.',
      'Max EMI = ₹50,000. At 8.75% over 20 years that supports a loan of about ₹56.5 lakh.',
      'On an ₹80 lakh property with 80% LTV, the property cap is ₹64 lakh — so income is the binding constraint and ₹56.5 lakh is sanctioned.',
    ],
    assumptions: [
      'FOIR is applied to net take-home income. Some lenders work from gross income instead, which produces a higher figure.',
      'Only documented, verifiable income counts. Cash income you cannot evidence will not be considered.',
      'Credit score is not modelled. A score below roughly 700 can reduce the FOIR allowed or raise the rate offered.',
      'Processing fees, insurance and stamp duty are not included in the loan amount and are usually paid separately.',
    ],
    notes: [
      'Adding a co-applicant with income is the most effective way to increase eligibility, because their income is added while the FOIR stays the same.',
      'Clearing a small personal loan or car loan before applying can raise your eligibility by several lakh, since existing EMIs come straight off your capacity.',
      'Loan-to-value caps set by the RBI: 90% for loans up to ₹30 lakh, 80% from ₹30–75 lakh, and 75% above ₹75 lakh.',
      'Stamp duty and registration cannot be included in the LTV calculation and must be funded from your own money.',
    ],
    faqs: [
      {
        q: 'What is FOIR and why does it matter?',
        a: 'Fixed obligation to income ratio — the maximum share of your income a lender will allow to go towards all EMIs together. Most banks use 40–55%, going higher for larger incomes because more is left over in absolute terms after essentials.',
      },
      {
        q: 'How can I increase my loan eligibility?',
        a: 'Add an earning co-applicant, close existing small loans, extend the tenure, or improve your credit score to negotiate a lower rate. Adding a co-applicant usually has the largest effect.',
      },
      {
        q: 'Why is my sanctioned amount lower than what I calculated?',
        a: 'Lenders apply their own income multiples, may not count variable pay or rental income in full, and will reduce the offer for a weak credit history. Treat this figure as an upper estimate of what to expect.',
      },
      {
        q: 'Does a longer tenure really help?',
        a: 'It increases the amount you qualify for, because the same EMI supports more principal. But the extra interest is substantial — always check the total interest figure before choosing a longer tenure purely to qualify.',
      },
    ],
  },
};

export default eligibility;
