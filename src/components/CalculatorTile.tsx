import type { CalculatorMeta } from '@/data/catalog';
import { displayName } from '@/data/catalog';
import { useFavorites, useT } from '@/hooks/PreferencesContext';
import { Link } from '@/lib/router';
import { Icon } from './Icon';

export function CalculatorTile({ calc, compact }: { calc: CalculatorMeta; compact?: boolean }) {
  const { isFavorite, toggle } = useFavorites();
  const t = useT();
  const fav = isFavorite(calc.id);

  if (compact) {
    return (
      <Link to={`/c/${calc.id}`} className="chip">
        <Icon name={calc.icon} size={15} />
        {t(displayName(calc))}
      </Link>
    );
  }

  return (
    <div className="tile-wrap">
      <Link to={`/c/${calc.id}`} className="tile">
        <span className="t-icon">
          <Icon name={calc.icon} size={19} />
        </span>
        <span className="t-body">
          <span className="t-title">
            <span className="t-name">{t(displayName(calc))}</span>
            {calc.isNew && <span className="new-badge">{t('New')}</span>}
          </span>
          <span className="t-desc">{t(calc.tagline)}</span>
        </span>
      </Link>
      <button
        type="button"
        className={`fav-btn${fav ? ' on' : ''}`}
        aria-pressed={fav}
        aria-label={`${fav ? 'Remove' : 'Add'} ${calc.name} ${fav ? 'from' : 'to'} favourites`}
        onClick={() => toggle(calc.id)}
      >
        <Icon name="star" size={15} filled={fav} />
      </button>
    </div>
  );
}
