/* ------------------------------------------------------------------ *
 * Tile & marble cost estimate.
 *
 * The homeowner works out their own areas and enters them: the tile area,
 * the marble floor & kitchen-platform area, and the marble window & stair
 * area. From those the engine adds skirting and wastage to find what to
 * buy, prices the material, prices the labour on the area actually laid,
 * estimates the setting materials, and puts an extra-expenses allowance
 * on top.
 *
 *   Area → + skirting → subtotal → + wastage → required → × rate = material
 *   Area × labour rate = labour   (never on skirting or wastage)
 *
 * Money is rounded to whole rupees per line, so the lines of the estimate
 * always add up to exactly the totals shown under them.
 * ------------------------------------------------------------------ */

/**
 * Skirting is estimated, not measured. A total area does not say how long
 * the walls are, so the walls are worked out from a typical room:
 *
 *   a 12 × 12 ft room is 144 sq ft and has 4 × 12 = 48 ft of wall;
 *   6-inch (0.5 ft) skirting along it is 48 × 0.5 = 24 sq ft;
 *   24 ÷ 144 = 1/6 — so skirting ≈ floor area ÷ 6.
 *
 * In general: skirting = area × 4 × height ÷ room side.
 */
export const SKIRTING = {
  /** Standard skirting height: 6 inches. */
  heightFt: 0.5,
  /** Side of the typical square room the wall length is estimated from. */
  roomSideFt: 12,
} as const;

/** Wastage is fixed at the usual allowances: 5% for tile, 7% for marble. */
export const WASTAGE = { tile: 5, marble: 7 } as const;

/** Extra expenses — transport, loading, breakage, small items — fixed at 4% of the project. */
export const EXTRA_EXPENSE_PCT = 4;

/**
 * How much of each setting material one square foot takes. These are
 * planning assumptions — real consumption depends on the surface, the
 * mortar thickness, joint width and the contractor — so they live here,
 * in one place, where they can be tuned.
 */
export const CONSUMPTION = {
  /** Cubic feet of sand per sq ft — a one-inch mortar bed plus about 15% for bulking, levelling and loss. */
  sand: { perSqft: 0.115, appliesTo: 'all', unit: 'CFT' },
  /** 50 kg bags of cement per sq ft — one bag for every 40 sq ft, the upper end of the usual 40–50. */
  cement: { perSqft: 0.025, appliesTo: 'all', unit: 'bags' },
  /** Kilograms of white cement per sq ft of marble, for joints and finishing, with a margin. */
  whiteCement: { perSqft: 0.06, appliesTo: 'marble', unit: 'kg' },
  /** Kilograms of grout per sq ft of tile, for 2–3 mm joints, with a margin. */
  grout: { perSqft: 0.03, appliesTo: 'tile', unit: 'kg' },
} as const satisfies Record<SupportingKey, { perSqft: number; appliesTo: 'all' | 'tile' | 'marble'; unit: string }>;

export type SupportingKey = 'sand' | 'cement' | 'whiteCement' | 'grout';

export interface TileInput {
  /** The usable tile area the user worked out, in sq ft. */
  area: number;
  /** Add tile skirting along the walls. */
  skirting: boolean;
  rate: number;
  labourRate: number;
}

export interface MarbleInput {
  /** Marble floor and kitchen platform, sq ft. */
  floorArea: number;
  floorLabourRate: number;
  /** Add marble skirting along the walls of the marble floor. */
  skirting: boolean;
  /** Marble on windows and stairs, sq ft. */
  trimArea: number;
  trimLabourRate: number;
  /** Price per sq ft for all the marble. */
  rate: number;
}

export interface FlooringInput {
  tile: TileInput;
  marble: MarbleInput;
  rates: Record<SupportingKey, number>;
}

/* ------------------------------------------------------------------ */
/* Quantities                                                          */
/* ------------------------------------------------------------------ */

/** Skirting area for a floor area: area × 4 × height ÷ room side (area ÷ 6 by default). */
export const calculateSkirting = (floorArea: number): number =>
  (clean(floorArea) * 4 * SKIRTING.heightFt) / SKIRTING.roomSideFt;

export interface Quantity {
  /** Everything the user entered — never changed. */
  area: number;
  /** The part of it that is floor with walls around it, which skirting is worked on. */
  skirtingBase: number;
  skirtingOn: boolean;
  skirting: number;
  /** Area + skirting. */
  subtotal: number;
  wastagePct: number;
  wastage: number;
  /** Subtotal + wastage: what has to be bought. */
  required: number;
  /** The same, to the nearest whole sq ft, for ordering. */
  purchase: number;
}

/**
 * Area → + skirting → subtotal → + wastage → total required. Wastage is a
 * share of area + skirting, because skirting pieces are cut from the same
 * stock.
 */
function quantity(area: number, skirtingBase: number, skirtingOn: boolean, wastagePct: number): Quantity {
  const a = clean(area);
  const skirting = skirtingOn ? calculateSkirting(skirtingBase) : 0;
  const subtotal = a + skirting;
  const wastage = (subtotal * wastagePct) / 100;
  const required = subtotal + wastage;
  return {
    area: a,
    skirtingBase: clean(skirtingBase),
    skirtingOn,
    skirting,
    subtotal,
    wastagePct,
    wastage,
    required,
    purchase: Math.round(round6(required)),
  };
}

export const calculateTileQuantity = (t: Pick<TileInput, 'area' | 'skirting'>): Quantity =>
  quantity(t.area, t.area, t.skirting, WASTAGE.tile);

/** Floor & platform plus windows & stairs; skirting runs only along the floor. */
export const calculateMarbleQuantity = (m: Pick<MarbleInput, 'floorArea' | 'trimArea' | 'skirting'>): Quantity =>
  quantity(clean(m.floorArea) + clean(m.trimArea), m.floorArea, m.skirting, WASTAGE.marble);

/** Material = total required × rate. */
export const calculateTileMaterialCost = (q: Quantity, rate: number): number => rupees(q.required * clean(rate));
export const calculateMarbleMaterialCost = calculateTileMaterialCost;

/** Labour = the area entered × labour rate — no skirting, no wastage. */
export const calculateTileLabourCost = (area: number, labourRate: number): number => rupees(clean(area) * clean(labourRate));
export const calculateMarbleLabourCost = calculateTileLabourCost;

/* ------------------------------------------------------------------ */
/* Supporting materials                                                */
/* ------------------------------------------------------------------ */

export interface Requirement {
  key: SupportingKey;
  /** The area the consumption factor was applied to. */
  area: number;
  perSqft: number;
  /** Area × factor. */
  exact: number;
  /** Rounded up to a whole bag, kg or CFT — what you actually buy. */
  quantity: number;
  rate: number;
  cost: number;
}

function requirement(key: SupportingKey, tileArea: number, marbleArea: number, rate: number): Requirement {
  const c = CONSUMPTION[key];
  const area = c.appliesTo === 'tile' ? clean(tileArea) : c.appliesTo === 'marble' ? clean(marbleArea) : clean(tileArea) + clean(marbleArea);
  const exact = area * c.perSqft;
  const qty = Math.ceil(round6(exact));
  return { key, area, perSqft: c.perSqft, exact, quantity: qty, rate: clean(rate), cost: rupees(qty * clean(rate)) };
}

/** Sand (CFT) = tile + marble area × CFT per sq ft. */
export const calculateSandRequirement = (tileArea: number, marbleArea: number, rate: number) => requirement('sand', tileArea, marbleArea, rate);
/** Cement (bags) = tile + marble area × bags per sq ft, rounded up. */
export const calculateCementRequirement = (tileArea: number, marbleArea: number, rate: number) => requirement('cement', tileArea, marbleArea, rate);
/** White cement (kg) = marble area × kg per sq ft, rounded up. */
export const calculateWhiteCementRequirement = (tileArea: number, marbleArea: number, rate: number) =>
  requirement('whiteCement', tileArea, marbleArea, rate);
/** Grout (kg) = tile area × kg per sq ft, rounded up. */
export const calculateGroutRequirement = (tileArea: number, marbleArea: number, rate: number) => requirement('grout', tileArea, marbleArea, rate);

/* ------------------------------------------------------------------ */
/* Totals                                                              */
/* ------------------------------------------------------------------ */

export interface MaterialTotals {
  /** Tile + marble material. */
  flooring: number;
  /** Sand + cement + white cement + grout. */
  supporting: number;
  /** Both together. */
  total: number;
}

export function calculateTotalMaterialCost(tileMaterial: number, marbleMaterial: number, supporting: Requirement[]): MaterialTotals {
  const flooring = tileMaterial + marbleMaterial;
  const sup = supporting.reduce((s, r) => s + r.cost, 0);
  return { flooring, supporting: sup, total: flooring + sup };
}

export interface LabourTotals {
  tile: number;
  /** Marble floor & kitchen platform. */
  marbleFloor: number;
  /** Marble windows & stairs. */
  marbleTrim: number;
  total: number;
}

export function calculateTotalLabourCost(parts: Omit<LabourTotals, 'total'>): LabourTotals {
  return { ...parts, total: parts.tile + parts.marbleFloor + parts.marbleTrim };
}

/** Extra expenses = subtotal × extra %. */
export const calculateExtraExpenses = (subtotal: number, pct: number): number => rupees((clean(subtotal) * clean(pct)) / 100);

export const calculateGrandTotal = (subtotal: number, extra: number): number => clean(subtotal) + clean(extra);

/** Grand total ÷ every area entered — not the purchase quantities. */
export const calculateAverageCostPerSqFt = (grandTotal: number, baseArea: number): number | null =>
  baseArea > 0 ? clean(grandTotal) / baseArea : null;

/* ------------------------------------------------------------------ */
/* The estimate                                                        */
/* ------------------------------------------------------------------ */

export interface FlooringResult {
  tile: { quantity: Quantity; rate: number; labourRate: number; material: number; labour: number; total: number };
  marble: {
    quantity: Quantity;
    rate: number;
    floorArea: number;
    floorLabourRate: number;
    floorLabour: number;
    trimArea: number;
    trimLabourRate: number;
    trimLabour: number;
    material: number;
    /** Material + both labours. */
    total: number;
  };
  supporting: Requirement[];
  material: MaterialTotals;
  labour: LabourTotals;
  /** Everything before extra expenses. */
  subtotal: number;
  extraPct: number;
  extra: number;
  grandTotal: number;
  /** Every area entered: tile + marble floor + marble windows & stairs. */
  baseArea: number;
  averagePerSqft: number | null;
}

export function calculateFlooringEstimate(input: FlooringInput): FlooringResult {
  const tq = calculateTileQuantity(input.tile);
  const mq = calculateMarbleQuantity(input.marble);

  const tileMaterial = calculateTileMaterialCost(tq, input.tile.rate);
  const tileLabour = calculateTileLabourCost(tq.area, input.tile.labourRate);
  const marbleMaterial = calculateMarbleMaterialCost(mq, input.marble.rate);
  const floorLabour = calculateMarbleLabourCost(input.marble.floorArea, input.marble.floorLabourRate);
  const trimLabour = calculateMarbleLabourCost(input.marble.trimArea, input.marble.trimLabourRate);

  const supporting = [
    calculateSandRequirement(tq.area, mq.area, input.rates.sand),
    calculateCementRequirement(tq.area, mq.area, input.rates.cement),
    calculateWhiteCementRequirement(tq.area, mq.area, input.rates.whiteCement),
    calculateGroutRequirement(tq.area, mq.area, input.rates.grout),
  ];

  const material = calculateTotalMaterialCost(tileMaterial, marbleMaterial, supporting);
  const labour = calculateTotalLabourCost({ tile: tileLabour, marbleFloor: floorLabour, marbleTrim: trimLabour });

  const subtotal = material.total + labour.total;
  const extraPct = EXTRA_EXPENSE_PCT;
  const extra = calculateExtraExpenses(subtotal, extraPct);
  const grandTotal = calculateGrandTotal(subtotal, extra);
  const baseArea = tq.area + mq.area;

  return {
    tile: {
      quantity: tq,
      rate: clean(input.tile.rate),
      labourRate: clean(input.tile.labourRate),
      material: tileMaterial,
      labour: tileLabour,
      total: tileMaterial + tileLabour,
    },
    marble: {
      quantity: mq,
      rate: clean(input.marble.rate),
      floorArea: clean(input.marble.floorArea),
      floorLabourRate: clean(input.marble.floorLabourRate),
      floorLabour,
      trimArea: clean(input.marble.trimArea),
      trimLabourRate: clean(input.marble.trimLabourRate),
      trimLabour,
      material: marbleMaterial,
      total: marbleMaterial + floorLabour + trimLabour,
    },
    supporting,
    material,
    labour,
    subtotal,
    extraPct,
    extra,
    grandTotal,
    baseArea,
    averagePerSqft: calculateAverageCostPerSqFt(grandTotal, baseArea),
  };
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export interface FlooringIssue {
  /** Dotted path of the input, e.g. "tile.rate". */
  path: string;
  message: string;
}

const MAX = { area: 10000000, rate: 10000000 };

/**
 * Anything that would make the estimate wrong rather than merely
 * incomplete: no area at all, a negative or non-numeric figure, or an
 * area with no material rate.
 */
export function validateFlooring(input: FlooringInput): FlooringIssue[] {
  const issues: FlooringIssue[] = [];
  const check = (path: string, value: number, label: string, max: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) issues.push({ path, message: `${label}: enter a valid number.` });
    else if (value < 0) issues.push({ path, message: `${label} cannot be negative.` });
    else if (value > max) issues.push({ path, message: `${label} looks too large — check the figure.` });
  };
  const required = (path: string, value: number, message: string) => {
    if (!issues.some((i) => i.path === path) && Number.isFinite(value) && value === 0) issues.push({ path, message });
  };

  const t = input.tile;
  check('tile.area', t.area, 'Tile area', MAX.area);
  check('tile.rate', t.rate, 'Tile rate', MAX.rate);
  check('tile.labourRate', t.labourRate, 'Tile labour cost', MAX.rate);
  if (t.area > 0) required('tile.rate', t.rate, 'Enter the tile rate per sq ft.');

  const m = input.marble;
  check('marble.floorArea', m.floorArea, 'Marble floor & platform area', MAX.area);
  check('marble.floorLabourRate', m.floorLabourRate, 'Marble floor & platform labour', MAX.rate);
  check('marble.trimArea', m.trimArea, 'Marble window & stair area', MAX.area);
  check('marble.trimLabourRate', m.trimLabourRate, 'Marble window & stair labour', MAX.rate);
  check('marble.rate', m.rate, 'Marble rate', MAX.rate);
  if (m.floorArea > 0 || m.trimArea > 0) required('marble.rate', m.rate, 'Enter the marble rate per sq ft.');

  if (!issues.some((i) => i.path.endsWith('Area') || i.path.endsWith('.area')) && clean(t.area) + clean(m.floorArea) + clean(m.trimArea) === 0) {
    issues.push({ path: 'area', message: 'Enter the tile area, a marble area, or both.' });
  }

  check('rates.sand', input.rates.sand, 'Sand rate', MAX.rate);
  check('rates.cement', input.rates.cement, 'Cement rate', MAX.rate);
  check('rates.whiteCement', input.rates.whiteCement, 'White cement rate', MAX.rate);
  check('rates.grout', input.rates.grout, 'Grout rate', MAX.rate);

  return issues;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Non-finite or negative input never reaches a total. */
function clean(v: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}

/** Whole rupees per line, so the lines add up to the totals shown. */
function rupees(v: number): number {
  return Number.isFinite(v) ? Math.round(round6(v)) : 0;
}

/** Drops float dust before rounding: 19.200000000000003 is 19.2, 43658.99999 is 43659. */
function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}
