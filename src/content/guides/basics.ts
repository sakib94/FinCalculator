import type { Guide } from './types';

export const BASICS_GUIDES: Guide[] = [
  {
    slug: 'power-of-compounding',
    title: 'The power of compounding: simple vs compound interest explained',
    seoTitle: 'Compound Interest Explained – Simple vs Compound, Rule of 72',
    description:
      'How compound interest works, how it differs from simple interest, why compounding frequency and time matter, and the rule of 72 — with worked examples.',
    topic: 'Money basics',
    updated: '2026-09-26',
    calculators: ['compound-interest', 'simple-interest', 'mutual-fund', 'fd'],
    keyPoints: [
      'Simple interest is earned only on the original amount; compound interest is also earned on past interest.',
      '₹1 lakh at 8% grows to ₹3.4 lakh in 30 years with simple interest, but to ₹10.1 lakh with yearly compounding.',
      'Time is the biggest driver: compounding is slow at first and very fast later.',
      'Rule of 72: divide 72 by the rate to estimate the years it takes to double.',
    ],
    sections: [
      {
        heading: 'Simple interest vs compound interest',
        paragraphs: [
          'Simple interest is calculated only on the principal: interest = P × R × T ÷ 100. ₹1,00,000 at 8% earns ₹8,000 every year, no matter how long you hold it.',
          'Compound interest adds each period’s interest to the balance, so the next period’s interest is calculated on a larger amount: A = P × (1 + r/n)^(n × t), where n is the number of times interest is compounded each year.',
        ],
        table: {
          caption: '₹1,00,000 at 8% a year',
          columns: ['Years', 'Simple interest', 'Compounded yearly'],
          rows: [
            ['10', '₹1,80,000', '₹2,15,892'],
            ['20', '₹2,60,000', '₹4,66,096'],
            ['30', '₹3,40,000', '₹10,06,266'],
          ],
        },
        after: [
          'In the first 10 years the difference is modest. By year 30, compounding has produced almost three times as much. This is why long-term investing works — and why long-term debt is so expensive.',
        ],
      },
      {
        heading: 'Compounding frequency',
        paragraphs: [
          'The more often interest is added, the faster the balance grows, though the effect is smaller than the effect of time or rate. ₹1 lakh at 10% for 10 years grows to ₹2,59,374 compounded yearly, ₹2,68,506 quarterly and ₹2,70,704 monthly. Bank FDs compound quarterly; PPF yearly; savings accounts calculate interest daily and credit it quarterly or monthly.',
        ],
      },
      {
        heading: 'Starting early beats investing more',
        paragraphs: [
          'Two people invest ₹5,000 a month at 12%. One starts at 25, the other at 35, and both stop at 60. The early starter invests ₹21 lakh and ends with about ₹3.2 crore; the late starter invests ₹15 lakh and ends with about ₹95 lakh. Ten extra years of compounding more than triple the result.',
        ],
      },
      {
        heading: 'The rule of 72',
        table: {
          columns: ['Annual return', 'Years to double (72 ÷ rate)'],
          rows: [
            ['6%', 'About 12 years'],
            ['8%', 'About 9 years'],
            ['10%', 'About 7.2 years'],
            ['12%', 'About 6 years'],
          ],
        },
        after: [
          'The same rule works against you: at 6% inflation, prices double in about 12 years, and credit card debt at 36% doubles in two.',
        ],
      },
      {
        heading: 'Making compounding work for you',
        bullets: [
          'Start as early as possible, even with small amounts.',
          'Reinvest returns rather than withdrawing them — choose growth or cumulative options.',
          'Keep costs low: a 1% higher expense ratio compounds against you every year.',
          'Avoid interrupting the process by breaking investments early.',
          'Repay high-interest debt quickly — compounding works just as hard for your lender.',
        ],
      },
      {
        heading: 'Compounding on debt: the other side',
        paragraphs: [
          'Credit cards typically charge around 3%–3.75% a month on unpaid balances — over 40% a year once compounded. Leave ₹50,000 unpaid for a year at 3.5% a month and it grows to about ₹75,500 before GST and late fees. Paying only the “minimum amount due” keeps most of the balance compounding at that rate.',
          'The same maths explains why long loan tenures are expensive and why prepaying early saves so much: interest on a large balance compounds against you for longer. Compounding is neutral — it simply rewards whoever is on the receiving end of the interest.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is the formula for compound interest?',
        a: 'A = P × (1 + r/n)^(n × t), where P is the principal, r the annual rate as a decimal, n the number of compounding periods a year and t the years. Compound interest = A − P.',
      },
      {
        q: 'Do fixed deposits use compound interest?',
        a: 'Yes. Cumulative bank FDs usually compound quarterly. Payout FDs pay the interest out instead, so it does not compound.',
      },
      {
        q: 'Is compound interest always better?',
        a: 'When you are earning, yes. When you are borrowing, compounding works against you — unpaid credit card interest, for example, compounds at 36% or more a year.',
      },
    ],
  },
  {
    slug: 'inflation-and-real-returns',
    title: 'Inflation and real returns: what your money is really earning',
    seoTitle: 'Inflation & Real Returns – How Inflation Erodes Savings',
    description:
      'How inflation reduces purchasing power, how to calculate real returns after inflation and tax, and why a 7% FD can lose value for someone in the 30% slab.',
    topic: 'Money basics',
    updated: '2026-09-26',
    calculators: ['inflation', 'retirement', 'fd', 'goal-sip'],
    keyPoints: [
      'At 6% inflation, ₹1 lakh today will buy only about ₹31,000 of goods in 20 years.',
      'Real return ≈ (1 + nominal return) ÷ (1 + inflation) − 1.',
      'A 7% FD earns about 0.9% in real terms before tax — and loses about 1.1% a year after tax at the 30% slab.',
      'Long-term goals need investments that can beat inflation after tax.',
    ],
    sections: [
      {
        heading: 'What inflation does to money',
        paragraphs: [
          'Inflation is the rate at which prices rise. When it is 6% a year, something that costs ₹100 today costs ₹106 next year. Money that sits still loses purchasing power every year.',
        ],
        table: {
          caption: 'At 6% inflation',
          columns: ['Years from now', 'Cost of what ₹1 lakh buys today', 'What ₹1 lakh will buy then'],
          rows: [
            ['10', '₹1,79,085', '₹55,839'],
            ['20', '₹3,20,714', '₹31,180'],
            ['30', '₹5,74,349', '₹17,411'],
          ],
        },
      },
      {
        heading: 'Nominal vs real returns',
        paragraphs: [
          'The nominal return is what an investment pays; the real return is what it earns after inflation. The exact formula is real return = (1 + nominal) ÷ (1 + inflation) − 1. A quick approximation is nominal return minus inflation.',
          'A 7% FD with 6% inflation: (1.07 ÷ 1.06) − 1 ≈ 0.94% a year in real terms. After tax at the 30% slab plus cess, the 7% becomes about 4.8%, and the real return is about −1.1% — the deposit is slowly losing purchasing power.',
        ],
      },
      {
        heading: 'Why it matters for goals',
        bullets: [
          'Plan goals in future rupees. ₹50,000 a month of expenses today becomes about ₹2.15 lakh a month in 25 years at 6%.',
          'Education costs have historically risen faster than general inflation, often 8%–10% a year.',
          'Retirement lasts 25–30 years, during which inflation keeps working; a pension that does not rise loses most of its value.',
        ],
      },
      {
        heading: 'Protecting your money from inflation',
        bullets: [
          'Hold only what you need for emergencies and near-term goals in cash and deposits.',
          'For goals more than five years away, use investments with a history of beating inflation, such as diversified equity funds, alongside PPF, EPF and NPS.',
          'Increase SIPs and savings each year as your income grows, so contributions keep pace with prices.',
          'Review goal amounts every few years using current costs.',
        ],
      },
      {
        heading: 'How inflation is measured in India',
        paragraphs: [
          'The headline measure is the Consumer Price Index (CPI), published monthly by the National Statistics Office. The RBI’s monetary policy targets CPI inflation of 4%, within a band of 2% to 6%. Your personal inflation can be quite different: households spending heavily on education, healthcare or rent often see costs rise faster than the CPI.',
        ],
      },
      {
        heading: 'Real returns on common savings options',
        table: {
          caption: 'Assuming 6% inflation; the tax column is for the 30% slab',
          columns: ['Option', 'Nominal return', 'Real return'],
          rows: [
            ['Savings account (3%, taxable)', '≈ 2.1% after tax', '≈ −3.7%'],
            ['Bank FD (7%, taxable)', '≈ 4.8% after tax', '≈ −1.1%'],
            ['PPF (7.1%, tax-free)', '7.1%', '≈ +1.0%'],
            ['Diversified equity (assumed 12%, before tax)', '12%', '≈ +5.7%'],
          ],
        },
        after: [
          'Only investments whose after-tax return beats inflation actually grow your purchasing power. That is why long-term goals usually need some exposure to growth assets, while deposits are best for safety and short-term needs.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What inflation rate should I use for planning?',
        a: 'A common assumption is 6% a year for general expenses, which is above the RBI’s 4% target and builds in a margin. Use 8%–10% for education and healthcare.',
      },
      {
        q: 'Does gold protect against inflation?',
        a: 'Over long periods gold has often kept pace with inflation in rupee terms, but with long stretches of poor returns. It is usually held as a small part of a portfolio rather than as the main inflation hedge.',
      },
      {
        q: 'Is a savings account safe from inflation?',
        a: 'The money is safe from loss, but at typical savings rates of 2.5%–4% it loses purchasing power whenever inflation is higher. Keep only emergency and near-term money there.',
      },
    ],
  },
  {
    slug: 'how-to-calculate-percentage',
    title: 'How to calculate percentages: increase, decrease, discounts and margins',
    seoTitle: 'How to Calculate Percentage – Formulas & Examples',
    description:
      'Every everyday percentage calculation with formulas and examples: percent of a number, percentage change, reverse percentages, stacked discounts, markup vs margin.',
    topic: 'Money basics',
    updated: '2026-09-26',
    calculators: ['percentage', 'discount', 'markup', 'profit-margin'],
    keyPoints: [
      'X% of Y = Y × X ÷ 100.',
      'Percentage change = (new − old) ÷ old × 100 — a rise from 80 to 100 is 25%, a fall from 100 to 80 is 20%.',
      '“30% off + 10% extra” is a 37% discount, not 40%.',
      'A 25% markup is only a 20% profit margin.',
    ],
    sections: [
      {
        heading: 'The core formulas',
        table: {
          columns: ['Question', 'Formula', 'Example'],
          rows: [
            ['What is X% of Y?', 'Y × X ÷ 100', '18% of ₹2,500 = ₹450'],
            ['X is what % of Y?', 'X ÷ Y × 100', '₹450 of ₹2,500 = 18%'],
            ['Percentage increase', '(New − Old) ÷ Old × 100', '₹80 to ₹100 = +25%'],
            ['Percentage decrease', '(Old − New) ÷ Old × 100', '₹100 to ₹80 = −20%'],
            ['Value after a % increase', 'Value × (1 + % ÷ 100)', '₹50,000 + 8% = ₹54,000'],
            ['Original before a % increase', 'Final ÷ (1 + % ÷ 100)', '₹54,000 ÷ 1.08 = ₹50,000'],
          ],
        },
      },
      {
        heading: 'Why up and down are not symmetrical',
        paragraphs: [
          'A share that falls 50% needs to rise 100% to get back where it started. A salary cut of 20% needs a 25% raise to be undone. Percentage changes are always measured against the starting value, and the starting value is different on the way back.',
        ],
      },
      {
        heading: 'Stacked discounts',
        paragraphs: [
          'Successive discounts multiply rather than add. “30% off, plus an extra 10%” on ₹1,000: first ₹1,000 × 0.70 = ₹700, then ₹700 × 0.90 = ₹630. The total discount is 37%, not 40%. The discount calculator handles stacked offers and GST on the discounted price.',
        ],
      },
      {
        heading: 'Markup vs margin',
        paragraphs: [
          'Markup is profit as a percentage of cost; margin is profit as a percentage of the selling price. An item that costs ₹100 and sells for ₹125 has a 25% markup but a 20% margin (₹25 ÷ ₹125). To hit a target margin, divide cost by (1 − margin): for a 30% margin on ₹100 cost, price = 100 ÷ 0.70 ≈ ₹142.86.',
        ],
      },
      {
        heading: 'Percentage vs percentage points',
        paragraphs: [
          'When a loan rate rises from 8% to 9%, it rises by one percentage point — but by 12.5% in relative terms. News about interest rates, tax rates and inflation usually speaks in percentage points; be clear which one a figure means.',
        ],
      },
      {
        heading: 'Quick mental shortcuts',
        bullets: [
          '10% of a number: move the decimal one place left. 10% of ₹4,500 is ₹450.',
          '5% is half of 10%; 20% is double; 15% is 10% plus 5%.',
          '1% of a number: move the decimal two places left, then multiply for any whole percentage.',
          'X% of Y equals Y% of X: 8% of 50 is the same as 50% of 8, which is 4.',
        ],
      },
      {
        heading: 'Successive percentage changes',
        paragraphs: [
          'Percentages applied one after another multiply. A price that rises 10% and then falls 10% ends 1% lower (1.10 × 0.90 = 0.99). Three years of 10% growth add up to 33.1%, not 30% (1.1³ = 1.331). This is compounding at work — the same reason salaries, investments and prices grow faster over time than simple addition suggests.',
          'To find the overall change from several steps, multiply the factors (1 + each change) and subtract 1. For a 5% salary cut followed by a 12% raise: 0.95 × 1.12 = 1.064, an overall rise of 6.4%.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How do I calculate a percentage of a total in Excel?',
        a: 'Use =Part/Total and format the cell as a percentage, or =Part/Total*100 for a plain number.',
      },
      {
        q: 'How do I calculate marks percentage?',
        a: 'Divide the marks obtained by the maximum marks and multiply by 100. 432 out of 500 is 432 ÷ 500 × 100 = 86.4%.',
      },
      {
        q: 'What is the formula for percentage increase?',
        a: '(New value − Old value) ÷ Old value × 100. A salary rising from ₹60,000 to ₹66,000 is a 10% increase.',
      },
    ],
  },
];
