/* ------------------------------------------------------------------ *
 * Tile & marble cost estimate.
 *
 * The homeowner works out their own areas and enters two totals: the tile
 * area and the marble area. From those the engine adds skirting and
 * wastage to find what to buy, prices the material, prices the labour on
 * the area actually laid, adds the marble staircase and the window and
 * door finishing, estimates the setting materials, and puts an
 * extra-expenses allowance on top.
 *
 *   Area → + skirting → subtotal → + wastage → required → × rate = material
 *   Area × labour rate = labour   (never on skirting or wastage)
 *
 * Money is rounded to whole rupees per line, so the lines of the estimate
 * always add up to exactly the totals shown under them.
 * ------------------------------------------------------------------ */

/**
 * How much of each setting material one square foot takes. These are
 * planning assumptions — real consumption depends on the surface, the
 * mortar thickness, joint width and the contractor — so they live here,
 * in one place, where they can be tuned.
 */
export const CONSUMPTION = {
  /** Cubic feet of sand per sq ft — roughly a one-inch mortar bed. */
  sand: { perSqft: 0.1, appliesTo: 'all', unit: 'CFT' },
  /** 50 kg bags of cement per sq ft — about one bag for every 50 sq ft. */
  cement: { perSqft: 0.02, appliesTo: 'all', unit: 'bags' },
  /** Kilograms of white cement per sq ft of marble, for joints and finishing. */
  whiteCement: { perSqft: 0.05, appliesTo: 'marble', unit: 'kg' },
  /** Kilograms of grout per sq ft of tile, for 2–3 mm joints. */
  grout: { perSqft: 0.025, appliesTo: 'tile', unit: 'kg' },
} as const satisfies Record<SupportingKey, { perSqft: number; appliesTo: 'all' | 'tile' | 'marble'; unit: string }>;

export type SupportingKey = 'sand' | 'cement' | 'whiteCement' | 'grout';

export interface SurfaceInput {
  /** The usable area the user worked out, in sq ft. */
  area: number;
  skirtingPct: number;
  wastagePct: number;
  rate: number;
  labourRate: number;
}

export interface StaircaseInput {
  steps: number;
  /** The real width each step's marble covers, in feet (e.g. 12). */
  width: number;
  /** The width the per-step labour price is quoted for, in feet (e.g. 3). */
  baseWidth: number;
  baseCost: number;
}

export interface CountInput {
  count: number;
  rate: number;
}

export interface FlooringInput {
  tile: SurfaceInput;
  marble: SurfaceInput;
  staircase: StaircaseInput;
  windows: CountInput;
  doors: CountInput;
  rates: Record<SupportingKey, number>;
  extraPct: number;
}

/* ------------------------------------------------------------------ */
/* Tile & marble                                                       */
/* ------------------------------------------------------------------ */

export interface Quantity {
  /** What the user entered — never changed. */
  area: number;
  skirtingPct: number;
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
 * Area → + skirting → subtotal → + wastage → total required.
 * Skirting is a share of the area; wastage is a share of area + skirting,
 * because the skirting pieces are cut from the same stock.
 */
function quantity(area: number, skirtingPct: number, wastagePct: number): Quantity {
  const a = clean(area);
  const skirting = (a * clean(skirtingPct)) / 100;
  const subtotal = a + skirting;
  const wastage = (subtotal * clean(wastagePct)) / 100;
  const required = subtotal + wastage;
  return {
    area: a,
    skirtingPct: clean(skirtingPct),
    skirting,
    subtotal,
    wastagePct: clean(wastagePct),
    wastage,
    required,
    purchase: Math.round(round6(required)),
  };
}

export const calculateTileQuantity = (t: Pick<SurfaceInput, 'area' | 'skirtingPct' | 'wastagePct'>): Quantity =>
  quantity(t.area, t.skirtingPct, t.wastagePct);
export const calculateMarbleQuantity = calculateTileQuantity;

/** Material = total required × rate. */
export const calculateTileMaterialCost = (q: Quantity, rate: number): number => rupees(q.required * clean(rate));
export const calculateMarbleMaterialCost = calculateTileMaterialCost;

/** Labour = the area entered × labour rate — no skirting, no wastage. */
export const calculateTileLabourCost = (area: number, labourRate: number): number => rupees(clean(area) * clean(labourRate));
/** Marble floor & kitchen platform labour. Staircase, windows and doors are separate. */
export const calculateMarbleLabourCost = calculateTileLabourCost;

/* ------------------------------------------------------------------ */
/* Marble staircase, windows, doors                                    */
/* ------------------------------------------------------------------ */

export interface StaircaseCost {
  steps: number;
  width: number;
  baseWidth: number;
  baseCost: number;
  costPerStep: number;
  total: number;
}

/**
 * Cost per step = base cost × (actual width ÷ base width); × steps.
 * At ₹1,000 for a 3 ft step, a 12 ft step is ₹4,000 — "12 ft" is the
 * width of each step, never the number of steps.
 */
export function calculateStaircaseLabour(s: StaircaseInput): StaircaseCost {
  const steps = Math.floor(clean(s.steps));
  const width = clean(s.width);
  const baseWidth = clean(s.baseWidth);
  const baseCost = clean(s.baseCost);
  const costPerStep = baseWidth > 0 ? baseCost * (width / baseWidth) : 0;
  return { steps, width, baseWidth, baseCost, costPerStep, total: rupees(costPerStep * steps) };
}

export interface CountCost {
  count: number;
  rate: number;
  total: number;
}

/** Windows × labour per window. */
export const calculateWindowFinishing = (w: CountInput): CountCost => countCost(w);
/** Doors × labour per door. */
export const calculateDoorFinishing = (d: CountInput): CountCost => countCost(d);

function countCost(c: CountInput): CountCost {
  const count = Math.floor(clean(c.count));
  return { count, rate: clean(c.rate), total: rupees(count * clean(c.rate)) };
}

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
  marble: number;
  staircase: number;
  windows: number;
  doors: number;
  total: number;
}

/** Tile + marble floor/platform + staircase + windows + doors. */
export function calculateTotalLabourCost(parts: Omit<LabourTotals, 'total'>): LabourTotals {
  return { ...parts, total: parts.tile + parts.marble + parts.staircase + parts.windows + parts.doors };
}

/** Extra expenses = subtotal × extra %. */
export const calculateExtraExpenses = (subtotal: number, pct: number): number => rupees((clean(subtotal) * clean(pct)) / 100);

export const calculateGrandTotal = (subtotal: number, extra: number): number => clean(subtotal) + clean(extra);

/** Grand total ÷ (tile area + marble area) — the areas entered, not the purchase quantities. */
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
    labourRate: number;
    material: number;
    labour: number;
    staircase: StaircaseCost;
    windows: CountCost;
    doors: CountCost;
    /** Material + floor/platform labour + staircase + windows + doors. */
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
  /** Tile area + marble area, as entered. */
  baseArea: number;
  averagePerSqft: number | null;
}

export function calculateFlooringEstimate(input: FlooringInput): FlooringResult {
  const tq = calculateTileQuantity(input.tile);
  const mq = calculateMarbleQuantity(input.marble);

  const tileMaterial = calculateTileMaterialCost(tq, input.tile.rate);
  const tileLabour = calculateTileLabourCost(tq.area, input.tile.labourRate);
  const marbleMaterial = calculateMarbleMaterialCost(mq, input.marble.rate);
  const marbleLabour = calculateMarbleLabourCost(mq.area, input.marble.labourRate);

  const staircase = calculateStaircaseLabour(input.staircase);
  const windows = calculateWindowFinishing(input.windows);
  const doors = calculateDoorFinishing(input.doors);

  const supporting = [
    calculateSandRequirement(tq.area, mq.area, input.rates.sand),
    calculateCementRequirement(tq.area, mq.area, input.rates.cement),
    calculateWhiteCementRequirement(tq.area, mq.area, input.rates.whiteCement),
    calculateGroutRequirement(tq.area, mq.area, input.rates.grout),
  ];

  const material = calculateTotalMaterialCost(tileMaterial, marbleMaterial, supporting);
  const labour = calculateTotalLabourCost({
    tile: tileLabour,
    marble: marbleLabour,
    staircase: staircase.total,
    windows: windows.total,
    doors: doors.total,
  });

  const subtotal = material.total + labour.total;
  const extraPct = clean(input.extraPct);
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
      labourRate: clean(input.marble.labourRate),
      material: marbleMaterial,
      labour: marbleLabour,
      staircase,
      windows,
      doors,
      total: marbleMaterial + marbleLabour + staircase.total + windows.total + doors.total,
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

const MAX = { area: 10000000, rate: 10000000, pct: 100, count: 1000, width: 1000 };

/**
 * Anything that would make the estimate wrong rather than merely
 * incomplete: no area at all, a negative or non-numeric figure, a material
 * with an area but no rate, a staircase with steps but no width, or a
 * fractional count of steps, windows or doors.
 */
export function validateFlooring(input: FlooringInput): FlooringIssue[] {
  const issues: FlooringIssue[] = [];
  const check = (path: string, value: number, label: string, max: number, integer = false) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) issues.push({ path, message: `${label}: enter a valid number.` });
    else if (value < 0) issues.push({ path, message: `${label} cannot be negative.` });
    else if (integer && !Number.isInteger(value)) issues.push({ path, message: `${label} must be a whole number.` });
    else if (value > max) issues.push({ path, message: `${label} looks too large — check the figure.` });
  };
  const required = (path: string, value: number, message: string) => {
    if (!issues.some((i) => i.path === path) && Number.isFinite(value) && value === 0) issues.push({ path, message });
  };

  for (const [key, name] of [
    ['tile', 'Tile'],
    ['marble', 'Marble'],
  ] as const) {
    const s = input[key];
    check(`${key}.area`, s.area, `${name} area`, MAX.area);
    check(`${key}.skirtingPct`, s.skirtingPct, `${name} skirting`, MAX.pct);
    check(`${key}.wastagePct`, s.wastagePct, `${name} wastage`, MAX.pct);
    check(`${key}.rate`, s.rate, `${name} rate`, MAX.rate);
    check(`${key}.labourRate`, s.labourRate, `${name} labour cost`, MAX.rate);
    if (s.area > 0) required(`${key}.rate`, s.rate, `Enter the ${name.toLowerCase()} rate per sq ft.`);
  }
  if (!issues.some((i) => i.path.endsWith('.area')) && clean(input.tile.area) + clean(input.marble.area) === 0) {
    issues.push({ path: 'area', message: 'Enter the tile area, the marble area, or both.' });
  }

  const s = input.staircase;
  check('staircase.steps', s.steps, 'Number of stairs', MAX.count, true);
  check('staircase.width', s.width, 'Step width', MAX.width);
  check('staircase.baseWidth', s.baseWidth, 'Base step width', MAX.width);
  check('staircase.baseCost', s.baseCost, 'Base labour cost', MAX.rate);
  if (s.steps > 0) {
    required('staircase.width', s.width, 'Enter the width each step covers, e.g. 12 ft.');
    required('staircase.baseWidth', s.baseWidth, 'Enter the base step width the rate is quoted for, e.g. 3 ft.');
    required('staircase.baseCost', s.baseCost, 'Enter the labour cost for one base-width step.');
  }

  check('windows.count', input.windows.count, 'Number of windows', MAX.count, true);
  check('windows.rate', input.windows.rate, 'Labour cost per window', MAX.rate);
  check('doors.count', input.doors.count, 'Number of doors', MAX.count, true);
  check('doors.rate', input.doors.rate, 'Labour cost per door', MAX.rate);
  if (input.windows.count > 0) required('windows.rate', input.windows.rate, 'Enter the finishing labour cost per window.');
  if (input.doors.count > 0) required('doors.rate', input.doors.rate, 'Enter the finishing labour cost per door.');

  check('rates.sand', input.rates.sand, 'Sand rate', MAX.rate);
  check('rates.cement', input.rates.cement, 'Cement rate', MAX.rate);
  check('rates.whiteCement', input.rates.whiteCement, 'White cement rate', MAX.rate);
  check('rates.grout', input.rates.grout, 'Grout rate', MAX.rate);
  check('extraPct', input.extraPct, 'Extra expenses', MAX.pct);

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
