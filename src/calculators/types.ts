import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ *
 * The contract every calculator implements.
 *
 *   UI  →  validation  →  engine  →  formatted result  →  charts/tables
 *
 * A calculator module owns: its field spec, a pure compute() delegating to
 * an engine in src/engines, and presentation descriptors. It never touches
 * layout, storage, routing or formatting plumbing — those are shared.
 * ------------------------------------------------------------------ */

export type FieldType = 'currency' | 'percent' | 'number' | 'date' | 'select' | 'segmented';

export type Values = Record<string, number | string>;
export type ValidationErrors = Record<string, string>;

export interface FieldOption {
  label: string;
  value: string;
}

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  default: number | string;
  /** Tooltip text shown next to the label. */
  help?: string;
  /** Unit rendered inside the input (e.g. "yrs", "months"). */
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Show a range slider under the input. */
  slider?: boolean;
  options?: FieldOption[];
  /** Field may be left blank. */
  optional?: boolean;
  /** Conditional display, e.g. regime-specific deductions. */
  visible?: (values: Values) => boolean;
  /** Full-width in the two-column input grid. */
  wide?: boolean;
  /**
   * Render a segmented field as the calculator's headline mode switch —
   * a large centred pill toggle rather than an ordinary labelled field.
   */
  prominent?: boolean;
  /** Groups fields into labelled sections. */
  group?: string;
  placeholder?: string;
}

export interface FieldGroup {
  id: string;
  title: string;
  /** Collapsed by default — used for optional/advanced blocks. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export interface Hero {
  label: string;
  value: string;
  caption?: string;
}

export interface Stat {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative' | 'accent';
  help?: string;
}

export interface SeriesSpec {
  name: string;
  values: number[];
}

export type ChartSpec =
  | {
      kind: 'donut';
      title: string;
      data: { label: string; value: number }[];
      centerLabel?: string;
      format?: (n: number) => string;
    }
  | {
      kind: 'line';
      title: string;
      x: string[];
      series: SeriesSpec[];
      area?: boolean;
      stacked?: boolean;
      xLabel?: string;
      format?: (n: number) => string;
    }
  | {
      kind: 'bar';
      title: string;
      x: string[];
      series: SeriesSpec[];
      stacked?: boolean;
      xLabel?: string;
      format?: (n: number) => string;
    };

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

export interface TableSpec {
  title: string;
  columns: TableColumn[];
  /** Display rows: values already formatted for the screen. */
  rows: Record<string, string>[];
  /** Raw rows for CSV export; falls back to display rows. */
  csvRows?: Record<string, string | number>[];
  csvName?: string;
  footer?: Record<string, string>;
  /** Show only the first N rows until the user expands. */
  previewRows?: number;
  note?: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface Content {
  howItWorks: string[];
  formula?: string;
  example?: string[];
  assumptions?: string[];
  notes?: string[];
  faqs?: FAQ[];
}

export interface CalculatorDef<R = unknown> {
  id: string;
  fields: Field[];
  groups?: FieldGroup[];
  /** Cross-field rules the per-field spec cannot express. */
  validate?: (values: Values) => ValidationErrors;
  /** Pure: same input → same output. All real maths lives in src/engines. */
  compute: (values: Values) => R;
  hero: (result: R, values: Values) => Hero | Hero[];
  stats?: (result: R, values: Values) => Stat[];
  charts?: (result: R, values: Values) => ChartSpec[];
  table?: (result: R, values: Values) => TableSpec | null;
  /** Calculator-specific blocks (comparisons, breakdowns, callouts). */
  extra?: (result: R, values: Values) => ReactNode;
  /** One-line plain-text summary used by copy & share. */
  summary?: (result: R, values: Values) => string;
  content: Content;
}

export const defaults = (fields: Field[]): Values =>
  Object.fromEntries(fields.map((f) => [f.name, f.default]));
