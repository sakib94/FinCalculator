import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { evaluate } from '@/lib/arith';
import { formatNumber } from '@/lib/format';
import { useT } from '@/hooks/PreferencesContext';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  title: string;
  /** Unit of the field it fills, e.g. "sq ft". */
  unit: string;
  /** The field's current value; the calculator starts from it. */
  initial: number;
  onUse: (value: number) => void;
  onClose: () => void;
}

const KEYS = ['C', '(', ')', '⌫', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'] as const;
const OPS = new Set(['÷', '×', '−', '+']);

/** Keyboard input to display symbols; anything else is dropped. */
const tidy = (s: string) =>
  s
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/-/g, '−')
    .replace(/[^0-9.+×÷−()\s]/g, '');

/**
 * A small pop-up calculator for working out a figure — say, adding up
 * room areas — and putting the answer into the field it was opened from.
 * Only sums: numbers, + − × ÷ and brackets (see lib/arith.ts).
 */
export function CalcPopup({ open, title, unit, initial, onUse, onClose }: Props) {
  const t = useT();
  const [expr, setExpr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setExpr(initial > 0 ? String(initial) : '');
    const previous = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add('dialog-open');
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.documentElement.classList.remove('dialog-open');
      previous?.focus?.();
    };
    // Starts from the field's value each time it opens, not as it changes.
  }, [open]);

  if (!open) return null;

  const result = evaluate(expr);
  const usable = result != null && result >= 0;
  const rounded = result == null ? null : Math.round(result * 100) / 100;

  const press = (k: (typeof KEYS)[number]) => {
    if (k === 'C') setExpr('');
    else if (k === '⌫') setExpr((e) => e.trimEnd().slice(0, -1));
    else if (k === '=') {
      if (rounded != null) setExpr(String(rounded));
    } else setExpr((e) => (OPS.has(k) ? `${e.trimEnd()} ${k} ` : e + k));
    inputRef.current?.focus();
  };

  const use = () => {
    if (!usable || rounded == null) return;
    onUse(rounded);
    onClose();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Enter' && e.target === inputRef.current) {
      e.preventDefault();
      use();
      return;
    }
    // Keep Tab inside the dialog.
    if (e.key === 'Tab' && dialogRef.current) {
      const els = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('input, button:not([disabled])'));
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className="dialog-scrim calc-pop-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="dialog calc-pop" role="dialog" aria-modal="true" aria-labelledby="calc-pop-title" onKeyDown={onKeyDown}>
        <div className="calc-pop-head">
          <Icon name="calculator" size={17} />
          <h2 id="calc-pop-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Close')}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="calc-pop-display">
          <input
            ref={inputRef}
            className="calc-pop-expr num"
            type="text"
            inputMode="none"
            autoComplete="off"
            spellCheck={false}
            aria-label={t('Calculation')}
            placeholder="12 × 14 + 10 × 12"
            value={expr}
            onChange={(e) => setExpr(tidy(e.target.value))}
          />
          <div className={`calc-pop-result num${expr && result == null ? ' bad' : ''}`} aria-live="polite">
            {expr === '' ? t('Type or tap a sum') : result == null ? t('Incomplete or invalid') : `= ${formatNumber(rounded ?? 0, 2)} ${unit}`}
          </div>
        </div>

        <div className="calc-pop-keys">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className={`calc-key${OPS.has(k) ? ' op' : ''}${k === '=' ? ' eq' : ''}${k === 'C' || k === '⌫' ? ' fn' : ''}`}
              onClick={() => press(k)}
              aria-label={k === '⌫' ? t('Backspace') : k === 'C' ? t('Clear') : undefined}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="calc-pop-foot">
          {result != null && result < 0 && <p className="error">{t('An area cannot be negative.')}</p>}
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button type="button" className="btn" disabled={!usable} onClick={use}>
            <Icon name="check" size={16} strokeWidth={2.4} />
            {usable && rounded != null ? `${t('Use')} ${formatNumber(rounded, 2)} ${unit}` : t('Use result')}
          </button>
        </div>
      </div>
    </div>
  );
}
