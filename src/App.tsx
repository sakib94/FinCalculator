import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/Toast';
import { PreferencesProvider } from '@/hooks/PreferencesContext';
import { RouterProvider, useRouter } from '@/lib/router';
import { Dashboard } from '@/pages/Dashboard';
import { CalculatorPage } from '@/pages/CalculatorPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { NotFound } from '@/pages/NotFound';

function Routes() {
  const { path } = useRouter();
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) return <Dashboard />;
  if (segments[0] === 'c' && segments[1]) return <CalculatorPage id={segments[1]} />;
  if (segments[0] === 'category' && segments[1]) return <CategoryPage id={segments[1]} />;
  return <NotFound />;
}

export default function App() {
  return (
    <RouterProvider>
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
