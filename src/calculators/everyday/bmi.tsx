import type { CalculatorDef, Values } from '../types';
import { calculateBMI, type BmiResult, type BmiScale, type BmiUnit } from '@/engines/everyday';
import { formatNumber } from '@/lib/format';
import { num, str } from '@/lib/validate';
import { Note } from '@/components/Results';

const toInput = (v: Values) => ({
  unit: str(v.unit, 'metric') as BmiUnit,
  heightCm: num(v.heightCm),
  weightKg: num(v.weightKg),
  heightFt: num(v.heightFt),
  heightIn: num(v.heightIn),
  weightLb: num(v.weightLb),
  scale: str(v.scale, 'asian') as BmiScale,
});

const bmi: CalculatorDef<BmiResult> = {
  id: 'bmi',

  fields: [
    {
      name: 'unit',
      label: 'Units',
      type: 'segmented',
      default: 'metric',
      options: [
        { label: 'Metric (cm / kg)', value: 'metric' },
        { label: 'Imperial (ft / lb)', value: 'imperial' },
      ],
    },
    {
      name: 'heightCm',
      label: 'Height',
      type: 'number',
      default: 170,
      min: 50,
      max: 260,
      unit: 'cm',
      slider: true,
      visible: (v) => v.unit === 'metric',
    },
    {
      name: 'weightKg',
      label: 'Weight',
      type: 'number',
      default: 70,
      min: 10,
      max: 400,
      unit: 'kg',
      slider: true,
      step: 0.5,
      visible: (v) => v.unit === 'metric',
    },
    {
      name: 'heightFt',
      label: 'Height (feet)',
      type: 'number',
      default: 5,
      min: 1,
      max: 8,
      unit: 'ft',
      visible: (v) => v.unit === 'imperial',
    },
    {
      name: 'heightIn',
      label: 'Height (inches)',
      type: 'number',
      default: 7,
      min: 0,
      max: 11,
      unit: 'in',
      visible: (v) => v.unit === 'imperial',
    },
    {
      name: 'weightLb',
      label: 'Weight',
      type: 'number',
      default: 154,
      min: 20,
      max: 900,
      unit: 'lb',
      slider: true,
      visible: (v) => v.unit === 'imperial',
    },
    {
      name: 'scale',
      label: 'Reference scale',
      type: 'segmented',
      default: 'asian',
      options: [
        { label: 'Asian-Indian', value: 'asian' },
        { label: 'WHO international', value: 'who' },
      ],
      help: 'Indian health guidelines use lower cut-offs than the WHO international scale.',
    },
  ],

  compute: (v) => calculateBMI(toInput(v)),

  hero: (r) => [
    {
      label: 'Your BMI',
      value: r.bmi > 0 ? r.bmi.toFixed(1) : '—',
      caption: `${r.category} · ${r.scaleLabel}`,
    },
    {
      label: 'Healthy weight range for your height',
      value: `${formatNumber(r.healthyMinKg, 1)} – ${formatNumber(r.healthyMaxKg, 1)} kg`,
      caption: `At ${r.heightM.toFixed(2)} m tall`,
    },
  ],

  stats: (r) => [
    { label: 'Weight', value: `${formatNumber(r.weightKg, 1)} kg` },
    { label: 'Height', value: `${formatNumber(r.heightM * 100, 0)} cm` },
    { label: 'Category', value: r.category, tone: 'accent' },
  ],

  extra: (r) => (
    <>
      <section className="card card-pad">
        <div className="section-label" style={{ marginBottom: 10 }}>
          {r.scaleLabel}
        </div>
        <dl style={{ margin: 0 }}>
          {r.bands.map((b) => {
            const active = r.bmi >= b.min && (b.max == null || r.bmi < b.max);
            return (
              <div className="kv" key={b.label} style={active ? { color: 'var(--brand-600)', fontWeight: 650 } : undefined}>
                <dt>{b.label}</dt>
                <dd>
                  {b.max == null ? `${b.min.toFixed(1)} and above` : `${b.min.toFixed(1)} – ${b.max.toFixed(1)}`}
                  {active && <span className="badge brand" style={{ marginLeft: 8 }}>You</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
      <Note>
        BMI is a screening measure, not a diagnosis. It does not distinguish muscle from fat and says nothing
        about where weight is carried, which is often what matters clinically. Treat it as one data point, and
        talk to a doctor about what it means for you.
      </Note>
    </>
  ),

  summary: (r) => `BMI ${r.bmi.toFixed(1)} — ${r.category} (${r.scaleLabel}).`,

  content: {
    howItWorks: [
      'Body mass index divides weight in kilograms by height in metres squared. It is a quick way to compare weight across people of different heights, which is exactly what it was designed for — population screening, not individual diagnosis.',
      'India and much of Asia use lower cut-offs than the WHO international scale, because research shows higher body-fat percentage and metabolic risk at a given BMI in South Asian populations. The overweight threshold is 23 rather than 25.',
    ],
    formula: `BMI = weight (kg) ÷ height (m)²

Healthy weight range = normal-band BMI × height (m)²`,
    example: [
      'Someone 170 cm tall weighing 70 kg: BMI = 70 ÷ 1.70² = 24.2.',
      'On the WHO scale that is “normal”; on the Asian-Indian scale it falls in the overweight band.',
      'Their healthy range on the Asian-Indian scale is roughly 53.5 – 66.5 kg.',
    ],
    assumptions: [
      'BMI treats all body mass alike. Athletes with high muscle mass often register as overweight without excess fat.',
      'It is not appropriate for children, pregnant women, or people with significant muscle loss.',
    ],
    notes: [
      'Waist circumference and waist-to-height ratio often predict metabolic risk better than BMI alone.',
      'Any change in weight is best planned with a doctor or a registered dietitian rather than from a number on a screen.',
    ],
    faqs: [
      {
        q: 'Why does India use different BMI cut-offs?',
        a: 'South Asian populations tend to have a higher proportion of body fat and greater risk of diabetes and heart disease at the same BMI. Indian guidelines therefore set the overweight threshold at 23 and obesity at 25.',
      },
      {
        q: 'Is BMI accurate for everyone?',
        a: 'No. It is a screening tool for populations. It cannot tell muscle from fat, ignores where fat is stored, and is unsuitable for children, pregnancy, athletes and the elderly.',
      },
      {
        q: 'What else should I look at?',
        a: 'Waist circumference, waist-to-height ratio, blood pressure, blood sugar and lipid levels together give a far better picture of health than BMI on its own.',
      },
    ],
  },
};

export default bmi;
