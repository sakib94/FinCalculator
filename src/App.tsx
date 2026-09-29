import { useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/Toast';
import { PreferencesProvider } from '@/hooks/PreferencesContext';
import { RouterProvider, useRouter } from '@/lib/router';
import { metaForPath } from '@/lib/pageMeta';
import { applyPageMeta } from '@/lib/seo';
import { Dashboard } from '@/pages/Dashboard';
import { CalculatorPage } from '@/pages/CalculatorPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { GuidePage, GuidesIndex } from '@/pages/GuidePages';
import { InfoPage } from '@/pages/InfoPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFound } from '@/pages/NotFound';
import { infoPageBySlug } from '@/content/pages';

export function Routes() {
  const { path } = useRouter();
  const segments = path.split('/').filter(Boolean);

  // One place keeps the head in step with the route, and every navigation
  // starts at the top of the new page.
  useEffect(() => {
    applyPageMeta(metaForPath(path), path);
    window.scrollTo({ top: 0 });
  }, [path]);

  if (segments.length === 0) return <Dashboard />;
  if (segments.length > 2) return <NotFound />;
  const [head, id] = segments;
  if (head === 'c' && id) return <CalculatorPage id={id} />;
  if (head === 'category' && id) return <CategoryPage id={id} />;
  if (head === 'guides') return id ? <GuidePage slug={id} /> : <GuidesIndex />;
  if (head === 'settings' && !id) return <SettingsPage />;
  if (!id && infoPageBySlug(head)) return <InfoPage slug={head} />;
  return <NotFound />;
}

export default function App({ location }: { location?: { path: string; search: string } }) {
  return (
    <RouterProvider location={location}>
      <PreferencesProvider>
        <ToastProvider>
          <AppShell>
            <Routes />
          </AppShell>
        </ToastProvider>
      </PreferencesProvider>
    </RouterProvider>
  );
}
