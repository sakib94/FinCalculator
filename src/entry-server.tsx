import { renderToString } from 'react-dom/server';
import App from './App';
import { configureRouting } from './lib/router';
import { aliasRoutes, allRoutes, metaForPath, utilityRoutes } from './lib/pageMeta';
import { relativeRootFor, toUrlPath } from './lib/urls';
import { canonicalUrlFor } from './lib/router';
import { PLACEHOLDER_SETTINGS, SITE } from './data/site';

/**
 * Server entry used only by scripts/prerender.mjs at build time. It renders
 * each route to static HTML so every page is a complete document before any
 * JavaScript runs — which is what search engines and slow phones see first.
 */

export { aliasRoutes, allRoutes, utilityRoutes, metaForPath, toUrlPath, relativeRootFor, canonicalUrlFor, SITE, PLACEHOLDER_SETTINGS };

/**
 * @param path    internal route, e.g. "/c/home-loan-emi"
 * @param root    how links reach the site root from this page: a relative
 *                prefix ("../") for normal pages, "/" for 404.html, which
 *                can be served at any depth.
 */
export function render(path: string, root: string): string {
  configureRouting({ mode: 'path', root });
  return renderToString(<App location={{ path, search: '' }} />);
}
