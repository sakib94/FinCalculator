import type { CalculatorDef, Values } from '../types';
import { convertCurrency, CURRENCIES, currencySymbol, type CurrencyResult } from '@/engines/everyday';
import { formatNumber } from '@/lib/format';
import { num, str } from '@/lib/validate';
import { Note } from '@/components/Results';

const options = CURRENCIES.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code }));

const toInput = (v: Values) => ({
  amount: num(v.amount),
  rate: num(v.rate),
  markupPct: num(v.markup),
  flatFee: num(v.fee),
  from: str(v.from, 'USD'),
  to: str(v.to, 'INR'),
});

const money = (value: number, code: string): string => `${currencySymbol(code)} ${formatNumber(value, 2)}`;

const currency: CalculatorDef<CurrencyResult> = {
  id: 'currency',

  fields: [
    { name: 'from', label: 'From Currency', type: 'select', default: 'USD', options },
    { name: 'to', label: 'To Currency', type: 'select', default: 'INR', options },
    {
      name: 'amount',
      label: 'Amount to Convert',
      type: 'number',
      default: 1000,
      min: 0,
      max: 1000000000,
      step: 0.01,
    },
    {
      name: 'rate',
      label: 'Exchange Rate',
      type: 'number',
      default: 88,
      min: 0,
      max: 100000,
      step: 0.0001,
      help: 'How many units of the target currency one unit of the source currency buys. Look up the live mid-market rate and enter it here.',
    },
    {
      name: 'markup',
      label: 'Bank / Forex Markup',
      type: 'percent',
      default: 2,
      min: 0,
      max: 20,
      step: 0.1,
      slider: true,
      optional: true,
      help: 'Banks and card networks add a spread over the mid-market rate — typically 1.5–3.5%.',
    },
    {
      name: 'fee',
      label: 'Fixed Transfer Fee',
      type: 'number',
      default: 0,
      min: 0,
      max: 1000000,
      step: 0.01,
      optional: true,
      help: 'Charged in the source currency, deducted before conversion.',
    },
  ],

  compute: (v) => convertCurrency(toInput(v)),

  hero: (r, v) => [
    {
      label: `Converted amount`,
      value: money(r.converted, str(v.to, 'INR')),
      caption: `${money(num(v.amount), str(v.from, 'USD'))} at an effective rate of ${formatNumber(
        r.effectiveRate,
        4,
      )}`,
    },
    {
      label: 'Cost of conversion',
      value: money(r.totalCost, str(v.to, 'INR')),
      caption: 'Markup and fees, versus the mid-market rate',
    },
  ],

  stats: (r, v) => [
    { label: 'Mid-market rate', value: formatNumber(num(v.rate), 4) },
    { label: 'Effective rate', value: formatNumber(r.effectiveRate, 4), tone: 'accent' },
    { label: 'Reverse rate', value: formatNumber(r.reverseRate, 6), help: `1 ${str(v.to)} in ${str(v.from)}.` },
    { label: 'Markup cost', value: money(r.markupCost, str(v.to, 'INR')), tone: r.markupCost > 0 ? 'negative' : 'default' },
    { label: 'Amount after fee', value: money(r.amountAfterFee, str(v.from, 'USD')) },
  ],

  extra: () => (
    <Note>
      Finora never fetches live rates — it works entirely offline, so the rate is yours to supply. Use the
      mid-market rate from a source you trust, then add your bank’s markup to see what you will actually
      receive.
    </Note>
  ),

  summary: (r, v) =>
    `${money(num(v.amount), str(v.from, 'USD'))} = ${money(r.converted, str(v.to, 'INR'))} at an effective rate of ${formatNumber(
      r.effectiveRate,
      4,
    )}.`,

  content: {
    howItWorks: [
      'Converting currency is a multiplication, but the rate you get is rarely the rate you see quoted. Banks, cards and transfer services add a markup — a spread over the mid-market rate — and often a fixed fee on top.',
      'This calculator applies the fee first, then converts at the marked-up rate, which is how most remittance services actually work. The “cost of conversion” line shows what that combination costs you compared with the mid-market rate.',
    ],
    formula: `Effective rate = mid-market rate × (1 − markup ÷ 100)
Converted     = (amount − fixed fee) × effective rate
Cost          = amount × mid-market rate − converted`,
    example: [
      'Converting $1,000 to INR at a mid-market rate of 88.00 with a 2% bank markup.',
      'Effective rate = 88 × 0.98 = 86.24, so you receive ₹86,240.',
      'At the mid-market rate you would have received ₹88,000 — the 2% markup cost ₹1,760.',
    ],
    assumptions: [
      'The rate you enter is the mid-market rate. If you enter the rate your bank already quoted, set the markup to zero.',
      'The fixed fee is charged in the source currency and deducted before conversion.',
      'Rates move continuously; the figure is only as current as the rate you type.',
    ],
    notes: [
      'Card networks typically add 1.5–3.5% on foreign transactions, plus a cross-currency fee charged by the issuing bank.',
      'Outward remittances from India attract TCS above the annual threshold under the Liberalised Remittance Scheme, which is not included here.',
    ],
    faqs: [
      {
        q: 'Why does the calculator not fetch live rates?',
        a: 'Finora runs entirely in your browser with no network calls, which is what lets it work offline and keeps your figures private. Enter the rate from any source you trust.',
      },
      {
        q: 'What is the mid-market rate?',
        a: 'The midpoint between the buy and sell prices in the global currency market — the rate you see on financial sites. It is what banks trade at, not what they give retail customers.',
      },
      {
        q: 'How much markup do banks charge?',
        a: 'Typically 1.5–3.5% for card transactions and wire transfers. Specialist transfer services are usually cheaper. Comparing the effective rate, not the advertised fee, is the only reliable way to tell.',
      },
    ],
  },
};

export default currency;
