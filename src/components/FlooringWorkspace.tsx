import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Field, WorkspaceProps } from '@/calculators/types';
import {
  MAX_ROOMS,
  calculateFlooringEstimate,
  calculateRoomArea,
  validateFlooring,
  type AppliesTo,
  type AreaEntry,
  type FlooringInput,
  type FlooringResult,
  type LengthUnit,
  type RiserUnit,
} from '@/engines/flooring';
import {
  blankInput,
  canAddOtherArea,
  defaultState,
  newOtherArea,
  resizeRooms,
  restoreState,
  type FlooringMode,
  type FlooringState,
} from '@/calculators/everyday/flooringModel';
import {
  ESTIMATE_CSV_COLUMNS,
  KIND_LABEL,
  areaSource,
  estimateCsvRows,
  lineLabel,
  lineQuantity,
  lineRate,
  metricNote,
  sqft,
  summaryText,
  workings,
} from '@/calculators/everyday/flooringReport';
import { formatDate, formatINR, formatNumber, formatPercent, toISODate } from '@/lib/format';
import { copyText, downloadCSV, printPage, toCSV } from '@/lib/export';
import { readLocal, writeLocal } from '@/lib/storage';
import { useT } from '@/hooks/PreferencesContext';
import { FieldControl } from './FieldControl';
import { CompositionBar } from './CalcPageParts';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';
import { useToast } from './Toast';

const STORAGE_KEY = 'flooring-estimate';

/**
 * Tile & Marble Flooring Cost Calculator — inputs on the left in numbered
 * sections, the running estimate on the right, and the full written
 * estimate (summary, tables, workings) underneath.
 *
 * Everything is live: each change re-validates and re-prices the whole
 * job. The inputs are kept in this browser so an estimate survives a
 * reload; nothing is sent anywhere.
 */
export function FlooringWorkspace({ heroRef, onHero }: WorkspaceProps) {
  const t = useT();
  const { notify } = useToast();
  const [state, setState] = useState<FlooringState>(() => restoreState(readLocal<unknown>(STORAGE_KEY, null)));
  const { input, mode, projectName } = state;
  const advanced = mode === 'advanced';

  useEffect(() => {
    const timer = window.setTimeout(() => writeLocal(STORAGE_KEY, state), 300);
    return () => window.clearTimeout(timer);
  }, [state]);

  const setInput = (fn: (i: FlooringInput) => FlooringInput) => setState((s) => ({ ...s, input: fn(s.input) }));
  function patch<K extends PatchKey>(key: K, part: Partial<FlooringInput[K]>) {
    setInput((i) => ({ ...i, [key]: { ...i[key], ...part } }));
  }

  const issues = useMemo(() => validateFlooring(input), [input]);
  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const i of issues) map[i.path] ??= i.message;
    return map;
  }, [issues]);
  const err = (path: string) => (errors[path] ? t(errors[path]) : undefined);
  const valid = issues.length === 0;
  // Always priced, so section totals keep moving while one field is wrong;
  // the estimate itself is shown only when every input is valid.
  const r = useMemo(() => calculateFlooringEstimate(input), [input]);

  useEffect(() => {
    onHero(
      valid
        ? {
            label: 'Grand total',
            value: formatINR(r.grandTotal),
            caption: r.averagePerSqft != null ? `${formatINR(r.averagePerSqft)} per sq ft` : undefined,
          }
        : null,
    );
  }, [valid, r.grandTotal, r.averagePerSqft, onHero]);

  const today = useMemo(() => new Date(), []);
  const both = input.tile.enabled && input.marble.enabled;

  /* ---------------- Area helpers ---------------- */

  const setEntry = (kind: 'rooms' | 'otherAreas', index: number, entry: AreaEntry) =>
    setInput((i) => ({ ...i, [kind]: i[kind].map((e, k) => (k === index ? entry : e)) }));

  const setFlooring = (which: 'tile' | 'marble', on: boolean) =>
    setInput((i) => {
      const tile = { ...i.tile, enabled: which === 'tile' ? on : i.tile.enabled };
      const marble = { ...i.marble, enabled: which === 'marble' ? on : i.marble.enabled };
      // Turning on the second material: start it on whatever floor the
      // first leaves free, so the split never opens in an error.
      if (on && tile.enabled && marble.enabled) {
        const keep = Math.min(Math.max(0, which === 'tile' ? i.marble.area : i.tile.area), r.totalArea);
        const rest = Math.max(0, r.totalArea - keep);
        tile.area = which === 'tile' ? rest : keep;
        marble.area = which === 'marble' ? rest : keep;
      }
      return { ...i, tile, marble };
    });

  /* ---------------- Section numbering & totals ---------------- */

  const sectionOrder = [
    'area',
    'flooring',
    ...(input.tile.enabled ? ['tile'] : []),
    ...(input.marble.enabled ? ['marble'] : []),
    'stairs',
    'materials',
    ...(advanced ? ['additional'] : []),
  ];
  const num = (id: string) => sectionOrder.indexOf(id) + 1;

  const tileSum = r.tile ? r.tile.materialCost + r.tile.labourCost : 0;
  const marbleSum = r.marble ? r.marble.materialCost + r.marble.labourCost + (r.marble.polishingCost ?? 0) : 0;
  const stairsSum = (r.staircase?.total ?? 0) + (r.riser ? r.riser.materialCost + r.riser.labourCost : 0) + (r.nosing?.cost ?? 0);
  const materialsSum = r.cement.cost + r.sand.cost + r.whiteCement.cost + (r.adhesive?.cost ?? 0) + (r.grout?.cost ?? 0);
  const additionalSum =
    (r.skirting ? r.skirting.materialCost + r.skirting.labourCost : 0) +
    r.transportation +
    r.loadingUnloading +
    r.otherExpenses +
    r.contingency;

  // Advanced items still count in Basic mode; say which, so nothing is hidden.
  const advancedOn = [
    input.marble.enabled && input.marble.polishingEnabled ? t('polishing') : '',
    input.staircase.enabled && input.riser.enabled ? t('risers') : '',
    input.staircase.enabled && input.nosing.enabled ? t('nosing') : '',
    input.tile.enabled && input.adhesive.enabled ? t('adhesive') : '',
    input.grout.enabled ? t('grout') : '',
    input.skirting.enabled ? t('skirting') : '',
    input.additional.transportation > 0 ? t('transportation') : '',
    input.additional.loadingUnloading > 0 ? t('loading / unloading') : '',
    input.additional.other > 0 ? t('other expenses') : '',
  ].filter(Boolean);

  /* ---------------- Actions ---------------- */

  const resetExample = () => {
    setState((s) => ({ ...defaultState(), mode: s.mode }));
    notify(t('Example restored'));
  };
  const startBlank = () => {
    setState((s) => ({ ...s, input: blankInput(), projectName: '' }));
    notify(t('Cleared — enter your own measurements and rates'));
  };
  const onCopy = async () => {
    const ok = await copyText(`${t('Tile & Marble Flooring Cost Calculator')}\n${summaryText(r, input, projectName)}`);
    notify(ok ? t('Result copied') : t('Could not copy'));
  };
  const onCsv = () => {
    const rows = estimateCsvRows(r, input, projectName, toISODate(today));
    const slug = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadCSV(`paisewise-flooring-estimate${slug ? `-${slug}` : ''}`, toCSV(ESTIMATE_CSV_COLUMNS, rows));
    notify(t('CSV downloaded'));
  };

  const actions = (
    <div className="btn-row no-print fl-actions">
      <button type="button" className="btn subtle sm" onClick={onCopy}>
        <Icon name="copy" size={15} />
        {t('Copy')}
      </button>
      <button type="button" className="btn subtle sm" onClick={printPage}>
        <Icon name="printer" size={15} />
        {t('Print / PDF')}
      </button>
      <button type="button" className="btn subtle sm" onClick={onCsv}>
        <Icon name="download" size={15} />
        CSV
      </button>
    </div>
  );

  /* ================================================================ */

  return (
    <>
      <div className="fl-grid" id="calc-tool">
        {/* ------------------------- Inputs ------------------------- */}
        <div className="card accent-top panel-input fl-inputs no-print">
          <div className="card-head fl-head">
            <span className="step-dot" aria-hidden="true">
              1
            </span>
            <span className="section-label">{t('Inputs')}</span>
            <Seg
              className="fl-mode"
              label={t('Detail level')}
              value={mode}
              onChange={(m: FlooringMode) => setState((s) => ({ ...s, mode: m }))}
              options={[
                { value: 'basic', label: t('Basic') },
                { value: 'advanced', label: t('Advanced') },
              ]}
            />
          </div>

          <div className="card-pad fl-form">
            <TextField
              id="fl-project"
              label={t('Project name (optional)')}
              value={projectName}
              placeholder={t('e.g. Sharma residence, ground floor')}
              onChange={(v) => setState((s) => ({ ...s, projectName: v }))}
              maxLength={80}
            />

            {/* 1 · Floor area */}
            <Section id="fl-sec-area" n={num('area')} title={t('Floor area')} summary={sqft(r.totalArea)}>
              <RoomCount value={input.rooms.length} onChange={(n) => setInput((i) => ({ ...i, rooms: resizeRooms(i.rooms, n) }))} />

              {input.rooms.length > 0 && (
                <div className="fl-areas">
                  {input.rooms.map((room, i) => (
                    <AreaCard
                      key={room.id}
                      entry={room}
                      path={`rooms.${i}`}
                      errors={errors}
                      nameEditable
                      onChange={(e) => setEntry('rooms', i, e)}
                    />
                  ))}
                </div>
              )}

              <div className="fl-areas">
                <AreaCard entry={input.hall} path="hall" errors={errors} onChange={(e) => setInput((i) => ({ ...i, hall: e }))} />
                <AreaCard entry={input.kitchen} path="kitchen" errors={errors} onChange={(e) => setInput((i) => ({ ...i, kitchen: e }))} />
              </div>

              <div className="fl-sub">
                <div className="fl-sub-head">
                  <h3>{t('Other areas')}</h3>
                  <span className="small muted">{t('Dining, lobby, balcony, passage, store, pooja room…')}</span>
                </div>
                {input.otherAreas.length > 0 && (
                  <div className="fl-areas">
                    {input.otherAreas.map((o, i) => (
                      <AreaCard
                        key={o.id}
                        entry={o}
                        path={`otherAreas.${i}`}
                        errors={errors}
                        nameEditable
                        onChange={(e) => setEntry('otherAreas', i, e)}
                        onRemove={() => setInput((s) => ({ ...s, otherAreas: s.otherAreas.filter((_, k) => k !== i) }))}
                      />
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="btn outline sm fl-add"
                  disabled={!canAddOtherArea(input.otherAreas)}
                  onClick={() => setInput((s) => ({ ...s, otherAreas: [...s.otherAreas, newOtherArea(s.otherAreas)] }))}
                >
                  <span aria-hidden="true">+</span> {t('Add another area')}
                </button>
              </div>

              <div className="fl-total" role="status">
                <span className="fl-total-label">{t('Total flooring area')}</span>
                <span className="fl-total-value num">{sqft(r.totalArea)}</span>
              </div>
            </Section>

            {/* 2 · Flooring selection */}
            <Section
              id="fl-sec-flooring"
              n={num('flooring')}
              title={t('What flooring are you using?')}
              summary={both ? t('Tile + Marble') : input.tile.enabled ? t('Tile') : input.marble.enabled ? t('Marble') : '—'}
            >
              <div className="fl-pick" role="group" aria-label={t('Flooring')}>
                <Toggle
                  checked={input.tile.enabled}
                  onChange={(on) => setFlooring('tile', on)}
                  label={t('Tile')}
                  hint={t('Any tile — you enter the rate you are quoted')}
                />
                <Toggle
                  checked={input.marble.enabled}
                  onChange={(on) => setFlooring('marble', on)}
                  label={t('Marble')}
                  hint={t('Any marble or stone — at your supplier’s rate')}
                />
              </div>
              {errors.flooring && <InlineError message={t(errors.flooring)} />}

              {both ? (
                <>
                  <div className="fields">
                    <Num path="tile.area" label="Tile area" unit="sq ft" value={input.tile.area} error={err('tile.area')} onChange={(v) => patch('tile', { area: v })} />
                    <Num path="marble.area" label="Marble area" unit="sq ft" value={input.marble.area} error={err('marble.area')} onChange={(v) => patch('marble', { area: v })} />
                  </div>
                  <AllocationTable r={r} />
                  {errors.allocation && <InlineError message={t(errors.allocation)} />}
                  {(r.allocation.excess > 0 || r.allocation.remaining > 0.005) && r.totalArea > 0 && (
                    <div className="btn-row fl-fit">
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => patch('marble', { area: Math.max(0, r.totalArea - Math.min(input.tile.area, r.totalArea)) })}
                      >
                        {t('Marble takes the rest')}
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => patch('tile', { area: Math.max(0, r.totalArea - Math.min(input.marble.area, r.totalArea)) })}
                      >
                        {t('Tile takes the rest')}
                      </button>
                    </div>
                  )}
                </>
              ) : input.tile.enabled || input.marble.enabled ? (
                <p className="fl-readout">
                  <Icon name="check" size={14} strokeWidth={2.4} />
                  {input.tile.enabled ? t('Tile covers the whole floor:') : t('Marble covers the whole floor:')}{' '}
                  <strong className="num">{sqft(r.totalArea)}</strong>
                </p>
              ) : null}
            </Section>

            {/* 3 · Tile */}
            {input.tile.enabled && (
              <Section id="fl-sec-tile" n={num('tile')} title={t('Tile cost')} summary={formatINR(tileSum)}>
                <div className="fields">
                  <Num path="tile.rate" label="Tile rate" type="currency" unit="/ sq ft" value={input.tile.rate} error={err('tile.rate')} onChange={(v) => patch('tile', { rate: v })} help="The price per sq ft your supplier quotes — any tile, any brand." />
                  <Num path="tile.labourRate" label="Tile labour rate" type="currency" unit="/ sq ft" value={input.tile.labourRate} error={err('tile.labourRate')} onChange={(v) => patch('tile', { labourRate: v })} help="Laying charge per sq ft. Paid on the area laid, not on wastage." />
                  <Wastage
                    path="tile.wastage"
                    label="Tile wastage"
                    value={input.tile.wastage}
                    presets={[3, 5, 7, 10]}
                    error={err('tile.wastage')}
                    onChange={(v) => patch('tile', { wastage: v })}
                  />
                </div>
                {r.tile && (
                  <p className="fl-readout">
                    {t('Buy')} <strong className="num">{sqft(r.tile.purchaseArea)}</strong> ({sqft(r.tile.area)} + {formatPercent(r.tile.wastagePct, 2)}) ·{' '}
                    {t('Material')} <strong className="num">{formatINR(r.tile.materialCost)}</strong> · {t('Labour')}{' '}
                    <strong className="num">{formatINR(r.tile.labourCost)}</strong>
                  </p>
                )}
              </Section>
            )}

            {/* 4 · Marble */}
            {input.marble.enabled && (
              <Section id="fl-sec-marble" n={num('marble')} title={t('Marble cost')} summary={formatINR(marbleSum)}>
                <div className="fields">
                  <Num path="marble.rate" label="Marble rate" type="currency" unit="/ sq ft" value={input.marble.rate} error={err('marble.rate')} onChange={(v) => patch('marble', { rate: v })} help="The price per sq ft you are quoted — any marble or stone." />
                  <Num path="marble.labourRate" label="Marble labour rate" type="currency" unit="/ sq ft" value={input.marble.labourRate} error={err('marble.labourRate')} onChange={(v) => patch('marble', { labourRate: v })} help="Laying charge per sq ft. Paid on the area laid, not on wastage." />
                  <Wastage
                    path="marble.wastage"
                    label="Marble wastage"
                    value={input.marble.wastage}
                    presets={[5, 7, 10]}
                    error={err('marble.wastage')}
                    onChange={(v) => patch('marble', { wastage: v })}
                  />
                </div>
                {r.marble && (
                  <p className="fl-readout">
                    {t('Buy')} <strong className="num">{sqft(r.marble.purchaseArea)}</strong> ({sqft(r.marble.area)} + {formatPercent(r.marble.wastagePct, 2)}) ·{' '}
                    {t('Material')} <strong className="num">{formatINR(r.marble.materialCost)}</strong> · {t('Labour')}{' '}
                    <strong className="num">{formatINR(r.marble.labourCost)}</strong>
                  </p>
                )}

                {advanced && (
                  <Optional
                    checked={input.marble.polishingEnabled}
                    onChange={(on) => patch('marble', { polishingEnabled: on })}
                    label={t('Marble grinding & polishing')}
                    hint={t('Charged on the marble area, without wastage')}
                  >
                    <div className="fields">
                      <Num path="marble.polishingRate" label="Polishing rate" type="currency" unit="/ sq ft" value={input.marble.polishingRate} error={err('marble.polishingRate')} onChange={(v) => patch('marble', { polishingRate: v })} />
                    </div>
                    {r.marble?.polishingCost != null && (
                      <p className="fl-readout">
                        {sqft(r.marble.area)} × {rateText(input.marble.polishingRate)} = <strong className="num">{formatINR(r.marble.polishingCost)}</strong>
                      </p>
                    )}
                  </Optional>
                )}
              </Section>
            )}

            {/* 5 · Staircase */}
            <Section
              id="fl-sec-stairs"
              n={num('stairs')}
              title={t('Marble staircase')}
              summary={input.staircase.enabled ? formatINR(stairsSum) : t('Not included')}
            >
              <Optional
                checked={input.staircase.enabled}
                onChange={(on) => patch('staircase', { enabled: on })}
                label={t('Include a marble staircase')}
                hint={t('Priced per step — kept out of the floor area')}
              >
                <div className="note">
                  <Icon name="info" size={16} className="i" />
                  <div>
                    {t('Enter the number of steps and the width of each step separately. A “12 ft staircase” means steps 12 ft wide — not 12 steps.')}
                  </div>
                </div>
                <div className="fields">
                  <Num path="staircase.steps" label="Number of steps" unit="steps" value={input.staircase.steps} error={err('staircase.steps')} onChange={(v) => patch('staircase', { steps: v })} />
                  <Num path="staircase.baseCostPerStep" label="Cost per step at base width" type="currency" value={input.staircase.baseCostPerStep} error={err('staircase.baseCostPerStep')} onChange={(v) => patch('staircase', { baseCostPerStep: v })} help="The price your contractor quotes for one step of the base width." />
                  <LengthField
                    path="staircase.width"
                    label="Step width"
                    value={input.staircase.width}
                    unit={input.staircase.widthUnit}
                    error={err('staircase.width')}
                    onChange={(v) => patch('staircase', { width: v })}
                    onUnit={(u) => patch('staircase', { widthUnit: u as LengthUnit })}
                    help="How wide each step is, side to side."
                  />
                  <LengthField
                    path="staircase.baseWidth"
                    label="Base step width"
                    value={input.staircase.baseWidth}
                    unit={input.staircase.baseWidthUnit}
                    error={err('staircase.baseWidth')}
                    onChange={(v) => patch('staircase', { baseWidth: v })}
                    onUnit={(u) => patch('staircase', { baseWidthUnit: u as LengthUnit })}
                    help="The width the per-step price is quoted for. Usually 3 ft."
                  />
                </div>
                {r.staircase && (
                  <div className="fl-calc-line">
                    <span>
                      {t('Cost per step')} <strong className="num">{rateText(r.staircase.costPerStep)}</strong>
                    </span>
                    <span>
                      {t('Number of steps')} <strong className="num">{formatNumber(r.staircase.steps)}</strong>
                    </span>
                    <span>
                      {t('Total staircase cost')} <strong className="num">{formatINR(r.staircase.total)}</strong>
                    </span>
                  </div>
                )}

                {advanced && (
                  <>
                    <Optional
                      checked={input.riser.enabled}
                      onChange={(on) =>
                        patch('riser', on ? { enabled: true, count: input.staircase.steps, width: input.staircase.width, widthUnit: input.staircase.widthUnit } : { enabled: false })
                      }
                      label={t('Riser')}
                      hint={t('The vertical face of each step, priced by area')}
                    >
                      <div className="fields">
                        <Num path="riser.count" label="Number of risers" value={input.riser.count} error={err('riser.count')} onChange={(v) => patch('riser', { count: v })} />
                        <LengthField
                          path="riser.height"
                          label="Riser height"
                          value={input.riser.height}
                          unit={input.riser.heightUnit}
                          units={RISER_UNITS}
                          error={err('riser.height')}
                          onChange={(v) => patch('riser', { height: v })}
                          onUnit={(u) => patch('riser', { heightUnit: u })}
                        />
                        <LengthField
                          path="riser.width"
                          label="Riser width"
                          value={input.riser.width}
                          unit={input.riser.widthUnit}
                          units={RISER_UNITS}
                          error={err('riser.width')}
                          onChange={(v) => patch('riser', { width: v })}
                          onUnit={(u) => patch('riser', { widthUnit: u })}
                        />
                        <Num path="riser.materialRate" label="Marble rate" type="currency" unit="/ sq ft" value={input.riser.materialRate} error={err('riser.materialRate')} onChange={(v) => patch('riser', { materialRate: v })} />
                        <Num path="riser.labourRate" label="Labour rate" type="currency" unit="/ sq ft" value={input.riser.labourRate} error={err('riser.labourRate')} onChange={(v) => patch('riser', { labourRate: v })} />
                      </div>
                      {r.riser && (
                        <p className="fl-readout">
                          {t('Riser area')} <strong className="num">{sqft(r.riser.area)}</strong> · {t('Material')}{' '}
                          <strong className="num">{formatINR(r.riser.materialCost)}</strong> · {t('Labour')}{' '}
                          <strong className="num">{formatINR(r.riser.labourCost)}</strong>
                        </p>
                      )}
                    </Optional>

                    <Optional
                      checked={input.nosing.enabled}
                      onChange={(on) =>
                        patch('nosing', on ? { enabled: true, steps: input.staircase.steps, lengthPerStep: input.staircase.width, lengthUnit: input.staircase.widthUnit } : { enabled: false })
                      }
                      label={t('Step nosing / edge')}
                      hint={t('Edge profiling, priced per running foot')}
                    >
                      <div className="fields">
                        <Num path="nosing.steps" label="Number of steps" value={input.nosing.steps} error={err('nosing.steps')} onChange={(v) => patch('nosing', { steps: v })} />
                        <LengthField
                          path="nosing.lengthPerStep"
                          label="Nosing length per step"
                          value={input.nosing.lengthPerStep}
                          unit={input.nosing.lengthUnit}
                          error={err('nosing.lengthPerStep')}
                          onChange={(v) => patch('nosing', { lengthPerStep: v })}
                          onUnit={(u) => patch('nosing', { lengthUnit: u as LengthUnit })}
                        />
                        <Num path="nosing.ratePerFt" label="Rate" type="currency" unit="/ running ft" value={input.nosing.ratePerFt} error={err('nosing.ratePerFt')} onChange={(v) => patch('nosing', { ratePerFt: v })} />
                      </div>
                      {r.nosing && (
                        <p className="fl-readout">
                          {formatNumber(r.nosing.totalLength, 2)} {t('running ft')} · <strong className="num">{formatINR(r.nosing.cost)}</strong>
                        </p>
                      )}
                    </Optional>
                  </>
                )}
              </Optional>
            </Section>

            {/* 6 · Materials */}
            <Section id="fl-sec-materials" n={num('materials')} title={t('Materials')} summary={formatINR(materialsSum)}>
              <div className="fields">
                <Num path="materials.cementRate" label="Cement rate" type="currency" unit="/ bag" value={input.materials.cementRate} error={err('materials.cementRate')} onChange={(v) => patch('materials', { cementRate: v })} />
                <Num path="materials.sandRate" label="Sand rate" type="currency" unit="/ CFT" value={input.materials.sandRate} error={err('materials.sandRate')} onChange={(v) => patch('materials', { sandRate: v })} />
                <Num path="materials.whiteCementRate" label="White cement rate" type="currency" unit="/ kg" value={input.materials.whiteCementRate} error={err('materials.whiteCementRate')} onChange={(v) => patch('materials', { whiteCementRate: v })} />
              </div>
              <div className="fl-estimates">
                <EstimateChip label={t('Cement')} qty={`${formatNumber(r.cement.quantity)} ${t('bags')}`} cost={r.cement.cost} />
                <EstimateChip label={t('Sand')} qty={`${formatNumber(r.sand.quantity, 2)} CFT`} cost={r.sand.cost} />
                <EstimateChip label={t('White cement')} qty={`${formatNumber(r.whiteCement.quantity, 2)} kg`} cost={r.whiteCement.cost} />
              </div>

              {advanced && (
                <div className="fl-sub">
                  <div className="fl-sub-head">
                    <h3>{t('Consumption per sq ft')}</h3>
                    <span className="small muted">{t('Suggested defaults — editable')}</span>
                  </div>
                  <div className="fields">
                    <Num path="materials.cementPerSqft" label="Cement" unit="bags / sq ft" value={input.materials.cementPerSqft} error={err('materials.cementPerSqft')} onChange={(v) => patch('materials', { cementPerSqft: v })} help="0.02 bag per sq ft is about one 50 kg bag for every 50 sq ft of mortar-bed flooring." />
                    <Num path="materials.sandPerSqft" label="Sand" unit="CFT / sq ft" value={input.materials.sandPerSqft} error={err('materials.sandPerSqft')} onChange={(v) => patch('materials', { sandPerSqft: v })} help="0.1 CFT per sq ft is roughly a 1-inch mortar bed." />
                    <Num path="materials.whiteCementPerSqft" label="White cement" unit="kg / sq ft" value={input.materials.whiteCementPerSqft} error={err('materials.whiteCementPerSqft')} onChange={(v) => patch('materials', { whiteCementPerSqft: v })} help="Used for joint filling. About 1 kg for every 30–35 sq ft." />
                  </div>
                  {both && (
                    <div className="fl-applies">
                      <AppliesSeg label={t('Cement goes under')} value={input.materials.cementAppliesTo} onChange={(v) => patch('materials', { cementAppliesTo: v })} />
                      <AppliesSeg label={t('Sand goes under')} value={input.materials.sandAppliesTo} onChange={(v) => patch('materials', { sandAppliesTo: v })} />
                      <AppliesSeg label={t('White cement goes under')} value={input.materials.whiteCementAppliesTo} onChange={(v) => patch('materials', { whiteCementAppliesTo: v })} />
                    </div>
                  )}

                  <Optional
                    checked={input.adhesive.enabled}
                    onChange={(on) => patch('adhesive', { enabled: on })}
                    label={t('Tile adhesive')}
                    hint={input.tile.enabled ? t('Bags rounded up to a whole bag') : t('Applies to tile — select tile above')}
                  >
                    <div className="fields">
                      <Num path="adhesive.pricePerBag" label="Price per bag" type="currency" value={input.adhesive.pricePerBag} error={err('adhesive.pricePerBag')} onChange={(v) => patch('adhesive', { pricePerBag: v })} />
                      <Num path="adhesive.coveragePerBag" label="Coverage per bag" unit="sq ft / bag" value={input.adhesive.coveragePerBag} error={err('adhesive.coveragePerBag')} onChange={(v) => patch('adhesive', { coveragePerBag: v })} help="The bag label states it; a 20 kg bag usually covers 35–50 sq ft." />
                    </div>
                    {r.adhesive && (
                      <p className="fl-readout">
                        {sqft(r.adhesive.area)} ÷ {formatNumber(r.adhesive.coverage, 2)} = {formatNumber(r.adhesive.exactBags, 2)} → <strong className="num">{formatNumber(r.adhesive.bags)} {t('bags')}</strong> · <strong className="num">{formatINR(r.adhesive.cost)}</strong>
                      </p>
                    )}
                  </Optional>

                  <Optional
                    checked={input.grout.enabled}
                    onChange={(on) => patch('grout', { enabled: on })}
                    label={t('Grout')}
                    hint={t('Joint filler, estimated in kg')}
                  >
                    <div className="fields">
                      <Num path="grout.ratePerKg" label="Grout rate" type="currency" unit="/ kg" value={input.grout.ratePerKg} error={err('grout.ratePerKg')} onChange={(v) => patch('grout', { ratePerKg: v })} />
                      <Num path="grout.kgPerSqft" label="Grout consumption" unit="kg / sq ft" value={input.grout.kgPerSqft} error={err('grout.kgPerSqft')} onChange={(v) => patch('grout', { kgPerSqft: v })} help="Depends on tile size and joint width; 0.025 kg per sq ft suits 2 × 2 ft tiles with 2–3 mm joints." />
                    </div>
                    {both && <AppliesSeg label={t('Grout goes on')} value={input.grout.appliesTo} onChange={(v) => patch('grout', { appliesTo: v })} />}
                    {r.grout && (
                      <p className="fl-readout">
                        {sqft(r.grout.area)} → <strong className="num">{formatNumber(r.grout.quantity, 2)} kg</strong> · <strong className="num">{formatINR(r.grout.cost)}</strong>
                      </p>
                    )}
                  </Optional>
                </div>
              )}

              <p className="fl-fine">
                <Icon name="info" size={13} />
                {t('Material quantities are estimated using configurable consumption assumptions. Actual quantities may vary depending on site conditions and installation method.')}
              </p>
            </Section>

            {/* 7 · Additional costs */}
            {advanced && (
              <Section id="fl-sec-additional" n={num('additional')} title={t('Additional costs')} summary={formatINR(additionalSum)}>
                <Optional
                  checked={input.skirting.enabled}
                  onChange={(on) => patch('skirting', { enabled: on })}
                  label={t('Skirting')}
                  hint={t('The strip along the foot of the walls, per running foot')}
                >
                  <Seg
                    label={t('Skirting length')}
                    value={input.skirting.mode}
                    onChange={(v: 'auto' | 'manual') => patch('skirting', { mode: v })}
                    options={[
                      { value: 'auto', label: t('From rooms') },
                      { value: 'manual', label: t('Enter length') },
                    ]}
                  />
                  <div className="fields">
                    {input.skirting.mode === 'manual' && (
                      <LengthField
                        path="skirting.runningLength"
                        label="Total running length"
                        value={input.skirting.runningLength}
                        unit={input.skirting.runningUnit}
                        error={err('skirting.runningLength')}
                        onChange={(v) => patch('skirting', { runningLength: v })}
                        onUnit={(u) => patch('skirting', { runningUnit: u as LengthUnit })}
                      />
                    )}
                    <LengthField
                      path="skirting.openings"
                      label="Doors & openings to deduct"
                      value={input.skirting.openings}
                      unit={input.skirting.openingsUnit}
                      error={err('skirting.openings')}
                      onChange={(v) => patch('skirting', { openings: v })}
                      onUnit={(u) => patch('skirting', { openingsUnit: u as LengthUnit })}
                      help="The total width of doors and other openings, where no skirting goes."
                    />
                    <div className="field">
                      <span className="field-label">{t('Skirting material')}</span>
                      <Seg
                        label={t('Skirting material')}
                        value={input.skirting.material}
                        onChange={(v: 'tile' | 'marble') => patch('skirting', { material: v })}
                        options={[
                          { value: 'tile', label: t('Tile') },
                          { value: 'marble', label: t('Marble') },
                        ]}
                      />
                    </div>
                    <Num path="skirting.materialRate" label="Material rate" type="currency" unit="/ running ft" value={input.skirting.materialRate} error={err('skirting.materialRate')} onChange={(v) => patch('skirting', { materialRate: v })} />
                    <Num path="skirting.labourRate" label="Labour rate" type="currency" unit="/ running ft" value={input.skirting.labourRate} error={err('skirting.labourRate')} onChange={(v) => patch('skirting', { labourRate: v })} />
                  </div>
                  {r.skirting && (
                    <>
                      <p className="fl-readout">
                        {input.skirting.mode === 'auto' ? t('Perimeter') : t('Length')} {formatNumber(r.skirting.grossFt, 2)} ft − {formatNumber(r.skirting.openingsFt, 2)} ft ={' '}
                        <strong className="num">
                          {formatNumber(r.skirting.netFt, 2)} {t('running ft')}
                        </strong>{' '}
                        · <strong className="num">{formatINR(r.skirting.materialCost + r.skirting.labourCost)}</strong>
                      </p>
                      {input.skirting.mode === 'auto' && r.skirting.unmeasured.length > 0 && (
                        <p className="fl-fine">
                          <Icon name="info" size={13} />
                          {t('Not counted (entered by area, so the perimeter is unknown):')} {r.skirting.unmeasured.join(', ')}
                        </p>
                      )}
                    </>
                  )}
                </Optional>

                <div className="fields">
                  <Num path="additional.transportation" label="Transportation" type="currency" value={input.additional.transportation} error={err('additional.transportation')} onChange={(v) => patch('additional', { transportation: v })} />
                  <Num path="additional.loadingUnloading" label="Loading / unloading" type="currency" value={input.additional.loadingUnloading} error={err('additional.loadingUnloading')} onChange={(v) => patch('additional', { loadingUnloading: v })} />
                  <Num path="additional.other" label="Other expenses" type="currency" value={input.additional.other} error={err('additional.other')} onChange={(v) => patch('additional', { other: v })} />
                  <TextField
                    id="fl-other-note"
                    label={t('Other expenses — description')}
                    value={input.additional.otherNote}
                    placeholder={t('e.g. site cleaning, material shifting')}
                    onChange={(v) => patch('additional', { otherNote: v })}
                    maxLength={120}
                  />
                </div>

                <div className="fields">
                  <Wastage
                    path="contingencyPct"
                    label="Contingency"
                    value={input.contingencyPct}
                    presets={[0, 3, 5, 7, 10]}
                    error={err('contingencyPct')}
                    onChange={(v) => setInput((i) => ({ ...i, contingencyPct: v }))}
                    help="A cushion for price changes, breakage and small extras, worked on every cost above."
                  />
                </div>
                <p className="fl-readout">
                  {formatPercent(r.contingencyPct, 2)} × {t('eligible cost')} {formatINR(r.subtotal)} = <strong className="num">{formatINR(r.contingency)}</strong>
                </p>
              </Section>
            )}

            {!advanced && (
              <p className="fl-fine">
                <Icon name="info" size={13} />
                {t('Contingency of {pct} is included.').replace('{pct}', formatPercent(input.contingencyPct, 2))}{' '}
                {advancedOn.length > 0 && <>{t('Also included from Advanced:')} {advancedOn.join(', ')}. </>}
                <button type="button" className="fl-link" onClick={() => setState((s) => ({ ...s, mode: 'advanced' }))}>
                  {t('Switch to Advanced')}
                </button>{' '}
                {t('for skirting, adhesive, grout, polishing, risers, transport and contingency.')}
              </p>
            )}

            <div className="btn-row live-row">
              <span className="live-note">
                <Icon name="refresh" size={14} className="i" />
                {t('Results update as you type')}
              </span>
              <span className="btn-row">
                <button type="button" className="btn ghost sm" onClick={startBlank}>
                  {t('Start blank')}
                </button>
                <button type="button" className="btn ghost sm" onClick={resetExample}>
                  <Icon name="refresh" size={15} />
                  {t('Reset')}
                </button>
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------- Running estimate ------------------------- */}
        <aside className="fl-side no-print" aria-label={t('Estimate')}>
          <div className="card accent-top panel-result fl-result" id="calc-result">
            <div className="card-head">
              <span className="step-dot" aria-hidden="true">
                2
              </span>
              <span className="section-label">{t('Estimate')}</span>
            </div>
            <div className="card-pad stack">
              {valid ? (
                <>
                  <div ref={heroRef} className="anim-zoom">
                    <div className="hero-result">
                      <div className="h-label">{t('Grand total')}</div>
                      <div className={`h-value num value-in${formatINR(r.grandTotal).length > 13 ? ' xs' : formatINR(r.grandTotal).length > 10 ? ' sm' : ''}`}>
                        {formatINR(r.grandTotal)}
                      </div>
                      <div className="h-caption">
                        {r.averagePerSqft != null
                          ? `${formatINR(r.averagePerSqft, 2)} ${t('average per sq ft')} · ${sqft(r.totalArea)}`
                          : t('Add the floor area to see the cost per sq ft')}
                      </div>
                    </div>
                  </div>

                  <div className="stat-grid">
                    <Stat label={t('Total flooring area')} value={sqft(r.totalArea)} tone="accent" />
                    {r.tile && <Stat label={t('Tile area')} value={sqft(r.allocation.tileArea)} />}
                    {r.marble && <Stat label={t('Marble area')} value={sqft(r.allocation.marbleArea)} />}
                    <Stat
                      label={t('Average cost per sq ft')}
                      value={r.averagePerSqft != null ? formatINR(r.averagePerSqft, 2) : '—'}
                      help={t('Grand total ÷ total flooring area (not the purchase area after wastage). The staircase is included in the total but not in the area.')}
                    />
                  </div>

                  <CompositionBar
                    spec={{
                      kind: 'donut',
                      title: 'Where the money goes',
                      data: [
                        { label: 'Material', value: r.byKind.material },
                        { label: 'Labour', value: r.byKind.labour },
                        { label: 'Other costs', value: r.byKind.other },
                        { label: 'Contingency', value: r.contingency },
                      ],
                      format: (n) => formatINR(n),
                    }}
                  />

                  <SplitList r={r} />

                  {actions}
                </>
              ) : (
                <div className="result-placeholder fl-issues">
                  <span className="p-ring">
                    <Icon name="alert" size={24} />
                  </span>
                  <span className="p-title">{t('Fix these to see your estimate')}</span>
                  <ul>
                    {issues.slice(0, 6).map((i) => (
                      <li key={i.path}>{t(i.message)}</li>
                    ))}
                    {issues.length > 6 && <li>{t('…and {n} more').replace('{n}', String(issues.length - 6))}</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {valid && (
        <>
          <EstimateSummary r={r} input={input} projectName={projectName} date={today} actions={actions} />
          <Breakdown r={r} input={input} />
          <Workings r={r} input={input} />
        </>
      )}

      <p className="note warn fl-disclaimer">
        <Icon name="alert" size={16} className="i" />
        <span>
          <strong>{t('Estimate only:')}</strong>{' '}
          {t(
            'Material quantities such as cement, sand, white cement, adhesive and grout are estimated using configurable assumptions. Actual requirements may vary based on site conditions, floor level, surface preparation, material thickness, installation method and contractor practices. Always verify quantities with your contractor before purchasing materials.',
          )}
        </span>
      </p>
    </>
  );
}

/** Rates keep their paise when they have any: ₹1,093.61 a step, ₹30 a sq ft. */
const rateText = (v: number) => formatINR(v, Number.isInteger(Math.round(v * 100) / 100) ? 0 : 2);

/** "20.00" — measurements in the room cards always show two decimals. */
const fixed2 = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PatchKey = 'tile' | 'marble' | 'staircase' | 'riser' | 'nosing' | 'materials' | 'adhesive' | 'grout' | 'skirting' | 'additional';

const RISER_UNITS: { value: RiserUnit; label: string }[] = [
  { value: 'in', label: 'in' },
  { value: 'ft', label: 'ft' },
  { value: 'm', label: 'm' },
];
const LENGTH_UNITS: { value: RiserUnit; label: string }[] = [
  { value: 'ft', label: 'Feet' },
  { value: 'm', label: 'Metre' },
];

/* ================================================================== */
/* Estimate blocks                                                     */
/* ================================================================== */

function AllocationTable({ r }: { r: FlooringResult }) {
  const t = useT();
  const { tileArea, marbleArea, remaining } = r.allocation;
  return (
    <div className="table-scroll fl-table-wrap">
      <table className="data fl-table">
        <caption className="sr-only">{t('Area allocation')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('Flooring')}</th>
            <th scope="col">{t('Area')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{t('Tile')}</th>
            <td className="num">{sqft(tileArea)}</td>
          </tr>
          <tr>
            <th scope="row">{t('Marble')}</th>
            <td className="num">{sqft(marbleArea)}</td>
          </tr>
          <tr className={remaining < 0 ? 'fl-over' : undefined}>
            <th scope="row">{remaining < 0 ? t('Over by') : t('Remaining')}</th>
            <td className="num">{sqft(Math.abs(remaining))}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>{t('Total')}</td>
            <td className="num">{sqft(r.totalArea)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Material · Labour · Other · Contingency · Grand total — where the money goes, in one glance. */
function SplitList({ r }: { r: FlooringResult }) {
  const t = useT();
  return (
    <dl className="fl-split">
      {(['material', 'labour', 'other'] as const).map((k) => (
        <div key={k}>
          <dt>{t(KIND_LABEL[k])}</dt>
          <dd className="num">{formatINR(r.byKind[k])}</dd>
        </div>
      ))}
      <div>
        <dt>
          {t('Contingency')} ({formatPercent(r.contingencyPct, 2)})
        </dt>
        <dd className="num">{formatINR(r.contingency)}</dd>
      </div>
      <div className="fl-split-total">
        <dt>{t('Grand total')}</dt>
        <dd className="num">{formatINR(r.grandTotal)}</dd>
      </div>
    </dl>
  );
}

function EstimateSummary({
  r,
  input,
  projectName,
  date,
  actions,
}: {
  r: FlooringResult;
  input: FlooringInput;
  projectName: string;
  date: Date;
  actions: ReactNode;
}) {
  const t = useT();
  return (
    <section className="calc-block" id="fl-estimate" aria-labelledby="fl-estimate-head">
      <div className="card fl-summary">
        <div className="fl-summary-head">
          <div>
            <p className="eyebrow">{t('Complete cost summary')}</p>
            <h2 id="fl-estimate-head">{projectName.trim() || t('Flooring estimate')}</h2>
            <p className="small muted">
              {t('Prepared on')} {formatDate(date)}
            </p>
          </div>
          {actions}
        </div>

        <div className="fl-summary-areas">
          <div>
            <span>{t('Total flooring area')}</span>
            <strong className="num">{sqft(r.totalArea)}</strong>
          </div>
          {r.tile && (
            <div>
              <span>{t('Tile area')}</span>
              <strong className="num">{sqft(r.allocation.tileArea)}</strong>
            </div>
          )}
          {r.marble && (
            <div>
              <span>{t('Marble area')}</span>
              <strong className="num">{sqft(r.allocation.marbleArea)}</strong>
            </div>
          )}
          {r.staircase && (
            <div>
              <span>{t('Staircase')}</span>
              <strong className="num">
                {formatNumber(r.staircase.steps)} {t('steps')}
              </strong>
            </div>
          )}
        </div>

        <ul className="fl-summary-lines">
          {r.lines.map((l) => (
            <li key={l.key}>
              <span className="fl-sl-label">
                {t(lineLabel(l, r, input))}
                {l.quantity != null && (
                  <span className="fl-sl-sub">
                    {lineQuantity(l)} × {lineRate(l)}
                  </span>
                )}
              </span>
              <span className="fl-sl-value num">{formatINR(l.cost)}</span>
            </li>
          ))}
          <li className="fl-sl-subtotal">
            <span className="fl-sl-label">{t('Subtotal')}</span>
            <span className="fl-sl-value num">{formatINR(r.subtotal)}</span>
          </li>
          <li>
            <span className="fl-sl-label">
              {t('Contingency')}
              <span className="fl-sl-sub">
                {formatPercent(r.contingencyPct, 2)} × {formatINR(r.subtotal)}
              </span>
            </span>
            <span className="fl-sl-value num">{formatINR(r.contingency)}</span>
          </li>
        </ul>

        <div className="fl-grand">
          <div>
            <span className="fl-grand-label">{t('Grand total')}</span>
            <span className="fl-grand-value num">{formatINR(r.grandTotal)}</span>
          </div>
          <div>
            <span className="fl-grand-label">{t('Average cost per sq ft')}</span>
            <span className="fl-grand-avg num">{r.averagePerSqft != null ? formatINR(r.averagePerSqft, 2) : '—'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Breakdown({ r, input }: { r: FlooringResult; input: FlooringInput }) {
  const t = useT();
  const c = r.comparison;
  const row = (label: string, a: number, b: number, show = true) =>
    show ? (
      <tr key={label}>
        <th scope="row">{t(label)}</th>
        <td className="num">{r.tile ? formatINR(a) : '—'}</td>
        <td className="num">{r.marble ? formatINR(b) : '—'}</td>
        <td className="num">{formatINR(a + b)}</td>
      </tr>
    ) : null;

  return (
    <section className="calc-block fl-breakdown" aria-label={t('Cost breakdown')}>
      <div className="card">
        <div className="card-head">
          <h3>{t('Material & labour summary')}</h3>
        </div>
        <div className="table-scroll">
          <table className="data fl-table">
            <thead>
              <tr>
                <th scope="col">{t('Item')}</th>
                <th scope="col">{t('Quantity')}</th>
                <th scope="col">{t('Rate')}</th>
                <th scope="col">{t('Cost')}</th>
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.key}>
                  <th scope="row">{t(lineLabel(l, r, input))}</th>
                  <td className="num">{lineQuantity(l)}</td>
                  <td className="num">{lineRate(l)}</td>
                  <td className="num">{formatINR(l.cost)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">
                  {t('Contingency')} ({formatPercent(r.contingencyPct, 2)})
                </th>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">{formatINR(r.contingency)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>{t('Grand total')}</td>
                <td />
                <td />
                <td className="num">{formatINR(r.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="fl-two">
        <div className="card">
          <div className="card-head">
            <h3>{t('Tile vs marble')}</h3>
          </div>
          <div className="table-scroll">
            <table className="data fl-table">
              <thead>
                <tr>
                  <th scope="col">{t('Category')}</th>
                  <th scope="col">{t('Tile')}</th>
                  <th scope="col">{t('Marble')}</th>
                  <th scope="col">{t('Total')}</th>
                </tr>
              </thead>
              <tbody>
                {row('Material', c.tile.material, c.marble.material)}
                {row('Labour', c.tile.labour, c.marble.labour)}
                {row('Wastage', c.tile.wastage, c.marble.wastage)}
                {row('Polishing', c.tile.polishing, c.marble.polishing, !!r.marble?.polishingCost)}
                {row('Staircase, riser & nosing', c.tile.stairs, c.marble.stairs, c.marble.stairs > 0)}
                {row('Other', c.tile.other, c.marble.other, c.tile.other + c.marble.other > 0)}
              </tbody>
              <tfoot>
                <tr>
                  <td>{t('Total')}</td>
                  <td className="num">{r.tile ? formatINR(c.tile.total) : '—'}</td>
                  <td className="num">{r.marble ? formatINR(c.marble.total) : '—'}</td>
                  <td className="num">{formatINR(c.tile.total + c.marble.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="small muted fl-table-note">
            {t('Shared costs — cement, sand, white cement, transport, other expenses — come to {shared}; with contingency the grand total is {total}.')
              .replace('{shared}', formatINR(c.shared))
              .replace('{total}', formatINR(r.grandTotal))}
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{t('Material, labour & other')}</h3>
          </div>
          <div className="card-pad">
            <SplitList r={r} />
            <p className="small muted fl-table-note fl-flush">
              {t('Other costs: the staircase (an all-in per-step rate), transport, loading and other expenses.')}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>{t('Room-wise area')}</h3>
        </div>
        <div className="table-scroll">
          <table className="data fl-table">
            <thead>
              <tr>
                <th scope="col">{t('Area')}</th>
                <th scope="col">{t('Measured as')}</th>
                <th scope="col">{t('Sq ft')}</th>
              </tr>
            </thead>
            <tbody>
              {r.areas.map((a) => (
                <tr key={a.id}>
                  <th scope="row">{t(a.name)}</th>
                  <td className="num">{areaSource(a, input)}</td>
                  <td className="num">{formatNumber(a.sqft, 2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t('Total')}</td>
                <td />
                <td className="num">{formatNumber(r.totalArea, 2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

function Workings({ r, input }: { r: FlooringResult; input: FlooringInput }) {
  const t = useT();
  const metric = r.areas.filter((a) => a.sqm != null && a.sqft > 0);
  return (
    <section className="calc-block" id="fl-working" aria-labelledby="fl-working-head">
      <div className="block-head fl-block-head">
        <p className="eyebrow">{t('Calculation transparency')}</p>
        <h2 id="fl-working-head">{t('How each figure was worked out')}</h2>
      </div>
      <div className="fl-workings">
        {metric.length > 0 && (
          <details className="acc">
            <summary>{t('Metric areas converted to sq ft')}</summary>
            <div className="acc-body">
              <ul className="fl-steps">
                {metric.map((a) => (
                  <li key={a.id}>
                    <strong>{a.name}:</strong> {metricNote(a)}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}
        {r.lines.map((l) => (
          <details className="acc" key={l.key}>
            <summary>
              <span>{t(lineLabel(l, r, input))}</span>
              <span className="fl-acc-value num">{formatINR(l.cost)}</span>
            </summary>
            <div className="acc-body">
              <ul className="fl-steps">
                {workings(l.key, r, input).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </details>
        ))}
        <details className="acc">
          <summary>
            <span>{t('Contingency & grand total')}</span>
            <span className="fl-acc-value num">{formatINR(r.grandTotal)}</span>
          </summary>
          <div className="acc-body">
            <ul className="fl-steps">
              <li>
                {t('Eligible cost (every item above)')}: {formatINR(r.subtotal)}
              </li>
              <li>
                {formatINR(r.subtotal)} × {formatPercent(r.contingencyPct, 2)} = {formatINR(r.contingency)}
              </li>
              <li>
                {formatINR(r.subtotal)} + {formatINR(r.contingency)} = {formatINR(r.grandTotal)}
              </li>
              {r.averagePerSqft != null && (
                <li>
                  {formatINR(r.grandTotal)} ÷ {sqft(r.totalArea)} = {formatINR(r.averagePerSqft, 2)} {t('per sq ft')}
                </li>
              )}
            </ul>
          </div>
        </details>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Input pieces                                                        */
/* ================================================================== */

function Section({ id, n, title, summary, children }: { id: string; n: number; title: string; summary?: string; children: ReactNode }) {
  return (
    <details className="fl-sec" id={id} open>
      <summary>
        <span className="fl-sec-n" aria-hidden="true">
          {n}
        </span>
        <span className="fl-sec-title">{title}</span>
        {summary && <span className="fl-sec-sum num">{summary}</span>}
      </summary>
      <div className="fl-sec-body">{children}</div>
    </details>
  );
}

interface NumProps {
  path: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  type?: 'number' | 'currency' | 'percent';
  unit?: string;
  help?: string;
  error?: string;
  wide?: boolean;
}

/** A numeric field. Empty reads as zero, so it shows as a blank box rather than "0". */
function Num({ path, label, value, onChange, type = 'number', unit, help, error, wide }: NumProps) {
  const field = useMemo<Field>(
    () => ({ name: path, label, type, default: 0, unit, help, wide, placeholder: '0' }),
    [path, label, type, unit, help, wide],
  );
  return (
    <FieldControl
      field={field}
      value={value === 0 ? '' : value}
      error={error}
      onChange={(_, v) => onChange(v === '' ? 0 : typeof v === 'number' ? v : Number(v) || 0)}
    />
  );
}

/** A length with its own unit switch underneath. */
function LengthField({
  path,
  label,
  value,
  unit,
  units = LENGTH_UNITS,
  error,
  help,
  onChange,
  onUnit,
}: {
  path: string;
  label: string;
  value: number;
  unit: RiserUnit;
  units?: { value: RiserUnit; label: string }[];
  error?: string;
  help?: string;
  onChange: (v: number) => void;
  onUnit: (u: RiserUnit) => void;
}) {
  const t = useT();
  return (
    <div className="fl-length">
      <Num path={path} label={label} value={value} unit={unit === 'in' ? 'in' : unit === 'm' ? 'm' : 'ft'} error={error} help={help} onChange={onChange} />
      <Seg
        className="fl-unit"
        label={`${t(label)} — ${t('unit')}`}
        value={unit}
        onChange={onUnit}
        options={units.map((u) => ({ value: u.value, label: t(u.label) }))}
      />
    </div>
  );
}

/** Percentage with one-tap presets; typing any other figure is the "custom" option. */
function Wastage({
  path,
  label,
  value,
  presets,
  error,
  help,
  onChange,
}: {
  path: string;
  label: string;
  value: number;
  presets: number[];
  error?: string;
  help?: string;
  onChange: (v: number) => void;
}) {
  const t = useT();
  const field = useMemo<Field>(() => ({ name: path, label, type: 'percent', default: 0, help, placeholder: '0' }), [path, label, help]);
  const custom = !presets.includes(value);
  return (
    <div className="fl-pct">
      <FieldControl field={field} value={value} error={error} onChange={(_, v) => onChange(v === '' ? 0 : Number(v) || 0)} />
      <div className="fl-pct-side">
        <div className="fl-chips" role="group" aria-label={`${t(label)} — ${t('presets')}`}>
          {presets.map((p) => (
            <button key={p} type="button" className="fl-chip" aria-pressed={value === p} onClick={() => onChange(p)}>
              {p}%
            </button>
          ))}
          <button
            type="button"
            className="fl-chip"
            aria-pressed={custom}
            onClick={(e) => {
              const el = e.currentTarget.closest('.fl-pct')?.querySelector<HTMLInputElement>('input');
              el?.focus();
              el?.select();
            }}
          >
            {t('Custom')}
          </button>
        </div>
        <span className="fl-tag">{t('Suggested default — editable')}</span>
      </div>
    </div>
  );
}

function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <div
      className={`segmented fl-seg ${className}`}
      role="group"
      aria-label={label}
      style={{ ['--seg-count' as string]: options.length, ['--seg-index' as string]: index }}
    >
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AppliesSeg({ label, value, onChange }: { label: string; value: AppliesTo; onChange: (v: AppliesTo) => void }) {
  const t = useT();
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <Seg
        label={label}
        value={value}
        onChange={onChange}
        options={[
          { value: 'all', label: t('Tile + marble') },
          { value: 'tile', label: t('Tile') },
          { value: 'marble', label: t('Marble') },
        ]}
      />
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (on: boolean) => void; label: string; hint?: string }) {
  return (
    <label className={`fl-toggle${checked ? ' on' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="fl-toggle-box" aria-hidden="true">
        <Icon name="check" size={13} strokeWidth={3} />
      </span>
      <span className="fl-toggle-text">
        <span className="fl-toggle-label">{label}</span>
        {hint && <span className="fl-toggle-hint">{hint}</span>}
      </span>
    </label>
  );
}

/** An optional block: a checkbox, and its fields once it is ticked. */
function Optional({
  checked,
  onChange,
  label,
  hint,
  children,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={`fl-opt${checked ? ' on' : ''}`}>
      <Toggle checked={checked} onChange={onChange} label={label} hint={hint} />
      {checked && <div className="fl-opt-body">{children}</div>}
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field fl-text">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-wrap">
        <input
          id={id}
          className="input"
          type="text"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function RoomCount({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const t = useT();
  const [text, setText] = useState(String(value));
  const [capped, setCapped] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    setText(raw.replace(/[^0-9]/g, ''));
    if (raw.trim() === '') return;
    const n = Number(raw.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(n)) return;
    setCapped(n > MAX_ROOMS);
    onChange(Math.min(MAX_ROOMS, n));
  };

  return (
    <div className="field fl-count">
      <label className="field-label" htmlFor="fl-room-count">
        {t('How many rooms?')}
        <span className="muted fl-count-max">{t('up to {n}').replace('{n}', String(MAX_ROOMS))}</span>
      </label>
      <div className="fl-stepper">
        <button type="button" className="fl-step-btn" aria-label={t('One room fewer')} disabled={value <= 0} onClick={() => onChange(value - 1)}>
          −
        </button>
        <div className="input-wrap">
          <input
            id="fl-room-count"
            className="input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setText(String(value));
            }}
            onChange={(e) => commit(e.target.value)}
          />
          <span className="affix">{t('rooms')}</span>
        </div>
        <button type="button" className="fl-step-btn" aria-label={t('One more room')} disabled={value >= MAX_ROOMS} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
      {capped && <p className="fl-fine">{t('Up to {n} rooms can be entered — add bigger spaces under Other areas.').replace('{n}', String(MAX_ROOMS))}</p>}
    </div>
  );
}

function AreaCard({
  entry,
  path,
  errors,
  nameEditable,
  onChange,
  onRemove,
}: {
  entry: AreaEntry;
  path: string;
  errors: Record<string, string>;
  nameEditable?: boolean;
  onChange: (e: AreaEntry) => void;
  onRemove?: () => void;
}) {
  const t = useT();
  // Measured spaces start folded to one line; a new, empty one opens.
  const [startOpen] = useState(() => calculateRoomArea(entry).sqft === 0);
  const a = useMemo(() => calculateRoomArea(entry), [entry]);
  const ref = useRef<HTMLDetailsElement>(null);
  const hasError = Object.keys(errors).some((k) => k.startsWith(`${path}.`));
  // A folded card with a problem in it opens itself — but never closes on
  // its own once fixed, which would snap shut under the reader's cursor.
  useEffect(() => {
    if (hasError && ref.current) ref.current.open = true;
  }, [hasError]);
  const set = (part: Partial<AreaEntry>) => onChange({ ...entry, ...part });
  const u = entry.lengthUnit === 'm' ? 'm' : 'ft';

  const source =
    entry.method === 'area'
      ? a.sqft > 0
        ? t('Area entered')
        : t('Not measured yet')
      : entry.length > 0 && entry.width > 0
        ? `${formatNumber(entry.length, 2)} × ${formatNumber(entry.width, 2)} ${u}`
        : t('Not measured yet');

  return (
    <details ref={ref} className={`fl-area${hasError ? ' invalid' : ''}`} open={startOpen}>
      <summary>
        <span className="fl-area-name">{entry.name.trim() || t('Unnamed area')}</span>
        <span className="fl-area-src">{source}</span>
        <span className="fl-area-val num">{sqft(a.sqft)}</span>
      </summary>
      <div className="fl-area-body">
        {nameEditable && (
          <TextField id={`${path}-name`} label={t('Name')} value={entry.name} maxLength={40} onChange={(v) => set({ name: v })} />
        )}
        <Seg
          label={t('How to measure')}
          value={entry.method}
          onChange={(v) => set({ method: v })}
          options={[
            { value: 'dimensions', label: t('Length × Width') },
            { value: 'area', label: t('Direct area') },
          ]}
        />
        {entry.method === 'dimensions' ? (
          <>
            <div className="fields fl-dims">
              <Num path={`${path}.length`} label="Length" unit={u} value={entry.length} error={errors[`${path}.length`] && t(errors[`${path}.length`])} onChange={(v) => set({ length: v })} />
              <Num path={`${path}.width`} label="Width" unit={u} value={entry.width} error={errors[`${path}.width`] && t(errors[`${path}.width`])} onChange={(v) => set({ width: v })} />
            </div>
            <Seg
              className="fl-unit"
              label={t('Unit')}
              value={entry.lengthUnit}
              onChange={(v) => set({ lengthUnit: v })}
              options={[
                { value: 'ft', label: t('Feet') },
                { value: 'm', label: t('Metre') },
              ]}
            />
          </>
        ) : (
          <>
            <div className="fields">
              <Num
                path={`${path}.area`}
                label="Area"
                unit={entry.areaUnit === 'sqm' ? 'm²' : 'sq ft'}
                value={entry.area}
                error={errors[`${path}.area`] && t(errors[`${path}.area`])}
                onChange={(v) => set({ area: v })}
              />
            </div>
            <Seg
              className="fl-unit"
              label={t('Unit')}
              value={entry.areaUnit}
              onChange={(v) => set({ areaUnit: v })}
              options={[
                { value: 'sqft', label: t('Sq ft') },
                { value: 'sqm', label: t('Sq metre') },
              ]}
            />
          </>
        )}
        <p className="fl-readout">
          {a.sqm != null ? (
            <>
              {t('Area')}: <strong className="num">{fixed2(a.sqm)} m²</strong> · {t('Converted area')}:{' '}
              <strong className="num">{fixed2(a.sqft)} sq ft</strong>
            </>
          ) : (
            <>
              {t('Area')}: <strong className="num">{fixed2(a.sqft)} sq ft</strong>
            </>
          )}
        </p>
        {onRemove && (
          <button type="button" className="btn ghost sm fl-remove" onClick={onRemove}>
            <Icon name="close" size={14} />
            {t('Remove {name}').replace('{name}', entry.name.trim() || t('this area'))}
          </button>
        )}
      </div>
    </details>
  );
}

function EstimateChip({ label, qty, cost }: { label: string; qty: string; cost: number }) {
  const t = useT();
  return (
    <div className="fl-est">
      <span className="fl-est-label">{label}</span>
      <span className="fl-est-qty num">
        {qty} <span className="fl-est-tag">{t('estimated')}</span>
      </span>
      <span className="fl-est-cost num">{formatINR(cost)}</span>
    </div>
  );
}

function Stat({ label, value, tone, help }: { label: string; value: string; tone?: 'accent'; help?: string }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <div className="s-label">
        {label}
        {help && <Tooltip text={help} />}
      </div>
      <div className={`s-value num${value.length > 12 ? ' sm' : ''}`}>{value}</div>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="error" role="alert">
      <Icon name="alert" size={13} strokeWidth={2} />
      {message}
    </div>
  );
}
