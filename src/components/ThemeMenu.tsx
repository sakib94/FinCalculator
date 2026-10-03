import { useEffect, useRef, useState } from 'react';
import { describeAppearance } from '@/theme/appearance';
import { useAppearance, useT } from '@/hooks/PreferencesContext';
import { ThemeControl, ThemeModeControl } from './AppearanceControls';
import { Icon } from './Icon';

/**
 * Quick appearance settings in the header: mode (Light · Dark · Auto) and
 * the theme cards, each applying instantly, with a one-line summary of
 * what is showing and a way to the full Settings › Appearance page
 * (density, language and the live preview).
 */
export function ThemeMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useT();
  const { resolvedMode, theme, themeMode } = useAppearance();
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
        <div className="menu-pop appearance-pop" role="dialog" aria-labelledby="ap-title">
          <div className="ap-head">
            <span className="ap-title" id="ap-title">
              {t('Appearance')}
            </span>
            <span className="ap-status" aria-live="polite">
              {describeAppearance({ theme, themeMode }, resolvedMode, t)}
            </span>
          </div>
          <div className="ap-row">
            <span className="menu-title">{t('Mode')}</span>
            <ThemeModeControl />
          </div>
          <div className="ap-row">
            <span className="menu-title">{t('Theme')}</span>
            <ThemeControl />
          </div>
          <button
            type="button"
            className="ap-more"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
          >
            <Icon name="sparkle" size={15} />
            {t('All appearance settings')}
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
