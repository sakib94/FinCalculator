import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode, MouseEvent } from 'react';

/**
 * A ~60-line hash router.
 *
 * Hash routing is deliberate: the same build runs from a static host, a
 * sub-folder, a file:// bundle inside a packaged desktop/mobile app, and an
 * offline service-worker cache — with no server rewrite rules anywhere.
 */

interface RouterValue {
  /** The route without its query, e.g. "/c/emi". */
  path: string;
  /** Whatever follows "?" in the hash, without the "?" — a calculator's saved inputs. */
  search: string;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue>({ path: '/', search: '', navigate: () => {} });

const readHash = (): { path: string; search: string } => {
  const raw = window.location.hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  const path = q === -1 ? raw : raw.slice(0, q);
  return { path: path.startsWith('/') ? path : `/${path}`, search: q === -1 ? '' : raw.slice(q + 1) };
};

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(() =>
    typeof window === 'undefined' ? '/' : readHash().path,
  );
  const [search, setSearch] = useState<string>(() =>
    typeof window === 'undefined' ? '' : readHash().search,
  );

  useEffect(() => {
    const onChange = () => {
      const next = readHash();
      setPath(next.path);
      setSearch(next.search);
    };
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.location.replace('#/');
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const target = `#${to.startsWith('/') ? to : `/${to}`}`;
    if (window.location.hash === target) return;
    if (opts?.replace) window.location.replace(target);
    else window.location.hash = target;
  }, []);

  const value = useMemo(() => ({ path, search, navigate }), [path, search, navigate]);
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
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onClick?.();
    navigate(to);
  };
  return (
    <a href={`#${to}`} className={className} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
