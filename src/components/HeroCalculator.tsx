import { useMemo, useState } from 'react';
import { emiAmount } from '@/engines/emi';
import { formatINR, formatINRCompact, toIndianWords } from '@/lib/format';
import { Link } from '@/lib/router';
import { useT } from '@/hooks/PreferencesContext';
import { Icon } from './Icon';
import { TweenedText } from '@/lib/tween';

interface Preset {
  id: string;
  label: string;
  calc: string;
  amount: number;
  rate: number;
  years: number;
  maxAmount: number;
  maxYears: number;
  step: number;
  /** Extra query values the full calculator needs to open in loan-amount mode. */
  extra?: string;
}

const PRESETS: Preset[] = [
  {
    id: 'home',
    label: 'Home loan',
    calc: 'home-loan-emi',
    amount: 5000000,
    rate: 8.5,
    years: 20,
    maxAmount: 20000000,
    maxYears: 30,
    step: 100000,
  },
  {
    id: 'car',
    label: 'Car loan',
    calc: 'car-loan-emi',
    amount: 800000,
    rate: 9,
    years: 5,
    maxAmount: 5000000,
    maxYears: 8,
    step: 25000,
    extra: 'amountMode=loan',
  },
  {
    id: 'personal',
    label: 'Personal loan',
    calc: 'personal-loan-emi',
    amount: 500000,
    rate: 11.5,
    years: 3,
    maxAmount: 4000000,
    maxYears: 7,
    step: 25000,
  },
];

/**
 * A working EMI calculator on the home page: three sliders, an instant
 * answer and a breakdown bar. It shows what PaiseWise does in the time it
 * takes to drag a slider, then hands off — with the same numbers — to the
 * full calculator for the schedule, charts and explanation.
 */
export function HeroCalculator() {
  const t = useT();
  const [presetId, setPresetId] = useState('home');
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const [amount, setAmount] = useState(preset.amount);
  const [rate, setRate] = useState(preset.rate);
  const [years, setYears] = useState(preset.years);

  const pick = (p: Preset) => {
    setPresetId(p.id);
    setAmount(p.amount);
    setRate(p.rate);
    setYears(p.years);
  };

  const { emi, interest, total } = useMemo(() => {
    const e = emiAmount(amount, rate, years * 12);
    const tot = e * years * 12;
    return { emi: e, interest: tot - amount, total: tot };
  }, [amount, rate, years]);

  const principalPct = total > 0 ? (amount / total) * 100 : 0;
  const query = [preset.extra, `principal=${amount}`, `interestRate=${rate}`, `tenure=${years}`]
    .filter(Boolean)
    .join('&');

  return (
    <div className="hero-calc" aria-label={t('Try it: EMI calculator')}>
      <div className="hc-head">
        <span className="hc-eyebrow">
          <span className="live-dot" aria-hidden="true" /> {t('Try it now')}
        </span>
        <div className="hc-tabs" role="tablist" aria-label={t('Loan type')}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === presetId}
              className={`hc-tab${p.id === presetId ? ' on' : ''}`}
              onClick={() => pick(p)}
            >
              {t(p.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="hc-body">
        <HeroSlider
          label={t('Loan amount')}
          value={amount}
          display={formatINR(amount)}
          hint={toIndianWords(amount)}
          min={preset.step * 2}
          max={preset.maxAmount}
          step={preset.step}
          onChange={setAmount}
        />
        <HeroSlider
          label={t('Interest rate')}
          value={rate}
          display={`${rate.toFixed(2).replace(/\.?0+$/, '')}%`}
          min={5}
          max={20}
          step={0.05}
          onChange={(v) => setRate(Math.round(v * 100) / 100)}
        />
        <HeroSlider
          label={t('Tenure')}
          value={years}
          display={`${years} ${years === 1 ? t('year') : t('years')}`}
          min={1}
          max={preset.maxYears}
          step={1}
          onChange={setYears}
        />
      </div>

      <div className="hc-result" aria-live="polite">
        <div className="hc-result-label">{t('Monthly EMI')}</div>
        <div className="hc-result-value num"><TweenedText value={formatINR(emi)} /></div>
        <div className="hc-bar" aria-hidden="true">
          <span className="hc-bar-p" style={{ width: `${principalPct}%` }} />
          <span className="hc-bar-i" />
        </div>
        <dl className="hc-split">
          <div>
            <dt>
              <span className="sw sw-p" /> {t('Principal')}
            </dt>
            <dd className="num">{formatINRCompact(amount)}</dd>
          </div>
          <div>
            <dt>
              <span className="sw sw-i" /> {t('Total interest')}
            </dt>
            <dd className="num">{formatINRCompact(interest)}</dd>
          </div>
          <div>
            <dt>{t('Total repayment')}</dt>
            <dd className="num">{formatINRCompact(total)}</dd>
          </div>
        </dl>
        <Link to={`/c/${preset.calc}?${query}`} className="btn block hc-cta">
          {t('See full breakdown')}
          <Icon name="chevronRight" size={16} />
        </Link>
      </div>
    </div>
  );
}

function HeroSlider(props: {
  label: string;
  value: number;
  display: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const pct = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <label className="hc-field">
      <span className="hc-field-top">
        <span className="hc-label">{props.label}</span>
        <span className="hc-value num">{props.display}</span>
      </span>
      <input
        type="range"
        className="slider"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        style={{ ['--pct' as string]: `${Math.min(100, Math.max(0, pct))}%` }}
        aria-valuetext={props.display}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      {props.hint && <span className="hc-hint">{props.hint}</span>}
    </label>
  );
}
