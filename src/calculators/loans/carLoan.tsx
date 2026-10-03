import type { CalculatorDef, Values } from '../types';
import { calculateLoanEmi, financedAmount, type LoanEmiResult } from '@/engines/loanTypes';
import { formatINR } from '@/lib/format';
import { num } from '@/lib/validate';
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

const carLoan: CalculatorDef<LoanEmiResult> = {
  id: 'car-loan-emi',

  groups: [CHARGES_GROUP],

  fields: [
    ...amountFields({
      label: 'Car Loan Amount',
      default: 800000,
      max: 50000000,
      step: 10000,
      help: 'The amount financed — the on-road price minus your down payment.',
      price: {
        label: 'On-road Price',
        default: 1000000,
        max: 60000000,
        step: 10000,
        help: 'Ex-showroom price plus road tax, registration and insurance. Many lenders finance a share of the on-road price; some only of the ex-showroom price.',
        downPaymentDefault: 20,
        downPaymentHelp: 'Banks typically finance 80%–100% of the price for a new car. A 20% down payment keeps both the EMI and the interest in check.',
        startWith: 'price',
      },
    }),
    rateField({
      default: 9,
      max: 30,
      help: 'New-car loans from banks are usually fixed-rate. Used-car loans cost more — often 3–6 percentage points higher.',
    }),
    ...tenureFields({
      defaultYears: 5,
      maxYears: 8,
      defaultMonths: 60,
      help: 'Most lenders offer 1 to 7 years. Keeping it to 4–5 years avoids owing more than the car is worth.',
    }),
    feeField({
      default: 0.5,
      help: 'Car loan processing fees are usually 0.25%–1% of the loan, or a flat amount, plus 18% GST.',
    }),
  ],

  compute: (v) => calculateLoanEmi(toInput(v)),

  hero: (r) => ({ label: 'Monthly Car Loan EMI', value: formatINR(r.emi), caption: emiHeroCaption(r) }),

  stats: (r, v) => [
    ...(r.price != null
      ? [
          { label: 'On-road price', value: formatINR(r.price) },
          { label: 'Down payment', value: formatINR(r.downPayment ?? 0) },
        ]
      : []),
    ...coreStats(r),
    ...chargeStats(r, num(v.interestRate)),
    ...(r.price != null
      ? [
          {
            label: 'Total cost of the car',
            value: formatINR((r.downPayment ?? 0) + r.totalPayment + r.fee + r.gstOnFee),
            tone: 'accent' as const,
            help: 'Down payment + every EMI + processing fee: what the car really costs you on this loan.',
          },
        ]
      : []),
  ],

  charts: (r) => emiCharts(r),

  table: (r) => emiTable(r, 'paisewise-car-loan-schedule'),

  summary: (r) => emiSummary('Car loan', r),

  content: {
    intro: {
      heading: 'What is a car loan EMI?',
      paragraphs: [
        'A car loan EMI is the fixed monthly amount you repay to the bank or NBFC that financed your car. It covers interest on the outstanding balance plus part of the principal, so that the loan is fully repaid by the end of the tenure — usually three to seven years.',
        'This car loan EMI calculator starts from the car’s on-road price and your down payment, and shows the EMI, the total interest, the full amortisation schedule and the true total cost of the car once every EMI and the processing fee are counted. You can switch to entering the loan amount directly if you already know it.',
      ],
    },
    howItWorks: [
      'Enter the on-road price and the down payment you plan to make (or the loan amount), the interest rate and the tenure. The calculator finances the balance and applies the standard reducing-balance EMI formula used by banks for car loans.',
      'Interest is charged each month on the balance you still owe, so early EMIs are interest-heavy and later ones mostly repay principal. The schedule shows exactly how much of each EMI goes where.',
      'Add the processing fee to see the effective annual cost (APR) of the loan. Use it to compare offers: a lower rate with a higher fee can cost more than it looks.',
    ],
    formula: EMI_FORMULA,
    example: [
      'A car with an on-road price of ₹10,00,000 and a 20% down payment of ₹2,00,000, so the loan is ₹8,00,000.',
      'At 9% a year for 5 years (60 months), the monthly rate is 9 ÷ 12 ÷ 100 = 0.0075.',
      'EMI ≈ ₹16,607. Total repaid ≈ ₹9,96,401, of which ₹1,96,401 is interest.',
      'With a 0.5% processing fee plus GST (₹4,720), the effective annual cost rises to about 9.25%.',
    ],
    sections: [
      {
        heading: 'Car loan EMI for common loan amounts',
        paragraphs: ['EMIs at 9% a year over 5 years. Change the rate and tenure in the calculator for your offer.'],
        table: {
          columns: ['Loan amount', 'Monthly EMI', 'Total interest', 'Total repayment'],
          rows: [
            ['₹5 lakh', '₹10,379', '₹1,22,751', '₹6,22,751'],
            ['₹8 lakh', '₹16,607', '₹1,96,401', '₹9,96,401'],
            ['₹10 lakh', '₹20,758', '₹2,45,501', '₹12,45,501'],
            ['₹15 lakh', '₹31,138', '₹3,68,252', '₹18,68,252'],
            ['₹20 lakh', '₹41,517', '₹4,91,003', '₹24,91,003'],
          ],
        },
      },
      {
        heading: 'Choosing the tenure: 3, 5 or 7 years?',
        paragraphs: [
          'A car loses value every year while the loan balance falls slowly at first. A long tenure keeps the EMI low but means you may owe more than the car is worth for several years, and you pay noticeably more interest.',
        ],
        table: {
          caption: '₹8 lakh at 9% a year',
          columns: ['Tenure', 'Monthly EMI', 'Total interest', 'Total repayment'],
          rows: [
            ['3 years', '₹25,440', '₹1,15,832', '₹9,15,832'],
            ['4 years', '₹19,908', '₹1,55,586', '₹9,55,586'],
            ['5 years', '₹16,607', '₹1,96,401', '₹9,96,401'],
            ['6 years', '₹14,420', '₹2,38,271', '₹10,38,271'],
            ['7 years', '₹12,871', '₹2,81,186', '₹10,81,186'],
          ],
        },
        after: [
          'A popular rule of thumb is 20/4/10: put down at least 20%, borrow for no more than 4 years, and keep all car costs — EMI, fuel, insurance and maintenance — under 10% of your gross monthly income. It is deliberately conservative, but it keeps a car from straining your budget.',
        ],
      },
      {
        heading: 'New car vs used car loans',
        paragraphs: [
          'Used-car loans are riskier for lenders, so they usually carry higher rates, lower loan-to-value ratios and shorter tenures, often capped so that the car is no more than 8–10 years old at the end of the loan. An ₹8 lakh used-car loan at 12% for 5 years costs about ₹17,796 a month and ₹2.68 lakh in interest — roughly ₹71,000 more than the same loan at 9%.',
        ],
      },
      {
        heading: 'Watch out for flat-rate offers',
        paragraphs: [
          'Dealers and some finance companies quote a “flat” interest rate, where interest is charged on the original loan for the whole tenure instead of on the reducing balance. A 5% flat rate over 5 years is roughly equal to a 9% reducing-balance rate. Always ask for the reducing-balance rate or the APR in the Key Fact Statement, or convert a flat rate with the flat vs reducing rate calculator.',
        ],
      },
      {
        heading: 'Costs beyond the EMI',
        bullets: [
          'Processing and documentation fees, plus 18% GST on them.',
          'Motor insurance every year — comprehensive cover is compulsory while the car is hypothecated to the lender.',
          'Prepayment or foreclosure charges: many fixed-rate car loans charge 2%–6% of the outstanding amount if you close early, and some allow part-payments only after 6–12 EMIs.',
          'Hypothecation removal: after the last EMI, collect the lender’s No Objection Certificate and Form 35 and apply to the RTO to remove the hypothecation from your registration certificate.',
        ],
      },
      {
        heading: 'Is car loan interest tax deductible?',
        paragraphs: [
          'Not for a car bought for personal use by a salaried person. A self-employed person or business that uses the car for work can usually claim the interest and depreciation as business expenses. The Section 80EEB deduction for electric-vehicle loans applied only to loans sanctioned between 1 April 2019 and 31 March 2023.',
        ],
      },
    ],
    assumptions: [
      'The interest rate is fixed for the whole tenure, as it is on most new-car loans from banks.',
      'The loan is disbursed at once and every EMI is paid on time, with no prepayment.',
      'Insurance, fuel, maintenance and registration renewals are not included in the total cost.',
    ],
    notes: [
      'Negotiate the car price and the loan separately — a “zero-interest” or “low-EMI” scheme is often paid for through a higher price, fees or a compulsory insurance bundle.',
      'Pre-approved offers from your salary-account bank are often cheaper than dealer-arranged finance.',
    ],
    faqs: [
      {
        q: 'How is a car loan EMI calculated?',
        a: 'With the reducing-balance formula EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), where P is the loan amount, r the monthly rate and n the number of months. An ₹8 lakh loan at 9% for 5 years has an EMI of about ₹16,607.',
      },
      {
        q: 'What is the EMI on a ₹5 lakh car loan?',
        a: 'At 9% a year, about ₹10,379 a month over 5 years, ₹15,900 over 3 years, or ₹8,045 over 7 years.',
      },
      {
        q: 'How much down payment should I make on a car?',
        a: 'Banks will often finance 80%–100% of the price, but paying at least 20% keeps the EMI and interest lower and reduces the chance of owing more than the car is worth if you sell it early.',
      },
      {
        q: 'Can I prepay or foreclose a car loan?',
        a: 'Usually yes, but most car loans are fixed-rate and many lenders charge a foreclosure fee of 2%–6% of the outstanding principal, and may allow it only after a minimum number of EMIs. Check the Key Fact Statement before signing.',
      },
      {
        q: 'What credit score do I need for a car loan?',
        a: 'Lenders do not publish a fixed cut-off, but a CIBIL score of about 750 or more usually gets the best rates and a quicker approval. A lower score may mean a higher rate or a larger down payment.',
      },
      {
        q: 'Is a longer car loan tenure a good idea?',
        a: 'It lowers the EMI but increases total interest — an ₹8 lakh loan at 9% costs about ₹85,000 more over 7 years than over 5. Because cars lose value quickly, many advisers suggest keeping the tenure to 5 years or less.',
      },
    ],
    guides: ['how-emi-is-calculated', 'flat-vs-reducing-interest-rate', 'loan-processing-fees-and-apr'],
  },
};

export default carLoan;
