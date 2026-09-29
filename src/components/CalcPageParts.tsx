import { useEffect, useState } from 'react';
import type { ChartSpec, Hero } from '@/calculators/types';
import { formatINRCompact } from '@/lib/format';
import { scrollToSection } from '@/lib/scroll';
import { useT } from '@/hooks/PreferencesContext';
import { Marker, seriesColor } from './Chart';
import { Icon } from './Icon';

/* ------------------------------------------------------------------ */
/* Jump bar                                                            */
/* ------------------------------------------------------------------ */

export interface JumpItem {
  id: string;
  label: string;
}

/**
 * "On this page" for a calculator: Calculator · Charts · Table · How it
 * works · FAQ. Sticky under the header on wide screens, where it also
 * carries the headline result once the result card has scrolled away, so
 * the answer stays in sight while the reader studies the charts or the
 * explanation.
 */
export function CalcJumpBar({ items, hero, showHero }: { items: JumpItem[]; hero?: Hero; showHero: boolean }) {
  const t = useT();
  const active = useActiveSection(items);

  return (
    <nav className="jumpbar no-print" aria-label={t('On this page')}>
      <div className="jb-inner">
        <ul className="jb-list">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className={`jb-link${active === it.id ? ' on' : ''}`}
                aria-current={active === it.id ? 'location' : undefined}
                onClick={() => scrollToSection(it.id)}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
        {hero && (
          <button
            type="button"
            className={`jb-result${showHero ? ' show' : ''}`}
            aria-hidden={!showHero}
            tabIndex={showHero ? 0 : -1}
            onClick={() => scrollToSection('calc-result')}
          >
            <span className="jb-r-label">{t(hero.label)}</span>
            <span className="jb-r-value num">{hero.value}</span>
          </button>
        )}
      </div>
    </nav>
  );
}

/** The last section whose top has passed under the sticky header. */
function useActiveSection(items: JumpItem[]): string | undefined {
  const ids = items.map((i) => i.id).join('|');
  const [active, setActive] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    const list = ids.split('|');
    let frame = 0;
    const update = () => {
      frame = 0;
      const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 120;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= pad + 12) current = id;
      }
      if (atBottom && window.scrollY > 0) current = list[list.length - 1];
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  return active;
}

/* ------------------------------------------------------------------ */
/* Composition bar                                                     */
/* ------------------------------------------------------------------ */

type DonutSpec = Extract<ChartSpec, { kind: 'donut' }>;

/**
 * The result's make-up as one horizontal bar — "₹50 L principal, ₹54 L
 * interest" — right under the headline number, in the same colours the
 * charts further down use.
 */
export function CompositionBar({ spec }: { spec: DonutSpec }) {
  const t = useT();
  const format = spec.format ?? formatINRCompact;
  const data = spec.data.filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length < 2 || data.length > 5 || total <= 0) return null;

  const parts = data.map((d, i) => ({ ...d, i, pct: (d.value / total) * 100 }));
  const pctText = (p: number) => (p >= 10 || p === 0 ? p.toFixed(0) : p.toFixed(1));
  const summary = parts.map((p) => `${t(p.label)} ${format(p.value)} (${pctText(p.pct)}%)`).join(', ');

  return (
    <figure className="comp">
      <figcaption className="comp-title">{t(spec.title)}</figcaption>
      <div className="comp-bar" role="img" aria-label={`${t(spec.title)}: ${summary}`}>
        {parts.map((p) => (
          <span key={p.label} style={{ width: `${p.pct}%`, background: seriesColor(p.i) }} />
        ))}
      </div>
      <ul className="comp-legend">
        {parts.map((p) => (
          <li key={p.label}>
            <Marker index={p.i} />
            <span className="cl-label">{t(p.label)}</span>
            <span className="cl-value num">{format(p.value)}</span>
            <span className="cl-pct num">{pctText(p.pct)}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Result dock (phones)                                                */
/* ------------------------------------------------------------------ */

/**
 * On a phone the inputs fill the screen and the answer sits below them.
 * While the result card is still below the fold, this bar pins the
 * headline number to the bottom edge so every change shows its effect.
 */
export function ResultDock({ hero, show }: { hero?: Hero; show: boolean }) {
  const t = useT();
  if (!hero) return null;
  return (
    <div className={`result-dock no-print${show ? ' show' : ''}`} aria-hidden={!show}>
      <div className="rd-text">
        <span className="rd-label">{t(hero.label)}</span>
        <span className="rd-value num">{hero.value}</span>
      </div>
      <button type="button" className="btn sm rd-btn" tabIndex={show ? 0 : -1} onClick={() => scrollToSection('calc-result')}>
        {t('Details')}
        <Icon name="chevronDown" size={15} />
      </button>
    </div>
  );
}

/**
 * Where the headline result is relative to the viewport: still below the
 * fold, on screen, or scrolled past. Drives the dock and the jump bar chip.
 */
export function useResultPosition(el: HTMLElement | null): 'below' | 'visible' | 'above' {
  const [pos, setPos] = useState<'below' | 'visible' | 'above'>('visible');
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => setPos(e.isIntersecting ? 'visible' : e.boundingClientRect.top > 0 ? 'below' : 'above'),
      { rootMargin: '-120px 0px 0px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el]);
  return pos;
}
