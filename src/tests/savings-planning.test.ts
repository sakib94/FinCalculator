import { calculatePostOffice, calculateRD, calculateSimpleInterest, kvpMonths } from '@/engines/savings';
import { calculateCAGR, calculateGoalSIP, calculateStockAverage } from '@/engines/planning';
import { calculateSIP } from '@/engines/investment';
import { calculateFlatRate, impliedReducingRate } from '@/engines/loanTools';
import { emiAmount } from '@/engines/emi';
import { calculateDiscount } from '@/engines/businessPlus';
import { sliderScale } from '@/lib/slider';
import { searchFromValues, valuesFromSearch } from '@/lib/scenario';
import { ALIASES, CALCULATORS, CATEGORIES, relatedTo, searchCalculators } from '@/data/catalog';
import { REGISTRY } from '@/calculators';
import type { Field } from '@/calculators/types';

/* ------------------------------------------------------------------ */

describe('recurring deposit', () => {
  it('matches the closed form banks publish', () => {
    const r = calculateRD({ monthlyDeposit: 1000, annualRatePct: 6.7, months: 60 });
    const i = 0.067 / 4;
    const published = (1000 * (Math.pow(1 + i, 20) - 1)) / (1 - Math.pow(1 + i, -1 / 3));
    expect(r.maturity).toBeCloseTo(published, 6);
  });

  it('equals the sum of each instalment compounded quarterly', () => {
    const r = calculateRD({ monthlyDeposit: 2500, annualRatePct: 7.25, months: 36 });
    let sum = 0;
    for (let k = 1; k <= 36; k++) sum += 2500 * Math.pow(1 + 0.0725 / 4, k / 3);
    expect(r.maturity).toBeCloseTo(sum, 6);
  });

  it('gives the Post Office 5-year RD figure (₹1,000 a month → ₹71,366)', () => {
    const r = calculateRD({ monthlyDeposit: 1000, annualRatePct: 6.7, months: 60 });
    expect(Math.round(r.maturity)).toBe(71366);
    expect(r.totalDeposited).toBe(60000);
  });

  it('builds year rows that end on the maturity value', () => {
    const r = calculateRD({ monthlyDeposit: 5000, annualRatePct: 6.7, months: 30 });
    expect(r.rows).toHaveLength(3);
    expect(r.rows[2].balance).toBeCloseTo(r.maturity, 6);
    expect(r.rows[2].deposited).toBe(150000);
  });

  it('returns deposits unchanged at a zero rate', () => {
    const r = calculateRD({ monthlyDeposit: 1000, annualRatePct: 0, months: 12 });
    expect(r.maturity).toBe(12000);
    expect(r.interest).toBe(0);
  });

  it('reports an effective yield above the quoted rate', () => {
    const r = calculateRD({ monthlyDeposit: 1000, annualRatePct: 6.7, months: 60 });
    expect(r.effectiveYieldPct).toBeGreaterThan(6.7);
    expect(r.effectiveYieldPct).toBeLessThan(7);
  });
});

describe('simple interest', () => {
  it('applies P × R × T ÷ 100', () => {
    const r = calculateSimpleInterest({ principal: 100000, annualRatePct: 8, time: 3, timeUnit: 'years' });
    expect(r.interest).toBeCloseTo(24000, 6);
    expect(r.amount).toBeCloseTo(124000, 6);
  });

  it('converts months and days', () => {
    expect(
      calculateSimpleInterest({ principal: 100000, annualRatePct: 8, time: 18, timeUnit: 'months' }).interest,
    ).toBeCloseTo(12000, 6);
    expect(
      calculateSimpleInterest({ principal: 100000, annualRatePct: 8, time: 365, timeUnit: 'days' }).interest,
    ).toBeCloseTo(8000, 6);
  });

  it('shows what yearly compounding would add', () => {
    const r = calculateSimpleInterest({ principal: 100000, annualRatePct: 8, time: 3, timeUnit: 'years' });
    expect(r.compoundAmount).toBeCloseTo(125971.2, 4);
    expect(r.compoundingAdvantage).toBeCloseTo(1971.2, 4);
  });
});

describe('post office schemes', () => {
  it('NSC: ₹1,000 at 7.7% grows to ₹1,449.03 in 5 years', () => {
    const r = calculatePostOffice({ scheme: 'nsc', amount: 1000, annualRatePct: 7.7 });
    expect(r.months).toBe(60);
    expect(r.maturity).toBeCloseTo(1449.03, 2);
  });

  it('KVP doubles in 115 months at 7.5%', () => {
    expect(kvpMonths(7.5)).toBe(115);
    const r = calculatePostOffice({ scheme: 'kvp', amount: 50000, annualRatePct: 7.5 });
    expect(r.maturity).toBe(100000);
    expect(r.months).toBe(115);
  });

  it('MIS pays rate ÷ 12 every month', () => {
    const r = calculatePostOffice({ scheme: 'mis', amount: 900000, annualRatePct: 7.4 });
    expect(r.payout).toBeCloseTo(5550, 6);
    expect(r.payoutLabel).toBe('Monthly');
    expect(r.totalInterest).toBeCloseTo(333000, 4);
    expect(r.maturity).toBe(900000);
  });

  it('SCSS pays rate ÷ 4 every quarter', () => {
    const r = calculatePostOffice({ scheme: 'scss', amount: 3000000, annualRatePct: 8.2 });
    expect(r.payout).toBeCloseTo(61500, 6);
    expect(r.payoutLabel).toBe('Quarterly');
  });

  it('Time Deposits compound quarterly but pay yearly (India Post: ₹10,000 → ₹708 / ₹771)', () => {
    expect(Math.round(calculatePostOffice({ scheme: 'td1', amount: 10000, annualRatePct: 6.9 }).payout)).toBe(708);
    expect(Math.round(calculatePostOffice({ scheme: 'td5', amount: 10000, annualRatePct: 7.5 }).payout)).toBe(771);
  });
});

describe('CAGR', () => {
  it('doubling in five years is 14.87%', () => {
    const r = calculateCAGR({ mode: 'rate', initial: 100000, final: 200000, ratePct: 0, years: 5, inflationPct: 0 });
    expect(r.cagrPct).toBeCloseTo(14.87, 2);
    expect(r.multiple).toBe(2);
    expect(r.doublingYears).toBeCloseTo(5, 6);
  });

  it('projects a future value at a given rate', () => {
    const r = calculateCAGR({ mode: 'value', initial: 100000, final: 0, ratePct: 12, years: 10, inflationPct: 0 });
    expect(r.final).toBeCloseTo(310584.82, 1);
  });

  it('reports the real rate after inflation', () => {
    const r = calculateCAGR({ mode: 'value', initial: 100, final: 0, ratePct: 12, years: 1, inflationPct: 6 });
    expect(r.realCagrPct).toBeCloseTo(5.66, 2);
  });

  it('handles a loss', () => {
    const r = calculateCAGR({ mode: 'rate', initial: 100000, final: 81000, ratePct: 0, years: 2, inflationPct: 0 });
    expect(r.cagrPct).toBeCloseTo(-10, 6);
    expect(r.doublingYears).toBe(0);
  });
});

describe('goal SIP', () => {
  it('the SIP it prescribes actually reaches the goal', () => {
    const r = calculateGoalSIP({
      goalToday: 2500000,
      years: 12,
      expectedReturnPct: 12,
      inflationPct: 6,
      existingSavings: 0,
      annualStepUpPct: 0,
    });
    expect(r.goalFuture).toBeCloseTo(2500000 * Math.pow(1.06, 12), 4);
    const check = calculateSIP({ monthlyInvestment: r.monthlySip, expectedReturnPct: 12, years: 12, annualStepUpPct: 0 });
    expect(check.futureValue).toBeCloseTo(r.goalFuture, 2);
    expect(Math.round(r.monthlySip / 100) * 100).toBe(15600);
  });

  it('works with a step-up and existing savings', () => {
    const r = calculateGoalSIP({
      goalToday: 5000000,
      years: 15,
      expectedReturnPct: 11,
      inflationPct: 5,
      existingSavings: 500000,
      annualStepUpPct: 10,
    });
    const sip = calculateSIP({ monthlyInvestment: r.monthlySip, expectedReturnPct: 11, years: 15, annualStepUpPct: 10 });
    expect(sip.futureValue + r.existingFuture).toBeCloseTo(r.goalFuture, 2);
    expect(r.finalMonthlySip).toBeGreaterThan(r.monthlySip);
  });

  it('needs ~₹10,000 a month for ₹1 crore in 20 years at 12%', () => {
    const r = calculateGoalSIP({
      goalToday: 10000000,
      years: 20,
      expectedReturnPct: 12,
      inflationPct: 0,
      existingSavings: 0,
      annualStepUpPct: 0,
    });
    expect(Math.round(r.monthlySip)).toBeGreaterThan(9900);
    expect(Math.round(r.monthlySip)).toBeLessThan(10100);
  });

  it('needs nothing when savings already cover the goal', () => {
    const r = calculateGoalSIP({
      goalToday: 100000,
      years: 5,
      expectedReturnPct: 10,
      inflationPct: 5,
      existingSavings: 500000,
      annualStepUpPct: 0,
    });
    expect(r.alreadyCovered).toBe(true);
    expect(r.monthlySip).toBe(0);
  });
});

describe('stock average', () => {
  it('weights the average by quantity', () => {
    const r = calculateStockAverage({
      lots: [
        { quantity: 50, price: 1250 },
        { quantity: 30, price: 980 },
        { quantity: 0, price: 0 },
      ],
      currentPrice: 0,
      targetAverage: 0,
    });
    expect(r.averagePrice).toBeCloseTo(1148.75, 6);
    expect(r.totalQuantity).toBe(80);
  });

  it('finds the shares needed to average down to a target', () => {
    const r = calculateStockAverage({
      lots: [
        { quantity: 10, price: 100 },
        { quantity: 10, price: 80 },
      ],
      currentPrice: 80,
      targetAverage: 85,
    });
    expect(r.unitsForTarget).toBe(20);
    // Verify: (1,800 + 20 × 80) ÷ 40 = 85
    expect((r.totalCost + 20 * 80) / 40).toBe(85);
  });

  it('says so when the target cannot be reached', () => {
    const r = calculateStockAverage({
      lots: [{ quantity: 10, price: 100 }],
      currentPrice: 80,
      targetAverage: 70,
    });
    expect(r.unitsForTarget).toBeNull();
    expect(r.targetReason).toBe('unreachable');
  });
});

describe('flat vs reducing rate', () => {
  it('10% flat over 3 years is about 17.92% reducing', () => {
    const r = calculateFlatRate({ principal: 100000, flatRatePct: 10, years: 3 });
    expect(r.flatInterest).toBeCloseTo(30000, 6);
    expect(r.flatEmi).toBeCloseTo(3611.11, 2);
    expect(r.effectiveRatePct).toBeCloseTo(17.92, 2);
  });

  it('the effective rate reproduces the flat EMI exactly', () => {
    const r = calculateFlatRate({ principal: 500000, flatRatePct: 9, years: 5 });
    expect(emiAmount(500000, r.effectiveRatePct, 60)).toBeCloseTo(r.flatEmi, 4);
    expect(r.effectiveRatePct).toBeCloseTo(15.71, 2);
  });

  it('amortises the whole principal', () => {
    const r = calculateFlatRate({ principal: 250000, flatRatePct: 12, years: 2 });
    const repaid = r.yearly.reduce((s, y) => s + y.principalPaid, 0);
    expect(repaid).toBeCloseTo(250000, 4);
    expect(r.yearly[r.yearly.length - 1].balance).toBe(0);
  });

  it('returns 0 when there is no interest to explain', () => {
    expect(impliedReducingRate(1000, 100, 10)).toBe(0);
  });
});

describe('discount', () => {
  it('stacked discounts multiply', () => {
    const r = calculateDiscount({ mode: 'percent', price: 4999, discountPct: 30, discountAmount: 0, extraDiscountPct: 10, taxPct: 0 });
    expect(r.finalPrice).toBeCloseTo(3149.37, 2);
    expect(r.effectiveDiscountPct).toBeCloseTo(37, 6);
  });

  it('applies tax after a flat discount', () => {
    const r = calculateDiscount({ mode: 'amount', price: 1000, discountPct: 0, discountAmount: 150, extraDiscountPct: 0, taxPct: 18 });
    expect(r.afterDiscounts).toBe(850);
    expect(r.tax).toBeCloseTo(153, 6);
    expect(r.finalPrice).toBeCloseTo(1003, 6);
  });

  it('never discounts below zero', () => {
    const r = calculateDiscount({ mode: 'amount', price: 100, discountPct: 0, discountAmount: 500, extraDiscountPct: 0, taxPct: 0 });
    expect(r.finalPrice).toBe(0);
  });
});

/* ------------------------------------------------------------------ */

describe('slider scale', () => {
  const loan: Field = { name: 'p', label: 'Loan', type: 'currency', default: 0, min: 1000, max: 1000000000, slider: true };
  const rate: Field = { name: 'r', label: 'Rate', type: 'percent', default: 0, min: 0.1, max: 36, step: 0.05, slider: true };

  it('uses a log track for wide money ranges, so typical amounts sit mid-way', () => {
    const s = sliderScale(loan)!;
    const pos = s.toPos(2500000) / s.max;
    expect(pos).toBeGreaterThan(0.5);
    expect(pos).toBeLessThan(0.6);
  });

  it('hits both ends exactly and snaps to round figures', () => {
    const s = sliderScale(loan)!;
    expect(s.fromPos(0)).toBe(1000);
    expect(s.fromPos(s.max)).toBe(1000000000);
    const mid = s.fromPos(560);
    expect(mid % 50000).toBe(0);
  });

  it('round-trips a value through the track', () => {
    const s = sliderScale(loan)!;
    const v = s.fromPos(s.toPos(2500000));
    expect(Math.abs(v - 2500000) / 2500000).toBeLessThan(0.02);
  });

  it('keeps ordinary ranges linear in their own units', () => {
    const s = sliderScale(rate)!;
    expect(s.min).toBe(0.1);
    expect(s.max).toBe(36);
    expect(s.step).toBe(0.05);
    expect(s.toPos(8.75)).toBe(8.75);
    expect(s.toPos(99)).toBe(36);
  });
});

describe('scenario links', () => {
  const fields: Field[] = [
    { name: 'amount', label: 'Amount', type: 'currency', default: 100000 },
    { name: 'mode', label: 'Mode', type: 'segmented', default: 'a', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
    { name: 'onlyB', label: 'Only B', type: 'number', default: 5, visible: (v) => v.mode === 'b' },
    { name: 'when', label: 'When', type: 'date', default: '2026-01-01' },
  ];

  it('writes only what differs from the defaults', () => {
    expect(searchFromValues(fields, { amount: 100000, mode: 'a', onlyB: 5, when: '2026-01-01' })).toBe('');
    expect(searchFromValues(fields, { amount: 250000, mode: 'a', onlyB: 9, when: '2026-01-01' })).toBe('amount=250000');
    expect(searchFromValues(fields, { amount: 100000, mode: 'b', onlyB: 9, when: '2026-01-01' })).toBe('mode=b&onlyB=9');
  });

  it('reads values back and ignores anything malformed', () => {
    expect(valuesFromSearch(fields, 'amount=250000&mode=b&onlyB=7&when=2027-03-04')).toEqual({
      amount: 250000,
      mode: 'b',
      onlyB: 7,
      when: '2027-03-04',
    });
    expect(valuesFromSearch(fields, 'amount=abc&mode=zzz&when=soon&unknown=1')).toEqual({});
  });
});

describe('catalog additions', () => {
  it('every category has calculators, and every calculator a category', () => {
    for (const cat of CATEGORIES) expect(CALCULATORS.some((c) => c.category === cat.id)).toBe(true);
    for (const c of CALCULATORS) expect(CATEGORIES.some((cat) => cat.id === c.category)).toBe(true);
  });

  it('related links point at real calculators, never at the page itself', () => {
    for (const c of CALCULATORS) {
      for (const id of c.related ?? []) expect(REGISTRY[id]).toBeDefined();
      const rel = relatedTo(c);
      expect(rel.length).toBeGreaterThan(0);
      expect(rel.some((r) => r.id === c.id)).toBe(false);
    }
  });

  it('every alias lands on a registered calculator', () => {
    for (const target of Object.values(ALIASES)) expect(REGISTRY[target.split('?')[0]]).toBeDefined();
  });

  it('search finds the new calculators by their everyday names', () => {
    expect(searchCalculators('recurring').map((c) => c.id)).toContain('rd');
    expect(searchCalculators('nsc').map((c) => c.id)).toContain('post-office');
    expect(searchCalculators('scss').map((c) => c.id)).toContain('post-office');
    expect(searchCalculators('cagr').map((c) => c.id)[0]).toBe('cagr');
    expect(searchCalculators('home loan').map((c) => c.id)).toContain('emi');
    expect(searchCalculators('flat rate').map((c) => c.id)[0]).toBe('flat-vs-reducing');
  });
});
