import { useRef, type ReactNode } from 'react';
import { ACCENTS, DENSITIES, THEME_MODES } from '@/theme/appearance';
import { useAppearance, useT } from '@/hooks/PreferencesContext';
import { Icon } from './Icon';

/**
 * The appearance controls, shared by the header's quick menu and the
 * Settings › Appearance page so the two can never disagree.
 *
 * Each is a real radio group: one tab stop, arrow keys (and Home / End)
 * move the selection, and the choice applies the moment it changes.
 */

interface RadioOption<T extends string> {
  id: T;
  label: string;
}

export function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
  render,
}: {
  label: string;
  value: T;
  options: RadioOption<T>[];
  onChange: (id: T) => void;
  className?: string;
  render: (option: RadioOption<T>, checked: boolean) => ReactNode;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );

  const select = (i: number) => {
    const next = (i + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={className}
      style={{ ['--seg-count' as string]: options.length, ['--seg-index' as string]: current }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') select(current + 1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') select(current - 1);
        else if (e.key === 'Home') select(0);
        else if (e.key === 'End') select(options.length - 1);
        else return;
        e.preventDefault();
      }}
    >
      {options.map((o, i) => {
        const checked = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.id)}
          >
            {render(o, checked)}
          </button>
        );
      })}
    </div>
  );
}

/** Light · Dark · System. */
export function ThemeModeControl({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const t = useT();
  const { themeMode, setThemeMode } = useAppearance();
  return (
    <RadioGroup
      label={t('Theme')}
      value={themeMode}
      options={THEME_MODES}
      onChange={setThemeMode}
      className={`choice-seg${size === 'lg' ? ' lg' : ''}`}
      render={(o) => (
        <>
          <Icon name={THEME_MODES.find((m) => m.id === o.id)!.icon} size={size === 'lg' ? 17 : 15} />
          <span>{t(o.label)}</span>
        </>
      )}
    />
  );
}

/**
 * Accent colours. `swatches` is a row of dots for the quick menu (the
 * chosen name is shown beside the heading, so it is never colour alone);
 * `list` shows every name, for the settings page.
 */
export function AccentControl({ variant = 'swatches' }: { variant?: 'swatches' | 'list' }) {
  const t = useT();
  const { accentColor, setAccentColor, resolvedMode } = useAppearance();
  return (
    <RadioGroup
      label={t('Accent colour')}
      value={accentColor}
      options={ACCENTS}
      onChange={setAccentColor}
      className={variant === 'list' ? 'accent-list' : 'accent-dots'}
      render={(o, checked) => {
        const swatch = ACCENTS.find((a) => a.id === o.id)!.swatch[resolvedMode];
        return (
          <>
            <span className="accent-dot" style={{ background: swatch }} aria-hidden="true">
              {checked && <Icon name="check" size={variant === 'list' ? 14 : 13} strokeWidth={2.6} />}
            </span>
            <span className={variant === 'list' ? 'accent-name' : 'sr-only'}>{t(o.label)}</span>
          </>
        );
      }}
    />
  );
}

/** Comfortable · Compact. */
export function DensityControl({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const t = useT();
  const { density, setDensity } = useAppearance();
  return (
    <RadioGroup
      label={t('Interface density')}
      value={density}
      options={DENSITIES}
      onChange={setDensity}
      className={size === 'lg' ? 'choice-cards' : 'choice-seg'}
      render={(o) => {
        const d = DENSITIES.find((x) => x.id === o.id)!;
        return size === 'lg' ? (
          <>
            <span className={`density-glyph ${d.id}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="cc-text">
              <span className="cc-name">{t(d.label)}</span>
              <span className="cc-hint">{t(d.hint)}</span>
            </span>
          </>
        ) : (
          <span>{t(d.label)}</span>
        );
      }}
    />
  );
}
