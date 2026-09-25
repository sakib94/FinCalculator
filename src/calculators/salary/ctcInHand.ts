import type { CalculatorDef, Values } from '../types';
import { calculateCTC, type CtcResult } from '@/engines/salary';
import { DEFAULT_FY, FINANCIAL_YEARS, type RegimeId } from '@/data/taxRules';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  annualCTC: num(v.annualCTC),
  basicPctOfCTC: num(v.basicPct),
  hraPctOfBasic: num(v.hraPct),
  includesGratuity: str(v.gratuityIncluded, 'yes') === 'yes',
  pfOnCeiling: str(v.pfBasis, 'basic') === 'ceiling',
  otherEmployerBenefits: num(v.otherBenefits),
  professionalTaxAnnual: num(v.professionalTax),
  regime: str(v.regime, 'new') as RegimeId,
  fyId: str(v.financialYear, DEFAULT_FY.id),
});

const ctcInHand: CalculatorDef<CtcResult> = {
  id: 'ctc-in-hand',

  groups: [
    { id: 'structure', title: 'How your CTC is structured' },
    { id: 'tax', title: 'Tax settings' },
  ],

  fields: [
    {
      name: 'annualCTC',
      label: 'Annual CTC',
      type: 'currency',
      default: 1800000,
      min: 50000,
      max: 500000000,
      slider: true,
      step: 100000,
      help: 'The total cost to company figure on your offer letter.',
    },
    {
      name: 'basicPct',
      label: 'Basic as % of CTC',
      type: 'percent',
      default: 40,
      min: 10,
      max: 80,
      step: 1,
      slider: true,
      group: 'structure',
      help: 'Check your offer letter. 40–50% is typical.',
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
    },
    {
      name: 'pfBasis',
      label: 'PF is calculated on',
      type: 'segmented',
      default: 'basic',
      group: 'structure',
      options: [
        { label: 'Full basic', value: 'basic' },
        { label: '₹15,000 ceiling', value: 'ceiling' },
      ],
    },
    {
      name: 'gratuityIncluded',
      label: 'Gratuity included in CTC?',
      type: 'segmented',
      default: 'yes',
      group: 'structure',
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      help: 'Most companies show gratuity at 4.81% of basic inside CTC even though you only receive it after five years.',
    },
    {
      name: 'otherBenefits',
      label: 'Other Employer Costs (annual)',
      type: 'currency',
      default: 0,
      min: 0,
      max: 10000000,
      optional: true,
      group: 'structure',
      help: 'Health insurance premium, meal cards, ESOP value and similar items counted in CTC but not paid to you in cash.',
    },
    {
      name: 'professionalTax',
      label: 'Professional Tax (annual)',
      type: 'currency',
      default: 2400,
      min: 0,
      max: 2500,
      group: 'tax',
    },
    {
      name: 'regime',
      label: 'Tax Regime',
      type: 'segmented',
      default: 'new',
      group: 'tax',
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
      group: 'tax',
      options: FINANCIAL_YEARS.map((f) => ({ label: f.label, value: f.id })),
    },
  ],

  compute: (v) => calculateCTC(toInput(v)),

  hero: (r) => [
    {
      label: 'Monthly in-hand salary',
      value: formatINR(r.monthlyInHand),
      caption: `${formatPercent(r.inHandPctOfCTC, 1)} of your CTC reaches your bank account`,
    },
    {
      label: 'Annual in-hand',
      value: formatINR(r.annualInHand),
      caption: `From a CTC of ${formatINR(r.annualCTC)}`,
    },
  ],

  stats: (r) => [
    { label: 'Gross salary (annual)', value: formatINR(r.grossSalary) },
    { label: 'Monthly gross', value: formatINR(r.monthlyGross) },
    { label: 'Basic + DA', value: formatINR(r.basic) },
    { label: 'HRA', value: formatINR(r.hra) },
    { label: 'Employer PF', value: formatINR(r.employerPF), help: 'Part of CTC, paid into your EPF account.' },
    { label: 'Gratuity accrual', value: formatINR(r.gratuity), help: 'Part of CTC, received only after five years of service.' },
    { label: 'Employee PF', value: formatINR(r.employeePF), tone: 'negative' },
    { label: 'Income tax', value: formatINR(r.incomeTax), tone: 'negative' },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'How your CTC is split',
      centerLabel: 'CTC',
      data: [
        { label: 'In-hand salary', value: Math.max(0, r.annualInHand) },
        { label: 'Income tax', value: r.incomeTax },
        { label: 'Employee PF', value: r.employeePF },
        { label: 'Employer PF & gratuity', value: r.employerPF + r.gratuity },
        { label: 'Other employer costs', value: r.otherBenefits + r.professionalTax },
      ],
    },
  ],

  table: (r) => ({
    title: 'CTC to in-hand, step by step',
    csvName: 'finora-ctc-breakdown',
    columns: [
      { key: 'item', label: 'Component', align: 'left' },
      { key: 'annual', label: 'Annual' },
      { key: 'monthly', label: 'Monthly' },
    ],
    rows: [
      { item: 'Annual CTC', annual: formatINR(r.annualCTC), monthly: formatINR(r.annualCTC / 12) },
      { item: '− Employer PF', annual: formatINR(r.employerPF), monthly: formatINR(r.employerPF / 12) },
      { item: '− Gratuity accrual', annual: formatINR(r.gratuity), monthly: formatINR(r.gratuity / 12) },
      { item: '− Other employer costs', annual: formatINR(r.otherBenefits), monthly: formatINR(r.otherBenefits / 12) },
      { item: '= Gross salary', annual: formatINR(r.grossSalary), monthly: formatINR(r.monthlyGross) },
      { item: '− Employee PF', annual: formatINR(r.employeePF), monthly: formatINR(r.employeePF / 12) },
      { item: '− Professional tax', annual: formatINR(r.professionalTax), monthly: formatINR(r.professionalTax / 12) },
      { item: '− Income tax', annual: formatINR(r.incomeTax), monthly: formatINR(r.incomeTax / 12) },
    ],
    footer: { item: 'In-hand salary', annual: formatINR(r.annualInHand), monthly: formatINR(r.monthlyInHand) },
  }),

  summary: (r) =>
    `CTC ${formatINR(r.annualCTC)} → in-hand ${formatINR(r.monthlyInHand)} a month (${formatINR(
      r.annualInHand,
    )} a year).`,

  content: {
    howItWorks: [
      'CTC is what you cost your employer, not what you receive. Three things sit inside it that never reach your bank account: the employer’s 12% PF contribution, the gratuity accrual of 4.81% of basic, and benefits like insurance premiums.',
      'Removing those gives your gross salary — the figure on your payslip. From there, employee PF, professional tax and income tax are deducted to arrive at in-hand pay.',
      'For a typical structure, in-hand works out to roughly 70–80% of CTC. A higher basic pushes more into PF and gratuity, lowering in-hand but building retirement savings.',
    ],
    formula: `Gross salary = CTC − employer PF − gratuity accrual − other employer costs
In-hand      = gross salary − employee PF − professional tax − income tax
Gratuity accrual = 4.81% of basic   (15 ÷ 26 ÷ 12)`,
    example: [
      'CTC ₹18,00,000 with basic at 40% (₹7,20,000) and gratuity included.',
      'Employer PF ₹86,400, gratuity ₹34,632 → gross salary about ₹16,78,968.',
      'Less employee PF ₹86,400, professional tax ₹2,400 and income tax → in-hand roughly ₹1.17 lakh a month under the new regime.',
    ],
    assumptions: [
      'PF is 12% of basic for both employee and employer, unless you select the ₹15,000 ceiling.',
      'Gratuity is accrued at 4.81% of basic when included in CTC. You only actually receive it after five years of service.',
      'Income tax uses the standard deduction and, in the old regime, PF and professional tax as deductions. Other deductions such as 80D or HRA exemption are not applied — use the Income Tax Calculator for those.',
      'Variable pay and bonuses are treated as part of CTC paid in full. If yours is performance-linked, reduce the CTC figure accordingly.',
    ],
    notes: [
      'Ask for your offer letter’s salary structure sheet. The basic percentage is the single biggest driver of the difference between CTC and in-hand.',
      'Employer PF and gratuity are real money — they are savings, not losses. In-hand alone undervalues the offer.',
    ],
    faqs: [
      {
        q: 'Why is my in-hand so much lower than my CTC?',
        a: 'Roughly 20–30% of CTC never reaches you as monthly cash: employer PF, gratuity accrual, insurance and other benefits, plus your own PF and income tax. The gap widens as CTC and tax rates rise.',
      },
      {
        q: 'Should gratuity be part of CTC?',
        a: 'Many companies include it, though you only receive it after five continuous years of service. If you leave earlier, that portion of CTC is never paid, which is worth factoring into an offer comparison.',
      },
      {
        q: 'How can I increase my in-hand salary?',
        a: 'Structure matters more than negotiation here. A lower basic reduces PF, and the old regime with HRA and 80C claims can cut tax if you have the deductions. Both trade long-term benefits for monthly cash.',
      },
      {
        q: 'Does variable pay count?',
        a: 'CTC usually includes target variable pay in full. If your bonus is uncertain, run the calculation with the fixed component only to see your guaranteed monthly income.',
      },
    ],
  },
};

export default ctcInHand;
