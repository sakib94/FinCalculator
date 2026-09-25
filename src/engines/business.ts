import { cagr, safe } from './core';

/* ==================================================================
 * GST
 * ================================================================== */

export type GstMode = 'add' | 'remove';
export type GstSupply = 'intra' | 'inter';

export interface GstInput {
  amount: number;
  ratePct: number;
  mode: GstMode;
  supply: GstSupply;
}

export interface GstResult {
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  ratePct: number;
}

export function calculateGST(input: GstInput): GstResult {
  const amount = Math.max(0, input.amount);
  const rate = Math.max(0, input.ratePct);

  const base = input.mode === 'add' ? amount : amount / (1 + rate / 100);
  const gst = input.mode === 'add' ? (amount * rate) / 100 : amount - base;
  const total = base + gst;

  const inter = input.supply === 'inter';
  return {
    baseAmount: safe(base),
    gstAmount: safe(gst),
    totalAmount: safe(total),
    cgst: inter ? 0 : safe(gst / 2),
    sgst: inter ? 0 : safe(gst / 2),
    igst: inter ? safe(gst) : 0,
    ratePct: rate,
  };
}

/* ==================================================================
 * ROI
 * ================================================================== */

export interface RoiInput {
  amountInvested: number;
  currentValue: number;
  years: number;
  additionalCosts: number;
}

export interface RoiResult {
  totalCost: number;
  netGain: number;
  roiPct: number;
  annualisedPct: number;
  multiple: number;
  profitable: boolean;
}

export function calculateROI(input: RoiInput): RoiResult {
  const cost = Math.max(0, input.amountInvested) + Math.max(0, input.additionalCosts);
  const value = Math.max(0, input.currentValue);
  const gain = value - cost;

  return {
    totalCost: cost,
    netGain: safe(gain),
    roiPct: cost > 0 ? (gain / cost) * 100 : 0,
    annualisedPct: input.years > 0 && cost > 0 ? cagr(cost, value, input.years) : 0,
    multiple: cost > 0 ? value / cost : 0,
    profitable: gain >= 0,
  };
}

/* ==================================================================
 * Percentage — five everyday operations
 * ================================================================== */

export type PercentMode = 'percentOf' | 'isWhatPercent' | 'change' | 'increase' | 'decrease';

export interface PercentInput {
  mode: PercentMode;
  a: number;
  b: number;
}

export interface PercentResult {
  mode: PercentMode;
  value: number;
  expression: string;
  caption: string;
  isPercent: boolean;
}

export function calculatePercentage(input: PercentInput): PercentResult {
  const { a, b, mode } = input;
  const fmt = (n: number) => (Number.isFinite(n) ? Number(n.toFixed(4)) : 0);

  switch (mode) {
    case 'percentOf': {
      const v = (a / 100) * b;
      return {
        mode,
        value: safe(v),
        expression: `${fmt(a)}% of ${fmt(b)}`,
        caption: `${fmt(a)}% × ${fmt(b)} ÷ 100`,
        isPercent: false,
      };
    }
    case 'isWhatPercent': {
      const v = b === 0 ? 0 : (a / b) * 100;
      return {
        mode,
        value: safe(v),
        expression: `${fmt(a)} is what % of ${fmt(b)}`,
        caption: `${fmt(a)} ÷ ${fmt(b)} × 100`,
        isPercent: true,
      };
    }
    case 'change': {
      const v = a === 0 ? 0 : ((b - a) / Math.abs(a)) * 100;
      return {
        mode,
        value: safe(v),
        expression: `Change from ${fmt(a)} to ${fmt(b)}`,
        caption: `(${fmt(b)} − ${fmt(a)}) ÷ ${fmt(a)} × 100`,
        isPercent: true,
      };
    }
    case 'increase': {
      const v = a * (1 + b / 100);
      return {
        mode,
        value: safe(v),
        expression: `${fmt(a)} increased by ${fmt(b)}%`,
        caption: `${fmt(a)} + ${fmt(b)}% of ${fmt(a)}`,
        isPercent: false,
      };
    }
    case 'decrease':
    default: {
      const v = a * (1 - b / 100);
      return {
        mode: 'decrease',
        value: safe(v),
        expression: `${fmt(a)} decreased by ${fmt(b)}%`,
        caption: `${fmt(a)} − ${fmt(b)}% of ${fmt(a)}`,
        isPercent: false,
      };
    }
  }
}

/* ==================================================================
 * Markup & margin
 * ================================================================== */

export type MarkupMode = 'fromMarkup' | 'fromPrice' | 'fromMargin';

export interface MarkupInput {
  mode: MarkupMode;
  cost: number;
  markupPct: number;
  sellingPrice: number;
  marginPct: number;
}

export interface MarkupResult {
  cost: number;
  sellingPrice: number;
  profit: number;
  markupPct: number;
  marginPct: number;
}

export function calculateMarkup(input: MarkupInput): MarkupResult {
  const cost = Math.max(0, input.cost);
  let sellingPrice = Math.max(0, input.sellingPrice);

  if (input.mode === 'fromMarkup') {
    sellingPrice = cost * (1 + input.markupPct / 100);
  } else if (input.mode === 'fromMargin') {
    const m = Math.min(99.9999, input.marginPct) / 100;
    sellingPrice = m >= 1 ? 0 : cost / (1 - m);
  }

  const profit = sellingPrice - cost;
  return {
    cost,
    sellingPrice: safe(sellingPrice),
    profit: safe(profit),
    markupPct: cost > 0 ? safe((profit / cost) * 100) : 0,
    marginPct: sellingPrice > 0 ? safe((profit / sellingPrice) * 100) : 0,
  };
}

/* ==================================================================
 * Commission
 * ================================================================== */

export interface CommissionInput {
  saleValue: number;
  commissionPct: number;
  flatFee: number;
  splitPct: number;
  units: number;
}

export interface CommissionResult {
  grossCommission: number;
  yourShare: number;
  partnerShare: number;
  netToSeller: number;
  perUnitCommission: number;
  effectiveRatePct: number;
}

export function calculateCommission(input: CommissionInput): CommissionResult {
  const sale = Math.max(0, input.saleValue);
  const units = Math.max(1, Math.round(input.units));
  const gross = (sale * Math.max(0, input.commissionPct)) / 100 + Math.max(0, input.flatFee);
  const share = Math.min(100, Math.max(0, input.splitPct)) / 100;

  return {
    grossCommission: safe(gross),
    yourShare: safe(gross * share),
    partnerShare: safe(gross * (1 - share)),
    netToSeller: safe(sale - gross),
    perUnitCommission: safe(gross / units),
    effectiveRatePct: sale > 0 ? (gross / sale) * 100 : 0,
  };
}
