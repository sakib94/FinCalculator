import { safe } from './core';

/**
 * EPF projection.
 *
 * Method (mirrors how EPFO actually credits interest):
 *  • Contributions are made every month on Basic + DA.
 *  • Interest accrues on the monthly running balance at annualRate/12 and is
 *    CREDITED ONCE A YEAR, at the end of the financial year.
 *  • Salary — and therefore each contribution — steps up once every year.
 *
 * Contributions may be given as a percentage of Basic + DA or as a flat
 * monthly rupee amount (flat amounts do not grow with salary).
 */

export type ContributionMode = 'percent' | 'amount';

export interface EpfInput {
  currentBalance: number;
  monthlySalary: number; // Basic + DA
  employeeMode: ContributionMode;
  employeeValue: number; // % of Basic+DA, or ₹/month
  employerMode: ContributionMode;
  employerValue: number;
  annualSalaryIncreasePct: number;
  annualReturnPct: number;
  currentAge: number;
  retirementAge: number;
}

export interface EpfYearRow {
  year: number;
  age: number;
  monthlySalary: number;
  employeeContribution: number;
  employerContribution: number;
  interest: number;
  closingBalance: number;
}

export interface EpfResult {
  years: number;
  openingBalance: number;
  monthlyEmployee: number;
  monthlyEmployer: number;
  monthlyTotal: number;
  firstYearContribution: number;
  totalEmployee: number;
  totalEmployer: number;
  totalContribution: number;
  totalInterest: number;
  corpus: number;
  finalMonthlySalary: number;
  rows: EpfYearRow[];
}

const contributionFor = (salary: number, mode: ContributionMode, value: number): number =>
  mode === 'percent' ? (salary * value) / 100 : value;

export function calculateEPF(input: EpfInput): EpfResult {
  const years = Math.max(0, Math.round(input.retirementAge - input.currentAge));
  const monthlyRate = input.annualReturnPct / 100 / 12;
  const growth = 1 + input.annualSalaryIncreasePct / 100;

  let balance = Math.max(0, input.currentBalance);
  let salary = Math.max(0, input.monthlySalary);
  let totalEmployee = 0;
  let totalEmployer = 0;
  let totalInterest = 0;

  const rows: EpfYearRow[] = [];

  for (let y = 1; y <= years; y++) {
    const employee = contributionFor(salary, input.employeeMode, input.employeeValue);
    const employer = contributionFor(salary, input.employerMode, input.employerValue);
    const monthly = employee + employer;

    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      balance += monthly;
      // Interest accrues on the running balance but is credited at year end.
      yearInterest += balance * monthlyRate;
    }
    balance += yearInterest;

    totalEmployee += employee * 12;
    totalEmployer += employer * 12;
    totalInterest += yearInterest;

    rows.push({
      year: y,
      age: input.currentAge + y,
      monthlySalary: salary,
      employeeContribution: employee * 12,
      employerContribution: employer * 12,
      interest: yearInterest,
      closingBalance: balance,
    });

    salary *= growth;
  }

  const firstEmployee = contributionFor(input.monthlySalary, input.employeeMode, input.employeeValue);
  const firstEmployer = contributionFor(input.monthlySalary, input.employerMode, input.employerValue);

  return {
    years,
    openingBalance: Math.max(0, input.currentBalance),
    monthlyEmployee: safe(firstEmployee),
    monthlyEmployer: safe(firstEmployer),
    monthlyTotal: safe(firstEmployee + firstEmployer),
    firstYearContribution: safe((firstEmployee + firstEmployer) * 12),
    totalEmployee: safe(totalEmployee),
    totalEmployer: safe(totalEmployer),
    totalContribution: safe(totalEmployee + totalEmployer),
    totalInterest: safe(totalInterest),
    corpus: safe(balance),
    finalMonthlySalary: safe(rows.length ? rows[rows.length - 1].monthlySalary : input.monthlySalary),
    rows,
  };
}
