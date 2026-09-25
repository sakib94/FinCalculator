import { useEffect, useRef, useState } from 'react';
import { MODES, PALETTES } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/PreferencesContext';
import { Icon } from './Icon';

/**
 * Appearance picker. Two rows, because they are two separate decisions:
 * the mode (light / dark / auto) and the palette. Each palette shows a
 * three-band swatch — page, brand, accent — so the choice reads before
 * you commit to it.
 */
export function ThemeMenu() {
  const { palette, setPalette, mode, resolvedMode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const modeIcon = resolvedMode === 'dark' ? 'moon' : 'sun';

  return (
    <div className="theme-menu" ref={wrapRef}>
      <button
        type="button"
        className={`icon-btn${open ? ' active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Appearance settings"
        title="Appearance"
      >
        <Icon name={modeIcon} size={18} />
      </button>

      {open && (
        <div className="menu-pop wide" role="menu" aria-label="Appearance">
          <div className="menu-title">Mode</div>
          <div className="mode-row" role="group" aria-label="Colour mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mode-btn${mode === m.id ? ' on' : ''}`}
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
              >
                <Icon name={m.icon} size={15} />
                {m.label}
              </button>
            ))}
          </div>

          <div className="menu-title">Theme</div>
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitemradio"
              aria-checked={palette === p.id}
              className={`menu-item${palette === p.id ? ' on' : ''}`}
              onClick={() => setPalette(p.id)}
            >
              <span className="palette-swatch" aria-hidden="true">
                <span style={{ background: p.swatch[0] }} />
                <span style={{ background: p.swatch[1] }} />
                <span style={{ background: p.swatch[2] }} />
              </span>
              <span className="m-text">
                <span className="m-label">{p.label}</span>
                <span className="m-hint">{p.hint}</span>
              </span>
              {palette === p.id && (
                <Icon name="check" size={15} strokeWidth={2.2} className="m-check" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
