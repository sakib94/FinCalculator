import type { Guide } from './types';

export const LOANS_GUIDES: Guide[] = [
  {
    slug: 'how-emi-is-calculated',
    title: 'How is EMI calculated? The formula, explained with examples',
    seoTitle: 'How Is EMI Calculated? EMI Formula With Examples',
    description:
      'How banks calculate your loan EMI, why early EMIs are mostly interest, and how to read an amortisation schedule — with a step-by-step ₹10 lakh example.',
    topic: 'Loans',
    updated: '2026-09-26',
    calculators: ['personal-loan-emi', 'home-loan-emi', 'car-loan-emi', 'loan-prepayment'],
    keyPoints: [
      'An EMI is a fixed monthly payment that covers the month’s interest plus part of the principal.',
      'Interest is charged only on the balance you still owe, so the interest part shrinks every month.',
      'On a ₹10 lakh loan at 9% for 10 years, the EMI is ₹12,668 and total interest is about ₹5.2 lakh.',
      'Rate, tenure and amount are the only three inputs — a longer tenure lowers the EMI but raises total interest.',
    ],
    sections: [
      {
        heading: 'What an EMI is',
        paragraphs: [
          'EMI stands for equated monthly instalment: the same amount paid every month until a loan is repaid. Almost every retail loan in India — home, car, bike, personal and education loans — is repaid this way.',
          'Although the EMI stays the same, what it pays for changes every month. Part of each EMI pays the interest due for that month; the rest reduces the principal. Because the principal keeps falling, next month’s interest is a little lower, so a little more of the same EMI goes to principal. This is called a reducing-balance (or diminishing-balance) loan.',
        ],
      },
      {
        heading: 'The EMI formula',
        paragraphs: [
          'Banks use one formula for every reducing-balance loan: EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1).',
        ],
        bullets: [
          'P is the principal — the amount you borrow.',
          'r is the monthly interest rate: the annual rate divided by 12 and by 100. At 9% a year, r = 9 ÷ 12 ÷ 100 = 0.0075.',
          'n is the number of monthly instalments: 10 years is 120 months.',
        ],
        after: [
          'The formula finds the single monthly payment that, after interest is charged on the falling balance each month, brings the balance to exactly zero after n payments.',
        ],
      },
      {
        heading: 'Worked example: ₹10 lakh at 9% for 10 years',
        paragraphs: [
          'With P = 10,00,000, r = 0.0075 and n = 120, (1 + r)ⁿ = 1.0075¹²⁰ ≈ 2.4514. The EMI is 10,00,000 × 0.0075 × 2.4514 ÷ 1.4514 ≈ ₹12,668. Over 120 months you repay ₹15.2 lakh — ₹5.2 lakh of it interest.',
          'Here is how the first few EMIs split between interest and principal:',
        ],
        table: {
          columns: ['Month', 'Interest', 'Principal', 'Balance after EMI'],
          rows: [
            ['1', '₹7,500', '₹5,168', '₹9,94,832'],
            ['2', '₹7,461', '₹5,206', '₹9,89,626'],
            ['3', '₹7,422', '₹5,245', '₹9,84,381'],
            ['60', '₹4,637', '₹8,031', '₹6,10,240'],
            ['120', '₹94', '₹12,573', '₹0'],
          ],
        },
        after: [
          'Month one’s interest is simply the full ₹10 lakh × 0.0075 = ₹7,500. The rest of the ₹12,668 EMI, ₹5,168, reduces the loan. By month 60 — halfway through the tenure — you still owe ₹6.1 lakh, because the early EMIs were mostly interest. The final EMI is almost entirely principal.',
        ],
      },
      {
        heading: 'Reading an amortisation schedule',
        paragraphs: [
          'An amortisation schedule lists every EMI with its interest part, principal part and the balance left afterwards. Summarised by year, the same loan looks like this:',
        ],
        table: {
          caption: '₹10 lakh at 9% for 10 years',
          columns: ['Year', 'Interest paid', 'Principal repaid', 'Balance at year end'],
          rows: [
            ['1', '₹87,377', '₹64,634', '₹9,35,366'],
            ['5', '₹59,494', '₹92,517', '₹6,10,240'],
            ['10', '₹7,158', '₹1,44,853', '₹0'],
          ],
        },
        after: [
          'Two practical lessons follow. First, a prepayment early in the loan saves far more interest than the same prepayment late in the loan, because it removes principal that would otherwise attract interest for many years. Second, the principal you repay rises each year — useful to know for home loans, where principal counts towards Section 80C and interest towards Section 24(b).',
        ],
      },
      {
        heading: 'What changes your EMI',
        bullets: [
          'Loan amount: the EMI rises in direct proportion. Borrowing 10% more means an EMI 10% higher.',
          'Interest rate: a higher rate raises the EMI, and the effect is larger on long loans. On a 20-year home loan, each 0.5% adds roughly 3%–4% to the EMI.',
          'Tenure: a longer tenure lowers the EMI but increases total interest, often steeply. Doubling a 10-year loan to 20 years does not halve the EMI — at 9% it falls by less than a third, while total interest more than doubles.',
        ],
      },
      {
        heading: 'Why your bank’s figure may differ by a few rupees',
        paragraphs: [
          'Lenders round EMIs differently, count interest from the actual disbursement date, and may charge “broken-period” or pre-EMI interest for the days between disbursement and the first EMI cycle. The difference is usually small and appears in the first instalment. A home loan disbursed in stages for an under-construction flat charges pre-EMI interest on the amount released until full EMIs begin.',
        ],
      },
      {
        heading: 'Flat-rate loans are different',
        paragraphs: [
          'Some dealer-arranged car, bike and consumer loans charge a “flat” rate: interest on the original amount for the whole tenure, ignoring repayments. The EMI formula above does not apply, and the real cost is far higher than the quoted number suggests. See our guide to flat and reducing interest rates.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I calculate EMI in Excel?',
        a: 'Yes. Use =PMT(rate/12, months, -loan). For ₹10 lakh at 9% for 10 years: =PMT(9%/12, 120, -1000000) returns ₹12,668.',
      },
      {
        q: 'Why is most of my early EMI going to interest?',
        a: 'Interest is charged on the balance you owe, which is highest at the start. As the balance falls, the interest part shrinks and the principal part grows, even though the EMI stays the same.',
      },
      {
        q: 'Does paying the EMI early in the month reduce interest?',
        a: 'Not usually. Most lenders charge interest monthly on the balance after each scheduled EMI, so paying a few days early does not change the interest. A prepayment — paying more than the EMI — does.',
      },
    ],
  },
  {
    slug: 'home-loan-tax-benefits',
    title: 'Home loan tax benefits: Section 24(b), 80C and the new regime',
    seoTitle: 'Home Loan Tax Benefits – Section 24(b), 80C & New Regime',
    description:
      'How much tax a home loan saves: the ₹2 lakh interest deduction, the ₹1.5 lakh principal deduction, joint loans, let-out property and what the new regime allows.',
    topic: 'Loans',
    updated: '2026-09-26',
    calculators: ['home-loan-emi', 'income-tax', 'hra-exemption'],
    keyPoints: [
      'Interest on a home loan for a self-occupied house is deductible up to ₹2 lakh a year under Section 24(b).',
      'Principal repayment counts towards the ₹1.5 lakh Section 80C limit, shared with EPF, PPF and others.',
      'Both deductions are available only in the old tax regime for a self-occupied home.',
      'Co-owners who are also co-borrowers can each claim the full limits.',
    ],
    sections: [
      {
        heading: 'The two main deductions',
        paragraphs: [
          'A home loan EMI has two parts, and each earns a different deduction under the old tax regime.',
        ],
        table: {
          columns: ['What you pay', 'Section', 'Limit per year', 'Notes'],
          rows: [
            ['Interest', '24(b)', '₹2,00,000 (self-occupied)', 'No limit for a let-out house, but the loss set off against other income is capped at ₹2 lakh'],
            ['Principal', '80C', '₹1,50,000', 'Shared with EPF, PPF, ELSS, life insurance, tuition fees and more'],
            ['Stamp duty & registration', '80C', 'Within the same ₹1,50,000', 'Only in the year you pay them'],
          ],
        },
      },
      {
        heading: 'How much tax does it actually save?',
        paragraphs: [
          'Take a ₹50 lakh loan at 8.5% for 20 years. In the first year you pay about ₹4.21 lakh of interest and ₹99,500 of principal. The interest deduction is capped at ₹2 lakh; the principal counts in full towards 80C (if the 80C limit is not already used up by other investments).',
          'At the 30% slab plus 4% cess, ₹2 lakh + ₹99,500 of deductions saves about ₹93,400 of tax in that year; at the 20% slab, about ₹62,300. The home loan EMI calculator shows this for your own loan and slab.',
        ],
      },
      {
        heading: 'Conditions to keep in mind',
        bullets: [
          'The house must be acquired or constructed within five years from the end of the financial year in which the loan was taken. If not, the Section 24(b) limit for a self-occupied home falls to ₹30,000.',
          'Interest paid before construction is completed is not lost: it is deductible in five equal instalments starting from the year you get possession, within the overall ₹2 lakh limit.',
          'The 80C principal deduction is reversed — added back to your income — if you sell the house within five years from the end of the year in which you took possession.',
          'The loan must be for buying or building the house (or, for a smaller ₹30,000 limit, for repairs). Interest on a loan taken for other purposes does not qualify.',
          'Keep the lender’s interest certificate each year; your employer and the tax return need it.',
        ],
      },
      {
        heading: 'Joint home loans',
        paragraphs: [
          'When a house is co-owned and the loan is taken jointly, each co-owner who contributes to the EMIs can claim their share of interest up to ₹2 lakh and principal up to ₹1.5 lakh. A couple repaying a large loan together can therefore claim up to ₹4 lakh of interest deduction a year between them. The deduction follows ownership and repayment — a co-borrower who is not a co-owner cannot claim it.',
        ],
      },
      {
        heading: 'Let-out and second homes',
        paragraphs: [
          'You can treat up to two homes as self-occupied; the ₹2 lakh interest limit applies to both together. For a let-out house, the full interest is deductible from the rent received (after a 30% standard deduction on the rent), with no cap. If this produces a loss, only ₹2 lakh of it can be set off against salary or other income in a year; the rest is carried forward for up to eight years against future house-property income.',
        ],
      },
      {
        heading: 'Old regime or new regime?',
        paragraphs: [
          'The new tax regime, which is the default, does not allow the Section 24(b) deduction for a self-occupied home or the Section 80C deduction. For a let-out property, interest can still be deducted from rental income under the new regime, but a loss cannot be set off against other income or carried forward.',
          'Whether the home loan makes the old regime worth choosing depends on your income and your other deductions. For many salaried people, the new regime’s lower slabs and higher rebate outweigh the home loan benefit; for those with large interest payments, HRA and full 80C use, the old regime can still win. Compare both with the income tax calculator.',
        ],
      },
      {
        heading: 'A note on section numbers',
        paragraphs: [
          'The Income-tax Act, 2025 replaced the Income-tax Act, 1961 from 1 April 2026 and renumbered many provisions. This guide uses the long-familiar section numbers — 24(b), 80C — that appear on lender certificates and that most people search for. Confirm the current provisions with your tax adviser or the Income Tax Department before filing.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I claim both HRA and home loan interest?',
        a: 'Yes, under the old regime, if you pay rent where you live and own a house elsewhere — for example, in another city, or a house that is under construction or let out. Claiming both for the same house you live in is not allowed.',
      },
      {
        q: 'Is the home loan processing fee deductible?',
        a: 'Processing fees and similar charges on a home loan are generally treated as interest for Section 24(b) purposes, within the same limit. Prepayment charges may also qualify. Keep the receipts.',
      },
      {
        q: 'Can I claim home loan benefits under the new regime?',
        a: 'Not for a self-occupied home. Only interest on a let-out property can be deducted from its rental income under the new regime.',
      },
    ],
  },
  {
    slug: 'prepay-loan-or-invest',
    title: 'Should you prepay your loan or invest the money?',
    seoTitle: 'Prepay Home Loan or Invest? How to Decide',
    description:
      'Prepaying a loan earns a guaranteed return equal to its interest rate. Here is how to compare that with investing, including tax, timing and liquidity.',
    topic: 'Loans',
    updated: '2026-09-26',
    calculators: ['loan-prepayment', 'home-loan-emi', 'mutual-fund'],
    keyPoints: [
      'Prepaying earns a risk-free, tax-free return equal to your loan’s interest rate.',
      'The earlier you prepay, the more interest you save: ₹2 lakh prepaid in year 1 of a 20-year home loan saves about ₹7.3 lakh.',
      'Clear expensive debt first — personal loans and credit cards before a home loan.',
      'Keep an emergency fund before prepaying; money paid into a loan is hard to get back.',
    ],
    sections: [
      {
        heading: 'Prepaying is an investment with a guaranteed return',
        paragraphs: [
          'Every rupee you prepay stops attracting interest for the rest of the loan. So prepaying a loan at 8.5% is equivalent to investing that money at 8.5% a year — with no risk and, for most people, no tax on the “return”. Few safe investments match that after tax: a fixed deposit at 7% earns only about 4.8% after tax at the 30% slab.',
        ],
      },
      {
        heading: 'Timing matters enormously',
        paragraphs: [
          'Because early EMIs are mostly interest, a prepayment early in the loan cuts out many years of interest. The same ₹2 lakh saves very different amounts depending on when it is paid:',
        ],
        table: {
          caption: '₹2 lakh prepaid on a ₹50 lakh, 8.5%, 20-year home loan, tenure reduced',
          columns: ['Prepaid after', 'Interest saved', 'Loan ends earlier by'],
          rows: [
            ['1 year', '₹7,29,425', '21 months'],
            ['5 years', '₹4,76,395', '15 months'],
            ['10 years', '₹2,51,172', '10 months'],
            ['15 years', '₹99,128', '6 months'],
          ],
        },
      },
      {
        heading: 'When investing may be better',
        bullets: [
          'Your loan rate is low and you have a long horizon: diversified equity funds have historically returned more than home loan rates over 10–15 years, though with volatility and no guarantee.',
          'You are in the old tax regime and your home loan interest is at or below the ₹2 lakh Section 24(b) limit — prepaying slightly reduces a deduction you are using.',
          'You do not yet have an emergency fund, adequate health insurance or term life cover. Money prepaid into a loan cannot easily be taken back out.',
          'Your employer matches retirement contributions, or you have not used tax-saving limits such as Section 80C that give an immediate return.',
        ],
      },
      {
        heading: 'When prepaying is clearly better',
        bullets: [
          'The loan is expensive: personal loans at 11%–24% and credit card debt at 36%+ should almost always be cleared first.',
          'You value certainty — being debt-free before retirement or before a child’s education.',
          'You are in the new tax regime, where a self-occupied home loan gives no tax benefit, so the full rate is your saving.',
          'The loan is floating-rate, so prepayment carries no penalty for individuals.',
        ],
      },
      {
        heading: 'A balanced approach',
        paragraphs: [
          'Many borrowers split their surplus: continue SIPs for long-term goals, and use bonuses or windfalls to prepay the loan in its early years. Another effective habit is to raise the EMI by 5%–10% whenever your salary increases — it shortens the loan dramatically without a large one-time payment. The loan prepayment calculator shows both the interest saved and the effective return on a prepayment.',
        ],
      },
      {
        heading: 'Prepaying without a lumpsum',
        paragraphs: [
          'You do not need a large windfall to cut years off a loan. Small, regular extra payments work almost as well, because each one removes principal early.',
        ],
        table: {
          caption: '₹50 lakh home loan at 8.5% for 20 years (EMI ₹43,391)',
          columns: ['Strategy', 'Loan closes in', 'Interest saved'],
          rows: [
            ['No prepayment', '20 years', '—'],
            ['One extra EMI every year', 'About 16 years 9 months', '₹10,29,139'],
            ['EMI raised 5% every year', 'About 12 years 3 months', '₹19,51,712'],
          ],
        },
        after: [
          'Raising the EMI by 5% a year — roughly in line with salary increments — closes the loan almost eight years early and saves nearly ₹19.5 lakh of interest. Ask your lender to increase the EMI, or set up a standing instruction for a monthly part-payment.',
        ],
      },
      {
        heading: 'What about the tax benefit?',
        paragraphs: [
          'Under the old regime, a self-occupied home earns a deduction for interest of up to ₹2 lakh a year. In the early years of a large loan, the interest is usually well above that cap — about ₹4.2 lakh in the first year of a ₹50 lakh loan at 8.5%. Prepaying ₹2 lakh then reduces the interest by about ₹17,000 a year, but your deduction stays at the ₹2 lakh cap, so you lose no tax benefit at all.',
          'The tax argument against prepaying applies only once your yearly interest has fallen to around ₹2 lakh or less, or if the house is let out. Under the new regime there is no deduction for a self-occupied home, so prepaying is never penalised by tax.',
        ],
      },
      {
        heading: 'Questions to ask before you decide',
        bullets: [
          'Do I have six months of expenses in an emergency fund?',
          'Is all my other, costlier debt — credit cards, personal loans, car loans — already cleared?',
          'Am I adequately insured, with term life and health cover?',
          'Is the loan floating-rate, so prepayment is free?',
          'Would I actually invest the money consistently if I did not prepay?',
          'How much would I value being debt-free five or ten years sooner?',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is there a penalty for prepaying a home loan?',
        a: 'Not on a floating-rate loan taken by an individual for non-business purposes — RBI rules prohibit it. Fixed-rate loans and loans to businesses can carry prepayment charges; check your sanction letter.',
      },
      {
        q: 'Should I reduce the EMI or the tenure after a prepayment?',
        a: 'Reducing the tenure saves far more interest. Reduce the EMI only if you need to lower your monthly outgo. See our guide on reducing tenure or EMI.',
      },
      {
        q: 'Is it better to prepay in one lumpsum or increase the EMI?',
        a: 'For the same total amount, earlier is better, so a lumpsum today beats the same money spread over the year. In practice, a combination works best: raise the EMI with every increment and add lumpsums from bonuses.',
      },
      {
        q: 'Does prepaying or closing a loan affect my credit score?',
        a: 'Prepaying does not hurt your score, and closing a loan early is recorded as closed, not as a default. Your score may move slightly because you have one less active account, but a clean repayment history is what counts.',
      },
      {
        q: 'How do I prepay my home loan?',
        a: 'Most banks accept part-payments through net banking or at the branch. Ask for a revised repayment schedule afterwards and confirm whether the tenure or the EMI has been reduced.',
      },
    ],
  },
  {
    slug: 'reduce-tenure-or-emi',
    title: 'After a prepayment: reduce the tenure or the EMI?',
    seoTitle: 'Loan Prepayment: Reduce Tenure or EMI? Which Saves More',
    description:
      'Reducing the tenure after a loan prepayment saves far more interest than reducing the EMI. See the numbers on a ₹50 lakh home loan and when each makes sense.',
    topic: 'Loans',
    updated: '2026-09-26',
    calculators: ['loan-prepayment', 'home-loan-emi'],
    keyPoints: [
      'Keeping the EMI and shortening the tenure saves the most interest.',
      'On a ₹50 lakh loan, ₹5 lakh prepaid after 5 years saves about ₹10.7 lakh by reducing tenure — but only ₹3.9 lakh by reducing EMI.',
      'Reducing the EMI makes sense if you need cash-flow relief or expect your income to fall.',
    ],
    sections: [
      {
        heading: 'The two options',
        paragraphs: [
          'When you prepay part of a loan, the lender recalculates it. Either it keeps your EMI the same, so the loan finishes earlier (reduce tenure), or it keeps the end date the same and lowers the EMI (reduce EMI). Many banks default to reducing the tenure; you can usually ask for either.',
        ],
      },
      {
        heading: 'The numbers',
        paragraphs: [
          'Take a ₹50 lakh home loan at 8.5% for 20 years, with an EMI of ₹43,391. After 5 years, about ₹44.06 lakh is outstanding, and you prepay ₹5 lakh.',
        ],
        table: {
          columns: ['Option', 'EMI afterwards', 'Loan ends', 'Interest saved'],
          rows: [
            ['No prepayment', '₹43,391', 'After 20 years', '—'],
            ['Reduce tenure', '₹43,391', '3 years earlier', '₹10,69,153'],
            ['Reduce EMI', '₹38,467', 'After 20 years', '₹3,86,266'],
          ],
        },
        after: [
          'Reducing the tenure saves nearly three times as much. The reason: with the same EMI, the lower balance means more of every future EMI goes to principal, so the balance falls faster and faster. Reducing the EMI simply repays the smaller balance at the same slow pace.',
        ],
      },
      {
        heading: 'When to reduce the EMI instead',
        bullets: [
          'Your monthly budget is tight, or you want room for another goal such as a child’s school fees.',
          'You expect your income to fall — a career break, or approaching retirement.',
          'You plan to invest the difference in EMI every month; this can work if you actually do it, but most people do not.',
        ],
      },
      {
        heading: 'Watch the tenure when rates rise',
        paragraphs: [
          'On floating-rate loans, banks respond to rate increases by extending the tenure while keeping the EMI unchanged. A few rate rises can quietly add years to a loan. Check your remaining tenure every year; if it has grown, a prepayment or a voluntary EMI increase brings it back.',
        ],
      },
      {
        heading: 'Why reducing the tenure saves so much more',
        paragraphs: [
          'Every EMI first pays that month’s interest; only the rest reduces principal. After a prepayment, the balance — and therefore the monthly interest — is lower. If the EMI stays the same, the extra that is no longer needed for interest goes straight to principal, which lowers next month’s interest further. The effect snowballs, which is why keeping the EMI unchanged ends the loan years early.',
          'If the EMI is reduced instead, that saving is handed back to you every month, and the loan continues at the same pace as before, just on a smaller balance.',
        ],
      },
      {
        heading: 'How to ask your lender',
        bullets: [
          'State your choice in writing when you make the part-payment; if you do not, most banks reduce the tenure by default.',
          'Ask for the revised amortisation schedule and check the new end date or EMI.',
          'On floating-rate loans, recheck the tenure after every interest-rate change — rate rises are usually absorbed by extending the tenure.',
          'Some lenders allow reducing the EMI only on the next reset date or charge a small fee for a schedule change; confirm before you pay.',
        ],
      },
      {
        heading: 'A middle path',
        paragraphs: [
          'If you need some cash-flow relief but still want to save interest, reduce the EMI now and increase it again when your income rises, or reduce the EMI after one prepayment and the tenure after the next. The loan prepayment calculator shows both outcomes for any amount, so you can see the cost of the choice before you make it.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Which option does the bank choose by default?',
        a: 'Most Indian banks reduce the tenure and keep the EMI unchanged unless you ask otherwise. Always confirm in writing.',
      },
      {
        q: 'Does reducing the EMI help my loan eligibility?',
        a: 'Yes. A lower EMI reduces your fixed obligations, which can help if you plan to apply for another loan soon. That can be a good reason to choose it.',
      },
      {
        q: 'Can I switch from reduced EMI back to the original EMI?',
        a: 'Usually yes — lenders allow you to increase the EMI voluntarily. Doing so has the same effect as reducing the tenure from that point on.',
      },
    ],
  },
  {
    slug: 'flat-vs-reducing-interest-rate',
    title: 'Flat vs reducing interest rate: why a “7% flat” loan really costs about 12.5%',
    seoTitle: 'Flat vs Reducing Interest Rate – Real Cost Explained',
    description:
      'A flat interest rate charges interest on the original loan for the whole tenure. See how to convert a flat rate to its real reducing-balance equivalent, with examples.',
    topic: 'Loans',
    updated: '2026-09-26',
    calculators: ['flat-vs-reducing', 'car-loan-emi', 'bike-loan-emi', 'personal-loan-emi'],
    keyPoints: [
      'A flat rate charges interest on the full original loan every year, even as you repay it.',
      'A flat rate is roughly equal to 1.7–1.9 times the same number as a reducing-balance rate.',
      'A 10% flat rate on a 5-year loan is equivalent to about 17.3% reducing.',
      'Compare loans using the APR in the Key Fact Statement, never the flat rate.',
    ],
    sections: [
      {
        heading: 'Two ways to charge interest',
        paragraphs: [
          'On a reducing-balance loan — the standard for bank home, car and personal loans — interest each month is charged only on what you still owe. As you repay, the interest falls.',
          'On a flat-rate loan, interest is worked out once on the original amount for the whole tenure: interest = loan × flat rate × years. That total is added to the loan and divided by the number of months to get the EMI. You pay interest on money you have already repaid.',
        ],
      },
      {
        heading: 'Example: ₹5 lakh for 5 years',
        table: {
          columns: ['', '10% flat', '10% reducing'],
          rows: [
            ['Monthly EMI', '₹12,500', '₹10,624'],
            ['Total interest', '₹2,50,000', '₹1,37,411'],
            ['Equivalent reducing rate', '≈ 17.3%', '10%'],
          ],
        },
        after: [
          'The flat-rate loan costs over ₹1.1 lakh more in interest. Its real cost — the reducing-balance rate that produces the same EMI — is about 17.3% a year.',
        ],
      },
      {
        heading: 'Flat rate to reducing rate: quick reference',
        table: {
          caption: 'Equivalent reducing-balance rate',
          columns: ['Flat rate', '3-year loan', '5-year loan'],
          rows: [
            ['6% flat', '≈ 11.1%', '≈ 10.9%'],
            ['8% flat', '≈ 14.5%', '≈ 14.1%'],
            ['10% flat', '≈ 17.9%', '≈ 17.3%'],
            ['12% flat', '≈ 21.2%', '≈ 20.3%'],
          ],
        },
        after: [
          'A rough rule: multiply a flat rate by about 1.8 to estimate the true rate. The flat vs reducing rate calculator gives the exact figure for any rate and tenure.',
        ],
      },
      {
        heading: 'Where flat rates still appear',
        bullets: [
          'Two-wheeler and used-car finance arranged at dealerships.',
          'Consumer-durable loans for phones, appliances and electronics.',
          'Some personal loans from smaller lenders and microfinance loans.',
          'Gold loans and “low interest” offers in advertisements.',
        ],
        after: [
          'Since October 2024, RBI rules require lenders to give every retail borrower a Key Fact Statement showing the annual percentage rate (APR), which is calculated on a reducing-balance basis and includes fees. Ask for it, and compare that number.',
        ],
      },
      {
        heading: 'Converting a flat rate yourself',
        paragraphs: [
          'You can work out a flat-rate loan’s true cost in three steps:',
        ],
        bullets: [
          'Total interest = loan × flat rate × years. For ₹5 lakh at 10% flat for 5 years: ₹2,50,000.',
          'EMI = (loan + total interest) ÷ months = ₹7,50,000 ÷ 60 = ₹12,500.',
          'Find the reducing-balance rate that gives the same EMI on ₹5 lakh over 60 months — about 17.3%. In a spreadsheet: =RATE(60, -12500, 500000) × 12.',
        ],
        after: [
          'The flat vs reducing rate calculator does the conversion instantly and shows the year-by-year split of each EMI.',
        ],
      },
      {
        heading: 'Reading loan advertisements',
        bullets: [
          '“Interest from 0.8% per month” is usually a flat monthly rate — close to 17%–18% a year on a reducing basis.',
          '“Zero-interest EMI” schemes usually recover the cost through a processing fee, a higher product price or a lost cash discount.',
          '“Low EMI” offers often stretch the tenure or add a balloon payment at the end.',
          'If the advertisement or dealer cannot tell you the APR, ask for the Key Fact Statement before you sign anything.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is a flat rate ever cheaper?',
        a: 'Not when compared at the same headline number. A flat rate always costs more than the same number as a reducing rate, because interest is charged on money already repaid. A flat rate is only cheaper if its number is low enough — roughly under 55% of the reducing rate you are comparing it with.',
      },
      {
        q: 'Do prepayments help on a flat-rate loan?',
        a: 'Often less than you expect. Some flat-rate lenders calculate foreclosure using the “rule of 78” or charge the remaining flat interest, so check how a prepayment would be treated before you sign.',
      },
      {
        q: 'Do banks use flat rates for home loans?',
        a: 'No. Home loans from banks and housing finance companies are always on a reducing-balance basis. Flat rates appear mainly in dealer and consumer finance.',
      },
    ],
  },
  {
    slug: 'loan-processing-fees-and-apr',
    title: 'Processing fees, APR and the Key Fact Statement: the real cost of a loan',
    seoTitle: 'Loan Processing Fee & APR – What a Loan Really Costs',
    description:
      'Why a processing fee raises your loan’s true interest rate, how APR is calculated, what the RBI Key Fact Statement must show, and how to compare loan offers.',
    topic: 'Loans',
    updated: '2026-09-26',
    calculators: ['personal-loan-emi', 'car-loan-emi', 'bike-loan-emi', 'home-loan-emi'],
    keyPoints: [
      'The processing fee and 18% GST are usually deducted from the loan, but you repay EMIs on the full amount.',
      'A 2% fee turns an 11.5% three-year personal loan into an effective 13.2%.',
      'Fees hurt most on short loans: the same 2% fee costs over 4.5% a year on a one-year loan.',
      'Every retail loan must come with a Key Fact Statement showing the APR — use it to compare offers.',
    ],
    sections: [
      {
        heading: 'What a processing fee really does',
        paragraphs: [
          'Lenders charge a processing fee to cover credit checks and paperwork — commonly 0.25%–1% on home loans and up to 2%–3% on personal loans — plus 18% GST. It is usually deducted from the loan before the money reaches you. On a ₹5 lakh personal loan with a 2% fee, ₹11,800 is deducted and you receive ₹4,88,200, but your EMIs repay the full ₹5 lakh with interest.',
          'That means the true interest rate on the money you actually receive is higher than the quoted rate.',
        ],
      },
      {
        heading: 'APR: the rate that includes the fee',
        paragraphs: [
          'The annual percentage rate (APR) is the interest rate at which your EMIs exactly repay the amount you actually received. It folds every upfront charge into a single comparable rate.',
        ],
        table: {
          caption: '₹5 lakh at 11.5% for 3 years',
          columns: ['Processing fee (+ GST)', 'You receive', 'APR'],
          rows: [
            ['None', '₹5,00,000', '11.50%'],
            ['1%', '₹4,94,100', '12.33%'],
            ['2%', '₹4,88,200', '13.16%'],
            ['3%', '₹4,82,300', '14.02%'],
          ],
        },
      },
      {
        heading: 'Short loans feel fees the most',
        paragraphs: [
          'A fee is paid once, but its cost is spread over the loan’s life. The shorter the loan, the more it adds to the yearly rate. With a 2% fee on an 11.5% loan, the APR is about 16.1% over one year, 13.2% over three years and 12.6% over five years.',
        ],
      },
      {
        heading: 'The Key Fact Statement',
        paragraphs: [
          'Since 1 October 2024, RBI requires banks and NBFCs to give borrowers a Key Fact Statement (KFS) for all retail and MSME term loans before the loan agreement is signed. It is a standard summary in simple language and must include:',
        ],
        bullets: [
          'The loan amount, tenure, interest rate and type (fixed or floating).',
          'All fees and charges, including processing fees, insurance and third-party charges.',
          'The annual percentage rate (APR), covering interest and all charges.',
          'The repayment schedule, and the cooling-off period during which you can exit the loan.',
        ],
        after: [
          'Lenders cannot charge any fee that is not mentioned in the KFS without your explicit consent. Always compare offers on their APRs.',
        ],
      },
      {
        heading: 'Other charges to check',
        bullets: [
          'Prepayment or foreclosure charges — common on fixed-rate personal, car and bike loans.',
          'Late payment penalties and bounce charges.',
          'Bundled insurance premiums added to the loan amount.',
          'Documentation, stamp duty and legal/technical valuation fees on home loans.',
        ],
      },
      {
        heading: 'Comparing two real-looking offers',
        paragraphs: ['Two lenders offer ₹5 lakh for 3 years:'],
        table: {
          columns: ['', 'Offer A', 'Offer B'],
          rows: [
            ['Interest rate', '11%', '12%'],
            ['Processing fee (+ GST)', '3% (₹17,700)', '0.5% (₹2,950)'],
            ['EMI', '₹16,369', '₹16,607'],
            ['Total paid including fee', '₹6,06,997', '₹6,00,808'],
            ['APR', '≈ 13.5%', '≈ 12.4%'],
          ],
        },
        after: [
          'Offer A looks cheaper on the rate and on the EMI, yet it costs about ₹6,200 more and has the higher APR. The personal loan EMI calculator shows the APR for any fee, so you can compare offers the way lenders are required to present them.',
        ],
      },
      {
        heading: 'Negotiating the fee',
        bullets: [
          'Processing fees are often negotiable, especially for home loans and for borrowers with strong credit scores.',
          'Banks frequently waive or cap fees during festive offers — ask about current promotions.',
          'Pre-approved offers from your salary bank often carry lower fees.',
          'Fees are usually non-refundable once the loan is sanctioned, even if you do not draw it; ask before you pay anything.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is the processing fee refundable if my loan is rejected?',
        a: 'Policies vary. Many lenders deduct the fee only from the disbursed loan; others collect a login fee upfront that may not be refunded. Check the terms before paying anything in advance, and be wary of anyone who asks for a fee before sanctioning a loan.',
      },
      {
        q: 'Is GST charged on the processing fee?',
        a: 'Yes. Processing and documentation fees are services and attract 18% GST, which is added to the fee.',
      },
      {
        q: 'What is a good APR for a personal loan?',
        a: 'That depends on your profile and market rates, but the gap between the APR and the headline rate is the part you can control. On a three-year loan, a gap of more than about one percentage point usually means the fees are high.',
      },
    ],
  },
  {
    slug: 'how-much-home-loan-can-i-get',
    title: 'How much home loan can I get on my salary?',
    seoTitle: 'How Much Home Loan Can I Get on My Salary? FOIR & LTV',
    description:
      'Lenders size a home loan by your income (FOIR), the property value (LTV) and your credit score. Worked examples for ₹60,000 and ₹1 lakh salaries.',
    topic: 'Loans',
    updated: '2026-09-26',
    calculators: ['loan-eligibility', 'home-loan-emi'],
    keyPoints: [
      'Banks cap all your EMIs at roughly 40%–60% of net monthly income — the FOIR.',
      'On ₹1 lakh take-home with a ₹10,000 existing EMI, a 50% FOIR allows about ₹46 lakh at 8.5% for 20 years.',
      'RBI caps the loan at 75%–90% of the property value, depending on the loan size.',
      'A co-applicant’s income, a longer tenure or clearing small loans raises eligibility.',
    ],
    sections: [
      {
        heading: 'The three limits',
        bullets: [
          'Income (FOIR): lenders keep your total EMIs — including the new loan — within a fixed share of your net monthly income, typically 40%–60% depending on income level and lender.',
          'Property value (LTV): RBI limits a home loan to 90% of the property value up to ₹30 lakh, 80% from ₹30 lakh to ₹75 lakh, and 75% above that.',
          'Age and tenure: the loan usually has to end by 60 for salaried borrowers or 65–70 for the self-employed.',
        ],
        after: ['You get the lowest of the amounts these limits allow.'],
      },
      {
        heading: 'Worked example',
        paragraphs: [
          'Take-home pay ₹1,00,000 a month; existing car loan EMI ₹10,000; FOIR 50%. The lender allows total EMIs of ₹50,000, leaving ₹40,000 for the home loan. At 8.5%, ₹40,000 a month supports:',
        ],
        table: {
          columns: ['Tenure', 'Eligible loan'],
          rows: [
            ['20 years', '≈ ₹46.1 lakh'],
            ['25 years', '≈ ₹49.7 lakh'],
            ['30 years', '≈ ₹52.0 lakh'],
          ],
        },
        after: [
          'On a take-home of ₹60,000 with no existing loans, the same 50% FOIR supports about ₹34.6 lakh over 20 years. Add a spouse earning ₹60,000 as co-applicant and the combined ₹1.6 lakh income (with the ₹10,000 EMI) supports around ₹80 lakh.',
        ],
      },
      {
        heading: 'How to improve your eligibility',
        bullets: [
          'Add an earning co-applicant — usually a spouse or parent who is also a co-owner.',
          'Close small loans and credit card EMIs before applying; each ₹5,000 of EMI cleared adds roughly ₹5.8 lakh of eligibility at 8.5% over 20 years.',
          'Choose a longer tenure, then prepay later.',
          'Keep your credit score above about 750 for better rates — a 1% lower rate raises eligibility by around 7%.',
          'Declare all regular income, including rental income and stable variable pay, with documents.',
        ],
      },
      {
        heading: 'What lenders check besides income',
        bullets: [
          'Credit score and history: most banks look for a CIBIL score of about 750 or more for their best rates; recent missed payments or many recent loan enquiries count against you.',
          'Job stability: salaried applicants usually need two to three years of total experience and some time with the current employer; the self-employed usually need two to three years of income tax returns.',
          'The property: legal title, approved building plans and the builder’s approvals are verified, and the bank values the property independently. The loan-to-value limit is applied to the bank’s valuation, not to the price you agreed.',
          'Age: the loan normally has to end by 60 for salaried borrowers (sometimes 65) and 65–70 for the self-employed, which can shorten the tenure — and the eligible amount — for older applicants.',
        ],
      },
      {
        heading: 'Documents you will typically need',
        bullets: [
          'Identity and address proof (PAN, Aadhaar, passport).',
          'Salary slips for 3–6 months, Form 16 and 6–12 months of bank statements (salaried).',
          'Income tax returns with computation for 2–3 years, business financials and bank statements (self-employed).',
          'Property documents: sale agreement, title deeds, approved plan, builder NOC and payment receipts.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is FOIR?',
        a: 'Fixed obligations to income ratio: the share of your net monthly income that goes to EMIs (including the new loan). Lenders usually cap it between 40% and 60%, allowing a higher share for higher incomes.',
      },
      {
        q: 'Does my spouse’s income count?',
        a: 'Yes, if your spouse joins as a co-applicant. Their income is added and their existing EMIs are counted, which usually raises the eligible amount. Making them a co-owner also lets both of you claim tax benefits.',
      },
      {
        q: 'Can I get a home loan for the full property price?',
        a: 'No. RBI limits home loans to 75%–90% of the property value, depending on the loan size, and stamp duty and registration are generally excluded for homes above ₹10 lakh. You need to fund the rest yourself.',
      },
    ],
  },
];
