import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Position {
  left: number;
  top: number;
  /** Placed under the icon because there was no room above. */
  below: boolean;
}

const GAP = 8;
const EDGE = 8;

/**
 * Accessible hint bubble: hover, focus and touch all open it.
 *
 * The bubble is rendered into document.body through a portal rather than
 * inside the button. It used to be an absolutely-positioned child, which
 * meant any ancestor with `overflow: hidden` silently clipped it away —
 * the result stat cards and the inputs panel both do, so the hint simply
 * never appeared there. A portal takes the bubble out of that subtree
 * entirely, so no ancestor's overflow (or transform) can reach it.
 *
 * Because it is then positioned against the viewport, placement is
 * measured here: centred on the icon, flipped below when there is no room
 * above, and clamped so it never runs off either edge.
 */
export function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const id = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const bubble = bubbleRef.current?.getBoundingClientRect();
    const width = bubble?.width ?? 240;
    const height = bubble?.height ?? 44;

    const below = anchor.top - height - GAP < EDGE;
    const centre = anchor.left + anchor.width / 2;

    setPos({
      left: Math.min(Math.max(EDGE, centre - width / 2), window.innerWidth - width - EDGE),
      top: below ? anchor.bottom + GAP : anchor.top - height - GAP,
      below,
    });
  }, []);

  // Measure before paint so the bubble never appears in the wrong place first.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
  }, [open, place]);

  // Keep it attached to the icon while the page moves under it.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, place]);

  // A tap opens it on touch devices, so a tap anywhere else should close it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) setOpen(false);
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

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`tip${open ? ' on' : ''}`}
        aria-label={text}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        i
      </button>

      {open &&
        createPortal(
          <div
            ref={bubbleRef}
            className={`tip-bubble${pos?.below ? ' below' : ''}`}
            id={id}
            role="tooltip"
            style={{
              left: pos?.left ?? 0,
              top: pos?.top ?? 0,
              // Hidden for the single frame before it has been measured.
              visibility: pos ? 'visible' : 'hidden',
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
