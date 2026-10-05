import { describe, expect, it } from 'vitest';
import { evaluate } from '@/lib/arith';

describe('pop-up calculator arithmetic', () => {
  it('adds up room areas with the usual precedence', () => {
    expect(evaluate('12×14 + 10×12')).toBe(288);
    expect(evaluate('12*14+10*12+8*6')).toBe(336);
    expect(evaluate('(20 + 5) × 2')).toBe(50);
    expect(evaluate('100 ÷ 4 − 5')).toBe(20);
    expect(evaluate('1,200 + 300')).toBe(1500);
  });

  it('handles decimals, unary minus and float dust', () => {
    expect(evaluate('12.5 × 16')).toBe(200);
    expect(evaluate('0.1 + 0.2')).toBe(0.3);
    expect(evaluate('-5 + 10')).toBe(5);
    expect(evaluate('2 × (−3)')).toBe(-6);
    expect(evaluate('660')).toBe(660);
  });

  it('returns null for anything that is not a complete sum', () => {
    for (const bad of ['', '12 +', '× 3', '(4 + 5', '4 + 5)', '5 ÷ 0', '1..2', 'abc', 'alert(1)', '2e5', '1/(1-1)']) {
      expect(evaluate(bad), bad).toBeNull();
    }
  });
});
