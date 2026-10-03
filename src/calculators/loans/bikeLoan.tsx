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

const bikeLoan: CalculatorDef<LoanEmiResult> = {
  id: 'bike-loan-emi',

  groups: [CHARGES_GROUP],

  fields: [
    ...amountFields({
      label: 'Bike Loan Amount',
      default: 119000,
      max: 5000000,
      step: 1000,
      help: 'The amount financed — the on-road price minus your down payment.',
      price: {
        label: 'On-road Price',
        default: 140000,
        max: 6000000,
        step: 1000,
        help: 'Ex-showroom price plus RTO registration, road tax and insurance — the amount on the dealer’s final quote.',
        downPaymentDefault: 15,
        downPaymentHelp: 'Two-wheeler loans usually finance 85%–95% of the on-road price; some offers go up to 100% for good credit profiles.',
        startWith: 'price',
      },
    }),
    rateField({
      default: 11,
      max: 36,
      help: 'Banks usually charge 9%–14% on two-wheeler loans; NBFCs and dealer finance can be considerably higher. Make sure this is a reducing-balance rate, not a flat rate.',
    }),
    ...tenureFields({
      defaultYears: 3,
      maxYears: 5,
      defaultMonths: 36,
      startIn: 'months',
      help: 'Two-wheeler loans run from 12 to 60 months; 24–36 months is the most common.',
    }),
    feeField({
      default: 1,
      help: 'Two-wheeler loan processing fees are typically 1%–3% of the loan or a flat amount, plus 18% GST. Dealers may add documentation charges too.',
    }),
  ],

  compute: (v) => calculateLoanEmi(toInput(v)),

  hero: (r) => ({ label: 'Monthly Bike Loan EMI', value: formatINR(r.emi), caption: emiHeroCaption(r) }),

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
            label: 'Total cost of the bike',
            value: formatINR((r.downPayment ?? 0) + r.totalPayment + r.fee + r.gstOnFee),
            tone: 'accent' as const,
            help: 'Down payment + every EMI + processing fee: what the two-wheeler really costs you on this loan.',
          },
        ]
      : []),
  ],

  charts: (r) => emiCharts(r),

  table: (r) => emiTable(r, 'paisewise-bike-loan-schedule'),

  summary: (r) => emiSummary('Bike loan', r),

  content: {
    intro: {
      heading: 'What is a bike loan EMI?',
      paragraphs: [
        'A bike loan — or two-wheeler loan — lets you buy a motorcycle or scooter and pay for it in fixed monthly instalments (EMIs), usually over one to five years. Each EMI pays the month’s interest on the balance still owed plus part of the principal.',
        'This bike loan EMI calculator works from the on-road price and your down payment, and shows the monthly EMI, the total interest, the effective cost including the processing fee, a full month-wise repayment schedule and the total you end up paying for the bike. It works for petrol and electric two-wheelers alike.',
      ],
    },
    howItWorks: [
      'Enter the on-road price and down payment (or the loan amount directly), the interest rate and the tenure in months. The calculator finances the balance and applies the reducing-balance EMI formula.',
      'Because two-wheeler loans are short, most of each EMI repays principal from the start: on a ₹1,19,000 loan at 11% for 36 months, about 72% of the very first EMI already goes towards the principal, and the interest share keeps falling from there.',
      'Two-wheeler loans often carry proportionally higher fees than other loans. Enter the processing fee to see the effective annual cost (APR) — the number to compare between a bank offer and dealer finance.',
    ],
    formula: EMI_FORMULA,
    example: [
      'A scooter with an on-road price of ₹1,40,000 and a 15% down payment of ₹21,000, so the loan is ₹1,19,000.',
      'At 11% a year for 36 months, the monthly rate is 11 ÷ 12 ÷ 100 ≈ 0.009167.',
      'EMI ≈ ₹3,896. Total repaid ≈ ₹1,40,253, of which ₹21,253 is interest.',
      'A 1% processing fee plus GST (₹1,404) raises the effective annual cost to about 11.8%.',
    ],
    sections: [
      {
        heading: 'Bike loan EMI for common loan amounts',
        paragraphs: ['EMIs at 11% a year over 36 months.'],
        table: {
          columns: ['Loan amount', 'Monthly EMI', 'Total interest', 'Total repayment'],
          rows: [
            ['₹50,000', '₹1,637', '₹8,930', '₹58,930'],
            ['₹75,000', '₹2,455', '₹13,395', '₹88,395'],
            ['₹1,00,000', '₹3,274', '₹17,859', '₹1,17,859'],
            ['₹1,50,000', '₹4,911', '₹26,789', '₹1,76,789'],
            ['₹2,00,000', '₹6,548', '₹35,719', '₹2,35,719'],
          ],
        },
      },
      {
        heading: '12, 24, 36 or 48 months?',
        table: {
          caption: '₹1,19,000 at 11% a year',
          columns: ['Tenure', 'Monthly EMI', 'Total interest', 'Total repayment'],
          rows: [
            ['12 months', '₹10,517', '₹7,209', '₹1,26,209'],
            ['24 months', '₹5,546', '₹14,112', '₹1,33,112'],
            ['36 months', '₹3,896', '₹21,253', '₹1,40,253'],
            ['48 months', '₹3,076', '₹28,630', '₹1,47,630'],
            ['60 months', '₹2,587', '₹36,241', '₹1,55,241'],
          ],
        },
        after: [
          'Moving from 36 to 60 months cuts the EMI by about ₹1,300 but adds ₹15,000 of interest — more than 10% of the loan. For a vehicle that is often replaced in four or five years, a shorter tenure usually makes more sense.',
        ],
      },
      {
        heading: 'The flat-rate trap in two-wheeler finance',
        paragraphs: [
          'Two-wheeler finance at the showroom is often advertised with a flat rate: interest is charged on the full loan amount for the entire tenure, even though you are repaying it every month. An “8% flat” loan of ₹1,19,000 over three years has an EMI of about ₹4,099 — the same as a reducing-balance rate of roughly 14.5%.',
          'Ask the dealer or lender for the Key Fact Statement, which must show the annual percentage rate (APR), or convert the flat rate with the flat vs reducing rate calculator before you sign.',
        ],
      },
      {
        heading: '“Zero down payment” and “low EMI” offers',
        bullets: [
          'Zero-down-payment schemes finance the whole on-road price, so you pay interest on the insurance and registration too, and the EMI is higher.',
          'Low-EMI schemes usually stretch the tenure or add a large final instalment; check the total repayment, not just the EMI.',
          '“Zero interest” offers are typically paid for through processing fees, advance EMIs or a smaller dealer discount. Compare the total cost of the bike with and without the offer.',
          'Advance EMIs — paying one or two EMIs upfront — reduce the money you actually receive and raise the effective rate.',
        ],
      },
      {
        heading: 'Documents and eligibility',
        paragraphs: [
          'Lenders usually ask for proof of identity and address (Aadhaar, PAN), income proof (salary slips or bank statements, or ITR for the self-employed) and a few photographs. Minimum income requirements for two-wheeler loans are low, and a good credit score can bring pre-approved offers with instant approval. The vehicle is hypothecated to the lender until the loan is repaid — collect the NOC and Form 35 after the last EMI to remove the hypothecation at the RTO.',
        ],
      },
    ],
    assumptions: [
      'The quoted rate is a reducing-balance rate and stays fixed for the tenure.',
      'The loan is disbursed at once, with no advance EMIs, and every EMI is paid on time.',
      'Insurance renewals, fuel or charging, and servicing are not included in the total cost.',
    ],
    notes: [
      'If you are offered advance EMIs, subtract them from the loan amount here and shorten the tenure accordingly to see the true EMI.',
      'Missing EMIs hurts your credit score and can lead to repossession of the vehicle, so pick an EMI you can pay comfortably every month.',
    ],
    faqs: [
      {
        q: 'How is a bike loan EMI calculated?',
        a: 'With the standard reducing-balance formula EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1). A ₹1,19,000 loan at 11% for 36 months has an EMI of about ₹3,896.',
      },
      {
        q: 'What is the EMI for a ₹1 lakh bike loan?',
        a: 'At 11% a year, about ₹3,274 a month for 36 months, ₹4,661 for 24 months or ₹8,838 for 12 months.',
      },
      {
        q: 'What is the interest rate on two-wheeler loans?',
        a: 'Banks commonly charge around 9%–14% a year, while NBFCs and dealer-arranged finance can charge more, especially for lower credit scores. Always compare the reducing-balance rate or APR rather than a flat rate.',
      },
      {
        q: 'Can I get a bike loan without a down payment?',
        a: 'Some lenders finance up to 100% of the on-road price for borrowers with good credit. It avoids an upfront payment, but you pay interest on the full amount — including insurance and registration — so the EMI and total cost are higher.',
      },
      {
        q: 'Can I close my bike loan early?',
        a: 'Usually, yes. Many lenders allow foreclosure after 6–12 EMIs, sometimes with a charge of 2%–5% of the outstanding principal. Check the foreclosure terms before you sign.',
      },
      {
        q: 'Are loans for electric scooters different?',
        a: 'The EMI calculation is the same. Some lenders offer slightly lower rates or longer tenures for electric two-wheelers. The Section 80EEB tax deduction on EV loan interest applied only to loans sanctioned between April 2019 and March 2023.',
      },
    ],
    guides: ['flat-vs-reducing-interest-rate', 'loan-processing-fees-and-apr', 'how-emi-is-calculated'],
  },
};

export default bikeLoan;
