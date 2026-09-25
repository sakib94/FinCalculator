import type { CalculatorDef, Field, ValidationErrors, Values } from '../types';
import {
  POST_OFFICE_SCHEMES,
  calculatePostOffice,
  schemeById,
  type PostOfficeResult,
  type PostOfficeSchemeId,
} from '@/engines/savings';
import { formatDuration, formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';
import { Note } from '@/components/Results';

const schemeOf = (v: Values): PostOfficeSchemeId => schemeById(str(v.scheme, 'nsc')).id;
const rateField = (id: PostOfficeSchemeId) => `rate_${id}`;

/*
 * Each scheme gets its own rate field, shown only while that scheme is
 * selected. Rates differ per scheme, and a shared field would either show
 * the wrong default or silently discard what the reader typed on a switch.
 */
const rateFields: Field[] = POST_OFFICE_SCHEMES.map((s) => ({
  name: rateField(s.id),
  label: 'Interest Rate',
  type: 'percent',
  default: s.rate,
  min: 0.5,
  max: 15,
  step: 0.1,
  slider: true,
  visible: (v: Values) => schemeOf(v) === s.id,
  help: 'Pre-filled with the rate notified by the Ministry of Finance for recent quarters. Rates are reviewed every quarter — edit it if it has changed.',
}));

const postOffice: CalculatorDef<PostOfficeResult> = {
  id: 'post-office',

  fields: [
    {
      name: 'scheme',
      label: 'Scheme',
      type: 'select',
      default: 'nsc',
      wide: true,
      options: POST_OFFICE_SCHEMES.map((s) => ({ label: s.name, value: s.id })),
    },
    {
      name: 'amount',
      label: 'Investment Amount',
      type: 'currency',
      default: 100000,
      min: 1000,
      max: 100000000,
      slider: true,
      step: 1000,
      help: 'Minimum ₹1,000 for every scheme. MIS is capped at ₹9 lakh (₹15 lakh joint) and SCSS at ₹30 lakh.',
    },
    ...rateFields,
  ],

  validate: (v): ValidationErrors => {
    const s = schemeById(str(v.scheme, 'nsc'));
    const amount = num(v.amount);
    if (s.maxDeposit != null && amount > s.maxDeposit)
      return { amount: `${s.short} allows at most ${formatINR(s.maxDeposit)} per investor.` };
    return {};
  },

  compute: (v) =>
    calculatePostOffice({
      scheme: schemeOf(v),
      amount: num(v.amount),
      annualRatePct: num(v[rateField(schemeOf(v))]),
    }),

  hero: (r) =>
    r.scheme.kind === 'cumulative'
      ? {
          label: 'Maturity value',
          value: formatINR(r.maturity),
          caption: `${r.scheme.short} · matures in ${formatDuration(r.months)} · interest ${formatINRCompact(
            r.totalInterest,
          )}`,
        }
      : [
          {
            label: `${r.payoutLabel} income`,
            value: formatINR(r.payout),
            caption: `${r.scheme.short} at ${formatPercent(r.ratePct)} · paid ${r.payoutLabel.toLowerCase()} for ${formatDuration(
              r.months,
            )}`,
          },
          {
            label: 'Total interest over the term',
            value: formatINR(r.totalInterest),
            caption: `Your ${formatINRCompact(r.amount)} is returned at maturity`,
          },
        ],

  stats: (r) => [
    { label: 'Amount invested', value: formatINR(r.amount) },
    ...(r.scheme.kind === 'cumulative'
      ? [
          { label: 'Interest earned', value: formatINR(r.totalInterest), tone: 'positive' as const },
          {
            label: 'Maturity period',
            value: formatDuration(r.months),
            help: r.scheme.id === 'kvp' ? 'KVP matures when the deposit doubles, so the term depends on the rate.' : undefined,
          },
        ]
      : [
          { label: 'Amount at maturity', value: formatINR(r.maturity), help: 'Your principal comes back; interest has already been paid out.' },
          { label: 'Tenure', value: formatDuration(r.months) },
        ]),
    {
      label: 'Effective annual yield',
      value: formatPercent(r.effectiveYieldPct),
      tone: 'accent',
      help:
        r.scheme.kind === 'cumulative'
          ? 'The annualised return on your money, with interest compounded yearly.'
          : 'Interest received each year as a share of the amount invested.',
    },
    {
      label: 'Section 80C',
      value: r.scheme.section80C ? 'Eligible' : 'Not eligible',
      tone: r.scheme.section80C ? 'positive' : 'default',
      help: '80C deductions are available only in the old tax regime, up to ₹1.5 lakh a year across all eligible investments.',
    },
  ],

  charts: (r) => [
    r.scheme.kind === 'cumulative'
      ? {
          kind: 'line' as const,
          title: 'Balance year by year',
          x: r.rows.map((row) => `Y${row.year}`),
          xLabel: 'Year',
          area: true,
          series: [{ name: 'Balance', values: r.rows.map((row) => row.closing) }],
        }
      : {
          kind: 'bar' as const,
          title: 'Interest paid out each year',
          x: r.rows.map((row) => `Y${row.year}`),
          xLabel: 'Year',
          series: [{ name: 'Interest paid', values: r.rows.map((row) => row.paidOut) }],
        },
    {
      kind: 'donut' as const,
      title: 'Principal vs interest',
      centerLabel: 'Total',
      data: [
        { label: 'Principal', value: r.amount },
        { label: 'Interest', value: r.totalInterest },
      ],
    },
  ],

  table: (r) =>
    r.scheme.kind === 'cumulative'
      ? {
          title: 'Year-wise growth',
          csvName: `finora-${r.scheme.id}-projection`,
          columns: [
            { key: 'year', label: 'Year', align: 'left' },
            { key: 'opening', label: 'Opening' },
            { key: 'interest', label: 'Interest' },
            { key: 'closing', label: 'Closing' },
          ],
          rows: r.rows.map((row) => ({
            year: String(row.year),
            opening: formatINR(row.opening),
            interest: formatINR(row.interest),
            closing: formatINR(row.closing),
          })),
          csvRows: r.rows.map((row) => ({
            year: row.year,
            opening: Math.round(row.opening),
            interest: Math.round(row.interest),
            closing: Math.round(row.closing),
          })),
        }
      : {
          title: 'Year-wise payouts',
          csvName: `finora-${r.scheme.id}-payouts`,
          columns: [
            { key: 'year', label: 'Year', align: 'left' },
            { key: 'principal', label: 'Principal held' },
            { key: 'paid', label: 'Interest paid' },
            { key: 'cumulative', label: 'Interest received so far' },
          ],
          rows: r.rows.map((row, i) => ({
            year: String(row.year),
            principal: formatINR(row.opening),
            paid: formatINR(row.paidOut),
            cumulative: formatINR(r.rows.slice(0, i + 1).reduce((s, x) => s + x.paidOut, 0)),
          })),
          csvRows: r.rows.map((row, i) => ({
            year: row.year,
            principal: Math.round(row.opening),
            paid: Math.round(row.paidOut),
            cumulative: Math.round(r.rows.slice(0, i + 1).reduce((s, x) => s + x.paidOut, 0)),
          })),
        },

  extra: (r) => {
    if (r.scheme.id === 'mis' && r.amount > 900000)
      return (
        <Note tone="warn">
          A single-holder MIS account is capped at ₹9 lakh. Investing {formatINR(r.amount)} needs a joint account
          (limit ₹15 lakh).
        </Note>
      );
    if (r.scheme.id === 'scss')
      return (
        <Note>
          SCSS is open to residents aged 60 and above (55 for those who took voluntary retirement, 50 for retired
          defence personnel). Interest is paid on the first working day of April, July, October and January.
        </Note>
      );
    return null;
  },

  summary: (r) =>
    r.scheme.kind === 'cumulative'
      ? `${r.scheme.short}: ${formatINR(r.amount)} at ${formatPercent(r.ratePct)} matures at ${formatINR(
          r.maturity,
        )} after ${formatDuration(r.months)}.`
      : `${r.scheme.short}: ${formatINR(r.amount)} at ${formatPercent(r.ratePct)} pays ${formatINR(
          r.payout,
        )} ${r.payoutLabel.toLowerCase()} — ${formatINR(r.totalInterest)} over ${formatDuration(r.months)}.`,

  content: {
    howItWorks: [
      'India Post’s savings schemes are backed by the Government of India, which makes them among the safest places to keep money in the country. They come in two shapes, and the calculator handles both.',
      'Cumulative schemes — NSC and KVP — reinvest the interest every year and pay everything at maturity. NSC runs for 5 years; KVP simply doubles your money, and its term is however long that takes at the current rate (115 months at 7.5%).',
      'Income schemes — MIS, SCSS and Time Deposits — pay the interest out as it is earned and return your principal at the end. MIS pays monthly, SCSS quarterly, and Time Deposits once a year (interest is calculated quarterly but paid annually).',
    ],
    formula: `NSC / KVP:   Maturity = P × (1 + r)^years       (compounded yearly)
MIS:         Monthly income = P × r ÷ 12
SCSS:        Quarterly income = P × r ÷ 4
TD:          Yearly interest = P × [(1 + r/4)⁴ − 1]`,
    example: [
      'NSC: ₹1,00,000 at 7.7% for 5 years grows to about ₹1,44,903.',
      'MIS: ₹9,00,000 at 7.4% pays ₹5,550 every month for 5 years.',
      'SCSS: ₹30,00,000 at 8.2% pays ₹61,500 every quarter — ₹2,46,000 a year.',
    ],
    assumptions: [
      'The rate is locked in on the day you invest and applies for the full term, even if later quarters change the notified rate.',
      'The investment is held to maturity. Premature closure is allowed for most schemes after a lock-in, with a penalty.',
      'Tax is not deducted in the figures shown.',
    ],
    notes: [
      'Interest from every scheme here is taxable at your slab rate. NSC interest is treated as reinvested and itself qualifies for 80C in the first four years.',
      'SCSS, NSC and the 5-year Time Deposit qualify for Section 80C under the old tax regime. KVP and MIS do not.',
      'Small savings rates are reviewed by the government every quarter. The defaults here are recent rates — check indiapost.gov.in before investing.',
    ],
    faqs: [
      {
        q: 'Which post office scheme gives the highest return?',
        a: 'Among these, SCSS pays the most (8.2%) but is limited to senior citizens. For everyone else, NSC (7.7%) is the highest among fixed-term schemes, followed by KVP and the 5-year Time Deposit at 7.5%.',
      },
      {
        q: 'Is post office interest taxable?',
        a: 'Yes. Interest from NSC, KVP, MIS, SCSS and Time Deposits is added to your income and taxed at your slab rate. PPF and Sukanya Samriddhi are the tax-free exceptions.',
      },
      {
        q: 'How long does KVP take to double money?',
        a: 'At the current 7.5% rate, 115 months (9 years 7 months). The term is set by the government whenever the rate changes.',
      },
    ],
  },
};

export default postOffice;
