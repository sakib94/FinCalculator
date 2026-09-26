import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import { SITE } from '@/data/site';
import { fromUrlPath, splitRoute, toUrlPath } from './urls';

/**
 * A small router with two addressing modes.
 *
 *   path — real URLs (/home-loan-emi-calculator/). Used whenever the site is
 *          served over http(s). Each of these URLs also exists as a
 *          pre-rendered HTML file in dist/, so search engines index every
 *          calculator, guide and legal page as a page of its own.
 *   hash — #/c/home-loan-emi. Used only when dist/index.html is opened
 *          straight from disk (file://), where there is no server to serve
 *          real paths.
 *
 * The rest of the app only ever deals in internal routes ("/c/emi"); the
 * translation to and from the address bar happens here and in ./urls.
 */

export type RouteMode = 'path' | 'hash';

interface RoutingConfig {
  mode: RouteMode;
  /**
   * Where the site root is. On the client in path mode, an absolute
   * pathname such as "/" or "/finora/". While pre-rendering, a relative
   * prefix such as "../" so the generated links work from any folder.
   * In hash mode it is only used to read the route of a pre-rendered file.
   */
  root: string;
}

let routing: RoutingConfig = { mode: 'path', root: '/' };

/** Set once at start-up (client) or before rendering each page (pre-render). */
export function configureRouting(next: RoutingConfig): void {
  routing = next;
}

/** Works out the addressing mode and site root from the page the browser loaded. */
export function detectRouting(): RoutingConfig {
  let root = '/';
  // The manifest link always points at the site root — pre-rendered pages
  // rewrite it to "../manifest.webmanifest" and so on — which makes it a
  // reliable marker even when the site lives in a sub-folder. The dev
  // server always serves from "/".
  if (!import.meta.env.DEV) {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest?.href) root = new URL('.', manifest.href).pathname;
  }
  return { mode: window.location.protocol === 'file:' ? 'hash' : 'path', root };
}

/** The href for an internal route ("/c/emi?x=1"), in the current addressing mode. */
export function hrefFor(to: string): string {
  const { path, search } = splitRoute(to);
  const q = search ? `?${search}` : '';
  if (routing.mode === 'hash') return `#${path}${q}`;
  return `${routing.root}${toUrlPath(path)}${q}`;
}

/** Absolute URL for an internal route, for copying and sharing. */
export function absoluteUrlFor(to: string): string {
  if (routing.mode === 'hash') return `${window.location.href.split('#')[0]}${hrefFor(to)}`;
  return new URL(hrefFor(to), window.location.href).href;
}

/** The canonical public URL of an internal route on the production domain. */
export function canonicalUrlFor(internal: string): string {
  return `${SITE.url}/${toUrlPath(internal)}`;
}

interface Location {
  /** The route without its query, e.g. "/c/emi". */
  path: string;
  /** Whatever follows "?", without the "?" — a calculator's saved inputs. */
  search: string;
}

function readHash(): Location | null {
  const raw = window.location.hash.replace(/^#/, '');
  // "#main" (the skip link) and other in-page anchors are not routes.
  if (!raw.startsWith('/')) return null;
  return splitRoute(raw);
}

function readLocation(): Location {
  // From disk, a page with no "#/…" is the pre-rendered file itself (for
  // example dist/fd-calculator/index.html), so its folder names the route.
  if (routing.mode === 'hash') return readHash() ?? { ...readPath(), search: '' };
  return readPath();
}

function readPath(): Location {
  const { pathname, search } = window.location;
  const relative = pathname.startsWith(routing.root)
    ? pathname.slice(routing.root.length)
    : pathname.replace(/^\/+/, '');
  return { path: fromUrlPath(decodeURIComponent(relative)), search: search.replace(/^\?/, '') };
}

/** True when the address bar currently shows this internal route (ignoring the query). */
export function isCurrentRoute(internal: string): boolean {
  return typeof window !== 'undefined' && readLocation().path === internal;
}

/** Rewrites the query of the current entry without adding history or re-rendering. */
export function replaceSearch(internal: string, search: string): void {
  const next = hrefFor(search ? `${internal}?${search}` : internal);
  const current =
    routing.mode === 'hash'
      ? window.location.hash
      : `${window.location.pathname}${window.location.search}`;
  if (current === next) return;
  try {
    window.history.replaceState(window.history.state, '', next);
  } catch {
    /* rate-limited or sandboxed — the link simply stays as it was */
  }
}

interface RouterValue extends Location {
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue>({ path: '/', search: '', navigate: () => {} });

export function RouterProvider({
  children,
  location,
}: {
  children: ReactNode;
  /** Fixed location for pre-rendering, where there is no window. */
  location?: Location;
}) {
  const [loc, setLoc] = useState<Location>(() => location ?? readLocation());

  useEffect(() => {
    // Old #/c/emi links keep working: in path mode they are translated to
    // the real URL in place, without a reload.
    if (routing.mode === 'path') {
      const legacy = readHash();
      if (legacy) {
        window.history.replaceState(null, '', hrefFor(legacy.search ? `${legacy.path}?${legacy.search}` : legacy.path));
      }
    }
    const sync = () => {
      const next = readLocation();
      setLoc((prev) => (prev.path === next.path && prev.search === next.search ? prev : next));
    };
    sync();
    const event = routing.mode === 'hash' ? 'hashchange' : 'popstate';
    window.addEventListener(event, sync);
    return () => window.removeEventListener(event, sync);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const target = hrefFor(to);
    if (routing.mode === 'hash') {
      if (window.location.hash === target) return;
      if (opts?.replace) window.location.replace(target);
      else window.location.hash = target;
      return;
    }
    if (`${window.location.pathname}${window.location.search}` === target) return;
    if (opts?.replace) window.history.replaceState(null, '', target);
    else window.history.pushState(null, '', target);
    setLoc(readLocation());
  }, []);

  const value = useMemo(() => ({ ...loc, navigate }), [loc, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useRouter = (): RouterValue => useContext(RouterContext);

export function Link({
  to,
  children,
  className,
  onClick,
  ...rest
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  const { navigate } = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onClick?.();
    navigate(to);
  };
  return (
    <a href={hrefFor(to)} className={className} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
