import { describe, expect, it } from 'vitest';
import {
  allocateArea,
  calculateAdhesiveCost,
  calculateAverageCostPerSqFt,
  calculateCementRequirement,
  calculateFlooringEstimate,
  calculateGroutCost,
  calculateMarbleLabourCost,
  calculateMarbleMaterialCost,
  calculateMarblePurchaseArea,
  calculateNosingCost,
  calculateRiserCost,
  calculateRoomArea,
  calculateSkirtingCost,
  calculateStaircaseCost,
  calculateTileLabourCost,
  calculateTileMaterialCost,
  calculateTilePurchaseArea,
  measureAreas,
  validateFlooring,
  type AreaEntry,
  type FlooringInput,
} from '@/engines/flooring';
import { blankInput, defaultInput, defaultState, newOtherArea, resizeRooms, restoreState } from '@/calculators/everyday/flooringModel';
import { estimateCsvRows, summaryText, workings } from '@/calculators/everyday/flooringReport';
import { REGISTRY } from '@/calculators';

const ft = (id: string, length: number, width: number): AreaEntry => ({
  id,
  name: id,
  method: 'dimensions',
  length,
  width,
  lengthUnit: 'ft',
  area: 0,
  areaUnit: 'sqft',
});

/** The default example with a few changes. */
function scenario(change: (i: FlooringInput) => void): FlooringInput {
  const i = defaultInput();
  change(i);
  return i;
}

describe('flooring areas', () => {
  it('works length × width in feet', () => {
    expect(calculateRoomArea(ft('r', 20, 20))).toEqual({ sqft: 400, sqm: null, perimeterFt: 80 });
  });

  it('works metres in m² first, then converts with 10.7639', () => {
    const a = calculateRoomArea({ ...ft('r', 5, 4), lengthUnit: 'm' });
    expect(a.sqm).toBe(20);
    expect(a.sqft).toBeCloseTo(215.278, 3);
    expect(a.perimeterFt).toBeCloseTo(18 * 3.28084, 6);
  });

  it('takes a direct area in sq ft or m²', () => {
    expect(calculateRoomArea({ ...ft('r', 0, 0), method: 'area', area: 350 }).sqft).toBe(350);
    const m = calculateRoomArea({ ...ft('r', 0, 0), method: 'area', area: 20, areaUnit: 'sqm' });
    expect(m.sqft).toBeCloseTo(215.278, 3);
    expect(m.perimeterFt).toBeNull();
  });

  it('adds rooms, hall, kitchen and other areas — 2,000 sq ft in the example', () => {
    const areas = measureAreas(defaultInput());
    expect(areas.map((a) => [a.name, a.sqft])).toEqual([
      ['Room 1', 400],
      ['Room 2', 350],
      ['Room 3', 300],
      ['Hall', 600],
      ['Kitchen', 200],
      ['Dining', 150],
    ]);
    expect(calculateFlooringEstimate(defaultInput()).totalArea).toBe(2000);
  });
});

describe('area allocation', () => {
  it('gives the whole floor to a single material', () => {
    expect(allocateArea(2000, { enabled: true, area: 5 }, { enabled: false, area: 9 })).toMatchObject({ tileArea: 2000, marbleArea: 0, remaining: 0 });
    expect(allocateArea(2000, { enabled: false, area: 5 }, { enabled: true, area: 9 })).toMatchObject({ tileArea: 0, marbleArea: 2000, remaining: 0 });
  });

  it('uses the entered split when both are chosen', () => {
    expect(allocateArea(2000, { enabled: true, area: 1200 }, { enabled: true, area: 800 })).toEqual({
      tileArea: 1200,
      marbleArea: 800,
      remaining: 0,
      excess: 0,
    });
    expect(allocateArea(2000, { enabled: true, area: 1000 }, { enabled: true, area: 600 }).remaining).toBe(400);
  });

  it('reports by how much tile + marble overshoot the floor', () => {
    expect(allocateArea(2000, { enabled: true, area: 1500 }, { enabled: true, area: 800 }).excess).toBe(300);
    const issues = validateFlooring(scenario((i) => (i.tile.area = 1500)));
    expect(issues).toContainEqual({
      path: 'allocation',
      message: 'Tile + marble area exceeds the available flooring area by 300 sq ft.',
    });
  });
});

describe('tile and marble costs', () => {
  it('adds wastage to the material but never to labour', () => {
    const purchase = calculateTilePurchaseArea(1200, 5);
    expect(purchase).toBe(1260);
    expect(calculateTileMaterialCost(purchase, 60)).toBe(75600);
    expect(calculateTileLabourCost(1200, 40)).toBe(48000);

    const marble = calculateMarblePurchaseArea(800, 7);
    expect(marble).toBe(856);
    expect(calculateMarbleMaterialCost(marble, 120)).toBe(102720);
    expect(calculateMarbleLabourCost(800, 65)).toBe(52000);
  });

  it('prices tile only, marble only, and both', () => {
    const tileOnly = calculateFlooringEstimate(scenario((i) => (i.marble.enabled = false)));
    expect(tileOnly.allocation.tileArea).toBe(2000);
    expect(tileOnly.tile?.materialCost).toBe(2100 * 60);
    expect(tileOnly.marble).toBeNull();
    expect(tileOnly.lines.some((l) => l.key.startsWith('marble'))).toBe(false);

    const marbleOnly = calculateFlooringEstimate(scenario((i) => (i.tile.enabled = false)));
    expect(marbleOnly.allocation.marbleArea).toBe(2000);
    expect(marbleOnly.marble?.materialCost).toBe(2140 * 120);
    expect(marbleOnly.marble?.labourCost).toBe(2000 * 65);
    expect(marbleOnly.tile).toBeNull();

    const both = calculateFlooringEstimate(defaultInput());
    expect(both.tile?.materialCost).toBe(75600);
    expect(both.marble?.materialCost).toBe(102720);
  });

  it('splits material from the wastage allowance for the comparison', () => {
    const r = calculateFlooringEstimate(defaultInput());
    expect(r.comparison.tile).toMatchObject({ material: 72000, wastage: 3600, labour: 48000 });
    expect(r.comparison.marble).toMatchObject({ material: 96000, wastage: 6720, labour: 52000, stairs: 20000 });
  });

  it('polishes the marble area without wastage', () => {
    const r = calculateFlooringEstimate(scenario((i) => (i.marble.polishingEnabled = true)));
    expect(r.marble?.polishingCost).toBe(800 * 30);
    expect(r.lines.find((l) => l.key === 'polishing')?.kind).toBe('labour');
  });
});

describe('marble staircase', () => {
  it('scales the base step price by width — a 12 ft staircase is 12 ft wide, not 12 steps', () => {
    const s = calculateStaircaseCost({ steps: 20, width: 12, widthUnit: 'ft', baseWidth: 3, baseWidthUnit: 'ft', baseCostPerStep: 1000 });
    expect(s.costPerStep).toBe(4000);
    expect(s.total).toBe(80000);
  });

  it('matches the 6 ft example: ₹2,000 a step, ₹40,000 for 20', () => {
    const s = calculateStaircaseCost({ steps: 20, width: 6, widthUnit: 'ft', baseWidth: 3, baseWidthUnit: 'ft', baseCostPerStep: 1000 });
    expect(s.costPerStep).toBe(2000);
    expect(s.total).toBe(40000);
  });

  it('converts a width in metres to feet', () => {
    const s = calculateStaircaseCost({ steps: 10, width: 1, widthUnit: 'm', baseWidth: 3, baseWidthUnit: 'ft', baseCostPerStep: 1000 });
    expect(s.widthFt).toBeCloseTo(3.28084, 6);
    expect(s.costPerStep).toBeCloseTo(1093.613, 3);
    expect(s.total).toBe(10936);
  });

  it('is kept out of the floor area and the average', () => {
    const r = calculateFlooringEstimate(scenario((i) => (i.staircase.steps = 40)));
    expect(r.totalArea).toBe(2000);
    expect(r.averagePerSqft).toBeCloseTo(r.grandTotal / 2000, 6);
  });

  it('prices risers by area and nosing by running foot', () => {
    const riser = calculateRiserCost({ count: 20, height: 6, heightUnit: 'in', width: 3, widthUnit: 'ft', materialRate: 120, labourRate: 65 });
    expect(riser.area).toBe(30);
    expect(riser.materialCost).toBe(3600);
    expect(riser.labourCost).toBe(1950);

    const nosing = calculateNosingCost({ steps: 20, lengthPerStep: 3, lengthUnit: 'ft', ratePerFt: 40 });
    expect(nosing.totalLength).toBe(60);
    expect(nosing.cost).toBe(2400);
  });

  it('rejects a zero width and a fractional step count', () => {
    const paths = validateFlooring(
      scenario((i) => {
        i.staircase.width = 0;
        i.staircase.baseWidth = 0;
        i.staircase.steps = 2.5;
      }),
    ).map((x) => x.path);
    expect(paths).toEqual(expect.arrayContaining(['staircase.width', 'staircase.baseWidth', 'staircase.steps']));
  });
});

describe('setting materials', () => {
  it('rounds cement up to whole bags without float dust', () => {
    // 2000 × 0.0175 is 35.000000000000004 in floating point.
    const c = calculateCementRequirement(2000, 0.0175, 450);
    expect(c.quantity).toBe(35);
    expect(c.cost).toBe(15750);
    expect(calculateCementRequirement(2010, 0.0175, 450).quantity).toBe(36);
  });

  it('rounds adhesive up to the next bag', () => {
    expect(calculateAdhesiveCost(1200, 40, 500)).toMatchObject({ bags: 30, cost: 15000 });
    expect(calculateAdhesiveCost(1210, 40, 500)).toMatchObject({ bags: 31, cost: 15500 });
    expect(calculateAdhesiveCost(1200, 0, 500).bags).toBe(0);
  });

  it('applies grout to the chosen area and splits it by area', () => {
    const g = calculateGroutCost(1200, 800, 'all', 0.025, 100);
    expect(g.quantity).toBe(50);
    expect(g.cost).toBe(5000);
    expect(g.tileCost).toBe(3000);
    expect(g.marbleCost).toBe(2000);
    expect(calculateGroutCost(1200, 800, 'tile', 0.025, 100).cost).toBe(3000);
  });

  it('estimates the example’s cement, sand and white cement', () => {
    const r = calculateFlooringEstimate(defaultInput());
    expect(r.cement).toMatchObject({ area: 2000, quantity: 40, cost: 18000 });
    expect(r.sand).toMatchObject({ quantity: 200, cost: 12000 });
    expect(r.whiteCement).toMatchObject({ quantity: 60, cost: 4800 });
  });

  it('can limit a material to tile or marble area', () => {
    const r = calculateFlooringEstimate(scenario((i) => (i.materials.whiteCementAppliesTo = 'marble')));
    expect(r.whiteCement.area).toBe(800);
  });
});

describe('skirting', () => {
  it('sums the perimeters of measured rooms and takes off openings', () => {
    const input = scenario((i) => {
      i.otherAreas.push({ ...ft('Store', 0, 0), method: 'area', area: 40 });
    });
    const s = calculateSkirtingCost({ ...input.skirting, mode: 'auto', openings: 18, materialRate: 40, labourRate: 15 }, measureAreas(input));
    // 80 + 78 + 70 + 98 + 57 + 50
    expect(s.grossFt).toBe(433);
    expect(s.netFt).toBe(415);
    expect(s.unmeasured).toEqual(['Store']);
    expect(s.materialCost).toBe(16600);
    expect(s.labourCost).toBe(6225);
  });

  it('takes a manual running length', () => {
    const s = calculateSkirtingCost({ ...defaultInput().skirting, mode: 'manual', runningLength: 100, runningUnit: 'm', openings: 0 }, []);
    expect(s.netFt).toBeCloseTo(328.084, 3);
  });
});

describe('the complete estimate', () => {
  it('matches the worked example by hand', () => {
    const r = calculateFlooringEstimate(defaultInput());
    // 75,600 + 48,000 + 1,02,720 + 52,000 + 20,000 + 18,000 + 12,000 + 4,800
    expect(r.subtotal).toBe(333120);
    expect(r.contingency).toBe(16656);
    expect(r.grandTotal).toBe(349776);
    expect(r.averagePerSqft).toBeCloseTo(174.888, 3);
    expect(r.byKind).toEqual({ material: 213120, labour: 100000, other: 20000 });
    expect(r.comparison.tile.total + r.comparison.marble.total + r.comparison.shared).toBe(r.subtotal);
  });

  it('adds every optional item when switched on', () => {
    const input = scenario((i) => {
      i.marble.polishingEnabled = true; // 24,000
      i.riser.enabled = true; // 3,600 + 1,950
      i.nosing.enabled = true; // 2,400
      i.adhesive.enabled = true; // 30 bags = 15,000
      i.grout.enabled = true; // 1200 × 0.025 = 30 kg = 3,000
      i.skirting.enabled = true;
      i.skirting.mode = 'manual';
      i.skirting.runningLength = 400; // 16,000 + 6,000
      i.additional.transportation = 8000;
      i.additional.loadingUnloading = 2000;
      i.additional.other = 1500;
      i.contingencyPct = 10;
    });
    const r = calculateFlooringEstimate(input);
    const expected = 333120 + 24000 + 3600 + 1950 + 2400 + 15000 + 3000 + 16000 + 6000 + 8000 + 2000 + 1500;
    expect(r.subtotal).toBe(expected);
    expect(r.contingency).toBe(Math.round(expected * 0.1));
    expect(r.grandTotal).toBe(expected + Math.round(expected * 0.1));
    expect(r.lines.reduce((s, l) => s + l.cost, 0)).toBe(r.subtotal);
    expect(r.comparison.tile.total + r.comparison.marble.total + r.comparison.shared).toBe(r.subtotal);
  });

  it('shows only the items in use', () => {
    const keys = calculateFlooringEstimate(defaultInput()).lines.map((l) => l.key);
    expect(keys).toEqual(['tileMaterial', 'tileLabour', 'marbleMaterial', 'marbleLabour', 'staircase', 'cement', 'sand', 'whiteCement']);
  });

  it('treats empty optional fields as zero', () => {
    const r = calculateFlooringEstimate(
      scenario((i) => {
        i.materials.cementRate = 0;
        i.contingencyPct = 0;
        i.additional.transportation = 0;
      }),
    );
    expect(r.cement.cost).toBe(0);
    expect(r.contingency).toBe(0);
    expect(r.lines.some((l) => l.key === 'transportation')).toBe(false);
  });

  it('never produces NaN from bad input', () => {
    const r = calculateFlooringEstimate(
      scenario((i) => {
        i.rooms[0].length = NaN;
        i.tile.rate = Infinity;
        i.marble.labourRate = -50;
        i.staircase.baseWidth = 0;
      }),
    );
    for (const l of r.lines) expect(Number.isFinite(l.cost)).toBe(true);
    expect(Number.isFinite(r.grandTotal)).toBe(true);
  });

  it('has no average for an empty floor', () => {
    expect(calculateAverageCostPerSqFt(5000, 0)).toBeNull();
    expect(calculateFlooringEstimate(blankInput()).averagePerSqft).toBeNull();
  });
});

describe('flooring validation', () => {
  it('passes the example and a blank start', () => {
    expect(validateFlooring(defaultInput())).toEqual([]);
    expect(validateFlooring(blankInput())).toEqual([]);
  });

  it('needs tile, marble or both', () => {
    const issues = validateFlooring(
      scenario((i) => {
        i.tile.enabled = false;
        i.marble.enabled = false;
      }),
    );
    expect(issues.map((x) => x.path)).toContain('flooring');
  });

  it('rejects negatives, NaN and Infinity', () => {
    const paths = validateFlooring(
      scenario((i) => {
        i.rooms[1].width = -3;
        i.hall.length = NaN;
        i.tile.rate = Infinity;
        i.contingencyPct = -1;
      }),
    ).map((x) => x.path);
    expect(paths).toEqual(expect.arrayContaining(['rooms.1.width', 'hall.length', 'tile.rate', 'contingencyPct']));
  });

  it('checks optional sections only when they are switched on', () => {
    const off = scenario((i) => (i.adhesive.coveragePerBag = 0));
    expect(validateFlooring(off)).toEqual([]);
    off.adhesive.enabled = true;
    expect(validateFlooring(off).map((x) => x.path)).toContain('adhesive.coveragePerBag');
  });
});

describe('flooring inputs', () => {
  it('grows and shrinks the room list without losing what was typed', () => {
    const rooms = defaultInput().rooms;
    const five = resizeRooms(rooms, 5);
    expect(five.map((r) => r.name)).toEqual(['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5']);
    expect(five[0]).toBe(rooms[0]);
    expect(new Set(five.map((r) => r.id)).size).toBe(5);
    expect(resizeRooms(five, 2)).toEqual(rooms.slice(0, 2));
    expect(resizeRooms(rooms, 99)).toHaveLength(20);
    expect(resizeRooms(rooms, -1)).toHaveLength(0);
  });

  it('names new areas from the usual list', () => {
    const first = newOtherArea(defaultInput().otherAreas);
    expect(first.name).toBe('Lobby');
    expect(first.id).not.toBe('other-1');
  });

  it('restores saved inputs and ignores anything malformed', () => {
    expect(restoreState(null)).toEqual(defaultState());
    expect(restoreState({ input: 'x' })).toEqual(defaultState());
    const saved = defaultState();
    saved.input.tile.rate = 75;
    saved.input.skirting.mode = 'manual';
    saved.mode = 'advanced';
    expect(restoreState(JSON.parse(JSON.stringify(saved)))).toEqual(saved);

    const broken = restoreState({
      mode: 'expert',
      input: { tile: { rate: 'sixty', enabled: 'yes' }, skirting: { mode: 'magic' }, rooms: [{ length: 10 }, 7] },
    });
    expect(broken.mode).toBe('basic');
    expect(broken.input.tile.rate).toBe(60);
    expect(broken.input.tile.enabled).toBe(true);
    expect(broken.input.skirting.mode).toBe('auto');
    expect(broken.input.rooms).toHaveLength(2);
    expect(broken.input.rooms[0].length).toBe(10);
  });
});

describe('flooring report', () => {
  it('shows the working behind each figure', () => {
    const input = defaultInput();
    const r = calculateFlooringEstimate(input);
    expect(workings('tileMaterial', r, input)).toEqual(['1,200 sq ft + 5% wastage = 1,260 sq ft to buy', '1,260 sq ft × ₹60 = ₹75,600']);
    const wide = scenario((i) => (i.staircase.width = 6));
    expect(workings('staircase', calculateFlooringEstimate(wide), wide)).toEqual([
      '₹1,000 per step at 3 ft wide',
      'Actual width 6 ft: ₹1,000 × (6 ÷ 3) = ₹2,000 per step',
      '20 steps × ₹2,000 = ₹40,000',
    ]);
  });

  it('summarises and exports the whole estimate', () => {
    const input = defaultInput();
    const r = calculateFlooringEstimate(input);
    const text = summaryText(r, input, 'Sharma residence');
    expect(text).toContain('Project: Sharma residence');
    expect(text).toContain('Grand total: ₹3,49,776');
    const rows = estimateCsvRows(r, input, '', '2026-10-04');
    expect(rows.find((x) => x.item === 'Grand total')?.cost).toBe(349776);
    expect(rows.filter((x) => x.section === 'Area')).toHaveLength(9);
  });

  it('is registered with a working default result', () => {
    const def = REGISTRY['tile-marble-flooring'];
    expect(def).toBeDefined();
    expect(def.workspace).toBeDefined();
  });
});
