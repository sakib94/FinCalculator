import type { CalculatorDef, Values } from '../types';
import { CESS_PCT, calculateEducationLoan, type EducationLoanResult } from '@/engines/loanTypes';
import { formatDuration, formatINR } from '@/lib/format';
import { num, str } from '@/lib/validate';
import { Note } from '@/components/Results';
import {
  CHARGES_GROUP,
  EMI_FORMULA,
  amountFields,
  chargeStats,
  emiCharts,
  emiSummary,
  emiTable,
  feeField,
  rateField,
} from './loanShared';

const capitalises = (v: Values) => str(v.moratoriumInterest, 'capitalise') !== 'pay';

const toInput = (v: Values) => ({
  principal: num(v.principal),
  annualRatePct: num(v.interestRate),
  courseYears: num(v.courseYears),
  graceMonths: num(v.graceMonths),
  disbursement: str(v.disbursement, 'yearly') === 'upfront' ? ('upfront' as const) : ('yearly' as const),
  moratoriumInterest: capitalises(v) ? ('capitalise' as const) : ('pay' as const),
  repaymentYears: num(v.repaymentYears),
  feePct: num(v.feePct),
});

const educationLoan: CalculatorDef<EducationLoanResult> = {
  id: 'education-loan-emi',

  groups: [
    { id: 'moratorium', title: 'Course & moratorium' },
    CHARGES_GROUP,
    { id: 'tax', title: 'Tax benefit — Section 80E (old regime)', collapsible: true, defaultOpen: false },
  ],

  fields: [
    ...amountFields({
      label: 'Education Loan Amount',
      default: 1000000,
      max: 20000000,
      step: 50000,
      help: 'The total loan sanctioned for tuition, hostel, books and other course costs.',
    }),
    rateField({
      default: 10,
      max: 20,
      help: 'Public-sector banks usually charge less than private banks and NBFCs; many offer a concession for female students or for paying interest during the course.',
    }),
    {
      name: 'repaymentYears',
      label: 'Repayment Tenure',
      type: 'number',
      default: 7,
      min: 1,
      max: 15,
      unit: 'yrs',
      slider: true,
      help: 'Years of EMIs after the moratorium ends. Banks following the IBA model scheme allow up to 15 years.',
    },
    {
      name: 'courseYears',
      label: 'Course Duration',
      type: 'number',
      default: 2,
      min: 0,
      max: 6,
      unit: 'yrs',
      slider: true,
      group: 'moratorium',
      help: 'No EMIs are due while you study. Enter 0 if repayment starts straight away.',
    },
    {
      name: 'graceMonths',
      label: 'Grace Period After Course',
      type: 'number',
      default: 6,
      min: 0,
      max: 12,
      unit: 'months',
      slider: true,
      group: 'moratorium',
      help: 'Most banks give 6–12 months after the course (or until you find a job, if sooner) before EMIs begin.',
    },
    {
      name: 'disbursement',
      label: 'Loan is disbursed',
      type: 'segmented',
      default: 'yearly',
      group: 'moratorium',
      wide: true,
      options: [
        { label: 'Yearly, as fees fall due', value: 'yearly' },
        { label: 'All at once', value: 'upfront' },
      ],
      help: 'Banks usually pay the college year by year. Interest runs only on what has been paid out.',
    },
    {
      name: 'moratoriumInterest',
      label: 'Interest while studying',
      type: 'segmented',
      default: 'capitalise',
      group: 'moratorium',
      wide: true,
      options: [
        { label: 'Add to the loan', value: 'capitalise' },
        { label: 'Pay it monthly', value: 'pay' },
      ],
      help: 'Simple interest accrues during the moratorium. Unpaid, it is added to the loan when EMIs start; paying it as you go keeps the EMI lower.',
    },
    feeField({
      default: 0,
      help: 'Many public-sector banks charge no processing fee on education loans; private lenders often charge 0.5%–2% plus GST.',
    }),
    {
      name: 'taxSlab',
      label: 'Tax slab of the person repaying',
      type: 'select',
      default: '20',
      group: 'tax',
      options: [
        { label: 'New regime / not claiming', value: '0' },
        { label: '5% slab', value: '5' },
        { label: '20% slab', value: '20' },
        { label: '30% slab', value: '30' },
      ],
      help: 'Section 80E lets whoever took the loan — the student or a parent — deduct all interest paid, for up to 8 years. Old regime only.',
    },
  ],

  compute: (v) => calculateEducationLoan(toInput(v)),

  hero: (r, v) => [
    {
      label: 'Monthly EMI after the moratorium',
      value: formatINR(r.emi),
      caption: `${r.months} instalments starting after ${formatDuration(r.moratoriumMonths)}`,
    },
    capitalises(v)
      ? {
          label: 'Interest added while studying',
          value: formatINR(r.moratoriumInterest),
          caption: `Loan grows to ${formatINR(r.principal)} before EMIs begin`,
        }
      : {
          label: 'Monthly interest while studying',
          value: formatINR(r.moratoriumMonthlyInterest),
          caption: 'Once the full loan has been disbursed',
        },
  ],

  stats: (r, v) => [
    { label: 'Amount borrowed', value: formatINR(r.sanctioned) },
    { label: 'Moratorium', value: formatDuration(r.moratoriumMonths) },
    { label: 'Interest during moratorium', value: formatINR(r.moratoriumInterest), tone: 'negative' },
    { label: 'Loan when EMIs start', value: formatINR(r.principal) },
    { label: 'Total interest (whole loan)', value: formatINR(r.lifetimeInterest), tone: 'negative' },
    { label: 'Total repayment', value: formatINR(r.lifetimePaid), tone: 'accent' },
    ...chargeStats(r, num(v.interestRate)),
  ],

  extra: (r, v) => {
    const slab = num(str(v.taxSlab, '20'));
    const yearOneInterest = r.yearly[0]?.interestPaid ?? 0;
    const saved = yearOneInterest * (slab / 100) * (1 + CESS_PCT / 100);
    return slab > 0 ? (
      <Note>
        <strong>Section 80E (old regime):</strong> all interest paid is deductible, with no upper limit, for the year
        repayment starts and the next seven. In the first year of EMIs you pay about {formatINR(yearOneInterest)} of
        interest, saving roughly {formatINR(saved)} in tax at the {slab}% slab.
      </Note>
    ) : (
      <Note>
        Section 80E is not available under the new tax regime. Choose an old-regime slab under “Tax benefit” to see
        the saving.
      </Note>
    );
  },

  charts: (r) => [
    {
      kind: 'donut',
      title: 'Amount borrowed vs total interest',
      centerLabel: 'Total paid',
      data: [
        { label: 'Amount borrowed', value: r.sanctioned },
        { label: 'Interest', value: r.lifetimeInterest },
      ],
    },
    ...emiCharts(r, { balanceTitle: 'Outstanding balance during repayment' }).slice(1),
  ],

  table: (r) =>
    emiTable(
      r,
      'fincalc-education-loan-schedule',
      'The schedule starts with the first EMI, after the moratorium. For information only — your bank’s schedule depends on actual disbursement dates.',
    ),

  summary: (r) => emiSummary('Education loan', r),

  content: {
    intro: {
      heading: 'What is an education loan EMI?',
      paragraphs: [
        'An education loan pays for tuition, hostel, books, equipment and travel for studies in India or abroad. Unlike other loans, you do not start paying EMIs straight away: there is a moratorium — the length of the course plus a grace period, usually six months to a year — before repayment begins. Interest still accrues during that time.',
        'This education loan EMI calculator models the whole journey: yearly disbursements while you study, the simple interest that builds up during the moratorium, whether you pay it or let it be added to the loan, the EMI once repayment starts, and the Section 80E tax deduction on the interest.',
      ],
    },
    howItWorks: [
      'The calculator releases the loan either all at once or in equal yearly instalments at the start of each year of the course, as most banks do when paying college fees. Simple interest is charged each month only on what has been released so far.',
      'At the end of the moratorium, unpaid interest is added to the principal (“capitalised”) — the usual practice at Indian banks. If you choose to pay the interest monthly while studying, it is not added, and the EMI is lower.',
      'The EMI is then worked out on the balance at that point using the standard reducing-balance formula over your repayment tenure. The totals include interest from both phases.',
    ],
    formula: `Moratorium interest = Σ tranche × (annual rate ÷ 12) × months from its release to the first EMI

Loan at repayment = amount borrowed + moratorium interest   (if not paid during the course)

${EMI_FORMULA}`,
    example: [
      'A ₹10,00,000 loan at 10% for a 2-year course, released in two yearly tranches of ₹5,00,000, with a 6-month grace period — a 30-month moratorium.',
      'Interest on the first tranche: 5,00,000 × 10% ÷ 12 × 30 = ₹1,25,000. On the second: 5,00,000 × 10% ÷ 12 × 18 = ₹75,000. Total ₹2,00,000.',
      'Added to the loan, the balance when EMIs begin is ₹12,00,000. Repaid over 7 years, the EMI is about ₹19,921.',
      'Total repaid ≈ ₹16.73 lakh on a ₹10 lakh loan — ₹6.73 lakh of interest in all.',
    ],
    sections: [
      {
        heading: 'Pay interest during the course, or let it build up?',
        paragraphs: [
          'Paying the moratorium interest as it falls due — often from a parent’s income — stops it from being added to the loan and then charged interest itself for years. Several banks also give a small rate concession, often around 0.5% to 1%, if interest is serviced during the course.',
        ],
        table: {
          caption: '₹10 lakh at 10%, 2-year course, 6-month grace, 7-year repayment',
          columns: ['Option', 'EMI', 'Total interest', 'Total paid'],
          rows: [
            ['Yearly disbursal, interest added to loan', '₹19,921', '₹6,73,399', '₹16,73,399'],
            ['Yearly disbursal, interest paid monthly', '₹16,601', '₹5,94,499', '₹15,94,499'],
            ['Full amount upfront, interest added', '₹20,751', '₹7,43,124', '₹17,43,124'],
            ['Full amount upfront, interest paid', '₹16,601', '₹6,44,499', '₹16,44,499'],
          ],
        },
        after: [
          'Paying the interest monthly costs up to ₹8,333 a month once the full ₹10 lakh is out, but saves nearly ₹79,000 over the life of the loan and cuts the EMI by more than ₹3,300.',
        ],
      },
      {
        heading: 'Repayment tenure: 5, 7, 10 or 15 years',
        table: {
          caption: '₹10 lakh at 10%, interest added during a 30-month moratorium',
          columns: ['Repayment tenure', 'EMI', 'Total interest', 'Total paid'],
          rows: [
            ['5 years', '₹25,496', '₹5,29,787', '₹15,29,787'],
            ['7 years', '₹19,921', '₹6,73,399', '₹16,73,399'],
            ['10 years', '₹15,858', '₹9,02,971', '₹19,02,971'],
            ['15 years', '₹12,895', '₹13,21,147', '₹23,21,147'],
          ],
        },
        after: [
          'A long tenure keeps the EMI manageable on a starting salary. Because education loans on floating rates can be prepaid without penalty at most banks, you can start with a longer tenure and prepay as your income grows.',
        ],
      },
      {
        heading: 'Section 80E: tax deduction on education loan interest',
        bullets: [
          'The whole interest paid in a year is deductible — there is no upper limit, unlike Section 80C or 24(b).',
          'Available for eight years at most: the year you start paying interest and the seven years after, or until the interest is fully paid, if sooner.',
          'Only the interest qualifies, not the principal, and only on a loan from a bank, financial institution or approved charitable institution.',
          'The loan must be for higher education of yourself, your spouse, your children, or a student for whom you are the legal guardian. Whoever took the loan and repays it claims the deduction.',
          'The deduction is part of the old tax regime; it cannot be claimed under the new regime.',
        ],
      },
      {
        heading: 'Collateral, margin money and eligibility',
        paragraphs: [
          'Most banks follow the Indian Banks’ Association model education loan scheme. As a broad guide: loans up to ₹4 lakh need no margin (your own contribution) and no security; above ₹4 lakh, you contribute about 5% for studies in India and 15% abroad; up to ₹7.5 lakh, a co-borrower’s guarantee is usually enough, and larger loans generally need collateral such as property or fixed deposits. Parents or a guardian are normally co-borrowers.',
          'Loans of up to ₹7.5 lakh can be given without collateral under the Credit Guarantee Fund Scheme for Education Loans. Government interest-subsidy schemes, including the Central Sector Interest Subsidy scheme and PM-Vidyalaxmi, can reduce or remove the interest during the moratorium for eligible students from lower-income families at recognised institutions — check current eligibility on the Vidya Lakshmi portal.',
        ],
      },
      {
        heading: 'Studying abroad',
        paragraphs: [
          'Loans for studying abroad are larger and often come from NBFCs or international lenders, at higher rates and with processing fees. Beyond the rate, compare whether the loan is disbursed in rupees or foreign currency, whether the lender requires collateral, and whether interest must be paid during the course. A small difference in rate on a ₹40 lakh loan over 10 years amounts to lakhs of rupees — use the fee and APR fields to compare offers properly.',
        ],
      },
    ],
    assumptions: [
      'Yearly disbursements are equal and released at the start of each course year; real disbursements follow your college’s fee schedule.',
      'Interest during the moratorium is simple interest, as at most Indian banks. Some lenders compound it monthly or quarterly, which costs a little more.',
      'The interest rate stays the same throughout. Most education loans are floating-rate, so the EMI or tenure can change.',
      'The 80E estimate uses the first year of EMIs and includes 4% cess. It assumes the person repaying has enough taxable income to use the deduction.',
    ],
    notes: [
      'If a job starts before the grace period ends, EMIs often begin earlier — six months after getting a job, or the end of the grace period, whichever comes first.',
      'Paying even part of the moratorium interest helps. Every rupee of interest paid during the course is a rupee that is not charged interest for the next 5–15 years.',
    ],
    faqs: [
      {
        q: 'How is an education loan EMI calculated?',
        a: 'First, simple interest for the moratorium is worked out on each disbursed amount. If it is not paid, it is added to the principal. The EMI is then calculated on that balance with the standard formula EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1) over the repayment tenure.',
      },
      {
        q: 'Do I have to pay interest during the moratorium period?',
        a: 'Usually it is optional. If you do not pay, the interest is added to the loan when repayment begins. Paying it — even partly — lowers your EMI and total interest, and some banks offer a rate concession for doing so.',
      },
      {
        q: 'What is the EMI for a ₹10 lakh education loan?',
        a: 'At 10% with a 2-year course, a 6-month grace period, yearly disbursement and interest added during the moratorium, the EMI is about ₹19,921 over 7 years or ₹15,858 over 10 years. Paying interest during the course brings the 7-year EMI down to about ₹16,601.',
      },
      {
        q: 'How long is the moratorium on an education loan?',
        a: 'Typically the length of the course plus six months to one year. Under the IBA model scheme it is the course period plus one year. Some lenders end it earlier if you find a job.',
      },
      {
        q: 'Can I claim Section 80E on principal repayment?',
        a: 'No. Section 80E covers only the interest portion of your EMIs, but with no upper limit, for up to eight years. Principal repayments of an education loan do not qualify under Section 80C either.',
      },
      {
        q: 'Can I prepay an education loan?',
        a: 'Most banks allow prepayment without charges, especially on floating-rate education loans. Prepaying early saves the most interest; check your sanction letter for any conditions.',
      },
    ],
    guides: ['how-emi-is-calculated', 'loan-processing-fees-and-apr'],
  },
};

export default educationLoan;
