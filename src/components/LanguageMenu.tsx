import { useEffect, useRef, useState } from 'react';
import { LANGS } from '@/i18n';
import { useLanguage } from '@/hooks/PreferencesContext';
import { Icon } from './Icon';

/**
 * Language picker. Each option is written in its own script, which is the
 * one thing a language menu must get right — someone who cannot read the
 * current language still has to be able to find their own.
 */
export function LanguageMenu() {
  const { lang, setLang } = useLanguage();
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

  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];

  return (
    <div className="theme-menu" ref={wrapRef}>
      <button
        type="button"
        className={`lang-btn${open ? ' active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${current.english}. Change language.`}
        title={current.english}
      >
        <Icon name="globe" size={16} />
        <span className="lang-code">{current.short}</span>
        <Icon name="chevronDown" size={13} className="lang-caret" />
      </button>

      {open && (
        <div className="menu-pop" role="menu" aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="menuitemradio"
              aria-checked={lang === l.id}
              className={`menu-item${lang === l.id ? ' on' : ''}`}
              onClick={() => {
                setLang(l.id);
                setOpen(false);
              }}
            >
              <span className="lang-chip" aria-hidden="true">
                {l.short}
              </span>
              <span className="m-text">
                <span className="m-label">{l.native}</span>
                <span className="m-hint">{l.english}</span>
              </span>
              {lang === l.id && (
                <Icon name="check" size={15} strokeWidth={2.2} className="m-check" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
