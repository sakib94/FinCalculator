import type { FlooringInput } from '@/engines/flooring';

/**
 * The estimate's inputs: the worked example the page opens with, a blank
 * start, and a restore step that accepts only well-formed saved data.
 */

export type FlooringTab = 'tile' | 'marble';

export interface FlooringState {
  input: FlooringInput;
  tab: FlooringTab;
  projectName: string;
}

/**
 * Two rooms, a hall, a kitchen and bathrooms, worked out by the owner as
 * 660 sq ft of tile; 250 sq ft of marble on the kitchen floor and platform
 * and 50 sq ft on windows and stairs.
 */
export function defaultInput(): FlooringInput {
  return {
    tile: { area: 660, skirting: true, rate: 60, labourRate: 20 },
    marble: { floorArea: 250, floorLabourRate: 160, skirting: true, trimArea: 50, trimLabourRate: 180, rate: 120 },
    rates: { sand: 60, cement: 450, whiteCement: 80, grout: 100 },
  };
}

/** Every area and price cleared; skirting kept on. */
export function blankInput(): FlooringInput {
  return {
    tile: { area: 0, skirting: true, rate: 0, labourRate: 0 },
    marble: { floorArea: 0, floorLabourRate: 0, skirting: true, trimArea: 0, trimLabourRate: 0, rate: 0 },
    rates: { sand: 0, cement: 0, whiteCement: 0, grout: 0 },
  };
}

export const defaultState = (): FlooringState => ({ input: defaultInput(), tab: 'tile', projectName: '' });

/* ------------------------------------------------------------------ */
/* Restoring saved state                                               */
/* ------------------------------------------------------------------ */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const numOr = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** The number and yes/no fields of `fallback`, taken from `v` wherever they have the same type. */
function fields<T extends object>(v: unknown, fallback: T): T {
  if (!isObj(v)) return { ...fallback };
  const base = fallback as Record<string, number | boolean>;
  const out: Record<string, number | boolean> = { ...base };
  for (const k of Object.keys(base)) {
    out[k] = typeof base[k] === 'boolean' ? (typeof v[k] === 'boolean' ? (v[k] as boolean) : base[k]) : numOr(v[k], base[k] as number);
  }
  return out as T;
}

/**
 * Saved state from an earlier visit, checked field by field. Anything
 * missing or malformed falls back to the example, so a damaged save can
 * never break the page.
 */
export function restoreState(raw: unknown): FlooringState {
  const d = defaultState();
  if (!isObj(raw) || !isObj(raw.input)) return d;
  const v = raw.input;
  const di = d.input;
  return {
    tab: raw.tab === 'marble' ? 'marble' : 'tile',
    projectName: typeof raw.projectName === 'string' ? raw.projectName.slice(0, 80) : '',
    input: {
      tile: fields(v.tile, di.tile),
      marble: fields(v.marble, di.marble),
      rates: fields(v.rates, di.rates),
    },
  };
}
