import { safe } from './core';

/* ==================================================================
 * BMI
 * ================================================================== */

export type BmiUnit = 'metric' | 'imperial';
export type BmiScale = 'who' | 'asian';

export interface BmiInput {
  unit: BmiUnit;
  heightCm: number;
  weightKg: number;
  heightFt: number;
  heightIn: number;
  weightLb: number;
  scale: BmiScale;
}

export interface BmiBand {
  label: string;
  min: number;
  max: number | null;
}

export interface BmiResult {
  bmi: number;
  category: string;
  heightM: number;
  weightKg: number;
  healthyMinKg: number;
  healthyMaxKg: number;
  bands: BmiBand[];
  scaleLabel: string;
}

/** WHO international cut-offs. */
const WHO_BANDS: BmiBand[] = [
  { label: 'Underweight', min: 0, max: 18.5 },
  { label: 'Normal', min: 18.5, max: 25 },
  { label: 'Overweight', min: 25, max: 30 },
  { label: 'Obese', min: 30, max: null },
];

/** Cut-offs recommended for Asian-Indian body composition. */
const ASIAN_BANDS: BmiBand[] = [
  { label: 'Underweight', min: 0, max: 18.5 },
  { label: 'Normal', min: 18.5, max: 23 },
  { label: 'Overweight', min: 23, max: 25 },
  { label: 'Obese', min: 25, max: null },
];

export function calculateBMI(input: BmiInput): BmiResult {
  const heightM =
    input.unit === 'metric'
      ? Math.max(0, input.heightCm) / 100
      : (Math.max(0, input.heightFt) * 12 + Math.max(0, input.heightIn)) * 0.0254;

  const weightKg =
    input.unit === 'metric' ? Math.max(0, input.weightKg) : Math.max(0, input.weightLb) * 0.45359237;

  const bmi = heightM > 0 ? weightKg / (heightM * heightM) : 0;
  const bands = input.scale === 'asian' ? ASIAN_BANDS : WHO_BANDS;
  const band = bands.find((b) => bmi >= b.min && (b.max == null || bmi < b.max));
  const normal = bands[1];

  return {
    bmi: safe(bmi),
    category: bmi > 0 ? (band?.label ?? '—') : '—',
    heightM: safe(heightM),
    weightKg: safe(weightKg),
    healthyMinKg: safe(normal.min * heightM * heightM),
    healthyMaxKg: safe((normal.max ?? 25) * heightM * heightM),
    bands,
    scaleLabel: input.scale === 'asian' ? 'Asian-Indian cut-offs' : 'WHO international cut-offs',
  };
}

/* ==================================================================
 * Currency conversion (user-supplied rate — nothing is fetched)
 * ================================================================== */

export interface CurrencyInput {
  amount: number;
  rate: number;
  markupPct: number;
  flatFee: number;
  from: string;
  to: string;
}

export interface CurrencyResult {
  converted: number;
  effectiveRate: number;
  markupCost: number;
  flatFee: number;
  totalCost: number;
  reverseRate: number;
  amountAfterFee: number;
}

export function convertCurrency(input: CurrencyInput): CurrencyResult {
  const amount = Math.max(0, input.amount);
  const rate = Math.max(0, input.rate);
  const markup = Math.max(0, input.markupPct);
  const fee = Math.max(0, input.flatFee);

  const amountAfterFee = Math.max(0, amount - fee);
  const effectiveRate = rate * (1 - markup / 100);
  const converted = amountAfterFee * effectiveRate;
  const idealConverted = amount * rate;

  return {
    converted: safe(converted),
    effectiveRate: safe(effectiveRate),
    markupCost: safe(idealConverted - amount * effectiveRate),
    flatFee: fee,
    totalCost: safe(idealConverted - converted),
    reverseRate: rate > 0 ? safe(1 / rate) : 0,
    amountAfterFee: safe(amountAfterFee),
  };
}

export const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
] as const;

export const currencySymbol = (code: string): string =>
  CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
