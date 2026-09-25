import type { CalculatorDef, Values } from '../types';
import { calculateSalary, type SalaryResult } from '@/engines/salary';
import { DEFAULT_FY, FINANCIAL_YEARS, type RegimeId } from '@/data/taxRules';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  monthlyGross: num(v.monthlyGross),
  basicPct: num(v.basicPct),
  hraPct: num(v.hraPct),
  pfOnCeiling: str(v.pfBasis, 'basic') === 'ceiling',
  professionalTaxMonthly: num(v.professionalTax),
  otherDeductionsMonthly: num(v.otherDeductions),
  regime: str(v.regime, 'new') as RegimeId,
  fyId: str(v.financialYear, DEFAULT_FY.id),
});

const salary: CalculatorDef<SalaryResult> = {
  id: 'salary',

  groups: [
    { id: 'structure', title: 'Salary structure' },
    { id: 'deductions', title: 'Deductions' },
  ],

  fields: [
    {
      name: 'monthlyGross',
      label: 'Monthly Gross Salary',
      type: 'currency',
      default: 100000,
      min: 1000,
      max: 10000000,
      slider: true,
      step: 5000,
      help: 'Your total monthly salary before any deduction.',
    },
    {
      name: 'basicPct',
      label: 'Basic as % of Gross',
      type: 'percent',
      default: 40,
      min: 10,
      max: 100,
      step: 1,
      slider: true,
      group: 'structure',
      help: 'Most Indian employers set basic at 40–50% of gross. It drives PF and gratuity.',
    },
    {
      name: 'hraPct',
      label: 'HRA as % of Basic',
      type: 'percent',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      slider: true,
      group: 'structure',
      help: '50% of basic in metros, 40% elsewhere, is the usual structure.',
    },
    {
      name: 'pfBasis',
      label: 'PF is calculated on',
      type: 'segmented',
      default: 'basic',
      group: 'deductions',
      options: [
        { label: 'Full basic', value: 'basic' },
        { label: '₹15,000 ceiling', value: 'ceiling' },
      ],
      help: 'Many employers restrict PF to the statutory ₹15,000 wage ceiling, making the deduction ₹1,800 a month.',
    },
    {
      name: 'professionalTax',
      label: 'Professional Tax (monthly)',
      type: 'currency',
      default: 200,
      min: 0,
      max: 2500,
      group: 'deductions',
      help: 'A state levy, capped at ₹2,500 a year. Not applicable in Delhi, Haryana, UP and some other states.',
    },
    {
      name: 'otherDeductions',
      label: 'Other Deductions (monthly)',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000,
      optional: true,
      group: 'deductions',
      help: 'Insurance premium, canteen, loan recovery — anything else your payslip deducts.',
    },
    {
      name: 'regime',
      label: 'Tax Regime',
      type: 'segmented',
      default: 'new',
      group: 'deductions',
      options: [
        { label: 'New Regime', value: 'new' },
        { label: 'Old Regime', value: 'old' },
      ],
    },
    {
      name: 'financialYear',
      label: 'Financial Year',
      type: 'select',
      default: DEFAULT_FY.id,
      group: 'deductions',
      options: FINANCIAL_YEARS.map((f) => ({ label: f.label, value: f.id })),
    },
  ],

  compute: (v) => calculateSalary(toInput(v)),

  hero: (r) => [
    {
      label: 'Monthly take-home salary',
      value: formatINR(r.monthlyNet),
      caption: `${formatPercent(r.takeHomePct, 1)} of your gross salary`,
    },
    {
      label: 'Annual take-home',
      value: formatINR(r.annualNet),
      caption: `Gross ${formatINR(r.annualGross)} a year`,
    },
  ],

  stats: (r) => [
    { label: 'Basic salary', value: formatINR(r.basic) },
    { label: 'HRA', value: formatINR(r.hra) },
    { label: 'Special allowance', value: formatINR(r.specialAllowance) },
    { label: 'Employee PF', value: formatINR(r.employeePF), tone: 'negative' },
    { label: 'Professional tax', value: formatINR(r.professionalTax), tone: 'negative' },
    { label: 'Income tax (TDS)', value: formatINR(r.monthlyIncomeTax), tone: 'negative' },
    { label: 'Total deductions', value: formatINR(r.totalMonthlyDeductions), tone: 'negative' },
    { label: 'Employer PF', value: formatINR(r.employerPF), help: 'Paid by your employer into your EPF — not deducted from your salary.' },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Where your monthly salary goes',
      centerLabel: 'Gross',
      data: [
        { label: 'Take-home', value: Math.max(0, r.monthlyNet) },
        { label: 'Income tax', value: r.monthlyIncomeTax },
        { label: 'Provident fund', value: r.employeePF },
        { label: 'Professional tax & other', value: r.professionalTax + r.otherDeductions },
      ],
    },
    {
      kind: 'donut' as const,
      title: 'Salary structure',
      centerLabel: 'Gross',
      data: [
        { label: 'Basic', value: r.basic },
        { label: 'HRA', value: r.hra },
        { label: 'Special allowance', value: r.specialAllowance },
      ],
    },
  ],

  table: (r) => ({
    title: 'Monthly payslip breakdown',
    csvName: 'finora-salary-breakdown',
    columns: [
      { key: 'item', label: 'Component', align: 'left' },
      { key: 'monthly', label: 'Monthly' },
      { key: 'annual', label: 'Annual' },
    ],
    rows: [
      { item: 'Basic + DA', monthly: formatINR(r.basic), annual: formatINR(r.basic * 12) },
      { item: 'HRA', monthly: formatINR(r.hra), annual: formatINR(r.hra * 12) },
      { item: 'Special allowance', monthly: formatINR(r.specialAllowance), annual: formatINR(r.specialAllowance * 12) },
      { item: 'Gross salary', monthly: formatINR(r.monthlyGross), annual: formatINR(r.annualGross) },
      { item: '− Employee PF', monthly: formatINR(r.employeePF), annual: formatINR(r.employeePF * 12) },
      { item: '− Professional tax', monthly: formatINR(r.professionalTax), annual: formatINR(r.professionalTax * 12) },
      { item: '− Income tax', monthly: formatINR(r.monthlyIncomeTax), annual: formatINR(r.annualIncomeTax) },
      { item: '− Other deductions', monthly: formatINR(r.otherDeductions), annual: formatINR(r.otherDeductions * 12) },
    ],
    footer: { item: 'Net take-home', monthly: formatINR(r.monthlyNet), annual: formatINR(r.annualNet) },
  }),

  summary: (r) =>
    `Monthly take-home ${formatINR(r.monthlyNet)} from a gross of ${formatINR(
      r.monthlyGross,
    )} (${formatPercent(r.takeHomePct, 1)}).`,

  content: {
    howItWorks: [
      'Your gross salary is split into basic, HRA and a residual special allowance. Basic matters more than its size suggests: PF, gratuity and HRA exemption are all calculated on it, so two people with the same gross salary can take home different amounts.',
      'From gross, three things are deducted: 12% of basic as provident fund, professional tax levied by your state, and income tax as TDS. What remains is your take-home.',
      'Income tax is calculated with the same engine as the full income tax calculator, using the regime and financial year you select, so the monthly TDS figure is realistic rather than a flat estimate.',
    ],
    formula: `Basic            = gross × basic %
HRA              = basic × HRA %
Special allowance = gross − basic − HRA
Employee PF      = 12% of basic (or of ₹15,000 if the ceiling applies)
Take-home        = gross − PF − professional tax − income tax − other deductions`,
    example: [
      'Gross ₹1,00,000 a month, basic 40% (₹40,000), HRA 50% of basic (₹20,000).',
      'PF = 12% of ₹40,000 = ₹4,800. Professional tax ₹200.',
      'Under the new regime for FY 2026-27, tax on ₹12,00,000 gross is about ₹4,875 a month after the standard deduction and rebate — leaving roughly ₹90,000 in hand.',
    ],
    assumptions: [
      'The tax estimate assumes salary is your only income and no deductions beyond the standard deduction (plus PF and professional tax if you choose the old regime).',
      'Employer PF is shown for information but is not deducted from your gross — it sits on top, inside your CTC.',
      'Professional tax rates vary by state; ₹200 a month is the common figure where it applies.',
    ],
    notes: [
      'Claiming HRA exemption under the old regime can raise take-home noticeably if you pay rent — use the Income Tax Calculator to model it properly.',
      'A higher basic increases PF, which lowers take-home but raises your retirement savings. It is a shift, not a loss.',
    ],
    faqs: [
      {
        q: 'Why is my take-home lower than this?',
        a: 'Common reasons are a higher basic than assumed, employer-specific deductions such as insurance or a canteen, NPS contributions, or TDS being front-loaded early in the financial year.',
      },
      {
        q: 'Is gross salary the same as CTC?',
        a: 'No. CTC also includes the employer’s PF contribution, gratuity accrual and benefits like insurance. Gross salary is what appears on your payslip before deductions. Use the CTC to In-Hand calculator to go from one to the other.',
      },
      {
        q: 'Can I reduce my PF deduction?',
        a: 'Only if your employer restricts PF to the ₹15,000 wage ceiling, which many do. It raises take-home by a few thousand a month but reduces long-term retirement savings that earn 8.25% tax-free.',
      },
    ],
  },
};

export default salary;
