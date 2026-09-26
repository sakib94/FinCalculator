import type { Guide } from './types';

export const TAX_GUIDES: Guide[] = [
  {
    slug: 'old-vs-new-tax-regime',
    title: 'Old vs new tax regime: which should you choose?',
    seoTitle: 'Old vs New Tax Regime – Which Is Better for You?',
    description:
      'Compare the old and new income tax regimes: slabs, the ₹12 lakh rebate, which deductions each allows, and how much you need in deductions for the old regime to win.',
    topic: 'Tax & Salary',
    updated: '2026-09-26',
    calculators: ['income-tax', 'hra-exemption', 'salary'],
    keyPoints: [
      'The new regime is the default, with lower slab rates and almost no deductions.',
      'Salaried people pay no tax in the new regime up to ₹12.75 lakh of salary, thanks to the ₹75,000 standard deduction and the rebate.',
      'The old regime wins only with large deductions — about ₹5.4 lakh at a ₹15 lakh salary and ₹7–8 lakh at ₹20 lakh and above.',
      'Salaried taxpayers can switch every year when filing; business owners have far less flexibility.',
    ],
    sections: [
      {
        heading: 'The slabs side by side',
        paragraphs: ['For individuals below 60, for FY 2025-26 and FY 2026-27:'],
        table: {
          columns: ['Taxable income', 'New regime', 'Old regime'],
          rows: [
            ['Up to ₹2.5 lakh', 'Nil', 'Nil'],
            ['₹2.5 lakh – ₹4 lakh', 'Nil', '5%'],
            ['₹4 lakh – ₹5 lakh', '5%', '5%'],
            ['₹5 lakh – ₹8 lakh', '5%', '20%'],
            ['₹8 lakh – ₹10 lakh', '10%', '20%'],
            ['₹10 lakh – ₹12 lakh', '10%', '30%'],
            ['₹12 lakh – ₹16 lakh', '15%', '30%'],
            ['₹16 lakh – ₹20 lakh', '20%', '30%'],
            ['₹20 lakh – ₹24 lakh', '25%', '30%'],
            ['Above ₹24 lakh', '30%', '30%'],
          ],
        },
        after: [
          'A 4% health and education cess applies to the tax in both regimes, plus a surcharge on incomes above ₹50 lakh (capped at 25% in the new regime).',
        ],
      },
      {
        heading: 'Rebate and standard deduction',
        bullets: [
          'New regime: a rebate under Section 87A makes tax nil if taxable income is up to ₹12 lakh. Salaried employees also get a ₹75,000 standard deduction, so salary up to ₹12.75 lakh is tax-free. Just above ₹12 lakh, marginal relief ensures the tax never exceeds the income above ₹12 lakh.',
          'Old regime: the rebate makes tax nil only up to ₹5 lakh of taxable income, and the standard deduction is ₹50,000.',
        ],
      },
      {
        heading: 'Which deductions each regime allows',
        table: {
          columns: ['Deduction or exemption', 'Old regime', 'New regime'],
          rows: [
            ['Standard deduction (salary)', '₹50,000', '₹75,000'],
            ['Section 80C (EPF, PPF, ELSS, insurance, principal on home loan…)', 'Up to ₹1.5 lakh', 'No'],
            ['Section 80D (health insurance)', 'Up to ₹25,000–₹1 lakh', 'No'],
            ['HRA and LTA exemptions', 'Yes', 'No'],
            ['Home loan interest, self-occupied (24b)', 'Up to ₹2 lakh', 'No'],
            ['NPS own contribution, 80CCD(1B)', 'Up to ₹50,000', 'No'],
            ['Employer NPS contribution, 80CCD(2)', 'Up to 10% of basic + DA', 'Up to 14% of basic + DA'],
            ['Education loan interest (80E)', 'Yes', 'No'],
          ],
        },
      },
      {
        heading: 'Tax at common salaries',
        paragraphs: [
          'Tax payable by a salaried individual below 60, including cess. The old-regime column assumes ₹1.5 lakh under 80C and ₹25,000 under 80D — a typical set of deductions without HRA or a home loan.',
        ],
        table: {
          columns: ['Gross salary', 'New regime', 'Old regime (₹1.75 lakh deductions)'],
          rows: [
            ['₹8 lakh', '₹0', '₹28,600'],
            ['₹12.75 lakh', '₹0', '₹1,32,600'],
            ['₹15 lakh', '₹97,500', '₹2,02,800'],
            ['₹20 lakh', '₹1,92,400', '₹3,58,800'],
            ['₹30 lakh', '₹4,75,800', '₹6,70,800'],
          ],
        },
      },
      {
        heading: 'The break-even: how much deduction makes the old regime worth it?',
        paragraphs: [
          'The old regime pays off only when your deductions and exemptions (beyond the standard deduction) exceed a break-even amount. Approximate figures:',
        ],
        table: {
          columns: ['Gross salary', 'Deductions needed for the old regime to win'],
          rows: [
            ['₹12.75 lakh', 'About ₹7.25 lakh'],
            ['₹15 lakh', 'About ₹5.4 lakh'],
            ['₹20 lakh', 'About ₹7.1 lakh'],
            ['₹25 lakh and above', 'About ₹8 lakh'],
          ],
        },
        after: [
          'Reaching ₹5–8 lakh usually needs a combination of a large HRA exemption, the full ₹2 lakh home loan interest, the full ₹1.5 lakh of 80C, 80D and NPS. Most salaried people fall short, which is why the new regime is now the better choice for the majority. Check your own numbers with the income tax calculator, which compares both regimes.',
        ],
      },
      {
        heading: 'Switching between regimes',
        paragraphs: [
          'If you have no business income, you can choose the regime every year when you file your return, regardless of what you told your employer for TDS. If you have business or professional income, you can switch from the new regime to the old only once in your lifetime (and back once), and must file the opt-out form before the return due date.',
          'The Income-tax Act, 2025 replaced the 1961 Act from 1 April 2026 and renumbered sections; the familiar numbers are used here. Always confirm the current rules before filing.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is income up to ₹12 lakh tax-free in the new regime?',
        a: 'Yes, when taxable income is up to ₹12 lakh, because of the Section 87A rebate. For salaried people, the ₹75,000 standard deduction takes this to ₹12.75 lakh of salary. Income taxed at special rates, such as capital gains, is treated separately.',
      },
      {
        q: 'Can I claim HRA in the new tax regime?',
        a: 'No. HRA exemption, LTA, Section 80C, 80D and home loan interest on a self-occupied house are all old-regime benefits.',
      },
      {
        q: 'Which regime is better for a ₹15 lakh salary?',
        a: 'With typical deductions of ₹1.5 lakh under 80C and ₹25,000 under 80D, the new regime costs ₹97,500 against ₹2,02,800 in the old. The old regime wins only if your deductions and exemptions exceed roughly ₹5.4 lakh.',
      },
      {
        q: 'Can senior citizens get a higher exemption in the new regime?',
        a: 'No. The new regime has the same slabs for everyone. The old regime has a higher basic exemption for senior citizens (₹3 lakh) and super senior citizens (₹5 lakh).',
      },
      {
        q: 'What if I told my employer the wrong regime?',
        a: 'If you have no business income, you can choose the other regime when filing your return. Any extra tax deducted will be refunded, or you pay the shortfall with interest if less was deducted.',
      },
    ],
  },
  {
    slug: 'ctc-vs-in-hand-salary',
    title: 'CTC vs in-hand salary: why your take-home is less than your package',
    seoTitle: 'CTC vs In-Hand Salary – Why Take-Home Pay Is Lower',
    description:
      'What goes into your cost to company, what is deducted before salary reaches your account, and a worked ₹12 lakh CTC example showing the monthly in-hand pay.',
    topic: 'Tax & Salary',
    updated: '2026-09-26',
    calculators: ['ctc-in-hand', 'salary', 'income-tax', 'gratuity'],
    keyPoints: [
      'CTC includes costs your employer pays on your behalf — employer PF, gratuity, insurance — that never reach your bank account monthly.',
      'In-hand salary = gross salary − employee PF − professional tax − income tax (TDS).',
      'A ₹12 lakh CTC with basic at 40% gives about ₹88,000 a month in hand under the new regime.',
      'A higher basic raises PF and gratuity (good for savings) but lowers take-home pay.',
    ],
    sections: [
      {
        heading: 'What CTC includes',
        table: {
          columns: ['Component', 'In CTC?', 'Paid to you monthly?'],
          rows: [
            ['Basic salary', 'Yes', 'Yes'],
            ['HRA and special/other allowances', 'Yes', 'Yes'],
            ['Employer PF contribution (12% of basic)', 'Yes', 'No — goes to your EPF account'],
            ['Gratuity (about 4.81% of basic)', 'Often', 'No — paid on leaving after 5 years'],
            ['Group health insurance premium', 'Sometimes', 'No'],
            ['Performance bonus / variable pay', 'Often', 'Only when paid, and may be less than 100%'],
          ],
        },
      },
      {
        heading: 'Worked example: ₹12 lakh CTC',
        paragraphs: [
          'Basic is 40% of CTC (₹4,80,000 a year). Employer PF is 12% of basic, ₹57,600, and gratuity is accrued at 4.81% of basic, ₹23,088. The gross salary paid to you is therefore ₹12,00,000 − ₹57,600 − ₹23,088 = ₹11,19,312.',
          'From that, the employee PF contribution (₹57,600) and professional tax (₹2,400 in most states that levy it) are deducted. Under the new regime, taxable income is ₹11,19,312 − ₹75,000 standard deduction = ₹10,44,312, which is below ₹12 lakh, so income tax is nil after the rebate.',
          'In-hand salary = ₹11,19,312 − ₹57,600 − ₹2,400 = ₹10,59,312 a year, or about ₹88,276 a month.',
        ],
      },
      {
        heading: 'Why a higher basic lowers take-home pay',
        paragraphs: [
          'PF and gratuity are percentages of basic pay. When basic rises within the same CTC, more goes to PF (both the employee and employer shares) and gratuity, and less is paid out monthly. It is not lost — it builds your retirement savings — but it reduces in-hand pay.',
          'The Labour Codes that came into force on 21 November 2025 define “wages” for PF and gratuity so that they must generally be at least half of total pay. Employers that kept basic low are restructuring salaries, which can reduce take-home pay while increasing retirement benefits.',
        ],
      },
      {
        heading: 'Ways to improve take-home pay',
        bullets: [
          'Compare the new and old regimes every year; choose the one with lower tax when filing.',
          'In the old regime, submit rent receipts for HRA and investment proofs on time so less TDS is deducted.',
          'Ask whether employer NPS contributions (deductible under 80CCD(2) in both regimes) can be part of your CTC.',
          'If your employer allows it, PF on the ₹15,000 wage ceiling rather than on full basic increases in-hand pay — at the cost of lower retirement savings.',
        ],
      },
      {
        heading: 'Reading your payslip',
        bullets: [
          'Earnings: basic, HRA, special allowance, other allowances — together your gross salary for the month.',
          'Deductions: employee PF (12% of basic, or of the ₹15,000 wage ceiling), professional tax where your state levies it, income tax (TDS), and any voluntary deductions such as VPF, meal cards or loan recoveries.',
          'Net pay: gross minus deductions — the amount credited to your bank.',
          'Employer contributions such as employer PF and gratuity usually do not appear as earnings, because they never pass through your hands; check your annual CTC letter for them.',
        ],
      },
      {
        heading: 'Variable pay and joining bonuses',
        paragraphs: [
          'Many offers include a performance bonus inside the CTC. It is paid only if targets are met, often once a year, and sometimes at less than 100%. When comparing offers, compare the fixed pay separately. Joining bonuses frequently carry a clawback if you leave within a year, and both bonuses are fully taxable in the month they are paid, which can push TDS up that month.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is gratuity part of in-hand salary?',
        a: 'No. Gratuity is paid as a lump sum when you leave after at least five years of continuous service (one year for fixed-term employees under the Labour Codes). It is included in some CTCs but never in monthly pay.',
      },
      {
        q: 'Why is my in-hand salary different every month?',
        a: 'TDS is recalculated as the year progresses and as investment proofs are submitted, arrears and bonuses are paid, and unpaid leave is deducted. The total over the year is what matters.',
      },
      {
        q: 'How do I calculate in-hand salary from CTC?',
        a: 'Subtract employer PF, gratuity and any other employer-only costs from CTC to get gross salary; then subtract employee PF, professional tax and income tax. The CTC to in-hand calculator does this for both tax regimes.',
      },
    ],
  },
  {
    slug: 'hra-exemption-explained',
    title: 'HRA exemption explained: how much of your rent allowance is tax-free',
    seoTitle: 'HRA Exemption Calculation – Rules, Formula & Examples',
    description:
      'How HRA exemption is calculated using the least of three limits, metro vs non-metro rules, rent receipts and landlord PAN, rent paid to parents, and Section 80GG.',
    topic: 'Tax & Salary',
    updated: '2026-09-26',
    calculators: ['hra-exemption', 'income-tax', 'salary'],
    keyPoints: [
      'Exempt HRA is the least of: HRA received, rent minus 10% of salary, and 50% (metro) or 40% of salary.',
      '“Salary” here means basic plus dearness allowance that counts for retirement benefits.',
      'HRA exemption is available only in the old tax regime.',
      'Without HRA in your salary, Section 80GG gives a smaller rent deduction.',
    ],
    sections: [
      {
        heading: 'The three limits',
        paragraphs: ['Under Section 10(13A), the exempt part of HRA is the lowest of:'],
        bullets: [
          'The HRA actually received from your employer.',
          'Rent actually paid minus 10% of salary.',
          '50% of salary if you live in Delhi, Mumbai, Kolkata or Chennai; 40% elsewhere.',
        ],
        after: [
          'The rest of your HRA is taxable. Salary means basic pay plus DA (where it counts for retirement benefits), for the months you lived in rented accommodation. Rules for which cities count as metros can change; check the current list when you file.',
        ],
      },
      {
        heading: 'Examples',
        table: {
          columns: ['', 'Example 1 (Mumbai)', 'Example 2 (Pune)'],
          rows: [
            ['Basic salary (yearly)', '₹6,00,000', '₹6,00,000'],
            ['HRA received', '₹2,40,000', '₹3,00,000'],
            ['Rent paid', '₹3,00,000', '₹2,40,000'],
            ['Limit 1: HRA received', '₹2,40,000', '₹3,00,000'],
            ['Limit 2: rent − 10% of basic', '₹2,40,000', '₹1,80,000'],
            ['Limit 3: 50% / 40% of basic', '₹3,00,000', '₹2,40,000'],
            ['Exempt HRA (least)', '₹2,40,000', '₹1,80,000'],
            ['Taxable HRA', '₹0', '₹1,20,000'],
          ],
        },
      },
      {
        heading: 'Documents and rules to follow',
        bullets: [
          'Keep rent receipts and a rental agreement. Your employer may ask for them before reducing TDS.',
          'If yearly rent exceeds ₹1 lakh, give your employer the landlord’s PAN.',
          'You can pay rent to your parents if they own the house and you genuinely pay them; they must show it as income. Rent paid to a spouse is generally not accepted.',
          'You cannot claim HRA for a house you own and live in. You can claim both HRA and home loan interest if you rent where you work and own a house elsewhere.',
        ],
      },
      {
        heading: 'No HRA in your salary? Section 80GG',
        paragraphs: [
          'Self-employed people and employees without HRA can deduct rent under Section 80GG (old regime only) — the least of ₹5,000 a month, 25% of total income, or rent minus 10% of total income. You, your spouse or minor child must not own a house in the city where you live, and you file Form 10BA.',
        ],
      },
      {
        heading: 'When your rent or salary changes mid-year',
        paragraphs: [
          'HRA exemption is worked out for each period separately. If you moved house, changed cities, received a raise or only started renting part-way through the year, calculate the three limits for each period with that period’s salary, HRA and rent, and add the exempt amounts together. Months when you did not pay rent earn no exemption.',
        ],
      },
      {
        heading: 'If your employer did not account for HRA',
        paragraphs: [
          'If you missed the deadline to submit rent receipts, your employer will have deducted more TDS. You can still claim the HRA exemption when filing your return under the old regime, as long as you have the evidence, and receive the excess tax as a refund.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I claim HRA if I live with my parents?',
        a: 'Yes, if you genuinely pay rent to a parent who owns the house, with a rental agreement and bank transfers as proof. Your parent must show the rent as income.',
      },
      {
        q: 'Is HRA fully taxable in the new regime?',
        a: 'Yes. Under the new regime, the entire HRA received is taxable as part of your salary.',
      },
      {
        q: 'Do I need rent receipts for small amounts?',
        a: 'Employers usually accept declarations without receipts up to about ₹3,000 a month, but keep receipts and proof of payment anyway, in case the tax department asks.',
      },
    ],
  },
  {
    slug: 'how-gst-works',
    title: 'How GST works: rates, calculation and CGST/SGST/IGST',
    seoTitle: 'How GST Works – Rates, Calculation, CGST, SGST & IGST',
    description:
      'A plain-English guide to GST in India: how to add and remove GST, the GST 2.0 rate slabs, when CGST + SGST or IGST applies, input tax credit and registration limits.',
    topic: 'Tax & Salary',
    updated: '2026-09-26',
    calculators: ['gst', 'profit-margin', 'discount'],
    keyPoints: [
      'Adding GST: total = price × (1 + rate). Removing GST: base = total ÷ (1 + rate).',
      'After the GST 2.0 reform of September 2025, most goods and services fall in the 5% or 18% slabs, with 40% for demerit goods.',
      'Within a state, GST is split equally into CGST and SGST; between states, it is charged as IGST.',
      'Businesses recover the GST they pay on purchases through input tax credit.',
    ],
    sections: [
      {
        heading: 'Adding and removing GST',
        paragraphs: [
          'To add GST to a price: GST = price × rate, and total = price + GST. A ₹10,000 item at 18%: GST ₹1,800, total ₹11,800.',
          'To remove GST from an inclusive price: base = total ÷ (1 + rate). From ₹11,800 at 18%: 11,800 ÷ 1.18 = ₹10,000, so GST was ₹1,800. A common mistake is taking 18% of ₹11,800 (₹2,124), which overstates the tax.',
        ],
      },
      {
        heading: 'GST rate slabs',
        table: {
          columns: ['Rate', 'Typically applies to'],
          rows: [
            ['0% (nil / exempt)', 'Fresh food, milk, many basic necessities, education and healthcare services'],
            ['5%', 'Everyday essentials, many packaged foods and some services'],
            ['18%', 'The standard rate: most goods and most services'],
            ['40%', 'Demerit and luxury goods such as tobacco and aerated sugary drinks'],
          ],
        },
        after: [
          'The GST 2.0 changes, effective 22 September 2025, moved most items out of the older 12% and 28% slabs into 5% or 18%, though a few items still carry other rates. The exact rate depends on the item’s HSN or SAC code — check the CBIC rate finder for a specific product or service.',
        ],
      },
      {
        heading: 'CGST, SGST and IGST',
        paragraphs: [
          'When the supplier and the place of supply are in the same state, the GST is split equally between the centre (CGST) and the state (SGST, or UTGST in union territories): 18% becomes 9% + 9%. When they are in different states, the whole amount is charged as integrated GST (IGST). The total tax is the same either way; only who collects it differs.',
        ],
      },
      {
        heading: 'Input tax credit: why GST is a tax on value added',
        paragraphs: [
          'A registered business pays GST on its purchases and collects GST on its sales. It pays the government only the difference, claiming the tax on purchases as input tax credit. If a trader buys goods for ₹10,000 + ₹1,800 GST and sells them for ₹15,000 + ₹2,700 GST, it deposits only ₹900 — the GST on the ₹5,000 of value it added. The final consumer bears the full ₹2,700.',
        ],
      },
      {
        heading: 'Who must register',
        bullets: [
          'Suppliers of goods with turnover above ₹40 lakh a year (₹20 lakh in special-category states).',
          'Service providers with turnover above ₹20 lakh (₹10 lakh in special-category states).',
          'Anyone making interstate supplies of goods or selling through e-commerce operators, in most cases regardless of turnover.',
          'Small businesses can opt for the composition scheme, paying tax at a low flat rate on turnover without input tax credit.',
        ],
      },
      {
        heading: 'Reading a GST invoice',
        bullets: [
          'The supplier’s and, for business purchases, the buyer’s GSTIN (15-character GST number).',
          'An HSN code for goods or SAC code for services, which determines the rate.',
          'The taxable value, the GST rate, and the tax split into CGST + SGST or shown as IGST.',
          'The place of supply, which decides whether CGST + SGST or IGST applies.',
          'For businesses, only a proper tax invoice lets you claim input tax credit.',
        ],
      },
      {
        heading: 'GST on a discounted price',
        paragraphs: [
          'GST is charged on the transaction value after a discount shown on the invoice. An item listed at ₹10,000 with a 10% discount is taxed on ₹9,000: at 18%, GST is ₹1,620 and the total ₹10,620. The discount calculator applies GST after discounts.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How do I calculate GST at 18% on ₹1,000?',
        a: 'Multiply by 0.18: GST is ₹180 and the total ₹1,180. Within a state, that is ₹90 CGST plus ₹90 SGST.',
      },
      {
        q: 'How do I find the price before GST?',
        a: 'Divide the GST-inclusive price by 1 plus the rate. For ₹1,180 at 18%, 1,180 ÷ 1.18 = ₹1,000.',
      },
      {
        q: 'Is GST charged on salary?',
        a: 'No. Salary paid by an employer to an employee is outside GST.',
      },
    ],
  },
];
