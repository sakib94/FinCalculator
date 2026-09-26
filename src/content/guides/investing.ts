import type { Guide } from './types';

export const INVESTING_GUIDES: Guide[] = [
  {
    slug: 'what-is-sip',
    title: 'What is a SIP? How systematic investment plans work',
    seoTitle: 'What Is SIP? How a Systematic Investment Plan Works',
    description:
      'A SIP invests a fixed amount in a mutual fund every month. Learn how SIP returns are calculated, what ₹10,000 a month can grow to, step-up SIPs and common mistakes.',
    topic: 'Investing',
    updated: '2026-09-26',
    calculators: ['mutual-fund', 'goal-sip', 'cagr'],
    keyPoints: [
      'A SIP invests a fixed amount in a mutual fund at regular intervals, usually monthly.',
      'At 12% a year, ₹10,000 a month grows to about ₹23 lakh in 10 years and ₹1 crore in 20 years.',
      'Time in the market matters more than the amount: the last 10 years of a 30-year SIP add over ₹2.5 crore.',
      'SIP returns are market-linked and not guaranteed; use a conservative rate when planning.',
    ],
    sections: [
      {
        heading: 'SIP in one paragraph',
        paragraphs: [
          'A systematic investment plan (SIP) is an instruction to your mutual fund to take a fixed amount from your bank account on a fixed date — every month, for most people — and buy units of a fund at that day’s price (NAV). It is not a product in itself; it is a way of investing in any mutual fund, from equity and index funds to debt and hybrid funds.',
          'Because the amount is fixed and the unit price changes, you automatically buy more units when prices are low and fewer when they are high. Over time this smooths out the price you pay and removes the need to guess the right moment to invest.',
        ],
      },
      {
        heading: 'How SIP returns are calculated',
        paragraphs: [
          'Each instalment grows for the months remaining until you stop. A calculator assumes a steady annual return, converts it to a monthly rate (r = annual rate ÷ 12) and adds up the growth of every instalment: FV = P × [((1 + r)ⁿ − 1) ÷ r] × (1 + r), where P is the monthly amount and n the number of months. The last (1 + r) reflects that each instalment is invested at the start of the month.',
          'Real returns do not arrive smoothly — some years are up 30%, others down 20% — so the actual value on any date will differ. The formula tells you what a steady average would produce.',
        ],
      },
      {
        heading: 'What ₹10,000 a month can grow to',
        table: {
          caption: '₹10,000 a month at an assumed 12% a year',
          columns: ['Period', 'Amount invested', 'Estimated value', 'Estimated gain'],
          rows: [
            ['5 years', '₹6,00,000', '₹8,24,864', '₹2,24,864'],
            ['10 years', '₹12,00,000', '₹23,23,391', '₹11,23,391'],
            ['15 years', '₹18,00,000', '₹50,45,760', '₹32,45,760'],
            ['20 years', '₹24,00,000', '₹99,91,479', '₹75,91,479'],
            ['25 years', '₹30,00,000', '₹1,89,76,351', '₹1,59,76,351'],
            ['30 years', '₹36,00,000', '₹3,52,99,138', '₹3,16,99,138'],
          ],
        },
        after: [
          'The gains accelerate: in the first 10 years your money roughly doubles, but between years 20 and 30 the portfolio grows by more than ₹2.5 crore — almost all of it from returns on returns. Starting early is worth more than investing a larger amount later.',
        ],
      },
      {
        heading: 'How the assumed return changes the outcome',
        table: {
          caption: '₹10,000 a month for 10 years',
          columns: ['Assumed return', 'Estimated value'],
          rows: [
            ['8%', '₹18,41,657'],
            ['10%', '₹20,65,520'],
            ['12%', '₹23,23,391'],
            ['14%', '₹26,20,914'],
          ],
        },
        after: [
          'Plan with a conservative figure. Large-cap equity funds in India have historically delivered roughly 10%–13% a year over long periods, with wide variation; debt funds lower, closer to deposit rates. A plan that works at 10% will not fall apart if returns disappoint.',
        ],
      },
      {
        heading: 'Step-up SIPs: grow the SIP with your salary',
        paragraphs: [
          'A step-up (or top-up) SIP raises the monthly amount by a fixed percentage every year. Starting at ₹10,000 and stepping up 10% a year for 20 years means investing about ₹68.7 lakh in total; at 12% it could grow to about ₹1.99 crore — roughly twice the ₹1 crore from a flat ₹10,000 SIP. The mutual fund calculator has a step-up option.',
        ],
      },
      {
        heading: 'Common SIP mistakes',
        bullets: [
          'Stopping the SIP when markets fall — that is exactly when each instalment buys the most units.',
          'Judging a fund on one or two years of returns; equity SIPs need at least five to seven years.',
          'Using SIPs for short-term goals; money needed within three years belongs in deposits or debt funds.',
          'Holding too many funds. Three or four well-chosen funds diversify as well as fifteen.',
          'Ignoring the expense ratio. A direct plan with a lower expense ratio leaves more of the return with you.',
        ],
      },
      {
        heading: 'How SIP gains are taxed',
        paragraphs: [
          'Each SIP instalment is treated as a separate purchase with its own holding period. For equity funds, units held over 12 months are long-term: gains above ₹1.25 lakh a year are taxed at 12.5%. Units sold within 12 months are short-term and taxed at 20%. Gains on debt funds bought after 1 April 2023 are taxed at your slab rate regardless of holding period. The capital gains calculator works out the tax on a sale.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is the minimum amount for a SIP?',
        a: 'Many funds accept SIPs from ₹500 a month, and some from ₹100. The minimum varies by fund house and scheme.',
      },
      {
        q: 'Can I stop or pause a SIP?',
        a: 'Yes. Open-ended fund SIPs can be stopped or paused at any time without a penalty; the units already bought stay invested. Exit loads may apply if you redeem units within a short period, often one year for equity funds.',
      },
      {
        q: 'Is SIP better than lumpsum?',
        a: 'Neither is always better. A lumpsum invested early earns more if markets rise steadily; a SIP reduces the risk of investing everything at a peak. For a regular salary, SIP is the natural fit. See our SIP vs lumpsum guide.',
      },
    ],
  },
  {
    slug: 'sip-vs-lumpsum',
    title: 'SIP vs lumpsum: which is better?',
    seoTitle: 'SIP vs Lumpsum – Which Investment Method Is Better?',
    description:
      'Compare investing through a monthly SIP with investing a lumpsum: returns, risk, rupee cost averaging with a worked example, and when each makes sense.',
    topic: 'Investing',
    updated: '2026-09-26',
    calculators: ['mutual-fund', 'cagr'],
    keyPoints: [
      'A lumpsum puts all your money to work at once; a SIP spreads it over time.',
      'In a steadily rising market a lumpsum ends higher, because more money is invested for longer.',
      'A SIP lowers the risk of investing everything just before a fall, and buys more units when prices dip.',
      'For money you already have, a staggered approach — an STP over 6–12 months — is a common middle path.',
    ],
    sections: [
      {
        heading: 'The basic difference',
        paragraphs: [
          'With a lumpsum, you invest the entire amount on one day at one price. With a SIP, you invest a fixed amount every month at whatever the price is that month. Most people use both: SIPs from monthly salary, and lumpsums when a bonus, maturity or inheritance arrives.',
        ],
      },
      {
        heading: 'Rupee cost averaging, with numbers',
        paragraphs: [
          'Suppose you invest ₹60,000 in a fund over six months while its NAV moves 100 → 80 → 60 → 80 → 100 → 120.',
        ],
        table: {
          columns: ['Month', 'NAV', 'Units bought with ₹10,000 SIP'],
          rows: [
            ['1', '₹100', '100.0'],
            ['2', '₹80', '125.0'],
            ['3', '₹60', '166.7'],
            ['4', '₹80', '125.0'],
            ['5', '₹100', '100.0'],
            ['6', '₹120', '83.3'],
          ],
        },
        after: [
          'The SIP buys 700 units at an average cost of ₹85.71 — below the average NAV of ₹90 — and is worth ₹84,000 at the end. A ₹60,000 lumpsum in month 1 at ₹100 would have bought 600 units, worth ₹72,000. Here the SIP wins because prices fell after the lumpsum went in.',
          'Reverse the path — prices rising steadily from the first month — and the lumpsum wins, because all its money rode the whole rise. Neither approach wins every time; the SIP simply avoids the worst outcome of investing everything at a peak.',
        ],
      },
      {
        heading: 'Same money, different time in the market',
        paragraphs: [
          'Comparing ₹12 lakh invested as a lumpsum today with ₹10,000 a month for 10 years, both at 12%: the lumpsum grows to about ₹37.3 lakh, the SIP to about ₹23.2 lakh. That is not because lumpsums are better — the lumpsum had all ₹12 lakh invested for all 10 years, while the average SIP rupee was invested for only about five. If you already have the money, delaying it has a cost; if you are investing from income, a SIP is simply how the money arrives.',
        ],
      },
      {
        heading: 'Which should you choose?',
        table: {
          columns: ['Situation', 'Usually suits'],
          rows: [
            ['Investing from monthly salary', 'SIP'],
            ['Large windfall, long horizon, comfortable with volatility', 'Lumpsum, or STP over 6–12 months'],
            ['Markets have risen sharply and you are nervous', 'STP from a liquid fund into equity'],
            ['Debt or liquid funds', 'Lumpsum — timing matters little'],
            ['New investor building a habit', 'SIP'],
          ],
        },
        after: [
          'A systematic transfer plan (STP) parks the lumpsum in a liquid or short-term debt fund and moves a fixed amount into an equity fund every week or month — combining the discipline of a SIP with money that is already invested.',
        ],
      },
      {
        heading: 'How an STP works',
        paragraphs: [
          'A systematic transfer plan moves money from one fund to another in fixed instalments. You invest the lumpsum in a liquid or ultra-short-term debt fund of the same fund house, and instruct it to transfer, say, one-twelfth of the amount into an equity fund every month. The money waiting in the debt fund earns a modest return instead of sitting idle, and the equity investment is spread over the year.',
          'Each transfer is a redemption from the debt fund, so it can create a small taxable gain; exit loads usually do not apply to liquid funds after a few days.',
        ],
      },
      {
        heading: 'Mistakes to avoid',
        bullets: [
          'Waiting for the “right time” to invest a lumpsum — cash left idle for months often costs more than a market dip.',
          'Stopping SIPs after a fall, which gives up the cheap units that make SIPs work.',
          'Comparing a SIP’s return with a lumpsum’s using absolute returns; use XIRR for SIPs and CAGR for a lumpsum.',
          'Putting a lumpsum you will need within three years into equity at all.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is SIP safer than lumpsum?',
        a: 'A SIP reduces timing risk — the risk of investing everything just before a fall — but not market risk. Both are exposed to the same fund once invested.',
      },
      {
        q: 'Can I do both SIP and lumpsum in the same fund?',
        a: 'Yes. Most investors run SIPs and add lumpsums to the same fund whenever they have surplus money.',
      },
      {
        q: 'How long should an STP run?',
        a: 'Commonly 6 to 12 months for equity funds. A longer STP spreads the timing risk further but keeps more money in low-return debt for longer.',
      },
    ],
  },
  {
    slug: 'sip-vs-fd-rd',
    title: 'SIP vs FD vs RD: where should monthly savings go?',
    seoTitle: 'SIP vs FD vs RD – Returns, Risk & Tax Compared',
    description:
      'Compare a mutual fund SIP with fixed and recurring deposits on returns, risk, liquidity and tax, with ₹10,000-a-month examples over 5 and 10 years.',
    topic: 'Investing',
    updated: '2026-09-26',
    calculators: ['mutual-fund', 'rd', 'fd'],
    keyPoints: [
      'FDs and RDs give guaranteed returns; equity SIPs give market-linked returns that can be higher or lower.',
      '₹10,000 a month for 10 years: about ₹17.4 lakh in an RD at 7%, about ₹23.2 lakh in a SIP at an assumed 12%.',
      'FD and RD interest is taxed every year at your slab; equity fund gains are taxed only when sold, at lower rates.',
      'Match the product to the goal’s timeline: deposits for under 3 years, equity SIPs for 5+ years.',
    ],
    sections: [
      {
        heading: 'Three different tools',
        table: {
          columns: ['', 'Fixed deposit (FD)', 'Recurring deposit (RD)', 'Equity mutual fund SIP'],
          rows: [
            ['How you invest', 'One lumpsum', 'Fixed amount monthly', 'Fixed amount monthly'],
            ['Returns', 'Fixed when booked', 'Fixed when opened', 'Market-linked, not guaranteed'],
            ['Typical return', 'About 6%–7.5%', 'About 6%–7.5%', 'Long-run average often 10%–13%, with swings'],
            ['Risk to capital', 'Very low; insured up to ₹5 lakh per bank', 'Very low; insured up to ₹5 lakh per bank', 'Value can fall, sometimes sharply'],
            ['Early exit', 'Penalty, typically 0.5%–1%', 'Penalty on premature closure', 'Anytime; exit load if under ~1 year'],
            ['Tax', 'Interest at slab rate each year', 'Interest at slab rate each year', '12.5% on long-term gains above ₹1.25 lakh a year'],
          ],
        },
      },
      {
        heading: '₹10,000 a month: RD vs SIP',
        table: {
          caption: 'Before tax. RD at 7% compounded quarterly; SIP at an assumed 12% a year.',
          columns: ['Period', 'Invested', 'RD value', 'SIP value'],
          rows: [
            ['5 years', '₹6,00,000', '≈ ₹7,19,300', '≈ ₹8,24,900'],
            ['10 years', '₹12,00,000', '≈ ₹17,37,000', '≈ ₹23,23,400'],
          ],
        },
        after: [
          'Over 10 years the SIP’s expected lead is large — but it is an expectation, not a promise. In a poor decade the SIP could end below the RD. Over five years the gap is smaller and the range of SIP outcomes relatively wider.',
        ],
      },
      {
        heading: 'Tax widens the gap',
        paragraphs: [
          'Deposit interest is added to your income every year and taxed at your slab — at the 30% slab plus cess, a 7% deposit yields only about 4.8% after tax, which is below typical inflation. Equity fund gains are taxed only when you sell, and long-term gains above ₹1.25 lakh a year are taxed at 12.5%. For someone in a high tax bracket with a long horizon, the after-tax difference can be substantial.',
        ],
      },
      {
        heading: 'Choosing by goal',
        bullets: [
          'Emergency fund: savings account, sweep FD or liquid fund — safety and access matter, not returns.',
          'Goals within 1–3 years (a car, a wedding, a fee payment): FD or RD, so the money is certainly there.',
          'Goals 3–5 years away: a mix, or hybrid and debt funds.',
          'Goals 5+ years away (retirement, children’s education): equity SIPs, gradually moving to safer options as the goal approaches.',
        ],
      },
      {
        heading: 'A rough after-tax comparison',
        paragraphs: [
          'Taking the 10-year example and an investor in the 30% slab: RD interest is taxed every year, which lowers the effective rate to roughly 4.8%, so the RD ends near ₹15.4 lakh after tax. If the SIP achieves 12% and all units are redeemed at the end, long-term capital gains tax of about ₹1.3 lakh leaves roughly ₹21.9 lakh.',
          'These are estimates. SIP returns vary widely from decade to decade, and spreading redemptions over several years, to use the ₹1.25 lakh exemption each year, reduces the tax further.',
        ],
      },
      {
        heading: 'Using both together',
        paragraphs: [
          'This is rarely an either-or choice. A sensible plan often uses an RD or FD for the next one or two years of known expenses and an emergency fund, and SIPs for everything further out. As a long-term goal gets within two or three years, move money gradually from the SIP into deposits so a market fall just before the goal cannot derail it.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is a SIP risky?',
        a: 'A SIP in an equity fund carries market risk: its value can fall below the amount invested, especially over short periods. Over long periods, diversified equity funds have usually beaten deposits, but there is no guarantee.',
      },
      {
        q: 'Which is better for a 3-year goal?',
        a: 'For money you definitely need in three years, an RD, FD or short-term debt fund is usually more suitable than an equity SIP, because equity values can fall significantly in any given three-year period.',
      },
      {
        q: 'Are RD returns guaranteed?',
        a: 'Yes. The rate is fixed when you open the RD and does not change for its term. Deposits are insured by DICGC up to ₹5 lakh per depositor per bank.',
      },
    ],
  },
  {
    slug: 'what-is-cagr',
    title: 'What is CAGR? CAGR vs absolute return vs XIRR',
    seoTitle: 'What Is CAGR? CAGR vs Absolute Return vs XIRR Explained',
    description:
      'CAGR is the steady yearly growth rate that turns a starting value into an ending value. Learn the formula, see examples, and when to use absolute return or XIRR instead.',
    topic: 'Investing',
    updated: '2026-09-26',
    calculators: ['cagr', 'mutual-fund', 'stock-average'],
    keyPoints: [
      'CAGR = (ending value ÷ starting value)^(1 ÷ years) − 1.',
      '₹1 lakh growing to ₹2.5 lakh in 7 years is a 150% absolute return but a 14% CAGR.',
      'CAGR is right for a single investment with no additions or withdrawals.',
      'For SIPs and irregular cash flows, use XIRR.',
    ],
    sections: [
      {
        heading: 'What CAGR means',
        paragraphs: [
          'Compound annual growth rate (CAGR) answers one question: at what steady yearly rate would the starting amount have grown to the ending amount over this period? It ignores the ups and downs in between and turns any journey into a single, comparable yearly figure.',
          'Formula: CAGR = (Ending value ÷ Beginning value)^(1 ÷ number of years) − 1.',
        ],
      },
      {
        heading: 'Example',
        paragraphs: [
          'You invested ₹1,00,000 and it is worth ₹2,50,000 after 7 years. CAGR = (2,50,000 ÷ 1,00,000)^(1/7) − 1 = 2.5^0.1429 − 1 ≈ 13.99% a year.',
          'The absolute return is (2,50,000 − 1,00,000) ÷ 1,00,000 = 150%, which sounds much bigger but says nothing about how long it took. 150% over 3 years would be a 35.7% CAGR; over 15 years, only 6.3%.',
        ],
      },
      {
        heading: 'CAGR, absolute return and XIRR compared',
        table: {
          columns: ['Measure', 'What it tells you', 'Use it for'],
          rows: [
            ['Absolute return', 'Total % gain, ignoring time', 'Holdings of under a year'],
            ['CAGR', 'Steady yearly growth rate', 'A single lumpsum held for several years; comparing funds’ trailing returns'],
            ['XIRR', 'Yearly return accounting for the date and size of every cash flow', 'SIPs, top-ups, partial withdrawals, stock portfolios bought over time'],
          ],
        },
      },
      {
        heading: 'Why a SIP needs XIRR',
        paragraphs: [
          'In a SIP, the first instalment is invested for the whole period and the last for only a month. Dividing the final value by the total invested and applying the CAGR formula over the full period badly understates the return. XIRR solves for the single annual rate that, applied to each instalment for its own time invested, produces the final value. Spreadsheets compute it with =XIRR(values, dates), with investments entered as negative numbers and the current value as positive.',
        ],
      },
      {
        heading: 'The rule of 72',
        paragraphs: [
          'A quick companion to CAGR: divide 72 by the annual rate to estimate how many years it takes money to double. At 12%, money doubles in about 6 years; at 8%, about 9 years; at 6%, about 12 years.',
        ],
      },
      {
        heading: 'A fund’s CAGR is not your return',
        paragraphs: [
          'Fund factsheets show trailing CAGRs — for example, a 5-year return of 14% means a lumpsum invested exactly five years ago grew at 14% a year. If you invested through a SIP, or bought at a different time, your own return will be different. Your fund house or registrar statement shows your personal XIRR.',
          'Trailing returns also change every day as the start and end dates move. A fund that looks excellent over five years may look ordinary over three, depending on where the market was at each end. Compare funds over the same periods and over several periods.',
        ],
      },
      {
        heading: 'CAGR for businesses and markets',
        paragraphs: [
          'CAGR is also used for sales, profits and populations. A company whose revenue grew from ₹100 crore to ₹180 crore in four years grew at a CAGR of about 15.8%, even if one of those years was flat. Because it hides volatility, look at the year-by-year figures too before drawing conclusions.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can CAGR be negative?',
        a: 'Yes. If the ending value is below the starting value, CAGR is negative. ₹1 lakh falling to ₹80,000 over 3 years is a CAGR of about −7.2%.',
      },
      {
        q: 'What is a good CAGR?',
        a: 'It depends on the asset and the risk. Deposits in India have typically offered 6%–7.5%; diversified equity has historically averaged more over long periods, with large swings. Compare a CAGR with inflation and with a suitable benchmark, not in isolation.',
      },
      {
        q: 'How do I calculate CAGR in Excel?',
        a: 'Use =(End/Start)^(1/Years)-1, or =RRI(Years, Start, End). For irregular cash flows use =XIRR(values, dates).',
      },
    ],
  },
  {
    slug: 'epf-vs-ppf-vs-nps',
    title: 'EPF vs PPF vs NPS: comparing India’s retirement savings schemes',
    seoTitle: 'EPF vs PPF vs NPS – Returns, Lock-in & Tax Compared',
    description:
      'Compare EPF, PPF and NPS on returns, lock-in, withdrawals and tax treatment, and see how the three can work together in a retirement plan.',
    topic: 'Investing',
    updated: '2026-09-26',
    calculators: ['epf', 'ppf', 'nps', 'retirement'],
    keyPoints: [
      'EPF and PPF pay government-set, fixed rates; NPS returns are market-linked.',
      'EPF is for salaried employees; PPF and NPS are open to any resident Indian.',
      'EPF and PPF are tax-free on maturity; in NPS, 60% of the corpus can be taken tax-free and part of the rest must buy an annuity.',
      'Most people benefit from a combination rather than choosing one.',
    ],
    sections: [
      {
        heading: 'At a glance',
        table: {
          columns: ['', 'EPF', 'PPF', 'NPS'],
          rows: [
            ['Who can invest', 'Salaried employees of covered establishments', 'Any resident individual', 'Any Indian citizen aged 18–70'],
            ['Contribution', '12% of basic + DA, matched by employer', '₹500 to ₹1.5 lakh a year', 'Flexible; minimum ₹1,000 a year (Tier I)'],
            ['Return', 'Declared yearly; 8.25% for FY 2025-26', 'Set quarterly; 7.1% since April 2020', 'Market-linked, depends on asset mix'],
            ['Lock-in', 'Till retirement, with partial withdrawals for specific needs', '15 years, extendable in 5-year blocks', 'Till age 60, limited partial withdrawals'],
            ['Tax on maturity', 'Tax-free after 5 years of service', 'Tax-free', 'Up to 60% lump sum tax-free; annuity income taxable'],
          ],
        },
      },
      {
        heading: 'EPF: the automatic foundation',
        paragraphs: [
          'If you are salaried, EPF is usually your largest retirement asset without you doing anything. You contribute 12% of basic pay plus dearness allowance, and your employer contributes 12% too (part of which goes to the EPS pension). Interest on employee contributions above ₹2.5 lakh a year (₹5 lakh where the employer does not contribute) is taxable. Voluntary PF (VPF) lets you contribute more at the same rate.',
        ],
      },
      {
        heading: 'PPF: guaranteed and tax-free',
        paragraphs: [
          'PPF suits anyone who wants a government-backed, tax-free return — including the self-employed. Deposits qualify for Section 80C in the old regime, and the interest and maturity amount are tax-free (the “EEE” status). The trade-off is a 15-year lock-in, a ₹1.5 lakh yearly cap and a rate that, though fixed for each quarter, can be revised.',
        ],
      },
      {
        heading: 'NPS: market-linked and low-cost',
        paragraphs: [
          'NPS invests in a mix of equity, corporate bonds and government securities that you choose, or that shifts automatically with age. Its fund management charges are among the lowest in the country. Old-regime taxpayers get an extra ₹50,000 deduction under Section 80CCD(1B), over and above 80C; employer contributions are deductible under Section 80CCD(2) in both regimes, up to 14% of basic + DA in the new regime. At 60, part of the corpus must buy an annuity that pays a taxable pension — traditionally at least 40%, though PFRDA has been relaxing the exit rules, so check the current limits before you plan around them.',
        ],
      },
      {
        heading: 'Using them together',
        bullets: [
          'Let EPF build automatically, and avoid withdrawing it when you change jobs — transfer it instead.',
          'Use PPF for the safe, tax-free part of your long-term savings, and as a fixed-income anchor.',
          'Add NPS if you are in the old regime and want the extra ₹50,000 deduction, or if your employer offers NPS contributions.',
          'Use equity mutual funds for growth and flexibility — none of these three offers easy access before retirement.',
        ],
      },
      {
        heading: 'Getting money out early',
        table: {
          columns: ['Scheme', 'Before retirement / maturity'],
          rows: [
            [
              'EPF',
              'Partial withdrawals for specific needs such as a house, medical treatment, marriage, education or unemployment, subject to service conditions and limits',
            ],
            [
              'PPF',
              'Loan from year 3 to 6; partial withdrawal once a year from year 7; premature closure after 5 years only for specified reasons',
            ],
            [
              'NPS',
              'Partial withdrawals of your own contributions for specified purposes after 3 years, a limited number of times; early exit rules are stricter',
            ],
          ],
        },
        after: [
          'None of the three is designed for easy access. Keep your emergency fund elsewhere.',
        ],
      },
      {
        heading: 'Which comes first?',
        paragraphs: [
          'For a salaried employee, EPF is already happening. Beyond that, the order depends on your tax regime and your need for safety. In the old regime, filling 80C (EPF and PPF often cover it) and then the extra ₹50,000 NPS deduction gives an immediate tax saving. In the new regime, those deductions do not apply, so the choice rests on return, safety and liquidity — PPF for guaranteed tax-free growth, equity funds or NPS for long-term growth.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I have both PPF and EPF?',
        a: 'Yes. A salaried person can contribute to EPF through their employer and open a PPF account independently. Both count towards the same ₹1.5 lakh Section 80C limit in the old regime.',
      },
      {
        q: 'Is NPS better than PPF?',
        a: 'NPS can invest in equity and so may grow faster over long periods, but its returns are not guaranteed and its exit rules require part of the corpus to buy an annuity. PPF is guaranteed and fully tax-free but capped at ₹1.5 lakh a year. They suit different purposes.',
      },
      {
        q: 'What happens to my EPF when I change jobs?',
        a: 'Transfer it to the new employer’s account through the EPFO portal using your UAN. Withdrawing it breaks the compounding and may be taxable if total service is under five years.',
      },
    ],
  },
  {
    slug: 'how-much-money-to-retire',
    title: 'How much money do you need to retire in India?',
    seoTitle: 'How Much Money Do I Need to Retire in India?',
    description:
      'Work out your retirement corpus: inflate today’s expenses to retirement, fund them for 25+ years, and find the monthly investment that closes the gap.',
    topic: 'Investing',
    updated: '2026-09-26',
    calculators: ['retirement', 'inflation', 'goal-sip', 'swp'],
    keyPoints: [
      'Start from today’s monthly expenses, not your salary.',
      'At 6% inflation, ₹60,000 a month today becomes about ₹3.07 lakh a month in 28 years.',
      'A retirement of 25 years at that level needs a corpus of roughly ₹8 crore.',
      'Starting 10 years earlier can cut the required monthly investment by more than half.',
    ],
    sections: [
      {
        heading: 'Step 1: your expenses at retirement',
        paragraphs: [
          'Add up what your household spends each month today, excluding EMIs that will be over and savings. Then inflate it: at 6% a year, costs double roughly every 12 years. ₹60,000 a month at age 32 becomes about ₹3,07,000 a month at 60.',
        ],
      },
      {
        heading: 'Step 2: the corpus that funds it',
        paragraphs: [
          'The corpus must pay rising expenses for the rest of your life — plan for at least 25–30 years after retirement. What it needs depends on how much it earns after you retire, relative to inflation. With a 7% post-retirement return and 6% inflation, funding 25 years of ₹3.07 lakh a month (rising with inflation) needs roughly ₹8.2 crore.',
          'A rough shortcut: the corpus should be about 25–30 times your first-year retirement expenses, more if you retire early or expect to live long. The retirement calculator does the exact version.',
        ],
      },
      {
        heading: 'Step 3: the monthly investment',
        paragraphs: [
          'Subtract what your existing savings, EPF and PPF are projected to grow to, and find the monthly SIP that covers the gap. Starting early makes an enormous difference: ₹5,000 a month from age 25 to 60 at 12% grows to about ₹3.2 crore, while the same SIP from 35 reaches only about ₹95 lakh — a third as much, for 30% less invested.',
        ],
      },
      {
        heading: 'Things people forget',
        bullets: [
          'Health costs rise faster than general inflation; keep a separate health fund and adequate health insurance into old age.',
          'Returns after retirement should be conservative — most of the corpus needs to be in stable, lower-risk investments.',
          'Big one-off costs — children’s weddings, home repairs, helping family — should be planned separately.',
          'Taxes on withdrawals and annuity income reduce what you can spend.',
          'Review the plan every year or two and after major life events.',
        ],
      },
      {
        heading: 'Investing the corpus after you retire',
        paragraphs: [
          'A common approach is to divide the corpus into buckets by when the money will be needed:',
        ],
        bullets: [
          'Near-term bucket: 2–3 years of expenses in savings, FDs, Senior Citizens’ Savings Scheme or liquid funds, for regular withdrawals.',
          'Medium-term bucket: 5–7 years of expenses in debt and conservative hybrid funds, refilling the near-term bucket.',
          'Long-term bucket: the rest in a diversified equity allocation, to keep growing ahead of inflation for the later years of retirement.',
        ],
        after: [
          'Each year, move money down the buckets. A systematic withdrawal plan (SWP) from a fund can provide a monthly income from the medium bucket; the SWP calculator shows how long a corpus lasts at a given withdrawal rate.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is ₹1 crore enough to retire in India?',
        a: 'It depends on your expenses and how far away retirement is. ₹1 crore supports roughly ₹30,000–₹35,000 a month of today’s expenses if you retired now; for someone retiring in 20–25 years, inflation means far more is needed. Use the retirement calculator with your own numbers.',
      },
      {
        q: 'Should I count EPF and PPF in my retirement corpus?',
        a: 'Yes. Project their values at retirement and subtract them from the corpus you need; the rest is the gap your other investments must fill.',
      },
      {
        q: 'What inflation rate should I assume?',
        a: 'Many planners use 6% for general expenses and 8%–10% for healthcare. Using a slightly higher rate than you expect builds in a margin of safety.',
      },
    ],
  },
  {
    slug: 'fd-interest-and-tax',
    title: 'How FD interest is calculated and taxed',
    seoTitle: 'How FD Interest Is Calculated & Taxed – TDS, 15G/15H',
    description:
      'How banks compound fixed deposit interest, cumulative vs payout FDs, TDS thresholds, Forms 15G and 15H, tax-saver FDs and deposit insurance.',
    topic: 'Savings',
    updated: '2026-09-26',
    calculators: ['fd', 'rd', 'tds'],
    keyPoints: [
      'Most bank FDs compound interest quarterly: A = P × (1 + r/4)^(4 × years).',
      '₹5 lakh at 7% for 5 years grows to about ₹7.07 lakh — an effective 7.19% a year.',
      'Interest is taxable every year at your slab rate, even on cumulative FDs.',
      'Banks deduct 10% TDS once interest crosses ₹50,000 a year (₹1 lakh for senior citizens).',
    ],
    sections: [
      {
        heading: 'How the interest is calculated',
        paragraphs: [
          'Banks in India compound FD interest every quarter for deposits of six months or more. The maturity amount of a cumulative FD is A = P × (1 + r ÷ 4)^(4 × t), where r is the annual rate (as a decimal) and t the years. Because interest earns interest, the effective yearly yield is slightly higher than the quoted rate: 7% compounded quarterly is about 7.19% a year.',
          'Example: ₹5,00,000 at 7% for 5 years → 5,00,000 × 1.0175²⁰ ≈ ₹7,07,389, of which ₹2,07,389 is interest.',
        ],
      },
      {
        heading: 'Cumulative vs payout FDs',
        paragraphs: [
          'A cumulative FD reinvests interest and pays everything at maturity — best for growing money. A non-cumulative (payout) FD pays interest monthly, quarterly or yearly — useful for regular income, such as for retirees. Monthly payouts are usually slightly lower than the quarterly rate because you receive the money sooner.',
        ],
      },
      {
        heading: 'Tax on FD interest',
        bullets: [
          'FD interest is “income from other sources”, taxed at your slab rate in the year it accrues — even if you receive it only at maturity.',
          'TDS: banks deduct 10% when your interest from that bank crosses ₹50,000 in a year (₹1 lakh for senior citizens), or 20% if the bank does not have your PAN.',
          'If your total income is below the taxable limit, submit Form 15G (below 60) or Form 15H (60 and above) at the start of each year to avoid TDS.',
          'TDS is not the final tax. If your slab is 20% or 30%, you pay the balance when filing; if you owe less, you claim a refund.',
          'Senior citizens can deduct up to ₹50,000 of deposit interest under Section 80TTB in the old regime.',
        ],
      },
      {
        heading: 'Tax-saver FDs',
        paragraphs: [
          'A five-year tax-saving FD qualifies for the Section 80C deduction (up to ₹1.5 lakh, old regime). It cannot be withdrawn early or pledged for a loan, and its interest is still taxable.',
        ],
      },
      {
        heading: 'How safe is an FD?',
        paragraphs: [
          'Deposits in banks — including small finance banks and cooperative banks — are insured by the DICGC up to ₹5 lakh per depositor per bank, covering principal and interest together. Spread larger amounts across banks if you want every rupee covered.',
        ],
      },
      {
        heading: 'Senior citizen FDs',
        paragraphs: [
          'Most banks pay senior citizens (60 and above) an extra 0.25%–0.50% a year, and some pay more on longer tenures. Senior citizens also get a higher TDS threshold (₹1 lakh of interest a year per bank), can submit Form 15H to avoid TDS when their tax liability is nil, and, in the old regime, can deduct up to ₹50,000 of interest under Section 80TTB.',
        ],
      },
      {
        heading: 'FD laddering',
        paragraphs: [
          'Instead of one large FD, split the money into several FDs maturing one after another — for example, five FDs of 1 to 5 years. Each year one matures, giving you access to money and a chance to reinvest at the prevailing rate. Laddering reduces the risk of locking everything in just before rates rise and keeps each deposit within the DICGC cover if spread across banks.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is FD interest taxable if I reinvest it?',
        a: 'Yes. Interest on cumulative FDs is taxable every year as it accrues, even though you receive it only at maturity. Declare it each year to avoid a large mismatch later.',
      },
      {
        q: 'What is the penalty for breaking an FD early?',
        a: 'Typically 0.5%–1% below the rate applicable for the period the deposit actually ran. Tax-saver FDs cannot be broken before five years.',
      },
      {
        q: 'Which is better: monthly or quarterly interest payout?',
        a: 'Quarterly payouts pay the full quoted rate; monthly payouts are slightly lower because you receive the money earlier. For growing money, choose the cumulative option.',
      },
    ],
  },
  {
    slug: 'ppf-explained',
    title: 'PPF explained: rules, interest, withdrawals and extension',
    seoTitle: 'PPF Rules Explained – Interest, Withdrawal, Extension, Tax',
    description:
      'Everything about the Public Provident Fund: deposit limits, how interest is calculated, the 5th-of-the-month rule, partial withdrawals, loans, extension and tax benefits.',
    topic: 'Savings',
    updated: '2026-09-26',
    calculators: ['ppf', 'sukanya-samriddhi', 'epf'],
    keyPoints: [
      'Deposit ₹500 to ₹1.5 lakh a year for 15 years; interest and maturity are tax-free.',
      '₹1.5 lakh a year for 15 years at 7.1% grows to about ₹40.7 lakh.',
      'Deposit before the 5th of the month — interest is paid on the lowest balance between the 5th and month-end.',
      'After 15 years, extend in 5-year blocks, with or without fresh deposits.',
    ],
    sections: [
      {
        heading: 'The basics',
        bullets: [
          'Who: any resident Indian, one account per person (plus accounts for minors as guardian). NRIs cannot open new accounts.',
          'Where: post offices and authorised banks.',
          'Deposits: minimum ₹500 and maximum ₹1,50,000 per financial year, in a lumpsum or instalments.',
          'Tenure: 15 full financial years after the year of opening.',
          'Interest: set by the government every quarter — 7.1% since April 2020 — compounded yearly and credited on 31 March.',
        ],
      },
      {
        heading: 'How the interest is calculated',
        paragraphs: [
          'Interest for each month is calculated on the lowest balance between the 5th day and the end of that month. A deposit made on the 6th earns no interest for that month. For the most interest, deposit the full year’s amount before 5 April.',
          'Example: ₹1,50,000 deposited before 5 April every year for 15 years at 7.1% → about ₹40.7 lakh at maturity, of which about ₹18.2 lakh is interest, all tax-free.',
        ],
      },
      {
        heading: 'Loans and partial withdrawals',
        bullets: [
          'Loan: from the 3rd to the 6th financial year, up to 25% of the balance at the end of the second year before the loan, at 1% above the PPF rate.',
          'Partial withdrawal: once a year from the 7th financial year, up to 50% of the balance at the end of the 4th year before, or of the previous year, whichever is lower.',
          'Premature closure: after 5 years, for specified reasons such as serious illness or higher education, with a 1% interest penalty.',
        ],
      },
      {
        heading: 'Extension after 15 years',
        paragraphs: [
          'On maturity you can withdraw everything, or extend in blocks of five years. With contributions, you must submit the extension form within a year of maturity, and can withdraw up to 60% of the maturity balance over the block. Without contributions, the account keeps earning interest and you can withdraw any amount once a year.',
        ],
      },
      {
        heading: 'Tax benefits',
        paragraphs: [
          'PPF enjoys exempt-exempt-exempt status: deposits qualify for Section 80C in the old regime, and both the interest and the maturity amount are tax-free in either regime. Under the new regime you lose the 80C deduction on deposits, but the tax-free interest remains.',
        ],
      },
      {
        heading: 'What different deposits grow to',
        table: {
          caption: 'At 7.1% a year, deposited before 5 April each year',
          columns: ['Yearly deposit', 'Period', 'Maturity value'],
          rows: [
            ['₹50,000', '15 years', '≈ ₹13.6 lakh'],
            ['₹1,50,000', '15 years', '≈ ₹40.7 lakh'],
            ['₹1,50,000', '20 years (one extension)', '≈ ₹66.6 lakh'],
            ['₹1,50,000', '25 years (two extensions)', '≈ ₹1.03 crore'],
          ],
        },
        after: [
          'Extending without further deposits also keeps the balance growing: ₹40.7 lakh left for five more years at 7.1% becomes about ₹57.3 lakh, all tax-free.',
        ],
      },
      {
        heading: 'PPF for children',
        paragraphs: [
          'A parent or guardian can open a PPF account for a minor child. Deposits in the child’s account count within the parent’s own ₹1.5 lakh yearly limit, not in addition to it. The account transfers to the child at 18. For a daughter under 10, compare it with the Sukanya Samriddhi Yojana, which usually pays a higher rate.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What happens if I miss a PPF deposit?',
        a: 'If you deposit less than ₹500 in a financial year, the account becomes inactive. You can revive it by paying ₹50 for each missed year plus the ₹500 minimum for each of those years.',
      },
      {
        q: 'Can I open more than one PPF account?',
        a: 'No. One individual can have only one PPF account (plus accounts opened as guardian for minors). A second account is treated as irregular and earns no interest.',
      },
      {
        q: 'Is PPF interest taxable?',
        a: 'No. PPF interest and the maturity amount are fully tax-free under both tax regimes.',
      },
    ],
  },
];
