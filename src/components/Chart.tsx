import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChartSpec } from '@/calculators/types';
import { formatAxisINR, formatINRCompact } from '@/lib/format';
import { useT } from '@/hooks/PreferencesContext';

/**
 * Charts, hand-built in SVG.
 *
 * No charting dependency: the four shapes this product needs are ~250 lines,
 * they inherit theme tokens directly (so dark mode is exact rather than
 * approximated), and they add nothing to the bundle.
 *
 * Series colours come from --series-1…5, a palette validated for
 * colour-vision-deficiency separation in both themes.
 */

const SERIES_VARS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];

export const seriesColor = (i: number): string => SERIES_VARS[i % SERIES_VARS.length];

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(560);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(240, el.clientWidth));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

interface HoverState {
  index: number;
  x: number;
  y: number;
}

export function Chart({ spec }: { spec: ChartSpec }) {
  if (spec.kind === 'donut') return <DonutChart spec={spec} />;
  return <CartesianChart spec={spec} />;
}

/* ------------------------------------------------------------------ */
/* Line / area / bar                                                   */
/* ------------------------------------------------------------------ */

function CartesianChart({ spec }: { spec: Extract<ChartSpec, { kind: 'line' | 'bar' }> }) {
  const t = useT();
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<HoverState | null>(null);

  const compact = width < 430;
  const tickCount = compact ? 3 : 4;
  const height = compact ? 210 : 260;
  const pad = { top: 14, right: compact ? 10 : 14, bottom: 26, left: compact ? 38 : 52 };
  const plotW = Math.max(10, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const format = spec.format ?? formatINRCompact;
  const stacked = !!spec.stacked;
  const n = spec.x.length;

  const { max, stackTotals } = useMemo(() => {
    const totals = spec.x.map((_, i) => spec.series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0));
    const peak = stacked
      ? Math.max(...totals, 0)
      : Math.max(...spec.series.flatMap((s) => s.values.map((v) => v || 0)), 0);
    return { max: niceMax(peak, tickCount), stackTotals: totals };
  }, [spec.series, spec.x, stacked, tickCount]);

  // Bars sit in the middle of a band; lines and areas span edge to edge.
  const isBar = spec.kind === 'bar';
  const xFor = useCallback(
    (i: number) => {
      if (n <= 1) return pad.left + plotW / 2;
      if (isBar) return pad.left + (plotW * (i + 0.5)) / n;
      return pad.left + (plotW * i) / (n - 1);
    },
    [n, pad.left, plotW, isBar],
  );
  const yFor = useCallback(
    (v: number) => pad.top + plotH - (max > 0 ? (v / max) * plotH : 0),
    [max, pad.top, plotH],
  );

  const ticks = useMemo(
    () => Array.from({ length: tickCount + 1 }, (_, i) => (max * i) / tickCount),
    [max, tickCount],
  );

  const labelStep = Math.max(1, Math.ceil(n / (compact ? 4 : 8)));

  const onMove = (e: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const rel = clientX - rect.left;
    const idx =
      n <= 1 ? 0 : isBar ? Math.floor((rel / rect.width) * n) : Math.round((rel / rect.width) * (n - 1));
    const index = Math.min(n - 1, Math.max(0, idx));
    setHover({ index, x: xFor(index), y: pad.top });
  };

  const barWidth = isBar ? Math.max(3, Math.min(56, (plotW / Math.max(n, 1)) * 0.6)) : 0;

  return (
    <figure className="chart" ref={ref} style={{ margin: 0 }}>
      <figcaption className="section-label" style={{ marginBottom: 8 }}>
        {t(spec.title)}
      </figcaption>
      <div style={{ position: 'relative' }}>
        <svg width={width} height={height} role="img" aria-label={`${t(spec.title)} chart`}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line className="grid-line" x1={pad.left} x2={width - pad.right} y1={yFor(t)} y2={yFor(t)} />
              <text className="axis-text" x={pad.left - 6} y={yFor(t) + 3.5} textAnchor="end">
                {spec.format ? spec.format(t) : formatAxisINR(t)}
              </text>
            </g>
          ))}

          {spec.kind === 'line' &&
            spec.series.map((s, si) => {
              const values = stacked
                ? s.values.map((_, i) =>
                    spec.series.slice(0, si + 1).reduce((sum, ss) => sum + (ss.values[i] ?? 0), 0),
                  )
                : s.values;
              const below = stacked
                ? s.values.map((_, i) =>
                    spec.series.slice(0, si).reduce((sum, ss) => sum + (ss.values[i] ?? 0), 0),
                  )
                : null;
              const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(v)}`).join(' ');
              const areaPath = below
                ? `${line} ${below
                    .map((_, i) => `L${xFor(below.length - 1 - i)},${yFor(below[below.length - 1 - i])}`)
                    .join(' ')} Z`
                : `${line} L${xFor(values.length - 1)},${yFor(0)} L${xFor(0)},${yFor(0)} Z`;

              return (
                <g key={s.name}>
                  {(spec.area || stacked) && (
                    <path d={areaPath} fill={seriesColor(si)} opacity={stacked ? 0.85 : 0.14} />
                  )}
                  {/* pathLength normalises the stroke to 1 unit so the
                      draw-on animation in CSS needs no measured length. */}
                  <path
                    className="line"
                    d={line}
                    pathLength={1}
                    style={{ stroke: seriesColor(si) }}
                  />
                </g>
              );
            })}

          {spec.kind === 'bar' &&
            spec.x.map((_, i) => {
              let cursor = 0;
              return (
                <g key={i}>
                  {spec.series.map((s, si) => {
                    const v = s.values[i] ?? 0;
                    if (stacked) {
                      const y0 = yFor(cursor);
                      cursor += v;
                      const y1 = yFor(cursor);
                      return (
                        <rect
                          key={s.name}
                          className="bar"
                          x={xFor(i) - barWidth / 2}
                          y={y1}
                          width={barWidth}
                          height={Math.max(0, y0 - y1)}
                          fill={seriesColor(si)}
                          rx={2}
                        />
                      );
                    }
                    const w = barWidth / spec.series.length;
                    return (
                      <rect
                        key={s.name}
                        className="bar"
                        x={xFor(i) - barWidth / 2 + si * w}
                        y={yFor(v)}
                        width={Math.max(1, w - 1)}
                        height={Math.max(0, yFor(0) - yFor(v))}
                        fill={seriesColor(si)}
                        rx={2}
                      />
                    );
                  })}
                </g>
              );
            })}

          {hover && (
            <g>
              <line className="crosshair" x1={hover.x} x2={hover.x} y1={pad.top} y2={pad.top + plotH} />
              {spec.kind === 'line' &&
                spec.series.map((s, si) => {
                  const v = stacked
                    ? spec.series.slice(0, si + 1).reduce((sum, ss) => sum + (ss.values[hover.index] ?? 0), 0)
                    : s.values[hover.index] ?? 0;
                  return (
                    <circle
                      key={s.name}
                      className="marker"
                      cx={hover.x}
                      cy={yFor(v)}
                      r={4.5}
                      fill={seriesColor(si)}
                    />
                  );
                })}
            </g>
          )}

          <line className="axis-line" x1={pad.left} x2={width - pad.right} y1={yFor(0)} y2={yFor(0)} />

          {spec.x.map((label, i) =>
            i % labelStep === 0 || i === n - 1 ? (
              <text key={i} className="axis-text" x={xFor(i)} y={height - 8} textAnchor="middle">
                {label}
              </text>
            ) : null,
          )}

          <rect
            className="hit"
            x={pad.left}
            y={pad.top}
            width={plotW}
            height={plotH}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onTouchStart={onMove}
            onTouchMove={onMove}
            onTouchEnd={() => setHover(null)}
          />
        </svg>

        {hover && (
          <div
            className="chart-tooltip"
            style={{
              left: clampPx(hover.x, 80, width - 80),
              top: pad.top + 4,
            }}
          >
            <div className="t-title">
              {spec.xLabel ? `${t(spec.xLabel)} ` : ''}
              {spec.x[hover.index]}
            </div>
            {spec.series.map((s, si) => (
              <div className="t-row" key={s.name}>
                <span
                  className="sw"
                  style={{
                    background: seriesColor(si),
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    display: 'inline-block',
                  }}
                />
                {t(s.name)}
                <span className="t-val">{format(s.values[hover.index] ?? 0)}</span>
              </div>
            ))}
            {stacked && spec.series.length > 1 && (
              <div className="t-row" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                Total
                <span className="t-val">{format(stackTotals[hover.index] ?? 0)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {spec.series.length > 1 && (
        <div className="legend">
          {spec.series.map((s, si) => (
            <span className="l-item" key={s.name}>
              <span className="sw" style={{ background: seriesColor(si) }} />
              {t(s.name)}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}

const clampPx = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/**
 * The axis top: `count` equal ticks of a round step, just above the peak.
 * Picking the step (not the top) keeps every gridline label round, and the
 * finer step list stops a peak of 5.03 L from stretching the axis to 10 L
 * and leaving half the chart empty.
 */
function niceMax(value: number, count = 4): number {
  if (value <= 0) return 1;
  const raw = value / count;
  const base = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * base >= raw * (1 - 1e-9)) ?? 10;
  return unit * base * count;
}

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

function DonutChart({ spec }: { spec: Extract<ChartSpec, { kind: 'donut' }> }) {
  const t = useT();
  const [active, setActive] = useState<number | null>(null);
  const format = spec.format ?? formatINRCompact;

  const data = spec.data.filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);

  const size = 172;
  const r = 66;
  const stroke = 26;
  const c = size / 2;

  // A ~2px visual gap between segments, expressed as an angle at this radius.
  const gap = data.length > 1 ? 2 / r : 0;

  let angle = -Math.PI / 2;
  const segments = data.map((d, i) => {
    const share = total > 0 ? d.value / total : 0;
    const sweep = share * Math.PI * 2;
    const path = arcPath(c, c, r, angle + gap / 2, Math.max(angle + gap / 2, angle + sweep - gap / 2));
    angle += sweep;
    return { ...d, share, path, color: seriesColor(i) };
  });

  return (
    <figure className="chart" style={{ margin: 0 }}>
      <figcaption className="section-label" style={{ marginBottom: 10 }}>
        {t(spec.title)}
      </figcaption>
      <div className="donut-wrap">
        <svg className="donut" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${t(spec.title)} breakdown`}>
          {total === 0 && (
            <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          )}
          {segments.map((s, i) => (
            <path
              key={s.label}
              className={`donut-seg${active != null && active !== i ? ' dim' : ''}`}
              d={s.path}
              fill="none"
              stroke={s.color}
              strokeWidth={active === i ? stroke + 4 : stroke}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <title>{`${s.label}: ${format(s.value)}`}</title>
            </path>
          ))}
          <text className="donut-center-value" x={c} y={c + 2}>
            {active != null ? format(segments[active].value) : format(total)}
          </text>
          <text className="donut-center-label" x={c} y={c + 18}>
            {active != null ? t(segments[active].label) : t(spec.centerLabel ?? 'Total')}
          </text>
        </svg>

        <div className="donut-legend">
          <table className="legend-table">
            <tbody>
              {segments.map((s, i) => (
                <tr
                  key={s.label}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                >
                  <td>
                    <span className="sw" style={{ background: s.color }} /> {t(s.label)}
                  </td>
                  <td className="val">{format(s.value)}</td>
                  <td className="pct">{(s.share * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </figure>
  );
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  // A full circle cannot be drawn with a single arc — nudge the sweep.
  const sweep = Math.min(end - start, Math.PI * 2 - 0.0001);
  const e = start + sweep;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const large = sweep > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}
