import { POPULAR, displayName } from '@/data/catalog';
import { Link } from '@/lib/router';
import { Icon } from '@/components/Icon';
import { useT } from '@/hooks/PreferencesContext';

/** Also rendered for unknown calculator, guide and category ids. */
export function NotFound() {
  const t = useT();
  return (
    <div className="not-found">
      <p className="nf-code num" aria-hidden="true">
        4<span>0</span>4
      </p>
      <h1>{t('This page doesn’t add up')}</h1>
      <p className="nf-text">
        {t('The link may be old, or the calculator may have moved. Everything is still here — pick up from one of these.')}
      </p>
      <div className="nf-actions">
        <Link to="/" className="btn">
          <Icon name="home" size={16} />
          {t('Go to the home page')}
        </Link>
        <Link to="/guides" className="btn outline">
          <Icon name="book" size={16} />
          {t('Browse the guides')}
        </Link>
      </div>
      <p className="nf-sub">{t('Most used calculators')}</p>
      <div className="chip-row nf-chips">
        {POPULAR.slice(0, 6).map((c) => (
          <Link key={c.id} to={`/c/${c.id}`} className="quick-chip">
            <Icon name={c.icon} size={15} />
            {t(displayName(c))}
          </Link>
        ))}
      </div>
    </div>
  );
}
