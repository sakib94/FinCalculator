import { useEffect } from 'react';

/** The page sections that settle into place as they first scroll into view. */
const SECTIONS = '.calc-block, .home-section, .page-section, .prose-section';
/** Longer than the animation, in case `animationend` never arrives (a hidden tab). */
const FALLBACK_MS = 1200;

/**
 * Sections below the fold rise and fade in once, the first time they
 * scroll into view, and are then left entirely alone.
 *
 * This replaces a CSS scroll-driven animation (`animation-timeline:
 * view()`). That kept an animation attached to every section for as long
 * as the page was open, so the browser kept each one on its own
 * compositor layer — and text on a composited layer loses ClearType on
 * Windows and looks soft. Here the classes come off as soon as the
 * animation ends, so the text is drawn like any other.
 *
 * Only sections that start below the fold are hidden, so nothing already
 * on screen ever flashes, and without JavaScript (or with reduced motion)
 * everything is simply visible.
 */
export function useReveal(key: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let io: IntersectionObserver | null = null;
    const waiting = new Set<HTMLElement>();
    const timers: number[] = [];

    const settle = (el: HTMLElement) => {
      el.classList.remove('rv-wait', 'rv-in');
      waiting.delete(el);
    };

    // Two frames: let the route's own scroll-to-top land before measuring.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const fold = window.innerHeight * 0.92;
        const els = Array.from(document.querySelectorAll<HTMLElement>(SECTIONS)).filter(
          (el) => !el.classList.contains('rv-wait') && el.getBoundingClientRect().top > fold,
        );
        if (!els.length) return;
        io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const el = entry.target as HTMLElement;
              io?.unobserve(el);
              el.classList.add('rv-in');
              // Animations inside the section (charts drawing in) bubble up too.
              const done = (ev: AnimationEvent) => {
                if (ev.target !== el) return;
                el.removeEventListener('animationend', done);
                settle(el);
              };
              el.addEventListener('animationend', done);
              timers.push(window.setTimeout(() => settle(el), FALLBACK_MS));
            }
          },
          { rootMargin: '0px 0px -6% 0px' },
        );
        for (const el of els) {
          el.classList.add('rv-wait');
          waiting.add(el);
          io.observe(el);
        }
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      waiting.forEach(settle);
    };
  }, [key]);
}
