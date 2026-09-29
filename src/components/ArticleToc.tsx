import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useT } from '@/hooks/PreferencesContext';
import { scrollToSection } from '@/lib/scroll';

/** Article area width at which the contents sit beside the text (calc.css). */
const SIDE_BY_SIDE = 880;

export interface TocItem {
  id: string;
  label: string;
}

/**
 * "On this page" for long articles. Sticky beside the text when the
 * article area is wide; folded into a disclosure above it otherwise (on
 * phones, and beside the right-hand menu on smaller laptops). Entries are
 * buttons, not hash links, because file:// mode keeps its route in the hash.
 */
export function ArticleToc({ items, children }: { items: TocItem[]; children?: ReactNode }) {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const [wide, setWide] = useState(false);

  // Measured on the layout itself, matching the container query in calc.css.
  useEffect(() => {
    const layout = ref.current?.parentElement;
    if (!layout) return;
    const update = () => setWide(layout.clientWidth >= SIDE_BY_SIDE);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(layout);
    return () => ro.disconnect();
  }, []);

  if (!items.length && !children) return null;

  return (
    <aside className="article-toc no-print" aria-label={t('Article contents')} ref={ref}>
      {items.length > 0 && (
        // Keyed by width so it re-mounts open on desktop, folded on phones.
        <details className="toc" open={wide} key={wide ? 'wide' : 'narrow'}>
          <summary>{t('On this page')}</summary>
          <ol>
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => scrollToSection(item.id)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ol>
        </details>
      )}
      {children}
    </aside>
  );
}
