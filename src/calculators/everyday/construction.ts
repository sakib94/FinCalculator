import type { CalculatorDef, Values } from '../types';
import {
  calculateConstruction,
  QUALITY_PROFILES,
  type BuildQuality,
  type ConstructionResult,
} from '@/engines/utility';
import { formatINR, formatINRCompact, formatNumber } from '@/lib/format';
import { num, str } from '@/lib/validate';

const toInput = (v: Values) => ({
  areaSqft: num(v.areaSqft),
  floors: num(v.floors, 1),
  quality: str(v.quality, 'standard') as BuildQuality,
  cementRate: num(v.cementRate),
  sandRate: num(v.sandRate),
  aggregateRate: num(v.aggregateRate),
  steelRate: num(v.steelRate),
  brickRate: num(v.brickRate),
});

const construction: CalculatorDef<ConstructionResult> = {
  id: 'construction-material',

  groups: [
    { id: 'build', title: 'Your build' },
    { id: 'rates', title: 'Local material rates', collapsible: true, defaultOpen: true },
  ],

  fields: [
    {
      name: 'quality',
      label: 'Construction quality',
      type: 'segmented',
      prominent: true,
      default: 'standard',
      group: 'build',
      options: (Object.keys(QUALITY_PROFILES) as BuildQuality[]).map((k) => ({
        label: QUALITY_PROFILES[k].label,
        value: k,
      })),
    },
    {
      name: 'areaSqft',
      label: 'Built-up Area per Floor',
      type: 'number',
      default: 1200,
      min: 50,
      max: 100000,
      slider: true,
      step: 50,
      unit: 'sqft',
      group: 'build',
      help: 'Built-up area, not carpet or plot area.',
    },
    {
      name: 'floors',
      label: 'Number of Floors',
      type: 'number',
      default: 1,
      min: 1,
      max: 10,
      slider: true,
      unit: 'floors',
      group: 'build',
    },

    {
      name: 'cementRate',
      label: 'Cement (per 50 kg bag)',
      type: 'currency',
      default: 400,
      min: 0,
      max: 2000,
      slider: true,
      step: 10,
      group: 'rates',
    },
    {
      name: 'sandRate',
      label: 'Sand (per cft)',
      type: 'currency',
      default: 60,
      min: 0,
      max: 500,
      slider: true,
      step: 5,
      group: 'rates',
    },
    {
      name: 'aggregateRate',
      label: 'Aggregate (per cft)',
      type: 'currency',
      default: 55,
      min: 0,
      max: 500,
      slider: true,
      step: 5,
      group: 'rates',
    },
    {
      name: 'steelRate',
      label: 'Steel / TMT (per kg)',
      type: 'currency',
      default: 70,
      min: 0,
      max: 500,
      slider: true,
      step: 1,
      group: 'rates',
    },
    {
      name: 'brickRate',
      label: 'Bricks (per piece)',
      type: 'currency',
      default: 9,
      min: 0,
      max: 200,
      slider: true,
      step: 0.5,
      group: 'rates',
    },
  ],

  compute: (v) => calculateConstruction(toInput(v)),

  hero: (r) => [
    {
      label: 'Estimated total build cost',
      value: formatINR(r.estimatedTotalCost),
      caption: `About ${formatINR(r.costPerSqft)} per sqft across ${formatNumber(r.totalArea)} sqft`,
    },
    {
      label: 'Material cost',
      value: formatINR(r.materialCost),
      caption: `Labour, finishes and services add roughly ${formatINRCompact(r.labourAndOther)}`,
    },
  ],

  stats: (r) => [
    { label: 'Cement', value: `${formatNumber(Math.ceil(r.cementBags))} bags` },
    { label: 'Sand', value: `${formatNumber(Math.ceil(r.sandCft))} cft`, help: `${r.sandBrass.toFixed(1)} brass` },
    {
      label: 'Aggregate',
      value: `${formatNumber(Math.ceil(r.aggregateCft))} cft`,
      help: `${r.aggregateBrass.toFixed(1)} brass`,
    },
    { label: 'Steel (TMT)', value: `${formatNumber(Math.ceil(r.steelKg))} kg` },
    { label: 'Bricks', value: `${formatNumber(r.bricks)} nos` },
    { label: 'Total built-up area', value: `${formatNumber(r.totalArea)} sqft`, tone: 'accent' },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Material cost breakdown',
      centerLabel: 'Materials',
      data: r.lines.map((l) => ({ label: l.material, value: l.amount })),
    },
    {
      kind: 'donut' as const,
      title: 'Materials vs everything else',
      centerLabel: 'Build cost',
      data: [
        { label: 'Materials', value: r.materialCost },
        { label: 'Labour, finishes & services', value: r.labourAndOther },
      ],
    },
  ],

  table: (r) => ({
    title: 'Bill of materials',
    csvName: 'finora-construction-materials',
    columns: [
      { key: 'material', label: 'Material', align: 'left' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'unit', label: 'Unit', align: 'left' },
      { key: 'rate', label: 'Rate' },
      { key: 'amount', label: 'Amount' },
    ],
    rows: r.lines.map((l) => ({
      material: l.material,
      quantity: formatNumber(Math.ceil(l.quantity)),
      unit: l.unit,
      rate: formatINR(l.rate),
      amount: formatINR(l.amount),
    })),
    footer: {
      material: 'Total material cost',
      quantity: '',
      unit: '',
      rate: '',
      amount: formatINR(r.materialCost),
    },
    csvRows: r.lines.map((l) => ({
      material: l.material,
      quantity: Math.ceil(l.quantity),
      unit: l.unit,
      rate: l.rate,
      amount: Math.round(l.amount),
    })),
    note: 'Quantities come from standard per-sqft thumb rules for RCC framed residential construction. A structural drawing will give exact figures.',
  }),

  summary: (r) =>
    `${formatNumber(r.totalArea)} sqft build: ${formatNumber(Math.ceil(r.cementBags))} cement bags, ${formatNumber(
      Math.ceil(r.steelKg),
    )} kg steel, materials ${formatINR(r.materialCost)}, total about ${formatINR(r.estimatedTotalCost)}.`,

  content: {
    howItWorks: [
      'Indian residential construction is estimated from per-square-foot thumb rules that contractors and quantity surveyors have used for decades. For a standard RCC framed house, one square foot of built-up area consumes roughly 0.4 bags of cement, 1.8 cft of sand, 1.35 cft of aggregate, 4 kg of steel and 8 bricks.',
      'The quality tier scales those figures. A premium build carries deeper foundations, thicker slabs, more reinforcement and better blockwork, so it uses roughly 18% more material than a standard build; an economy build uses about 12% less.',
      'Materials are only part of the cost. In a typical Indian residential project they account for around 60% of the total, with labour, finishes, electrical, plumbing, sanitary fittings and contractor margin making up the rest. That is how the total build cost above is derived from the material cost.',
      'Treat this as a budgeting estimate, not a bill of quantities. A real BOQ comes from structural drawings and will differ — sometimes substantially — depending on soil conditions, span lengths, seismic zone and the number of storeys.',
    ],
    formula: `Per sqft of built-up area (standard quality):
  Cement     0.40 bags
  Sand       1.80 cft
  Aggregate  1.35 cft
  Steel      4.00 kg
  Bricks     8 nos

Quantity = area × floors × rate per sqft × quality factor
Material cost = Σ (quantity × local rate)
Total build cost ≈ material cost ÷ 0.60

1 brass = 100 cft`,
    example: [
      'A 1,200 sqft single-floor standard build.',
      'Cement 480 bags, sand 2,160 cft, aggregate 1,620 cft, steel 4,800 kg, bricks 9,600.',
      'At typical rates that is about ₹8.6 lakh of materials, implying a total build cost near ₹14.3 lakh — roughly ₹1,200 per sqft.',
    ],
    assumptions: [
      'RCC framed construction with brick infill walls, the standard for Indian residential buildings.',
      'Normal soil conditions and standard foundation depth. Black cotton soil, high water table or hilly terrain increase foundation cost significantly.',
      'Standard floor-to-floor height of about 10 feet and conventional span lengths.',
      'Material rates are the ones you enter — they vary widely by city and by season, and sand in particular is subject to local mining restrictions.',
      'The 60% material share is a typical average. High-specification interiors push it below 50%; a bare structural shell pushes it above 70%.',
    ],
    notes: [
      'Sand and aggregate are usually ordered by the brass, which is 100 cubic feet. Convert before placing an order.',
      'One bag of cement is 50 kg; 20 bags make one tonne.',
      'Steel consumption rises with the number of floors. Four kg per sqft suits G+1; a G+3 building can need 5–6 kg.',
      'Add 5–10% wastage to every material quantity when actually ordering, particularly for bricks and cement.',
      'Cement has a shelf life of about three months in Indian humidity. Order in stages rather than all at once.',
    ],
    faqs: [
      {
        q: 'How accurate are these thumb rules?',
        a: 'Within roughly 10–15% for conventional residential construction, which is good enough for budgeting and for sanity-checking a contractor’s quote. For tendering or loan sanction you need a proper BOQ from structural drawings.',
      },
      {
        q: 'Why is the total cost so much higher than the material cost?',
        a: 'Because materials are only about 60% of a residential build. Labour, electrical, plumbing, sanitary ware, flooring, painting, doors, windows and contractor margin make up the rest.',
      },
      {
        q: 'What is a brass?',
        a: 'A volume unit of 100 cubic feet, used across India for ordering sand and aggregate. The calculator shows both cft and brass so you can order directly.',
      },
      {
        q: 'Does this cover the plot or the building?',
        a: 'The building. Enter built-up area per floor — the area actually constructed, including walls — not the plot area or the carpet area.',
      },
      {
        q: 'How much does steel vary by number of floors?',
        a: 'Lower floors carry more load, so reinforcement rises with height. Budget about 4 kg per sqft for a ground-plus-one, and 5–6 kg for taller structures.',
      },
    ],
  },
};

export default construction;
