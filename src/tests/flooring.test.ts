import { describe, expect, it } from 'vitest';
import {
  CONSUMPTION,
  SKIRTING,
  WASTAGE,
  calculateAverageCostPerSqFt,
  calculateCementRequirement,
  calculateExtraExpenses,
  calculateFlooringEstimate,
  calculateGrandTotal,
  calculateGroutRequirement,
  calculateMarbleLabourCost,
  calculateMarbleMaterialCost,
  calculateMarbleQuantity,
  calculateSandRequirement,
  calculateSkirting,
  calculateTileLabourCost,
  calculateTileMaterialCost,
  calculateTileQuantity,
  calculateTotalLabourCost,
  calculateWhiteCementRequirement,
  validateFlooring,
  type FlooringInput,
} from '@/engines/flooring';
import { blankInput, defaultInput, defaultState, restoreState } from '@/calculators/everyday/flooringModel';
import { estimateCsvRows, summaryText, workings } from '@/calculators/everyday/flooringReport';
import { REGISTRY } from '@/calculators';

/** The default example with a few changes. */
function scenario(change: (i: FlooringInput) => void): FlooringInput {
  const i = defaultInput();
  change(i);
  return i;
}

describe('automatic skirting', () => {
  it('uses 6-inch skirting and 12 × 12 ft rooms', () => {
    expect(SKIRTING).toEqual({ heightFt: 0.5, roomSideFt: 12 });
  });

  it('works the walls, not the floor: a 12 × 12 room needs 48 ft × 0.5 ft = 24 sq ft', () => {
    expect(calculateSkirting(144)).toBe(24);
  });

  it('comes to one-sixth of the area: 660 sq ft → 110 sq ft', () => {
    expect(calculateSkirting(660)).toBe(110);
  });

  it('is left out when the box is unticked', () => {
    const q = calculateTileQuantity({ area: 660, skirting: false });
    expect(q.skirting).toBe(0);
    expect(q.subtotal).toBe(660);
  });
});

describe('tile quantity', () => {
  it('adds skirting, then a fixed 5% wastage on area + skirting', () => {
    expect(WASTAGE.tile).toBe(5);
    const q = calculateTileQuantity({ area: 660, skirting: true });
    expect(q.area).toBe(660);
    expect(q.skirting).toBe(110);
    expect(q.subtotal).toBe(770);
    expect(q.wastage).toBeCloseTo(38.5, 10);
    expect(q.required).toBeCloseTo(808.5, 10);
    expect(q.purchase).toBe(809);
  });

  it('prices material on the required quantity and labour on the area entered', () => {
    const q = calculateTileQuantity({ area: 660, skirting: true });
    expect(calculateTileMaterialCost(q, 60)).toBe(48510);
    expect(calculateTileLabourCost(660, 20)).toBe(13200);
  });
});

describe('marble quantity', () => {
  it('adds both marble areas, skirting only along the floor, then a fixed 7% wastage', () => {
    expect(WASTAGE.marble).toBe(7);
    const q = calculateMarbleQuantity({ floorArea: 250, trimArea: 50, skirting: true });
    expect(q.area).toBe(300);
    expect(q.skirtingBase).toBe(250);
    expect(q.skirting).toBeCloseTo(41.6667, 4);
    expect(q.required).toBeCloseTo(365.5833, 4);
    expect(calculateMarbleMaterialCost(q, 120)).toBe(43870);
  });

  it('has no skirting when it is not wanted', () => {
    const q = calculateMarbleQuantity({ floorArea: 250, trimArea: 50, skirting: false });
    expect(q.skirting).toBe(0);
    expect(q.required).toBeCloseTo(321, 10);
  });

  it('charges each marble section its own labour rate', () => {
    expect(calculateMarbleLabourCost(250, 160)).toBe(40000);
    expect(calculateMarbleLabourCost(50, 180)).toBe(9000);
  });
});

describe('supporting materials', () => {
  it('uses the configured consumption and rounds up to what you buy', () => {
    expect(CONSUMPTION.cement.perSqft).toBe(0.02);
    expect(calculateCementRequirement(660, 300, 450)).toMatchObject({ area: 960, quantity: 20, cost: 9000 });
    expect(calculateSandRequirement(660, 300, 60)).toMatchObject({ area: 960, quantity: 96, cost: 5760 });
    expect(calculateWhiteCementRequirement(660, 300, 80)).toMatchObject({ area: 300, quantity: 15, cost: 1200 });
    expect(calculateGroutRequirement(660, 300, 100)).toMatchObject({ area: 660, quantity: 17, cost: 1700 });
  });

  it('does not round a whole quantity up because of float dust', () => {
    expect(calculateCementRequirement(1000, 0, 450).quantity).toBe(20);
  });
});

describe('totals', () => {
  it('adds every kind of labour', () => {
    expect(calculateTotalLabourCost({ tile: 13200, marbleFloor: 40000, marbleTrim: 9000 }).total).toBe(62200);
  });

  it('works extra expenses on the subtotal: 3% of ₹5,00,000 = ₹15,000', () => {
    expect(calculateExtraExpenses(500000, 3)).toBe(15000);
    expect(calculateGrandTotal(500000, 15000)).toBe(515000);
  });

  it('averages over the areas entered', () => {
    expect(calculateAverageCostPerSqFt(480000, 960)).toBe(500);
    expect(calculateAverageCostPerSqFt(480000, 0)).toBeNull();
  });
});

describe('the example', () => {
  const r = calculateFlooringEstimate(defaultInput());

  it('prices the tile tab', () => {
    expect(r.tile).toMatchObject({ material: 48510, labour: 13200, total: 61710 });
  });

  it('prices the marble tab', () => {
    expect(r.marble).toMatchObject({ material: 43870, floorLabour: 40000, trimLabour: 9000, total: 92870 });
  });

  it('combines both tabs into one project total', () => {
    expect(r.material).toEqual({ flooring: 92380, supporting: 17660, total: 110040 });
    expect(r.labour.total).toBe(62200);
    expect(r.subtotal).toBe(172240);
    expect(r.extra).toBe(5167);
    expect(r.grandTotal).toBe(177407);
    expect(r.baseArea).toBe(960);
    expect(r.averagePerSqft).toBeCloseTo(184.799, 3);
    expect(r.tile.total + r.marble.total + r.material.supporting + r.extra).toBe(r.grandTotal);
  });
});

describe('validation', () => {
  it('passes the example and asks for an area on a blank start', () => {
    expect(validateFlooring(defaultInput())).toEqual([]);
    expect(validateFlooring(blankInput()).map((x) => x.path)).toEqual(['area']);
  });

  it('needs a rate once an area is entered', () => {
    expect(validateFlooring(scenario((i) => (i.tile.rate = 0)))).toContainEqual({ path: 'tile.rate', message: 'Enter the tile rate per sq ft.' });
    expect(validateFlooring(scenario((i) => (i.marble.rate = 0))).map((x) => x.path)).toEqual(['marble.rate']);
    expect(validateFlooring(scenario((i) => ((i.marble.rate = 0), (i.marble.floorArea = 0), (i.marble.trimArea = 0))))).toEqual([]);
  });

  it('rejects negatives, NaN and Infinity', () => {
    const paths = validateFlooring(
      scenario((i) => {
        i.tile.area = -10;
        i.marble.trimArea = NaN;
        i.marble.floorLabourRate = -1;
        i.rates.sand = Infinity;
        i.extraPct = -3;
      }),
    ).map((x) => x.path);
    expect(paths).toEqual(expect.arrayContaining(['tile.area', 'marble.trimArea', 'marble.floorLabourRate', 'rates.sand', 'extraPct']));
  });

  it('never produces NaN, Infinity or a negative total from bad input', () => {
    const r = calculateFlooringEstimate(
      scenario((i) => {
        i.tile.area = NaN;
        i.marble.rate = Infinity;
        i.marble.trimArea = -5;
        i.extraPct = -10;
      }),
    );
    for (const v of [r.tile.total, r.marble.total, r.material.total, r.labour.total, r.extra, r.grandTotal]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('saved state', () => {
  it('restores well-formed saves, including the skirting boxes', () => {
    expect(restoreState(null)).toEqual(defaultState());
    const saved = defaultState();
    saved.input.tile.area = 800;
    saved.input.marble.skirting = false;
    saved.tab = 'marble';
    expect(restoreState(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it('ignores malformed fields', () => {
    const s = restoreState({ tab: 'roof', input: { tile: { area: 'lots', rate: 75, skirting: 'yes' } } });
    expect(s.tab).toBe('tile');
    expect(s.input.tile).toEqual({ ...defaultInput().tile, rate: 75 });
  });
});

describe('report', () => {
  const r = calculateFlooringEstimate(defaultInput());

  it('shows the working behind each figure', () => {
    expect(workings(r).find((b) => b.title === 'Tile material')?.steps).toEqual([
      'Skirting: 660 sq ft × 4 × 0.5 ft ÷ 12 ft = 110 sq ft (6-inch skirting; walls estimated from 12 × 12 ft rooms)',
      '660 sq ft + 110 sq ft skirting = 770 sq ft',
      '770 sq ft + 5% wastage (38.5 sq ft) = 808.5 sq ft required',
      '808.5 sq ft × ₹60 = ₹48,510',
    ]);
    const all = workings(r);
    expect(all[all.length - 1].total).toBe(177407);
  });

  it('summarises and exports the whole estimate', () => {
    expect(summaryText(r, 'Sharma residence')).toContain('TOTAL PROJECT COST: ₹1,77,407');
    const rows = estimateCsvRows(r, '', '2026-10-05');
    expect(rows.find((x) => x.item === 'Total project cost')?.cost).toBe(177407);
    expect(rows.find((x) => x.item === 'Total tile required')?.quantity).toBe(808.5);
  });

  it('is registered with its own workspace', () => {
    const def = REGISTRY['tile-marble-flooring'];
    expect(def.workspace).toBeDefined();
    expect(def.hero(def.compute({}), {})).toMatchObject({ value: '₹1,77,407' });
  });
});

describe('explanatory text', () => {
  it('quotes the same figures the engine produces', () => {
    const r = calculateFlooringEstimate(defaultInput());
    const content = JSON.stringify(REGISTRY['tile-marble-flooring'].content);
    const inr = (v: number) => `₹${v.toLocaleString('en-IN')}`;
    for (const v of [r.tile.material, r.marble.material, r.tile.labour, r.marble.floorLabour, r.marble.trimLabour, r.material.supporting, r.extra, r.subtotal, r.grandTotal, r.labour.total]) {
      expect(content, String(v)).toContain(inr(v));
    }
    expect(content).toContain(`₹${(Math.round((r.averagePerSqft ?? 0) * 100) / 100).toFixed(2)} per sq ft`);
    expect(content).toContain('808.5 sq ft');
    expect(r.supporting.map((s) => s.quantity)).toEqual([96, 20, 15, 17]);
  });
});
