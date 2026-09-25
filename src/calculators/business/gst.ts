import type { CalculatorDef, Values } from '../types';
import { calculateGST, type GstMode, type GstResult, type GstSupply } from '@/engines/business';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  amount: num(v.amount),
  ratePct: str(v.rate) === 'custom' ? num(v.customRate) : num(v.rate),
  mode: str(v.mode, 'add') as GstMode,
  supply: str(v.supply, 'intra') as GstSupply,
});

const gst: CalculatorDef<GstResult> = {
  id: 'gst',

  fields: [
    {
      name: 'mode',
      label: 'What do you want to do?',
      type: 'segmented',
      default: 'add',
      wide: true,
      options: [
        { label: 'Add GST', value: 'add' },
        { label: 'Remove GST', value: 'remove' },
      ],
      help: '“Add” treats your amount as the pre-tax price. “Remove” treats it as the final GST-inclusive price.',
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'currency',
      default: 10000,
      min: 0,
      max: 1000000000,
      help: 'Base price when adding GST; the total price when removing it.',
    },
    {
      name: 'rate',
      label: 'GST Rate',
      type: 'select',
      default: '18',
      options: [
        { label: '0% — exempt / nil rated', value: '0' },
        { label: '5% — essentials', value: '5' },
        { label: '12% — legacy rate', value: '12' },
        { label: '18% — standard rate', value: '18' },
        { label: '28% — legacy rate', value: '28' },
        { label: '40% — demerit goods', value: '40' },
        { label: 'Custom rate', value: 'custom' },
      ],
      help: 'After the GST 2.0 reform the main slabs are 0%, 5%, 18% and 40%, though 12% and 28% still apply to some items.',
    },
    {
      name: 'customRate',
      label: 'Custom Rate',
      type: 'percent',
      default: 18,
      min: 0,
      max: 100,
      step: 0.1,
      visible: (v) => v.rate === 'custom',
    },
    {
      name: 'supply',
      label: 'Type of supply',
      type: 'segmented',
      default: 'intra',
      options: [
        { label: 'Within state (CGST + SGST)', value: 'intra' },
        { label: 'Interstate (IGST)', value: 'inter' },
      ],
      help: 'Supplies within a state split GST equally between the centre and the state; interstate supplies are charged as IGST.',
    },
  ],

  compute: (v) => calculateGST(toInput(v)),

  hero: (r, v) => [
    {
      label: str(v.mode, 'add') === 'add' ? 'Total price including GST' : 'Price before GST',
      value: formatINR(str(v.mode, 'add') === 'add' ? r.totalAmount : r.baseAmount, 2),
      caption: `GST at ${formatPercent(r.ratePct)}`,
    },
    {
      label: 'GST amount',
      value: formatINR(r.gstAmount, 2),
      caption: r.igst > 0 ? 'Charged as IGST' : 'Split equally as CGST and SGST',
    },
  ],

  stats: (r) => [
    { label: 'Base amount', value: formatINR(r.baseAmount, 2) },
    { label: 'Total GST', value: formatINR(r.gstAmount, 2), tone: 'accent' },
    ...(r.igst > 0
      ? [{ label: 'IGST', value: formatINR(r.igst, 2) }]
      : [
          { label: `CGST @ ${formatPercent(r.ratePct / 2)}`, value: formatINR(r.cgst, 2) },
          { label: `SGST @ ${formatPercent(r.ratePct / 2)}`, value: formatINR(r.sgst, 2) },
        ]),
    { label: 'Invoice total', value: formatINR(r.totalAmount, 2) },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Invoice split',
      centerLabel: 'Total',
      format: (n: number) => formatINR(n, 2),
      data:
        r.igst > 0
          ? [
              { label: 'Base amount', value: r.baseAmount },
              { label: 'IGST', value: r.igst },
            ]
          : [
              { label: 'Base amount', value: r.baseAmount },
              { label: 'CGST', value: r.cgst },
              { label: 'SGST', value: r.sgst },
            ],
    },
  ],

  summary: (r) =>
    `Base ${formatINR(r.baseAmount, 2)} + GST ${formatINR(r.gstAmount, 2)} at ${formatPercent(
      r.ratePct,
    )} = ${formatINR(r.totalAmount, 2)}.`,

  content: {
    howItWorks: [
      'Adding GST is straightforward: multiply the base price by the rate. Extracting GST from a price that already includes it is where people slip up — you cannot simply take 18% of the total. The tax-inclusive amount has to be divided by 1.18 to recover the base.',
      'Within a state, GST is split equally into CGST (central) and SGST (state). For interstate supplies the whole amount is charged as IGST, which the centre later apportions.',
    ],
    formula: `Adding GST:
  GST   = base × rate ÷ 100
  Total = base + GST

Removing GST:
  Base  = total ÷ (1 + rate ÷ 100)
  GST   = total − base

Within a state: CGST = SGST = GST ÷ 2`,
    example: [
      'A ₹10,000 base price at 18% GST: GST = ₹1,800, total = ₹11,800, split as ₹900 CGST + ₹900 SGST.',
      'Going the other way from a ₹11,800 inclusive price: base = 11,800 ÷ 1.18 = ₹10,000, so the GST was ₹1,800 — not ₹2,124, which is what 18% of the total would wrongly give.',
    ],
    assumptions: [
      'A single GST rate applies to the whole amount. Invoices with items at different rates must be calculated line by line.',
      'Cess on demerit goods such as tobacco and luxury cars is not included.',
      'Reverse charge, TDS under GST and input tax credit are outside the scope of this calculator.',
    ],
    notes: [
      'The GST 2.0 reform consolidated the structure around 0%, 5%, 18% and 40% slabs, with 12% and 28% retained for a limited set of goods.',
      'Registration is generally required above ₹40 lakh of turnover for goods and ₹20 lakh for services, with lower thresholds in special category states.',
    ],
    faqs: [
      {
        q: 'How do I remove GST from an inclusive price?',
        a: 'Divide by 1 plus the rate. At 18%, divide the total by 1.18. Taking 18% of the inclusive amount overstates the tax by about 18% of itself.',
      },
      {
        q: 'When is IGST charged instead of CGST and SGST?',
        a: 'When the supplier and the place of supply are in different states or union territories. Within the same state, the tax is split equally between CGST and SGST.',
      },
      {
        q: 'Which GST rate applies to my product?',
        a: 'It depends on the HSN or SAC code. Most services are at 18%, essentials at 5%, and demerit goods at 40%. Check the CBIC rate finder for a specific item.',
      },
    ],
  },
};

export default gst;
