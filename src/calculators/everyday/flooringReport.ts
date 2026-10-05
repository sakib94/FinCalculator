import type { FlooringResult, Quantity, Requirement, SupportingKey } from '@/engines/flooring';
import { formatINR, formatNumber, formatPercent } from '@/lib/format';

/**
 * Words for the estimate: labels, the step-by-step workings behind each
 * figure, and the plain-text and CSV versions used by copy and export.
 * Pure — the screen and the tests share it.
 */

/** "727.65 sq ft" — up to two decimals, Indian grouping. */
export const sqft = (v: number): string => `${formatNumber(v, 2)} sq ft`;
const money = (v: number): string => formatINR(v);
/** Rates keep their paise when they have any: ₹1,333.33 a step, ₹60 a sq ft. */
export const rate = (v: number): string => formatINR(v, Number.isInteger(Math.round(v * 100) / 100) ? 0 : 2);
const pct = (v: number): string => formatPercent(v, 2);

export const SUPPORTING_META: Record<SupportingKey, { label: string; unit: string; rateUnit: string; appliesTo: string }> = {
  sand: { label: 'Sand', unit: 'CFT', rateUnit: 'CFT', appliesTo: 'tile + marble area' },
  cement: { label: 'Cement', unit: 'bags', rateUnit: 'bag', appliesTo: 'tile + marble area' },
  whiteCement: { label: 'White cement', unit: 'kg', rateUnit: 'kg', appliesTo: 'marble area' },
  grout: { label: 'Grout', unit: 'kg', rateUnit: 'kg', appliesTo: 'tile area' },
};

export const reqQuantity = (r: Requirement): string => `${formatNumber(r.quantity)} ${SUPPORTING_META[r.key].unit}`;

/** Area → + skirting → subtotal → + wastage → total required. */
export function quantityWorking(q: Quantity): string[] {
  return [
    `${sqft(q.area)} + ${pct(q.skirtingPct)} skirting (${sqft(q.skirting)}) = ${sqft(q.subtotal)}`,
    `${sqft(q.subtotal)} + ${pct(q.wastagePct)} wastage (${sqft(q.wastage)}) = ${sqft(q.required)} required`,
  ];
}

export function supportingWorking(r: Requirement): string[] {
  const m = SUPPORTING_META[r.key];
  return [
    `${sqft(r.area)} (${m.appliesTo}) × ${formatNumber(r.perSqft, 3)} ${m.unit} per sq ft = ${formatNumber(r.exact, 2)} ${m.unit}`,
    `Rounded up to ${formatNumber(r.quantity)} ${m.unit} × ${rate(r.rate)} = ${money(r.cost)}`,
  ];
}

export interface WorkingBlock {
  title: string;
  total: number;
  steps: string[];
}

/** Every figure in the estimate with the arithmetic that produced it. */
export function workings(r: FlooringResult): WorkingBlock[] {
  const t = r.tile;
  const m = r.marble;
  const s = m.staircase;
  const blocks: WorkingBlock[] = [
    {
      title: 'Tile material',
      total: t.material,
      steps: [...quantityWorking(t.quantity), `${sqft(t.quantity.required)} × ${rate(t.rate)} = ${money(t.material)}`],
    },
    {
      title: 'Tile labour',
      total: t.labour,
      steps: [`${sqft(t.quantity.area)} × ${rate(t.labourRate)} = ${money(t.labour)}`, 'Labour is paid on the area you entered — not on skirting or wastage.'],
    },
    {
      title: 'Marble material',
      total: m.material,
      steps: [...quantityWorking(m.quantity), `${sqft(m.quantity.required)} × ${rate(m.rate)} = ${money(m.material)}`],
    },
    {
      title: 'Marble floor & platform labour',
      total: m.labour,
      steps: [
        `${sqft(m.quantity.area)} × ${rate(m.labourRate)} = ${money(m.labour)}`,
        'Covers the marble floor and kitchen platform only — the staircase, windows and doors are priced separately.',
      ],
    },
    {
      title: 'Marble staircase labour',
      total: s.total,
      steps:
        s.steps > 0
          ? [
              `${rate(s.baseCost)} per step at ${formatNumber(s.baseWidth, 2)} ft`,
              `${rate(s.baseCost)} × (${formatNumber(s.width, 2)} ÷ ${formatNumber(s.baseWidth, 2)}) = ${rate(s.costPerStep)} per step`,
              `${formatNumber(s.steps)} ${s.steps === 1 ? 'step' : 'steps'} × ${rate(s.costPerStep)} = ${money(s.total)}`,
            ]
          : ['No staircase entered.'],
    },
    {
      title: 'Window finishing',
      total: m.windows.total,
      steps: [`${formatNumber(m.windows.count)} × ${rate(m.windows.rate)} = ${money(m.windows.total)}`],
    },
    {
      title: 'Door finishing',
      total: m.doors.total,
      steps: [`${formatNumber(m.doors.count)} × ${rate(m.doors.rate)} = ${money(m.doors.total)}`],
    },
    ...r.supporting.map((req) => ({ title: SUPPORTING_META[req.key].label, total: req.cost, steps: supportingWorking(req) })),
    {
      title: 'Extra expenses',
      total: r.extra,
      steps: [
        `Subtotal: material ${money(r.material.total)} + labour ${money(r.labour.total)} = ${money(r.subtotal)}`,
        `${money(r.subtotal)} × ${pct(r.extraPct)} = ${money(r.extra)}`,
      ],
    },
    {
      title: 'Total project cost',
      total: r.grandTotal,
      steps: [
        `${money(r.subtotal)} + ${money(r.extra)} = ${money(r.grandTotal)}`,
        ...(r.averagePerSqft != null
          ? [
              `${money(r.grandTotal)} ÷ ${sqft(r.baseArea)} (${formatNumber(t.quantity.area, 2)} tile + ${formatNumber(m.quantity.area, 2)} marble) = ${rate(
                Math.round(r.averagePerSqft * 100) / 100,
              )} per sq ft`,
            ]
          : []),
      ],
    },
  ];
  return blocks;
}

/* ------------------------------------------------------------------ */
/* Copy & export                                                       */
/* ------------------------------------------------------------------ */

export function summaryText(r: FlooringResult, projectName: string): string {
  const t = r.tile;
  const m = r.marble;
  const lines = [
    projectName.trim() ? `Project: ${projectName.trim()}` : '',
    `Tile: ${sqft(t.quantity.area)} entered, ${sqft(t.quantity.required)} required`,
    `Marble: ${sqft(m.quantity.area)} entered, ${sqft(m.quantity.required)} required`,
    '',
    `Tile material: ${money(t.material)}`,
    `Marble material: ${money(m.material)}`,
    `Tile labour: ${money(t.labour)}`,
    `Marble floor & platform labour: ${money(m.labour)}`,
    `Staircase labour: ${money(m.staircase.total)}`,
    `Window finishing: ${money(m.windows.total)}`,
    `Door finishing: ${money(m.doors.total)}`,
    ...r.supporting.map((s) => `${SUPPORTING_META[s.key].label} (${reqQuantity(s)}): ${money(s.cost)}`),
    `Extra expenses (${pct(r.extraPct)}): ${money(r.extra)}`,
    '',
    `Total material: ${money(r.material.total)}`,
    `Total labour: ${money(r.labour.total)}`,
    `TOTAL PROJECT COST: ${money(r.grandTotal)}`,
    r.averagePerSqft != null ? `Average: ${rate(Math.round(r.averagePerSqft * 100) / 100)} per sq ft` : '',
  ];
  return lines
    .filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''))
    .join('\n')
    .trim();
}

export const ESTIMATE_CSV_COLUMNS = [
  { key: 'section', label: 'Section' },
  { key: 'item', label: 'Item' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit', label: 'Unit' },
  { key: 'rate', label: 'Rate (₹)' },
  { key: 'cost', label: 'Cost (₹)' },
];

/** The whole estimate as spreadsheet rows. */
export function estimateCsvRows(r: FlooringResult, projectName: string, date: string) {
  const rows: Record<string, string | number>[] = [];
  const push = (section: string, item: string, quantity: string | number = '', unit = '', rateValue: string | number = '', cost: string | number = '') =>
    rows.push({ section, item, quantity, unit, rate: rateValue, cost });
  const t = r.tile;
  const m = r.marble;
  const r2 = (v: number) => Math.round(v * 100) / 100;

  push('Project', projectName.trim() || 'Tile & marble estimate');
  push('Date', date);
  push('Tile', 'Tile area (entered)', r2(t.quantity.area), 'sq ft');
  push('Tile', `Skirting (${t.quantity.skirtingPct}%)`, r2(t.quantity.skirting), 'sq ft');
  push('Tile', `Wastage (${t.quantity.wastagePct}%)`, r2(t.quantity.wastage), 'sq ft');
  push('Tile', 'Total tile required', r2(t.quantity.required), 'sq ft');
  push('Marble', 'Marble area (entered)', r2(m.quantity.area), 'sq ft');
  push('Marble', `Skirting (${m.quantity.skirtingPct}%)`, r2(m.quantity.skirting), 'sq ft');
  push('Marble', `Wastage (${m.quantity.wastagePct}%)`, r2(m.quantity.wastage), 'sq ft');
  push('Marble', 'Total marble required', r2(m.quantity.required), 'sq ft');
  push('Material', 'Tile material', r2(t.quantity.required), 'sq ft', t.rate, t.material);
  push('Material', 'Marble material', r2(m.quantity.required), 'sq ft', m.rate, m.material);
  push('Labour', 'Tile labour', r2(t.quantity.area), 'sq ft', t.labourRate, t.labour);
  push('Labour', 'Marble floor & platform labour', r2(m.quantity.area), 'sq ft', m.labourRate, m.labour);
  push('Labour', 'Marble staircase labour', m.staircase.steps, 'steps', r2(m.staircase.costPerStep), m.staircase.total);
  push('Labour', 'Window finishing', m.windows.count, 'windows', m.windows.rate, m.windows.total);
  push('Labour', 'Door finishing', m.doors.count, 'doors', m.doors.rate, m.doors.total);
  for (const s of r.supporting) push('Supporting material', SUPPORTING_META[s.key].label, s.quantity, SUPPORTING_META[s.key].unit, s.rate, s.cost);
  push('Total', 'Total material', '', '', '', r.material.total);
  push('Total', 'Total labour', '', '', '', r.labour.total);
  push('Total', 'Subtotal', '', '', '', r.subtotal);
  push('Total', `Extra expenses (${r.extraPct}%)`, '', '', '', r.extra);
  push('Total', 'Total project cost', '', '', '', r.grandTotal);
  if (r.averagePerSqft != null) push('Total', 'Average cost per sq ft', '', '', '', r2(r.averagePerSqft));
  return rows;
}
