import type { CalculatorDef, Values } from '../types';
import { calculateTDS, TDS_SECTIONS, type DeducteeType, type TdsResult } from '@/engines/taxTools';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  sectionId: str(v.section, '194c'),
  paymentAmount: num(v.paymentAmount),
  previousPayments: num(v.previousPayments),
  deducteeType: str(v.deducteeType, 'individual') as DeducteeType,
  panAvailable: str(v.pan, 'yes') === 'yes',
});

const tds: CalculatorDef<TdsResult> = {
  id: 'tds',

  fields: [
    {
      name: 'section',
      label: 'Nature of payment',
      type: 'select',
      default: '194c',
      wide: true,
      options: TDS_SECTIONS.map((s) => ({
        label: `${s.code} — ${s.label}`,
        value: s.id,
      })),
      help: 'Each section carries its own rate and its own threshold.',
    },
    {
      name: 'paymentAmount',
      label: 'Payment Amount',
      type: 'currency',
      default: 200000,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 10000,
      help: 'The amount being paid now, before deduction.',
    },
    {
      name: 'previousPayments',
      label: 'Already paid this year',
      type: 'currency',
      default: 0,
      min: 0,
      max: 1000000000,
      slider: true,
      step: 10000,
      optional: true,
      help: 'Everything already paid to this person this financial year under the same section. Thresholds apply to the aggregate.',
    },
    {
      name: 'deducteeType',
      label: 'Who are you paying?',
      type: 'segmented',
      default: 'individual',
      options: [
        { label: 'Individual / HUF', value: 'individual' },
        { label: 'Company / Firm', value: 'company' },
      ],
      help: 'Section 194C charges 1% to individuals and HUFs but 2% to companies and firms.',
    },
    {
      name: 'pan',
      label: 'PAN furnished?',
      type: 'segmented',
      default: 'yes',
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      help: 'Without a PAN, section 206AA forces deduction at the higher of the section rate or 20%.',
    },
  ],

  compute: (v) => calculateTDS(toInput(v)),

  hero: (r) => [
    {
      label: 'TDS to deduct',
      value: formatINR(r.tdsAmount),
      caption: r.thresholdCrossed
        ? `${r.section.code} at ${formatPercent(r.applicableRate, 2)}`
        : `Below the ${formatINR(r.thresholdApplied)} threshold — no deduction required`,
    },
    {
      label: 'Net amount payable',
      value: formatINR(r.netPayable),
      caption: 'What actually reaches the payee',
    },
  ],

  stats: (r) => [
    { label: 'Section', value: r.section.code },
    {
      label: 'Applicable rate',
      value: formatPercent(r.applicableRate, 2),
      tone: r.panPenaltyApplied ? 'negative' : 'accent',
      help: r.panPenaltyApplied
        ? `Raised from ${r.baseRate}% to 20% under section 206AA because no PAN was furnished.`
        : 'The prescribed rate for this section and deductee type.',
    },
    { label: 'Gross payment', value: formatINR(r.paymentAmount) },
    {
      label: 'Aggregate this year',
      value: formatINR(r.aggregateAmount),
      help: 'Used to test the annual threshold.',
    },
    {
      label: 'Threshold',
      value: formatINR(r.thresholdApplied),
      tone: r.thresholdCrossed ? 'negative' : 'positive',
    },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Payment split',
      centerLabel: 'Payment',
      data: [
        { label: 'Net to payee', value: r.netPayable },
        { label: 'TDS to government', value: r.tdsAmount },
      ],
    },
  ],

  table: (r) => ({
    title: 'Deduction working',
    csvName: 'finora-tds',
    columns: [
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'value', label: 'Amount' },
    ],
    rows: [
      { item: 'Gross payment', value: formatINR(r.paymentAmount) },
      { item: 'Previously paid this year', value: formatINR(r.aggregateAmount - r.paymentAmount) },
      { item: 'Aggregate for threshold test', value: formatINR(r.aggregateAmount) },
      { item: `Threshold (${r.section.code})`, value: formatINR(r.thresholdApplied) },
      { item: 'Rate applied', value: formatPercent(r.applicableRate, 2) },
      { item: 'TDS deducted', value: formatINR(r.tdsAmount) },
    ],
    footer: { item: 'Net payable', value: formatINR(r.netPayable) },
    note: r.section.note,
  }),

  summary: (r) =>
    `TDS under ${r.section.code}: ${formatINR(r.tdsAmount)} at ${formatPercent(
      r.applicableRate,
      2,
    )} — net payable ${formatINR(r.netPayable)}.`,

  content: {
    howItWorks: [
      'Tax deducted at source shifts collection to the moment income is paid. The payer withholds a percentage, deposits it with the government against the payee’s PAN, and hands over the balance. The payee then claims that amount as credit in their return.',
      'Two things determine the deduction, and the threshold matters as much as the rate. Below the threshold nothing is deducted at all. Above it, deduction applies to the full payment — not just the excess, which is the opposite of how income tax slabs work and a frequent source of confusion.',
      'Thresholds are tested on the aggregate paid to that person in the financial year, not on each bill. Section 194C has two: ₹30,000 for any single payment and ₹1,00,000 in aggregate. Crossing either one triggers deduction.',
      'Section 206AA is the sting. If the payee does not furnish a PAN, you must deduct at the higher of the prescribed rate or 20%. On a 1% contractor payment that is a twentyfold increase, and the payee cannot claim credit without a PAN either.',
    ],
    formula: `If aggregate payments > threshold:
    TDS = payment × applicable rate

Applicable rate = prescribed section rate,
                  or 20% if no PAN (section 206AA),
                  whichever is higher

Net payable = payment − TDS`,
    example: [
      '₹2,00,000 paid to an individual contractor under section 194C, with a PAN on record.',
      'The aggregate exceeds the ₹1,00,000 annual threshold, so deduction applies at 1%.',
      'TDS is ₹2,000 and the contractor receives ₹1,98,000. Without a PAN it would be ₹40,000 at 20%.',
    ],
    assumptions: [
      'Rates reflect FY 2025-26 and FY 2026-27. TDS rates change frequently — verify against the current Finance Act before making a live deduction.',
      'No lower-deduction or nil-deduction certificate under section 197 has been obtained by the payee.',
      'The payment is not to a non-resident. Payments abroad fall under section 195 with entirely different rules and rates.',
      'Surcharge and cess are not added. These apply only to non-resident payments, not to resident TDS.',
    ],
    notes: [
      'TDS must be deposited by the 7th of the following month. For March deductions the due date is 30 April.',
      'Late deposit attracts interest at 1.5% per month, and late deduction at 1%, calculated from the date the tax should have been deducted.',
      'Quarterly returns are due in Form 26Q for resident non-salary payments; late filing carries a ₹200-per-day fee.',
      'Failure to deduct can cause 30% of the expense to be disallowed under section 40(a)(ia) when computing business income.',
      'The payee sees the credit in Form 26AS and the Annual Information Statement once the return is filed.',
    ],
    faqs: [
      {
        q: 'Is TDS deducted on the amount above the threshold or the whole payment?',
        a: 'The whole payment, once the threshold is crossed. This is unlike income tax slabs, where only the excess is taxed at the higher rate. Crossing a TDS threshold by ₹1 makes the entire payment liable.',
      },
      {
        q: 'What happens if the payee has no PAN?',
        a: 'Section 206AA requires deduction at the higher of the prescribed rate or 20%. Worse, without a PAN the deduction cannot be credited to the payee, so they lose the money entirely. Always collect the PAN first.',
      },
      {
        q: 'Do thresholds apply per bill or per year?',
        a: 'Per financial year, aggregated across all payments to the same person under the same section — which is why the calculator asks what you have already paid. Section 194C additionally has a per-payment threshold of ₹30,000.',
      },
      {
        q: 'Can the payee avoid TDS if their income is below the exemption limit?',
        a: 'Yes. They can apply under section 197 for a lower or nil deduction certificate, or file Form 15G or 15H for interest income. Without one of those, you must deduct.',
      },
      {
        q: 'What is the difference between 194J professional and technical services?',
        a: 'Professional services — legal, medical, accountancy, engineering, architecture — attract 10%. Technical services attract 2%. The distinction is frequently litigated, so classify carefully.',
      },
    ],
  },
};

export default tds;
