import { calculateTax, compareRegimes, hraExemptionFor, slabTaxFor } from '@/engines/tax';
import { getFinancialYear } from '@/data/taxRules';
import type { TaxInput } from '@/engines/tax';

const base = (over: Partial<TaxInput> = {}): TaxInput => ({
  fyId: '2026-27',
  regime: 'new',
  ageGroup: 'below60',
  salaryIncome: 0,
  basicSalary: 0,
  hraReceived: 0,
  rentPaid: 0,
  metroCity: true,
  interestIncome: 0,
  rentalIncome: 0,
  otherIncome: 0,
  ltcgEquity: 0,
  stcgEquity: 0,
  deductions: {},
  ...over,
});

describe('income tax — new regime, FY 2026-27', () => {
  it('taxes a ₹15,00,000 salary at ₹97,500', () => {
    // 75,000 standard deduction → 14,25,000 taxable
    // 5% of 4L = 20,000 + 10% of 4L = 40,000 + 15% of 2.25L = 33,750 → 93,750 + 4% cess
    const r = calculateTax(base({ salaryIncome: 1500000 }));
    expect(r.taxableIncome).toBe(1425000);
    expect(r.slabTax).toBe(93750);
    expect(r.cess).toBe(3750);
    expect(r.totalTax).toBe(97500);
  });

  it('leaves a ₹12,75,000 salary completely tax-free via the 87A rebate', () => {
    const r = calculateTax(base({ salaryIncome: 1275000 }));
    expect(r.taxableIncome).toBe(1200000);
    expect(r.slabTax).toBe(60000);
    expect(r.rebate).toBe(60000);
    expect(r.totalTax).toBe(0);
  });

  it('applies marginal relief just above the rebate threshold', () => {
    // Taxable 12,10,000: tax would be 61,500, but the excess income is only 10,000.
    const r = calculateTax(base({ salaryIncome: 1285000 }));
    expect(r.taxableIncome).toBe(1210000);
    expect(r.marginalReliefRebate).toBeGreaterThan(0);
    expect(r.taxAfterRebate).toBe(10000);
    expect(r.totalTax).toBe(10400); // + 4% cess
  });

  it('charges 10% surcharge above ₹50 lakh', () => {
    const r = calculateTax(base({ salaryIncome: 6000000 }));
    expect(r.taxableIncome).toBe(5925000);
    expect(r.slabTax).toBe(1357500);
    expect(r.surchargeRate).toBe(10);
    expect(r.surcharge).toBe(135750);
    expect(r.totalTax).toBe(1552980);
  });

  it('caps surcharge at 25% even for very high incomes', () => {
    const r = calculateTax(base({ salaryIncome: 100000000 }));
    expect(r.surchargeRate).toBe(25);
  });

  it('ignores old-regime deductions', () => {
    const withDeductions = calculateTax(base({ salaryIncome: 1500000, deductions: { sec80C: 150000 } }));
    const without = calculateTax(base({ salaryIncome: 1500000 }));
    expect(withDeductions.totalTax).toBe(without.totalTax);
  });
});

describe('income tax — old regime', () => {
  it('taxes a ₹10,00,000 salary with full 80C at ₹75,400', () => {
    // 10,00,000 − 50,000 SD − 1,50,000 80C = 8,00,000 taxable
    // 5% of 2.5L = 12,500 + 20% of 3L = 60,000 → 72,500 + 4% cess = 75,400
    const r = calculateTax(base({ regime: 'old', salaryIncome: 1000000, deductions: { sec80C: 150000 } }));
    expect(r.taxableIncome).toBe(800000);
    expect(r.slabTax).toBe(72500);
    expect(r.totalTax).toBe(75400);
  });

  it('gives the 87A rebate below ₹5,00,000 taxable income', () => {
    const r = calculateTax(base({ regime: 'old', salaryIncome: 550000, deductions: { sec80C: 50000 } }));
    expect(r.taxableIncome).toBe(450000);
    expect(r.totalTax).toBe(0);
  });

  it('uses the higher exemption limit for senior citizens', () => {
    const normal = calculateTax(base({ regime: 'old', ageGroup: 'below60', salaryIncome: 800000 }));
    const senior = calculateTax(base({ regime: 'old', ageGroup: 'senior', salaryIncome: 800000 }));
    expect(senior.totalTax).toBeLessThan(normal.totalTax);
    expect(normal.totalTax - senior.totalTax).toBe(2600); // 50,000 × 5% + cess
  });

  it('caps a deduction at its statutory ceiling', () => {
    const r = calculateTax(base({ regime: 'old', salaryIncome: 1500000, deductions: { sec80C: 500000 } }));
    const capped = r.deductionItems.find((d) => d.label.includes('80C'));
    expect(capped?.amount).toBe(150000);
  });

  it('never lets deductions push taxable income below zero', () => {
    const r = calculateTax(base({ regime: 'old', salaryIncome: 300000, deductions: { sec80C: 150000, sec80D: 100000 } }));
    expect(r.taxableIncome).toBe(0);
    expect(r.totalTax).toBe(0);
  });
});

describe('HRA exemption u/s 10(13A)', () => {
  it('takes the least of the three limits', () => {
    expect(hraExemptionFor(600000, 240000, 300000, true)).toBe(240000);
  });

  it('uses 40% of basic outside metros', () => {
    expect(hraExemptionFor(600000, 300000, 400000, false)).toBe(240000);
  });

  it('is nil when no rent is paid', () => {
    expect(hraExemptionFor(600000, 240000, 0, true)).toBe(0);
  });

  it('never goes negative when rent is below 10% of basic', () => {
    expect(hraExemptionFor(600000, 240000, 30000, true)).toBe(0);
  });
});

describe('capital gains', () => {
  it('exempts the first ₹1.25 lakh of equity LTCG and taxes the rest at 12.5%', () => {
    const r = calculateTax(base({ salaryIncome: 1500000, ltcgEquity: 325000 }));
    const taxable = 325000 - 125000;
    expect(r.specialTax).toBeCloseTo(taxable * 0.125, 2);
  });

  it('taxes equity STCG at a flat 20%', () => {
    const r = calculateTax(base({ salaryIncome: 1500000, stcgEquity: 200000 }));
    expect(r.specialTax).toBeCloseTo(40000, 2);
  });

  it('sets unused basic exemption against capital gains', () => {
    const r = calculateTax(base({ salaryIncome: 0, stcgEquity: 500000 }));
    // 4,00,000 basic exemption absorbed first, 1,00,000 taxed at 20%
    expect(r.specialTax).toBeCloseTo(20000, 2);
  });

  it('does not allow the 87A rebate against capital gains tax', () => {
    const r = calculateTax(base({ salaryIncome: 500000, ltcgEquity: 1000000 }));
    expect(r.totalTax).toBeGreaterThan(0);
  });
});

describe('slab engine', () => {
  it('splits income band by band', () => {
    const { rows, tax } = slabTaxFor(1425000, getFinancialYear('2026-27').regimes.new.slabs.below60);
    expect(tax).toBe(93750);
    expect(rows[0].tax).toBe(0);
    expect(rows[1].taxableInSlab).toBe(400000);
  });

  it('returns zero tax for zero income', () => {
    expect(slabTaxFor(0, getFinancialYear('2026-27').regimes.old.slabs.below60).tax).toBe(0);
  });
});

describe('regime comparison', () => {
  it('prefers the new regime when there is nothing to deduct', () => {
    const c = compareRegimes(base({ salaryIncome: 1500000 }));
    expect(c.betterRegime).toBe('new');
    expect(c.difference).toBeGreaterThan(0);
  });

  it('prefers the old regime when deductions are large', () => {
    const c = compareRegimes(
      base({
        salaryIncome: 1500000,
        basicSalary: 600000,
        hraReceived: 300000,
        rentPaid: 400000,
        deductions: { sec80C: 150000, sec80D: 50000, homeLoanInterest: 200000, sec80CCD1B: 50000 },
      }),
    );
    expect(c.betterRegime).toBe('old');
  });
});

describe('financial year configuration', () => {
  it('uses the older new-regime slabs for FY 2024-25', () => {
    const r = calculateTax(base({ fyId: '2024-25', salaryIncome: 1275000 }));
    expect(r.totalTax).toBeGreaterThan(0); // the ₹12L rebate did not exist yet
    expect(r.taxableIncome).toBe(1200000);
  });

  it('falls back to the default year for an unknown id', () => {
    const r = calculateTax(base({ fyId: 'nope' }));
    expect(r.fyLabel).toBe('FY 2026-27');
  });
});
