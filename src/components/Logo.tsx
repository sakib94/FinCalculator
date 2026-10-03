import { SITE } from '@/data/site';

/**
 * The PaiseWise mark: three ascending bars on an ink tile — calculation and
 * growth in one glyph. The tallest bar carries the palette's signature
 * colour; the tile uses the same ink as the headline result card, so the
 * brand and the answer share one visual root.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size} height={size}>
        <rect x="7.5" y="17" width="4.4" height="7.5" rx="1.3" fill="#fff" fillOpacity="0.5" />
        <rect x="13.8" y="12.5" width="4.4" height="12" rx="1.3" fill="#fff" fillOpacity="0.82" />
        <rect x="20.1" y="7.5" width="4.4" height="17" rx="1.3" className="logo-mark-peak" />
      </svg>
    </span>
  );
}

/** Mark + two-tone wordmark ("Fin" strong, "Calc" in the brand colour). */
export function Logo({ tagline }: { tagline?: string }) {
  const name = SITE.name;
  const split = name.toLowerCase().startsWith('fin') ? 3 : Math.ceil(name.length / 2);
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-text">
        <span className="logo-word">
          {name.slice(0, split)}
          <span className="logo-word-2">{name.slice(split)}</span>
        </span>
        {tagline && <span className="logo-tag">{tagline}</span>}
      </span>
    </span>
  );
}
