import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

interface Props {
  /**
   * The element whose scrolling drives the bar. Omit to track the page.
   * The right-hand nav is its own scroll container, so it needs its own.
   */
  targetRef?: RefObject<HTMLElement | null>;
  /** `page` picks up the theme colour; `panel` uses the contrasting one. */
  variant: 'page' | 'panel';
}

/**
 * A thin bar that fills left to right as its target scrolls.
 *
 * Progress is written to a CSS custom property and the fill is a
 * `scaleX` transform, so every frame is a compositor-only change — no
 * layout, no paint, nothing that competes with the scroll itself. The
 * listener is passive and coalesced into a single animation frame.
 */
export function ScrollProgress({ targetRef, variant }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const el = targetRef?.current;
      let ratio = 0;

      if (el) {
        const max = el.scrollHeight - el.clientHeight;
        ratio = max > 1 ? el.scrollTop / max : 0;
      } else {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        ratio = max > 1 ? window.scrollY / max : 0;
      }

      bar.style.setProperty('--progress', String(Math.min(1, Math.max(0, ratio))));
    };

    // Coalesce bursts of scroll events into one write per frame.
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    const scroller: HTMLElement | Window = targetRef?.current ?? window;
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // Content height changes when a filter is applied or a table expands,
    // which changes the denominator even though nothing scrolled.
    const observed = targetRef?.current ?? document.body;
    const ro =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll);
    ro?.observe(observed);

    measure();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro?.disconnect();
    };
  }, [targetRef]);

  return (
    <div className={`scroll-progress ${variant} no-print`} ref={barRef} aria-hidden="true">
      <span className="sp-fill">
        <span className="sp-ink" />
      </span>
    </div>
  );
}
