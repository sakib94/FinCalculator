import type { CalculatorDef, Field, Values } from '../types';
import {
  APPLIANCES,
  calculateElectricalLoad,
  DIVERSITY_FACTOR,
  SUPPLY_VOLTAGE,
  type ElectricalResult,
} from '@/engines/utility';
import { formatINR, formatNumber } from '@/lib/format';
import { num } from '@/lib/validate';

/** Sensible starting point for a 2–3 BHK Indian home. */
const DEFAULT_QTY: Record<string, number> = {
  lights: 12,
  fans: 5,
  tv: 1,
  fridge: 1,
  ac: 2,
  cooler: 0,
  washing: 1,
  geyser: 1,
  microwave: 1,
  computer: 2,
  pump: 1,
  iron: 1,
  mixer: 1,
};

const applianceFields: Field[] = APPLIANCES.map((a) => ({
  name: `qty_${a.id}`,
  label: a.label,
  type: 'number' as const,
  default: DEFAULT_QTY[a.id] ?? 0,
  min: 0,
  max: 100,
  step: 1,
  optional: true,
  group: 'appliances',
  help: `${a.watts} W each · about ${a.hoursPerDay} hours a day`,
}));

const toInput = (v: Values) => ({
  quantities: Object.fromEntries(APPLIANCES.map((a) => [a.id, num(v[`qty_${a.id}`])])),
  tariffPerUnit: num(v.tariff),
  fixedMonthlyCharge: num(v.fixedCharge),
  backupHours: num(v.backupHours),
});

const electrical: CalculatorDef<ElectricalResult> = {
  id: 'electrical-load',

  groups: [
    { id: 'appliances', title: 'How many of each do you have?' },
    { id: 'tariff', title: 'Electricity tariff & backup', collapsible: true, defaultOpen: true },
  ],

  fields: [
    ...applianceFields,
    {
      name: 'tariff',
      label: 'Tariff per Unit',
      type: 'currency',
      default: 8,
      min: 0,
      max: 100,
      step: 0.25,
      slider: true,
      group: 'tariff',
      help: 'Your average cost per kWh, including all energy charges. Indian domestic tariffs run about ₹5–10.',
    },
    {
      name: 'fixedCharge',
      label: 'Fixed Monthly Charge',
      type: 'currency',
      default: 150,
      min: 0,
      max: 50000,
      step: 50,
      slider: true,
      optional: true,
      group: 'tariff',
      help: 'Meter rent and fixed demand charges billed regardless of usage.',
    },
    {
      name: 'backupHours',
      label: 'Backup Required',
      type: 'number',
      default: 4,
      min: 0,
      max: 24,
      step: 1,
      unit: 'hrs',
      slider: true,
      group: 'tariff',
      help: 'How long the inverter should run essential loads during a power cut.',
    },
  ],

  compute: (v) => calculateElectricalLoad(toInput(v)),

  hero: (r) => [
    {
      label: 'Connection to sanction',
      value: `${r.recommendedKva.toFixed(1)} kVA`,
      caption: `Connected load ${r.connectedLoadKw.toFixed(2)} kW, demand ${r.demandKw.toFixed(2)} kW`,
    },
    {
      label: 'Estimated monthly bill',
      value: formatINR(r.monthlyBill),
      caption: `${formatNumber(Math.round(r.monthlyUnits))} units a month`,
    },
  ],

  stats: (r) => [
    {
      label: 'Total connected load',
      value: `${formatNumber(Math.round(r.connectedLoadW))} W`,
      help: 'Everything switched on at once — the theoretical maximum.',
    },
    {
      label: 'Maximum demand',
      value: `${r.demandKw.toFixed(2)} kW`,
      tone: 'accent',
      help: `Connected load × ${DIVERSITY_FACTOR} diversity factor. Nobody runs everything simultaneously.`,
    },
    {
      label: 'Current drawn',
      value: `${r.currentAmps.toFixed(1)} A`,
      help: `At ${SUPPLY_VOLTAGE} V single phase.`,
    },
    {
      label: 'Main MCB rating',
      value: `${r.recommendedMcbAmps} A`,
      help: 'Next standard rating above the demand current plus 25% headroom.',
    },
    { label: 'Daily consumption', value: `${r.dailyUnits.toFixed(1)} units` },
    { label: 'Annual consumption', value: `${formatNumber(Math.round(r.annualUnits))} units` },
    { label: 'Annual bill', value: formatINR(r.annualBill), tone: 'negative' },
    {
      label: 'Inverter size',
      value: `${formatNumber(Math.ceil(r.inverterVaRequired / 100) * 100)} VA`,
      help: 'Sized for essential loads only — lights, fans, TV, fridge, computers.',
    },
    {
      label: 'Battery capacity',
      value: `${formatNumber(Math.ceil(r.batteryAh / 10) * 10)} Ah`,
      help: 'At 12 V with 80% usable depth of discharge.',
    },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Which appliances use the most energy',
      centerLabel: 'Daily units',
      format: (n) => `${n.toFixed(1)} u`,
      data: r.lines
        .filter((l) => l.dailyUnits > 0)
        .sort((a, b) => b.dailyUnits - a.dailyUnits)
        .map((l) => ({ label: l.label, value: l.dailyUnits })),
    },
    {
      kind: 'bar' as const,
      title: 'Connected load by appliance',
      x: r.lines.map((l) => l.label),
      series: [{ name: 'Watts', values: r.lines.map((l) => l.totalWatts) }],
      format: (n) => `${formatNumber(n)} W`,
    },
  ],

  table: (r) => ({
    title: 'Appliance-wise load and running cost',
    csvName: 'finora-electrical-load',
    columns: [
      { key: 'appliance', label: 'Appliance', align: 'left' },
      { key: 'qty', label: 'Qty' },
      { key: 'watts', label: 'Watts each' },
      { key: 'total', label: 'Total watts' },
      { key: 'units', label: 'Units / day' },
      { key: 'cost', label: 'Cost / month' },
    ],
    rows: r.lines.map((l) => ({
      appliance: l.label,
      qty: String(l.quantity),
      watts: formatNumber(l.wattsEach),
      total: formatNumber(l.totalWatts),
      units: l.dailyUnits.toFixed(2),
      cost: formatINR(l.monthlyCost),
    })),
    footer: {
      appliance: 'Total',
      qty: '',
      watts: '',
      total: formatNumber(Math.round(r.connectedLoadW)),
      units: r.dailyUnits.toFixed(2),
      cost: formatINR(r.monthlyBill),
    },
    csvRows: r.lines.map((l) => ({
      appliance: l.label,
      quantity: l.quantity,
      wattsEach: l.wattsEach,
      totalWatts: l.totalWatts,
      unitsPerDay: Number(l.dailyUnits.toFixed(2)),
      costPerMonth: Math.round(l.monthlyCost),
    })),
    note: 'Running hours are typical averages. Actual consumption depends on how you use each appliance.',
  }),

  summary: (r) =>
    `Connected load ${r.connectedLoadKw.toFixed(2)} kW, sanction ${r.recommendedKva.toFixed(
      1,
    )} kVA, about ${formatNumber(Math.round(r.monthlyUnits))} units and ${formatINR(
      r.monthlyBill,
    )} a month.`,

  content: {
    howItWorks: [
      'Connected load is the simple sum of every appliance’s rating — what you would draw if everything ran at once. That almost never happens, so sizing a connection on connected load means paying fixed charges for capacity you never use.',
      'What matters instead is maximum demand: connected load multiplied by a diversity factor, typically around 0.6 for an Indian home. Your geyser and your AC rarely run at the same moment, and your iron and microwave almost never do.',
      'The utility sanctions a connection in kVA rather than kW, because it must supply apparent power including the reactive component. Dividing demand in kW by a power factor of about 0.9 converts one to the other.',
      'Energy consumption is a different question from load. A 2,000 W geyser running one hour a day uses far less electricity than a 200 W refrigerator running continuously. That is why the donut chart ranks appliances by units consumed, not by wattage — it is usually the more surprising of the two.',
      'The inverter sizing covers essential loads only. Air conditioners, geysers and microwaves are deliberately excluded: running them off a domestic inverter needs a battery bank most homes would not consider.',
    ],
    formula: `Connected load = Σ (quantity × watts)
Maximum demand = connected load × ${DIVERSITY_FACTOR}
Sanctioned kVA = demand kW ÷ 0.9 power factor
Current (A)    = demand W ÷ (${SUPPLY_VOLTAGE} V × 0.9)
MCB rating     = next standard size above current × 1.25

Units per day  = Σ (watts × hours) ÷ 1000
Monthly bill   = units × 30 × tariff + fixed charge

Inverter VA    = essential watts ÷ 0.8
Battery Ah     = (essential watts × backup hours) ÷ (12 V × 0.8)`,
    example: [
      'A 3 BHK with 12 LED lights, 5 fans, 2 ACs, a fridge, geyser, washing machine and assorted electronics.',
      'Connected load is about 8,500 W. Applying 0.6 diversity gives a 5.1 kW demand, so a 6 kVA connection is right.',
      'Daily consumption is around 28 units — roughly ₹6,900 a month at ₹8 per unit, with the two ACs alone accounting for over half.',
    ],
    assumptions: [
      'Single-phase supply at 230 V. Loads above about 7 kW usually require a three-phase connection.',
      'A diversity factor of 0.6 and a power factor of 0.9, which are typical residential values. Commercial premises differ.',
      'Running hours are typical averages. Air conditioner usage in particular swings enormously between summer and winter.',
      'A flat tariff is applied. Most Indian states use telescopic slab tariffs where the rate rises with consumption, so heavy users will pay more than this estimate.',
      'Star rating is not modelled. A 5-star inverter AC can consume 30–40% less than the rated figure used here.',
    ],
    notes: [
      'Sanctioned load below what you actually draw causes nuisance tripping and, in many states, a penalty on the bill.',
      'Domestic connections above roughly 7 kW typically need three-phase supply. Check your local utility’s threshold.',
      'Air conditioners and geysers dominate most Indian household bills. Setting the AC to 24–26 °C instead of 18 °C cuts its consumption substantially.',
      'A 5-star rated appliance costs more up front but usually repays the difference within two to three years on the electricity bill.',
      'Size the inverter battery for essential loads only. Backing up an air conditioner needs a battery bank far beyond normal domestic scale.',
    ],
    faqs: [
      {
        q: 'What is the difference between connected load and sanctioned load?',
        a: 'Connected load is the total rating of everything you own. Sanctioned load is what the utility agrees to supply, based on realistic simultaneous demand. Sanctioned load is normally much lower, and that is intentional.',
      },
      {
        q: 'Why is my connection quoted in kVA rather than kW?',
        a: 'kVA is apparent power, which includes the reactive component drawn by motors and compressors. kW is the real power that does work. Dividing kW by the power factor, about 0.9 in a home, gives kVA.',
      },
      {
        q: 'Which appliance costs me the most?',
        a: 'Look at the donut chart, which ranks by units consumed rather than wattage. In most Indian homes air conditioners come first, then the geyser and the refrigerator — the fridge because it runs continuously, despite its modest rating.',
      },
      {
        q: 'What size inverter do I need?',
        a: 'The figure above sizes it for lights, fans, TV, fridge and computers. If you want to run an air conditioner during outages, you need a substantially larger inverter and battery bank, and it is rarely economical.',
      },
      {
        q: 'Why is my actual bill different?',
        a: 'Most state utilities use telescopic slab tariffs, where each additional block of units costs more, and add fuel surcharge, electricity duty and fixed demand charges. This calculator applies a single flat rate plus your fixed charge.',
      },
    ],
  },
};

export default electrical;
