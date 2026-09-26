import { describe, expect, it } from 'vitest';
import {
  calculateEducationLoan,
  calculateLoanEmi,
  financedAmount,
  homeLoanLtvCap,
  homeLoanTaxBenefit,
  loanCharges,
} from '@/engines/loanTypes';
import { searchCalculators } from '@/data/catalog';
import { REGISTRY } from '@/calculators';
import { defaults } from '@/calculators/types';

describe('loan charges and APR', () => {
  it('adds 18% GST to the fee and deducts both from the disbursal', () => {
    const c = loanCharges(500000, 16488.0, 36, 2);
    expect(c.fee).toBeCloseTo(10000, 6);
    expect(c.gstOnFee).toBeCloseTo(1800, 6);
    expect(c.netDisbursal).toBeCloseTo(488200, 6);
  });

  it('matches the personal loan example: 11.5% with a 2% fee costs about 13.2%', () => {
    const r = calculateLoanEmi({ principal: 500000, annualRatePct: 11.5, tenure: 3, tenureUnit: 'years', feePct: 2 });
    expect(r.emi).toBeCloseTo(16488, 0);
    expect(r.totalInterest).toBeCloseTo(93568, -1);
    expect(r.aprPct).toBeCloseTo(13.16, 1);
  });

  it('APR equals the quoted rate when there is no fee', () => {
    const r = calculateLoanEmi({ principal: 800000, annualRatePct: 9, tenure: 5, tenureUnit: 'years', feePct: 0 });
    expect(r.aprPct).toBeCloseTo(9, 3);
  });

  it('matches the car loan example', () => {
    const { loan, downPayment } = financedAmount(1000000, 20);
    expect(loan).toBe(800000);
    expect(downPayment).toBe(200000);
    const r = calculateLoanEmi({ principal: loan, price: 1000000, downPayment, annualRatePct: 9, tenure: 5, tenureUnit: 'years', feePct: 0.5 });
    expect(r.emi).toBeCloseTo(16607, 0);
    expect(r.ltvPct).toBeCloseTo(80, 6);
    expect(r.aprPct).toBeCloseTo(9.25, 1);
  });

  it('matches the bike loan example', () => {
    const r = calculateLoanEmi({ principal: 119000, annualRatePct: 11, tenure: 36, tenureUnit: 'months', feePct: 1 });
    expect(r.emi).toBeCloseTo(3896, 0);
    expect(r.totalInterest).toBeCloseTo(21253, -1);
    expect(r.aprPct).toBeCloseTo(11.82, 1);
  });
});

describe('home loans', () => {
  it('applies the RBI loan-to-value tiers', () => {
    expect(homeLoanLtvCap(3000000)).toBe(90);
    expect(homeLoanLtvCap(3000001)).toBe(80);
    expect(homeLoanLtvCap(7500000)).toBe(80);
    expect(homeLoanLtvCap(7500001)).toBe(75);
  });

  it('caps Section 24(b) at ₹2 lakh and 80C at ₹1.5 lakh, with cess', () => {
    const b = homeLoanTaxBenefit({ interestPaid: 421182, principalPaid: 99511 }, 30);
    expect(b.interestDeduction).toBe(200000);
    expect(b.principalDeduction).toBe(99511);
    expect(b.taxSaved).toBeCloseTo((200000 + 99511) * 0.3 * 1.04, 6);
    expect(homeLoanTaxBenefit({ interestPaid: 1, principalPaid: 1 }, 0).taxSaved).toBe(0);
  });

  it('matches the ₹50 lakh, 8.5%, 20-year example', () => {
    const r = calculateLoanEmi({ principal: 5000000, annualRatePct: 8.5, tenure: 20, tenureUnit: 'years', feePct: 0 });
    expect(r.emi).toBeCloseTo(43391, 0);
    expect(r.yearly[0].interestPaid).toBeCloseTo(421182, -1);
    expect(r.yearly[0].principalPaid).toBeCloseTo(99511, -1);
  });
});

describe('education loans', () => {
  const base = {
    principal: 1000000,
    annualRatePct: 10,
    courseYears: 2,
    graceMonths: 6,
    repaymentYears: 7,
    feePct: 0,
  };

  it('accrues simple interest on yearly tranches and capitalises it', () => {
    const r = calculateEducationLoan({ ...base, disbursement: 'yearly', moratoriumInterest: 'capitalise' });
    expect(r.moratoriumMonths).toBe(30);
    expect(r.moratoriumInterest).toBeCloseTo(200000, 6);
    expect(r.principal).toBeCloseTo(1200000, 6);
    expect(r.emi).toBeCloseTo(19921, 0);
    expect(r.lifetimeInterest).toBeCloseTo(673399, -1);
    expect(r.lifetimePaid).toBeCloseTo(1673399, -1);
  });

  it('keeps the EMI on the sanctioned amount when interest is paid while studying', () => {
    const r = calculateEducationLoan({ ...base, disbursement: 'yearly', moratoriumInterest: 'pay' });
    expect(r.principal).toBe(1000000);
    expect(r.emi).toBeCloseTo(16601, 0);
    expect(r.moratoriumMonthlyInterest).toBeCloseTo(8333.33, 1);
    expect(r.lifetimePaid).toBeCloseTo(1594499, -1);
  });

  it('charges interest on the full amount for the whole moratorium when paid upfront', () => {
    const r = calculateEducationLoan({ ...base, disbursement: 'upfront', moratoriumInterest: 'capitalise' });
    expect(r.moratoriumInterest).toBeCloseTo(250000, 6);
    expect(r.emi).toBeCloseTo(20751, 0);
  });

  it('with no moratorium behaves like an ordinary loan', () => {
    const r = calculateEducationLoan({
      ...base,
      courseYears: 0,
      graceMonths: 0,
      disbursement: 'upfront',
      moratoriumInterest: 'capitalise',
    });
    expect(r.moratoriumInterest).toBe(0);
    expect(r.aprPct).toBeCloseTo(10, 2);
  });

  it('APR sits just under the nominal rate when simple interest is capitalised', () => {
    const r = calculateEducationLoan({ ...base, disbursement: 'yearly', moratoriumInterest: 'capitalise' });
    expect(r.aprPct).toBeGreaterThan(9.5);
    expect(r.aprPct).toBeLessThan(10);
  });
});

describe('loan calculators', () => {
  const ids = ['home-loan-emi', 'personal-loan-emi', 'car-loan-emi', 'bike-loan-emi', 'education-loan-emi'];

  it('each computes a positive EMI from its defaults', () => {
    for (const id of ids) {
      const def = REGISTRY[id];
      const r = def.compute(defaults(def.fields)) as { emi: number };
      expect(r.emi, id).toBeGreaterThan(0);
    }
  });

  it('each ships its own intro, sections, FAQs and guides', () => {
    for (const id of ids) {
      const c = REGISTRY[id].content;
      expect(c.intro, id).toBeDefined();
      expect(c.sections?.length ?? 0, id).toBeGreaterThanOrEqual(4);
      expect(c.faqs?.length ?? 0, id).toBeGreaterThanOrEqual(6);
    }
  });

  it('search sends each loan type to its own calculator first', () => {
    expect(searchCalculators('home loan')[0].id).toBe('home-loan-emi');
    expect(searchCalculators('car loan')[0].id).toBe('car-loan-emi');
    expect(searchCalculators('bike loan')[0].id).toBe('bike-loan-emi');
    expect(searchCalculators('education loan')[0].id).toBe('education-loan-emi');
    expect(searchCalculators('personal loan')[0].id).toBe('personal-loan-emi');
    const emi = searchCalculators('emi').map((c) => c.id);
    for (const id of ids) expect(emi).toContain(id);
  });
});
