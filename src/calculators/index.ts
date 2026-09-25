import type { CalculatorDef } from './types';

/* Investment & retirement */
import epf from './investment/epf';
import nps from './investment/nps';
import ppf from './investment/ppf';
import mutualFund from './investment/mutualFund';
import swp from './investment/swp';
import ssy from './investment/ssy';
import compoundInterest from './investment/compoundInterest';
import netWorth from './investment/netWorth';
import fd from './investment/fd';
import retirement from './investment/retirement';
import inflation from './investment/inflation';
import goalSip from './investment/goalSip';
import cagr from './investment/cagr';
import stockAverage from './investment/stockAverage';

/* Savings & deposits */
import rd from './investment/rd';
import postOffice from './investment/postOffice';
import simpleInterest from './investment/simpleInterest';

/* Loans */
import emi from './loans/emi';
import prepayment from './loans/prepayment';
import eligibility from './loans/eligibility';
import flatVsReducing from './loans/flatVsReducing';

/* Tax & salary */
import incomeTax from './tax/incomeTax';
import salary from './salary/salary';
import ctcInHand from './salary/ctcInHand';
import gratuity from './salary/gratuity';
import increment from './salary/increment';
import leaveEncashment from './salary/leaveEncashment';
import hra from './tax/hra';
import tds from './tax/tds';
import capitalGains from './tax/capitalGains';

/* Date & age */
import age from './dates/age';
import dateDifference from './dates/dateDifference';

/* Business & general */
import gst from './business/gst';
import roi from './business/roi';
import percentage from './business/percentage';
import markup from './business/markup';
import commission from './business/commission';
import profitMargin from './business/profitMargin';
import breakEven from './business/breakEven';
import depreciation from './business/depreciation';
import discount from './business/discount';

/* Everyday */
import bmi from './everyday/bmi';
import currency from './everyday/currency';
import construction from './everyday/construction';
import electrical from './everyday/electrical';

// Each module owns its own result shape; the shared view is shape-agnostic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyCalculator = CalculatorDef<any>;

/**
 * Calculator registry. The key must match the `id` in src/data/catalog.ts —
 * that pairing is the only wiring a new calculator needs.
 */
export const REGISTRY: Record<string, AnyCalculator> = {
  epf,
  nps,
  ppf,
  'mutual-fund': mutualFund,
  swp,
  'sukanya-samriddhi': ssy,
  'compound-interest': compoundInterest,
  'net-worth': netWorth,
  fd,
  retirement,
  inflation,
  'goal-sip': goalSip,
  cagr,
  'stock-average': stockAverage,
  rd,
  'post-office': postOffice,
  'simple-interest': simpleInterest,
  emi,
  'loan-prepayment': prepayment,
  'loan-eligibility': eligibility,
  'flat-vs-reducing': flatVsReducing,
  'income-tax': incomeTax,
  salary,
  'ctc-in-hand': ctcInHand,
  gratuity,
  'salary-increment': increment,
  'leave-encashment': leaveEncashment,
  'hra-exemption': hra,
  tds,
  'capital-gains': capitalGains,
  age,
  'date-difference': dateDifference,
  gst,
  roi,
  percentage,
  markup,
  commission,
  'profit-margin': profitMargin,
  'break-even': breakEven,
  depreciation,
  discount,
  bmi,
  currency,
  'construction-material': construction,
  'electrical-load': electrical,
};

export const REGISTERED_IDS = Object.keys(REGISTRY);
