import type { Field } from '@/calculators/types';

/* ------------------------------------------------------------------ *
 * Slider scale.
 *
 * Money fields routinely span five or six orders of magnitude — a loan
 * from ₹1,000 to ₹100 crore. On a linear track every realistic amount is
 * crushed into the first few pixels (₹25 lakh sits at 0.25%). Wide
 * currency ranges therefore use a logarithmic track, where each tenfold
 * step gets the same width, and snap to round figures on the way out.
 * Everything else keeps the ordinary linear track in the field's units.
 * ------------------------------------------------------------------ */

export interface SliderScale {
  /** Range of the underlying <input type="range">, in track positions. */
  min: number;
  max: number;
  step: number;
  toPos: (value: number) => number;
  fromPos: (pos: number) => number;
}

const LOG_STEPS = 1000;

export function sliderScale(field: Field): SliderScale | null {
  const { min, max } = field;
  if (min == null || max == null || max <= min) return null;
  const clampV = (v: number) => Math.min(max, Math.max(min, v));

  const floor = min > 0 ? min : Math.max(field.step ?? 1, max / 1e6);
  if (field.type === 'currency' && max / floor >= 1000) {
    const span = Math.log(max / floor);
    return {
      min: 0,
      max: LOG_STEPS,
      step: 1,
      toPos: (v) => (v <= floor ? 0 : Math.round((Math.log(Math.min(v, max) / floor) / span) * LOG_STEPS)),
      fromPos: (p) => (p <= 0 ? min : p >= LOG_STEPS ? max : clampV(roundNice(floor * Math.exp((p / LOG_STEPS) * span)))),
    };
  }

  // Linear: the track is the field's own range, so the browser hands back
  // clean step-aligned values with no floating-point residue.
  return { min, max, step: field.step ?? 1, toPos: clampV, fromPos: clampV };
}

/**
 * Rounds to 1/20th of the value's order of magnitude — 25,00,000 moves in
 * steps of 50,000 — and never below a whole rupee.
 */
function roundNice(v: number): number {
  const unit = Math.max(1, Math.pow(10, Math.floor(Math.log10(v))) / 20);
  return Math.round(v / unit) * unit;
}
