import { useEffect, useRef, useState } from 'react';

/**
 * Headline figures glide to their new value instead of snapping — ₹16,488
 * counts up to ₹17,203 over a fraction of a second as an input changes.
 * It makes the cause and effect between an input and the answer visible.
 *
 * Works on the formatted string: the first number in it is animated and
 * everything around it ("₹", " L", "%", " per sq ft") is kept. When the
 * surrounding text changes (₹95,000 → ₹1.02 L) or the reader prefers
 * reduced motion, the new value simply appears.
 */

const NUMBER = /-?\d[\d,]*(?:\.\d+)?/;
const DURATION = 420;

interface Parsed {
  before: string;
  after: string;
  value: number;
  decimals: number;
  grouped: boolean;
}

export function parseFigure(text: string): Parsed | null {
  const m = NUMBER.exec(text);
  if (!m) return null;
  const raw = m[0];
  const value = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  const dot = raw.indexOf('.');
  return {
    before: text.slice(0, m.index),
    after: text.slice(m.index + raw.length),
    value,
    decimals: dot === -1 ? 0 : raw.length - dot - 1,
    grouped: raw.includes(','),
  };
}

export function formatFigure(p: Parsed, value: number): string {
  const n = value.toLocaleString(p.grouped ? 'en-IN' : 'en-US', {
    minimumFractionDigits: p.decimals,
    maximumFractionDigits: p.decimals,
    useGrouping: p.grouped,
  });
  return `${p.before}${n}${p.after}`;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The text to paint for a figure that should glide to `target`. */
export function useTweenedText(target: string): string {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  const frame = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(frame.current);
    const from = parseFigure(shownRef.current);
    const to = parseFigure(target);
    const set = (s: string) => {
      shownRef.current = s;
      setShown(s);
    };
    if (
      !from ||
      !to ||
      from.before !== to.before ||
      from.after !== to.after ||
      from.value === to.value ||
      reducedMotion()
    ) {
      set(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - k, 3);
      if (k >= 1) {
        set(target);
        return;
      }
      set(formatFigure(to, from.value + (to.value - from.value) * eased));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);

  return shown;
}

/**
 * A figure that glides between values. Screen readers get only the final
 * value, so a live region never announces the in-between numbers.
 */
export function TweenedText({ value }: { value: string }) {
  const shown = useTweenedText(value);
  if (shown === value) return <>{value}</>;
  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}
