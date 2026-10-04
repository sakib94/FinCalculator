import type { CostKind, FlooringInput, FlooringResult, LineItem, LineKey, MeasuredArea } from '@/engines/flooring';
import { SQM_TO_SQFT, M_TO_FT } from '@/engines/flooring';
import { formatINR, formatNumber, formatPercent } from '@/lib/format';

/**
 * Words for the flooring estimate: line labels, units, the step-by-step
 * workings behind each figure, and the plain-text and CSV versions used by
 * copy and export. Pure — the screen and the tests share it.
 */

export const sqft = (v: number): string => `${formatNumber(v, 2)} sq ft`;
export const ft = (v: number): string => `${formatNumber(v, 2)} ft`;
const money = (v: number): string => formatINR(v);
/** Rates keep their paise: ₹1,333.33 per step is not ₹1,333. */
const rate = (v: number): string => formatINR(v, Number.isInteger(v) ? 0 : 2);

interface LineMeta {
  label: string;
  unit: string;
  rateUnit: string;
}

export const LINE_META: Record<LineKey, LineMeta> = {
  tileMaterial: { label: 'Tile', unit: 'sq ft', rateUnit: 'sq ft' },
  tileLabour: { label: 'Tile labour', unit: 'sq ft', rateUnit: 'sq ft' },
  marbleMaterial: { label: 'Marble', unit: 'sq ft', rateUnit: 'sq ft' },
  marbleLabour: { label: 'Marble labour', unit: 'sq ft', rateUnit: 'sq ft' },
  polishing: { label: 'Marble polishing', unit: 'sq ft', rateUnit: 'sq ft' },
  staircase: { label: 'Marble staircase', unit: 'steps', rateUnit: 'step' },
  riserMaterial: { label: 'Riser marble', unit: 'sq ft', rateUnit: 'sq ft' },
  riserLabour: { label: 'Riser labour', unit: 'sq ft', rateUnit: 'sq ft' },
  nosing: { label: 'Step nosing / edge', unit: 'running ft', rateUnit: 'running ft' },
  cement: { label: 'Cement', unit: 'bags', rateUnit: 'bag' },
  sand: { label: 'Sand', unit: 'CFT', rateUnit: 'CFT' },
  whiteCement: { label: 'White cement', unit: 'kg', rateUnit: 'kg' },
  adhesive: { label: 'Tile adhesive', unit: 'bags', rateUnit: 'bag' },
  grout: { label: 'Grout', unit: 'kg', rateUnit: 'kg' },
  skirtingMaterial: { label: 'Skirting', unit: 'running ft', rateUnit: 'running ft' },
  skirtingLabour: { label: 'Skirting labour', unit: 'running ft', rateUnit: 'running ft' },
  transportation: { label: 'Transportation', unit: '', rateUnit: '' },
  loadingUnloading: { label: 'Loading / unloading', unit: '', rateUnit: '' },
  otherExpenses: { label: 'Other expenses', unit: '', rateUnit: '' },
};

export const KIND_LABEL: Record<CostKind, string> = {
  material: 'Material',
  labour: 'Labour',
  other: 'Other costs',
};

export function lineLabel(l: LineItem, r: FlooringResult, input: FlooringInput): string {
  if (l.key === 'skirtingMaterial' && r.skirting) return `Skirting (${r.skirting.material})`;
  if (l.key === 'otherExpenses' && input.additional.otherNote.trim()) return `Other expenses — ${input.additional.otherNote.trim()}`;
  return LINE_META[l.key].label;
}

/** Quantity cell: "1,260 sq ft", "40 bags", "—" for lump sums. */
export function lineQuantity(l: LineItem): string {
  if (l.quantity == null) return '—';
  const unit = LINE_META[l.key].unit;
  const whole = l.key === 'cement' || l.key === 'adhesive' || l.key === 'staircase';
  return `${formatNumber(l.quantity, whole ? 0 : 2)} ${unit}`;
}

export function lineRate(l: LineItem): string {
  if (l.rate == null) return '—';
  return `${rate(l.rate)} / ${LINE_META[l.key].rateUnit}`;
}

/** "Room 1 · 20 × 20 ft" — how a space was measured. */
export function areaSource(a: MeasuredArea, input: FlooringInput): string {
  const entry = [...input.rooms, input.hall, input.kitchen, ...input.otherAreas].find((e) => e.id === a.id);
  if (!entry) return '';
  if (entry.method === 'area') {
    return entry.areaUnit === 'sqm' ? `${formatNumber(entry.area, 2)} m² entered` : 'Area entered';
  }
  const u = entry.lengthUnit === 'm' ? 'm' : 'ft';
  return `${formatNumber(entry.length, 2)} × ${formatNumber(entry.width, 2)} ${u}`;
}

/**
 * How each figure was reached, one line per step, with the real numbers —
 * so the reader can check the arithmetic against a contractor's quote.
 */
export function workings(key: LineKey, r: FlooringResult, input: FlooringInput): string[] {
  switch (key) {
    case 'tileMaterial':
    case 'marbleMaterial': {
      const s = key === 'tileMaterial' ? r.tile : r.marble;
      if (!s) return [];
      return [
        `${sqft(s.area)} + ${formatPercent(s.wastagePct, 2)} wastage = ${sqft(s.purchaseArea)} to buy`,
        `${sqft(s.purchaseArea)} × ${rate(s.rate)} = ${money(s.materialCost)}`,
      ];
    }
    case 'tileLabour':
    case 'marbleLabour': {
      const s = key === 'tileLabour' ? r.tile : r.marble;
      if (!s) return [];
      return [`${sqft(s.area)} laid × ${rate(s.labourRate)} = ${money(s.labourCost)}`, 'Labour is paid on the area laid, not on the wastage.'];
    }
    case 'polishing':
      return r.marble?.polishingCost != null
        ? [`${sqft(r.marble.area)} × ${rate(input.marble.polishingRate)} = ${money(r.marble.polishingCost)}`]
        : [];
    case 'staircase': {
      const s = r.staircase;
      if (!s) return [];
      const lines = [
        `${rate(s.baseCostPerStep)} per step at ${ft(s.baseWidthFt)} wide`,
        `Actual width ${ft(s.widthFt)}: ${rate(s.baseCostPerStep)} × (${formatNumber(s.widthFt, 2)} ÷ ${formatNumber(s.baseWidthFt, 2)}) = ${rate(s.costPerStep)} per step`,
        `${formatNumber(s.steps)} steps × ${rate(s.costPerStep)} = ${money(s.total)}`,
      ];
      if (input.staircase.widthUnit === 'm') lines.unshift(`${formatNumber(input.staircase.width, 2)} m × ${M_TO_FT} = ${ft(s.widthFt)}`);
      return lines;
    }
    case 'riserMaterial':
    case 'riserLabour': {
      const s = r.riser;
      if (!s) return [];
      const area = `${formatNumber(s.count)} risers × ${ft(s.heightFt)} × ${ft(s.widthFt)} = ${sqft(s.area)}`;
      return key === 'riserMaterial'
        ? [area, `${sqft(s.area)} × ${rate(s.materialRate)} = ${money(s.materialCost)}`]
        : [area, `${sqft(s.area)} × ${rate(s.labourRate)} = ${money(s.labourCost)}`];
    }
    case 'nosing': {
      const s = r.nosing;
      if (!s) return [];
      return [
        `${formatNumber(s.steps)} steps × ${ft(s.lengthPerStepFt)} = ${formatNumber(s.totalLength, 2)} running ft`,
        `${formatNumber(s.totalLength, 2)} running ft × ${rate(s.rate)} = ${money(s.cost)}`,
      ];
    }
    case 'cement': {
      const c = r.cement;
      return [
        `${sqft(c.area)} × ${formatNumber(c.factor, 4)} bag per sq ft = ${formatNumber(c.exact, 2)} bags`,
        `Rounded up to ${formatNumber(c.quantity)} bags × ${rate(c.rate)} = ${money(c.cost)}`,
      ];
    }
    case 'sand': {
      const c = r.sand;
      return [
        `${sqft(c.area)} × ${formatNumber(c.factor, 4)} CFT per sq ft = ${formatNumber(c.quantity, 2)} CFT`,
        `${formatNumber(c.quantity, 2)} CFT × ${rate(c.rate)} = ${money(c.cost)}`,
      ];
    }
    case 'whiteCement': {
      const c = r.whiteCement;
      return [
        `${sqft(c.area)} × ${formatNumber(c.factor, 4)} kg per sq ft = ${formatNumber(c.quantity, 2)} kg`,
        `${formatNumber(c.quantity, 2)} kg × ${rate(c.rate)} = ${money(c.cost)}`,
      ];
    }
    case 'adhesive': {
      const a = r.adhesive;
      if (!a) return [];
      return [
        `${sqft(a.area)} ÷ ${formatNumber(a.coverage, 2)} sq ft per bag = ${formatNumber(a.exactBags, 2)} bags`,
        `Rounded up to ${formatNumber(a.bags)} bags × ${rate(a.pricePerBag)} = ${money(a.cost)}`,
      ];
    }
    case 'grout': {
      const g = r.grout;
      if (!g) return [];
      return [
        `${sqft(g.area)} × ${formatNumber(g.kgPerSqft, 4)} kg per sq ft = ${formatNumber(g.quantity, 2)} kg`,
        `${formatNumber(g.quantity, 2)} kg × ${rate(g.rate)} = ${money(g.cost)}`,
      ];
    }
    case 'skirtingMaterial':
    case 'skirtingLabour': {
      const s = r.skirting;
      if (!s) return [];
      const length =
        s.mode === 'auto'
          ? `Perimeter of the measured rooms ${formatNumber(s.grossFt, 2)} ft − openings ${formatNumber(s.openingsFt, 2)} ft = ${formatNumber(s.netFt, 2)} running ft`
          : `${formatNumber(s.grossFt, 2)} ft − openings ${formatNumber(s.openingsFt, 2)} ft = ${formatNumber(s.netFt, 2)} running ft`;
      return key === 'skirtingMaterial'
        ? [length, `${formatNumber(s.netFt, 2)} running ft × ${rate(s.materialRate)} = ${money(s.materialCost)}`]
        : [length, `${formatNumber(s.netFt, 2)} running ft × ${rate(s.labourRate)} = ${money(s.labourCost)}`];
    }
    case 'transportation':
    case 'loadingUnloading':
    case 'otherExpenses':
      return ['Amount entered'];
  }
}

/** "20 m² = 215.28 sq ft" when a space was entered in metric. */
export const metricNote = (a: MeasuredArea): string | null =>
  a.sqm != null ? `${formatNumber(a.sqm, 2)} m² × ${SQM_TO_SQFT} = ${sqft(a.sqft)}` : null;

/* ------------------------------------------------------------------ */
/* Copy & export                                                       */
/* ------------------------------------------------------------------ */

export function summaryText(r: FlooringResult, input: FlooringInput, projectName: string): string {
  const lines = [
    projectName.trim() ? `Project: ${projectName.trim()}` : '',
    `Total flooring area: ${sqft(r.totalArea)}`,
    r.tile ? `Tile area: ${sqft(r.allocation.tileArea)}` : '',
    r.marble ? `Marble area: ${sqft(r.allocation.marbleArea)}` : '',
    '',
    ...r.lines.map((l) => `${lineLabel(l, r, input)}: ${money(l.cost)}`),
    `Contingency (${formatPercent(r.contingencyPct, 2)}): ${money(r.contingency)}`,
    '',
    `Grand total: ${money(r.grandTotal)}`,
    r.averagePerSqft != null ? `Average cost: ${formatINR(r.averagePerSqft)} per sq ft` : '',
  ];
  return lines.filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n').trim();
}

/** The whole estimate as rows for a spreadsheet. */
export function estimateCsvRows(r: FlooringResult, input: FlooringInput, projectName: string, date: string) {
  const rows: Record<string, string | number>[] = [];
  const push = (section: string, item: string, quantity: string | number, unit: string, rateValue: string | number, cost: string | number) =>
    rows.push({ section, item, quantity, unit, rate: rateValue, cost });

  push('Project', projectName.trim() || 'Flooring estimate', '', '', '', '');
  push('Date', date, '', '', '', '');
  for (const a of r.areas) push('Area', a.name, round2(a.sqft), 'sq ft', '', '');
  push('Area', 'Total flooring area', round2(r.totalArea), 'sq ft', '', '');
  if (r.tile) push('Area', 'Tile area', round2(r.allocation.tileArea), 'sq ft', '', '');
  if (r.marble) push('Area', 'Marble area', round2(r.allocation.marbleArea), 'sq ft', '', '');
  for (const l of r.lines) {
    push(
      KIND_LABEL[l.kind],
      lineLabel(l, r, input),
      l.quantity == null ? '' : round2(l.quantity),
      LINE_META[l.key].unit,
      l.rate == null ? '' : round2(l.rate),
      l.cost,
    );
  }
  push('Total', 'Subtotal', '', '', '', r.subtotal);
  push('Total', `Contingency (${r.contingencyPct}%)`, '', '', '', r.contingency);
  push('Total', 'Grand total', '', '', '', r.grandTotal);
  if (r.averagePerSqft != null) push('Total', 'Average cost per sq ft', '', '', '', round2(r.averagePerSqft));
  return rows;
}

export const ESTIMATE_CSV_COLUMNS = [
  { key: 'section', label: 'Section' },
  { key: 'item', label: 'Item' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit', label: 'Unit' },
  { key: 'rate', label: 'Rate (₹)' },
  { key: 'cost', label: 'Cost (₹)' },
];

const round2 = (v: number) => Math.round(v * 100) / 100;
