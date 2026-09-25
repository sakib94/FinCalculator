import { useEffect, useId, useRef, useState } from 'react';
import type { Field, Values } from '@/calculators/types';
import { groupIndian, parseNumeric, toIndianWords } from '@/lib/format';
import { sliderScale } from '@/lib/slider';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';
import { useT } from '@/hooks/PreferencesContext';

interface Props {
  field: Field;
  value: Values[string];
  error?: string;
  onChange: (name: string, value: number | string) => void;
}

/**
 * One field spec → one accessible control.
 * Currency inputs group digits the Indian way as the user types while the
 * value handed to the engine stays a plain number.
 */
export function FieldControl({ field, value, error, onChange }: Props) {
  const t = useT();
  const id = useId();
  const errorId = `${id}-err`;
  const hintId = `${id}-hint`;
  const isNumeric = field.type === 'currency' || field.type === 'percent' || field.type === 'number';

  const [text, setText] = useState<string>(() => initialText(field, value));
  const focused = useRef(false);

  // Keep the text in sync when the value changes elsewhere (reset, slider…).
  useEffect(() => {
    if (!focused.current) setText(initialText(field, value));
  }, [value, field]);

  const label = (
    <label className="field-label" htmlFor={id}>
      {t(field.label)}
      {field.help && <Tooltip text={t(field.help)} />}
    </label>
  );

  if (field.type === 'segmented') {
    const options = field.options ?? [];
    // Drives the sliding indicator in CSS — no measurement, no layout read.
    const selected = Math.max(
      0,
      options.findIndex((o) => o.value === String(value)),
    );
    const control = (
      <div
        className={`segmented${field.prominent ? ' mode-switch' : ''}`}
        role="group"
        aria-labelledby={id}
        style={{
          ['--seg-count' as string]: options.length,
          ['--seg-index' as string]: selected,
        }}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={String(value) === opt.value}
            onClick={() => onChange(field.name, opt.value)}
          >
            {t(opt.label)}
          </button>
        ))}
      </div>
    );

    if (field.prominent) {
      return (
        <div className="field span-2 mode-switch-row">
          <span className="sr-only" id={id}>
            {field.label}
          </span>
          {control}
        </div>
      );
    }

    return (
      <div className={`field${field.wide ? ' span-2' : ''}`}>
        <span className="field-label" id={id}>
          {t(field.label)}
          {field.help && <Tooltip text={t(field.help)} />}
        </span>
        {control}
        {error && <FieldError id={errorId} message={error} />}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className={`field${field.wide ? ' span-2' : ''}`}>
        {label}
        <div className={`input-wrap select-wrap${error ? ' invalid' : ''}`}>
          <select
            id={id}
            className="input"
            value={String(value)}
            onChange={(e) => onChange(field.name, e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.label)}
              </option>
            ))}
          </select>
        </div>
        {error && <FieldError id={errorId} message={error} />}
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div className={`field${field.wide ? ' span-2' : ''}`}>
        {label}
        <div className={`input-wrap${error ? ' invalid' : ''}`}>
          <input
            id={id}
            type="date"
            className="input"
            value={String(value ?? '')}
            onChange={(e) => onChange(field.name, e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        {error && <FieldError id={errorId} message={error} />}
      </div>
    );
  }

  const numericValue = typeof value === 'number' ? value : parseNumeric(String(value ?? '')) ?? 0;
  const scale = field.slider ? sliderScale(field) : null;
  const sliderPct = scale ? ((scale.toPos(numericValue) - scale.min) / (scale.max - scale.min)) * 100 : 0;

  const handleText = (raw: string) => {
    focused.current = true;
    if (field.type === 'currency') {
      const grouped = groupIndian(raw);
      setText(grouped);
      const n = parseNumeric(grouped);
      onChange(field.name, n == null ? '' : n);
    } else {
      const cleaned = raw.replace(/[^0-9.\-]/g, '');
      setText(cleaned);
      const n = parseNumeric(cleaned);
      onChange(field.name, n == null ? '' : n);
    }
  };

  return (
    <div className={`field${field.wide ? ' span-2' : ''}`}>
      {label}
      <div className={`input-wrap${error ? ' invalid' : ''}`}>
        {field.type === 'currency' && <span className="affix left">₹</span>}
        <input
          id={id}
          className="input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder={field.placeholder}
          value={text}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            setText(initialText(field, value));
          }}
          onChange={(e) => handleText(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : field.type === 'currency' ? hintId : undefined}
        />
        {/* The amount in words used to sit under the field, which cost a whole
            row of height on every currency input. As a suffix it reads the
            same and the form gets shorter. */}
        {field.type === 'currency' && isNumeric && numericValue >= 1000 && (
          <span className="affix words" id={hintId}>
            {toIndianWords(numericValue)}
          </span>
        )}
        {field.type === 'percent' && <span className="affix">%</span>}
        {field.unit && <span className="affix">{t(field.unit)}</span>}
      </div>

      {scale && (
        <input
          type="range"
          className="slider"
          style={{ ['--pct' as string]: `${sliderPct}%` }}
          min={scale.min}
          max={scale.max}
          step={scale.step}
          value={scale.toPos(numericValue)}
          aria-label={`${t(field.label)} slider`}
          aria-valuetext={sliderText(field, numericValue)}
          onChange={(e) => {
            focused.current = false;
            onChange(field.name, scale.fromPos(Number(e.target.value)));
          }}
        />
      )}

      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <div className="error" id={id} role="alert">
      <Icon name="alert" size={13} strokeWidth={2} />
      {message}
    </div>
  );
}

function sliderText(field: Field, v: number): string {
  if (field.type === 'currency') return `₹${Math.round(v).toLocaleString('en-IN')}`;
  if (field.type === 'percent') return `${v}%`;
  return field.unit ? `${v} ${field.unit}` : String(v);
}

function initialText(field: Field, value: Values[string]): string {
  if (value === '' || value == null) return '';
  if (field.type === 'currency') return groupIndian(String(value));
  return String(value);
}
