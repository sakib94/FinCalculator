import type { CalculatorDef, ValidationErrors, Values } from '../types';
import { calculateDiscount, type DiscountMode, type DiscountResult } from '@/engines/businessPlus';
import { formatINR, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

const modeOf = (v: Values): DiscountMode => (str(v.mode, 'percent') === 'amount' ? 'amount' : 'percent');
/** Paise matter on small prices; on large ones they are noise. */
const money = (n: number, ref: number) => formatINR(n, ref < 1000 ? 2 : 0);

const discount: CalculatorDef<DiscountResult> = {
  id: 'discount',

  fields: [
    {
      name: 'mode',
      label: 'Discount type',
      type: 'segmented',
      prominent: true,
      default: 'percent',
      options: [
        { label: '% off', value: 'percent' },
        { label: '₹ off', value: 'amount' },
      ],
    },
    {
      name: 'price',
      label: 'Original Price (MRP)',
      type: 'currency',
      default: 4999,
      min: 1,
      max: 1000000000,
      slider: true,
      step: 100,
    },
    {
      name: 'discountPct',
      label: 'Discount',
      type: 'percent',
      default: 30,
      min: 0,
      max: 100,
      step: 1,
      slider: true,
      visible: (v) => modeOf(v) === 'percent',
    },
    {
      name: 'discountAmount',
      label: 'Discount Amount',
      type: 'currency',
      default: 500,
      min: 0,
      max: 1000000000,
      visible: (v) => modeOf(v) === 'amount',
      help: 'A flat amount off, such as a ₹500 coupon.',
    },
    {
      name: 'extraDiscountPct',
      label: 'Additional Discount',
      type: 'percent',
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      slider: true,
      optional: true,
      help: 'A second discount on the already-reduced price — “extra 10% off”, a bank-card offer or a loyalty discount.',
    },
    {
      name: 'taxPct',
      label: 'GST / Tax to Add',
      type: 'percent',
      default: 0,
      min: 0,
      max: 40,
      step: 0.5,
      optional: true,
      help: 'Leave at 0 if the price already includes GST, as MRPs in India do.',
    },
  ],

  validate: (v): ValidationErrors =>
    modeOf(v) === 'amount' && num(v.discountAmount) > num(v.price)
      ? { discountAmount: 'The discount cannot be more than the price.' }
      : {},

  compute: (v) =>
    calculateDiscount({
      mode: modeOf(v),
      price: num(v.price),
      discountPct: num(v.discountPct),
      discountAmount: num(v.discountAmount),
      extraDiscountPct: num(v.extraDiscountPct),
      taxPct: num(v.taxPct),
    }),

  hero: (r) => [
    {
      label: 'You pay',
      value: money(r.finalPrice, r.price),
      caption: r.tax > 0 ? `Including ${money(r.tax, r.price)} tax` : `Down from ${money(r.price, r.price)}`,
    },
    {
      label: 'You save',
      value: money(r.totalSaved, r.price),
      caption: `${formatPercent(r.effectiveDiscountPct, 1)} off the original price`,
    },
  ],

  stats: (r, v) => [
    { label: 'Original price', value: money(r.price, r.price) },
    {
      label: modeOf(v) === 'amount' ? 'Flat discount' : `Discount (${formatPercent(num(v.discountPct))})`,
      value: money(r.firstDiscount, r.price),
      tone: 'positive',
    },
    ...(r.extraDiscount > 0
      ? [
          {
            label: `Additional ${formatPercent(num(v.extraDiscountPct))} off`,
            value: money(r.extraDiscount, r.price),
            tone: 'positive' as const,
          },
          {
            label: 'Effective discount',
            value: formatPercent(r.effectiveDiscountPct, 2),
            tone: 'accent' as const,
            help: 'Stacked discounts multiply rather than add — 30% + 10% is 37% off, not 40%.',
          },
        ]
      : []),
    { label: 'Price after discount', value: money(r.afterDiscounts, r.price) },
    ...(r.tax > 0 ? [{ label: `Tax (${formatPercent(num(v.taxPct))})`, value: money(r.tax, r.price) }] : []),
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Where the original price goes',
      centerLabel: 'MRP',
      data: [
        { label: 'You pay', value: r.afterDiscounts },
        { label: 'You save', value: r.totalSaved },
      ],
    },
  ],

  summary: (r) =>
    `Pay ${money(r.finalPrice, r.price)} instead of ${money(r.price, r.price)} — you save ${money(
      r.totalSaved,
      r.price,
    )} (${formatPercent(r.effectiveDiscountPct, 1)} off).`,

  content: {
    howItWorks: [
      'Enter the original price and the discount — as a percentage or a flat rupee amount — and the calculator shows the price you pay and how much you save.',
      'Many sales stack a second discount on top: “flat 30% off + extra 10%”. The second discount applies to the already-reduced price, so the two multiply rather than add. 30% plus 10% is 37% off, not 40%.',
      'If tax is charged on top of the discounted price (common on B2B invoices and some services), add the rate and it is applied after every discount.',
    ],
    formula: `Price after discount = Price × (1 − d₁) × (1 − d₂)
Effective discount   = 1 − (1 − d₁) × (1 − d₂)
Final price          = Price after discount × (1 + tax)`,
    example: [
      'A ₹4,999 jacket at 30% off, with an extra 10% card offer.',
      'After 30%: ₹3,499.30. After the extra 10%: ₹3,149.37.',
      'You save ₹1,849.63 — an effective 37% off, not 40%.',
    ],
    notes: [
      'MRPs in India already include GST, so leave the tax at 0 for retail purchases.',
      '“Up to 70% off” usually means only a few items get the full discount. Check the price of the item you actually want.',
      'Bank-card offers are often capped at a maximum rupee amount — on a big purchase the effective discount can be much smaller than the headline percentage.',
    ],
    faqs: [
      {
        q: 'How do I calculate a discount percentage?',
        a: 'Divide the amount saved by the original price and multiply by 100. A ₹4,999 item sold for ₹3,999 is (1,000 ÷ 4,999) × 100 ≈ 20% off.',
      },
      {
        q: 'Is 50% + 20% off the same as 70% off?',
        a: 'No. 50% off leaves half the price; another 20% off that leaves 40% of the original. The total discount is 60%, not 70%.',
      },
      {
        q: 'How do I find the original price from the sale price?',
        a: 'Divide the sale price by (1 − discount). A ₹2,100 price after 30% off was originally 2,100 ÷ 0.7 = ₹3,000.',
      },
    ],
  },
};

export default discount;
