import { useEffect } from 'react';
import { ALIASES, byId } from '@/data/catalog';
import { REGISTRY } from '@/calculators';
import { CalculatorView } from '@/components/CalculatorView';
import { useRecents } from '@/hooks/PreferencesContext';
import { useRouter } from '@/lib/router';
import { NotFound } from './NotFound';

export function CalculatorPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const alias = ALIASES[id];
  const meta = byId(id);
  const def = REGISTRY[id];
  const { push } = useRecents();

  // A retired id (e.g. /c/sip) replaces itself with its successor, so the
  // back button does not bounce the reader between the two.
  useEffect(() => {
    if (alias) navigate(`/c/${alias}`, { replace: true });
  }, [alias, navigate]);

  useEffect(() => {
    if (meta) push(meta.id);
    window.scrollTo({ top: 0 });
  }, [meta, push]);

  if (alias) return null;
  if (!meta || !def) return <NotFound />;
  return <CalculatorView meta={meta} def={def} key={meta.id} />;
}
