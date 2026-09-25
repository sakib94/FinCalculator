import type { Field, Values, ValidationErrors } from '@/calculators/types';

/**
 * Field-level validation. Runs before the engine ever sees a value, so
 * engines can assume clean numeric input and stay free of defensive noise.
 */
export function validateFields(fields: Field[], values: Values): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const f of fields) {
    if (f.visible && !f.visible(values)) continue;
    const v = values[f.name];

    if (f.type === 'select' || f.type === 'segmented') {
      if (v === '' || v == null) errors[f.name] = 'Please choose an option.';
      continue;
    }

    if (f.type === 'date') {
      const s = String(v ?? '');
      if (!s) {
        if (!f.optional) errors[f.name] = `Please select a valid ${f.label.toLowerCase()}.`;
        continue;
      }
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) errors[f.name] = 'That date is not valid.';
      continue;
    }

    // Numeric fields
    if (v === '' || v == null) {
      if (!f.optional) errors[f.name] = `Please enter a valid ${f.label.toLowerCase()}.`;
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) {
      errors[f.name] = `Please enter a valid ${f.label.toLowerCase()}.`;
      continue;
    }
    if (f.min != null && n < f.min) {
      errors[f.name] =
        f.min === 0
          ? `${f.label} cannot be negative.`
          : `${f.label} must be at least ${formatBound(f.min, f.type)}.`;
      continue;
    }
    if (f.max != null && n > f.max) {
      errors[f.name] = `${f.label} cannot be more than ${formatBound(f.max, f.type)}.`;
    }
  }

  return errors;
}

function formatBound(n: number, type: Field['type']): string {
  if (type === 'percent') return `${n}%`;
  if (type === 'currency') return `₹${n.toLocaleString('en-IN')}`;
  return String(n);
}

export const hasErrors = (e: ValidationErrors): boolean => Object.keys(e).length > 0;

/** Numeric accessor used by engines — values arrive pre-validated. */
export const num = (v: Values[string] | undefined, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const str = (v: Values[string] | undefined, fallback = ''): string =>
  v == null || v === '' ? fallback : String(v);
