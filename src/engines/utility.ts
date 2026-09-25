import { safe } from './core';

/* ==================================================================
 * Construction material estimate
 *
 * Indian residential RCC construction is costed from per-square-foot
 * thumb rules that every contractor and quantity surveyor works from.
 * They are estimates for budgeting, not a structural bill of
 * quantities — a real BOQ comes from the structural drawings.
 *
 * Baseline per sq ft of built-up area, standard G+0/G+1 RCC frame:
 *   cement 0.40 bags · sand 1.80 cft · aggregate 1.35 cft
 *   steel 4.00 kg    · bricks 8 nos
 * Quality tiers scale these, because a premium build carries deeper
 * footings, thicker slabs and more steel.
 * ================================================================== */

export type BuildQuality = 'economy' | 'standard' | 'premium';

interface QualityProfile {
  label: string;
  factor: number;
  /** All-in cost per sq ft including labour and finishes, for reference. */
  costPerSqft: number;
}

export const QUALITY_PROFILES: Record<BuildQuality, QualityProfile> = {
  economy: { label: 'Economy', factor: 0.88, costPerSqft: 1500 },
  standard: { label: 'Standard', factor: 1, costPerSqft: 2000 },
  premium: { label: 'Premium', factor: 1.18, costPerSqft: 2800 },
};

/** Per sq ft of built-up area at standard quality. */
const BASE_PER_SQFT = {
  cementBags: 0.4,
  sandCft: 1.8,
  aggregateCft: 1.35,
  steelKg: 4.0,
  bricks: 8,
};

export interface ConstructionInput {
  areaSqft: number;
  floors: number;
  quality: BuildQuality;
  cementRate: number;
  sandRate: number;
  aggregateRate: number;
  steelRate: number;
  brickRate: number;
}

export interface MaterialLine {
  material: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface ConstructionResult {
  totalArea: number;
  quality: QualityProfile;
  cementBags: number;
  sandCft: number;
  aggregateCft: number;
  steelKg: number;
  bricks: number;
  lines: MaterialLine[];
  materialCost: number;
  /** Materials are roughly 60% of an Indian residential build. */
  estimatedTotalCost: number;
  labourAndOther: number;
  costPerSqft: number;
  /** Sand and aggregate are ordered by the brass (100 cft). */
  sandBrass: number;
  aggregateBrass: number;
}

export function calculateConstruction(input: ConstructionInput): ConstructionResult {
  const area = Math.max(0, input.areaSqft) * Math.max(1, Math.round(input.floors));
  const profile = QUALITY_PROFILES[input.quality] ?? QUALITY_PROFILES.standard;
  const f = profile.factor;

  const cementBags = area * BASE_PER_SQFT.cementBags * f;
  const sandCft = area * BASE_PER_SQFT.sandCft * f;
  const aggregateCft = area * BASE_PER_SQFT.aggregateCft * f;
  const steelKg = area * BASE_PER_SQFT.steelKg * f;
  const bricks = area * BASE_PER_SQFT.bricks * f;

  const lines: MaterialLine[] = [
    { material: 'Cement', quantity: cementBags, unit: 'bags (50 kg)', rate: input.cementRate, amount: cementBags * input.cementRate },
    { material: 'Sand', quantity: sandCft, unit: 'cft', rate: input.sandRate, amount: sandCft * input.sandRate },
    { material: 'Aggregate', quantity: aggregateCft, unit: 'cft', rate: input.aggregateRate, amount: aggregateCft * input.aggregateRate },
    { material: 'Steel (TMT)', quantity: steelKg, unit: 'kg', rate: input.steelRate, amount: steelKg * input.steelRate },
    { material: 'Bricks', quantity: bricks, unit: 'nos', rate: input.brickRate, amount: bricks * input.brickRate },
  ];

  const materialCost = lines.reduce((sum, l) => sum + l.amount, 0);
  // Materials are about 60% of the build; labour, finishes and services are the rest.
  const estimatedTotalCost = materialCost / 0.6;

  return {
    totalArea: area,
    quality: profile,
    cementBags: safe(cementBags),
    sandCft: safe(sandCft),
    aggregateCft: safe(aggregateCft),
    steelKg: safe(steelKg),
    bricks: safe(Math.ceil(bricks)),
    lines,
    materialCost: safe(materialCost),
    estimatedTotalCost: safe(estimatedTotalCost),
    labourAndOther: safe(estimatedTotalCost - materialCost),
    costPerSqft: area > 0 ? safe(estimatedTotalCost / area) : 0,
    sandBrass: safe(sandCft / 100),
    aggregateBrass: safe(aggregateCft / 100),
  };
}

/* ==================================================================
 * Electrical load
 *
 * Connected load is the sum of every appliance's rating. Nobody runs
 * everything at once, so the sanctioned connection is sized on the
 * DEMAND — connected load times a diversity factor. Getting this wrong
 * in either direction costs money: too small and the main trips, too
 * large and you pay fixed charges on capacity you never draw.
 * ================================================================== */

export interface Appliance {
  id: string;
  label: string;
  /** Rating of one unit, in watts. */
  watts: number;
  /** Typical hours of use per day. */
  hoursPerDay: number;
}

export const APPLIANCES: Appliance[] = [
  { id: 'lights', label: 'LED lights', watts: 12, hoursPerDay: 6 },
  { id: 'fans', label: 'Ceiling fans', watts: 75, hoursPerDay: 8 },
  { id: 'tv', label: 'Television', watts: 110, hoursPerDay: 5 },
  { id: 'fridge', label: 'Refrigerator', watts: 200, hoursPerDay: 8 },
  { id: 'ac', label: 'Air conditioner (1.5 ton)', watts: 1500, hoursPerDay: 6 },
  { id: 'cooler', label: 'Air cooler', watts: 200, hoursPerDay: 6 },
  { id: 'washing', label: 'Washing machine', watts: 500, hoursPerDay: 1 },
  { id: 'geyser', label: 'Water heater / geyser', watts: 2000, hoursPerDay: 1 },
  { id: 'microwave', label: 'Microwave oven', watts: 1200, hoursPerDay: 0.5 },
  { id: 'computer', label: 'Computer / laptop', watts: 150, hoursPerDay: 6 },
  { id: 'pump', label: 'Water pump (1 HP)', watts: 750, hoursPerDay: 1 },
  { id: 'iron', label: 'Electric iron', watts: 1000, hoursPerDay: 0.5 },
  { id: 'mixer', label: 'Mixer / grinder', watts: 500, hoursPerDay: 0.5 },
];

export const SUPPLY_VOLTAGE = 230;
/** Typical residential simultaneity — not everything runs together. */
export const DIVERSITY_FACTOR = 0.6;
export const POWER_FACTOR = 0.9;

export interface ElectricalInput {
  /** Quantity of each appliance, keyed by its id. */
  quantities: Record<string, number>;
  tariffPerUnit: number;
  fixedMonthlyCharge: number;
  backupHours: number;
}

export interface LoadLine {
  label: string;
  quantity: number;
  wattsEach: number;
  totalWatts: number;
  dailyUnits: number;
  monthlyCost: number;
}

export interface ElectricalResult {
  connectedLoadW: number;
  connectedLoadKw: number;
  demandKw: number;
  /** What to ask the utility to sanction, in kVA. */
  recommendedKva: number;
  currentAmps: number;
  recommendedMcbAmps: number;
  dailyUnits: number;
  monthlyUnits: number;
  annualUnits: number;
  monthlyBill: number;
  annualBill: number;
  /** Inverter sizing for the essential (non-AC, non-geyser) load. */
  essentialLoadW: number;
  inverterVaRequired: number;
  batteryAh: number;
  lines: LoadLine[];
}

/** Standard Indian MCB/isolator ratings, in amps. */
const MCB_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];

/** Heavy loads a home inverter is not expected to carry. */
const NON_ESSENTIAL = new Set(['ac', 'geyser', 'microwave', 'iron', 'washing']);

export function calculateElectricalLoad(input: ElectricalInput): ElectricalResult {
  const lines: LoadLine[] = [];
  let connectedLoadW = 0;
  let dailyUnits = 0;
  let essentialLoadW = 0;

  for (const appliance of APPLIANCES) {
    const qty = Math.max(0, Math.round(input.quantities[appliance.id] ?? 0));
    if (qty === 0) continue;

    const totalWatts = qty * appliance.watts;
    // Watt-hours to units (kWh).
    const units = (totalWatts * appliance.hoursPerDay) / 1000;

    connectedLoadW += totalWatts;
    dailyUnits += units;
    if (!NON_ESSENTIAL.has(appliance.id)) essentialLoadW += totalWatts;

    lines.push({
      label: appliance.label,
      quantity: qty,
      wattsEach: appliance.watts,
      totalWatts,
      dailyUnits: units,
      monthlyCost: units * 30 * Math.max(0, input.tariffPerUnit),
    });
  }

  const demandKw = (connectedLoadW * DIVERSITY_FACTOR) / 1000;
  const recommendedKva = demandKw / POWER_FACTOR;
  const currentAmps = (demandKw * 1000) / (SUPPLY_VOLTAGE * POWER_FACTOR);
  const recommendedMcbAmps =
    MCB_RATINGS.find((r) => r >= currentAmps * 1.25) ?? MCB_RATINGS[MCB_RATINGS.length - 1];

  const monthlyUnits = dailyUnits * 30;
  const monthlyBill = monthlyUnits * Math.max(0, input.tariffPerUnit) + Math.max(0, input.fixedMonthlyCharge);

  // Inverter VA from essential watts at 0.8 power factor; battery from
  // watt-hours needed, at 12 V with 80% usable depth of discharge.
  const inverterVaRequired = essentialLoadW / 0.8;
  const batteryAh = (essentialLoadW * Math.max(0, input.backupHours)) / (12 * 0.8);

  return {
    connectedLoadW: safe(connectedLoadW),
    connectedLoadKw: safe(connectedLoadW / 1000),
    demandKw: safe(demandKw),
    recommendedKva: safe(Math.ceil(recommendedKva * 2) / 2),
    currentAmps: safe(currentAmps),
    recommendedMcbAmps,
    dailyUnits: safe(dailyUnits),
    monthlyUnits: safe(monthlyUnits),
    annualUnits: safe(monthlyUnits * 12),
    monthlyBill: safe(monthlyBill),
    annualBill: safe(monthlyBill * 12),
    essentialLoadW: safe(essentialLoadW),
    inverterVaRequired: safe(inverterVaRequired),
    batteryAh: safe(batteryAh),
    lines,
  };
}

/* ==================================================================
 * Net worth
 *
 * Assets minus liabilities. The number itself matters less than its
 * composition: how much is liquid, how much is tied up in one
 * illiquid asset, and how much of what you "own" the bank still has
 * a claim on.
 * ================================================================== */

export interface NetWorthInput {
  cash: number;
  deposits: number;
  investments: number;
  retirement: number;
  realEstate: number;
  gold: number;
  vehicles: number;
  otherAssets: number;

  homeLoan: number;
  carLoan: number;
  personalLoan: number;
  creditCard: number;
  otherLiabilities: number;

  monthlyIncome: number;
  monthlyExpenses: number;
}

export interface NetWorthLine {
  label: string;
  amount: number;
  sharePct: number;
}

export interface NetWorthResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidAssets: number;
  /** Net worth excluding property, vehicles and other illiquid holdings. */
  liquidNetWorth: number;
  debtToAssetPct: number;
  /** Months of expenses covered by liquid assets. */
  emergencyFundMonths: number;
  realEstateSharePct: number;
  annualSavings: number;
  positive: boolean;
  assetLines: NetWorthLine[];
  liabilityLines: NetWorthLine[];
}

export function calculateNetWorth(input: NetWorthInput): NetWorthResult {
  const n = (v: number) => Math.max(0, v);

  const assets = [
    { label: 'Cash & bank', amount: n(input.cash), liquid: true },
    { label: 'Fixed deposits', amount: n(input.deposits), liquid: true },
    { label: 'Stocks & mutual funds', amount: n(input.investments), liquid: true },
    { label: 'EPF / PPF / NPS', amount: n(input.retirement), liquid: false },
    { label: 'Real estate', amount: n(input.realEstate), liquid: false },
    { label: 'Gold & jewellery', amount: n(input.gold), liquid: false },
    { label: 'Vehicles', amount: n(input.vehicles), liquid: false },
    { label: 'Other assets', amount: n(input.otherAssets), liquid: false },
  ];

  const liabilities = [
    { label: 'Home loan', amount: n(input.homeLoan) },
    { label: 'Car loan', amount: n(input.carLoan) },
    { label: 'Personal loan', amount: n(input.personalLoan) },
    { label: 'Credit card dues', amount: n(input.creditCard) },
    { label: 'Other liabilities', amount: n(input.otherLiabilities) },
  ];

  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;
  const liquidAssets = assets.filter((a) => a.liquid).reduce((s, a) => s + a.amount, 0);

  const monthlyExpenses = n(input.monthlyExpenses);

  return {
    totalAssets: safe(totalAssets),
    totalLiabilities: safe(totalLiabilities),
    netWorth: safe(netWorth),
    liquidAssets: safe(liquidAssets),
    liquidNetWorth: safe(liquidAssets - totalLiabilities),
    debtToAssetPct: totalAssets > 0 ? safe((totalLiabilities / totalAssets) * 100) : 0,
    emergencyFundMonths: monthlyExpenses > 0 ? safe(liquidAssets / monthlyExpenses) : 0,
    realEstateSharePct: totalAssets > 0 ? safe((n(input.realEstate) / totalAssets) * 100) : 0,
    annualSavings: safe((n(input.monthlyIncome) - monthlyExpenses) * 12),
    positive: netWorth >= 0,
    assetLines: assets
      .filter((a) => a.amount > 0)
      .map((a) => ({
        label: a.label,
        amount: a.amount,
        sharePct: totalAssets > 0 ? (a.amount / totalAssets) * 100 : 0,
      })),
    liabilityLines: liabilities
      .filter((l) => l.amount > 0)
      .map((l) => ({
        label: l.label,
        amount: l.amount,
        sharePct: totalLiabilities > 0 ? (l.amount / totalLiabilities) * 100 : 0,
      })),
  };
}
