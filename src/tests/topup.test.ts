import { describe, expect, it } from 'vitest';
import {
  COMPARE_TENURES,
  analyseExisting,
  calculateCharges,
  calculateTopUp,
  isCoreIssue,
  topUpForCash,
  validateTopUp,
  type TopUpInput,
} from '@/engines/topup';
import { blankInput, defaultInput, defaultState, restoreState } from '@/calculators/loans/topUpModel';
import { lakh, mo, money, personalRecommendation, recommendationText, scheduleTable, summaryText, verdictTitle } from '@/calculators/loans/topUpReport';

/** A fixed "today", so completion dates are the same on every run. */
const TODAY = new Date(2026, 9, 12);

function scenario(change: (i: TopUpInput) => void): TopUpInput {
  const i = defaultInput();
  change(i);
  return i;
}

const run = (i: TopUpInput = defaultInput()) => calculateTopUp(i, TODAY);
const rupees = (v: number) => Math.round(v);

describe('the existing loan, from today', () => {
  const e = analyseExisting(defaultInput().existing, TODAY);

  it('works out the months left from the original tenure: 72 − 16 = 56', () => {
    expect(e.calculatedRemaining).toBe(56);
    expect(e.remainingMonths).toBe(56);
  });

  it('commits ₹23,104 × 56 = ₹12,93,824, of which ₹2,93,824 is future interest', () => {
    expect(e.remainingPayments).toBe(1293824);
    expect(e.futureInterest).toBe(293824);
  });

  it('keeps the interest already paid apart, worked from the original schedule', () => {
    expect(rupees(e.historicalInterest)).toBe(167576);
    expect(rupees(e.scheduledEmi)).toBe(23186);
  });

  it('ends with the 56th EMI from now', () => {
    expect(e.completion).toEqual(new Date(2031, 5, 1));
  });

  it('flags a remaining tenure that differs from the calculated one, without overwriting it', () => {
    const r = run(scenario((i) => ((i.existing.remainingMode = 'manual'), (i.existing.remainingMonths = 60))));
    expect(r.existing.remainingMonths).toBe(60);
    expect(r.mismatches).toContainEqual({ field: 'remaining', entered: 60, calculated: 56 });
    expect(run().mismatches).toEqual([]);
  });

  it('flags an EMI far from the one the balance needs', () => {
    const r = run(scenario((i) => (i.existing.currentEmi = 30000)));
    expect(r.mismatches.map((m) => m.field)).toEqual(['emi']);
  });
});

describe('the top-up, at the example’s 84 months', () => {
  const r = run();
  const o = r.option;

  it('consolidates ₹10,00,000 outstanding and ₹3,00,000 new money into ₹13,00,000', () => {
    expect(o.loan).toBe(1300000);
    expect(o.grossTopUp).toBe(300000);
    expect(o.charges.net).toBe(300000);
  });

  it('has an EMI of ₹21,919 and ₹18.41 L of future payments', () => {
    expect(rupees(o.emi)).toBe(21919);
    expect(rupees(o.totalPayments)).toBe(1841186);
    expect(rupees(o.futureInterest)).toBe(541186);
  });

  it('commits ₹5.47 L more in payments — principal included — but ₹2.47 L more in interest', () => {
    expect(rupees(o.additionalPayments)).toBe(547362);
    expect(rupees(o.additionalInterest)).toBe(247362);
    expect(o.interestPerRupee).toBeCloseTo(0.8245, 3);
  });

  it('splits the extra interest: ₹1.22 L from re-stretching today’s balance, ₹1.25 L on the new money', () => {
    expect(rupees(o.interestSplit.existingBalance)).toBe(122473);
    expect(rupees(o.interestSplit.newMoney)).toBe(124889);
    expect(o.interestSplit.existingBalance + o.interestSplit.newMoney).toBeCloseTo(o.additionalInterest, 6);
  });

  it('lowers the EMI by ₹1,185 but runs 28 months longer', () => {
    expect(rupees(o.emiChange)).toBe(-1185);
    expect(o.extensionMonths).toBe(28);
    expect(o.completion).toEqual(new Date(2033, 9, 1));
  });
});

describe('tenures', () => {
  const r = run();

  it('matches the published EMI for every tenure in the table', () => {
    expect(r.tenures.map((x) => x.months)).toEqual([...COMPARE_TENURES]);
    expect(r.tenures.map((x) => rupees(x.emi))).toEqual([33284, 30311, 27942, 26013, 24413, 21919]);
    expect(r.tenures.map((x) => Math.round(x.interest / 1000))).toEqual([298, 337, 377, 417, 458, 541]);
  });

  it('marks the lowest interest, the lowest EMI and the chosen tenure', () => {
    expect(r.tenures[0].tags).toContain('lowest-interest');
    expect(r.tenures[5].tags).toEqual(expect.arrayContaining(['lowest-emi', 'selected']));
  });

  it('recommends the shortest tenure within the comfortable EMI: 60 months, ₹1.64 L less interest than 84', () => {
    const rec = r.recommendation;
    expect(rec.basis).toBe('comfortable');
    expect(rec.months).toBe(60);
    expect(rec.against?.months).toBe(84);
    expect(rupees(rec.interestSaved)).toBe(164661);
    expect(rupees(rec.emiIncrease)).toBe(6023);
    expect(rec.monthsSooner).toBe(24);
    expect(r.tenures.find((x) => x.months === 60)?.tags).toContain('best-balance');
  });

  it('warns that 84 months is long, against the 60-month option', () => {
    expect(r.longTenure).toMatchObject({ long: { months: 84 }, short: { months: 60 }, monthsSooner: 24 });
    expect(rupees(r.longTenure!.emiIncrease)).toBe(6023);
    expect(rupees(r.lesson!.long.totalPayment)).toBe(1841186);
    expect(rupees(r.lesson!.short.totalPayment)).toBe(1676524);
  });

  it('adds the chosen tenure to the table when it is not one of the six', () => {
    const r = run(scenario((i) => (i.topup.tenureMonths = 120)));
    expect(r.tenures.map((x) => x.months)).toEqual([48, 54, 60, 66, 72, 84, 120]);
    expect(rupees(r.option.emi)).toBe(17542);
    expect(r.longTenure?.short.months).toBe(60);
  });

  it('falls back to the best balance without a comfortable EMI, and says when nothing fits', () => {
    const balanced = run(scenario((i) => (i.topup.comfortableEmi = 0))).recommendation;
    expect(balanced.basis).toBe('balance');
    expect([60, 66]).toContain(balanced.months);
    const tight = run(scenario((i) => (i.topup.comfortableEmi = 15000))).recommendation;
    expect(tight.basis).toBe('none-fit');
  });

  it('builds a long · medium · short matrix around the recommendation', () => {
    expect(r.matrix.map((m) => [m.band, m.row.months, m.flexibility])).toEqual([
      ['long', 84, 'High'],
      ['medium', 60, 'Medium'],
      ['short', 48, 'Low'],
    ]);
  });
});

describe('the decision', () => {
  it('reads amber for the example: workable, but consider a shorter tenure', () => {
    const r = run();
    expect(r.verdict.level).toBe('amber');
    expect(verdictTitle(r)).toBe('Top-Up Is Possible, But Consider a Shorter Tenure');
  });

  it('reads green at 60 months', () => {
    const r = run(scenario((i) => (i.topup.tenureMonths = 60)));
    expect(r.verdict.level).toBe('green');
    expect(verdictTitle(r)).toBe('Top-Up May Be Reasonable');
  });

  it('reads red for an EMI well above the comfortable one, a very long tenure or heavy borrowing', () => {
    expect(run(scenario((i) => ((i.topup.tenureMonths = 48), (i.topup.comfortableEmi = 25000)))).verdict.level).toBe('red');
    expect(run(scenario((i) => (i.topup.tenureMonths = 120))).verdict.level).toBe('red');
    const over = run(scenario((i) => ((i.topup.loanMode = 'sanctioned'), (i.topup.sanctionedLoan = 1500000), (i.topup.tenureMonths = 60))));
    expect(over.verdict.checks[0]).toEqual({ id: 'over-borrow', tone: 'bad' });
    expect(over.verdict.level).toBe('red');
  });

  it('reads red when charges eat a large share of the top-up', () => {
    const r = run(scenario((i) => ((i.topup.tenureMonths = 60), (i.topup.insurance = 25000))));
    expect(r.verdict.checks.find((c) => c.id === 'charges')?.tone).toBe('bad');
  });
});

describe('charges and the cash you actually receive', () => {
  it('takes the fee, 18% GST on it, insurance and other charges out of the payout', () => {
    const c = calculateCharges(300000, 1300000, { feePct: 2, feeOn: 'topup', otherCharges: 1000, insurance: 5000 });
    expect(c).toMatchObject({ fee: 6000, gst: 1080, other: 1000, insurance: 5000, total: 13080, net: 286920 });
  });

  it('can charge the fee on the whole new loan', () => {
    expect(calculateCharges(300000, 1300000, { feePct: 1, feeOn: 'loan', otherCharges: 0, insurance: 0 }).fee).toBe(13000);
  });

  it('works out the top-up that leaves the full need in hand', () => {
    const terms = { feePct: 2, feeOn: 'topup' as const, otherCharges: 1000, insurance: 5000 };
    const gross = topUpForCash(300000, 1000000, terms)!;
    expect(calculateCharges(gross, 1000000 + gross, terms).net).toBeCloseTo(300000, 6);
    const r = run(scenario((i) => Object.assign(i.topup, terms)));
    expect(r.topUpForFullCash).toBeCloseTo(gross, 6);
    expect(r.verdict.checks.map((c) => c.id)).toContain('cash-short');
  });
});

describe('amounts', () => {
  const r = run();

  it('compares ₹2 L, ₹3 L, ₹4 L and ₹5 L at the chosen tenure', () => {
    expect(r.scenarios.map((s) => [s.key, s.amount, rupees(s.option.emi)])).toEqual([
      ['minimum', 200000, 20233],
      ['recommended', 300000, 21919],
      ['higher', 400000, 23605],
      ['maximum', 500000, 25291],
    ]);
  });

  it('shows what borrowing ₹5 L instead of ₹3 L costs', () => {
    const l = r.larger!;
    expect(l.source).toBe('maximum');
    expect(l.base.loan).toBe(1300000);
    expect(l.larger.loan).toBe(1500000);
    expect(l.extraTopUp).toBe(200000);
    expect(rupees(l.extraEmi)).toBe(3372);
    expect(rupees(l.extraInterest)).toBe(83259);
  });

  it('uses the sanctioned amount when the bank offers more than needed', () => {
    const l = run(scenario((i) => ((i.topup.loanMode = 'sanctioned'), (i.topup.sanctionedLoan = 1400000)))).larger!;
    expect(l.source).toBe('sanctioned');
    expect(l.extraTopUp).toBe(100000);
  });
});

describe('part prepayment', () => {
  it('shortens the loan and saves interest with the EMI held', () => {
    const p = run().prepayment;
    expect(p.active).toBe(true);
    expect(p.baseMonths).toBe(84);
    expect(p.months).toBeLessThan(84);
    expect(p.monthsSaved).toBe(84 - p.months);
    expect(p.interestSaved).toBeGreaterThan(0);
    expect(p.interest + p.interestSaved).toBeCloseTo(p.baseInterest, 6);
    expect(p.yearly).toHaveLength(7);
    expect(p.yearly[6].without).toBe(0);
  });

  it('adds every extra rupee exactly once', () => {
    const p = run(scenario((i) => (i.prepay = { initial: 50000, initialMonth: 6, monthlyExtra: 0, annualLump: 0 }))).prepayment;
    expect(p.prepaid).toBeCloseTo(50000, 6);
    const q = run(scenario((i) => (i.prepay = { initial: 0, initialMonth: 6, monthlyExtra: 1000, annualLump: 0 }))).prepayment;
    // ₹1,000 with every EMI until the loan closes, the last one only what is left.
    expect(q.prepaid).toBeGreaterThanOrEqual(1000 * (q.months - 1));
    expect(q.prepaid).toBeLessThanOrEqual(1000 * q.months);
  });

  it('is idle with nothing to prepay', () => {
    const p = run(scenario((i) => (i.prepay = { initial: 0, initialMonth: 6, monthlyExtra: 0, annualLump: 0 }))).prepayment;
    expect(p).toMatchObject({ active: false, monthsSaved: 0, interestSaved: 0, prepaid: 0 });
  });
});

describe('validation', () => {
  const paths = (i: TopUpInput) => validateTopUp(i).map((x) => x.path);

  it('passes the example and asks for the amounts on a blank start', () => {
    expect(validateTopUp(defaultInput())).toEqual([]);
    expect(paths(blankInput())).toEqual(
      expect.arrayContaining(['existing.originalAmount', 'existing.currentEmi', 'existing.outstanding', 'topup.required']),
    );
  });

  it('rejects an outstanding above the original loan and more EMIs paid than the tenure', () => {
    expect(paths(scenario((i) => (i.existing.outstanding = 1300000)))).toContain('existing.outstanding');
    expect(paths(scenario((i) => (i.existing.emisPaid = 80)))).toContain('existing.emisPaid');
    expect(paths(scenario((i) => (i.existing.emisPaid = 72)))).toContain('existing.emisPaid');
  });

  it('rejects an EMI too low to repay the loan', () => {
    expect(paths(scenario((i) => (i.existing.currentEmi = 15000)))).toEqual(['existing.currentEmi']);
  });

  it('rejects a zero tenure, huge amounts, negative rates and a fee of 100%', () => {
    const p = paths(
      scenario((i) => {
        i.topup.tenureMonths = 0;
        i.topup.required = 5e9;
        i.topup.newRatePct = -1;
        i.topup.feePct = 100;
      }),
    );
    expect(p).toEqual(expect.arrayContaining(['topup.tenureMonths', 'topup.required', 'topup.newRatePct', 'topup.feePct']));
  });

  it('rejects charges that swallow the whole top-up', () => {
    expect(paths(scenario((i) => (i.topup.insurance = 300000)))).toEqual(['topup.charges']);
  });

  it('rejects a sanctioned loan no bigger than the outstanding', () => {
    expect(paths(scenario((i) => ((i.topup.loanMode = 'sanctioned'), (i.topup.sanctionedLoan = 900000))))).toEqual(['topup.sanctionedLoan']);
  });

  it('warns, without stopping, when the top-up is above the bank’s eligibility', () => {
    const issues = validateTopUp(scenario((i) => (i.topup.eligibility = 250000)));
    expect(issues).toEqual([expect.objectContaining({ path: 'topup.eligibility', level: 'warn' })]);
    expect(issues.some(isCoreIssue)).toBe(false);
  });

  it('keeps 0% interest finite', () => {
    const r = run(scenario((i) => ((i.topup.newRatePct = 0), (i.existing.originalRatePct = 0))));
    expect(r.option.emi).toBeCloseTo(1300000 / 84, 6);
    expect(r.option.futureInterest).toBeCloseTo(0, 6);
    expect(r.existing.historicalInterest).toBe(0);
  });

  it('never produces NaN, Infinity or a negative balance from bad input', () => {
    const r = run(
      scenario((i) => {
        i.existing.outstanding = NaN;
        i.existing.currentEmi = Infinity;
        i.topup.newRatePct = -5;
        i.topup.tenureMonths = 0;
        i.topup.required = -100;
        i.prepay.monthlyExtra = NaN;
      }),
    );
    const values = [
      r.existing.remainingPayments,
      r.existing.futureInterest,
      r.option.emi,
      r.option.totalPayments,
      r.option.additionalInterest,
      r.option.charges.net,
      r.prepayment.interest,
      ...r.tenures.flatMap((x) => [x.emi, x.interest, x.totalPayment]),
      ...r.schedule.schedule.map((x) => x.balance),
    ];
    for (const v of values) expect(Number.isFinite(v)).toBe(true);
    for (const v of r.schedule.schedule.map((x) => x.balance)) expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe('saved state', () => {
  it('restores well-formed saves, including pinned options', () => {
    expect(restoreState(null)).toEqual(defaultState());
    const saved = defaultState();
    saved.input.topup.tenureMonths = 60;
    saved.input.existing.remainingMode = 'manual';
    saved.pinned = [{ id: 'a', loan: 1300000, ratePct: 10.5, months: 60, emi: 27942, netCash: 300000, additionalInterest: 82700, additionalPayments: 382700, level: 'green' }];
    expect(restoreState(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it('ignores malformed fields and opens custom tenures as custom', () => {
    const s = restoreState({ input: { existing: { outstanding: 'lots', remainingMode: 'guess' }, topup: { tenureMonths: 90, feeOn: 'x' } }, pinned: [{ id: 1 }] });
    expect(s.input.existing.outstanding).toBe(1000000);
    expect(s.input.existing.remainingMode).toBe('auto');
    expect(s.input.topup.feeOn).toBe('topup');
    expect(s.tenureCustom).toBe(true);
    expect(s.pinned).toEqual([]);
  });
});

describe('words', () => {
  const r = run();
  const input = defaultInput();

  it('explains the recommendation with the borrower’s own figures', () => {
    expect(recommendationText(r, input)).toBe(
      'This keeps your EMI at ₹27,942, within your comfortable ₹28,000, while saving approximately ₹1.65 L in interest compared with the 84-month option.',
    );
    const text = personalRecommendation(r, input);
    expect(text).toContain('moves your EMI from ₹23,104 to ₹21,919');
    expect(text).toContain('about ₹2.47 L more in interest');
    expect(text).toContain('A 60-month tenure would raise the EMI to ₹27,942');
  });

  it('copies a plain-text summary and builds both schedules', () => {
    expect(summaryText(r, input)).toContain('Additional interest: ₹2,47,362');
    expect(scheduleTable(r, 'monthly').rows).toHaveLength(84);
    const yearly = scheduleTable(r, 'yearly');
    expect(yearly.rows).toHaveLength(7);
    expect(yearly.rows[6].balance).toBe('₹0');
  });
});

describe('the page', () => {
  it('is registered with its own workspace', async () => {
    const { REGISTRY } = await import('@/calculators');
    const def = REGISTRY['loan-top-up'];
    expect(def.workspace).toBeDefined();
    expect(def.hero(def.compute({}), {})).toMatchObject({ value: '₹2,47,362' });
  });

  it('quotes the same figures the engine produces', async () => {
    const { REGISTRY } = await import('@/calculators');
    const content = JSON.stringify(REGISTRY['loan-top-up'].content);
    const r = run();
    const inr = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
    const o = r.option;
    const e = r.existing;
    for (const v of [
      e.remainingPayments,
      e.futureInterest,
      e.historicalInterest,
      o.emi,
      o.totalPayments,
      o.futureInterest,
      o.additionalPayments,
      o.additionalInterest,
      o.interestSplit.existingBalance,
      o.interestSplit.newMoney,
      -o.emiChange,
      r.recommendation.interestSaved,
      r.recommendation.emiIncrease,
      r.larger!.extraEmi,
      r.larger!.extraInterest,
      r.prepayment.interestSaved,
      ...r.tenures.map((x) => x.emi),
      r.tenures[2].interest,
    ])
      expect(content, String(v)).toContain(inr(v));
    for (const x of r.tenures) {
      const row = [mo(x.months), money(x.emi), lakh(x.totalPayment), lakh(x.interest)];
      expect(content, x.months.toString()).toContain(JSON.stringify(row));
    }
    expect(content).toContain(`in ${mo(r.prepayment.months)}`);
    expect(content).toContain(`runs ${mo(o.extensionMonths)} longer`);
  });
});
