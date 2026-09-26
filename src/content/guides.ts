import type { Guide, GuideTopic } from './guides/types';
import { LOANS_GUIDES } from './guides/loans';
import { INVESTING_GUIDES } from './guides/investing';
import { TAX_GUIDES } from './guides/tax';
import { BASICS_GUIDES } from './guides/basics';

export type { Guide, GuideTopic } from './guides/types';

/** Every published guide, in the order the guides index lists them. */
export const GUIDES: Guide[] = [...LOANS_GUIDES, ...INVESTING_GUIDES, ...TAX_GUIDES, ...BASICS_GUIDES];

export const GUIDE_TOPICS: GuideTopic[] = ['Loans', 'Investing', 'Savings', 'Tax & Salary', 'Money basics'];

export const guideBySlug = (slug: string): Guide | undefined => GUIDES.find((g) => g.slug === slug);

/** Guides that point readers to this calculator. */
export const guidesForCalculator = (id: string): Guide[] => GUIDES.filter((g) => g.calculators.includes(id));

/** Rough reading time at 220 words a minute. */
export function readingMinutes(g: Guide): number {
  const text = [
    g.description,
    ...g.keyPoints,
    ...g.sections.flatMap((s) => [
      s.heading,
      ...(s.paragraphs ?? []),
      ...(s.bullets ?? []),
      ...(s.after ?? []),
      ...(s.table?.rows.flat() ?? []),
    ]),
    ...(g.faqs ?? []).flatMap((f) => [f.q, f.a]),
  ].join(' ');
  return Math.max(1, Math.round(text.split(/\s+/).length / 220));
}
