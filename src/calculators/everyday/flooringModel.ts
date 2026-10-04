import type {
  AppliesTo,
  AreaEntry,
  AreaUnit,
  FlooringInput,
  LengthUnit,
  MeasureMethod,
  RiserUnit,
} from '@/engines/flooring';
import { MAX_OTHER_AREAS, MAX_ROOMS } from '@/engines/flooring';

/**
 * The flooring estimate's inputs: the worked example the page opens with,
 * the helpers that grow and shrink the room list, and a restore step that
 * accepts only well-formed saved data.
 */

export type FlooringMode = 'basic' | 'advanced';

export interface FlooringState {
  input: FlooringInput;
  mode: FlooringMode;
  projectName: string;
}

const dims = (id: string, name: string, length: number, width: number): AreaEntry => ({
  id,
  name,
  method: 'dimensions',
  length,
  width,
  lengthUnit: 'ft',
  area: 0,
  areaUnit: 'sqft',
});

export const roomName = (i: number): string => `Room ${i + 1}`;

/** A blank room, measured by its sides in feet. */
export const blankRoom = (i: number): AreaEntry => dims(`room-${i + 1}`, roomName(i), 0, 0);

/**
 * The example a homeowner would recognise: three rooms, a hall, a kitchen
 * and a dining area — 2,000 sq ft in all — with 1,200 sq ft of tile, 800
 * sq ft of marble and a 20-step marble staircase.
 */
export function defaultInput(): FlooringInput {
  return {
    rooms: [dims('room-1', 'Room 1', 20, 20), dims('room-2', 'Room 2', 14, 25), dims('room-3', 'Room 3', 15, 20)],
    hall: dims('hall', 'Hall', 24, 25),
    kitchen: dims('kitchen', 'Kitchen', 12.5, 16),
    otherAreas: [dims('other-1', 'Dining', 10, 15)],
    tile: { enabled: true, area: 1200, rate: 60, labourRate: 40, wastage: 5 },
    marble: { enabled: true, area: 800, rate: 120, labourRate: 65, wastage: 7, polishingEnabled: false, polishingRate: 30 },
    staircase: { enabled: true, steps: 20, width: 3, widthUnit: 'ft', baseWidth: 3, baseWidthUnit: 'ft', baseCostPerStep: 1000 },
    riser: { enabled: false, count: 20, height: 6, heightUnit: 'in', width: 3, widthUnit: 'ft', materialRate: 120, labourRate: 65 },
    nosing: { enabled: false, steps: 20, lengthPerStep: 3, lengthUnit: 'ft', ratePerFt: 40 },
    materials: {
      cementRate: 450,
      cementPerSqft: 0.02,
      cementAppliesTo: 'all',
      sandRate: 60,
      sandPerSqft: 0.1,
      sandAppliesTo: 'all',
      whiteCementRate: 80,
      whiteCementPerSqft: 0.03,
      whiteCementAppliesTo: 'all',
    },
    adhesive: { enabled: false, pricePerBag: 500, coveragePerBag: 40 },
    grout: { enabled: false, ratePerKg: 100, kgPerSqft: 0.025, appliesTo: 'tile' },
    skirting: {
      enabled: false,
      mode: 'auto',
      runningLength: 0,
      runningUnit: 'ft',
      openings: 0,
      openingsUnit: 'ft',
      material: 'tile',
      materialRate: 40,
      labourRate: 15,
    },
    additional: { transportation: 0, loadingUnloading: 0, other: 0, otherNote: '' },
    contingencyPct: 5,
  };
}

/** Same structure with every measurement and price cleared, for starting from scratch. */
export function blankInput(): FlooringInput {
  const d = defaultInput();
  return {
    ...d,
    rooms: [blankRoom(0)],
    hall: dims('hall', 'Hall', 0, 0),
    kitchen: dims('kitchen', 'Kitchen', 0, 0),
    otherAreas: [],
    tile: { ...d.tile, enabled: true, area: 0, rate: 0, labourRate: 0 },
    marble: { ...d.marble, enabled: false, area: 0, rate: 0, labourRate: 0 },
    staircase: { ...d.staircase, enabled: false, steps: 0, baseCostPerStep: 0 },
    materials: { ...d.materials, cementRate: 0, sandRate: 0, whiteCementRate: 0 },
  };
}

export const defaultState = (): FlooringState => ({ input: defaultInput(), mode: 'basic', projectName: '' });

/** Grows or shrinks the room list, keeping what was already typed. */
export function resizeRooms(rooms: AreaEntry[], count: number): AreaEntry[] {
  const n = Math.max(0, Math.min(MAX_ROOMS, Math.floor(count)));
  if (n <= rooms.length) return rooms.slice(0, n);
  const used = new Set(rooms.map((r) => r.id));
  const extra: AreaEntry[] = [];
  for (let i = rooms.length; i < n; i++) {
    let room = blankRoom(i);
    // A renamed room may already hold this id; pick the next free one.
    for (let k = i + 1; used.has(room.id); k++) room = { ...room, id: `room-${k + 1}` };
    used.add(room.id);
    extra.push(room);
  }
  return [...rooms, ...extra];
}

const OTHER_SUGGESTIONS = ['Dining', 'Lobby', 'Balcony', 'Passage', 'Store', 'Pooja Room', 'Utility', 'Veranda'];

/** A new custom area with a name that is not already taken. */
export function newOtherArea(existing: AreaEntry[]): AreaEntry {
  const ids = new Set(existing.map((e) => e.id));
  let k = existing.length + 1;
  while (ids.has(`other-${k}`)) k++;
  const names = new Set(existing.map((e) => e.name));
  const name = OTHER_SUGGESTIONS.find((s) => !names.has(s)) ?? `Area ${existing.length + 1}`;
  return dims(`other-${k}`, name, 0, 0);
}

export const canAddOtherArea = (existing: AreaEntry[]): boolean => existing.length < MAX_OTHER_AREAS;

/* ------------------------------------------------------------------ */
/* Restoring saved state                                               */
/* ------------------------------------------------------------------ */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const numOr = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const boolOr = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const strOr = (v: unknown, d: string, max = 60): string => (typeof v === 'string' ? v.slice(0, max) : d);
const oneOf = <T extends string>(v: unknown, options: readonly T[], d: T): T =>
  options.includes(v as T) ? (v as T) : d;

const LENGTH_UNITS: readonly LengthUnit[] = ['ft', 'm'];
const RISER_UNITS: readonly RiserUnit[] = ['ft', 'm', 'in'];
const AREA_UNITS: readonly AreaUnit[] = ['sqft', 'sqm'];
const METHODS: readonly MeasureMethod[] = ['dimensions', 'area'];
const APPLIES: readonly AppliesTo[] = ['all', 'tile', 'marble'];

function restoreEntry(v: unknown, fallback: AreaEntry): AreaEntry {
  if (!isObj(v)) return fallback;
  return {
    id: strOr(v.id, fallback.id, 40) || fallback.id,
    name: strOr(v.name, fallback.name),
    method: oneOf(v.method, METHODS, fallback.method),
    length: numOr(v.length, fallback.length),
    width: numOr(v.width, fallback.width),
    lengthUnit: oneOf(v.lengthUnit, LENGTH_UNITS, fallback.lengthUnit),
    area: numOr(v.area, fallback.area),
    areaUnit: oneOf(v.areaUnit, AREA_UNITS, fallback.areaUnit),
  };
}

/** Takes the fields of `fallback` from `v` where they have the same type. */
function restoreFlat<T extends object>(v: unknown, fallback: T, enums: Partial<Record<keyof T, readonly string[]>> = {}): T {
  if (!isObj(v)) return fallback;
  const out = { ...fallback } as Record<string, unknown>;
  for (const [k, d] of Object.entries(fallback)) {
    const options = enums[k as keyof T];
    if (options) out[k] = oneOf(v[k], options, d as string);
    else if (typeof d === 'number') out[k] = numOr(v[k], d);
    else if (typeof d === 'boolean') out[k] = boolOr(v[k], d);
    else if (typeof d === 'string') out[k] = strOr(v[k], d, 120);
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
  const rooms = Array.isArray(v.rooms)
    ? v.rooms.slice(0, MAX_ROOMS).map((r, i) => restoreEntry(r, blankRoom(i)))
    : di.rooms;
  const otherAreas = Array.isArray(v.otherAreas)
    ? v.otherAreas.slice(0, MAX_OTHER_AREAS).map((o, i) => restoreEntry(o, { ...blankRoom(i), id: `other-${i + 1}`, name: `Area ${i + 1}` }))
    : di.otherAreas;
  return {
    mode: oneOf(raw.mode, ['basic', 'advanced'] as const, 'basic'),
    projectName: strOr(raw.projectName, '', 80),
    input: {
      rooms,
      hall: restoreEntry(v.hall, di.hall),
      kitchen: restoreEntry(v.kitchen, di.kitchen),
      otherAreas,
      tile: restoreFlat(v.tile, di.tile),
      marble: restoreFlat(v.marble, di.marble),
      staircase: restoreFlat(v.staircase, di.staircase, { widthUnit: LENGTH_UNITS, baseWidthUnit: LENGTH_UNITS }),
      riser: restoreFlat(v.riser, di.riser, { heightUnit: RISER_UNITS, widthUnit: RISER_UNITS }),
      nosing: restoreFlat(v.nosing, di.nosing, { lengthUnit: LENGTH_UNITS }),
      materials: restoreFlat(v.materials, di.materials, {
        cementAppliesTo: APPLIES,
        sandAppliesTo: APPLIES,
        whiteCementAppliesTo: APPLIES,
      }),
      adhesive: restoreFlat(v.adhesive, di.adhesive),
      grout: restoreFlat(v.grout, di.grout, { appliesTo: APPLIES }),
      skirting: restoreFlat(v.skirting, di.skirting, {
        mode: ['auto', 'manual'],
        runningUnit: LENGTH_UNITS,
        openingsUnit: LENGTH_UNITS,
        material: ['tile', 'marble'],
      }),
      additional: restoreFlat(v.additional, di.additional),
      contingencyPct: numOr(v.contingencyPct, di.contingencyPct),
    },
  };
}
