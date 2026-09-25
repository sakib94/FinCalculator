/**
 * Engine tests for the calculators added alongside the Blossom redesign.
 *
 * Every expected value here is derived independently of the implementation —
 * from the statutory rule, the closed-form formula, or an arithmetic identity
 * that must hold regardless of how the loop is written.
 */

import {
  calculateSWP,
  calculateSSY,
  calculateCompoundInterest,
  SSY_RATE,
} from '@/engines/investmentPlus';
import { calculatePrepayment, calculateEligibility } from '@/engines/loanTools';
import { calculateHRA, calculateTDS, calculateCapitalGains } from '@/engines/taxTools';
import {
  calculateProfitMargin,
  calculateBreakEven,
  calculateDepreciation,
} from '@/engines/businessPlus';
import {
  calculateConstruction,
  calculateElectricalLoad,
  calculateNetWorth,
} from '@/engines/utility';
import { emiAmount } from '@/engines/emi';

const near = (a: number, b: number, tolerance = 1) => Math.abs(a - b) <= tolerance;

/* ================================================================== */
describe('SWP', () => {
  it('grows the corpus when the withdrawal is below one month of return', () => {
    // 50L at 9% earns 37,500 a month; withdrawing 30,000 leaves a surplus.
    const r = calculateSWP({
      initialInvestment: 5000000,
      monthlyWithdrawal: 30000,
      expectedReturnPct: 9,
      years: 20,
      annualIncreasePct: 0,
    });
    expect(r.lasts).toBe(true);
    expect(r.finalBalance).toBeGreaterThan(5000000);
    expect(r.totalWithdrawn).toBe(30000 * 12 * 20);
  });

  it('reports the month the corpus runs dry when withdrawals are too high', () => {
    const r = calculateSWP({
      initialInvestment: 1000000,
      monthlyWithdrawal: 50000,
      expectedReturnPct: 6,
      years: 10,
      annualIncreasePct: 0,
    });
    expect(r.lasts).toBe(false);
    expect(r.depletedInMonth).toBeGreaterThan(0);
    expect(r.finalBalance).toBe(0);
    // Never pays out more than the corpus plus everything it earned.
    expect(r.totalWithdrawn).toBeLessThanOrEqual(1000000 + r.totalGrowth + 1);
  });

  it('sets the sustainable withdrawal to exactly one month of return', () => {
    const r = calculateSWP({
      initialInvestment: 5000000,
      monthlyWithdrawal: 1,
      expectedReturnPct: 12,
      years: 1,
      annualIncreasePct: 0,
    });
    expect(near(r.sustainableMonthly, 5000000 * 0.01)).toBe(true);
  });

  it('balances: corpus + growth − withdrawals = closing balance', () => {
    const r = calculateSWP({
      initialInvestment: 3000000,
      monthlyWithdrawal: 20000,
      expectedReturnPct: 8,
      years: 12,
      annualIncreasePct: 5,
    });
    expect(near(r.initialInvestment + r.totalGrowth - r.totalWithdrawn, r.finalBalance, 2)).toBe(true);
  });
});

/* ================================================================== */
describe('Sukanya Samriddhi', () => {
  const base = { yearlyDeposit: 150000, ratePct: SSY_RATE, girlAge: 3, startYear: 2025 };

  it('accepts deposits for 15 years and matures at 21', () => {
    const r = calculateSSY(base);
    expect(r.rows).toHaveLength(21);
    expect(r.totalDeposited).toBe(150000 * 15);
    expect(r.rows.filter((x) => x.deposit > 0)).toHaveLength(15);
    expect(r.rows.slice(15).every((x) => x.deposit === 0)).toBe(true);
    expect(r.maturityYear).toBe(2046);
    expect(r.ageAtMaturity).toBe(24);
  });

  it('matches a hand-computed first two years', () => {
    const r = calculateSSY({ ...base, yearlyDeposit: 100000, ratePct: 8 });
    // Year 1: 100000 × 1.08 = 108000.
    expect(near(r.rows[0].closingBalance, 108000)).toBe(true);
    // Year 2: (108000 + 100000) × 1.08 = 224640.
    expect(near(r.rows[1].closingBalance, 224640)).toBe(true);
  });

  it('keeps deposits + interest equal to the maturity value', () => {
    const r = calculateSSY(base);
    expect(near(r.totalDeposited + r.totalInterest, r.maturityValue, 2)).toBe(true);
  });

  it('accepts up to age 10 and rejects above it', () => {
    expect(calculateSSY({ ...base, girlAge: 9 }).eligible).toBe(true);
    expect(calculateSSY({ ...base, girlAge: 10 }).eligible).toBe(true);
    expect(calculateSSY({ ...base, girlAge: 11 }).eligible).toBe(false);
  });
});

/* ================================================================== */
describe('Compound interest', () => {
  it('matches A = P(1+r)^t for annual compounding', () => {
    const r = calculateCompoundInterest({
      principal: 100000,
      ratePct: 10,
      years: 10,
      frequency: 'yearly',
      monthlyContribution: 0,
    });
    // 100000 × 1.10^10 = 259374.25
    expect(near(r.maturityValue, 259374, 5)).toBe(true);
    expect(near(r.totalInterest, 159374, 5)).toBe(true);
  });

  it('computes the effective annual rate for each frequency', () => {
    const eff = (f: 'yearly' | 'half-yearly' | 'quarterly' | 'monthly') =>
      calculateCompoundInterest({
        principal: 1000,
        ratePct: 10,
        years: 1,
        frequency: f,
        monthlyContribution: 0,
      }).effectiveAnnualRatePct;

    expect(near(eff('yearly'), 10, 0.01)).toBe(true);
    expect(near(eff('half-yearly'), 10.25, 0.01)).toBe(true);
    expect(near(eff('quarterly'), 10.381, 0.01)).toBe(true);
    expect(near(eff('monthly'), 10.471, 0.01)).toBe(true);
  });

  it('beats simple interest, and says by how much', () => {
    const r = calculateCompoundInterest({
      principal: 100000,
      ratePct: 10,
      years: 10,
      frequency: 'yearly',
      monthlyContribution: 0,
    });
    // Simple interest would give 100000 × (1 + 0.10 × 10) = 200000.
    expect(near(r.simpleInterestValue, 200000, 1)).toBe(true);
    expect(near(r.compoundingAdvantage, r.maturityValue - 200000, 1)).toBe(true);
  });

  it('adds monthly contributions to the invested total', () => {
    const r = calculateCompoundInterest({
      principal: 50000,
      ratePct: 12,
      years: 5,
      frequency: 'monthly',
      monthlyContribution: 5000,
    });
    expect(r.totalContributed).toBe(5000 * 60);
    expect(r.totalInvested).toBe(50000 + 5000 * 60);
    expect(near(r.totalInvested + r.totalInterest, r.maturityValue, 2)).toBe(true);
  });
});

/* ================================================================== */
describe('Loan prepayment', () => {
  const base = {
    outstandingPrincipal: 4000000,
    annualRatePct: 8.75,
    remainingMonths: 216,
    lumpSum: 500000,
    prepaymentFeePct: 0,
    extraMonthly: 0,
    mode: 'reduce-tenure' as const,
  };

  it('reproduces the baseline EMI', () => {
    const r = calculatePrepayment(base);
    expect(near(r.originalEmi, emiAmount(4000000, 8.75, 216), 0.5)).toBe(true);
  });

  it('reduce-tenure keeps the EMI and shortens the loan', () => {
    const r = calculatePrepayment(base);
    expect(near(r.newEmi, r.originalEmi, 0.5)).toBe(true);
    expect(r.newMonths).toBeLessThan(r.originalMonths);
    expect(r.interestSaved).toBeGreaterThan(0);
  });

  it('reduce-emi keeps the tenure and lowers the instalment', () => {
    const r = calculatePrepayment({ ...base, mode: 'reduce-emi' });
    expect(r.newEmi).toBeLessThan(r.originalEmi);
    expect(Math.abs(r.newMonths - r.originalMonths)).toBeLessThanOrEqual(1);
    expect(r.emiReduction).toBeGreaterThan(0);
  });

  it('saves more interest by cutting tenure than by cutting EMI', () => {
    const tenure = calculatePrepayment(base);
    const emi = calculatePrepayment({ ...base, mode: 'reduce-emi' });
    expect(tenure.interestSaved).toBeGreaterThan(emi.interestSaved);
  });

  it('saves nothing when nothing is prepaid', () => {
    const r = calculatePrepayment({ ...base, lumpSum: 0 });
    expect(near(r.interestSaved, 0, 1)).toBe(true);
    expect(r.monthsSaved).toBe(0);
  });

  it('takes the fee out of the lump sum, not on top of it', () => {
    const r = calculatePrepayment({ ...base, prepaymentFeePct: 2 });
    // 2% of 5,00,000 is 10,000, leaving 4,90,000 for the balance.
    expect(r.feeAmount).toBe(10000);
    expect(r.principalReduction).toBe(490000);
    expect(r.feeAmount + r.principalReduction).toBe(base.lumpSum);
  });

  it('charges no fee at 0%', () => {
    const r = calculatePrepayment(base);
    expect(r.feeAmount).toBe(0);
    expect(r.principalReduction).toBe(base.lumpSum);
  });

  it('saves less interest once a fee is charged', () => {
    const free = calculatePrepayment(base);
    const charged = calculatePrepayment({ ...base, prepaymentFeePct: 3 });
    expect(charged.interestSaved).toBeLessThan(free.interestSaved);
    // The outlay is unchanged, so the return on it must drop too.
    expect(charged.returnOnPrepayment).toBeLessThan(free.returnOnPrepayment);
    expect(charged.prepaidAmount).toBe(free.prepaidAmount);
  });

  it('never reduces the principal below zero', () => {
    const r = calculatePrepayment({
      ...base,
      outstandingPrincipal: 100000,
      lumpSum: 500000,
      prepaymentFeePct: 2,
    });
    expect(r.principalReduction).toBe(100000);
  });

  it('reads the tenure in months', () => {
    // 216 months and 18 years must describe the same loan.
    const r = calculatePrepayment(base);
    expect(near(r.originalEmi, emiAmount(4000000, 8.75, 18 * 12), 0.5)).toBe(true);
    expect(r.originalMonths).toBe(216);
  });
});

/* ================================================================== */
describe('Loan eligibility', () => {
  const base = {
    monthlyIncome: 100000,
    otherMonthlyIncome: 0,
    existingEmi: 0,
    annualRatePct: 8.75,
    tenureYears: 20,
    foirPct: 50,
    propertyValue: 0,
    ltvPct: 80,
  };

  it('caps the EMI at income times FOIR', () => {
    const r = calculateEligibility(base);
    expect(r.maxEmiAllowed).toBe(50000);
    expect(r.availableEmi).toBe(50000);
  });

  it('inverts the EMI formula: the eligible loan repays at the available EMI', () => {
    const r = calculateEligibility(base);
    expect(near(emiAmount(r.eligibleAmount, 8.75, 240), r.availableEmi, 1)).toBe(true);
  });

  it('subtracts existing EMIs from capacity', () => {
    const r = calculateEligibility({ ...base, existingEmi: 20000 });
    expect(r.availableEmi).toBe(30000);
    expect(r.eligibleAmount).toBeLessThan(calculateEligibility(base).eligibleAmount);
  });

  it('applies the LTV cap when the property is the binding constraint', () => {
    const r = calculateEligibility({ ...base, propertyValue: 5000000, ltvPct: 80 });
    expect(r.eligibleByLtv).toBe(4000000);
    expect(r.eligibleAmount).toBe(4000000);
    expect(r.cappedBy).toBe('property');
    expect(r.downPayment).toBe(1000000);
  });

  it('reports no eligibility when existing EMIs exhaust the capacity', () => {
    const r = calculateEligibility({ ...base, existingEmi: 60000 });
    expect(r.availableEmi).toBe(0);
    expect(r.qualifies).toBe(false);
  });
});

/* ================================================================== */
describe('HRA exemption', () => {
  it('takes the least of the three statutory limits', () => {
    // Basic 6L, HRA 2.4L, rent 3L, metro.
    // Limits: 240000 | 300000 − 60000 = 240000 | 50% of 6L = 300000 → 240000.
    const r = calculateHRA({
      basicSalary: 600000,
      dearnessAllowance: 0,
      hraReceived: 240000,
      rentPaid: 300000,
      metroCity: true,
      months: 12,
    });
    expect(r.exemptAmount).toBe(240000);
    expect(r.taxableHra).toBe(0);
    expect(r.cityRatePct).toBe(50);
  });

  it('uses 40% for a non-metro city', () => {
    const r = calculateHRA({
      basicSalary: 600000,
      dearnessAllowance: 0,
      hraReceived: 300000,
      rentPaid: 400000,
      metroCity: false,
      months: 12,
    });
    // Limits: 300000 | 400000 − 60000 = 340000 | 40% of 6L = 240000 → 240000.
    expect(r.cityRatePct).toBe(40);
    expect(r.exemptAmount).toBe(240000);
    expect(r.taxableHra).toBe(60000);
  });

  it('gives no exemption when rent is below 10% of salary', () => {
    const r = calculateHRA({
      basicSalary: 600000,
      dearnessAllowance: 0,
      hraReceived: 240000,
      rentPaid: 50000,
      metroCity: true,
      months: 12,
    });
    expect(r.exemptAmount).toBe(0);
    expect(r.noBenefit).toBe(true);
    expect(r.taxableHra).toBe(240000);
  });

  it('includes DA in the salary base', () => {
    const withDa = calculateHRA({
      basicSalary: 500000,
      dearnessAllowance: 100000,
      hraReceived: 400000,
      rentPaid: 500000,
      metroCity: true,
      months: 12,
    });
    expect(withDa.salaryForHra).toBe(600000);
    // 50% of 600000 = 300000 is the binding limit.
    expect(withDa.exemptAmount).toBe(300000);
  });

  it('pro-rates every figure for a part year', () => {
    const half = calculateHRA({
      basicSalary: 600000,
      dearnessAllowance: 0,
      hraReceived: 240000,
      rentPaid: 300000,
      metroCity: true,
      months: 6,
    });
    expect(half.salaryForHra).toBe(300000);
    expect(half.exemptAmount).toBe(120000);
  });

  it('marks exactly which limit applied', () => {
    const r = calculateHRA({
      basicSalary: 600000,
      dearnessAllowance: 0,
      hraReceived: 100000,
      rentPaid: 400000,
      metroCity: true,
      months: 12,
    });
    expect(r.exemptAmount).toBe(100000);
    expect(r.limits[0].applied).toBe(true);
  });
});

/* ================================================================== */
describe('TDS', () => {
  it('deducts 1% for an individual contractor under 194C', () => {
    const r = calculateTDS({
      sectionId: '194c',
      paymentAmount: 200000,
      previousPayments: 0,
      deducteeType: 'individual',
      panAvailable: true,
    });
    expect(r.applicableRate).toBe(1);
    expect(r.tdsAmount).toBe(2000);
    expect(r.netPayable).toBe(198000);
  });

  it('deducts 2% from a company under the same section', () => {
    const r = calculateTDS({
      sectionId: '194c',
      paymentAmount: 200000,
      previousPayments: 0,
      deducteeType: 'company',
      panAvailable: true,
    });
    expect(r.applicableRate).toBe(2);
    expect(r.tdsAmount).toBe(4000);
  });

  it('deducts nothing below the threshold', () => {
    const r = calculateTDS({
      sectionId: '194j-prof',
      paymentAmount: 20000,
      previousPayments: 0,
      deducteeType: 'individual',
      panAvailable: true,
    });
    expect(r.thresholdCrossed).toBe(false);
    expect(r.tdsAmount).toBe(0);
    expect(r.netPayable).toBe(20000);
  });

  it('taxes the whole payment once the aggregate crosses the threshold', () => {
    const r = calculateTDS({
      sectionId: '194j-prof',
      paymentAmount: 40000,
      previousPayments: 20000,
      deducteeType: 'individual',
      panAvailable: true,
    });
    expect(r.aggregateAmount).toBe(60000);
    expect(r.thresholdCrossed).toBe(true);
    // 10% of the current payment, not of the excess over the threshold.
    expect(r.tdsAmount).toBe(4000);
  });

  it('applies the 20% rate under section 206AA when no PAN is furnished', () => {
    const r = calculateTDS({
      sectionId: '194c',
      paymentAmount: 200000,
      previousPayments: 0,
      deducteeType: 'individual',
      panAvailable: false,
    });
    expect(r.panPenaltyApplied).toBe(true);
    expect(r.applicableRate).toBe(20);
    expect(r.tdsAmount).toBe(40000);
  });

  it('never lowers a rate already above 20% for a missing PAN', () => {
    const r = calculateTDS({
      sectionId: '194i-building',
      paymentAmount: 1000000,
      previousPayments: 0,
      deducteeType: 'individual',
      panAvailable: false,
    });
    // 194I(b) is 10%, so 206AA raises it to 20%.
    expect(r.applicableRate).toBe(20);
  });

  it('crosses on the single-payment threshold even below the annual one', () => {
    const r = calculateTDS({
      sectionId: '194c',
      paymentAmount: 35000,
      previousPayments: 0,
      deducteeType: 'individual',
      panAvailable: true,
    });
    // 35,000 exceeds the 30,000 single-payment limit for 194C.
    expect(r.thresholdCrossed).toBe(true);
    expect(r.tdsAmount).toBe(350);
  });
});

/* ================================================================== */
describe('Capital gains', () => {
  it('applies the 1.25 lakh exemption then 12.5% to equity LTCG', () => {
    const r = calculateCapitalGains({
      assetClass: 'equity',
      purchasePrice: 500000,
      salePrice: 900000,
      expenses: 0,
      holdingMonths: 24,
      slabRatePct: 30,
      exemptionUsed: 0,
    });
    expect(r.capitalGain).toBe(400000);
    expect(r.gainType).toBe('LTCG');
    expect(r.exemptionApplied).toBe(125000);
    expect(r.taxableGain).toBe(275000);
    expect(r.taxAmount).toBe(34375); // 12.5% of 275000
    expect(r.cess).toBe(1375); // 4%
    expect(r.totalTax).toBe(35750);
  });

  it('taxes equity STCG at 20% with no exemption', () => {
    const r = calculateCapitalGains({
      assetClass: 'equity',
      purchasePrice: 500000,
      salePrice: 900000,
      expenses: 0,
      holdingMonths: 6,
      slabRatePct: 30,
      exemptionUsed: 0,
    });
    expect(r.gainType).toBe('STCG');
    expect(r.exemptionApplied).toBe(0);
    expect(r.taxRatePct).toBe(20);
    expect(r.taxAmount).toBe(80000);
  });

  it('honours exemption already used elsewhere in the year', () => {
    const r = calculateCapitalGains({
      assetClass: 'equity',
      purchasePrice: 500000,
      salePrice: 900000,
      expenses: 0,
      holdingMonths: 24,
      slabRatePct: 30,
      exemptionUsed: 100000,
    });
    expect(r.exemptionAvailable).toBe(25000);
    expect(r.taxableGain).toBe(375000);
  });

  it('deducts transfer expenses from the gain', () => {
    const r = calculateCapitalGains({
      assetClass: 'property',
      purchasePrice: 5000000,
      salePrice: 8000000,
      expenses: 200000,
      holdingMonths: 36,
      slabRatePct: 30,
      exemptionUsed: 0,
    });
    expect(r.netSaleValue).toBe(7800000);
    expect(r.capitalGain).toBe(2800000);
    expect(r.taxRatePct).toBe(12.5);
  });

  it('taxes short-term property gains at the slab rate', () => {
    const r = calculateCapitalGains({
      assetClass: 'property',
      purchasePrice: 5000000,
      salePrice: 6000000,
      expenses: 0,
      holdingMonths: 12,
      slabRatePct: 30,
      exemptionUsed: 0,
    });
    expect(r.gainType).toBe('STCG');
    expect(r.taxRatePct).toBe(30);
    expect(r.taxAmount).toBe(300000);
    expect(r.monthsToLongTerm).toBe(12);
  });

  it('always taxes post-2023 debt funds at slab rate, however long held', () => {
    const long = calculateCapitalGains({
      assetClass: 'debt-mf',
      purchasePrice: 500000,
      salePrice: 700000,
      expenses: 0,
      holdingMonths: 60,
      slabRatePct: 30,
      exemptionUsed: 0,
    });
    expect(long.taxRatePct).toBe(30);
    expect(long.taxAmount).toBe(60000);
  });

  it('charges no tax on a capital loss', () => {
    const r = calculateCapitalGains({
      assetClass: 'equity',
      purchasePrice: 900000,
      salePrice: 500000,
      expenses: 0,
      holdingMonths: 24,
      slabRatePct: 30,
      exemptionUsed: 0,
    });
    expect(r.capitalGain).toBe(-400000);
    expect(r.taxableGain).toBe(0);
    expect(r.totalTax).toBe(0);
  });
});

/* ================================================================== */
describe('Profit margin', () => {
  const base = {
    revenue: 5000000,
    cogs: 3000000,
    operatingExpenses: 1200000,
    otherIncome: 0,
    interestExpense: 0,
    taxRatePct: 25,
  };

  it('walks revenue down to net profit', () => {
    const r = calculateProfitMargin(base);
    expect(r.grossProfit).toBe(2000000);
    expect(r.grossMarginPct).toBe(40);
    expect(r.operatingProfit).toBe(800000);
    expect(r.operatingMarginPct).toBe(16);
    expect(r.taxAmount).toBe(200000);
    expect(r.netProfit).toBe(600000);
    expect(r.netMarginPct).toBe(12);
  });

  it('distinguishes markup from margin', () => {
    const r = calculateProfitMargin({ ...base, cogs: 3000000 });
    // 20L profit on 30L cost is a 66.7% markup but a 40% margin.
    expect(near(r.markupPct, 66.667, 0.01)).toBe(true);
    expect(r.grossMarginPct).toBe(40);
  });

  it('charges no tax on a loss', () => {
    const r = calculateProfitMargin({ ...base, operatingExpenses: 3000000 });
    expect(r.profitBeforeTax).toBeLessThan(0);
    expect(r.taxAmount).toBe(0);
    expect(r.profitable).toBe(false);
  });

  it('adds other income and subtracts interest before tax', () => {
    const r = calculateProfitMargin({ ...base, otherIncome: 100000, interestExpense: 300000 });
    expect(r.profitBeforeTax).toBe(800000 + 100000 - 300000);
  });
});

/* ================================================================== */
describe('Break-even', () => {
  const base = {
    fixedCosts: 300000,
    pricePerUnit: 1000,
    variableCostPerUnit: 600,
    targetProfit: 0,
    expectedUnits: 1200,
  };

  it('divides fixed costs by contribution per unit', () => {
    const r = calculateBreakEven(base);
    expect(r.contributionPerUnit).toBe(400);
    expect(r.contributionMarginPct).toBe(40);
    expect(r.breakEvenUnits).toBe(750);
    expect(r.breakEvenRevenue).toBe(750000);
  });

  it('computes profit and margin of safety at expected volume', () => {
    const r = calculateBreakEven(base);
    // 1200 × 400 − 300000 = 180000.
    expect(r.expectedProfit).toBe(180000);
    expect(r.marginOfSafetyUnits).toBe(450);
    expect(near(r.marginOfSafetyPct, 37.5, 0.01)).toBe(true);
  });

  it('adds target profit to the fixed costs', () => {
    const r = calculateBreakEven({ ...base, targetProfit: 200000 });
    // (300000 + 200000) ÷ 400 = 1250.
    expect(r.unitsForTargetProfit).toBe(1250);
  });

  it('reports no break-even when variable cost meets or exceeds price', () => {
    const r = calculateBreakEven({ ...base, variableCostPerUnit: 1000 });
    expect(r.viable).toBe(false);
    expect(r.breakEvenUnits).toBe(0);
  });

  it('shows zero profit at the break-even volume', () => {
    const r = calculateBreakEven(base);
    const atBep = r.breakEvenUnits * r.contributionPerUnit - base.fixedCosts;
    expect(near(atBep, 0, 400)).toBe(true);
  });
});

/* ================================================================== */
describe('Depreciation', () => {
  const base = {
    assetCost: 1000000,
    salvageValue: 50000,
    usefulLife: 10,
    method: 'slm' as const,
    wdvRatePct: 15,
  };

  it('spreads the depreciable amount evenly under SLM', () => {
    const r = calculateDepreciation(base);
    // (1000000 − 50000) ÷ 10 = 95000 every year.
    expect(r.annualDepreciation).toBe(95000);
    expect(r.rows.every((x) => near(x.depreciation, 95000, 0.01))).toBe(true);
    expect(near(r.finalBookValue, 50000, 0.01)).toBe(true);
    expect(near(r.totalDepreciation, 950000, 0.01)).toBe(true);
  });

  it('front-loads the charge under WDV', () => {
    const r = calculateDepreciation({ ...base, method: 'wdv' });
    expect(r.rows[0].depreciation).toBe(150000); // 15% of 1000000
    expect(near(r.rows[1].depreciation, 127500, 0.01)).toBe(true); // 15% of 850000
    expect(r.rows[0].depreciation).toBeGreaterThan(r.rows[9].depreciation);
  });

  it('uses twice the straight-line rate for double declining', () => {
    const r = calculateDepreciation({ ...base, method: 'ddb' });
    // 2 ÷ 10 = 20% of the opening value.
    expect(r.rows[0].depreciation).toBe(200000);
  });

  it('never takes the book value below salvage', () => {
    const r = calculateDepreciation({ ...base, method: 'ddb' });
    expect(r.rows.every((x) => x.closingValue >= base.salvageValue - 0.01)).toBe(true);
  });

  it('keeps accumulated depreciation consistent with book value', () => {
    for (const method of ['slm', 'wdv', 'ddb'] as const) {
      const r = calculateDepreciation({ ...base, method });
      const last = r.rows[r.rows.length - 1];
      expect(near(base.assetCost - last.accumulated, last.closingValue, 0.01)).toBe(true);
    }
  });
});

/* ================================================================== */
describe('Construction material', () => {
  const base = {
    areaSqft: 1000,
    floors: 1,
    quality: 'standard' as const,
    cementRate: 400,
    sandRate: 60,
    aggregateRate: 55,
    steelRate: 70,
    brickRate: 9,
  };

  it('applies the standard per-sqft thumb rules', () => {
    const r = calculateConstruction(base);
    expect(near(r.cementBags, 400, 0.01)).toBe(true); // 0.40 × 1000
    expect(near(r.sandCft, 1800, 0.01)).toBe(true); // 1.80 × 1000
    expect(near(r.aggregateCft, 1350, 0.01)).toBe(true); // 1.35 × 1000
    expect(near(r.steelKg, 4000, 0.01)).toBe(true); // 4.00 × 1000
    expect(r.bricks).toBe(8000); // 8 × 1000
  });

  it('multiplies by the number of floors', () => {
    const r = calculateConstruction({ ...base, floors: 3 });
    expect(r.totalArea).toBe(3000);
    expect(near(r.cementBags, 1200, 0.01)).toBe(true);
  });

  it('scales quantities by build quality', () => {
    const economy = calculateConstruction({ ...base, quality: 'economy' });
    const premium = calculateConstruction({ ...base, quality: 'premium' });
    expect(economy.cementBags).toBeLessThan(400);
    expect(premium.cementBags).toBeGreaterThan(400);
  });

  it('prices the bill of materials at the rates given', () => {
    const r = calculateConstruction(base);
    const expected = 400 * 400 + 1800 * 60 + 1350 * 55 + 4000 * 70 + 8000 * 9;
    expect(near(r.materialCost, expected, 1)).toBe(true);
  });

  it('treats materials as 60% of the total build cost', () => {
    const r = calculateConstruction(base);
    expect(near(r.materialCost / r.estimatedTotalCost, 0.6, 0.001)).toBe(true);
    expect(near(r.materialCost + r.labourAndOther, r.estimatedTotalCost, 1)).toBe(true);
  });

  it('converts cubic feet to brass correctly', () => {
    const r = calculateConstruction(base);
    expect(near(r.sandBrass, 18, 0.01)).toBe(true); // 1800 cft ÷ 100
  });
});

/* ================================================================== */
describe('Electrical load', () => {
  it('sums connected load and applies the diversity factor', () => {
    const r = calculateElectricalLoad({
      quantities: { fans: 4, lights: 10 }, // 4×75 + 10×12 = 420 W
      tariffPerUnit: 8,
      fixedMonthlyCharge: 0,
      backupHours: 4,
    });
    expect(r.connectedLoadW).toBe(420);
    expect(near(r.demandKw, 0.252, 0.001)).toBe(true); // 420 × 0.6 ÷ 1000
  });

  it('converts watt-hours to units', () => {
    const r = calculateElectricalLoad({
      quantities: { geyser: 1 }, // 2000 W for 1 hour = 2 units
      tariffPerUnit: 8,
      fixedMonthlyCharge: 0,
      backupHours: 0,
    });
    expect(near(r.dailyUnits, 2, 0.001)).toBe(true);
    expect(near(r.monthlyUnits, 60, 0.01)).toBe(true);
    expect(near(r.monthlyBill, 480, 0.01)).toBe(true);
  });

  it('adds the fixed charge to the monthly bill', () => {
    const r = calculateElectricalLoad({
      quantities: { geyser: 1 },
      tariffPerUnit: 8,
      fixedMonthlyCharge: 150,
      backupHours: 0,
    });
    expect(near(r.monthlyBill, 630, 0.01)).toBe(true);
  });

  it('excludes heavy loads from the inverter sizing', () => {
    const withAc = calculateElectricalLoad({
      quantities: { fans: 4, ac: 2 },
      tariffPerUnit: 8,
      fixedMonthlyCharge: 0,
      backupHours: 4,
    });
    // Fans count as essential; the ACs do not.
    expect(withAc.essentialLoadW).toBe(300);
    expect(withAc.connectedLoadW).toBe(3300);
  });

  it('picks a standard MCB rating above the demand current', () => {
    const r = calculateElectricalLoad({
      quantities: { ac: 2, geyser: 1, fridge: 1 },
      tariffPerUnit: 8,
      fixedMonthlyCharge: 0,
      backupHours: 4,
    });
    expect(r.recommendedMcbAmps).toBeGreaterThanOrEqual(r.currentAmps);
    expect([6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100]).toContain(r.recommendedMcbAmps);
  });

  it('ignores appliances with a zero count', () => {
    const r = calculateElectricalLoad({
      quantities: { fans: 0, ac: 0 },
      tariffPerUnit: 8,
      fixedMonthlyCharge: 0,
      backupHours: 4,
    });
    expect(r.connectedLoadW).toBe(0);
    expect(r.lines).toHaveLength(0);
  });
});

/* ================================================================== */
describe('Net worth', () => {
  const base = {
    cash: 200000,
    deposits: 500000,
    investments: 1200000,
    retirement: 900000,
    realEstate: 6000000,
    gold: 400000,
    vehicles: 600000,
    otherAssets: 0,
    homeLoan: 3500000,
    carLoan: 300000,
    personalLoan: 0,
    creditCard: 25000,
    otherLiabilities: 0,
    monthlyIncome: 150000,
    monthlyExpenses: 80000,
  };

  it('subtracts liabilities from assets', () => {
    const r = calculateNetWorth(base);
    expect(r.totalAssets).toBe(9800000);
    expect(r.totalLiabilities).toBe(3825000);
    expect(r.netWorth).toBe(5975000);
  });

  it('counts only cash, deposits and market investments as liquid', () => {
    const r = calculateNetWorth(base);
    expect(r.liquidAssets).toBe(1900000);
    expect(r.liquidNetWorth).toBe(1900000 - 3825000);
  });

  it('measures the emergency fund in months of expenses', () => {
    const r = calculateNetWorth(base);
    expect(near(r.emergencyFundMonths, 1900000 / 80000, 0.001)).toBe(true);
  });

  it('computes debt-to-asset and real-estate concentration', () => {
    const r = calculateNetWorth(base);
    expect(near(r.debtToAssetPct, (3825000 / 9800000) * 100, 0.001)).toBe(true);
    expect(near(r.realEstateSharePct, (6000000 / 9800000) * 100, 0.001)).toBe(true);
  });

  it('handles negative net worth', () => {
    const r = calculateNetWorth({ ...base, homeLoan: 12000000 });
    expect(r.netWorth).toBeLessThan(0);
    expect(r.positive).toBe(false);
  });

  it('omits zero-valued lines from the breakdown', () => {
    const r = calculateNetWorth(base);
    expect(r.assetLines.every((l) => l.amount > 0)).toBe(true);
    expect(r.liabilityLines.map((l) => l.label)).not.toContain('Personal loan');
  });

  it('shares of each line add up to 100%', () => {
    const r = calculateNetWorth(base);
    const total = r.assetLines.reduce((s, l) => s + l.sharePct, 0);
    expect(near(total, 100, 0.001)).toBe(true);
  });
});
