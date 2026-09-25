import { calculateEPF } from '@/engines/epf';
import { calculateNPS } from '@/engines/nps';
import { calculateEMI, emiAmount, monthsFrom } from '@/engines/emi';
import {
  calculateFD,
  calculateInflation,
  calculateLumpsum,
  calculatePPF,
  calculateRetirement,
  calculateSIP,
} from '@/engines/investment';
import { annuityFutureValue, cagr, compoundFutureValue, realRate } from '@/engines/core';

describe('EPF', () => {
  const input = {
    currentBalance: 0,
    monthlySalary: 100000,
    employeeMode: 'percent' as const,
    employeeValue: 12,
    employerMode: 'percent' as const,
    employerValue: 3.67,
    annualSalaryIncreasePct: 0,
    annualReturnPct: 12,
    currentAge: 30,
    retirementAge: 31,
  };

  it('accrues interest monthly and credits it at year end', () => {
    // 12 contributions of ₹15,670; interest = 15,670 × 1% × (1+2+…+12) = ₹12,222.60
    const r = calculateEPF(input);
    expect(r.rows).toHaveLength(1);
    expect(r.totalContribution).toBeCloseTo(188040, 2);
    expect(r.totalInterest).toBeCloseTo(12222.6, 1);
    expect(r.corpus).toBeCloseTo(200262.6, 1);
  });

  it('splits employee and employer contributions correctly', () => {
    const r = calculateEPF(input);
    expect(r.monthlyEmployee).toBe(12000);
    expect(r.monthlyEmployer).toBe(3670);
    expect(r.totalEmployee).toBe(144000);
  });

  it('grows the salary once a year', () => {
    const r = calculateEPF({ ...input, retirementAge: 33, annualSalaryIncreasePct: 10 });
    expect(r.rows[0].monthlySalary).toBe(100000);
    expect(r.rows[1].monthlySalary).toBeCloseTo(110000, 2);
    expect(r.rows[2].monthlySalary).toBeCloseTo(121000, 2);
  });

  it('honours a flat contribution amount that does not grow with salary', () => {
    const r = calculateEPF({
      ...input,
      employeeMode: 'amount',
      employeeValue: 1800,
      employerMode: 'amount',
      employerValue: 550,
      annualSalaryIncreasePct: 10,
      retirementAge: 32,
    });
    expect(r.rows[0].employeeContribution).toBe(21600);
    expect(r.rows[1].employeeContribution).toBe(21600);
  });

  it('carries an opening balance and compounds it', () => {
    const r = calculateEPF({ ...input, currentBalance: 500000 });
    expect(r.corpus).toBeGreaterThan(688040);
    expect(r.openingBalance).toBe(500000);
  });

  it('returns an empty projection when retirement age equals current age', () => {
    const r = calculateEPF({ ...input, retirementAge: 30 });
    expect(r.years).toBe(0);
    expect(r.rows).toHaveLength(0);
    expect(r.corpus).toBe(0);
  });
});

describe('EMI', () => {
  it('matches the standard EMI formula', () => {
    const emi = emiAmount(2500000, 8.75, 240);
    expect(emi).toBeCloseTo(22092.8, 0);
  });

  it('produces a schedule that closes at exactly zero', () => {
    const r = calculateEMI({ principal: 2500000, annualRatePct: 8.75, tenure: 20, tenureUnit: 'years' });
    expect(r.schedule).toHaveLength(240);
    expect(r.schedule[239].balance).toBeCloseTo(0, 6);
    expect(r.principal + r.totalInterest).toBeCloseTo(r.totalPayment, 2);
  });

  it('sums scheduled principal back to the loan amount', () => {
    const r = calculateEMI({ principal: 1000000, annualRatePct: 10, tenure: 60, tenureUnit: 'months' });
    const totalPrincipal = r.schedule.reduce((s, row) => s + row.principalPaid, 0);
    expect(totalPrincipal).toBeCloseTo(1000000, 2);
  });

  it('handles a zero-interest loan', () => {
    const r = calculateEMI({ principal: 120000, annualRatePct: 0, tenure: 12, tenureUnit: 'months' });
    expect(r.emi).toBe(10000);
    expect(r.totalInterest).toBeCloseTo(0, 6);
  });

  it('charges more interest as the tenure lengthens', () => {
    const short = calculateEMI({ principal: 2500000, annualRatePct: 8.75, tenure: 10, tenureUnit: 'years' });
    const long = calculateEMI({ principal: 2500000, annualRatePct: 8.75, tenure: 30, tenureUnit: 'years' });
    expect(long.emi).toBeLessThan(short.emi);
    expect(long.totalInterest).toBeGreaterThan(short.totalInterest * 2);
  });

  it('converts tenure units', () => {
    expect(monthsFrom(20, 'years')).toBe(240);
    expect(monthsFrom(18, 'months')).toBe(18);
  });
});

describe('SIP', () => {
  it('matches the annuity-due formula over one year', () => {
    // 10,000 × 1.01 × ((1.01¹² − 1) ÷ 0.01) = 1,28,093
    const r = calculateSIP({ monthlyInvestment: 10000, expectedReturnPct: 12, years: 1, annualStepUpPct: 0 });
    expect(r.futureValue).toBeCloseTo(128093.2, 0);
    expect(r.totalInvested).toBe(120000);
    expect(r.estimatedReturns).toBeCloseTo(8093.2, 0);
  });

  it('agrees with the closed-form annuity function', () => {
    const r = calculateSIP({ monthlyInvestment: 10000, expectedReturnPct: 12, years: 15, annualStepUpPct: 0 });
    expect(r.futureValue).toBeCloseTo(annuityFutureValue(10000, 0.01, 180, true), 0);
  });

  it('increases the corpus with an annual step-up', () => {
    const flat = calculateSIP({ monthlyInvestment: 10000, expectedReturnPct: 12, years: 15, annualStepUpPct: 0 });
    const stepped = calculateSIP({ monthlyInvestment: 10000, expectedReturnPct: 12, years: 15, annualStepUpPct: 10 });
    expect(stepped.futureValue).toBeGreaterThan(flat.futureValue * 1.4);
    expect(stepped.finalMonthly).toBeGreaterThan(flat.finalMonthly);
  });

  it('handles a zero return without dividing by zero', () => {
    const r = calculateSIP({ monthlyInvestment: 5000, expectedReturnPct: 0, years: 2, annualStepUpPct: 0 });
    expect(r.futureValue).toBeCloseTo(120000, 2);
    expect(r.estimatedReturns).toBeCloseTo(0, 6);
  });
});

describe('PPF', () => {
  it('credits a full year of interest on a deposit made at the start of the year', () => {
    const r = calculatePPF({ depositAmount: 150000, frequency: 'yearly', interestRatePct: 7.1, years: 1 });
    expect(r.rows[0].interest).toBeCloseTo(10650, 2);
    expect(r.maturity).toBeCloseTo(160650, 2);
  });

  it('matures a full 15-year account in the expected range', () => {
    const r = calculatePPF({ depositAmount: 150000, frequency: 'yearly', interestRatePct: 7.1, years: 15 });
    expect(r.totalDeposited).toBe(2250000);
    expect(r.maturity).toBeGreaterThan(4000000);
    expect(r.maturity).toBeLessThan(4150000);
  });

  it('earns less with monthly deposits than one lump deposit in April', () => {
    const yearly = calculatePPF({ depositAmount: 120000, frequency: 'yearly', interestRatePct: 7.1, years: 15 });
    const monthly = calculatePPF({ depositAmount: 10000, frequency: 'monthly', interestRatePct: 7.1, years: 15 });
    expect(monthly.totalDeposited).toBe(yearly.totalDeposited);
    expect(monthly.maturity).toBeLessThan(yearly.maturity);
  });
});

describe('FD', () => {
  it('compounds quarterly the way banks do', () => {
    const r = calculateFD({ principal: 500000, annualRatePct: 7, years: 5, compounding: 'quarterly', taxSlabPct: 0 });
    expect(r.maturity).toBeCloseTo(707389, -1);
    expect(r.effectiveYieldPct).toBeGreaterThan(7);
  });

  it('pays less on simple interest than on compounding', () => {
    const simple = calculateFD({ principal: 500000, annualRatePct: 7, years: 5, compounding: 'simple', taxSlabPct: 0 });
    const compound = calculateFD({ principal: 500000, annualRatePct: 7, years: 5, compounding: 'quarterly', taxSlabPct: 0 });
    expect(simple.maturity).toBeCloseTo(675000, 2);
    expect(compound.maturity).toBeGreaterThan(simple.maturity);
  });

  it('applies tax to the interest only', () => {
    const r = calculateFD({ principal: 500000, annualRatePct: 7, years: 5, compounding: 'quarterly', taxSlabPct: 30 });
    expect(r.taxOnInterest).toBeCloseTo(r.interest * 0.3, 2);
    expect(r.postTaxMaturity).toBeCloseTo(r.maturity - r.taxOnInterest, 2);
    expect(r.postTaxYieldPct).toBeLessThan(r.effectiveYieldPct);
  });

  it('compounds monthly more often than yearly', () => {
    const monthly = calculateFD({ principal: 100000, annualRatePct: 8, years: 3, compounding: 'monthly', taxSlabPct: 0 });
    const yearly = calculateFD({ principal: 100000, annualRatePct: 8, years: 3, compounding: 'yearly', taxSlabPct: 0 });
    expect(monthly.maturity).toBeGreaterThan(yearly.maturity);
  });
});

describe('NPS', () => {
  const input = {
    currentAge: 30,
    retirementAge: 60,
    currentCorpus: 200000,
    monthlyContribution: 10000,
    annualIncreasePct: 5,
    expectedReturnPct: 10,
    annuityPct: 40,
    annuityReturnPct: 6,
  };

  it('splits the corpus into lump sum and annuity', () => {
    const r = calculateNPS(input);
    expect(r.lumpSum + r.annuityCorpus).toBeCloseTo(r.corpus, 2);
    expect(r.annuityCorpus).toBeCloseTo(r.corpus * 0.4, 2);
  });

  it('derives the monthly pension from the annuity corpus', () => {
    const r = calculateNPS(input);
    expect(r.monthlyPension).toBeCloseTo((r.annuityCorpus * 0.06) / 12, 2);
  });

  it('counts the opening corpus as investment, not return', () => {
    const r = calculateNPS(input);
    expect(r.totalInvestment).toBeCloseTo(r.totalContribution + 200000, 2);
    expect(r.estimatedReturns).toBeCloseTo(r.corpus - r.totalInvestment, 2);
  });

  it('produces a bigger pension when more goes into the annuity', () => {
    const more = calculateNPS({ ...input, annuityPct: 100 });
    const less = calculateNPS({ ...input, annuityPct: 40 });
    expect(more.monthlyPension).toBeGreaterThan(less.monthlyPension);
    expect(more.lumpSum).toBe(0);
  });
});

describe('lumpsum, inflation and retirement', () => {
  it('compounds a lumpsum and reports CAGR', () => {
    const r = calculateLumpsum({ amount: 500000, expectedReturnPct: 12, years: 10 });
    expect(r.futureValue).toBeCloseTo(1552924, -2);
    expect(r.cagrPct).toBeCloseTo(12, 4);
  });

  it('measures inflation both ways', () => {
    const r = calculateInflation({ amount: 100000, inflationRatePct: 6, years: 15, investmentReturnPct: 10 });
    expect(r.futureCost).toBeCloseTo(239655.8, 0);
    expect(r.purchasingPower).toBeCloseTo(41726.5, 0);
    expect(r.realReturnPct).toBeCloseTo(3.7736, 3);
  });

  it('requires a bigger corpus for a longer retirement', () => {
    const base = {
      currentAge: 32,
      retirementAge: 60,
      lifeExpectancy: 85,
      monthlyExpense: 60000,
      inflationPct: 6,
      currentSavings: 1500000,
      monthlyInvestment: 25000,
      preReturnPct: 11,
      postReturnPct: 7,
    };
    const short = calculateRetirement({ ...base, lifeExpectancy: 75 });
    const long = calculateRetirement(base);
    expect(long.corpusRequired).toBeGreaterThan(short.corpusRequired);
    expect(long.monthlyExpenseAtRetirement).toBeCloseTo(60000 * Math.pow(1.06, 28), 0);
  });

  it('reports a shortfall and the extra investment that closes it', () => {
    const r = calculateRetirement({
      currentAge: 45,
      retirementAge: 60,
      lifeExpectancy: 90,
      monthlyExpense: 100000,
      inflationPct: 6,
      currentSavings: 500000,
      monthlyInvestment: 5000,
      preReturnPct: 10,
      postReturnPct: 7,
    });
    expect(r.onTrack).toBe(false);
    expect(r.surplusOrGap).toBeLessThan(0);
    expect(r.additionalMonthlyNeeded).toBeGreaterThan(0);
  });

  it('reports a surplus when savings are more than enough', () => {
    const r = calculateRetirement({
      currentAge: 30,
      retirementAge: 60,
      lifeExpectancy: 80,
      monthlyExpense: 30000,
      inflationPct: 5,
      currentSavings: 10000000,
      monthlyInvestment: 100000,
      preReturnPct: 12,
      postReturnPct: 8,
    });
    expect(r.onTrack).toBe(true);
    expect(r.additionalMonthlyNeeded).toBe(0);
  });
});

describe('core primitives', () => {
  it('compounds at the requested frequency', () => {
    expect(compoundFutureValue(100000, 10, 1, 1)).toBeCloseTo(110000, 6);
    expect(compoundFutureValue(100000, 10, 1, 4)).toBeCloseTo(110381.29, 2);
  });

  it('computes CAGR', () => {
    expect(cagr(100000, 200000, 10)).toBeCloseTo(7.1773, 3);
    expect(cagr(0, 100, 5)).toBe(0);
  });

  it('uses the exact Fisher relation for real return', () => {
    expect(realRate(10, 6)).toBeCloseTo(3.7736, 3);
  });

  it('treats a zero rate annuity as a plain sum', () => {
    expect(annuityFutureValue(1000, 0, 12, true)).toBe(12000);
  });
});
