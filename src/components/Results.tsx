import type { Hero, Stat } from '@/calculators/types';
import { Tooltip } from './Tooltip';
import { Icon } from './Icon';
import { useT } from '@/hooks/PreferencesContext';

/**
 * Long amounts used to wrap onto a second line — ₹3,98,97,690 is twelve
 * characters and did not fit the hero card at full size. Step the type
 * down by length instead, so the figure always stays on one line.
 */
const fitClass = (value: string): string =>
  value.length > 16 ? ' xxs' : value.length > 13 ? ' xs' : value.length > 10 ? ' sm' : '';


export function HeroResult({ heroes }: { heroes: Hero[] }) {
  const t = useT();
  if (heroes.length === 1) {
    const h = heroes[0];
    return (
      <div className="hero-result">
        <div className="h-label">{t(h.label)}</div>
        <div className={`h-value num value-in${fitClass(h.value)}`}>{h.value}</div>
        {h.caption && <div className="h-caption">{t(h.caption)}</div>}
      </div>
    );
  }
  return (
    <div className="hero-grid stagger">
      {heroes.map((h, i) =>
        i === 0 ? (
          <div className="hero-result" key={h.label} style={{ ['--i' as string]: i }}>
            <div className="h-label">{t(h.label)}</div>
            <div className={`h-value num value-in${fitClass(h.value)}`}>{h.value}</div>
            {h.caption && <div className="h-caption">{t(h.caption)}</div>}
          </div>
        ) : (
          <div className="card card-pad lift" key={h.label} style={{ ['--i' as string]: i }}>
            <div className="s-label" style={{ color: 'var(--text-3)', fontSize: '0.78rem', fontWeight: 600 }}>
              {t(h.label)}
            </div>
            <div className={`num h-alt${fitClass(h.value)}`}>{h.value}</div>
            {h.caption && (
              <div className="small muted" style={{ marginTop: 2 }}>
                {t(h.caption)}
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  const t = useT();
  if (!stats.length) return null;
  return (
    <div className="stat-grid stagger">
      {stats.map((s, i) => (
        <div className={`stat ${s.tone ?? ''}`} key={s.label} style={{ ['--i' as string]: i }}>
          <div className="s-label">
            {t(s.label)}
            {s.help && <Tooltip text={t(s.help)} />}
          </div>
          <div className={`s-value num${s.value.length > 12 ? ' sm' : ''}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div className={`note${tone === 'warn' ? ' warn' : ''}`}>
      <Icon name={tone === 'warn' ? 'alert' : 'info'} size={16} className="i" />
      <div>{children}</div>
    </div>
  );
}
