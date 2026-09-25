import type { CalculatorDef, Values } from '../types';
import { calculateEPF, type EpfResult } from '@/engines/epf';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const EPF_RATE = 8.25;

const toInput = (v: Values) => ({
  currentBalance: num(v.currentBalance),
  monthlySalary: num(v.monthlySalary),
  employeeMode: str(v.employeeMode, 'percent') as 'percent' | 'amount',
  employeeValue: str(v.employeeMode, 'percent') === 'percent' ? num(v.employeePct) : num(v.employeeAmount),
  employerMode: str(v.employerMode, 'percent') as 'percent' | 'amount',
  employerValue: str(v.employerMode, 'percent') === 'percent' ? num(v.employerPct) : num(v.employerAmount),
  annualSalaryIncreasePct: num(v.annualIncrease),
  annualReturnPct: num(v.annualReturn),
  currentAge: num(v.currentAge),
  retirementAge: num(v.retirementAge),
});

const epf: CalculatorDef<EpfResult> = {
  id: 'epf',

  groups: [
    { id: 'contribution', title: 'Contributions' },
    { id: 'growth', title: 'Growth assumptions' },
    { id: 'horizon', title: 'Time horizon' },
  ],

  fields: [
    {
      name: 'currentBalance',
      label: 'Current EPF Balance',
      type: 'currency',
      default: 500000,
      min: 0,
      max: 100000000,
      help: 'The balance showing in your EPFO passbook today. Enter 0 if you are just starting out.',
    },
    {
      name: 'monthlySalary',
      label: 'Monthly Salary (Basic + DA)',
      type: 'currency',
      default: 50000,
      min: 0,
      max: 10000000,
      help: 'EPF is calculated on Basic + Dearness Allowance only — not on your full gross salary.',
    },
    {
      name: 'employeeMode',
      label: 'Employee contribution is',
      type: 'segmented',
      default: 'percent',
      group: 'contribution',
      options: [
        { label: 'A percentage', value: 'percent' },
        { label: 'A fixed amount', value: 'amount' },
      ],
    },
    {
      name: 'employeePct',
      label: 'Employee Contribution',
      type: 'percent',
      default: 12,
      min: 0,
      max: 100,
      step: 0.01,
      slider: true,
      group: 'contribution',
      visible: (v) => v.employeeMode === 'percent',
      help: 'The statutory rate is 12% of Basic + DA. You may contribute more as VPF.',
    },
    {
      name: 'employeeAmount',
      label: 'Employee Contribution',
      type: 'currency',
      default: 6000,
      min: 0,
      max: 1000000,
      group: 'contribution',
      visible: (v) => v.employeeMode === 'amount',
      help: 'A flat monthly amount. Unlike a percentage, it does not rise with your salary.',
    },
    {
      name: 'employerMode',
      label: 'Employer contribution is',
      type: 'segmented',
      default: 'percent',
      group: 'contribution',
      options: [
        { label: 'A percentage', value: 'percent' },
        { label: 'A fixed amount', value: 'amount' },
      ],
    },
    {
      name: 'employerPct',
      label: 'Employer Contribution',
      type: 'percent',
      default: 3.67,
      min: 0,
      max: 100,
      step: 0.01,
      slider: true,
      group: 'contribution',
      visible: (v) => v.employerMode === 'percent',
      help: 'Your employer puts in 12% too, but 8.33% goes to the pension scheme (EPS). Only 3.67% lands in your EPF.',
    },
    {
      name: 'employerAmount',
      label: 'Employer Contribution',
      type: 'currency',
      default: 1835,
      min: 0,
      max: 1000000,
      group: 'contribution',
      visible: (v) => v.employerMode === 'amount',
    },
    {
      name: 'annualIncrease',
      label: 'Annual Increase in Salary',
      type: 'percent',
      default: 8,
      min: 0,
      max: 30,
      step: 0.5,
      slider: true,
      group: 'growth',
      help: 'Average yearly hike in Basic + DA. Contributions grow with it.',
    },
    {
      name: 'annualReturn',
      label: 'Annual EPF Return',
      type: 'percent',
      default: EPF_RATE,
      min: 1,
      max: 15,
      step: 0.05,
      slider: true,
      group: 'growth',
      help: 'EPFO declared 8.25% for FY 2025-26. The rate is reviewed every year and is not guaranteed.',
    },
    {
      name: 'currentAge',
      label: 'Current Age',
      type: 'number',
      default: 32,
      min: 15,
      max: 75,
      unit: 'yrs',
      slider: true,
      group: 'horizon',
    },
    {
      name: 'retirementAge',
      label: 'Retirement Age',
      type: 'number',
      default: 60,
      min: 30,
      max: 80,
      unit: 'yrs',
      slider: true,
      group: 'horizon',
      help: 'EPF can be withdrawn fully at 58. Many people keep contributing until 60.',
    },
  ],

  validate: (v) => {
    const errors: Record<string, string> = {};
    if (num(v.retirementAge) <= num(v.currentAge)) {
      errors.retirementAge = 'Retirement age must be greater than your current age.';
    }
    if (num(v.monthlySalary) === 0 && num(v.currentBalance) === 0) {
      errors.monthlySalary = 'Please enter a valid monthly salary.';
    }
    return errors;
  },

  compute: (v) => calculateEPF(toInput(v)),

  hero: (r, v) => ({
    label: 'Estimated EPF corpus at retirement',
    value: formatINR(r.corpus),
    caption: `${formatINRCompact(r.corpus)} at age ${num(v.retirementAge)} · ${r.years} years from now`,
  }),

  stats: (r) => [
    { label: 'Total employee contribution', value: formatINR(r.totalEmployee) },
    { label: 'Total employer contribution', value: formatINR(r.totalEmployer) },
    { label: 'Total interest earned', value: formatINR(r.totalInterest), tone: 'positive' },
    { label: 'Total contribution', value: formatINR(r.totalContribution) },
    {
      label: 'Monthly contribution (now)',
      value: formatINR(r.monthlyTotal),
      help: 'Employee + employer contribution in the first year.',
    },
    {
      label: 'Salary at retirement',
      value: formatINR(r.finalMonthlySalary),
      help: 'Monthly Basic + DA in your final year, after annual increases.',
    },
    { label: 'Opening balance', value: formatINR(r.openingBalance) },
    { label: 'Years to retirement', value: `${r.years}` },
  ],

  charts: (r) => {
    if (!r.rows.length) return [];
    const labels = r.rows.map((row) => String(row.age));
    let employee = r.openingBalance;
    let employer = 0;
    let interest = 0;
    const employeeSeries: number[] = [];
    const employerSeries: number[] = [];
    const interestSeries: number[] = [];

    for (const row of r.rows) {
      employee += row.employeeContribution;
      employer += row.employerContribution;
      interest += row.interest;
      employeeSeries.push(employee);
      employerSeries.push(employer);
      interestSeries.push(interest);
    }

    return [
      {
        kind: 'line' as const,
        title: 'How the corpus builds up',
        x: labels,
        xLabel: 'Age',
        stacked: true,
        series: [
          { name: 'Employee contribution', values: employeeSeries },
          { name: 'Employer contribution', values: employerSeries },
          { name: 'Interest earned', values: interestSeries },
        ],
      },
      {
        kind: 'donut' as const,
        title: 'What makes up your corpus',
        centerLabel: 'Corpus',
        data: [
          { label: 'Employee contribution', value: r.totalEmployee + r.openingBalance },
          { label: 'Employer contribution', value: r.totalEmployer },
          { label: 'Interest earned', value: r.totalInterest },
        ],
      },
    ];
  },

  table: (r) => ({
    title: 'Year-wise projection',
    previewRows: 10,
    csvName: 'finora-epf-projection',
    columns: [
      { key: 'age', label: 'Age', align: 'left' },
      { key: 'salary', label: 'Monthly Salary' },
      { key: 'employee', label: 'Employee' },
      { key: 'employer', label: 'Employer' },
      { key: 'interest', label: 'Interest' },
      { key: 'balance', label: 'EPF Balance' },
    ],
    rows: r.rows.map((row) => ({
      age: String(row.age),
      salary: formatINR(row.monthlySalary),
      employee: formatINR(row.employeeContribution),
      employer: formatINR(row.employerContribution),
      interest: formatINR(row.interest),
      balance: formatINR(row.closingBalance),
    })),
    csvRows: r.rows.map((row) => ({
      age: row.age,
      salary: Math.round(row.monthlySalary),
      employee: Math.round(row.employeeContribution),
      employer: Math.round(row.employerContribution),
      interest: Math.round(row.interest),
      balance: Math.round(row.closingBalance),
    })),
    footer: {
      age: 'Total',
      salary: '',
      employee: formatINR(r.totalEmployee),
      employer: formatINR(r.totalEmployer),
      interest: formatINR(r.totalInterest),
      balance: formatINR(r.corpus),
    },
    note: 'Contributions are annual totals. Interest is credited at the end of each financial year.',
  }),

  summary: (r, v) =>
    `Estimated EPF corpus at age ${num(v.retirementAge)}: ${formatINR(r.corpus)} ` +
    `(contributions ${formatINR(r.totalContribution)} + interest ${formatINR(r.totalInterest)}), ` +
    `assuming ${formatPercent(num(v.annualReturn))} interest and ${formatPercent(num(v.annualIncrease))} annual salary growth.`,

  content: {
    howItWorks: [
      'The Employees’ Provident Fund is a retirement savings scheme run by EPFO. Every month you contribute 12% of your Basic + DA, and your employer matches it — but only 3.67% of the employer’s share lands in your EPF account. The remaining 8.33% goes to the Employees’ Pension Scheme (EPS), which pays a separate pension and is not part of this corpus.',
      'EPFO calculates interest on the running balance every month and credits the whole year’s interest at the end of the financial year. This calculator follows the same method, so the year-end balances match your passbook closely rather than using a rough annual compounding shortcut.',
      'Your salary is stepped up once a year by the annual increase you set, and contributions rise with it. Over a long horizon this salary growth matters as much as the interest rate.',
    ],
    formula: `Monthly contribution = (Basic + DA) × contribution rate
Monthly interest accrual = running balance × (annual rate ÷ 12)
Year-end balance = opening balance + 12 monthly contributions + accrued interest
Next year's salary = this year's salary × (1 + annual increase)`,
    example: [
      'Basic + DA of ₹50,000, employee 12% (₹6,000) and employer 3.67% (₹1,835) — ₹7,835 a month.',
      'Starting balance ₹5,00,000, EPF rate 8.25%, salary growing 8% a year, age 32 to 60.',
      'The corpus crosses ₹1 crore well before retirement because contributions grow alongside the salary while interest compounds on everything already saved.',
    ],
    assumptions: [
      'The EPF interest rate stays constant for the whole period. In reality EPFO declares it every year — it has ranged between roughly 8.10% and 8.65% over the last decade.',
      'The wage ceiling of ₹15,000 is not applied. If your employer restricts PF to the ceiling, enter the contribution as a fixed amount instead (₹1,800 employee, ₹550 employer).',
      'EPS (pension) contribution is excluded, which is why the employer rate defaults to 3.67% rather than 12%.',
      'No withdrawals, advances or job changes during the period. Every rupee stays invested until retirement.',
    ],
    notes: [
      'Interest on employee contributions above ₹2.5 lakh a year (₹5 lakh where the employer does not contribute) is taxable under current rules.',
      'EPF withdrawals are tax-free after five years of continuous service.',
      'This is an estimate based on the assumptions you enter, not a guaranteed return or an EPFO statement.',
    ],
    faqs: [
      {
        q: 'Why is the employer contribution 3.67% and not 12%?',
        a: 'Your employer does contribute 12% of Basic + DA, but 8.33% of it (capped at ₹1,250 a month on the ₹15,000 wage ceiling) is diverted to the Employees’ Pension Scheme. Only the remaining 3.67% is credited to your EPF account, so that is the figure this calculator uses by default.',
      },
      {
        q: 'What is the current EPF interest rate?',
        a: 'EPFO declared 8.25% for FY 2025-26, the same rate as the previous two years. The rate is approved every year by the Central Board of Trustees and the government, so it can change.',
      },
      {
        q: 'Should I include my VPF contribution?',
        a: 'Yes. Voluntary Provident Fund earns the same interest rate as EPF. Increase the employee contribution percentage beyond 12% to include it — for example 20% if you contribute an extra 8% as VPF.',
      },
      {
        q: 'Does the calculator include EPS pension?',
        a: 'No. The corpus shown is your EPF balance only. The pension you get from EPS is a separate monthly amount calculated on your pensionable salary and service, and it is paid after 58.',
      },
      {
        q: 'What happens to EPF when I change jobs?',
        a: 'Transfer the balance to your new employer using your UAN rather than withdrawing it. The balance keeps earning interest and your service period stays continuous, which matters for tax-free withdrawal after five years.',
      },
    ],
  },
};

export default epf;
