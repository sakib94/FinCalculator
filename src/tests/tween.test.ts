import { describe, expect, it } from 'vitest';
import { formatFigure, parseFigure } from '@/lib/tween';

describe('gliding figures', () => {
  it('keeps the symbol, Indian grouping and decimals while the number moves', () => {
    const p = parseFigure('₹16,488')!;
    expect(p).toMatchObject({ before: '₹', after: '', value: 16488, decimals: 0, grouped: true });
    expect(formatFigure(p, 123456.7)).toBe('₹1,23,457');
    const pct = parseFigure('13.16%')!;
    expect(formatFigure(pct, 9.5)).toBe('9.50%');
    const rate = parseFigure('₹188.36 / sq ft')!;
    expect(formatFigure(rate, 200)).toBe('₹200.00 / sq ft');
  });

  it('leaves text without a number alone', () => {
    expect(parseFigure('—')).toBeNull();
  });
});
