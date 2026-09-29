import { useEffect, useRef, useState } from 'react';
import { ACCENTS } from '@/theme/appearance';
import { useAppearance, useT } from '@/hooks/PreferencesContext';
import { Link } from '@/lib/router';
import { AccentControl, DensityControl, ThemeModeControl } from './AppearanceControls';
import { Icon } from './Icon';

/**
 * Quick appearance settings in the header: theme, accent and density, each
 * applying instantly, plus a way to the full Settings › Appearance page
 * with its live preview.
 */
export function ThemeMenu() {
  const t = useT();
  const { resolvedMode, accentColor } = useAppearance();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const accentLabel = ACCENTS.find((a) => a.id === accentColor)?.label ?? '';

  return (
    <div className="theme-menu" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`icon-btn${open ? ' active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('Appearance settings')}
        title={t('Appearance')}
      >
        <Icon name={resolvedMode === 'dark' ? 'moon' : 'sun'} size={18} />
      </button>

      {open && (
        <div className="menu-pop appearance-pop" role="dialog" aria-label={t('Appearance')}>
          <div className="ap-row">
            <span className="menu-title">{t('Theme')}</span>
            <ThemeModeControl />
          </div>
          <div className="ap-row">
            <span className="menu-title">
              {t('Accent')} <span className="ap-value">· {t(accentLabel)}</span>
            </span>
            <AccentControl />
          </div>
          <div className="ap-row">
            <span className="menu-title">{t('Density')}</span>
            <DensityControl />
          </div>
          <Link to="/settings" className="ap-more" onClick={() => setOpen(false)}>
            <Icon name="sparkle" size={15} />
            {t('All appearance settings')}
            <Icon name="chevronRight" size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
