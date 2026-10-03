import type { CalculatorDef, Values } from '../types';
import { calculateLoanEmi, type LoanEmiResult } from '@/engines/loanTypes';
import { formatINR } from '@/lib/format';
import { num } from '@/lib/validate';
import {
  CHARGES_GROUP,
  EMI_FORMULA,
  amountFields,
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

const toInput = (v: Values) => ({
  principal: num(v.principal),
  annualRatePct: num(v.interestRate),
  tenure: tenureOf(v),
  tenureUnit: tenureUnitOf(v),
  feePct: num(v.feePct),
});

/**
 * The general-purpose EMI calculator, presented as the personal loan
 * calculator. Old /emi links forward here.
 */
const personalLoan: CalculatorDef<LoanEmiResult> = {
  id: 'personal-loan-emi',

  groups: [{ ...CHARGES_GROUP, defaultOpen: true }],

  fields: [
    ...amountFields({
      label: 'Loan Amount',
      default: 500000,
      max: 100000000,
      step: 10000,
      help: 'The amount sanctioned. The processing fee is usually deducted from it before the money reaches your account.',
    }),
    rateField({
      default: 11.5,
      max: 36,
      help: 'Personal loans are unsecured and usually fixed-rate. Your rate depends mainly on your credit score, income and employer.',
    }),
    ...tenureFields({
      defaultYears: 3,
      maxYears: 7,
      defaultMonths: 36,
      help: 'Most personal loans run for 1 to 5 years; some lenders go up to 7.',
    }),
    feeField({
      default: 2,
      help: 'Personal loan fees are commonly up to 2%–3% of the loan, plus 18% GST, deducted from the disbursal.',
    }),
  ],

  compute: (v) => calculateLoanEmi(toInput(v)),

  hero: (r) => ({ label: 'Monthly EMI', value: formatINR(r.emi), caption: emiHeroCaption(r) }),

  stats: (r, v) => [
    ...coreStats(r),
    ...chargeStats(r, num(v.interestRate)),
    ...(r.fee > 0
      ? [
          {
            label: 'Amount you actually receive',
            value: formatINR(r.netDisbursal),
            help: 'Loan amount minus the processing fee and the GST on it.',
          },
        ]
      : []),
  ],

  charts: (r) => emiCharts(r),

  table: (r) => emiTable(r, 'paisewise-personal-loan-schedule'),

  summary: (r) => emiSummary('Personal loan', r),

  content: {
    intro: {
      heading: 'What is a personal loan EMI?',
      paragraphs: [
        'A personal loan is an unsecured loan — no property, car or gold is pledged — that you can use for almost anything: a wedding, medical bills, travel, home renovation or consolidating credit card debt. You repay it in equal monthly instalments (EMIs) over one to five years, sometimes seven.',
        'This personal loan EMI calculator shows your monthly EMI, the total interest, a month-by-month repayment schedule and, just as importantly, what the loan really costs once the processing fee is counted. It works as a general EMI calculator for any reducing-balance loan: enter the amount, rate and tenure of any loan to get its EMI.',
      ],
    },
    howItWorks: [
      'Enter the loan amount, the annual interest rate and the tenure. The calculator applies the standard reducing-balance EMI formula, the same one banks and NBFCs use, and lays out every instalment in the amortisation schedule.',
      'Each month, interest is charged on the balance you still owe; the rest of the EMI repays principal. Early EMIs therefore contain more interest, and later EMIs more principal.',
      'Personal loans usually carry a processing fee that is deducted before the money reaches you. The calculator shows the fee with GST, the amount you actually receive, and the effective annual cost (APR) — the true rate on the money in your hand.',
    ],
    formula: EMI_FORMULA,
    example: [
      'A ₹5,00,000 personal loan at 11.5% a year for 3 years (36 months).',
      'Monthly rate r = 11.5 ÷ 12 ÷ 100 ≈ 0.009583.',
      'EMI ≈ ₹16,488. Total repaid ≈ ₹5,93,568, of which ₹93,568 is interest.',
      'A 2% processing fee plus 18% GST (₹11,800) is deducted upfront, so you receive ₹4,88,200. The effective annual cost is about 13.2%, not 11.5%.',
    ],
    sections: [
      {
        heading: 'Personal loan EMI for common amounts',
        paragraphs: ['EMIs at 11.5% a year over 3 years.'],
        table: {
          columns: ['Loan amount', 'Monthly EMI', 'Total interest', 'Total repayment'],
          rows: [
            ['₹1 lakh', '₹3,298', '₹18,714', '₹1,18,714'],
            ['₹2 lakh', '₹6,595', '₹37,427', '₹2,37,427'],
            ['₹3 lakh', '₹9,893', '₹56,141', '₹3,56,141'],
            ['₹5 lakh', '₹16,488', '₹93,568', '₹5,93,568'],
            ['₹10 lakh', '₹32,976', '₹1,87,136', '₹11,87,136'],
          ],
        },
      },
      {
        heading: 'How the interest rate changes a ₹5 lakh loan',
        paragraphs: [
          'Personal loan rates vary far more between borrowers than home loan rates do — from around 10% for salaried employees of large companies with excellent credit, to well above 20% at some NBFCs and digital lenders. The difference adds up quickly.',
        ],
        table: {
          caption: '₹5 lakh over 3 years',
          columns: ['Interest rate', 'Monthly EMI', 'Total interest'],
          rows: [
            ['10.5%', '₹16,251', '₹85,044'],
            ['11.5%', '₹16,488', '₹93,568'],
            ['14%', '₹17,089', '₹1,15,197'],
            ['16%', '₹17,579', '₹1,32,827'],
            ['20%', '₹18,582', '₹1,68,945'],
            ['24%', '₹19,616', '₹2,06,191'],
          ],
        },
      },
      {
        heading: 'Choosing the tenure',
        table: {
          caption: '₹5 lakh at 11.5% a year',
          columns: ['Tenure', 'Monthly EMI', 'Total interest', 'Total repayment'],
          rows: [
            ['1 year', '₹44,308', '₹31,690', '₹5,31,690'],
            ['2 years', '₹23,420', '₹62,084', '₹5,62,084'],
            ['3 years', '₹16,488', '₹93,568', '₹5,93,568'],
            ['4 years', '₹13,045', '₹1,26,136', '₹6,26,136'],
            ['5 years', '₹10,996', '₹1,59,778', '₹6,59,778'],
          ],
        },
        after: [
          'Choose the shortest tenure whose EMI you can pay comfortably every month, even in a bad month. Lenders generally want all your EMIs together to stay below about 50% of your take-home pay.',
        ],
      },
      {
        heading: 'The real cost: processing fee, GST and APR',
        paragraphs: [
          'The interest rate is only part of a personal loan’s cost. The processing fee, and 18% GST on it, are usually deducted from the loan, so you receive less than you borrowed but repay EMIs on the full amount. That is why a 2% fee lifts an 11.5% loan to an effective 13.2% a year over three years — and the shorter the loan, the bigger the effect.',
          'Since October 2024, RBI rules require lenders to give every retail borrower a Key Fact Statement (KFS) before the loan is signed. It must show the annual percentage rate (APR), all fees and charges, and the repayment schedule. Use the APR to compare offers.',
        ],
      },
      {
        heading: 'What decides your personal loan interest rate?',
        bullets: [
          'Credit score: a CIBIL score of 750 or more usually unlocks the best rates; below about 700, offers are fewer and dearer.',
          'Income and employer: salaried employees of large, well-rated companies and government bodies generally get lower rates.',
          'Existing debt: if your current EMIs already use a large share of your income, expect a higher rate or a smaller loan.',
          'Relationship: pre-approved offers from the bank where your salary is credited are often cheaper than new-customer rates.',
        ],
      },
      {
        heading: 'Prepaying or foreclosing a personal loan',
        paragraphs: [
          'Most personal loans are fixed-rate, so the RBI rule that bars prepayment penalties on floating-rate loans usually does not apply. Many lenders charge 2%–5% of the outstanding principal plus GST to foreclose, and some allow it only after 6 or 12 EMIs.',
          'It can still pay to close early. On the ₹5 lakh, 11.5%, 3-year loan above, about ₹3.52 lakh is outstanding after 12 EMIs and ₹43,700 of interest is still to come. A 4% foreclosure charge with GST costs about ₹16,600, so closing the loan at that point saves around ₹27,000.',
        ],
      },
    ],
    assumptions: [
      'The interest rate is fixed for the whole tenure, as it is on most personal loans.',
      'The full loan is disbursed at once and the fee is deducted from it; every EMI is paid on time, with no prepayment.',
      'Insurance that some lenders bundle with the loan is not included. If it is added to the loan amount, include it in the amount above.',
    ],
    notes: [
      'Borrow only what you need: a personal loan is one of the most expensive forms of credit after credit cards.',
      'Avoid lenders that ask for an upfront fee before sanctioning a loan — genuine lenders deduct fees from the disbursal. Check that a digital lender is a bank or an RBI-registered NBFC.',
      'Using a personal loan to repay credit card dues at 36%–42% a year can save a lot of interest — as long as the cards are not run up again.',
    ],
    faqs: [
      {
        q: 'How is personal loan EMI calculated?',
        a: 'EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), where P is the loan amount, r the monthly interest rate and n the number of months. A ₹5 lakh loan at 11.5% for 3 years has an EMI of about ₹16,488.',
      },
      {
        q: 'What is the EMI for a ₹2 lakh personal loan?',
        a: 'At 11.5% a year, about ₹9,368 a month for 2 years or ₹6,595 a month for 3 years.',
      },
      {
        q: 'Can I use this as a general EMI calculator?',
        a: 'Yes. The EMI formula is the same for any reducing-balance loan. Enter the amount, rate and tenure of any loan to get its EMI and schedule. For home, car, bike and education loans, the dedicated calculators add down payments, tax benefits and moratoriums.',
      },
      {
        q: 'What is a good interest rate for a personal loan?',
        a: 'For a salaried borrower with a strong credit score, rates of roughly 10%–13% are competitive. Rates above 18%–20% are expensive; compare several lenders, and compare on the APR in the Key Fact Statement.',
      },
      {
        q: 'Does a personal loan affect my credit score?',
        a: 'Applying triggers a hard enquiry, which can dip your score slightly. Paying every EMI on time builds your credit history; a single missed EMI can lower your score noticeably and stays on your report.',
      },
      {
        q: 'Is personal loan interest tax deductible?',
        a: 'Generally no. The exceptions depend on how the money is used — for example, interest on money used to buy, build or repair a house may be claimable under Section 24(b), and money used in a business may be a business expense. Keep records if you plan to claim.',
      },
    ],
    guides: ['how-emi-is-calculated', 'loan-processing-fees-and-apr', 'prepay-loan-or-invest'],
  },
};

export default personalLoan;
