import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CALCULATORS, CATEGORIES, byCategory, displayName } from '@/data/catalog';
import { GUIDES } from '@/content/guides';
import { SITE } from '@/data/site';
import { Link, useRouter } from '@/lib/router';
import { useMediaQuery } from '@/hooks/usePreferences';
import { useAppearance, useFavorites, useT } from '@/hooks/PreferencesContext';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { SearchDialog } from './SearchDialog';
import { AppearanceDialog } from './AppearanceDialog';
import { ThemeMenu } from './ThemeMenu';
import { LanguageMenu } from './LanguageMenu';
import { ScrollProgress } from './ScrollProgress';
import { SideNav } from './SideNav';

/** Categories promoted to the header on wide screens. */
const HEADER_CATEGORIES = ['loans', 'investment', 'tax'] as const;

const FOOTER_POPULAR = [
  'home-loan-emi',
  'personal-loan-emi',
  'car-loan-emi',
  'mutual-fund',
  'income-tax',
  'fd',
  'ppf',
  'gst',
];

/** Guides linked from the footer, with short labels that fit a column. */
const FOOTER_GUIDES: [slug: string, label: string][] = [
  ['how-emi-is-calculated', 'How EMI is calculated'],
  ['old-vs-new-tax-regime', 'Old vs new tax regime'],
  ['what-is-sip', 'What is a SIP?'],
  ['home-loan-tax-benefits', 'Home loan tax benefits'],
  ['power-of-compounding', 'The power of compounding'],
];

/**
 * The frame around every page.
 *
 * A single header carries the brand, the primary navigation (a Calculators
 * mega-menu, the three busiest categories and Guides), search and the
 * language and appearance menus. On wide screens every calculator is also
 * listed in a menu on the right (SideNav); on small screens the navigation
 * moves into a slide-in drawer.
 *
 * The mega-menu stays in the DOM when closed (hidden with CSS), so the
 * pre-rendered HTML of every page links to every calculator.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const [megaOpen, setMegaOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { cycleTheme, toggleDarkMode } = useAppearance();
  const { favorites } = useFavorites();
  const t = useT();
  const megaRef = useRef<HTMLDivElement>(null);
  const megaBtnRef = useRef<HTMLButtonElement>(null);

  // Every navigation closes whatever menu led to it.
  useEffect(() => {
    setDrawerOpen(false);
    setMegaOpen(false);
  }, [path]);
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
    else setMegaOpen(false);
  }, [isDesktop]);

  // Close the mega-menu on an outside click.
  useEffect(() => {
    if (!megaOpen) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (megaRef.current?.contains(target) || megaBtnRef.current?.contains(target)) return;
      setMegaOpen(false);
    };
    // Keyboard users: close once focus moves on past the menu.
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node;
      if (megaRef.current?.contains(target) || megaBtnRef.current?.contains(target)) return;
      setMegaOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [megaOpen]);

  // Global shortcuts: ⌘K / Ctrl-K opens search, "/" focuses it,
  // ⌘⇧L steps through the themes and ⌘⇧D flips light/dark.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      } else if ((e.key === 'l' || e.key === 'L') && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        cycleTheme();
      } else if ((e.key === 'd' || e.key === 'D') && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        toggleDarkMode();
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setDrawerOpen(false);
        if (megaOpen) {
          setMegaOpen(false);
          megaBtnRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycleTheme, toggleDarkMode, megaOpen]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen && !isDesktop ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen, isDesktop]);

  const year = new Date().getFullYear();
  const onCalculator = path.startsWith('/c/');
  const currentCategory = onCalculator
    ? CALCULATORS.find((c) => `/c/${c.id}` === path)?.category
    : path.startsWith('/category/')
      ? path.split('/')[2]
      : undefined;
  const favCalcs = favorites
    .map((id) => CALCULATORS.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {t('Skip to content')}
      </a>

      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label={`${SITE.name} — ${t('Home')}`}>
            <Logo tagline={t('Financial calculators')} />
          </Link>

          <nav className="primary-nav" aria-label={t('Main')}>
            <button
              ref={megaBtnRef}
              type="button"
              className={`pnav-item pnav-calcs${megaOpen ? ' is-open' : ''}${megaOpen || onCalculator ? ' is-active' : ''}`}
              aria-expanded={megaOpen}
              aria-controls="mega-menu"
              onClick={(e) => {
                const opening = !megaOpen;
                setMegaOpen(opening);
                // Opened from the keyboard (Enter/Space report detail 0): the
                // panel sits later in the DOM, so take focus into it.
                if (opening && e.detail === 0) {
                  requestAnimationFrame(() => megaRef.current?.querySelector<HTMLElement>('a')?.focus());
                }
              }}
            >
              {t('Calculators')}
              <Icon name="chevronDown" size={14} className="pnav-caret" />
            </button>
            {HEADER_CATEGORIES.map((id) => {
              const cat = CATEGORIES.find((c) => c.id === id);
              if (!cat) return null;
              return (
                <Link
                  key={id}
                  to={`/category/${id}`}
                  className={`pnav-item pnav-cat${currentCategory === id ? ' is-active' : ''}`}
                  aria-current={path === `/category/${id}` ? 'page' : undefined}
                >
                  {t(cat.short)}
                </Link>
              );
            })}
            <Link
              to="/guides"
              className={`pnav-item${path.startsWith('/guides') ? ' is-active' : ''}`}
              aria-current={path === '/guides' ? 'page' : undefined}
            >
              {t('Guides')}
            </Link>
          </nav>

          <div className="topbar-spacer" />

          <button type="button" className="search-trigger" onClick={() => setSearchOpen(true)}>
            <Icon name="search" size={16} />
            <span className="search-label">{t('Search calculators')}</span>
            <span className="kbd">⌘K</span>
          </button>

          <LanguageMenu />
          <ThemeMenu onOpenSettings={() => setSettingsOpen(true)} />

          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label={t('Open navigation')}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
        </div>

        {/* Calculators mega-menu */}
        <div
          id="mega-menu"
          ref={megaRef}
          className="mega"
          data-open={megaOpen ? 'true' : 'false'}
          aria-hidden={!megaOpen}
        >
          <div className="mega-inner">
            <div className="mega-grid">
              {CATEGORIES.map((cat) => (
                <div className="mega-col" key={cat.id}>
                  <Link to={`/category/${cat.id}`} className="mega-cat" tabIndex={megaOpen ? 0 : -1}>
                    <span className="mega-cat-icon">
                      <Icon name={cat.icon} size={15} />
                    </span>
                    {t(cat.title)}
                  </Link>
                  <ul>
                    {byCategory(cat.id).map((c) => (
                      <li key={c.id}>
                        <Link
                          to={`/c/${c.id}`}
                          className="mega-link"
                          tabIndex={megaOpen ? 0 : -1}
                          aria-current={path === `/c/${c.id}` ? 'page' : undefined}
                        >
                          {t(displayName(c))}
                          {c.isNew && (
                            <>
                              <span className="new-dot" aria-hidden="true" />
                              <span className="sr-only">({t('New')})</span>
                            </>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mega-foot">
              <span className="muted small">
                {CALCULATORS.length} {t('calculators')} · {GUIDES.length} {t('guides')}
                <span className="mega-legend" aria-hidden="true">
                  <span className="new-dot" /> {t('New')}
                </span>
              </span>
              <Link to="/guides" className="mega-foot-link" tabIndex={megaOpen ? 0 : -1}>
                <Icon name="book" size={15} /> {t('Financial guides')}
              </Link>
              <button
                type="button"
                className="mega-foot-link"
                tabIndex={megaOpen ? 0 : -1}
                onClick={() => {
                  setMegaOpen(false);
                  setSearchOpen(true);
                }}
              >
                <Icon name="search" size={15} /> {t('Search all calculators')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <ScrollProgress variant="page" />

      {drawerOpen && !isDesktop && (
        <>
          <div className="scrim" onClick={() => setDrawerOpen(false)} role="presentation" />
          <nav className="drawer" aria-label={t('Calculators')}>
            <div className="drawer-head">
              <Logo />
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

            <button
              type="button"
              className="drawer-search"
              onClick={() => {
                setDrawerOpen(false);
                setSearchOpen(true);
              }}
            >
              <Icon name="search" size={16} />
              {t('Search calculators')}
            </button>

            <div className="drawer-links">
              <Link to="/" className="drawer-link" aria-current={path === '/' ? 'page' : undefined}>
                <Icon name="grid" size={17} />
                {t('Home')}
              </Link>
              <Link
                to="/guides"
                className="drawer-link"
                aria-current={path.startsWith('/guides') ? 'page' : undefined}
              >
                <Icon name="book" size={17} />
                {t('Financial guides')}
              </Link>
              <button
                type="button"
                className="drawer-link"
                onClick={() => {
                  setDrawerOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Icon name="sparkle" size={17} />
                {t('Appearance settings')}
              </button>
            </div>

            {favCalcs.length > 0 && (
              <div className="drawer-group">
                <div className="drawer-title">{t('Favourites')}</div>
                {favCalcs.map((c) => (
                  <Link
                    key={c.id}
                    to={`/c/${c.id}`}
                    className="drawer-link"
                    aria-current={path === `/c/${c.id}` ? 'page' : undefined}
                  >
                    <Icon name={c.icon} size={17} />
                    {t(displayName(c))}
                  </Link>
                ))}
              </div>
            )}

            <div className="drawer-group">
              <div className="drawer-title">{t('Calculators')}</div>
              {CATEGORIES.map((cat) => (
                <details className="drawer-cat" key={cat.id} open={currentCategory === cat.id}>
                  <summary>
                    <Icon name={cat.icon} size={17} />
                    <span>{t(cat.title)}</span>
                    <span className="drawer-count">{byCategory(cat.id).length}</span>
                  </summary>
                  <div className="drawer-cat-body">
                    {byCategory(cat.id).map((c) => (
                      <Link
                        key={c.id}
                        to={`/c/${c.id}`}
                        className="drawer-sublink"
                        aria-current={path === `/c/${c.id}` ? 'page' : undefined}
                      >
                        {t(displayName(c))}
                        {c.isNew && <span className="new-badge">{t('New')}</span>}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
            </div>

            <p className="drawer-note">{t('Everything runs locally in your browser.')}</p>
          </nav>
        </>
      )}

      <div className="shell">
        <main className="main" id="main">
          <div className="main-inner">{children}</div>
        </main>
        <SideNav path={path} />
      </div>

      <footer className="site-footer no-print">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <Logo />
              <p className="f-tag">
                {t('{c} free financial calculators and {g} plain-English guides for loans, investing, tax and salary in India.')
                  .replace('{c}', String(CALCULATORS.length))
                  .replace('{g}', String(GUIDES.length))}
              </p>
              <ul className="footer-trust">
                <li>
                  <Icon name="lock" size={14} /> {t('Private — nothing leaves your device')}
                </li>
                <li>
                  <Icon name="check" size={14} /> {t('Formulas checked against published figures')}
                </li>
              </ul>
            </div>

            <nav className="footer-links" aria-label={t('Calculators')}>
              <span className="footer-head">{t('Calculators')}</span>
              {CATEGORIES.map((cat) => (
                <Link key={cat.id} to={`/category/${cat.id}`}>
                  {t(cat.short)}
                </Link>
              ))}
            </nav>
            <nav className="footer-links" aria-label={t('Popular')}>
              <span className="footer-head">{t('Popular')}</span>
              {FOOTER_POPULAR.map((id) => {
                const c = CALCULATORS.find((x) => x.id === id);
                return c ? (
                  <Link key={id} to={`/c/${id}`}>
                    {t(displayName(c))}
                  </Link>
                ) : null;
              })}
            </nav>
            <nav className="footer-links" aria-label={t('Guides')}>
              <span className="footer-head">{t('Guides')}</span>
              {FOOTER_GUIDES.map(([slug, label]) => (
                <Link key={slug} to={`/guides/${slug}`}>
                  {t(label)}
                </Link>
              ))}
              <Link to="/guides">{t('All guides')} →</Link>
            </nav>
            <nav className="footer-links" aria-label={t('Company')}>
              <span className="footer-head">{t('Company')}</span>
              <Link to="/about">{t('About us')}</Link>
              <Link to="/contact">{t('Contact us')}</Link>
              <Link to="/privacy-policy">{t('Privacy Policy')}</Link>
              <Link to="/terms">{t('Terms & Conditions')}</Link>
              <Link to="/disclaimer">{t('Disclaimer')}</Link>
              <button type="button" className="footer-link-btn" onClick={() => setSettingsOpen(true)}>
                {t('Appearance settings')}
              </button>
            </nav>
          </div>

          <div className="footer-bar">
            <p className="copyright">
              © {year} {SITE.name}. {t('All rights reserved.')}
            </p>
            <p className="disclaimer">
              {t('Results are estimates for planning only — not financial, tax or investment advice.')}
            </p>
          </div>
        </div>
      </footer>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AppearanceDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
