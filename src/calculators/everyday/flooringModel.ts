import type { FlooringInput, SurfaceInput } from '@/engines/flooring';

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

/** Suggested defaults — every one is editable on the page. */
export const DEFAULTS = {
  tileSkirtingPct: 5,
  tileWastagePct: 5,
  marbleSkirtingPct: 5,
  marbleWastagePct: 7,
  extraPct: 3,
  baseStepWidth: 3,
} as const;

/**
 * Two rooms, a hall, a kitchen and bathrooms, worked out by the owner as
 * 660 sq ft of tile and 300 sq ft of marble (kitchen floor and platform),
 * with a three-step marble staircase, three windows and three doors.
 */
export function defaultInput(): FlooringInput {
  return {
    tile: { area: 660, skirtingPct: DEFAULTS.tileSkirtingPct, wastagePct: DEFAULTS.tileWastagePct, rate: 60, labourRate: 20 },
    marble: { area: 300, skirtingPct: DEFAULTS.marbleSkirtingPct, wastagePct: DEFAULTS.marbleWastagePct, rate: 120, labourRate: 200 },
    staircase: { steps: 3, width: 12, baseWidth: DEFAULTS.baseStepWidth, baseCost: 1000 },
    windows: { count: 3, rate: 1000 },
    doors: { count: 3, rate: 1500 },
    rates: { sand: 60, cement: 450, whiteCement: 80, grout: 100 },
    extraPct: DEFAULTS.extraPct,
  };
}

/** Every area, count and price cleared; the suggested percentages kept. */
export function blankInput(): FlooringInput {
  const blank = (s: SurfaceInput): SurfaceInput => ({ ...s, area: 0, rate: 0, labourRate: 0 });
  const d = defaultInput();
  return {
    tile: blank(d.tile),
    marble: blank(d.marble),
    staircase: { steps: 0, width: 0, baseWidth: DEFAULTS.baseStepWidth, baseCost: 0 },
    windows: { count: 0, rate: 0 },
    doors: { count: 0, rate: 0 },
    rates: { sand: 0, cement: 0, whiteCement: 0, grout: 0 },
    extraPct: DEFAULTS.extraPct,
  };
}

export const defaultState = (): FlooringState => ({ input: defaultInput(), tab: 'tile', projectName: '' });

/* ------------------------------------------------------------------ */
/* Restoring saved state                                               */
/* ------------------------------------------------------------------ */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const numOr = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** The numeric fields of `fallback`, taken from `v` wherever they are numbers. */
function numbers<T extends object>(v: unknown, fallback: T): T {
  if (!isObj(v)) return { ...fallback };
  const base = fallback as Record<string, number>;
  const out: Record<string, number> = { ...base };
  for (const k of Object.keys(base)) out[k] = numOr(v[k], base[k]);
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
      tile: numbers(v.tile, di.tile),
      marble: numbers(v.marble, di.marble),
      staircase: numbers(v.staircase, di.staircase),
      windows: numbers(v.windows, di.windows),
      doors: numbers(v.doors, di.doors),
      rates: numbers(v.rates, di.rates),
      extraPct: numOr(v.extraPct, di.extraPct),
    },
  };
}
