import type { IconName } from '@/components/Icon';

/**
 * The single registry of everything the app offers.
 *
 * Adding a calculator = one entry here + one module in src/calculators/**.
 * Navigation, dashboard, search, SEO metadata and routing all read from
 * this list, so nothing else has to change.
 */

export type CategoryId =
  | 'investment'
  | 'savings'
  | 'loans'
  | 'tax'
  | 'dates'
  | 'business'
  | 'everyday';

export interface Category {
  id: CategoryId;
  title: string;
  short: string;
  icon: IconName;
}

export interface CalculatorMeta {
  id: string;
  name: string;
  /** Sidebar/tile label when the full name is long. */
  shortName?: string;
  tagline: string;
  category: CategoryId;
  icon: IconName;
  keywords: string[];
  popular?: boolean;
  /** Position in the "most used" list. Lower is higher up; 1-10 are shown. */
  popularRank?: number;
  /** Recently added — earns a "New" badge on tiles and in the menu. */
  isNew?: boolean;
  /**
   * Hand-picked next steps shown under the calculator. Anything not listed
   * is filled from the same category, so this can stay short.
   */
  related?: string[];
  seoTitle: string;
  seoDescription: string;
}

export const CATEGORIES: Category[] = [
  { id: 'investment', title: 'Investment & Retirement', short: 'Investment', icon: 'trending' },
  { id: 'savings', title: 'Savings & Deposits', short: 'Savings', icon: 'piggy' },
  { id: 'loans', title: 'Loans', short: 'Loans', icon: 'bank' },
  { id: 'tax', title: 'Tax & Salary', short: 'Tax & Salary', icon: 'receipt' },
  { id: 'dates', title: 'Date & Age', short: 'Date & Age', icon: 'calendar' },
  { id: 'business', title: 'Business & General', short: 'Business', icon: 'briefcase' },
  { id: 'everyday', title: 'Everyday', short: 'Everyday', icon: 'sparkle' },
];

export const CALCULATORS: CalculatorMeta[] = [
  /* ---------------- Investment & Retirement ---------------- */
  {
    id: 'epf',
    popular: true,
    popularRank: 4,
    name: 'EPF Calculator',
    tagline: 'Project your provident fund corpus at retirement',
    category: 'investment',
    icon: 'vault',
    keywords: ['epf', 'pf', 'provident fund', 'employee provident fund', 'retirement', 'uan', 'epfo'],
    seoTitle: 'EPF Calculator – Calculate Your Estimated EPF Corpus',
    seoDescription:
      'Free EPF calculator with year-wise projection. Estimate your Employees Provident Fund corpus at retirement from your basic + DA, employee and employer contribution and the 8.25% EPF interest rate.',
  },
  {
    id: 'nps',
    name: 'NPS Calculator',
    tagline: 'Retirement corpus, lump sum and monthly pension',
    category: 'investment',
    icon: 'umbrella',
    keywords: ['nps', 'national pension', 'pension', 'annuity', 'tier 1', 'retirement'],
    seoTitle: 'NPS Calculator – Pension & Retirement Corpus Estimator',
    seoDescription:
      'Estimate your National Pension System corpus, the 60% lump sum, annuity purchase amount and your monthly pension, with a year-wise projection and charts.',
  },
  {
    id: 'ppf',
    popular: true,
    popularRank: 9,
    name: 'PPF Calculator',
    tagline: '15-year Public Provident Fund maturity value',
    category: 'savings',
    icon: 'landmark',
    keywords: ['ppf', 'public provident fund', 'tax free', '80c', 'small savings'],
    seoTitle: 'PPF Calculator – Public Provident Fund Maturity Value',
    seoDescription:
      'Calculate PPF maturity amount and year-wise interest for a 15-year account, including extensions in 5-year blocks, at the current PPF interest rate.',
  },
  {
    id: 'mutual-fund',
    popular: true,
    popularRank: 3,
    name: 'Mutual Fund Returns Calculator',
    shortName: 'Mutual Fund / SIP',
    tagline: 'SIP or lumpsum — maturity value, returns and CAGR',
    category: 'investment',
    icon: 'trending',
    keywords: [
      'mutual fund',
      'sip',
      'systematic investment plan',
      'lumpsum',
      'monthly investment',
      'step up',
      'cagr',
      'absolute return',
      'nav',
      'equity',
    ],
    seoTitle: 'Mutual Fund Calculator – SIP & Lumpsum Returns, CAGR',
    seoDescription:
      'Calculate mutual fund returns for a monthly SIP or a one-time lumpsum: maturity value, invested amount, estimated returns, CAGR and a year-wise growth chart.',
  },
  {
    id: 'fd',
    popular: true,
    popularRank: 7,
    name: 'FD Calculator',
    tagline: 'Fixed deposit maturity with compounding options',
    category: 'savings',
    icon: 'lock',
    keywords: ['fd', 'fixed deposit', 'term deposit', 'interest', 'quarterly compounding', 'tds'],
    seoTitle: 'FD Calculator – Fixed Deposit Maturity & Interest',
    seoDescription:
      'Calculate fixed deposit maturity amount and interest earned with monthly, quarterly, half-yearly or yearly compounding, plus post-tax returns.',
  },
  {
    id: 'retirement',
    name: 'Retirement Planning Calculator',
    shortName: 'Retirement Planning',
    tagline: 'How much you need, and whether you are on track',
    category: 'investment',
    icon: 'palm',
    keywords: ['retirement', 'corpus', 'fire', 'planning', 'shortfall', 'expenses'],
    seoTitle: 'Retirement Planning Calculator – Corpus You Need',
    seoDescription:
      'Find the retirement corpus your expenses will need after inflation, compare it with your projected savings and see the monthly investment required to close the gap.',
  },
  {
    id: 'inflation',
    name: 'Inflation Calculator',
    tagline: 'What today’s money will be worth later',
    category: 'investment',
    icon: 'arrowUpRight',
    keywords: ['inflation', 'purchasing power', 'cost of living', 'future value', 'real return'],
    seoTitle: 'Inflation Calculator – Future Value & Purchasing Power',
    seoDescription:
      'See what an amount today will cost in future at a given inflation rate, how much purchasing power it loses, and the real value of your money.',
  },

  {
    id: 'swp',
    name: 'SWP Calculator',
    shortName: 'SWP',
    tagline: 'Draw a monthly income from your corpus',
    category: 'investment',
    icon: 'arrowDownCircle',
    keywords: ['swp', 'systematic withdrawal plan', 'withdrawal', 'retirement income', 'monthly income', 'drawdown'],
    seoTitle: 'SWP Calculator – Systematic Withdrawal Plan Returns',
    seoDescription:
      'Calculate how long your mutual fund corpus lasts under a systematic withdrawal plan, the monthly income it can sustain, and the balance left at the end.',
  },
  {
    id: 'sukanya-samriddhi',
    name: 'Sukanya Samriddhi Yojana Calculator',
    shortName: 'Sukanya Samriddhi',
    tagline: 'Maturity value of a girl child savings account',
    category: 'savings',
    icon: 'piggy',
    keywords: ['sukanya samriddhi', 'ssy', 'girl child', 'small savings', '80c', 'post office', 'yojana'],
    seoTitle: 'Sukanya Samriddhi Yojana Calculator – SSY Maturity Value',
    seoDescription:
      'Calculate the maturity amount of a Sukanya Samriddhi account at the current 8.2% rate, with a year-wise statement across the full 21-year term.',
  },
  {
    id: 'rd',
    isNew: true,
    name: 'RD Calculator',
    tagline: 'Recurring deposit maturity with quarterly compounding',
    category: 'savings',
    icon: 'repeat',
    related: ['fd', 'post-office', 'mutual-fund'],
    keywords: ['rd', 'recurring deposit', 'monthly deposit', 'post office rd', 'bank rd', 'savings', 'maturity'],
    seoTitle: 'RD Calculator – Recurring Deposit Maturity & Interest',
    seoDescription:
      'Calculate recurring deposit maturity value and interest for bank and Post Office RDs, compounded quarterly, with a year-wise growth table.',
  },
  {
    id: 'post-office',
    isNew: true,
    name: 'Post Office Savings Calculator',
    shortName: 'Post Office Schemes',
    tagline: 'NSC, KVP, MIS, SCSS and Time Deposit returns',
    category: 'savings',
    icon: 'mail',
    related: ['ppf', 'sukanya-samriddhi', 'rd'],
    keywords: ['post office', 'nsc', 'kvp', 'kisan vikas patra', 'mis', 'monthly income scheme', 'scss', 'senior citizen', 'time deposit', 'small savings', 'india post'],
    seoTitle: 'Post Office Savings Calculator – NSC, KVP, MIS, SCSS & TD',
    seoDescription:
      'Calculate returns on Post Office schemes: NSC and KVP maturity, MIS monthly income, SCSS quarterly interest and Time Deposit payouts at current small savings rates.',
  },
  {
    id: 'simple-interest',
    isNew: true,
    name: 'Simple Interest Calculator',
    shortName: 'Simple Interest',
    tagline: 'Interest on principal, with a compounding comparison',
    category: 'savings',
    icon: 'percent',
    related: ['compound-interest', 'flat-vs-reducing', 'fd'],
    keywords: ['simple interest', 'si', 'interest', 'principal', 'rate', 'time', 'p r t', 'loan interest'],
    seoTitle: 'Simple Interest Calculator – SI Formula, Interest & Amount',
    seoDescription:
      'Calculate simple interest and the total amount for any principal, rate and period in years, months or days — and see how much compounding would have earned instead.',
  },
  {
    id: 'compound-interest',
    name: 'Compound Interest Calculator',
    shortName: 'Compound Interest',
    tagline: 'Growth with any compounding frequency',
    category: 'savings',
    icon: 'refresh',
    keywords: ['compound interest', 'ci', 'compounding', 'effective rate', 'interest', 'rule of 72'],
    seoTitle: 'Compound Interest Calculator – Maturity Value & Effective Rate',
    seoDescription:
      'Calculate compound interest with yearly, half-yearly, quarterly, monthly or daily compounding, with optional monthly contributions and the effective annual rate.',
  },
  {
    id: 'net-worth',
    name: 'Net Worth Calculator',
    shortName: 'Net Worth',
    tagline: 'What you own less what you owe',
    category: 'investment',
    icon: 'scale',
    keywords: ['net worth', 'assets', 'liabilities', 'wealth', 'balance sheet', 'personal finance'],
    seoTitle: 'Net Worth Calculator – Assets, Liabilities & Wealth',
    seoDescription:
      'Work out your personal net worth from assets and liabilities, with liquid net worth, debt-to-asset ratio and an emergency fund check.',
  },
  {
    id: 'goal-sip',
    isNew: true,
    name: 'Goal SIP Calculator',
    shortName: 'Goal SIP Planner',
    tagline: 'Monthly SIP needed to reach any goal',
    category: 'investment',
    icon: 'flag',
    related: ['mutual-fund', 'inflation', 'retirement'],
    keywords: ['goal', 'target', 'sip', 'how much to invest', 'education', 'child', 'house', '1 crore', 'planner', 'required sip'],
    seoTitle: 'Goal SIP Calculator – Monthly SIP Needed for Your Goal',
    seoDescription:
      'Find the monthly SIP or one-time lumpsum you need to reach a financial goal, with inflation on the goal cost, existing savings and an optional annual step-up.',
  },
  {
    id: 'cagr',
    isNew: true,
    name: 'CAGR Calculator',
    tagline: 'Compound annual growth rate of any investment',
    category: 'investment',
    icon: 'arrowUpRight',
    related: ['roi', 'mutual-fund', 'inflation'],
    keywords: ['cagr', 'compound annual growth rate', 'annualised return', 'growth rate', 'returns', 'doubling', 'rule of 72'],
    seoTitle: 'CAGR Calculator – Compound Annual Growth Rate',
    seoDescription:
      'Calculate the CAGR of an investment from its start and end value, or project a future value at a given CAGR — with absolute return, doubling time and real, after-inflation growth.',
  },
  {
    id: 'stock-average',
    isNew: true,
    name: 'Stock Average Calculator',
    shortName: 'Stock Average',
    tagline: 'Average buy price and shares to average down',
    category: 'investment',
    icon: 'layers',
    related: ['capital-gains', 'cagr', 'roi'],
    keywords: ['stock average', 'average price', 'average down', 'shares', 'equity', 'buy price', 'cost basis', 'demat'],
    seoTitle: 'Stock Average Calculator – Average Share Price & Averaging Down',
    seoDescription:
      'Work out the average buy price across multiple share purchases, your profit or loss at today’s price, and how many shares to buy to reach a target average.',
  },
  /* ---------------- Loans ---------------- */
  {
    id: 'emi',
    popular: true,
    popularRank: 1,
    name: 'EMI Calculator',
    tagline: 'Monthly instalment, interest and amortisation',
    category: 'loans',
    icon: 'bank',
    keywords: [
      'emi',
      'loan',
      'home loan',
      'car loan',
      'personal loan',
      'education loan',
      'bike loan',
      'instalment',
      'interest',
      'amortisation',
      'repayment',
      'borrow',
    ],
    related: ['loan-prepayment', 'loan-eligibility', 'flat-vs-reducing'],
    seoTitle: 'EMI Calculator – Monthly Loan Instalment & Interest',
    seoDescription:
      'Calculate your loan EMI, total interest and total repayment, with a full month-wise amortisation schedule and principal vs interest charts.',
  },

  {
    id: 'loan-prepayment',
    name: 'Loan Prepayment Calculator',
    shortName: 'Loan Prepayment',
    tagline: 'Interest saved by paying off early',
    category: 'loans',
    icon: 'arrowDownCircle',
    keywords: ['prepayment', 'part payment', 'foreclosure', 'loan', 'interest saved', 'reduce tenure', 'reduce emi'],
    seoTitle: 'Loan Prepayment Calculator – Interest & Tenure Saved',
    seoDescription:
      'See how much interest a home loan prepayment saves, whether to reduce the tenure or the EMI, and the effective return on the amount you prepay.',
  },
  {
    id: 'loan-eligibility',
    name: 'Loan Eligibility Calculator',
    shortName: 'Loan Eligibility',
    tagline: 'How much a lender will actually give you',
    category: 'loans',
    icon: 'shield',
    keywords: ['loan eligibility', 'home loan', 'foir', 'ltv', 'borrowing capacity', 'sanction', 'down payment'],
    seoTitle: 'Loan Eligibility Calculator – How Much Can I Borrow?',
    seoDescription:
      'Find the home or personal loan amount you qualify for from your income, existing EMIs, FOIR and the property loan-to-value cap.',
  },
  {
    id: 'flat-vs-reducing',
    isNew: true,
    name: 'Flat vs Reducing Rate Calculator',
    shortName: 'Flat vs Reducing Rate',
    tagline: 'The true interest rate behind a flat-rate loan',
    category: 'loans',
    icon: 'scale',
    related: ['emi', 'loan-prepayment', 'simple-interest'],
    keywords: ['flat rate', 'reducing rate', 'reducing balance', 'effective interest rate', 'car loan', 'personal loan', 'apr', 'convert'],
    seoTitle: 'Flat vs Reducing Rate Calculator – Effective Interest Rate',
    seoDescription:
      'Convert a flat interest rate to the equivalent reducing-balance rate, compare EMIs and total interest, and see how much a flat-rate loan really costs.',
  },
  /* ---------------- Tax & Salary ---------------- */
  {
    id: 'income-tax',
    popular: true,
    popularRank: 2,
    name: 'Income Tax Calculator',
    tagline: 'Old vs new regime, slab-wise tax liability',
    category: 'tax',
    icon: 'receipt',
    keywords: ['income tax', 'tax', 'old regime', 'new regime', '80c', '80d', 'slab', 'itr', 'rebate'],
    seoTitle: 'Income Tax Calculator FY 2026-27 – Old vs New Regime',
    seoDescription:
      'Calculate your income tax under the old and new regime for FY 2026-27 and FY 2025-26, with deductions, rebate, surcharge, cess and a side-by-side comparison.',
  },
  {
    id: 'salary',
    popular: true,
    popularRank: 5,
    name: 'Salary Calculator',
    tagline: 'Gross to net pay with statutory deductions',
    category: 'tax',
    icon: 'wallet',
    keywords: ['salary', 'net pay', 'take home', 'gross', 'deductions', 'monthly salary'],
    seoTitle: 'Salary Calculator – Gross to Net Monthly Pay',
    seoDescription:
      'Break a monthly salary into basic, HRA and allowances, subtract PF, professional tax and income tax, and see your net take-home pay.',
  },
  {
    id: 'ctc-in-hand',
    name: 'CTC to In-Hand Salary Calculator',
    shortName: 'CTC to In-Hand',
    tagline: 'What your annual CTC really pays you',
    category: 'tax',
    icon: 'briefcase',
    keywords: ['ctc', 'in hand', 'take home', 'offer', 'package', 'gratuity', 'pf', 'salary'],
    seoTitle: 'CTC to In-Hand Salary Calculator – Monthly Take Home',
    seoDescription:
      'Convert annual CTC into monthly in-hand salary. Splits basic, HRA and allowances, removes employer PF and gratuity, and applies PF, professional tax and income tax.',
  },
  {
    id: 'gratuity',
    name: 'Gratuity Calculator',
    tagline: 'Payable gratuity under the Gratuity Act',
    category: 'tax',
    icon: 'award',
    keywords: ['gratuity', 'payment of gratuity act', 'salary', 'exit', 'resignation', 'tenure', '15/26'],
    seoTitle: 'Gratuity Calculator – Amount Payable on Exit',
    seoDescription:
      'Calculate gratuity using the statutory 15/26 formula on last drawn basic + DA, including the ₹20 lakh exemption cap and eligibility rules.',
  },
  {
    id: 'salary-increment',
    name: 'Salary Increment Calculator',
    shortName: 'Salary Increment',
    tagline: 'New salary after a hike, and multi-year growth',
    category: 'tax',
    icon: 'barChart',
    keywords: ['increment', 'hike', 'appraisal', 'raise', 'percentage increase', 'salary growth'],
    seoTitle: 'Salary Increment Calculator – Hike Percentage & New Salary',
    seoDescription:
      'Calculate your salary after an increment, the hike amount, and project your salary over the next several years at a given annual increment rate.',
  },
  {
    id: 'leave-encashment',
    name: 'Leave Encashment Calculator',
    shortName: 'Leave Encashment',
    tagline: 'Value of unused leave at exit',
    category: 'tax',
    icon: 'calendarCheck',
    keywords: ['leave encashment', 'earned leave', 'salary', 'pl', 'unused leave', 'exit', 'exemption'],
    seoTitle: 'Leave Encashment Calculator – Payout for Unused Leave',
    seoDescription:
      'Calculate leave encashment on accumulated earned leave from your last drawn basic + DA, with the taxable and exempt split for non-government employees.',
  },

  {
    id: 'hra-exemption',
    name: 'HRA Exemption Calculator',
    shortName: 'HRA Exemption',
    tagline: 'How much of your HRA escapes tax',
    category: 'tax',
    icon: 'home',
    popular: true,
    popularRank: 8,
    keywords: ['hra', 'house rent allowance', 'exemption', '10(13a)', 'rent', 'metro', 'rule 2a', 'salary'],
    seoTitle: 'HRA Exemption Calculator – House Rent Allowance Tax Saving',
    seoDescription:
      'Calculate your HRA exemption under section 10(13A) from basic salary, HRA received and rent paid, with the three statutory limits shown side by side.',
  },
  {
    id: 'tds',
    name: 'TDS Calculator',
    tagline: 'Tax to deduct at source, section by section',
    category: 'tax',
    icon: 'clipboard',
    keywords: ['tds', 'tax deducted at source', '194c', '194j', '194i', '206aa', 'contractor', 'professional fees'],
    seoTitle: 'TDS Calculator – Rates, Thresholds & Deduction by Section',
    seoDescription:
      'Calculate TDS on contractor payments, professional fees, rent, commission and interest, with the correct rate, threshold and the 20% no-PAN rule.',
  },
  {
    id: 'capital-gains',
    name: 'Capital Gains Tax Calculator',
    shortName: 'Capital Gains Tax',
    tagline: 'Tax on shares, property, gold and funds',
    category: 'tax',
    icon: 'trendingDown',
    keywords: ['capital gains', 'ltcg', 'stcg', 'shares', 'property', 'gold', 'indexation', 'equity'],
    seoTitle: 'Capital Gains Tax Calculator – LTCG & STCG After Budget 2024',
    seoDescription:
      'Calculate long-term and short-term capital gains tax on equity, property, gold and debt funds under the rules effective from 23 July 2024.',
  },
  /* ---------------- Date & Age ---------------- */
  {
    id: 'age',
    popular: true,
    popularRank: 10,
    name: 'Age Calculator',
    tagline: 'Exact age in years, months and days',
    category: 'dates',
    icon: 'user',
    keywords: ['age', 'date of birth', 'dob', 'birthday', 'how old', 'years months days'],
    seoTitle: 'Age Calculator – Your Exact Age in Years, Months & Days',
    seoDescription:
      'Find your exact age from your date of birth — years, months and days, total weeks and days lived, plus a countdown to your next birthday.',
  },
  {
    id: 'date-difference',
    name: 'Date Difference Calculator',
    shortName: 'Date Difference',
    tagline: 'Days, weeks and months between two dates',
    category: 'dates',
    icon: 'calendar',
    keywords: ['date difference', 'days between', 'duration', 'weeks', 'months', 'gap'],
    seoTitle: 'Date Difference Calculator – Days Between Two Dates',
    seoDescription:
      'Calculate the exact difference between two dates in years, months and days, plus the total days, weeks, hours and weekdays in between.',
  },

  /* ---------------- Business & General ---------------- */
  {
    id: 'gst',
    popular: true,
    popularRank: 6,
    name: 'GST Calculator',
    tagline: 'Add or remove GST, with CGST/SGST split',
    category: 'business',
    icon: 'receiptTax',
    keywords: ['gst', 'tax', 'cgst', 'sgst', 'igst', 'inclusive', 'exclusive', 'invoice'],
    seoTitle: 'GST Calculator – Add or Remove GST from a Price',
    seoDescription:
      'Calculate GST on any amount at 0%, 5%, 12%, 18%, 28% or 40%. Add GST to a base price or extract GST from an inclusive price, with the CGST/SGST split.',
  },
  {
    id: 'roi',
    name: 'ROI Calculator',
    tagline: 'Return on investment and annualised return',
    category: 'business',
    icon: 'target',
    keywords: ['roi', 'return on investment', 'gain', 'profit', 'annualised', 'cagr'],
    seoTitle: 'ROI Calculator – Return on Investment & Annualised Return',
    seoDescription:
      'Calculate return on investment from the amount invested and its current value, including net gain, ROI percentage and annualised return.',
  },
  {
    id: 'percentage',
    name: 'Percentage Calculator',
    tagline: 'Five everyday percentage operations',
    category: 'business',
    icon: 'percent',
    keywords: ['percentage', 'percent', 'increase', 'decrease', 'of', 'change', 'what percent'],
    seoTitle: 'Percentage Calculator – Percent Of, Change & More',
    seoDescription:
      'Five percentage calculations in one place: X% of a number, what percent one number is of another, percentage change, increase and decrease.',
  },
  {
    id: 'markup',
    name: 'Markup Calculator',
    tagline: 'Cost, selling price, markup and margin',
    category: 'business',
    icon: 'tag',
    keywords: ['markup', 'margin', 'selling price', 'cost price', 'profit', 'pricing'],
    seoTitle: 'Markup Calculator – Selling Price, Markup & Margin',
    seoDescription:
      'Work out selling price from cost and markup, or derive markup and gross margin from cost and selling price, with the profit per unit.',
  },
  {
    id: 'commission',
    name: 'Commission Calculator',
    tagline: 'Commission earned and net payout',
    category: 'business',
    icon: 'handshake',
    keywords: ['commission', 'brokerage', 'sales', 'agent', 'payout', 'incentive'],
    seoTitle: 'Commission Calculator – Sales Commission & Net Payout',
    seoDescription:
      'Calculate flat or tiered sales commission on a sale value, including split commission and the net amount left after commission.',
  },

  {
    id: 'profit-margin',
    name: 'Profit Margin Calculator',
    shortName: 'Profit Margin',
    tagline: 'Gross, operating and net margin in one view',
    category: 'business',
    icon: 'barChart',
    keywords: ['profit margin', 'gross margin', 'net margin', 'operating margin', 'markup', 'ebit', 'profitability'],
    seoTitle: 'Profit Margin Calculator – Gross, Operating & Net Margin',
    seoDescription:
      'Calculate gross, operating and net profit margin from revenue, cost of goods sold and operating expenses, with the markup-versus-margin comparison.',
  },
  {
    id: 'break-even',
    name: 'Break-Even Calculator',
    shortName: 'Break-Even',
    tagline: 'Units you must sell to cover costs',
    category: 'business',
    icon: 'gauge',
    keywords: ['break even', 'bep', 'contribution margin', 'fixed cost', 'variable cost', 'margin of safety'],
    seoTitle: 'Break-Even Calculator – Break-Even Point in Units & Revenue',
    seoDescription:
      'Find your break-even point in units and revenue from fixed costs, selling price and variable cost, with contribution margin and margin of safety.',
  },
  {
    id: 'depreciation',
    name: 'Depreciation Calculator',
    tagline: 'Straight line, WDV and double declining',
    category: 'business',
    icon: 'trendingDown',
    keywords: ['depreciation', 'slm', 'wdv', 'written down value', 'book value', 'asset', 'schedule ii'],
    seoTitle: 'Depreciation Calculator – SLM, WDV & Double Declining',
    seoDescription:
      'Calculate depreciation by straight line, written down value or double declining balance, with a full year-wise schedule and closing book value.',
  },
  {
    id: 'discount',
    isNew: true,
    name: 'Discount Calculator',
    tagline: 'Sale price, savings and stacked discounts',
    category: 'business',
    icon: 'tag',
    related: ['percentage', 'gst', 'markup'],
    keywords: ['discount', 'sale', 'offer', 'percent off', 'price after discount', 'coupon', 'mrp', 'extra off'],
    seoTitle: 'Discount Calculator – Sale Price & Amount Saved',
    seoDescription:
      'Calculate the price after a percentage or flat discount, stacked offers like 30% + 10% extra, and GST on the discounted price.',
  },
  /* ---------------- Everyday ---------------- */
  {
    id: 'bmi',
    name: 'BMI Calculator',
    tagline: 'Body mass index and healthy weight range',
    category: 'everyday',
    icon: 'activity',
    keywords: ['bmi', 'body mass index', 'weight', 'height', 'healthy range', 'obesity'],
    seoTitle: 'BMI Calculator – Body Mass Index & Healthy Weight Range',
    seoDescription:
      'Calculate BMI from height and weight in metric or imperial units, see your category on the WHO and Asian-Indian scales, and your healthy weight range.',
  },
  {
    id: 'currency',
    name: 'Currency Calculator',
    tagline: 'Convert between currencies at your own rate',
    category: 'everyday',
    icon: 'coins',
    keywords: ['currency', 'exchange', 'forex', 'convert', 'usd', 'inr', 'eur', 'rate'],
    seoTitle: 'Currency Calculator – Convert With Your Own Exchange Rate',
    seoDescription:
      'Convert between currencies using a rate you enter, with optional forex markup and fees, so the converted figure matches what your bank actually charges.',
  },
  {
    id: 'construction-material',
    name: 'Construction Material Calculator',
    shortName: 'Construction Material',
    tagline: 'Cement, sand, steel and bricks for your build',
    category: 'everyday',
    icon: 'hammer',
    keywords: ['construction', 'material', 'cement', 'sand', 'steel', 'bricks', 'aggregate', 'house building', 'brass'],
    seoTitle: 'Construction Material Calculator – Cement, Sand, Steel & Bricks',
    seoDescription:
      'Estimate cement bags, sand, aggregate, steel and bricks needed for a house from the built-up area, with a costed bill of materials.',
  },
  {
    id: 'electrical-load',
    name: 'Electrical Load Calculator',
    shortName: 'Electrical Load',
    tagline: 'Connection size, units and monthly bill',
    category: 'everyday',
    icon: 'zap',
    keywords: ['electrical load', 'connected load', 'kva', 'sanctioned load', 'electricity bill', 'inverter', 'mcb', 'units'],
    seoTitle: 'Electrical Load Calculator – Connected Load, kVA & Bill',
    seoDescription:
      'Work out your home connected load, the kVA connection to sanction, monthly units and electricity bill, plus inverter and battery sizing.',
  },
];

/**
 * Ids that no longer have their own page. SIP folded into the mutual fund
 * calculator when the two became one screen with a SIP/Lumpsum switch;
 * old links and bookmarks still have to land somewhere sensible.
 */
export const ALIASES: Record<string, string> = {
  sip: 'mutual-fund',
  lumpsum: 'mutual-fund?mode=lumpsum',
  'home-loan': 'emi',
  'car-loan': 'emi',
  'personal-loan': 'emi',
  'recurring-deposit': 'rd',
  nsc: 'post-office?scheme=nsc',
  kvp: 'post-office?scheme=kvp',
  mis: 'post-office?scheme=mis',
  scss: 'post-office?scheme=scss',
  'time-deposit': 'post-office?scheme=td5',
};

export const byId = (id: string): CalculatorMeta | undefined =>
  CALCULATORS.find((c) => c.id === id);

export const byCategory = (cat: CategoryId): CalculatorMeta[] =>
  CALCULATORS.filter((c) => c.category === cat);

/**
 * The ten most-used calculators, ordered by how often people actually reach
 * for them rather than by their position in the list above.
 */
export const POPULAR: CalculatorMeta[] = CALCULATORS.filter((c) => c.popular)
  .slice()
  .sort((a, b) => (a.popularRank ?? 99) - (b.popularRank ?? 99))
  .slice(0, 10);

export const POPULAR_IDS = POPULAR.map((c) => c.id);

export const displayName = (c: CalculatorMeta): string => c.shortName ?? c.name;

/** Up to `limit` calculators to suggest next: hand-picked first, then the same category. */
export function relatedTo(meta: CalculatorMeta, limit = 4): CalculatorMeta[] {
  const picked = (meta.related ?? [])
    .map(byId)
    .filter((c): c is CalculatorMeta => !!c && c.id !== meta.id);
  const sameCategory = CALCULATORS.filter(
    (c) => c.category === meta.category && c.id !== meta.id && !picked.includes(c),
  ).sort((a, b) => (a.popularRank ?? 99) - (b.popularRank ?? 99));
  return [...picked, ...sameCategory].slice(0, limit);
}

/** Ranked fuzzy-ish search over name, tagline, keywords and category. */
export function searchCalculators(query: string): CalculatorMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);

  const scored = CALCULATORS.map((c) => {
    const name = c.name.toLowerCase();
    const hay = `${name} ${c.tagline.toLowerCase()} ${c.keywords.join(' ')} ${c.category}`;
    let score = 0;
    for (const t of terms) {
      if (name.startsWith(t)) score += 12;
      else if (name.includes(t)) score += 8;
      if (c.keywords.some((k) => k === t)) score += 10;
      else if (c.keywords.some((k) => k.startsWith(t))) score += 6;
      else if (hay.includes(t)) score += 3;
      else score -= 20;
    }
    if (c.popular) score += 1;
    return { c, score };
  }).filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.c);
}
