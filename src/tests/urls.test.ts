import { describe, expect, it } from 'vitest';
import { fromUrlPath, relativeRootFor, splitRoute, toUrlPath } from '@/lib/urls';
import { allRoutes, metaForPath } from '@/lib/pageMeta';
import { ALIASES, CALCULATORS } from '@/data/catalog';

describe('public URLs', () => {
  it('maps calculators to keyword paths and back', () => {
    expect(toUrlPath('/c/home-loan-emi')).toBe('home-loan-emi-calculator/');
    expect(fromUrlPath('home-loan-emi-calculator/')).toBe('/c/home-loan-emi');
    expect(fromUrlPath('home-loan-emi-calculator')).toBe('/c/home-loan-emi');
    expect(fromUrlPath('home-loan-emi-calculator/index.html')).toBe('/c/home-loan-emi');
  });

  it('keeps other routes as folders', () => {
    expect(toUrlPath('/')).toBe('');
    expect(fromUrlPath('')).toBe('/');
    expect(toUrlPath('/category/loans')).toBe('category/loans/');
    expect(fromUrlPath('category/loans/')).toBe('/category/loans');
    expect(toUrlPath('/guides/how-emi-is-calculated')).toBe('guides/how-emi-is-calculated/');
    expect(fromUrlPath('privacy-policy/')).toBe('/privacy-policy');
    // Only a single top-level segment is a calculator.
    expect(fromUrlPath('guides/x-calculator/')).toBe('/guides/x-calculator');
  });

  it('round-trips every indexable route', () => {
    for (const route of allRoutes()) expect(fromUrlPath(toUrlPath(route))).toBe(route);
  });

  it('computes the way back to the site root', () => {
    expect(relativeRootFor('/')).toBe('./');
    expect(relativeRootFor('/c/fd')).toBe('../');
    expect(relativeRootFor('/guides/what-is-sip')).toBe('../../');
  });

  it('splits a route from its query', () => {
    expect(splitRoute('/c/emi?principal=5')).toEqual({ path: '/c/emi', search: 'principal=5' });
    expect(splitRoute('c/emi')).toEqual({ path: '/c/emi', search: '' });
  });
});

describe('page metadata', () => {
  it('gives every route a unique title and description', () => {
    const routes = allRoutes();
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const route of routes) {
      const meta = metaForPath(route);
      expect(meta.notFound, route).toBeFalsy();
      expect(meta.title.length, route).toBeGreaterThan(10);
      expect(meta.description.length, route).toBeGreaterThan(50);
      titles.add(meta.title);
      descriptions.add(meta.description);
    }
    expect(titles.size).toBe(routes.length);
    expect(descriptions.size).toBe(routes.length);
  });

  it('keeps meta descriptions within what search results show', () => {
    for (const route of allRoutes()) {
      expect(metaForPath(route).description.length, route).toBeLessThanOrEqual(200);
    }
  });

  it('marks unknown routes as not found', () => {
    expect(metaForPath('/c/does-not-exist').notFound).toBe(true);
    expect(metaForPath('/nothing-here').notFound).toBe(true);
    expect(metaForPath('/guides/nope').notFound).toBe(true);
  });

  it('never lets an alias shadow a live calculator', () => {
    for (const alias of Object.keys(ALIASES)) {
      expect(CALCULATORS.some((c) => c.id === alias), alias).toBe(false);
    }
  });
});
