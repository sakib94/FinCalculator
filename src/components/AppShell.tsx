import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CALCULATORS, CATEGORIES, displayName } from '@/data/catalog';
import { Link, useRouter } from '@/lib/router';
import { useMediaQuery } from '@/hooks/usePreferences';
import { useFavorites, useT, useTheme } from '@/hooks/PreferencesContext';
import { Icon } from './Icon';
import { SearchDialog } from './SearchDialog';
import { ThemeMenu } from './ThemeMenu';
import { LanguageMenu } from './LanguageMenu';
import { ScrollProgress } from './ScrollProgress';

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { cyclePalette, toggleMode } = useTheme();
  const { favorites } = useFavorites();
  const t = useT();
  const sidebarRef = useRef<HTMLElement>(null);

  // Close the drawer on navigation and whenever we grow to desktop.
  useEffect(() => setDrawerOpen(false), [path]);
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  // Global shortcuts: ⌘K / Ctrl-K opens search, "/" focuses it,
  // ⌘⇧L steps through palettes and ⌘⇧D flips light/dark.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      } else if ((e.key === 'l' || e.key === 'L') && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        cyclePalette();
      } else if ((e.key === 'd' || e.key === 'D') && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        toggleMode();
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cyclePalette, toggleMode]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen && !isDesktop ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen, isDesktop]);

  const year = new Date().getFullYear();

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {t('Skip to content')}
      </a>

      <header className="topbar">
        <Link to="/" className="brand" aria-label="Finora home">
          <span className="brand-mark">
            <Icon name="calculator" size={17} strokeWidth={1.9} />
          </span>
          <span>
            <span className="brand-name">Finora</span>
            <span className="brand-sub">{t('All-in-One Calculator')}</span>
          </span>
        </Link>

        <div className="topbar-spacer" />

        <button type="button" className="search-trigger" onClick={() => setSearchOpen(true)}>
          <Icon name="search" size={16} />
          <span className="search-label">{t('Search calculators')}</span>
          <span className="kbd">⌘K</span>
        </button>

        <LanguageMenu />

        <ThemeMenu />

        <button
          type="button"
          className="icon-btn menu-btn"
          aria-label={t('Open navigation')}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Icon name="menu" size={20} />
        </button>
      </header>

      <ScrollProgress variant="page" />

      <div className="shell">
        <main className="main" id="main">
          <div className="main-inner">{children}</div>
        </main>

        {(isDesktop || drawerOpen) && (
          <>
            {drawerOpen && !isDesktop && (
              <div className="scrim" onClick={() => setDrawerOpen(false)} role="presentation" />
            )}
            <nav className="sidebar" aria-label={t('Calculators')} ref={sidebarRef}>
              <ScrollProgress variant="panel" targetRef={sidebarRef} />

              {!isDesktop && (
                <div className="drawer-head">
                  <span className="brand" style={{ fontSize: '1rem' }}>
                    <span className="brand-mark">
                      <Icon name="calculator" size={16} />
                    </span>
                    Finora
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setDrawerOpen(false)}
                    aria-label={t('Close navigation')}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              )}

              <div className="nav-group">
                <Link to="/" className="nav-item" aria-current={path === '/' ? 'page' : undefined}>
                  <Icon name="grid" size={17} />
                  {t('Dashboard')}
                </Link>
              </div>

              {favorites.length > 0 && (
                <div className="nav-group">
                  <div className="nav-title">{t('Favourites')}</div>
                  {favorites
                    .map((id) => CALCULATORS.find((c) => c.id === id))
                    .filter((c): c is NonNullable<typeof c> => !!c)
                    .map((c) => (
                      <Link
                        key={c.id}
                        to={`/c/${c.id}`}
                        className="nav-item"
                        aria-current={path === `/c/${c.id}` ? 'page' : undefined}
                      >
                        <Icon name={c.icon} size={17} />
                        {t(displayName(c))}
                        <Icon name="star" size={13} className="nav-star" filled />
                      </Link>
                    ))}
                </div>
              )}

              {CATEGORIES.map((cat) => (
                <div className="nav-group" key={cat.id}>
                  <div className="nav-title">{t(cat.title)}</div>
                  {CALCULATORS.filter((c) => c.category === cat.id).map((c) => (
                    <Link
                      key={c.id}
                      to={`/c/${c.id}`}
                      className="nav-item"
                      aria-current={path === `/c/${c.id}` ? 'page' : undefined}
                    >
                      <Icon name={c.icon} size={17} />
                      {t(displayName(c))}
                      {c.isNew && <span className="new-badge nav-new">{t('New')}</span>}
                    </Link>
                  ))}
                </div>
              ))}

              <p className="small muted" style={{ padding: '14px 10px 0' }}>
                {t('Everything runs locally in your browser.')}
              </p>
            </nav>
          </>
        )}
      </div>

      <footer className="site-footer no-print">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-mark">
              <Icon name="calculator" size={15} strokeWidth={1.9} />
            </span>
            <div>
              <div className="f-name">Finora</div>
              <p className="f-tag">
                {CALCULATORS.length} accurate financial and utility calculators — private by design,
                every figure computed in your browser.
              </p>
            </div>
          </div>

          <nav className="footer-links" aria-label="Categories">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} to={`/category/${cat.id}`}>
                {t(cat.short)}
              </Link>
            ))}
          </nav>

          <div className="footer-bar">
            <p className="copyright">© {year} Finora. All rights reserved.</p>
            <p className="disclaimer">
              Results are estimates for planning only — not financial, tax or investment advice.
            </p>
          </div>
        </div>
      </footer>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
