import type { ContentSection, FAQ } from '@/calculators/types';

export type GuideTopic = 'Loans' | 'Investing' | 'Savings' | 'Tax & Salary' | 'Money basics';

/** A long-form financial guide, published at /guides/<slug>/. */
export interface Guide {
  slug: string;
  /** The H1. */
  title: string;
  seoTitle: string;
  /** Meta description and the blurb on the guides index. */
  description: string;
  topic: GuideTopic;
  /** YYYY-MM-DD — shown on the page and in the Article structured data. */
  updated: string;
  /** Calculator ids to try alongside the guide. */
  calculators: string[];
  /** Three to five one-line takeaways shown at the top. */
  keyPoints: string[];
  sections: ContentSection[];
  faqs?: FAQ[];
}
