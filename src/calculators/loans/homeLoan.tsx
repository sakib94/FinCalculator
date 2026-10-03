import type { CalculatorDef, Values } from '../types';
import { calculateLoanEmi, homeLoanLtvCap, homeLoanTaxBenefit, type LoanEmiResult } from '@/engines/loanTypes';
import { financedAmount } from '@/engines/loanTypes';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';
import { Note } from '@/components/Results';
import {
  CHARGES_GROUP,
  EMI_FORMULA,
  amountFields,
  amountMode,
  chargeStats,
  coreStats,
  emiCharts,
  emiHeroCaption,
  emiSummary,
  emiTable,
  feeField,
  rateField,
  tenureFields,
  tenureOf,
  tenureUnitOf,
} from './loanShared';

const toInput = (v: Values) => {
  const fromPrice = amountMode(v) === 'price';
  const { loan, downPayment } = financedAmount(num(v.price), num(v.downPaymentPct));
  return {
    principal: fromPrice ? loan : num(v.principal),
    price: fromPrice ? num(v.price) : undefined,
    downPayment: fromPrice ? downPayment : undefined,
    annualRatePct: num(v.interestRate),
    tenure: tenureOf(v),
    tenureUnit: tenureUnitOf(v),
    feePct: num(v.feePct),
  };
};

const slabOf = (v: Values) => num(str(v.taxSlab, '20'));

const homeLoan: CalculatorDef<LoanEmiResult> = {
  id: 'home-loan-emi',

  groups: [CHARGES_GROUP, { id: 'tax', title: 'Tax benefit (old regime)', collapsible: true, defaultOpen: false }],

  fields: [
    ...amountFields({
      label: 'Home Loan Amount',
      default: 5000000,
      max: 1000000000,
      step: 100000,
      help: 'The amount the bank lends — the property price minus your down payment.',
      price: {
        label: 'Property Price',
        default: 6250000,
        max: 1500000000,
        step: 100000,
        help: 'Agreement value of the flat or house. Banks exclude stamp duty and registration from this for properties above ₹10 lakh.',
        downPaymentDefault: 20,
        downPaymentHelp: 'RBI lets banks lend at most 90% of the value for loans up to ₹30 lakh, 80% up to ₹75 lakh and 75% above that.',
        startWith: 'loan',
      },
    }),
    rateField({
      default: 8.5,
      max: 20,
      help: 'Most home loans are floating and linked to the RBI repo rate, so this rate — and your tenure — can change over the life of the loan.',
    }),
    ...tenureFields({
      defaultYears: 20,
      maxYears: 30,
      defaultMonths: 240,
      help: 'Banks allow up to 30 years, usually ending by age 60–70. A longer tenure lowers the EMI but sharply raises total interest.',
    }),
    feeField({
      default: 0.5,
      help: 'Banks typically charge 0.25%–1% of the loan, often capped, plus 18% GST. Enter 0 if your lender has waived it.',
    }),
    {
      name: 'taxSlab',
      label: 'Your income tax slab',
      type: 'select',
      default: '20',
      group: 'tax',
      options: [
        { label: 'New regime / not claiming', value: '0' },
        { label: '5% slab', value: '5' },
        { label: '20% slab', value: '20' },
        { label: '30% slab', value: '30' },
      ],
      help: 'Deductions for a self-occupied home are available only under the old tax regime.',
    },
  ],

  compute: (v) => calculateLoanEmi(toInput(v)),

  hero: (r) => ({ label: 'Monthly Home Loan EMI', value: formatINR(r.emi), caption: emiHeroCaption(r) }),

  stats: (r, v) => [
    ...(r.price != null
      ? [
          { label: 'Property price', value: formatINR(r.price) },
          { label: 'Down payment', value: formatINR(r.downPayment ?? 0) },
        ]
      : []),
    ...coreStats(r),
    ...chargeStats(r, num(v.interestRate)),
  ],

  extra: (r, v) => {
    const slab = slabOf(v);
    const benefit = homeLoanTaxBenefit(r.yearly[0], slab);
    const cap = homeLoanLtvCap(r.principal);
    return (
      <>
        {r.ltvPct != null && r.ltvPct > cap + 0.01 && (
          <Note tone="warn">
            This loan is {formatPercent(r.ltvPct, 1)} of the property price, but RBI rules cap a home loan of{' '}
            {formatINR(r.principal)} at {cap}% of the value. Expect to pay at least{' '}
            {formatINR((r.price ?? 0) * (1 - cap / 100))} as down payment.
          </Note>
        )}
        {slab > 0 ? (
          <Note>
            <strong>Tax saving in year 1 (old regime):</strong> about {formatINR(benefit.taxSaved)} — interest of{' '}
            {formatINR(benefit.interest)} gives a Section 24(b) deduction of {formatINR(benefit.interestDeduction)}{' '}
            (limit ₹2 lakh), and principal of {formatINR(benefit.principal)} counts towards Section 80C (limit ₹1.5
            lakh, shared with EPF, PPF and others). Assumes a self-occupied home.
          </Note>
        ) : (
          <Note>
            Under the new tax regime there is no deduction for a self-occupied home loan. Choose your old-regime slab
            under “Tax benefit” to see the Section 24(b) and 80C saving.
          </Note>
        )}
      </>
    );
  },

  charts: (r) => emiCharts(r),

  table: (r) => emiTable(r, 'paisewise-home-loan-schedule'),

  summary: (r) => emiSummary('Home loan', r),

  content: {
    intro: {
      heading: 'What is a home loan EMI?',
      paragraphs: [
        'A home loan EMI (equated monthly instalment) is the fixed amount you pay your bank or housing finance company every month until the loan is repaid. Each EMI contains two parts: interest on the balance you still owe, and a repayment of principal. Because a home loan is large and long — often ₹30 lakh to ₹1 crore over 15 to 30 years — even a small change in the rate or tenure moves the total cost by lakhs of rupees.',
        'This home loan EMI calculator shows your monthly EMI, the total interest over the life of the loan, the year-by-year split between principal and interest, and a month-by-month amortisation schedule you can download. You can start from the loan amount, or from the property price and your down payment, and see the income tax you could save under the old regime.',
      ],
    },
    howItWorks: [
      'Enter the loan amount (or the property price and down payment), the interest rate your lender quotes and the tenure. The calculator applies the standard reducing-balance EMI formula that every Indian bank uses, then builds the full repayment schedule month by month.',
      'Interest each month is charged only on the balance still outstanding. In the early years that balance is large, so most of each EMI goes to interest; as the balance falls, more of the same EMI goes to principal. On a 20-year loan at 8.5%, roughly 80% of the first year’s EMIs is interest.',
      'If you add a processing fee, the calculator also works out the effective annual cost (APR): the true rate you pay once the fee, and the GST on it, are counted.',
    ],
    formula: EMI_FORMULA,
    example: [
      'Loan of ₹50,00,000 at 8.5% a year for 20 years (240 months).',
      'Monthly rate r = 8.5 ÷ 12 ÷ 100 = 0.0070833; (1 + r)²⁴⁰ ≈ 5.44.',
      'EMI = 50,00,000 × 0.0070833 × 5.44 ÷ (5.44 − 1) ≈ ₹43,391.',
      'Total repaid ≈ ₹1.04 crore, of which ₹54.1 lakh is interest — more than the amount borrowed.',
      'In year one you pay about ₹4.21 lakh of interest and only ₹99,500 of principal.',
    ],
    sections: [
      {
        heading: 'Home loan EMI for common loan amounts',
        paragraphs: ['EMIs at 8.5% a year over 20 years. Use the calculator above for your exact rate and tenure.'],
        table: {
          columns: ['Loan amount', 'Monthly EMI', 'Total interest', 'Total repayment'],
          rows: [
            ['₹20 lakh', '₹17,356', '₹21,65,552', '₹41,65,552'],
            ['₹30 lakh', '₹26,035', '₹32,48,327', '₹62,48,327'],
            ['₹50 lakh', '₹43,391', '₹54,13,879', '₹1,04,13,879'],
            ['₹75 lakh', '₹65,087', '₹81,20,818', '₹1,56,20,818'],
            ['₹1 crore', '₹86,782', '₹1,08,27,758', '₹2,08,27,758'],
          ],
        },
      },
      {
        heading: 'How tenure changes the cost of a ₹50 lakh home loan',
        paragraphs: [
          'Stretching the tenure lowers the EMI, but the saving each month is small compared with the extra interest you pay in total. Going from 20 to 30 years cuts the EMI by about ₹5,000 but adds more than ₹34 lakh of interest.',
        ],
        table: {
          caption: '₹50 lakh at 8.5% a year',
          columns: ['Tenure', 'Monthly EMI', 'Total interest', 'Total repayment'],
          rows: [
            ['10 years', '₹61,993', '₹24,39,141', '₹74,39,141'],
            ['15 years', '₹49,237', '₹38,62,656', '₹88,62,656'],
            ['20 years', '₹43,391', '₹54,13,879', '₹1,04,13,879'],
            ['25 years', '₹40,261', '₹70,78,406', '₹1,20,78,406'],
            ['30 years', '₹38,446', '₹88,40,443', '₹1,38,40,443'],
          ],
        },
        after: [
          'A practical middle path is to take a longer tenure for a comfortable EMI and then prepay whenever you have surplus cash — floating-rate home loans to individuals carry no prepayment penalty, so every rupee prepaid early saves many rupees of interest later.',
        ],
      },
      {
        heading: 'How much will the bank lend? Loan-to-value (LTV) rules',
        paragraphs: [
          'The Reserve Bank of India caps how much of a property’s value a bank may finance. You must fund the rest — the down payment or “margin” — yourself, along with stamp duty, registration and interiors, which banks generally do not finance for homes above ₹10 lakh.',
        ],
        table: {
          columns: ['Loan amount', 'Maximum LTV', 'Minimum down payment'],
          rows: [
            ['Up to ₹30 lakh', '90% of property value', '10%'],
            ['₹30 lakh to ₹75 lakh', '80% of property value', '20%'],
            ['Above ₹75 lakh', '75% of property value', '25%'],
          ],
        },
        after: [
          'Your income also limits the loan. Lenders usually keep all your EMIs within 40%–60% of your net monthly income (the FOIR). Use the loan eligibility calculator to estimate the amount you are likely to be sanctioned.',
        ],
      },
      {
        heading: 'Home loan tax benefits (old regime)',
        paragraphs: [
          'A home loan is one of the few loans that reduces your income tax — but only under the old tax regime for a self-occupied home. The calculator estimates your first-year saving from the tax slab you choose.',
        ],
        bullets: [
          'Section 24(b) — interest: up to ₹2 lakh a year on a self-occupied home. Interest paid before construction is complete is deductible in five equal parts from the year you get possession, within the same ₹2 lakh limit. If construction is not completed within five years, the limit falls to ₹30,000.',
          'Section 80C — principal: up to ₹1.5 lakh a year, together with EPF, PPF, ELSS, life insurance and other 80C items. Stamp duty and registration charges also count, in the year you pay them. The deduction is reversed if you sell the house within five years of taking possession.',
          'Joint home loans: each co-borrower who is also a co-owner can claim both deductions separately, which can double the benefit for a couple.',
          'Let-out property: interest is deductible without the ₹2 lakh cap, but the resulting loss that can be set off against other income is limited to ₹2 lakh a year, with the rest carried forward for up to eight years.',
          'New regime: no deduction for a self-occupied home. For a let-out home, interest can be deducted from the rent, but a resulting loss cannot be set off against salary.',
        ],
      },
      {
        heading: 'Fixed or floating rate?',
        paragraphs: [
          'Almost all home loans in India today are floating-rate loans linked to an external benchmark, usually the RBI repo rate. When the repo rate changes, your rate follows at the next reset — typically within three months. Banks normally keep your EMI the same and change the remaining tenure; if the tenure cannot be extended further, the EMI changes instead.',
          'Fixed-rate home loans exist but usually cost more, are often fixed only for the first few years, and can carry a prepayment charge. For a 15–30 year loan, floating is the usual choice. Re-run this calculator with a rate 1% higher than today’s to check that you could still afford the EMI if rates rise.',
        ],
      },
      {
        heading: 'Ways to reduce your home loan EMI and interest',
        bullets: [
          'Make a larger down payment: every ₹1 lakh less borrowed at 8.5% for 20 years saves about ₹868 a month and ₹1.08 lakh of interest.',
          'Compare lenders on the effective rate, including the processing fee — not just the headline rate. A 0.5% lower rate on ₹50 lakh for 20 years saves about ₹3.8 lakh.',
          'Prepay early. A prepayment removes all future interest on that amount; the prepayment calculator shows the saving.',
          'Increase your EMI with every salary hike. Even a 5% yearly increase can close a 20-year loan several years early.',
          'Ask your lender to move you to its current, lower benchmark rate if your loan is on an older MCLR or base-rate regime, or consider a balance transfer to another lender.',
        ],
      },
    ],
    assumptions: [
      'The interest rate stays the same for the whole tenure. On a floating-rate loan, a rate change usually changes the remaining tenure rather than the EMI.',
      'The full loan is disbursed at once. For an under-construction property disbursed in stages you pay pre-EMI interest on the amount released until full EMIs begin.',
      'Every EMI is paid in full and on time, with no prepayment or moratorium.',
      'The tax saving uses year one of the loan, not a financial year, for a self-occupied home, assumes you have enough tax payable to use the deductions, and includes 4% cess. The 80C limit is shared with your other investments.',
    ],
    notes: [
      'Most banks lend only until you turn 60 (salaried) or 65–70 (self-employed), which can cap the tenure you are offered.',
      'Home loan insurance is optional. If your lender adds a single-premium policy to the loan, you pay interest on it for the whole tenure.',
      'Keep your credit score above about 750 — the best advertised rates are generally offered only to borrowers with strong scores.',
    ],
    faqs: [
      {
        q: 'How is home loan EMI calculated?',
        a: 'EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), where P is the loan amount, r the monthly interest rate (annual rate ÷ 12 ÷ 100) and n the number of monthly instalments. For ₹50 lakh at 8.5% for 20 years this gives an EMI of about ₹43,391.',
      },
      {
        q: 'What is the EMI for a ₹30 lakh home loan?',
        a: 'At 8.5% a year, a ₹30 lakh home loan costs about ₹26,035 a month over 20 years, ₹29,542 over 15 years and ₹37,196 over 10 years. Enter your own rate above for an exact figure.',
      },
      {
        q: 'Is it better to choose a longer or shorter home loan tenure?',
        a: 'A shorter tenure costs much less in total interest; a longer tenure gives a lower, more comfortable EMI. Many borrowers take a longer tenure for safety and prepay when they can, since floating-rate home loans carry no prepayment penalty.',
      },
      {
        q: 'Does the EMI change when the RBI changes the repo rate?',
        a: 'Your interest rate changes at the next reset. Most banks keep the EMI constant and change the remaining tenure instead, unless the tenure would go beyond the permitted maximum. You can usually ask the bank to change the EMI instead of the tenure.',
      },
      {
        q: 'How much home loan can I get on my salary?',
        a: 'Banks typically keep total EMIs within 40%–60% of your net monthly income, and lend at most 75%–90% of the property value. On a take-home salary of ₹1 lakh with no other loans, a 50% limit allows an EMI of about ₹50,000 — roughly a ₹57 lakh loan at 8.5% for 20 years.',
      },
      {
        q: 'Can I claim tax benefits on a home loan under the new tax regime?',
        a: 'Not for a self-occupied home. Section 24(b) interest and Section 80C principal deductions are available only under the old regime. Under the new regime, interest on a let-out property can be deducted from rental income only.',
      },
      {
        q: 'Should I prepay my home loan or invest the money?',
        a: 'Prepaying earns a guaranteed, tax-free return equal to your loan rate. If you are in the old regime and already using the full ₹2 lakh interest deduction, prepaying slightly reduces that benefit. Investing may earn more over long periods but with risk. Many people split surplus money between the two.',
      },
    ],
    guides: ['how-emi-is-calculated', 'home-loan-tax-benefits', 'prepay-loan-or-invest', 'reduce-tenure-or-emi'],
  },
};

export default homeLoan;
