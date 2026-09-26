import { useEffect, useRef } from 'react';
import { SITE, type AdPlacement } from '@/data/site';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One clearly labelled AdSense unit. Renders nothing until both the
 * publisher id and this placement's unit id are set in src/data/site.ts,
 * so an unconfigured site carries no ad markup at all.
 */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const slot = SITE.adSlots[placement];
  const pushed = useRef(false);

  useEffect(() => {
    if (!SITE.adsenseClient || !slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocked by an extension or not loaded yet — the page is unaffected */
    }
  }, [slot]);

  if (!SITE.adsenseClient || !slot) return null;
  return (
    <aside className="ad-slot no-print" aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={SITE.adsenseClient}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
