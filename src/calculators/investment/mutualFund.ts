import type { CalculatorDef, Values } from '../types';
import {
  calculateLumpsum,
  calculateSIP,
  type LumpsumResult,
  type SipResult,
} from '@/engines/investment';
import { formatINR, formatINRCompact, formatPercent } from '@/lib/format';
import { num, str } from '@/lib/validate';

/* ------------------------------------------------------------------
 * Mutual fund returns — SIP and lumpsum in one calculator.
 *
 * The two modes answer the same question ("what will this be worth?")
 * from the two ways money actually goes into a fund, so they share one
 * screen and one mode switch rather than living on separate pages.
 * The maths stays separate: each mode calls its own engine.
 * ------------------------------------------------------------------ */

export type MfMode = 'sip' | 'lumpsum';

export type MfResult =
  | { mode: 'sip'; sip: SipResult }
  | { mode: 'lumpsum'; lump: LumpsumResult };

const modeOf = (v: Values): MfMode => (str(v.mode, 'sip') === 'lumpsum' ? 'lumpsum' : 'sip');
const isSip = (v: Values) => modeOf(v) === 'sip';
const isLump = (v: Values) => modeOf(v) === 'lumpsum';

const mutualFund: CalculatorDef<MfResult> = {
  id: 'mutual-fund',

  fields: [
    {
      name: 'mode',
      label: 'Investment type',
      type: 'segmented',
      prominent: true,
      default: 'sip',
      options: [
        { label: 'SIP', value: 'sip' },
        { label: 'Lumpsum', value: 'lumpsum' },
      ],
    },

    /* ---- SIP ---- */
    {
      name: 'monthlyInvestment',
      label: 'How much will you invest each month?',
      type: 'currency',
      default: 25000,
      min: 100,
      max: 10000000,
      slider: true,
      step: 500,
      visible: isSip,
    },
    {
      name: 'stepUp',
      label: 'Annual Step-up',
      type: 'percent',
      default: 0,
      min: 0,
      max: 50,
      step: 1,
      slider: true,
      visible: isSip,
      help: 'Increase your SIP by this much every year. Even 10% a year changes the outcome dramatically.',
    },

    /* ---- Lumpsum ---- */
    {
      name: 'amount',
      label: 'How much will you invest?',
      type: 'currency',
      default: 500000,
      min: 500,
      max: 1000000000,
      slider: true,
      step: 10000,
      visible: isLump,
    },

    /* ---- Shared ---- */
    {
      name: 'years',
      label: 'Time period',
      type: 'number',
      default: 10,
      min: 1,
      max: 40,
      unit: 'yrs',
      slider: true,
    },
    {
      name: 'expectedReturn',
      label: 'Expected Rate of Return',
      type: 'percent',
      default: 12,
      min: 1,
      max: 30,
      step: 0.5,
      slider: true,
      help: 'Equity funds 11–13%, hybrid 8–10%, debt 6–7% as long-run planning figures.',
    },
  ],

  compute: (v): MfResult =>
    isSip(v)
      ? {
          mode: 'sip',
          sip: calculateSIP({
            monthlyInvestment: num(v.monthlyInvestment),
            expectedReturnPct: num(v.expectedReturn),
            years: num(v.years),
            annualStepUpPct: num(v.stepUp),
          }),
        }
      : {
          mode: 'lumpsum',
          lump: calculateLumpsum({
            amount: num(v.amount),
            expectedReturnPct: num(v.expectedReturn),
            years: num(v.years),
          }),
        },

  hero: (r) =>
    r.mode === 'sip'
      ? {
          label: 'Estimated maturity value',
          value: formatINR(r.sip.futureValue),
          caption: `${formatINRCompact(r.sip.futureValue)} · invested ${formatINRCompact(
            r.sip.totalInvested,
          )}`,
        }
      : {
          label: 'Estimated future value',
          value: formatINR(r.lump.futureValue),
          caption: `${formatINRCompact(r.lump.futureValue)} · ${formatPercent(
            r.lump.absoluteReturnPct,
            1,
          )} absolute return`,
        },

  stats: (r, v) =>
    r.mode === 'sip'
      ? [
          { label: 'Invested amount', value: formatINR(r.sip.totalInvested) },
          { label: 'Estimated returns', value: formatINR(r.sip.estimatedReturns), tone: 'positive' },
          { label: 'Absolute return', value: formatPercent(r.sip.absoluteReturnPct, 1), tone: 'accent' },
          ...(num(v.stepUp) > 0
            ? [
                {
                  label: 'Final monthly SIP',
                  value: formatINR(r.sip.finalMonthly),
                  help: 'After annual step-ups.',
                },
              ]
            : []),
        ]
      : [
          { label: 'Invested amount', value: formatINR(r.lump.invested) },
          {
            label: 'Estimated returns',
            value: formatINR(r.lump.estimatedReturns),
            tone: r.lump.estimatedReturns >= 0 ? 'positive' : 'negative',
          },
          { label: 'Absolute return', value: formatPercent(r.lump.absoluteReturnPct, 1) },
          {
            label: 'CAGR',
            value: formatPercent(r.lump.cagrPct),
            tone: 'accent',
            help: 'The annualised rate at which the investment grew.',
          },
        ],

  charts: (r) =>
    r.mode === 'sip'
      ? [
          {
            kind: 'line' as const,
            title: 'Invested amount vs value',
            x: r.sip.rows.map((row) => `Y${row.year}`),
            xLabel: 'Year',
            stacked: true,
            series: [
              { name: 'Amount invested', values: r.sip.rows.map((row) => row.totalInvested) },
              { name: 'Returns earned', values: r.sip.rows.map((row) => row.wealthGained) },
            ],
          },
          {
            kind: 'donut' as const,
            title: 'Maturity value split',
            centerLabel: 'Maturity',
            data: [
              { label: 'Amount invested', value: r.sip.totalInvested },
              { label: 'Returns earned', value: Math.max(0, r.sip.estimatedReturns) },
            ],
          },
        ]
      : [
          {
            kind: 'line' as const,
            title: 'Growth of your investment',
            x: r.lump.rows.map((row) => `Y${row.year}`),
            xLabel: 'Year',
            area: true,
            series: [{ name: 'Value', values: r.lump.rows.map((row) => row.balance) }],
          },
          {
            kind: 'donut' as const,
            title: 'Investment vs returns',
            centerLabel: 'Value',
            data: [
              { label: 'Amount invested', value: r.lump.invested },
              { label: 'Returns earned', value: Math.max(0, r.lump.estimatedReturns) },
            ],
          },
        ],

  table: (r) =>
    r.mode === 'sip'
      ? {
          title: 'Year-wise growth',
          previewRows: 10,
          csvName: 'finora-sip-projection',
          columns: [
            { key: 'year', label: 'Year', align: 'left' },
            { key: 'monthly', label: 'Monthly SIP' },
            { key: 'invested', label: 'Invested (cumulative)' },
            { key: 'gain', label: 'Returns' },
            { key: 'value', label: 'Value' },
          ],
          rows: r.sip.rows.map((row) => ({
            year: String(row.year),
            monthly: formatINR(row.monthlyInvestment),
            invested: formatINR(row.totalInvested),
            gain: formatINR(row.wealthGained),
            value: formatINR(row.balance),
          })),
          csvRows: r.sip.rows.map((row) => ({
            year: row.year,
            monthly: Math.round(row.monthlyInvestment),
            invested: Math.round(row.totalInvested),
            gain: Math.round(row.wealthGained),
            value: Math.round(row.balance),
          })),
        }
      : {
          title: 'Year-wise value',
          previewRows: 10,
          csvName: 'finora-lumpsum-projection',
          columns: [
            { key: 'year', label: 'Year', align: 'left' },
            { key: 'opening', label: 'Opening' },
            { key: 'growth', label: 'Growth' },
            { key: 'balance', label: 'Value' },
          ],
          rows: r.lump.rows.map((row) => ({
            year: String(row.year),
            opening: formatINR(row.opening),
            growth: formatINR(row.growth),
            balance: formatINR(row.balance),
          })),
          csvRows: r.lump.rows.map((row) => ({
            year: row.year,
            opening: Math.round(row.opening),
            growth: Math.round(row.growth),
            balance: Math.round(row.balance),
          })),
        },

  summary: (r) =>
    r.mode === 'sip'
      ? `SIP maturity ${formatINR(r.sip.futureValue)} — invested ${formatINR(
          r.sip.totalInvested,
        )}, returns ${formatINR(r.sip.estimatedReturns)}.`
      : `Lumpsum of ${formatINR(r.lump.invested)} grows to ${formatINR(
          r.lump.futureValue,
        )} — CAGR ${formatPercent(r.lump.cagrPct)}.`,

  content: {
    howItWorks: [
      'Money goes into a mutual fund one of two ways, and this calculator covers both. A SIP puts a fixed amount to work every month; a lumpsum invests once and leaves it. Switch between them with the SIP / Lumpsum toggle — the inputs and the projection change with it.',
      'In SIP mode each instalment compounds for a different length of time — the first for the entire period, the last for barely a month — so the maturity value is the sum of many small compounding streams rather than one. Instalments are compounded from the start of every month, which is the SIP convention. The step-up option raises your instalment once a year, usually the easiest way to reach a larger corpus without feeling the pinch.',
      'In lumpsum mode the amount compounds on itself: this year’s return earns next year’s return. That second-order effect is why the value curve bends upward instead of rising in a straight line, and why the CAGR — not the total percentage gain — is the figure to compare against other options.',
      'In both modes the gap between “invested amount” and “value” widens slowly at first and then very quickly. That crossover, where returns overtake contributions, is what long-horizon investing is really about.',
    ],
    formula: `SIP                      (1 + i)ⁿ − 1
        FV = P × ───────────────────── × (1 + i)
                            i

        P = monthly investment   i = annual return ÷ 12   n = months

Lumpsum FV   = P × (1 + r)ᵗ
        CAGR = (FV ÷ P)^(1/t) − 1

        P = amount invested   r = annual return   t = years`,
    example: [
      'SIP: ₹25,000 a month for 10 years at 12% a year. Total invested is ₹30,00,000 across 120 instalments, and the maturity value is roughly ₹58 lakh — close to half of it return rather than contribution.',
      'Lumpsum: ₹5,00,000 for 10 years at 12% a year. FV = 5,00,000 × 1.12¹⁰ ≈ ₹15,52,900. The absolute return is about 210%, but the CAGR is 12%.',
    ],
    assumptions: [
      'Returns are steady every year. Real market returns are not: the same average can produce a very different outcome depending on when the good and bad years fall.',
      'SIP instalments are invested at the start of each month and none are missed.',
      'The expense ratio is already reflected in the return you enter — NAV-based fund returns are net of expenses.',
      'Exit load and capital gains tax are not deducted from the maturity value.',
    ],
    notes: [
      'Long-term capital gains on equity funds are taxed at 12.5% above the ₹1.25 lakh annual exemption; short-term gains at 20%.',
      'Debt fund gains are taxed at your slab rate regardless of holding period for investments made after 31 March 2023.',
      'A step-up of 10% a year typically adds 40–60% to the final corpus over long periods compared with a flat SIP.',
      'Market-linked returns are not guaranteed. Treat the figure as a planning range, not a promise.',
    ],
    faqs: [
      {
        q: 'Should I use SIP or lumpsum mode?',
        a: 'Use SIP if you invest a fixed amount every month, which is how most salaried investors buy funds. Use Lumpsum if you are investing a single amount today — a bonus, maturity proceeds or savings — and leaving it to compound.',
      },
      {
        q: 'Is a SIP better than a lumpsum investment?',
        a: 'Neither is universally better. A lumpsum invested at the start of a rising market wins; a SIP spreads the entry price and removes the need to time the market. Mathematically, investing sooner wins more often than not because markets rise over time — but a SIP matches how income actually arrives.',
      },
      {
        q: 'What return should I assume?',
        a: 'For a diversified equity fund over 10 years or more, 11–13% is a common planning assumption. For hybrid funds use 8–10%, and for debt funds 6–7%. Lower assumptions leave room for disappointment to be pleasant rather than painful.',
      },
      {
        q: 'What is a step-up SIP?',
        a: 'You raise your monthly instalment by a set percentage every year, usually in line with your salary. Because the extra amount also compounds, a 10% annual step-up can add a very large amount to the final corpus.',
      },
      {
        q: 'What is the difference between absolute return and CAGR?',
        a: 'Absolute return is the total percentage gain over the whole period, ignoring time. CAGR converts that into a per-year rate, which is the only fair way to compare investments held for different lengths of time.',
      },
      {
        q: 'Can I stop a SIP any time?',
        a: 'Yes, SIPs in open-ended mutual funds can be paused or stopped without penalty. Units already bought stay invested until you redeem them.',
      },
    ],
  },
};

export default mutualFund;
