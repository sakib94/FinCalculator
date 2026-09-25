import { useEffect, useMemo, useRef, useState } from 'react';
import { CALCULATORS, CATEGORIES, searchCalculators } from '@/data/catalog';
import type { CalculatorMeta, CategoryId } from '@/data/catalog';
import { useRouter } from '@/lib/router';
import { useT } from '@/hooks/PreferencesContext';
import { Icon } from './Icon';

interface Group {
  id: CategoryId;
  title: string;
  items: CalculatorMeta[];
}

/**
 * Command-palette style search, organised by category.
 *
 * The idle view is a full browse of all 37 calculators grouped under their
 * category, not a repeat of the Popular list — that already sits in the
 * right-hand rail, and showing the same ten items twice on one screen tells
 * the reader nothing new. Categories are what the palette adds: the chips
 * narrow the list, and the headings let you scan the whole catalogue when
 * you do not yet know what the thing you want is called.
 */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useRouter();
  const t = useT();

  const searching = query.trim().length > 0;

  /** Ranked, flat list while searching. */
  const matches = useMemo(() => {
    if (!searching) return [];
    const found = searchCalculators(query);
    return category ? found.filter((c) => c.category === category) : found;
  }, [query, category, searching]);

  /** Browse view: every calculator under its category heading. */
  const groups = useMemo<Group[]>(() => {
    if (searching) return [];
    return CATEGORIES.filter((cat) => !category || cat.id === category)
      .map((cat) => ({
        id: cat.id,
        title: cat.title,
        items: CALCULATORS.filter((c) => c.category === cat.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [category, searching]);

  /** One flat order for the keyboard, whichever view is showing. */
  const flat = useMemo(
    () => (searching ? matches : groups.flatMap((g) => g.items)),
    [searching, matches, groups],
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setCategory(null);
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setActive(0), [query, category]);

  if (!open) return null;

  const go = (id: string) => {
    navigate(`/c/${id}`);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    }
    if (e.key === 'Enter' && flat[active]) {
      e.preventDefault();
      go(flat[active].id);
    }
  };

  /** Index within `flat`, so arrow keys cross group boundaries. */
  const indexOf = (c: CalculatorMeta) => flat.findIndex((x) => x.id === c.id);

  const row = (c: CalculatorMeta, showCategory: boolean) => {
    const i = indexOf(c);
    return (
      <button
        key={c.id}
        type="button"
        className={`result-item${i === active ? ' active' : ''}`}
        onMouseEnter={() => setActive(i)}
        onClick={() => go(c.id)}
      >
        <span className="r-icon">
          <Icon name={c.icon} size={16} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="r-name" style={{ display: 'block' }}>
            {t(c.name)}
          </span>
          <span className="r-desc">{t(c.tagline)}</span>
        </span>
        {showCategory && (
          <span className="r-cat">
            {t(CATEGORIES.find((cat) => cat.id === c.category)?.short ?? '')}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="dialog-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('Search calculators')}
        onKeyDown={onKeyDown}
      >
        <div className="dialog-search">
          <Icon name="search" size={18} className="muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search calculators — try “salary”, “tax”, “emi”…')}
            aria-label={t('Search calculators')}
            autoComplete="off"
          />
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Close search')}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Category filter — and the organising principle of the idle view. */}
        <div className="dialog-cats" role="group" aria-label={t('Filter by category')}>
          <button
            type="button"
            className={`cat-chip${category === null ? ' on' : ''}`}
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            {t('All')}
            <span className="cat-count">{CALCULATORS.length}</span>
          </button>
          {CATEGORIES.map((cat) => {
            const count = CALCULATORS.filter((c) => c.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                className={`cat-chip${category === cat.id ? ' on' : ''}`}
                aria-pressed={category === cat.id}
                onClick={() => setCategory((c) => (c === cat.id ? null : cat.id))}
              >
                <Icon name={cat.icon} size={14} />
                {t(cat.short)}
                <span className="cat-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="dialog-list">
          {searching ? (
            <>
              <div className="section-label dialog-heading">
                {matches.length} {matches.length === 1 ? t('result') : t('results')}
              </div>
              {matches.length === 0 ? (
                <div className="empty" style={{ border: 0 }}>
                  {t('No calculator matches')} “{query}”.
                </div>
              ) : (
                matches.map((c) => row(c, true))
              )}
            </>
          ) : (
            groups.map((g) => (
              <div className="dialog-group" key={g.id}>
                <div className="section-label dialog-heading">
                  {t(g.title)}
                  <span className="g-count">{g.items.length}</span>
                </div>
                {g.items.map((c) => row(c, false))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
