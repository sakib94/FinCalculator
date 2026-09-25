import { HI } from './hi';
import { HI_CALCULATORS } from './hi-calculators';

/**
 * Translation, keyed by the English source string.
 *
 * There is no key catalogue to keep in sync: a component asks for
 * `t('Monthly Investment')` and gets the Hindi if the dictionary has it,
 * or the English back if it does not. That matters for a product where
 * the strings live inside 39 calculator modules — none of them had to
 * change, and a missing translation degrades to readable English rather
 * than to a raw key like `calc.sip.field.monthly`.
 */

export type Lang = 'en' | 'hi';

export interface LangOption {
  id: Lang;
  /** Name in the language itself, which is how language pickers should read. */
  native: string;
  /** Short code for the collapsed button. */
  short: string;
  english: string;
}

export const LANGS: LangOption[] = [
  { id: 'en', native: 'English', short: 'EN', english: 'English' },
  { id: 'hi', native: 'हिंदी', short: 'हिं', english: 'Hindi' },
];

export const DEFAULT_LANG: Lang = 'en';

export const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.id === v);

export type Translate = (en: string) => string;

const DICTIONARIES: Record<Lang, Record<string, string>> = {
  en: {},
  // Split across two files for size only; one lookup at runtime.
  hi: { ...HI, ...HI_CALCULATORS },
};

/** Builds the lookup for one language. English is the identity function. */
export function translator(lang: Lang): Translate {
  if (lang === 'en') return (en) => en;
  const dict = DICTIONARIES[lang];
  return (en) => {
    if (!en) return en;
    const hit = dict[en];
    if (hit) return hit;
    // Labels are sometimes built with a trailing marker, e.g. "Rent paid − 10% of salary".
    // Try the string with common trailing punctuation removed before giving up.
    const trimmed = en.trim();
    return dict[trimmed] ?? en;
  };
}

/** How much of the interface a language currently covers. */
export const coverage = (lang: Lang): number =>
  lang === 'en' ? 1 : Object.keys(DICTIONARIES[lang]).length;
