import { describe, expect, it } from 'vitest';
import {
  CONSUMPTION,
  calculateAverageCostPerSqFt,
  calculateCementRequirement,
  calculateDoorFinishing,
  calculateExtraExpenses,
  calculateFlooringEstimate,
  calculateGrandTotal,
  calculateGroutRequirement,
  calculateMarbleLabourCost,
  calculateMarbleMaterialCost,
  calculateMarbleQuantity,
  calculateSandRequirement,
  calculateStaircaseLabour,
  calculateTileLabourCost,
  calculateTileMaterialCost,
  calculateTileQuantity,
  calculateTotalLabourCost,
  calculateWhiteCementRequirement,
  calculateWindowFinishing,
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

describe('tile quantity', () => {
  it('adds 5% skirting, then 5% wastage on area + skirting', () => {
    const q = calculateTileQuantity({ area: 660, skirtingPct: 5, wastagePct: 5 });
    expect(q.area).toBe(660);
    expect(q.skirting).toBe(33);
    expect(q.subtotal).toBe(693);
    expect(q.wastage).toBeCloseTo(34.65, 10);
    expect(q.required).toBeCloseTo(727.65, 10);
    expect(q.purchase).toBe(728);
  });

  it('prices material on the required quantity: 727.65 × ₹60 = ₹43,659', () => {
    const q = calculateTileQuantity({ area: 660, skirtingPct: 5, wastagePct: 5 });
    expect(calculateTileMaterialCost(q, 60)).toBe(43659);
  });

  it('prices labour on the area entered, without skirting or wastage', () => {
    expect(calculateTileLabourCost(660, 20)).toBe(13200);
  });
});

describe('marble quantity', () => {
  it('adds 5% skirting, then 7% wastage', () => {
    const q = calculateMarbleQuantity({ area: 300, skirtingPct: 5, wastagePct: 7 });
    expect(q.skirting).toBe(15);
    expect(q.subtotal).toBe(315);
    expect(q.wastage).toBeCloseTo(22.05, 10);
    expect(q.required).toBeCloseTo(337.05, 10);
    expect(q.purchase).toBe(337);
    expect(calculateMarbleMaterialCost(q, 120)).toBe(40446);
  });

  it('charges floor & platform labour on the marble area only', () => {
    expect(calculateMarbleLabourCost(300, 200)).toBe(60000);
  });
});

describe('marble staircase, windows and doors', () => {
  it('scales the base step price by width: 3 ft = ₹1,000 → 12 ft = ₹4,000 a step', () => {
    const s = calculateStaircaseLabour({ steps: 3, width: 12, baseWidth: 3, baseCost: 1000 });
    expect(s.costPerStep).toBe(4000);
    expect(s.total).toBe(12000);
  });

  it('never reads a 12 ft width as 12 steps', () => {
    expect(calculateStaircaseLabour({ steps: 12, width: 3, baseWidth: 3, baseCost: 1000 }).total).toBe(12000);
    expect(calculateStaircaseLabour({ steps: 3, width: 12, baseWidth: 3, baseCost: 1000 }).steps).toBe(3);
  });

  it('is zero without steps and safe with a zero base width', () => {
    expect(calculateStaircaseLabour({ steps: 0, width: 12, baseWidth: 3, baseCost: 1000 }).total).toBe(0);
    expect(calculateStaircaseLabour({ steps: 3, width: 12, baseWidth: 0, baseCost: 1000 }).total).toBe(0);
  });

  it('prices windows and doors per piece', () => {
    expect(calculateWindowFinishing({ count: 3, rate: 1000 }).total).toBe(3000);
    expect(calculateDoorFinishing({ count: 3, rate: 1500 }).total).toBe(4500);
  });
});

describe('supporting materials', () => {
  it('uses the configured consumption and rounds up to what you buy', () => {
    expect(CONSUMPTION.cement.perSqft).toBe(0.02);
    // 960 × 0.02 = 19.2 bags → 20
    expect(calculateCementRequirement(660, 300, 450)).toMatchObject({ area: 960, quantity: 20, cost: 9000 });
    expect(calculateSandRequirement(660, 300, 60)).toMatchObject({ area: 960, quantity: 96, cost: 5760 });
    // White cement on marble, grout on tile.
    expect(calculateWhiteCementRequirement(660, 300, 80)).toMatchObject({ area: 300, quantity: 15, cost: 1200 });
    expect(calculateGroutRequirement(660, 300, 100)).toMatchObject({ area: 660, quantity: 17, cost: 1700 });
  });

  it('does not round a whole quantity up because of float dust', () => {
    // 1000 × 0.02 is 20.000000000000004 in floating point.
    expect(calculateCementRequirement(1000, 0, 450).quantity).toBe(20);
  });

  it('shows the quantity even before a rate is entered', () => {
    expect(calculateSandRequirement(660, 300, 0)).toMatchObject({ quantity: 96, cost: 0 });
  });
});

describe('totals', () => {
  it('adds every kind of labour', () => {
    expect(calculateTotalLabourCost({ tile: 13200, marble: 60000, staircase: 12000, windows: 3000, doors: 4500 }).total).toBe(92700);
  });

  it('works extra expenses on the subtotal: 3% of ₹5,00,000 = ₹15,000', () => {
    expect(calculateExtraExpenses(500000, 3)).toBe(15000);
    expect(calculateGrandTotal(500000, 15000)).toBe(515000);
  });

  it('averages over the areas entered: ₹4,80,000 ÷ 960 sq ft = ₹500', () => {
    expect(calculateAverageCostPerSqFt(480000, 660 + 300)).toBe(500);
    expect(calculateAverageCostPerSqFt(480000, 0)).toBeNull();
  });
});

describe('the acceptance example', () => {
  const r = calculateFlooringEstimate(defaultInput());

  it('prices the tile tab', () => {
    expect(r.tile.quantity.required).toBeCloseTo(727.65, 10);
    expect(r.tile.material).toBe(43659);
    expect(r.tile.labour).toBe(13200);
    expect(r.tile.total).toBe(56859);
  });

  it('prices the marble tab', () => {
    expect(r.marble.quantity.required).toBeCloseTo(337.05, 10);
    expect(r.marble.material).toBe(40446);
    expect(r.marble.labour).toBe(60000);
    expect(r.marble.staircase.total).toBe(12000);
    expect(r.marble.windows.total).toBe(3000);
    expect(r.marble.doors.total).toBe(4500);
    expect(r.marble.total).toBe(40446 + 60000 + 12000 + 3000 + 4500);
  });

  it('combines both tabs into one project total', () => {
    expect(r.material).toEqual({ flooring: 84105, supporting: 17660, total: 101765 });
    expect(r.labour.total).toBe(92700);
    expect(r.subtotal).toBe(194465);
    expect(r.extra).toBe(5834);
    expect(r.grandTotal).toBe(200299);
    expect(r.baseArea).toBe(960);
    expect(r.averagePerSqft).toBeCloseTo(208.645, 3);
    // Material + labour + supporting + extra = grand total, with nothing counted twice.
    expect(r.material.flooring + r.labour.total + r.material.supporting + r.extra).toBe(r.grandTotal);
    expect(r.tile.total + r.marble.total + r.material.supporting + r.extra).toBe(r.grandTotal);
  });

  it('leaves the entered areas unchanged', () => {
    expect(r.tile.quantity.area).toBe(660);
    expect(r.marble.quantity.area).toBe(300);
  });
});

describe('one material only', () => {
  it('prices tile alone when the marble area and extras are zero', () => {
    const r = calculateFlooringEstimate(
      scenario((i) => {
        i.marble.area = 0;
        i.staircase.steps = 0;
        i.windows.count = 0;
        i.doors.count = 0;
      }),
    );
    expect(r.marble.total).toBe(0);
    expect(r.baseArea).toBe(660);
    expect(r.supporting.find((s) => s.key === 'whiteCement')?.quantity).toBe(0);
    expect(validateFlooring(scenario((i) => (i.marble.area = 0)))).toEqual([]);
  });
});

describe('validation', () => {
  it('passes the example', () => {
    expect(validateFlooring(defaultInput())).toEqual([]);
  });

  it('asks for an area on a blank start', () => {
    expect(validateFlooring(blankInput()).map((x) => x.path)).toEqual(['area']);
  });

  it('needs a rate once an area is entered', () => {
    const issues = validateFlooring(scenario((i) => (i.tile.rate = 0)));
    expect(issues).toContainEqual({ path: 'tile.rate', message: 'Enter the tile rate per sq ft.' });
  });

  it('rejects negatives, NaN and Infinity', () => {
    const paths = validateFlooring(
      scenario((i) => {
        i.tile.area = -10;
        i.marble.rate = NaN;
        i.rates.sand = Infinity;
        i.windows.count = -1;
        i.doors.count = -2;
        i.extraPct = -3;
      }),
    ).map((x) => x.path);
    expect(paths).toEqual(expect.arrayContaining(['tile.area', 'marble.rate', 'rates.sand', 'windows.count', 'doors.count', 'extraPct']));
  });

  it('checks the staircase only when there are steps', () => {
    const zeroWidth = validateFlooring(scenario((i) => (i.staircase.width = 0))).map((x) => x.path);
    expect(zeroWidth).toContain('staircase.width');
    expect(validateFlooring(scenario((i) => ((i.staircase.steps = 0), (i.staircase.width = 0))))).toEqual([]);
    expect(validateFlooring(scenario((i) => (i.staircase.steps = 2.5))).map((x) => x.path)).toContain('staircase.steps');
    expect(validateFlooring(scenario((i) => (i.staircase.baseWidth = 0))).map((x) => x.path)).toContain('staircase.baseWidth');
  });

  it('needs a rate for windows and doors that are counted', () => {
    const paths = validateFlooring(scenario((i) => ((i.windows.rate = 0), (i.doors.rate = 0)))).map((x) => x.path);
    expect(paths).toEqual(['windows.rate', 'doors.rate']);
  });

  it('never produces NaN, Infinity or a negative total from bad input', () => {
    const r = calculateFlooringEstimate(
      scenario((i) => {
        i.tile.area = NaN;
        i.marble.rate = Infinity;
        i.staircase.baseWidth = 0;
        i.windows.count = -5;
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
  it('restores well-formed saves and ignores anything else', () => {
    expect(restoreState(null)).toEqual(defaultState());
    expect(restoreState({ input: 'x' })).toEqual(defaultState());
    const saved = defaultState();
    saved.input.tile.area = 800;
    saved.tab = 'marble';
    saved.projectName = 'Sharma residence';
    expect(restoreState(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    const broken = restoreState({ tab: 'roof', input: { tile: { area: 'lots', rate: 75 }, doors: 4 } });
    expect(broken.tab).toBe('tile');
    expect(broken.input.tile.area).toBe(660);
    expect(broken.input.tile.rate).toBe(75);
    expect(broken.input.doors).toEqual(defaultInput().doors);
  });

  it('ignores a save from the old room-by-room calculator', () => {
    const old = { mode: 'advanced', input: { rooms: [{ length: 10 }], hall: {}, tile: { enabled: true, area: 1200, rate: 60 } } };
    const s = restoreState(old);
    expect(s.input.tile).toEqual({ ...defaultInput().tile, area: 1200 });
    expect(s.input.marble).toEqual(defaultInput().marble);
  });
});

describe('report', () => {
  const r = calculateFlooringEstimate(defaultInput());

  it('shows the working behind each figure', () => {
    const blocks = workings(r);
    expect(blocks.find((b) => b.title === 'Tile material')?.steps).toEqual([
      '660 sq ft + 5% skirting (33 sq ft) = 693 sq ft',
      '693 sq ft + 5% wastage (34.65 sq ft) = 727.65 sq ft required',
      '727.65 sq ft × ₹60 = ₹43,659',
    ]);
    expect(blocks.find((b) => b.title === 'Marble staircase labour')?.steps).toEqual([
      '₹1,000 per step at 3 ft',
      '₹1,000 × (12 ÷ 3) = ₹4,000 per step',
      '3 steps × ₹4,000 = ₹12,000',
    ]);
    expect(blocks[blocks.length - 1].total).toBe(200299);
  });

  it('summarises and exports the whole estimate', () => {
    const text = summaryText(r, 'Sharma residence');
    expect(text).toContain('Project: Sharma residence');
    expect(text).toContain('TOTAL PROJECT COST: ₹2,00,299');
    const rows = estimateCsvRows(r, '', '2026-10-05');
    expect(rows.find((x) => x.item === 'Total project cost')?.cost).toBe(200299);
    expect(rows.find((x) => x.item === 'Total tile required')?.quantity).toBe(727.65);
  });

  it('is registered with its own workspace', () => {
    const def = REGISTRY['tile-marble-flooring'];
    expect(def.workspace).toBeDefined();
    expect(def.hero(def.compute({}), {})).toMatchObject({ value: '₹2,00,299' });
  });
});

describe('explanatory text', () => {
  it('quotes the same figures the engine produces', () => {
    const r = calculateFlooringEstimate(defaultInput());
    const content = JSON.stringify(REGISTRY['tile-marble-flooring'].content);
    const inr = (v: number) => `₹${v.toLocaleString('en-IN')}`;
    for (const v of [r.tile.material, r.marble.material, r.tile.labour, r.marble.labour, r.labour.staircase, r.labour.windows + r.labour.doors, r.material.supporting, r.extra, r.subtotal, r.grandTotal, r.labour.total]) {
      expect(content, String(v)).toContain(inr(v));
    }
    expect(content).toContain(`₹${(Math.round((r.averagePerSqft ?? 0) * 100) / 100).toFixed(2)} per sq ft`);
    expect(content).toContain('727.65 sq ft');
    expect(content).toContain('337.05 sq ft');
    const qty = r.supporting.map((s) => s.quantity);
    expect(qty).toEqual([96, 20, 15, 17]);
  });
});
