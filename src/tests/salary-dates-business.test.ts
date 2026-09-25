import {
  calculateCTC,
  calculateGratuity,
  calculateIncrement,
  incrementPctBetween,
  calculateLeaveEncashment,
  calculateSalary,
} from '@/engines/salary';
import { calculateAge, calendarDiff, dateDifference, daysBetween, parseDate } from '@/engines/dates';
import {
  calculateCommission,
  calculateGST,
  calculateMarkup,
  calculatePercentage,
  calculateROI,
} from '@/engines/business';
import { calculateBMI, convertCurrency } from '@/engines/everyday';

describe('salary', () => {
  const input = {
    monthlyGross: 100000,
    basicPct: 40,
    hraPct: 50,
    pfOnCeiling: false,
    professionalTaxMonthly: 200,
    otherDeductionsMonthly: 0,
    regime: 'new' as const,
    fyId: '2026-27',
  };

  it('splits gross into basic, HRA and special allowance', () => {
    const r = calculateSalary(input);
    expect(r.basic).toBe(40000);
    expect(r.hra).toBe(20000);
    expect(r.specialAllowance).toBe(40000);
    expect(r.basic + r.hra + r.specialAllowance).toBe(100000);
  });

  it('deducts 12% PF on basic', () => {
    const r = calculateSalary(input);
    expect(r.employeePF).toBe(4800);
    expect(r.employerPF).toBe(4800);
  });

  it('restricts PF to the ₹15,000 wage ceiling when selected', () => {
    const r = calculateSalary({ ...input, pfOnCeiling: true });
    expect(r.employeePF).toBe(1800);
  });

  it('leaves take-home below gross and above zero', () => {
    const r = calculateSalary(input);
    expect(r.monthlyNet).toBeLessThan(r.monthlyGross);
    expect(r.monthlyNet).toBeGreaterThan(0);
    expect(r.monthlyNet).toBeCloseTo(
      r.monthlyGross - r.employeePF - r.professionalTax - r.monthlyIncomeTax,
      6,
    );
  });
});

describe('CTC to in-hand', () => {
  const input = {
    annualCTC: 1800000,
    basicPctOfCTC: 40,
    hraPctOfBasic: 50,
    includesGratuity: true,
    pfOnCeiling: false,
    otherEmployerBenefits: 0,
    professionalTaxAnnual: 2400,
    regime: 'new' as const,
    fyId: '2026-27',
  };

  it('removes employer costs to reach gross salary', () => {
    const r = calculateCTC(input);
    expect(r.basic).toBe(720000);
    expect(r.employerPF).toBeCloseTo(86400, 2);
    expect(r.gratuity).toBeCloseTo(34632, 0);
    expect(r.grossSalary).toBeCloseTo(1800000 - r.employerPF - r.gratuity, 2);
  });

  it('keeps in-hand between 60% and 90% of CTC for a typical structure', () => {
    const r = calculateCTC(input);
    expect(r.inHandPctOfCTC).toBeGreaterThan(60);
    expect(r.inHandPctOfCTC).toBeLessThan(90);
  });

  it('raises gross salary when gratuity is excluded from CTC', () => {
    const withG = calculateCTC(input);
    const withoutG = calculateCTC({ ...input, includesGratuity: false });
    expect(withoutG.grossSalary).toBeGreaterThan(withG.grossSalary);
    expect(withoutG.gratuity).toBe(0);
  });
});

describe('gratuity', () => {
  it('uses the 15/26 formula and rounds a part-year up', () => {
    const r = calculateGratuity({ monthlyBasicDA: 60000, years: 7, months: 8, coveredUnderAct: true });
    expect(r.roundedYears).toBe(8);
    expect(r.gratuity).toBeCloseTo((15 / 26) * 60000 * 8, 2);
    expect(r.taxable).toBe(0);
  });

  it('does not round up below six months', () => {
    const r = calculateGratuity({ monthlyBasicDA: 60000, years: 7, months: 5, coveredUnderAct: true });
    expect(r.roundedYears).toBe(7);
  });

  it('uses 15/30 for employers outside the Act', () => {
    const r = calculateGratuity({ monthlyBasicDA: 60000, years: 8, months: 0, coveredUnderAct: false });
    expect(r.gratuity).toBeCloseTo((15 / 30) * 60000 * 8, 2);
  });

  it('pays nothing below five years of service', () => {
    const r = calculateGratuity({ monthlyBasicDA: 60000, years: 4, months: 11, coveredUnderAct: true });
    expect(r.eligible).toBe(false);
    expect(r.gratuity).toBe(0);
  });

  it('caps the exemption at ₹20 lakh', () => {
    const r = calculateGratuity({ monthlyBasicDA: 500000, years: 30, months: 0, coveredUnderAct: true });
    expect(r.exempt).toBe(2000000);
    expect(r.taxable).toBeCloseTo(r.gratuity - 2000000, 2);
  });
});

describe('increment and leave encashment', () => {
  it('applies the increment and compounds the projection', () => {
    const r = calculateIncrement({ currentSalary: 80000, incrementPct: 10, basis: 'monthly', projectionYears: 5 });
    expect(r.newMonthly).toBeCloseTo(88000, 2);
    expect(r.increaseAnnual).toBeCloseTo(96000, 2);
    expect(r.rows[4].monthly).toBeCloseTo(80000 * Math.pow(1.1, 5), 2);
  });

  it('converts an annual salary to monthly', () => {
    const r = calculateIncrement({ currentSalary: 1200000, incrementPct: 10, basis: 'annual', projectionYears: 1 });
    expect(r.currentMonthly).toBe(100000);
  });

  it('derives the increment percentage from two salaries', () => {
    expect(incrementPctBetween(100000, 110000)).toBeCloseTo(10, 6);
    expect(incrementPctBetween(95000, 105000)).toBeCloseTo(10.5263, 4);
    expect(incrementPctBetween(100000, 100000)).toBe(0);
  });

  it('reports a pay cut as a negative increment', () => {
    expect(incrementPctBetween(100000, 90000)).toBeCloseTo(-10, 6);
  });

  it('does not divide by a zero previous salary', () => {
    expect(incrementPctBetween(0, 50000)).toBe(0);
    expect(incrementPctBetween(-1, 50000)).toBe(0);
  });

  it('round-trips: the derived percentage rebuilds the new salary', () => {
    const pct = incrementPctBetween(100000, 110000);
    const r = calculateIncrement({
      currentSalary: 100000,
      incrementPct: pct,
      basis: 'monthly',
      projectionYears: 3,
      mode: 'reverse',
    });
    expect(r.newMonthly).toBeCloseTo(110000, 2);
    expect(r.increaseMonthly).toBeCloseTo(10000, 2);
    expect(r.increaseAnnual).toBeCloseTo(120000, 2);
    expect(r.mode).toBe('reverse');
  });

  it('values leave at basic ÷ 30 per day', () => {
    const r = calculateLeaveEncashment({
      monthlyBasicDA: 60000,
      leaveDays: 45,
      yearsOfService: 8,
      governmentEmployee: false,
      leaveEntitlementPerYear: 30,
    });
    expect(r.perDayWage).toBe(2000);
    expect(r.amount).toBe(90000);
    expect(r.exempt).toBe(90000); // below every limit
    expect(r.taxable).toBe(0);
  });

  it('caps the exemption by the 30-days-per-year limit', () => {
    const r = calculateLeaveEncashment({
      monthlyBasicDA: 60000,
      leaveDays: 300,
      yearsOfService: 6,
      governmentEmployee: false,
      leaveEntitlementPerYear: 30,
    });
    expect(r.amount).toBe(600000);
    expect(r.exempt).toBe(360000); // 2,000 × 30 × 6
    expect(r.taxable).toBe(240000);
  });

  it('exempts government employees entirely', () => {
    const r = calculateLeaveEncashment({
      monthlyBasicDA: 60000,
      leaveDays: 300,
      yearsOfService: 6,
      governmentEmployee: true,
      leaveEntitlementPerYear: 30,
    });
    expect(r.taxable).toBe(0);
  });
});

describe('dates', () => {
  it('calculates an exact calendar age', () => {
    const r = calculateAge('1994-05-12', '2026-09-24');
    expect(r.years).toBe(32);
    expect(r.months).toBe(4);
    expect(r.days).toBe(12);
    expect(r.bornOn).toBe('Thursday');
  });

  it('borrows correctly when the day is earlier in the month', () => {
    expect(calendarDiff(new Date(2024, 0, 31), new Date(2024, 2, 1))).toEqual({ years: 0, months: 1, days: 1 });
  });

  it('counts leap days', () => {
    expect(daysBetween(new Date(2024, 0, 1), new Date(2025, 0, 1))).toBe(366);
    expect(daysBetween(new Date(2023, 0, 1), new Date(2024, 0, 1))).toBe(365);
  });

  it('flags a date of birth in the future', () => {
    const r = calculateAge('2030-01-01', '2026-09-24');
    expect(r.future).toBe(true);
  });

  it('finds the next birthday and the days to it', () => {
    const r = calculateAge('1994-12-25', '2026-09-24');
    expect(r.nextBirthday?.getFullYear()).toBe(2026);
    expect(r.daysToNextBirthday).toBe(92);
    expect(r.turningAge).toBe(32);
  });

  it('rejects an invalid date', () => {
    expect(parseDate('2026-02-30')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(calculateAge('not-a-date', '2026-09-24').valid).toBe(false);
  });

  it('measures the difference between two dates', () => {
    const r = dateDifference('2026-04-01', '2026-06-30', false);
    expect(r.totalDays).toBe(90);
    expect(r.months).toBe(2);
    expect(r.days).toBe(29);
    expect(r.weekdays + r.weekendDays).toBe(90);
  });

  it('adds a day when both dates are counted', () => {
    const r = dateDifference('2026-04-01', '2026-06-30', true);
    expect(r.totalDays).toBe(91);
  });

  it('swaps reversed dates instead of going negative', () => {
    const r = dateDifference('2026-06-30', '2026-04-01', false);
    expect(r.reversed).toBe(true);
    expect(r.totalDays).toBe(90);
  });
});

describe('GST', () => {
  it('adds GST to a base price', () => {
    const r = calculateGST({ amount: 10000, ratePct: 18, mode: 'add', supply: 'intra' });
    expect(r.gstAmount).toBe(1800);
    expect(r.totalAmount).toBe(11800);
    expect(r.cgst).toBe(900);
    expect(r.sgst).toBe(900);
    expect(r.igst).toBe(0);
  });

  it('extracts GST from an inclusive price', () => {
    const r = calculateGST({ amount: 11800, ratePct: 18, mode: 'remove', supply: 'intra' });
    expect(r.baseAmount).toBeCloseTo(10000, 6);
    expect(r.gstAmount).toBeCloseTo(1800, 6);
  });

  it('charges IGST on interstate supply', () => {
    const r = calculateGST({ amount: 10000, ratePct: 18, mode: 'add', supply: 'inter' });
    expect(r.igst).toBe(1800);
    expect(r.cgst).toBe(0);
  });

  it('handles a nil rate', () => {
    const r = calculateGST({ amount: 10000, ratePct: 0, mode: 'add', supply: 'intra' });
    expect(r.gstAmount).toBe(0);
    expect(r.totalAmount).toBe(10000);
  });
});

describe('ROI, percentage, markup, commission', () => {
  it('computes ROI and annualised return', () => {
    const r = calculateROI({ amountInvested: 500000, currentValue: 850000, years: 4, additionalCosts: 0 });
    expect(r.roiPct).toBeCloseTo(70, 6);
    expect(r.annualisedPct).toBeCloseTo(14.186, 2);
    expect(r.multiple).toBeCloseTo(1.7, 6);
  });

  it('counts additional costs against the return', () => {
    const r = calculateROI({ amountInvested: 500000, currentValue: 850000, years: 4, additionalCosts: 100000 });
    expect(r.totalCost).toBe(600000);
    expect(r.roiPct).toBeCloseTo(41.667, 2);
  });

  it('reports a loss without breaking', () => {
    const r = calculateROI({ amountInvested: 500000, currentValue: 300000, years: 2, additionalCosts: 0 });
    expect(r.profitable).toBe(false);
    expect(r.netGain).toBe(-200000);
  });

  it('runs the five percentage operations', () => {
    expect(calculatePercentage({ mode: 'percentOf', a: 15, b: 2500 }).value).toBeCloseTo(375, 6);
    expect(calculatePercentage({ mode: 'isWhatPercent', a: 375, b: 2500 }).value).toBeCloseTo(15, 6);
    expect(calculatePercentage({ mode: 'change', a: 2500, b: 2875 }).value).toBeCloseTo(15, 6);
    expect(calculatePercentage({ mode: 'increase', a: 2500, b: 15 }).value).toBeCloseTo(2875, 6);
    expect(calculatePercentage({ mode: 'decrease', a: 2500, b: 15 }).value).toBeCloseTo(2125, 6);
  });

  it('does not divide by zero in percentage mode', () => {
    expect(calculatePercentage({ mode: 'isWhatPercent', a: 100, b: 0 }).value).toBe(0);
    expect(calculatePercentage({ mode: 'change', a: 0, b: 100 }).value).toBe(0);
  });

  it('separates markup from margin', () => {
    const r = calculateMarkup({ mode: 'fromMarkup', cost: 1000, markupPct: 40, sellingPrice: 0, marginPct: 0 });
    expect(r.sellingPrice).toBeCloseTo(1400, 6);
    expect(r.markupPct).toBeCloseTo(40, 6);
    expect(r.marginPct).toBeCloseTo(28.5714, 3);
  });

  it('prices to a target margin', () => {
    const r = calculateMarkup({ mode: 'fromMargin', cost: 1000, markupPct: 0, sellingPrice: 0, marginPct: 30 });
    expect(r.sellingPrice).toBeCloseTo(1428.571, 2);
    expect(r.marginPct).toBeCloseTo(30, 4);
  });

  it('derives markup and margin from a known price', () => {
    const r = calculateMarkup({ mode: 'fromPrice', cost: 1000, markupPct: 0, sellingPrice: 1400, marginPct: 0 });
    expect(r.markupPct).toBeCloseTo(40, 6);
    expect(r.profit).toBe(400);
  });

  it('splits commission and reports the net to the seller', () => {
    const r = calculateCommission({ saleValue: 5000000, commissionPct: 2, flatFee: 0, splitPct: 50, units: 1 });
    expect(r.grossCommission).toBe(100000);
    expect(r.yourShare).toBe(50000);
    expect(r.partnerShare).toBe(50000);
    expect(r.netToSeller).toBe(4900000);
  });

  it('includes a flat fee in the effective rate', () => {
    const r = calculateCommission({ saleValue: 1000000, commissionPct: 1, flatFee: 5000, splitPct: 100, units: 1 });
    expect(r.grossCommission).toBe(15000);
    expect(r.effectiveRatePct).toBeCloseTo(1.5, 6);
  });
});

describe('everyday', () => {
  it('calculates BMI in metric units', () => {
    const r = calculateBMI({
      unit: 'metric',
      heightCm: 170,
      weightKg: 70,
      heightFt: 0,
      heightIn: 0,
      weightLb: 0,
      scale: 'who',
    });
    expect(r.bmi).toBeCloseTo(24.22, 2);
    expect(r.category).toBe('Normal');
  });

  it('applies the stricter Asian-Indian cut-offs', () => {
    const r = calculateBMI({
      unit: 'metric',
      heightCm: 170,
      weightKg: 70,
      heightFt: 0,
      heightIn: 0,
      weightLb: 0,
      scale: 'asian',
    });
    expect(r.category).toBe('Overweight');
    expect(r.healthyMaxKg).toBeCloseTo(23 * 1.7 * 1.7, 4);
  });

  it('converts imperial input to the same BMI', () => {
    const metric = calculateBMI({
      unit: 'metric',
      heightCm: 170.18,
      weightKg: 69.85,
      heightFt: 0,
      heightIn: 0,
      weightLb: 0,
      scale: 'who',
    });
    const imperial = calculateBMI({
      unit: 'imperial',
      heightCm: 0,
      weightKg: 0,
      heightFt: 5,
      heightIn: 7,
      weightLb: 154,
      scale: 'who',
    });
    expect(imperial.bmi).toBeCloseTo(metric.bmi, 1);
  });

  it('does not divide by zero when height is missing', () => {
    const r = calculateBMI({
      unit: 'metric',
      heightCm: 0,
      weightKg: 70,
      heightFt: 0,
      heightIn: 0,
      weightLb: 0,
      scale: 'who',
    });
    expect(r.bmi).toBe(0);
    expect(r.category).toBe('—');
  });

  it('applies forex markup and fees', () => {
    const r = convertCurrency({ amount: 1000, rate: 88, markupPct: 2, flatFee: 0, from: 'USD', to: 'INR' });
    expect(r.effectiveRate).toBeCloseTo(86.24, 6);
    expect(r.converted).toBeCloseTo(86240, 6);
    expect(r.totalCost).toBeCloseTo(1760, 6);
  });

  it('deducts a fixed fee before converting', () => {
    const r = convertCurrency({ amount: 1000, rate: 88, markupPct: 0, flatFee: 50, from: 'USD', to: 'INR' });
    expect(r.amountAfterFee).toBe(950);
    expect(r.converted).toBeCloseTo(83600, 6);
  });
});
