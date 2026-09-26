import { describe, expect, it } from 'vitest';
import { GUIDES, GUIDE_TOPICS, guideBySlug, readingMinutes } from '@/content/guides';
import { INFO_PAGES } from '@/content/pages';
import { REGISTRY } from '@/calculators';
import { byId } from '@/data/catalog';

describe('guides', () => {
  it('have unique slugs in a URL-safe form', () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('only point to calculators that exist', () => {
    for (const g of GUIDES) {
      expect(g.calculators.length, g.slug).toBeGreaterThan(0);
      for (const id of g.calculators) expect(byId(id), `${g.slug} → ${id}`).toBeDefined();
    }
  });

  it('are substantial articles', () => {
    for (const g of GUIDES) {
      expect(GUIDE_TOPICS).toContain(g.topic);
      expect(g.sections.length, g.slug).toBeGreaterThanOrEqual(3);
      expect(g.keyPoints.length, g.slug).toBeGreaterThanOrEqual(3);
      expect(readingMinutes(g), g.slug).toBeGreaterThanOrEqual(3);
      expect(g.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const s of g.sections) {
        for (const row of s.table?.rows ?? []) expect(row.length, `${g.slug}: ${s.heading}`).toBe(s.table!.columns.length);
      }
    }
  });
});

describe('calculator content', () => {
  it('links only to guides that exist', () => {
    for (const [id, def] of Object.entries(REGISTRY)) {
      for (const slug of def.content.guides ?? []) expect(guideBySlug(slug), `${id} → ${slug}`).toBeDefined();
    }
  });

  it('keeps table rows the same width as their headers', () => {
    for (const [id, def] of Object.entries(REGISTRY)) {
      for (const s of def.content.sections ?? []) {
        for (const row of s.table?.rows ?? []) expect(row.length, `${id}: ${s.heading}`).toBe(s.table!.columns.length);
      }
    }
  });
});

describe('information pages', () => {
  it('include the pages AdSense reviewers look for', () => {
    const slugs = INFO_PAGES.map((p) => p.slug);
    for (const s of ['about', 'contact', 'privacy-policy', 'terms', 'disclaimer']) expect(slugs).toContain(s);
  });

  it('the privacy policy explains advertising cookies and how to opt out', () => {
    const text = JSON.stringify(INFO_PAGES.find((p) => p.slug === 'privacy-policy'));
    expect(text).toContain('cookies');
    expect(text).toContain('adssettings.google.com');
  });
});
