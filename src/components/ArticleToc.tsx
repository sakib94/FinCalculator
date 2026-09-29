import type { ReactNode } from 'react';
import { useT } from '@/hooks/PreferencesContext';
import { useMediaQuery } from '@/hooks/usePreferences';
import { scrollToSection } from '@/lib/scroll';

export interface TocItem {
  id: string;
  label: string;
}

/**
 * "On this page" for long articles. Sticky beside the text on wide
 * screens; folded into a disclosure above it on phones. Entries are
 * buttons, not hash links, because file:// mode keeps its route in the hash.
 */
export function ArticleToc({ items, children }: { items: TocItem[]; children?: ReactNode }) {
  const t = useT();
  const wide = useMediaQuery('(min-width: 1100px)');
  if (!items.length && !children) return null;

  return (
    <aside className="article-toc no-print" aria-label={t('Article contents')}>
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
