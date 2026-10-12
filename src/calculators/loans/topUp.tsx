import type { CalculatorDef } from '../types';
import { calculateTopUp, type TopUpResult } from '@/engines/topup';
import { TopUpWorkspace } from '@/components/TopUpWorkspace';
import { defaultInput } from './topUpModel';
import { lakh, money, yrs } from './topUpReport';

/**
 * Loan Top-Up Calculator.
 *
 * A decision tool rather than an EMI calculator: it compares continuing
 * the existing loan with taking a top-up, from today, and says whether the
 * top-up looks reasonable. The inputs and results are richer than a flat
 * field list, so they live in their own workspace
 * (src/components/TopUpWorkspace.tsx). `compute` and `hero` describe the
 * example the page opens with.
 */
const topUp: CalculatorDef<TopUpResult> = {
  id: 'loan-top-up',
  fields: [],
  compute: () => calculateTopUp(defaultInput()),
  hero: (r) => ({
    label: 'Additional interest',
    value: money(r.option.additionalInterest),
    caption: `${lakh(r.option.charges.net)} in hand · ${yrs(r.option.months)}`,
  }),
  workspace: TopUpWorkspace,
  workspaceSections: [
    { id: 'tu-compare', label: 'Compare options' },
    { id: 'tu-tenure', label: 'Best tenure' },
    { id: 'tu-amounts', label: 'Top-up amount' },
    { id: 'tu-prepay', label: 'Prepayment' },
    { id: 'tu-decision', label: 'Recommendation' },
    { id: 'tu-schedule', label: 'Schedule' },
  ],

  content: {
    intro: {
      heading: 'What is a loan top-up?',
      paragraphs: [
        'A top-up is extra money borrowed on a loan you already have. The lender adds the new amount to what you still owe, and you repay the combined balance as one loan — often at a fresh interest rate and over a new tenure. Home loan top-ups are the most common, but many lenders offer them on personal and car loans too.',
        'The question is not only “what will my EMI be?”. It is how much money you will actually receive after charges, how much more the loan will cost you from today, which tenure balances EMI and interest best, and whether the top-up is a sensible way to raise the money at all. This calculator answers all four, with the working shown.',
      ],
    },
    howItWorks: [
      'Enter your existing loan from your latest statement: the original amount, rate and tenure in years, the EMIs paid, today’s EMI and the principal still outstanding. The EMIs left are worked out as the original tenure minus the EMIs paid, or you can enter the figure on your statement — if the two differ, the calculator says so and uses yours.',
      'Enter the money you need and the new terms on offer. The new loan is your outstanding principal plus the top-up, unless the bank has sanctioned a different amount. Processing fee (with 18% GST), other charges and insurance are taken out of the payout, so you see the cash you actually receive.',
      'Both options are compared from today. Without the top-up you keep paying today’s EMI for the EMIs left; with it you pay the new EMI over the new tenure. The difference in interest is the real cost of the decision. Interest you have already paid is a sunk cost — neither option gets it back — so it is shown separately and never counted.',
      'The tenure table compares 3 to 7 years (and your own choice), marking the lowest interest, the lowest EMI and the best balance. Give the EMI you are comfortable with and the shortest tenure within it is recommended.',
      'The decision card at the top reads green, amber or red from five checks: whether the top-up meets your need without over-borrowing, whether the EMI fits, how far the loan is stretched, how much extra interest you pay for each rupee received, and how much the charges take.',
    ],
    sections: [
      {
        heading: 'A worked example: ₹3 lakh on a ₹10 lakh balance',
        paragraphs: [
          'A ₹12.10 lakh loan at 11.25% over 6 years has had 16 EMIs of ₹23,104 paid, and ₹10,00,000 is still outstanding with 56 EMIs — 4 years 8 months — to go. The borrower needs ₹3,00,000 more, and the lender offers a top-up at 10.50% over 7 years.',
        ],
        table: {
          caption: 'Continuing the loan against a 7-year top-up',
          columns: ['From today', 'Without top-up', 'With top-up (7 years)'],
          rows: [
            ['Loan', '₹10,00,000 outstanding', '₹13,00,000'],
            ['EMI', '₹23,104 for 4 yrs 8 mo', '₹21,919 for 7 years'],
            ['Total payments', '₹12,93,824', '₹18,41,186'],
            ['Interest', '₹2,93,824', '₹5,41,186'],
          ],
        },
        after: [
          'The borrower receives ₹3,00,000 but commits to ₹5,47,362 more in future payments. That figure includes repaying the ₹3 lakh itself, so it is not all cost. The cost is the additional interest: ₹5,41,186 − ₹2,93,824 = ₹2,47,362, about ₹0.82 for every rupee received.',
          'Of that, ₹1,22,473 comes from stretching the ₹10 lakh already owed over 7 years instead of 4 years 8 months, and ₹1,24,889 is interest on the new ₹3 lakh. The EMI falls by ₹1,185, but the loan runs 2 yrs 4 mo longer — a lower EMI, not a cheaper loan.',
        ],
      },
      {
        heading: 'Is a 5-year or a 7-year top-up better?',
        paragraphs: ['The same ₹13 lakh at 10.50% over five tenures:'],
        table: {
          columns: ['Tenure', 'EMI', 'Total payment', 'Interest'],
          rows: [
            ['3 years', '₹42,253', '₹15.21 L', '₹2.21 L'],
            ['4 years', '₹33,284', '₹15.98 L', '₹2.98 L'],
            ['5 years', '₹27,942', '₹16.77 L', '₹3.77 L'],
            ['6 years', '₹24,413', '₹17.58 L', '₹4.58 L'],
            ['7 years', '₹21,919', '₹18.41 L', '₹5.41 L'],
          ],
        },
        after: [
          'Five years costs ₹6,023 more a month than seven, but saves ₹1,64,661 in interest and finishes 2 years earlier. If ₹28,000 a month is comfortable, 5 years is the shortest tenure that fits — and the one the calculator recommends.',
          'Choose the longer tenure only if the monthly budget really needs the room. Even then, part prepayments can shorten it later.',
        ],
      },
      {
        heading: 'Top-up or a new personal loan?',
        paragraphs: [
          'A top-up on a home loan is usually cheaper than a personal loan: it is secured on the same property, so the rate is often several points lower, and the paperwork is lighter. A personal loan, on the other hand, does not touch your existing loan — it runs for its own, usually shorter, tenure.',
          'Compare the two on the additional interest, not the rate alone. A top-up at a low rate can still cost more if it stretches your whole outstanding balance over many more years; a personal loan at a higher rate over three years may cost less in total. Use this calculator for the top-up and the personal loan EMI calculator for the alternative, and compare the interest each adds.',
        ],
      },
      {
        heading: 'Does a lower interest rate always mean a better deal?',
        paragraphs: [
          'No. In the example the new rate, 10.50%, is lower than the existing 11.25% — yet the top-up still adds ₹2,47,362 of interest, because the balance is repaid over 7 years instead of 4 years 8 months. Rate, tenure and amount work together: a lower rate helps only if the tenure is not stretched so far that the extra months cost more than the rate saves.',
          'Charges matter too. A processing fee, GST on it, insurance bundled with the loan and other deductions all reduce the cash you receive, which raises the true cost of every rupee you actually get.',
        ],
      },
      {
        heading: 'How much top-up should you take?',
        paragraphs: [
          'Borrow what you need, not what you are offered. In the example, taking ₹5 lakh instead of ₹3 lakh over 7 years adds ₹3,372 to every EMI and ₹83,259 of interest — about ₹41,630 for every extra lakh. The calculator compares four amounts side by side — minimum, your need, higher and maximum — and warns when the loan is larger than the requirement.',
        ],
      },
      {
        heading: 'How part prepayment cuts the cost',
        paragraphs: [
          'Every rupee prepaid goes straight to principal, so it stops costing interest for the rest of the loan. In the example, a ₹50,000 part payment with the 6th EMI, ₹3,000 extra every month and ₹50,000 every year would close the 7-year top-up in 4 yrs 8 mo and save ₹1,98,948 of interest.',
          'Floating-rate loans to individuals usually carry no prepayment charge; fixed-rate and some business loans may. Many lenders ask for a minimum amount or a lock-in before the first part payment.',
        ],
      },
    ],
    guides: ['how-emi-is-calculated', 'reduce-tenure-or-emi', 'loan-processing-fees-and-apr', 'prepay-loan-or-invest'],
    formula: `EMIs left (A)          = Original tenure × 12 − EMIs paid   (or as entered)
Remaining payments (A) = Current EMI × EMIs left
Future interest (A)    = Remaining payments − Outstanding principal

New loan (B)           = Outstanding principal + Top-up   (or as sanctioned)
New EMI                = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)
                         r = rate ÷ 12 ÷ 100    n = tenure in years × 12
Future payments (B)    = New EMI × New tenure in months
Future interest (B)    = Future payments − New loan

Net cash received      = Top-up − Processing fee − 18% GST on fee
                         − Other charges − Insurance / deductions

Additional payments    = Future payments (B) − Remaining payments (A)
Additional interest    = Future interest (B) − Future interest (A)
Interest per ₹1        = Additional interest ÷ Net cash received`,
    example: [
      '₹10,00,000 outstanding at ₹23,104 a month for 56 more EMIs: ₹12,93,824 to pay, ₹2,93,824 of it interest.',
      'Top-up of ₹3,00,000 at 10.50% for 7 years: ₹13,00,000 at ₹21,919 a month — ₹18,41,186 to pay, ₹5,41,186 of it interest.',
      'Additional interest ₹2,47,362. Over 5 years the EMI would be ₹27,942 and the interest ₹3,76,524 — ₹1,64,661 less.',
    ],
    assumptions: [
      'Interest is charged monthly on the reducing balance, and the first new EMI falls a month from today.',
      'Today’s EMI continues unchanged for the EMIs left. If your rate is floating and changes, both options change with it.',
      'Interest already paid is estimated from the original loan, rate and tenure; your statement has the exact figure. It does not affect the comparison.',
      'GST is charged at 18% on the processing fee. Charges are deducted from the payout rather than paid separately.',
      'The decision thresholds — a long tenure from 7 years, extra interest above ₹0.50 for every ₹1 received, charges above 3% — are rules of thumb, not lending rules.',
    ],
    notes: [
      'This calculator provides estimates for comparison and educational purposes. It is not personal financial advice — verify the final figures with your lender before you decide.',
      'Save an option before you change the inputs, and your earlier results stay on the page for comparison. Inputs are kept in this browser, so the comparison is still here when you come back.',
    ],
    faqs: [
      {
        q: 'How is the top-up EMI calculated?',
        a: 'On the combined loan — your outstanding principal plus the top-up — at the new rate over the new tenure, with the standard reducing-balance formula. ₹13,00,000 at 10.50% over 7 years is ₹21,919 a month.',
      },
      {
        q: 'Why is the additional payment larger than the additional interest?',
        a: 'Because it includes repaying the money you borrow. In the example you commit to ₹5,47,362 more in payments, but ₹3,00,000 of that is the top-up itself; the extra interest is ₹2,47,362. The interest is the cost of the decision.',
      },
      {
        q: 'What is sunk interest, and why is it ignored?',
        a: 'It is the interest already paid in your past EMIs — about ₹1,67,576 in the example. It cannot be recovered whether you take the top-up or not, so it does not belong in the comparison. Only payments from today onward are compared.',
      },
      {
        q: 'Is extending the tenure worth it for a lower EMI?',
        a: 'Only if the monthly budget really needs it. A longer tenure lowers the EMI but keeps interest running for longer: 7 years costs ₹1,64,661 more than 5 years in the example. If you do take the longer tenure, prepay whenever you can.',
      },
      {
        q: 'Should I borrow the full amount the bank offers?',
        a: 'Borrow what you need. Every extra rupee adds to the EMI and to the interest for the whole tenure — ₹2 lakh more in the example adds ₹83,259 of interest.',
      },
      {
        q: 'Why does the calculator say my values differ?',
        a: 'Because the remaining tenure you entered is not the original tenure minus the EMIs paid, or your EMI does not match the outstanding balance and rate. Rate changes, prepayments and restructuring cause this. Your figures are always used; check them against your loan statement.',
      },
    ],
  },
};

export default topUp;
