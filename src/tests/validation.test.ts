import { validateFields, hasErrors, num, str } from '@/lib/validate';
import { formatINR, formatINRCompact, formatPercent, groupIndian, parseNumeric, toIndianWords } from '@/lib/format';
import { REGISTRY, REGISTERED_IDS } from '@/calculators';
import { CALCULATORS, searchCalculators } from '@/data/catalog';
import { defaults, type Field } from '@/calculators/types';

const fields: Field[] = [
  { name: 'salary', label: 'Monthly salary', type: 'currency', default: 50000, min: 0, max: 1000000 },
  { name: 'rate', label: 'Interest rate', type: 'percent', default: 8, min: 1, max: 20 },
  { name: 'when', label: 'Start date', type: 'date', default: '2026-01-01' },
  { name: 'note', label: 'Optional note', type: 'currency', default: 0, min: 0, optional: true },
];

describe('field validation', () => {
  it('accepts valid input', () => {
    expect(hasErrors(validateFields(fields, { salary: 50000, rate: 8, when: '2026-01-01', note: '' }))).toBe(false);
  });

  it('rejects a negative amount with a friendly message', () => {
    const errors = validateFields(fields, { salary: -1, rate: 8, when: '2026-01-01', note: 0 });
    expect(errors.salary).toBe('Monthly salary cannot be negative.');
  });

  it('rejects a value above the maximum', () => {
    const errors = validateFields(fields, { salary: 50000, rate: 99, when: '2026-01-01', note: 0 });
    expect(errors.rate).toContain('cannot be more than');
  });

  it('rejects a value below a non-zero minimum', () => {
    const errors = validateFields(fields, { salary: 50000, rate: 0, when: '2026-01-01', note: 0 });
    expect(errors.rate).toContain('at least');
  });

  it('requires non-optional fields', () => {
    const errors = validateFields(fields, { salary: '', rate: 8, when: '2026-01-01', note: 0 });
    expect(errors.salary).toBe('Please enter a valid monthly salary.');
  });

  it('allows optional fields to be blank', () => {
    const errors = validateFields(fields, { salary: 1, rate: 8, when: '2026-01-01', note: '' });
    expect(errors.note).toBeUndefined();
  });

  it('rejects an invalid date', () => {
    const errors = validateFields(fields, { salary: 1, rate: 8, when: 'banana', note: 0 });
    expect(errors.when).toBe('That date is not valid.');
  });

  it('skips fields that are hidden by a condition', () => {
    const conditional: Field[] = [
      { name: 'mode', label: 'Mode', type: 'segmented', default: 'a', options: [{ label: 'A', value: 'a' }] },
      { name: 'only-b', label: 'Only for B', type: 'currency', default: '', min: 1, visible: (v) => v.mode === 'b' },
    ];
    expect(hasErrors(validateFields(conditional, { mode: 'a', 'only-b': '' }))).toBe(false);
    expect(hasErrors(validateFields(conditional, { mode: 'b', 'only-b': '' }))).toBe(true);
  });

  it('coerces values safely', () => {
    expect(num('1234')).toBe(1234);
    expect(num('abc', 7)).toBe(7);
    expect(num(undefined, 3)).toBe(3);
    expect(str('', 'fallback')).toBe('fallback');
  });
});

describe('Indian number formatting', () => {
  it('groups in lakhs and crores', () => {
    expect(formatINR(500000)).toBe('₹5,00,000');
    expect(formatINR(12345678)).toBe('₹1,23,45,678');
    expect(formatINR(1000)).toBe('₹1,000');
  });

  it('never prints a negative zero', () => {
    expect(formatINR(-0.001)).toBe('₹0');
  });

  it('abbreviates large amounts', () => {
    expect(formatINRCompact(12500000)).toBe('₹1.25 Cr');
    expect(formatINRCompact(850000)).toBe('₹8.50 L');
    expect(formatINRCompact(45000)).toBe('₹45,000');
  });

  it('spells amounts in Indian words', () => {
    expect(toIndianWords(845000)).toBe('8.45 Lakh');
    expect(toIndianWords(25000000)).toBe('2.50 Crore');
  });

  it('formats percentages without trailing zeros', () => {
    expect(formatPercent(8.25)).toBe('8.25%');
    expect(formatPercent(12)).toBe('12%');
  });

  it('groups digits as the user types', () => {
    expect(groupIndian('500000')).toBe('5,00,000');
    expect(groupIndian('')).toBe('');
    expect(groupIndian('12.345')).toBe('12.34');
  });

  it('parses messy numeric input', () => {
    expect(parseNumeric('₹5,00,000')).toBe(500000);
    expect(parseNumeric('')).toBeNull();
    expect(parseNumeric('abc')).toBeNull();
    expect(parseNumeric('-12.5')).toBe(-12.5);
  });

  it('handles non-finite values without crashing', () => {
    expect(formatINR(NaN)).toBe('—');
    expect(formatINR(Infinity)).toBe('—');
  });
});

describe('catalog and registry integrity', () => {
  it('registers a working module for every catalog entry', () => {
    for (const calc of CALCULATORS) {
      expect(REGISTRY[calc.id]).toBeDefined();
    }
  });

  it('has no orphan modules', () => {
    for (const id of REGISTERED_IDS) {
      expect(CALCULATORS.some((c) => c.id === id)).toBe(true);
    }
  });

  it('gives every calculator SEO metadata and a unique id', () => {
    const ids = new Set<string>();
    for (const calc of CALCULATORS) {
      expect(ids.has(calc.id)).toBe(false);
      ids.add(calc.id);
      expect(calc.seoTitle.length).toBeGreaterThan(10);
      expect(calc.seoDescription.length).toBeGreaterThan(40);
      expect(calc.keywords.length).toBeGreaterThan(2);
    }
  });

  it('computes a result from the default inputs of every calculator', () => {
    for (const [id, def] of Object.entries(REGISTRY)) {
      const values = defaults(def.fields);
      const errors = validateFields(
        def.fields.filter((f) => !f.visible || f.visible(values)),
        values,
      );
      expect({ id, errors }).toEqual({ id, errors: {} });

      const result = def.compute(values);
      expect(result).toBeDefined();

      const hero = def.hero(result, values);
      const heroes = Array.isArray(hero) ? hero : [hero];
      for (const h of heroes) {
        expect(h.value).toBeTruthy();
        expect(h.value).not.toContain('NaN');
        expect(h.value).not.toContain('Infinity');
      }

      for (const stat of def.stats?.(result, values) ?? []) {
        expect(stat.value).not.toContain('NaN');
      }

      for (const chart of def.charts?.(result, values) ?? []) {
        if (chart.kind === 'donut') {
          for (const d of chart.data) expect(Number.isFinite(d.value)).toBe(true);
        } else {
          for (const s of chart.series) for (const v of s.values) expect(Number.isFinite(v)).toBe(true);
        }
      }

      const table = def.table?.(result, values) ?? null;
      if (table) {
        expect(table.columns.length).toBeGreaterThan(1);
        for (const row of table.rows) {
          for (const col of table.columns) expect(row[col.key]).toBeDefined();
        }
      }

      expect(def.content.howItWorks.length).toBeGreaterThan(0);
    }
  });

  it('survives zero and blank-ish inputs without throwing', () => {
    for (const [, def] of Object.entries(REGISTRY)) {
      const zeroed = Object.fromEntries(
        def.fields.map((f) => [f.name, typeof f.default === 'number' ? 0 : f.default]),
      );
      expect(() => def.compute(zeroed)).not.toThrow();
    }
  });
});

describe('search', () => {
  it('finds every salary-related calculator', () => {
    const ids = searchCalculators('salary').map((c) => c.id);
    expect(ids).toContain('salary');
    expect(ids).toContain('ctc-in-hand');
    expect(ids).toContain('salary-increment');
    expect(ids).toContain('gratuity');
  });

  it('matches on keywords, not just names', () => {
    expect(searchCalculators('pf').map((c) => c.id)).toContain('epf');
    expect(searchCalculators('loan').map((c) => c.id)).toContain('emi');
    expect(searchCalculators('dob').map((c) => c.id)).toContain('age');
  });

  it('returns nothing for gibberish and for an empty query', () => {
    expect(searchCalculators('zzzzqqq')).toHaveLength(0);
    expect(searchCalculators('  ')).toHaveLength(0);
  });

  it('ranks an exact name match first', () => {
    expect(searchCalculators('gst')[0].id).toBe('gst');
  });
});
