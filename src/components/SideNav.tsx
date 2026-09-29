import { useEffect, useRef } from 'react';
import { CALCULATORS, CATEGORIES, displayName } from '@/data/catalog';
import { useFavorites, useT } from '@/hooks/PreferencesContext';
import { Link } from '@/lib/router';
import { Icon } from './Icon';

/**
 * The calculator menu on the right of every page (wide screens only; below
 * that the header menu and the drawer cover the same ground). It follows
 * the content in the DOM, so reading and tab order reach the page first.
 *
 * The panel scrolls on its own and brings the current calculator into view
 * whenever the page changes.
 */
export function SideNav({ path }: { path: string }) {
  const t = useT();
  const { favorites } = useFavorites();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    const top = current.offsetTop - nav.offsetTop;
    if (top < nav.scrollTop || top + current.offsetHeight > nav.scrollTop + nav.clientHeight) {
      nav.scrollTop = Math.max(0, top - nav.clientHeight / 3);
    }
  }, [path]);

  const favCalcs = favorites
    .map((id) => CALCULATORS.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const item = (to: string, current: boolean) => ({
    to,
    className: 'side-item',
    'aria-current': current ? ('page' as const) : undefined,
  });

  return (
    <nav className="side-nav no-print" aria-label={t('All calculators')} ref={navRef}>
      <div className="side-group">
        <Link {...item('/', path === '/')}>
          <Icon name="grid" size={16} />
          {t('Dashboard')}
        </Link>
        <Link {...item('/guides', path === '/guides' || path.startsWith('/guides/'))}>
          <Icon name="book" size={16} />
          {t('Financial guides')}
        </Link>
      </div>

      {favCalcs.length > 0 && (
        <div className="side-group">
          <div className="side-title">{t('Favourites')}</div>
          {favCalcs.map((c) => (
            <Link key={c.id} {...item(`/c/${c.id}`, path === `/c/${c.id}`)}>
              <Icon name={c.icon} size={16} />
              <span className="side-label">{t(displayName(c))}</span>
              <Icon name="star" size={13} filled className="side-star" />
            </Link>
          ))}
        </div>
      )}

      {CATEGORIES.map((cat) => (
        <div className="side-group" key={cat.id}>
          <div className="side-title">{t(cat.title)}</div>
          {CALCULATORS.filter((c) => c.category === cat.id).map((c) => (
            <Link key={c.id} {...item(`/c/${c.id}`, path === `/c/${c.id}`)}>
              <Icon name={c.icon} size={16} />
              <span className="side-label">{t(displayName(c))}</span>
              {c.isNew && <span className="new-badge side-new">{t('New')}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
