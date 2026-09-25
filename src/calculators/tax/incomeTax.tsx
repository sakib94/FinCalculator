import type { CalculatorDef, Values } from '../types';
import { calculateTax, compareRegimes, type TaxInput, type TaxResult } from '@/engines/tax';
import { DEDUCTIONS, FINANCIAL_YEARS, DEFAULT_FY, type AgeGroup, type RegimeId } from '@/data/taxRules';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';
import { Note } from '@/components/Results';

/** Old-regime-only deduction fields, generated from the rule config. */
const deductionFields = DEDUCTIONS.filter((d) => d.regimes.includes('old') && d.id !== 'sec80CCD2').map(
  (d) => ({
    name: d.id,
    label: `${d.label} (${d.section})`,
    type: 'currency' as const,
    default: d.id === 'sec80C' ? 150000 : 0,
    min: 0,
    max: 10000000,
    optional: true,
    group: 'deductions',
    help: d.help,
    visible: (v: Values) => v.regime === 'old',
  }),
);

const toInput = (v: Values): TaxInput => ({
  fyId: str(v.financialYear, DEFAULT_FY.id),
  regime: str(v.regime, 'new') as RegimeId,
  ageGroup: str(v.ageGroup, 'below60') as AgeGroup,
  salaryIncome: num(v.salaryIncome),
  basicSalary: num(v.basicSalary),
  hraReceived: num(v.hraReceived),
  rentPaid: num(v.rentPaid),
  metroCity: str(v.metroCity, 'yes') === 'yes',
  interestIncome: num(v.interestIncome),
  rentalIncome: num(v.rentalIncome),
  otherIncome: num(v.otherIncome),
  ltcgEquity: num(v.ltcgEquity),
  stcgEquity: num(v.stcgEquity),
  deductions: Object.fromEntries(DEDUCTIONS.map((d) => [d.id, num(v[d.id])])),
});

const incomeTax: CalculatorDef<TaxResult> = {
  id: 'income-tax',

  groups: [
    { id: 'income', title: 'Income details' },
    { id: 'other', title: 'Other income', collapsible: true },
    { id: 'deductions', title: 'Exemptions & deductions (old regime)', collapsible: true, defaultOpen: true },
  ],

  fields: [
    {
      name: 'financialYear',
      label: 'Financial Year',
      type: 'select',
      default: DEFAULT_FY.id,
      options: FINANCIAL_YEARS.map((f) => ({ label: `${f.label} (${f.assessmentYear})`, value: f.id })),
      help: 'Slabs, rebate and standard deduction all follow the year you pick.',
    },
    {
      name: 'regime',
      label: 'Tax Regime',
      type: 'segmented',
      default: 'new',
      options: [
        { label: 'New Regime', value: 'new' },
        { label: 'Old Regime', value: 'old' },
      ],
      help: 'The new regime has lower slab rates but almost no deductions. Both are calculated and compared below.',
    },
    {
      name: 'ageGroup',
      label: 'Age Group',
      type: 'select',
      default: 'below60',
      options: [
        { label: 'Below 60 years', value: 'below60' },
        { label: 'Senior citizen (60 – 80)', value: 'senior' },
        { label: 'Super senior citizen (80+)', value: 'superSenior' },
      ],
      help: 'Age only changes the basic exemption limit under the old regime.',
    },
    {
      name: 'salaryIncome',
      label: 'Annual Salary (gross)',
      type: 'currency',
      default: 1500000,
      min: 0,
      max: 1000000000,
      group: 'income',
      help: 'Total salary before any deduction — basic, HRA, allowances, bonus and perquisites.',
    },
    {
      name: 'basicSalary',
      label: 'Annual Basic + DA',
      type: 'currency',
      default: 600000,
      min: 0,
      max: 1000000000,
      optional: true,
      group: 'income',
      visible: (v) => v.regime === 'old',
      help: 'Needed to work out the HRA exemption.',
    },
    {
      name: 'hraReceived',
      label: 'HRA Received (annual)',
      type: 'currency',
      default: 240000,
      min: 0,
      max: 100000000,
      optional: true,
      group: 'income',
      visible: (v) => v.regime === 'old',
    },
    {
      name: 'rentPaid',
      label: 'Rent Paid (annual)',
      type: 'currency',
      default: 300000,
      min: 0,
      max: 100000000,
      optional: true,
      group: 'income',
      visible: (v) => v.regime === 'old',
      help: 'Rent actually paid in the year. No HRA exemption is available if you do not pay rent.',
    },
    {
      name: 'metroCity',
      label: 'City',
      type: 'segmented',
      default: 'yes',
      group: 'income',
      visible: (v) => v.regime === 'old',
      options: [
        { label: 'Metro', value: 'yes' },
        { label: 'Non-metro', value: 'no' },
      ],
      help: 'Delhi, Mumbai, Kolkata and Chennai count as metros — 50% of Basic + DA instead of 40%.',
    },
    {
      name: 'interestIncome',
      label: 'Interest Income',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      optional: true,
      group: 'other',
      help: 'Savings account, fixed deposit and bond interest.',
    },
    {
      name: 'rentalIncome',
      label: 'Rental Income (annual)',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      optional: true,
      group: 'other',
      help: 'Gross rent received. A 30% standard deduction is applied automatically u/s 24(a).',
    },
    {
      name: 'otherIncome',
      label: 'Other Income',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      optional: true,
      group: 'other',
      help: 'Freelance income, dividends, family pension and anything else taxed at slab rates.',
    },
    {
      name: 'ltcgEquity',
      label: 'Long-term Capital Gains (equity)',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      optional: true,
      group: 'other',
      help: 'Listed equity and equity mutual funds held over 12 months. Taxed at 12.5% above ₹1.25 lakh.',
    },
    {
      name: 'stcgEquity',
      label: 'Short-term Capital Gains (equity)',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      optional: true,
      group: 'other',
      help: 'Listed equity held 12 months or less. Taxed at a flat 20% u/s 111A.',
    },
    ...deductionFields,
    {
      name: 'sec80CCD2',
      label: 'Employer NPS contribution (80CCD(2))',
      type: 'currency',
      default: 0,
      min: 0,
      max: 10000000,
      optional: true,
      group: 'deductions',
      help: 'Allowed under both regimes — up to 14% of Basic + DA in the new regime.',
    },
  ],

  compute: (v) => calculateTax(toInput(v)),

  hero: (r) => [
    {
      label: `Total tax payable · ${r.regimeLabel} · ${r.fyLabel}`,
      value: formatINR(r.totalTax),
      caption: `Effective tax rate ${formatPercent(r.effectiveTaxRate)} of gross income`,
    },
    {
      label: 'Approximate monthly tax',
      value: formatINR(r.monthlyTax),
      caption: 'TDS your employer would deduct each month',
    },
  ],

  stats: (r) => [
    { label: 'Gross total income', value: formatINR(r.grossTotalIncome) },
    { label: 'Total exemptions & deductions', value: formatINR(r.totalDeductions), tone: 'positive' },
    { label: 'Taxable income', value: formatINR(r.taxableIncome), tone: 'accent' },
    { label: 'Tax on slabs', value: formatINR(r.slabTax) },
    ...(r.specialTax > 0 ? [{ label: 'Tax on capital gains', value: formatINR(r.specialTax) }] : []),
    ...(r.rebate > 0 ? [{ label: 'Rebate u/s 87A', value: `− ${formatINR(r.rebate)}`, tone: 'positive' as const }] : []),
    ...(r.marginalReliefRebate > 0
      ? [{ label: 'Marginal relief', value: `− ${formatINR(r.marginalReliefRebate)}`, tone: 'positive' as const }]
      : []),
    ...(r.surcharge > 0
      ? [{ label: `Surcharge @ ${formatPercent(r.surchargeRate)}`, value: formatINR(r.surcharge) }]
      : []),
    { label: `Health & education cess @ ${r.cessRate}%`, value: formatINR(r.cess) },
    { label: 'Income after tax', value: formatINR(r.grossTotalIncome - r.totalTax), tone: 'positive' },
  ],

  extra: (r, v) => {
    const comparison = compareRegimes(toInput(v));
    const better = comparison.betterRegime === 'new' ? comparison.new : comparison.old;
    const worse = comparison.betterRegime === 'new' ? comparison.old : comparison.new;

    return (
      <>
        <section className="card card-pad">
          <div className="section-label" style={{ marginBottom: 12 }}>
            Old vs New regime · {r.fyLabel}
          </div>
          <dl style={{ margin: 0 }}>
            <div className="kv">
              <dt>Old Regime tax</dt>
              <dd>{formatINR(comparison.old.totalTax)}</dd>
            </div>
            <div className="kv">
              <dt>New Regime tax</dt>
              <dd>{formatINR(comparison.new.totalTax)}</dd>
            </div>
            <div className="kv total">
              <dt>
                {comparison.difference === 0 ? 'Both regimes cost the same' : `You save with the ${better.regimeLabel}`}
              </dt>
              <dd>{formatINR(comparison.difference)}</dd>
            </div>
          </dl>
          {comparison.difference > 0 && (
            <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
              The {better.regimeLabel} costs {formatINR(comparison.difference)} less than the{' '}
              {worse.regimeLabel} on these numbers
              {comparison.betterRegime === 'old'
                ? ' — the deductions you claim outweigh the lower new-regime rates.'
                : ' — the lower slab rates outweigh the deductions you would give up.'}
            </p>
          )}
        </section>

        {r.deductionItems.length > 0 && (
          <section className="card card-pad">
            <div className="section-label" style={{ marginBottom: 10 }}>
              Deductions applied
            </div>
            <dl style={{ margin: 0 }}>
              {r.hraExemption > 0 && (
                <div className="kv">
                  <dt>HRA exemption · 10(13A)</dt>
                  <dd>{formatINR(r.hraExemption)}</dd>
                </div>
              )}
              {r.standardDeduction > 0 && (
                <div className="kv">
                  <dt>Standard deduction · 16(ia)</dt>
                  <dd>{formatINR(r.standardDeduction)}</dd>
                </div>
              )}
              {r.deductionItems.map((d) => (
                <div className="kv" key={d.label}>
                  <dt>
                    {d.label} {d.note && <span className="muted small">· {d.note}</span>}
                  </dt>
                  <dd>{formatINR(d.amount)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {r.regime === 'new' && (
          <Note>
            The new regime is the default under section 115BAC. Only the standard deduction of{' '}
            {formatINR(r.standardDeduction || 75000)} and employer NPS under 80CCD(2) are available — 80C, 80D
            and HRA are not.
          </Note>
        )}
      </>
    );
  },

  charts: (r, v) => {
    const comparison = compareRegimes(toInput(v));
    return [
      {
        kind: 'bar' as const,
        title: 'Tax under each regime',
        x: ['Old Regime', 'New Regime'],
        series: [{ name: 'Total tax', values: [comparison.old.totalTax, comparison.new.totalTax] }],
      },
      {
        kind: 'donut' as const,
        title: 'Where your income goes',
        centerLabel: 'Gross income',
        data: [
          { label: 'Income after tax', value: Math.max(0, r.grossTotalIncome - r.totalTax) },
          { label: 'Total tax', value: r.totalTax },
        ],
      },
    ];
  },

  table: (r) => ({
    title: `Slab-wise tax · ${r.regimeLabel} · ${r.fyLabel}`,
    csvName: 'finora-income-tax-slabs',
    previewRows: 12,
    columns: [
      { key: 'slab', label: 'Income slab', align: 'left' },
      { key: 'rate', label: 'Rate' },
      { key: 'taxable', label: 'Taxable in slab' },
      { key: 'tax', label: 'Tax' },
    ],
    rows: r.slabRows.map((row) => ({
      slab:
        row.to == null
          ? `Above ${formatINR(row.from)}`
          : `${formatINR(row.from)} – ${formatINR(row.to)}`,
      rate: `${row.rate}%`,
      taxable: formatINR(row.taxableInSlab),
      tax: formatINR(row.tax),
    })),
    footer: {
      slab: 'Total',
      rate: '',
      taxable: formatINR(r.taxableNormalIncome),
      tax: formatINR(r.slabTax),
    },
    note:
      r.specialTax > 0
        ? 'Capital gains are taxed at their own rates outside these slabs and are added separately.'
        : undefined,
  }),

  summary: (r) =>
    `${r.regimeLabel} · ${r.fyLabel}: taxable income ${formatINR(r.taxableIncome)}, total tax ${formatINR(
      r.totalTax,
    )} (effective ${formatPercent(r.effectiveTaxRate)}), about ${formatINR(r.monthlyTax)} a month.`,

  content: {
    howItWorks: [
      'Income tax is worked out in a fixed order. Your gross income is reduced by exemptions such as HRA, then by the standard deduction, then by Chapter VI-A deductions like 80C and 80D. What remains is your taxable income, and slab rates are applied to it band by band — not a single flat rate on the whole amount.',
      'Rebate under section 87A is applied next: if your taxable income is within the limit, the rebate can wipe out the tax entirely. Surcharge applies only to high incomes, and 4% health and education cess is added last, on tax plus surcharge.',
      'The new regime has wider, lower slabs but removes almost every deduction. The old regime keeps the deductions but taxes at higher rates. Which one wins depends entirely on how much you actually claim, which is why both are calculated for you above.',
      'Every slab, threshold and rate lives in a single configuration file, so the calculator can be updated for a new Finance Act without touching the calculation logic.',
    ],
    formula: `Taxable income = gross income − exemptions − standard deduction − deductions
Slab tax        = Σ (income in each slab × that slab's rate)
Tax after 87A   = slab tax − rebate (if eligible)
Surcharge       = tax × surcharge rate (with marginal relief)
Cess            = (tax + surcharge) × 4%
Total tax       = tax + surcharge + cess`,
    example: [
      'Salary ₹15,00,000 under the new regime for FY 2026-27.',
      'Standard deduction ₹75,000 → taxable income ₹14,25,000.',
      'Slab tax: nil on the first ₹4L, 5% on ₹4–8L (₹20,000), 10% on ₹8–12L (₹40,000), 15% on ₹12–14.25L (₹33,750) = ₹93,750.',
      'Add 4% cess (₹3,750) → total tax ₹97,500, about ₹8,125 a month.',
    ],
    assumptions: [
      'You are a resident individual. Rates for non-residents, HUFs, firms and companies differ.',
      'Capital gains use the rates for listed equity: 12.5% long-term above the ₹1.25 lakh exemption and 20% short-term. Property, debt funds, gold and unlisted shares follow different rules and are not modelled.',
      'The 15% cap on surcharge for capital-gains income is not applied separately — surcharge is computed on total tax.',
      'Rental income is reduced by the flat 30% standard deduction; municipal taxes and home loan interest on a let-out property are not handled separately.',
    ],
    notes: [
      'The new regime is the default. You must opt out of it to use the old regime, and salaried taxpayers can switch every year.',
      'Under the new regime for FY 2025-26 and FY 2026-27, income up to ₹12 lakh attracts no tax after the ₹60,000 rebate — ₹12.75 lakh for salaried taxpayers once the standard deduction is counted.',
      'Marginal relief protects you just above the rebate and surcharge thresholds, so a small rise in income can never cost more in tax than the rise itself.',
      'This is an estimate for planning. Verify with a tax professional or the Income Tax Department’s utility before filing.',
    ],
    faqs: [
      {
        q: 'Which regime should I choose?',
        a: 'Compare the two figures above using your real deductions. As a rough guide, the old regime usually wins only when your total deductions and exemptions — 80C, 80D, HRA and home loan interest together — run into several lakh rupees. Otherwise the new regime’s lower rates come out ahead.',
      },
      {
        q: 'Is income up to ₹12 lakh really tax-free?',
        a: 'Under the new regime, yes, for FY 2025-26 and FY 2026-27. Tax is computed normally and then a rebate of up to ₹60,000 under section 87A cancels it out for taxable income up to ₹12 lakh. A salaried taxpayer can reach ₹12.75 lakh of salary because of the ₹75,000 standard deduction. The rebate does not apply to capital gains.',
      },
      {
        q: 'Can I claim HRA under the new regime?',
        a: 'No. HRA exemption, 80C, 80D and most other deductions are only available under the old regime. The new regime allows the standard deduction and the employer’s NPS contribution under 80CCD(2).',
      },
      {
        q: 'What is marginal relief?',
        a: 'It stops a tiny increase in income from causing a disproportionate jump in tax. If your income just crosses the rebate limit or a surcharge threshold, the extra tax is capped at the extra income. This calculator applies it automatically.',
      },
      {
        q: 'How do I update the calculator when the Budget changes the slabs?',
        a: 'All rates live in src/data/taxRules.ts. Copy the most recent financial-year entry, change the numbers, and the new year appears in the dropdown — no other file needs editing.',
      },
    ],
  },
};

export default incomeTax;
