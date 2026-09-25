import type { Field, Values } from '@/calculators/types';
import { parseNumeric } from './format';

/**
 * A calculator's inputs, carried in the URL.
 *
 *   #/c/emi?principal=3000000&interestRate=8.5
 *
 * Only values that differ from the defaults are written, so an untouched
 * calculator keeps a clean link and a shared one stays short. Everything
 * still lives in the address bar — nothing is sent anywhere.
 */

const isNumericField = (f: Field) => f.type === 'currency' || f.type === 'percent' || f.type === 'number';

/** Reads the values a query string holds for these fields, ignoring anything malformed. */
export function valuesFromSearch(fields: Field[], search: string): Values {
  const params = new URLSearchParams(search);
  const out: Values = {};
  for (const f of fields) {
    const raw = params.get(f.name);
    if (raw == null) continue;
    if (isNumericField(f)) {
      const n = parseNumeric(raw);
      if (n != null) out[f.name] = n;
    } else if (f.type === 'select' || f.type === 'segmented') {
      if (f.options?.some((o) => o.value === raw)) out[f.name] = raw;
    } else if (f.type === 'date') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) out[f.name] = raw;
    }
  }
  return out;
}

/** The query string for the visible inputs that differ from their defaults. */
export function searchFromValues(fields: Field[], values: Values): string {
  const params = new URLSearchParams();
  for (const f of fields) {
    if (f.visible && !f.visible(values)) continue;
    const v = values[f.name];
    if (v === '' || v == null || v === f.default) continue;
    params.set(f.name, String(v));
  }
  return params.toString();
}

/** Absolute link to a calculator with these inputs. */
export function scenarioHref(id: string, search: string): string {
  const base = window.location.href.split('#')[0];
  return `${base}#/c/${id}${search ? `?${search}` : ''}`;
}
