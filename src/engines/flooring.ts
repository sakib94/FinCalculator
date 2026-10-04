/* ------------------------------------------------------------------ *
 * Tile & marble flooring estimate.
 *
 * Every flooring quantity is worked in square feet. Metric entries are
 * converted on the way in (1 m² = 10.7639 sq ft, 1 m = 3.28084 ft), so the
 * rest of the engine never has to think about units.
 *
 * Money is rounded to whole rupees per line, so the lines of the estimate
 * always add up to exactly the grand total shown under them.
 *
 * Material quantities (cement, sand, white cement, grout) come from
 * consumption factors per square foot. They are planning assumptions, not
 * site measurements — every factor is an input the user can change.
 * ------------------------------------------------------------------ */

export const SQM_TO_SQFT = 10.7639;
export const M_TO_FT = 3.28084;

export const MAX_ROOMS = 20;
export const MAX_OTHER_AREAS = 30;

export type LengthUnit = 'ft' | 'm';
/** Riser heights are usually quoted in inches, so risers also take inches. */
export type RiserUnit = LengthUnit | 'in';
export type AreaUnit = 'sqft' | 'sqm';
export type MeasureMethod = 'dimensions' | 'area';
export type AppliesTo = 'all' | 'tile' | 'marble';
export type AreaKind = 'room' | 'hall' | 'kitchen' | 'other';

export interface AreaEntry {
  id: string;
  name: string;
  method: MeasureMethod;
  length: number;
  width: number;
  lengthUnit: LengthUnit;
  area: number;
  areaUnit: AreaUnit;
}

export interface TileInput {
  enabled: boolean;
  /** Used only when marble is also selected; otherwise the whole floor is tile. */
  area: number;
  rate: number;
  labourRate: number;
  wastage: number;
}

export interface MarbleInput {
  enabled: boolean;
  /** Used only when tile is also selected; otherwise the whole floor is marble. */
  area: number;
  rate: number;
  labourRate: number;
  wastage: number;
  polishingEnabled: boolean;
  polishingRate: number;
}

export interface StaircaseInput {
  enabled: boolean;
  steps: number;
  width: number;
  widthUnit: LengthUnit;
  baseWidth: number;
  baseWidthUnit: LengthUnit;
  baseCostPerStep: number;
}

export interface RiserInput {
  enabled: boolean;
  count: number;
  height: number;
  heightUnit: RiserUnit;
  width: number;
  widthUnit: RiserUnit;
  materialRate: number;
  labourRate: number;
}

export interface NosingInput {
  enabled: boolean;
  steps: number;
  lengthPerStep: number;
  lengthUnit: LengthUnit;
  ratePerFt: number;
}

export interface MaterialsInput {
  cementRate: number;
  /** Bags of cement per sq ft of flooring. */
  cementPerSqft: number;
  cementAppliesTo: AppliesTo;
  sandRate: number;
  /** Cubic feet of sand per sq ft of flooring. */
  sandPerSqft: number;
  sandAppliesTo: AppliesTo;
  whiteCementRate: number;
  /** Kilograms of white cement per sq ft of flooring. */
  whiteCementPerSqft: number;
  whiteCementAppliesTo: AppliesTo;
}

export interface AdhesiveInput {
  enabled: boolean;
  pricePerBag: number;
  coveragePerBag: number;
}

export interface GroutInput {
  enabled: boolean;
  ratePerKg: number;
  kgPerSqft: number;
  appliesTo: AppliesTo;
}

export interface SkirtingInput {
  enabled: boolean;
  mode: 'auto' | 'manual';
  runningLength: number;
  runningUnit: LengthUnit;
  openings: number;
  openingsUnit: LengthUnit;
  material: 'tile' | 'marble';
  materialRate: number;
  labourRate: number;
}

export interface AdditionalInput {
  transportation: number;
  loadingUnloading: number;
  other: number;
  otherNote: string;
}

export interface FlooringInput {
  rooms: AreaEntry[];
  hall: AreaEntry;
  kitchen: AreaEntry;
  otherAreas: AreaEntry[];
  tile: TileInput;
  marble: MarbleInput;
  staircase: StaircaseInput;
  riser: RiserInput;
  nosing: NosingInput;
  materials: MaterialsInput;
  adhesive: AdhesiveInput;
  grout: GroutInput;
  skirting: SkirtingInput;
  additional: AdditionalInput;
  contingencyPct: number;
}

/* ------------------------------------------------------------------ */
/* Units                                                               */
/* ------------------------------------------------------------------ */

/** A length in feet. */
export function toFeet(value: number, unit: RiserUnit): number {
  const v = clean(value);
  if (unit === 'm') return v * M_TO_FT;
  if (unit === 'in') return v / 12;
  return v;
}

/** An area in square feet. */
export const toSqft = (value: number, unit: AreaUnit): number =>
  unit === 'sqm' ? clean(value) * SQM_TO_SQFT : clean(value);

/* ------------------------------------------------------------------ */
/* Areas                                                               */
/* ------------------------------------------------------------------ */

export interface RoomArea {
  /** Area in sq ft — what every later step uses. */
  sqft: number;
  /** Area in m², when it was entered in metric. */
  sqm: number | null;
  /** Perimeter in feet, known only when the room was measured by its sides. */
  perimeterFt: number | null;
}

/**
 * Length × width, or an area typed in directly.
 * In metres the area is worked in m² first and then converted, exactly as
 * a contractor would: 5 m × 4 m = 20 m² = 215.28 sq ft.
 */
export function calculateRoomArea(entry: AreaEntry): RoomArea {
  if (entry.method === 'area') {
    const a = clean(entry.area);
    return entry.areaUnit === 'sqm'
      ? { sqft: a * SQM_TO_SQFT, sqm: a, perimeterFt: null }
      : { sqft: a, sqm: null, perimeterFt: null };
  }
  const l = clean(entry.length);
  const w = clean(entry.width);
  if (entry.lengthUnit === 'm') {
    const sqm = l * w;
    return { sqft: sqm * SQM_TO_SQFT, sqm, perimeterFt: 2 * (l + w) * M_TO_FT };
  }
  return { sqft: l * w, sqm: null, perimeterFt: 2 * (l + w) };
}

export interface MeasuredArea extends RoomArea {
  id: string;
  name: string;
  kind: AreaKind;
}

/** Every measured space in order: rooms, hall, kitchen, then the others. */
export function measureAreas(input: Pick<FlooringInput, 'rooms' | 'hall' | 'kitchen' | 'otherAreas'>): MeasuredArea[] {
  const tag = (e: AreaEntry, kind: AreaKind): MeasuredArea => ({ id: e.id, name: e.name, kind, ...calculateRoomArea(e) });
  return [
    ...input.rooms.map((r) => tag(r, 'room')),
    tag(input.hall, 'hall'),
    tag(input.kitchen, 'kitchen'),
    ...input.otherAreas.map((o) => tag(o, 'other')),
  ];
}

/** Total Floor Area = rooms + hall + kitchen + other areas (staircase is never part of it). */
export const calculateTotalFloorArea = (areas: { sqft: number }[]): number =>
  areas.reduce((s, a) => s + clean(a.sqft), 0);

export interface Allocation {
  tileArea: number;
  marbleArea: number;
  /** Floor left without tile or marble; negative when the two exceed the floor. */
  remaining: number;
  /** How far tile + marble overshoot the floor (0 when they fit). */
  excess: number;
}

/**
 * Who covers what. One material alone covers the whole floor; with both,
 * the split is what the user entered and must fit inside the floor.
 */
export function allocateArea(total: number, tile: Pick<TileInput, 'enabled' | 'area'>, marble: Pick<MarbleInput, 'enabled' | 'area'>): Allocation {
  let tileArea = 0;
  let marbleArea = 0;
  if (tile.enabled && marble.enabled) {
    tileArea = clean(tile.area);
    marbleArea = clean(marble.area);
  } else if (tile.enabled) {
    tileArea = total;
  } else if (marble.enabled) {
    marbleArea = total;
  }
  const remaining = total - tileArea - marbleArea;
  // A thousandth of a square foot is float noise, not an overshoot.
  const excess = remaining < -0.001 ? -remaining : 0;
  return { tileArea, marbleArea, remaining: Math.abs(remaining) < 0.001 ? 0 : remaining, excess };
}

/* ------------------------------------------------------------------ */
/* Tile & marble                                                       */
/* ------------------------------------------------------------------ */

/** Purchase Area = Area × (1 + Wastage / 100). Wastage applies to material only. */
const purchaseArea = (area: number, wastagePct: number): number => clean(area) * (1 + clean(wastagePct) / 100);

export const calculateTilePurchaseArea = purchaseArea;
export const calculateMarblePurchaseArea = purchaseArea;

/** Material = Purchase Area × Rate. */
export const calculateTileMaterialCost = (purchase: number, rate: number): number => rupees(purchase * clean(rate));
export const calculateMarbleMaterialCost = calculateTileMaterialCost;

/** Labour = laid area × labour rate — never on the wastage. */
export const calculateTileLabourCost = (area: number, labourRate: number): number => rupees(clean(area) * clean(labourRate));
export const calculateMarbleLabourCost = calculateTileLabourCost;

/** Grinding & polishing = marble area × rate, with no wastage. */
export const calculatePolishingCost = (marbleArea: number, rate: number): number => rupees(clean(marbleArea) * clean(rate));

export interface SurfaceCost {
  area: number;
  wastagePct: number;
  purchaseArea: number;
  wastageArea: number;
  rate: number;
  labourRate: number;
  /** Purchase area × rate: everything paid for the material. */
  materialCost: number;
  /** The part of materialCost that covers the laid area. */
  netMaterialCost: number;
  /** The part of materialCost that buys the wastage allowance. */
  wastageCost: number;
  labourCost: number;
}

function surfaceCost(area: number, rate: number, labourRate: number, wastagePct: number): SurfaceCost {
  const purchase = purchaseArea(area, wastagePct);
  const materialCost = calculateTileMaterialCost(purchase, rate);
  const netMaterialCost = Math.min(materialCost, rupees(clean(area) * clean(rate)));
  return {
    area: clean(area),
    wastagePct: clean(wastagePct),
    purchaseArea: purchase,
    wastageArea: purchase - clean(area),
    rate: clean(rate),
    labourRate: clean(labourRate),
    materialCost,
    netMaterialCost,
    wastageCost: materialCost - netMaterialCost,
    labourCost: calculateTileLabourCost(area, labourRate),
  };
}

/* ------------------------------------------------------------------ */
/* Staircase                                                           */
/* ------------------------------------------------------------------ */

export interface StaircaseCost {
  steps: number;
  widthFt: number;
  baseWidthFt: number;
  baseCostPerStep: number;
  costPerStep: number;
  total: number;
}

/**
 * Cost per step = base cost × (actual width ÷ base width), then × steps.
 * "A 12 ft staircase" is the width of each step, never the number of steps.
 */
export function calculateStaircaseCost(s: Omit<StaircaseInput, 'enabled'>): StaircaseCost {
  const widthFt = toFeet(s.width, s.widthUnit);
  const baseWidthFt = toFeet(s.baseWidth, s.baseWidthUnit);
  const steps = Math.floor(clean(s.steps));
  const costPerStep = baseWidthFt > 0 ? clean(s.baseCostPerStep) * (widthFt / baseWidthFt) : 0;
  return {
    steps,
    widthFt,
    baseWidthFt,
    baseCostPerStep: clean(s.baseCostPerStep),
    costPerStep,
    total: rupees(costPerStep * steps),
  };
}

export interface RiserCost {
  count: number;
  heightFt: number;
  widthFt: number;
  area: number;
  materialRate: number;
  labourRate: number;
  materialCost: number;
  labourCost: number;
}

/** Riser Area = risers × height × width (sq ft); material and labour on that area. */
export function calculateRiserCost(r: Omit<RiserInput, 'enabled'>): RiserCost {
  const count = Math.floor(clean(r.count));
  const heightFt = toFeet(r.height, r.heightUnit);
  const widthFt = toFeet(r.width, r.widthUnit);
  const area = count * heightFt * widthFt;
  return {
    count,
    heightFt,
    widthFt,
    area,
    materialRate: clean(r.materialRate),
    labourRate: clean(r.labourRate),
    materialCost: rupees(area * clean(r.materialRate)),
    labourCost: rupees(area * clean(r.labourRate)),
  };
}

export interface NosingCost {
  steps: number;
  lengthPerStepFt: number;
  totalLength: number;
  rate: number;
  cost: number;
}

/** Nosing = steps × length per step (running ft) × rate per running ft. */
export function calculateNosingCost(n: Omit<NosingInput, 'enabled'>): NosingCost {
  const steps = Math.floor(clean(n.steps));
  const lengthPerStepFt = toFeet(n.lengthPerStep, n.lengthUnit);
  const totalLength = steps * lengthPerStepFt;
  return { steps, lengthPerStepFt, totalLength, rate: clean(n.ratePerFt), cost: rupees(totalLength * clean(n.ratePerFt)) };
}

/* ------------------------------------------------------------------ */
/* Setting materials                                                   */
/* ------------------------------------------------------------------ */

export const appliedArea = (appliesTo: AppliesTo, tileArea: number, marbleArea: number): number =>
  appliesTo === 'tile' ? tileArea : appliesTo === 'marble' ? marbleArea : tileArea + marbleArea;

export interface Requirement {
  /** The flooring area the factor was applied to. */
  area: number;
  factor: number;
  /** Area × factor, before rounding. */
  exact: number;
  /** What to buy: whole bags for cement, the exact figure otherwise. */
  quantity: number;
  rate: number;
  cost: number;
}

/** Cement bags = area × bags per sq ft, rounded up to whole bags. */
export function calculateCementRequirement(area: number, bagsPerSqft: number, ratePerBag: number): Requirement {
  const exact = clean(area) * clean(bagsPerSqft);
  const quantity = ceilQty(exact);
  return { area: clean(area), factor: clean(bagsPerSqft), exact, quantity, rate: clean(ratePerBag), cost: rupees(quantity * clean(ratePerBag)) };
}

/** Sand (CFT) = area × CFT per sq ft. */
export function calculateSandRequirement(area: number, cftPerSqft: number, ratePerCft: number): Requirement {
  const exact = clean(area) * clean(cftPerSqft);
  return { area: clean(area), factor: clean(cftPerSqft), exact, quantity: exact, rate: clean(ratePerCft), cost: rupees(exact * clean(ratePerCft)) };
}

/** White cement (kg) = area × kg per sq ft. */
export function calculateWhiteCementRequirement(area: number, kgPerSqft: number, ratePerKg: number): Requirement {
  const exact = clean(area) * clean(kgPerSqft);
  return { area: clean(area), factor: clean(kgPerSqft), exact, quantity: exact, rate: clean(ratePerKg), cost: rupees(exact * clean(ratePerKg)) };
}

export interface AdhesiveCost {
  area: number;
  coverage: number;
  exactBags: number;
  bags: number;
  pricePerBag: number;
  cost: number;
}

/** Bags = tile area ÷ coverage per bag, rounded UP to a whole bag. */
export function calculateAdhesiveCost(tileArea: number, coveragePerBag: number, pricePerBag: number): AdhesiveCost {
  const coverage = clean(coveragePerBag);
  const exactBags = coverage > 0 ? clean(tileArea) / coverage : 0;
  const bags = ceilQty(exactBags);
  return { area: clean(tileArea), coverage, exactBags, bags, pricePerBag: clean(pricePerBag), cost: rupees(bags * clean(pricePerBag)) };
}

export interface GroutCost {
  area: number;
  tileArea: number;
  marbleArea: number;
  kgPerSqft: number;
  quantity: number;
  rate: number;
  cost: number;
  /** The tile and marble shares of the cost, by area. */
  tileCost: number;
  marbleCost: number;
}

/** Grout (kg) = area × kg per sq ft; cost = kg × rate. */
export function calculateGroutCost(tileArea: number, marbleArea: number, appliesTo: AppliesTo, kgPerSqft: number, ratePerKg: number): GroutCost {
  const t = appliesTo === 'marble' ? 0 : clean(tileArea);
  const m = appliesTo === 'tile' ? 0 : clean(marbleArea);
  const area = t + m;
  const quantity = area * clean(kgPerSqft);
  const cost = rupees(quantity * clean(ratePerKg));
  const tileCost = area > 0 ? rupees((cost * t) / area) : 0;
  return {
    area,
    tileArea: t,
    marbleArea: m,
    kgPerSqft: clean(kgPerSqft),
    quantity,
    rate: clean(ratePerKg),
    cost,
    tileCost,
    marbleCost: cost - tileCost,
  };
}

export interface SkirtingCost {
  mode: 'auto' | 'manual';
  /** Running feet before openings are taken out. */
  grossFt: number;
  openingsFt: number;
  netFt: number;
  /** Spaces whose perimeter is unknown because only their area was entered. */
  unmeasured: string[];
  material: 'tile' | 'marble';
  materialRate: number;
  labourRate: number;
  materialCost: number;
  labourCost: number;
}

/**
 * Manual: the running feet entered. Automatic: the perimeter of every space
 * measured by its sides, 2 × (length + width). Door and other openings are
 * then taken off.
 */
export function calculateSkirtingCost(s: Omit<SkirtingInput, 'enabled'>, areas: MeasuredArea[]): SkirtingCost {
  const unmeasured: string[] = [];
  let grossFt: number;
  if (s.mode === 'manual') {
    grossFt = toFeet(s.runningLength, s.runningUnit);
  } else {
    grossFt = 0;
    for (const a of areas) {
      if (a.perimeterFt == null) {
        if (a.sqft > 0) unmeasured.push(a.name);
      } else if (a.sqft > 0) {
        grossFt += a.perimeterFt;
      }
    }
  }
  const openingsFt = toFeet(s.openings, s.openingsUnit);
  const netFt = Math.max(0, grossFt - openingsFt);
  return {
    mode: s.mode,
    grossFt,
    openingsFt,
    netFt,
    unmeasured,
    material: s.material,
    materialRate: clean(s.materialRate),
    labourRate: clean(s.labourRate),
    materialCost: rupees(netFt * clean(s.materialRate)),
    labourCost: rupees(netFt * clean(s.labourRate)),
  };
}

/* ------------------------------------------------------------------ */
/* Additional costs, contingency, totals                               */
/* ------------------------------------------------------------------ */

export const calculateTransportation = (a: Pick<AdditionalInput, 'transportation'>): number => rupees(clean(a.transportation));

export const calculateLoadingUnloading = (a: Pick<AdditionalInput, 'loadingUnloading'>): number =>
  rupees(clean(a.loadingUnloading));

export const calculateOtherExpenses = (a: Pick<AdditionalInput, 'other'>): number => rupees(clean(a.other));

/** Contingency = eligible cost × contingency %. */
export const calculateContingency = (eligible: number, pct: number): number => rupees(clean(eligible) * (clean(pct) / 100));

export const calculateGrandTotal = (subtotal: number, contingency: number): number => clean(subtotal) + clean(contingency);

/** Grand total ÷ the actual floor area (not the purchase area after wastage). */
export const calculateAverageCostPerSqFt = (grandTotal: number, totalFloorArea: number): number | null =>
  totalFloorArea > 0 ? grandTotal / totalFloorArea : null;

/* ------------------------------------------------------------------ */
/* The estimate                                                        */
/* ------------------------------------------------------------------ */

export type LineKey =
  | 'tileMaterial'
  | 'tileLabour'
  | 'marbleMaterial'
  | 'marbleLabour'
  | 'polishing'
  | 'staircase'
  | 'riserMaterial'
  | 'riserLabour'
  | 'nosing'
  | 'cement'
  | 'sand'
  | 'whiteCement'
  | 'adhesive'
  | 'grout'
  | 'skirtingMaterial'
  | 'skirtingLabour'
  | 'transportation'
  | 'loadingUnloading'
  | 'otherExpenses';

export type CostKind = 'material' | 'labour' | 'other';

export interface LineItem {
  key: LineKey;
  quantity: number | null;
  rate: number | null;
  cost: number;
  kind: CostKind;
  /** Which side of the tile-vs-marble comparison it belongs to. */
  side: 'tile' | 'marble' | 'shared';
}

export interface SideTotals {
  material: number;
  wastage: number;
  labour: number;
  polishing: number;
  /** Staircase, risers and nosing — marble only. */
  stairs: number;
  /** Adhesive, grout and skirting attributed to this side. */
  other: number;
  total: number;
}

export interface FlooringResult {
  areas: MeasuredArea[];
  totalArea: number;
  allocation: Allocation;
  tile: SurfaceCost | null;
  marble: (SurfaceCost & { polishingCost: number | null }) | null;
  staircase: StaircaseCost | null;
  riser: RiserCost | null;
  nosing: NosingCost | null;
  cement: Requirement;
  sand: Requirement;
  whiteCement: Requirement;
  adhesive: AdhesiveCost | null;
  grout: GroutCost | null;
  skirting: SkirtingCost | null;
  transportation: number;
  loadingUnloading: number;
  otherExpenses: number;
  lines: LineItem[];
  /** Everything before contingency — the base contingency is worked on. */
  subtotal: number;
  contingencyPct: number;
  contingency: number;
  grandTotal: number;
  averagePerSqft: number | null;
  byKind: Record<CostKind, number>;
  comparison: { tile: SideTotals; marble: SideTotals; shared: number };
}

export function calculateFlooringEstimate(input: FlooringInput): FlooringResult {
  const areas = measureAreas(input);
  const totalArea = calculateTotalFloorArea(areas);
  const allocation = allocateArea(totalArea, input.tile, input.marble);
  const { tileArea, marbleArea } = allocation;

  const tile = input.tile.enabled
    ? surfaceCost(tileArea, input.tile.rate, input.tile.labourRate, input.tile.wastage)
    : null;
  const marbleBase = input.marble.enabled
    ? surfaceCost(marbleArea, input.marble.rate, input.marble.labourRate, input.marble.wastage)
    : null;
  const marble = marbleBase
    ? {
        ...marbleBase,
        polishingCost: input.marble.polishingEnabled ? calculatePolishingCost(marbleArea, input.marble.polishingRate) : null,
      }
    : null;

  const staircase = input.staircase.enabled ? calculateStaircaseCost(input.staircase) : null;
  const riser = input.riser.enabled ? calculateRiserCost(input.riser) : null;
  const nosing = input.nosing.enabled ? calculateNosingCost(input.nosing) : null;

  // "Tile only" or "marble only" means something only when both are laid;
  // with a single material every setting material goes under it.
  const scope = (a: AppliesTo): AppliesTo => (input.tile.enabled && input.marble.enabled ? a : 'all');
  const m = input.materials;
  const cement = calculateCementRequirement(appliedArea(scope(m.cementAppliesTo), tileArea, marbleArea), m.cementPerSqft, m.cementRate);
  const sand = calculateSandRequirement(appliedArea(scope(m.sandAppliesTo), tileArea, marbleArea), m.sandPerSqft, m.sandRate);
  const whiteCement = calculateWhiteCementRequirement(
    appliedArea(scope(m.whiteCementAppliesTo), tileArea, marbleArea),
    m.whiteCementPerSqft,
    m.whiteCementRate,
  );

  const adhesive =
    input.adhesive.enabled && input.tile.enabled
      ? calculateAdhesiveCost(tileArea, input.adhesive.coveragePerBag, input.adhesive.pricePerBag)
      : null;
  const grout = input.grout.enabled
    ? calculateGroutCost(tileArea, marbleArea, scope(input.grout.appliesTo), input.grout.kgPerSqft, input.grout.ratePerKg)
    : null;
  const skirting = input.skirting.enabled ? calculateSkirtingCost(input.skirting, areas) : null;

  const transportation = calculateTransportation(input.additional);
  const loadingUnloading = calculateLoadingUnloading(input.additional);
  const otherExpenses = calculateOtherExpenses(input.additional);

  const lines: LineItem[] = [];
  const add = (l: LineItem) => lines.push(l);

  if (tile) {
    add({ key: 'tileMaterial', quantity: tile.purchaseArea, rate: tile.rate, cost: tile.materialCost, kind: 'material', side: 'tile' });
    add({ key: 'tileLabour', quantity: tile.area, rate: tile.labourRate, cost: tile.labourCost, kind: 'labour', side: 'tile' });
  }
  if (marble) {
    add({ key: 'marbleMaterial', quantity: marble.purchaseArea, rate: marble.rate, cost: marble.materialCost, kind: 'material', side: 'marble' });
    add({ key: 'marbleLabour', quantity: marble.area, rate: marble.labourRate, cost: marble.labourCost, kind: 'labour', side: 'marble' });
    if (marble.polishingCost != null) {
      add({ key: 'polishing', quantity: marble.area, rate: clean(input.marble.polishingRate), cost: marble.polishingCost, kind: 'labour', side: 'marble' });
    }
  }
  if (staircase) {
    add({ key: 'staircase', quantity: staircase.steps, rate: staircase.costPerStep, cost: staircase.total, kind: 'other', side: 'marble' });
  }
  if (riser) {
    add({ key: 'riserMaterial', quantity: riser.area, rate: riser.materialRate, cost: riser.materialCost, kind: 'material', side: 'marble' });
    add({ key: 'riserLabour', quantity: riser.area, rate: riser.labourRate, cost: riser.labourCost, kind: 'labour', side: 'marble' });
  }
  if (nosing) {
    add({ key: 'nosing', quantity: nosing.totalLength, rate: nosing.rate, cost: nosing.cost, kind: 'labour', side: 'marble' });
  }
  // Setting materials show whenever there is a quantity to buy — the
  // quantity is useful even before a rate has been entered.
  if (cement.quantity > 0) add({ key: 'cement', quantity: cement.quantity, rate: cement.rate, cost: cement.cost, kind: 'material', side: 'shared' });
  if (sand.quantity > 0) add({ key: 'sand', quantity: sand.quantity, rate: sand.rate, cost: sand.cost, kind: 'material', side: 'shared' });
  if (whiteCement.quantity > 0) {
    add({ key: 'whiteCement', quantity: whiteCement.quantity, rate: whiteCement.rate, cost: whiteCement.cost, kind: 'material', side: 'shared' });
  }
  if (adhesive) add({ key: 'adhesive', quantity: adhesive.bags, rate: adhesive.pricePerBag, cost: adhesive.cost, kind: 'material', side: 'tile' });
  if (grout) {
    const side = grout.marbleArea === 0 ? 'tile' : grout.tileArea === 0 ? 'marble' : 'shared';
    add({ key: 'grout', quantity: grout.quantity, rate: grout.rate, cost: grout.cost, kind: 'material', side });
  }
  if (skirting) {
    add({ key: 'skirtingMaterial', quantity: skirting.netFt, rate: skirting.materialRate, cost: skirting.materialCost, kind: 'material', side: skirting.material });
    add({ key: 'skirtingLabour', quantity: skirting.netFt, rate: skirting.labourRate, cost: skirting.labourCost, kind: 'labour', side: skirting.material });
  }
  if (transportation > 0) add({ key: 'transportation', quantity: null, rate: null, cost: transportation, kind: 'other', side: 'shared' });
  if (loadingUnloading > 0) add({ key: 'loadingUnloading', quantity: null, rate: null, cost: loadingUnloading, kind: 'other', side: 'shared' });
  if (otherExpenses > 0) add({ key: 'otherExpenses', quantity: null, rate: null, cost: otherExpenses, kind: 'other', side: 'shared' });

  const subtotal = lines.reduce((s, l) => s + l.cost, 0);
  const contingencyPct = clean(input.contingencyPct);
  const contingency = calculateContingency(subtotal, contingencyPct);
  const grandTotal = calculateGrandTotal(subtotal, contingency);

  const byKind: Record<CostKind, number> = { material: 0, labour: 0, other: 0 };
  for (const l of lines) byKind[l.kind] += l.cost;

  const side = (which: 'tile' | 'marble'): SideTotals => {
    const s = which === 'tile' ? tile : marble;
    const t: SideTotals = {
      material: s?.netMaterialCost ?? 0,
      wastage: s?.wastageCost ?? 0,
      labour: s?.labourCost ?? 0,
      polishing: which === 'marble' ? (marble?.polishingCost ?? 0) : 0,
      stairs: 0,
      other: 0,
      total: 0,
    };
    if (which === 'marble') {
      t.stairs = (staircase?.total ?? 0) + (riser ? riser.materialCost + riser.labourCost : 0) + (nosing?.cost ?? 0);
    }
    if (which === 'tile' && adhesive) t.other += adhesive.cost;
    if (grout) t.other += which === 'tile' ? grout.tileCost : grout.marbleCost;
    if (skirting && skirting.material === which) t.other += skirting.materialCost + skirting.labourCost;
    t.total = t.material + t.wastage + t.labour + t.polishing + t.stairs + t.other;
    return t;
  };
  const tileSide = side('tile');
  const marbleSide = side('marble');

  return {
    areas,
    totalArea,
    allocation,
    tile,
    marble,
    staircase,
    riser,
    nosing,
    cement,
    sand,
    whiteCement,
    adhesive,
    grout,
    skirting,
    transportation,
    loadingUnloading,
    otherExpenses,
    lines,
    subtotal,
    contingencyPct,
    contingency,
    grandTotal,
    averagePerSqft: calculateAverageCostPerSqFt(grandTotal, totalArea),
    byKind,
    comparison: { tile: tileSide, marble: marbleSide, shared: subtotal - tileSide.total - marbleSide.total },
  };
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export interface FlooringIssue {
  /** Dotted path of the input, e.g. "rooms.2.length", or a section id. */
  path: string;
  message: string;
}

const LIMITS = {
  dimension: 10000, // ft or m
  area: 10000000, // sq ft or m²
  rate: 10000000,
  amount: 1000000000,
  pct: 100,
  steps: 1000,
};

/**
 * Everything that would make the estimate wrong rather than merely
 * incomplete. An empty field reads as zero; a negative, non-numeric or
 * absurd one is an error.
 */
export function validateFlooring(input: FlooringInput): FlooringIssue[] {
  const issues: FlooringIssue[] = [];
  const check = (path: string, value: number, label: string, max: number, opts: { positive?: boolean; integer?: boolean } = {}) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      issues.push({ path, message: `${label}: enter a valid number.` });
    } else if (value < 0) {
      issues.push({ path, message: `${label} cannot be negative.` });
    } else if (opts.positive && value === 0) {
      issues.push({ path, message: `${label} must be more than zero.` });
    } else if (opts.integer && !Number.isInteger(value)) {
      issues.push({ path, message: `${label} must be a whole number.` });
    } else if (value > max) {
      issues.push({ path, message: `${label} looks too large — check the figure.` });
    }
  };

  if (input.rooms.length > MAX_ROOMS) issues.push({ path: 'roomCount', message: `Up to ${MAX_ROOMS} rooms can be entered.` });

  const entry = (e: AreaEntry, path: string) => {
    if (e.method === 'area') {
      if (e.areaUnit !== 'sqft' && e.areaUnit !== 'sqm') issues.push({ path: `${path}.areaUnit`, message: `${e.name}: choose sq ft or m².` });
      check(`${path}.area`, e.area, `${e.name} area`, LIMITS.area);
    } else {
      if (e.lengthUnit !== 'ft' && e.lengthUnit !== 'm') issues.push({ path: `${path}.lengthUnit`, message: `${e.name}: choose feet or metres.` });
      check(`${path}.length`, e.length, `${e.name} length`, LIMITS.dimension);
      check(`${path}.width`, e.width, `${e.name} width`, LIMITS.dimension);
    }
  };
  input.rooms.forEach((r, i) => entry(r, `rooms.${i}`));
  entry(input.hall, 'hall');
  entry(input.kitchen, 'kitchen');
  input.otherAreas.forEach((o, i) => entry(o, `otherAreas.${i}`));

  if (!input.tile.enabled && !input.marble.enabled) {
    issues.push({ path: 'flooring', message: 'Select tile, marble or both to price the floor.' });
  }

  if (input.tile.enabled) {
    if (input.marble.enabled) check('tile.area', input.tile.area, 'Tile area', LIMITS.area);
    check('tile.rate', input.tile.rate, 'Tile rate', LIMITS.rate);
    check('tile.labourRate', input.tile.labourRate, 'Tile labour rate', LIMITS.rate);
    check('tile.wastage', input.tile.wastage, 'Tile wastage', LIMITS.pct);
  }
  if (input.marble.enabled) {
    if (input.tile.enabled) check('marble.area', input.marble.area, 'Marble area', LIMITS.area);
    check('marble.rate', input.marble.rate, 'Marble rate', LIMITS.rate);
    check('marble.labourRate', input.marble.labourRate, 'Marble labour rate', LIMITS.rate);
    check('marble.wastage', input.marble.wastage, 'Marble wastage', LIMITS.pct);
    if (input.marble.polishingEnabled) check('marble.polishingRate', input.marble.polishingRate, 'Polishing rate', LIMITS.rate);
  }

  if (input.tile.enabled && input.marble.enabled) {
    const total = calculateTotalFloorArea(measureAreas(input));
    const { excess } = allocateArea(total, input.tile, input.marble);
    if (excess > 0) {
      issues.push({
        path: 'allocation',
        message: `Tile + marble area exceeds the available flooring area by ${formatSqft(excess)} sq ft.`,
      });
    }
  }

  const s = input.staircase;
  if (s.enabled) {
    check('staircase.steps', s.steps, 'Number of steps', LIMITS.steps, { integer: true });
    check('staircase.width', s.width, 'Step width', LIMITS.dimension, { positive: true });
    check('staircase.baseWidth', s.baseWidth, 'Base step width', LIMITS.dimension, { positive: true });
    check('staircase.baseCostPerStep', s.baseCostPerStep, 'Cost per step', LIMITS.rate);
  }
  const r = input.riser;
  if (r.enabled) {
    check('riser.count', r.count, 'Number of risers', LIMITS.steps, { integer: true });
    check('riser.height', r.height, 'Riser height', LIMITS.dimension);
    check('riser.width', r.width, 'Riser width', LIMITS.dimension);
    check('riser.materialRate', r.materialRate, 'Riser marble rate', LIMITS.rate);
    check('riser.labourRate', r.labourRate, 'Riser labour rate', LIMITS.rate);
  }
  const n = input.nosing;
  if (n.enabled) {
    check('nosing.steps', n.steps, 'Steps with nosing', LIMITS.steps, { integer: true });
    check('nosing.lengthPerStep', n.lengthPerStep, 'Nosing length per step', LIMITS.dimension);
    check('nosing.ratePerFt', n.ratePerFt, 'Nosing rate', LIMITS.rate);
  }

  const m = input.materials;
  check('materials.cementRate', m.cementRate, 'Cement rate', LIMITS.rate);
  check('materials.cementPerSqft', m.cementPerSqft, 'Cement consumption', 100);
  check('materials.sandRate', m.sandRate, 'Sand rate', LIMITS.rate);
  check('materials.sandPerSqft', m.sandPerSqft, 'Sand consumption', 100);
  check('materials.whiteCementRate', m.whiteCementRate, 'White cement rate', LIMITS.rate);
  check('materials.whiteCementPerSqft', m.whiteCementPerSqft, 'White cement consumption', 100);

  if (input.adhesive.enabled) {
    check('adhesive.pricePerBag', input.adhesive.pricePerBag, 'Adhesive price', LIMITS.rate);
    check('adhesive.coveragePerBag', input.adhesive.coveragePerBag, 'Adhesive coverage', 100000, { positive: true });
  }
  if (input.grout.enabled) {
    check('grout.ratePerKg', input.grout.ratePerKg, 'Grout rate', LIMITS.rate);
    check('grout.kgPerSqft', input.grout.kgPerSqft, 'Grout consumption', 100);
  }
  const k = input.skirting;
  if (k.enabled) {
    if (k.mode === 'manual') check('skirting.runningLength', k.runningLength, 'Skirting length', LIMITS.area);
    check('skirting.openings', k.openings, 'Door and opening width', LIMITS.area);
    check('skirting.materialRate', k.materialRate, 'Skirting material rate', LIMITS.rate);
    check('skirting.labourRate', k.labourRate, 'Skirting labour rate', LIMITS.rate);
  }

  check('additional.transportation', input.additional.transportation, 'Transportation', LIMITS.amount);
  check('additional.loadingUnloading', input.additional.loadingUnloading, 'Loading / unloading', LIMITS.amount);
  check('additional.other', input.additional.other, 'Other expenses', LIMITS.amount);
  check('contingencyPct', input.contingencyPct, 'Contingency', LIMITS.pct);

  return issues;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Non-finite or negative input never reaches a total. */
function clean(v: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}

/** Whole rupees: each line is rounded so the lines add up to the total shown. */
function rupees(v: number): number {
  return Number.isFinite(v) ? Math.round(v + Number.EPSILON) : 0;
}

/** Rounds a quantity up to the next whole unit, ignoring float dust (35.0000000001 is 35). */
function ceilQty(v: number): number {
  return Math.ceil(Math.round(v * 1e6) / 1e6);
}

function formatSqft(v: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(v);
}
