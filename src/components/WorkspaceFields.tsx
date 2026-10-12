import { useMemo } from 'react';
import type { Field } from '@/calculators/types';
import { FieldControl } from './FieldControl';

export interface NumProps {
  path: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  type?: 'number' | 'currency' | 'percent';
  unit?: string;
  help?: string;
  error?: string;
  wide?: boolean;
  placeholder?: string;
  /** A range slider under the box, from min to max. */
  slider?: { min: number; max: number; step?: number };
}

/**
 * A numeric field for workspaces that keep their own state. Empty reads
 * as zero, so it shows as a blank box rather than "0".
 */
export function Num({ path, label, value, onChange, type = 'number', unit, help, error, wide, placeholder = '0', slider }: NumProps) {
  const field = useMemo<Field>(
    () => ({
      name: path,
      label,
      type,
      default: 0,
      unit,
      help,
      wide,
      placeholder,
      ...(slider ? { slider: true, min: slider.min, max: slider.max, step: slider.step ?? 1 } : {}),
    }),
    [path, label, type, unit, help, wide, placeholder, slider?.min, slider?.max, slider?.step],
  );
  return (
    <FieldControl
      field={field}
      value={value === 0 ? '' : value}
      error={error}
      onChange={(_, v) => onChange(v === '' ? 0 : typeof v === 'number' ? v : Number(v) || 0)}
    />
  );
}

/** A small segmented switch for a workspace setting. */
export function Seg({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const selected = Math.max(
    0,
    options.findIndex(([v]) => v === value),
  );
  return (
    <div
      className="segmented ws-seg"
      role="group"
      aria-label={label}
      style={{ ['--seg-count' as string]: options.length, ['--seg-index' as string]: selected }}
    >
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}
