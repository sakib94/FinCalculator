import type { CalculatorDef } from '../types';
import { calculateFlooringEstimate, type FlooringResult } from '@/engines/flooring';
import { formatINR, formatNumber } from '@/lib/format';
import { FlooringWorkspace } from '@/components/FlooringWorkspace';
import { defaultInput } from './flooringModel';

/**
 * Tile & Marble Cost Calculator.
 *
 * Two tabs over one project, with automatic skirting and supporting
 * materials — more than a flat field list can express — so
 * the inputs and results live in their own workspace
 * (src/components/FlooringWorkspace.tsx). `compute` and `hero` describe the
 * example the page opens with.
 */
const flooring: CalculatorDef<FlooringResult> = {
  id: 'tile-marble-flooring',
  fields: [],
  compute: () => calculateFlooringEstimate(defaultInput()),
  hero: (r) => ({
    label: 'Total project cost',
    value: formatINR(r.grandTotal),
    caption: `${formatNumber(r.baseArea)} sq ft of tile and marble`,
  }),
  workspace: FlooringWorkspace,
  workspaceSections: [
    { id: 'fl-summary', label: 'Project summary' },
    { id: 'fl-working', label: 'Workings' },
  ],

  content: {
    intro: {
      heading: 'What will my tile and marble work cost?',
      paragraphs: [
        'You know roughly how much tile and marble you need — tile in the rooms, hall and bathrooms; marble on the kitchen floor and platform, the windows and the stairs. What is harder to add up is everything around it: the extra pieces for skirting, wastage from cutting, the laying labour, the sand and cement under the floor, grout and white cement for the joints, and the small expenses that always turn up.',
        'This calculator does that adding up. Enter your tile area, your two marble areas, the rates you have been quoted and the labour charges; skirting, wastage, setting materials and an extra-expenses allowance are added automatically. Both tabs feed one project total, with the arithmetic behind every figure.',
      ],
    },
    howItWorks: [
      'Enter the areas you have worked out yourself — there is no need to measure room by room. Marble is entered in two parts because the labour differs: the floor and kitchen platform, and the windows and stairs. The areas you enter never change; labour and the average cost per sq ft are based on them.',
      'Skirting is worked out for you. It runs along the walls, so what matters is the wall length, not the floor area: a 12 × 12 ft room is 144 sq ft but has only 4 × 12 = 48 ft of wall, and 6-inch skirting along it is 48 × 0.5 = 24 sq ft. That is one-sixth of the floor, so the calculator adds area ÷ 6 — 110 sq ft for 660 sq ft of tile. Untick the box if you do not want skirting.',
      'Wastage is added on the area plus skirting — 5% for tile and 7% for marble. Skirting and wastage are rounded up to whole sq ft, so 660 sq ft of tile becomes 660 + 110 = 770 sq ft, plus 39 sq ft of wastage: 809 sq ft to buy. The material cost is that quantity times your rate.',
      'Labour is charged on the area you entered, never on skirting or wastage. Each marble section has its own labour rate per sq ft — windows and stairs take more finishing work than a floor.',
      'Sand, cement, white cement and grout are estimated from consumption per sq ft and rounded up to whole bags, kilograms and CFT. Extra expenses are a fixed 3% of everything before them. The setting-material quantities lean to the upper end of the usual ranges, so the estimate is not on the low side.',
    ],
    sections: [
      {
        heading: 'A worked example: tile in the rooms, marble in the kitchen',
        paragraphs: [
          'Two rooms, a hall, a kitchen and bathrooms, measured by the owner as 660 sq ft of tile, 250 sq ft of marble on the kitchen floor and platform, and 50 sq ft of marble on the windows and stairs. Tile is ₹60 a sq ft with ₹20 labour; marble is ₹120 a sq ft, with ₹160 labour for the floor and platform and ₹180 for the windows and stairs.',
        ],
        table: {
          caption: 'The calculator’s opening example',
          columns: ['Item', 'Working', 'Cost'],
          rows: [
            ['Tile material', '660 + 110 skirting + 39 wastage = 809 sq ft × ₹60', '₹48,540'],
            ['Marble material', '300 + 42 skirting + 24 wastage = 366 sq ft × ₹120', '₹43,920'],
            ['Tile labour', '660 sq ft × ₹20', '₹13,200'],
            ['Marble floor & platform labour', '250 sq ft × ₹160', '₹40,000'],
            ['Marble window & stair labour', '50 sq ft × ₹180', '₹9,000'],
            ['Sand, cement, white cement, grout', '111 CFT, 24 bags, 18 kg, 20 kg', '₹20,900'],
            ['Extra expenses', '3% of ₹1,75,560', '₹5,267'],
            ['Total project cost', '₹1,80,827 ÷ 960 sq ft', '₹188.36 per sq ft'],
          ],
        },
      },
      {
        heading: 'How skirting is estimated',
        paragraphs: [
          'Skirting covers the bottom of the walls, so it depends on how long the walls are. A total floor area does not say that, so the calculator assumes typical rooms of about 12 × 12 ft with 6-inch skirting.',
        ],
        table: {
          columns: ['Room', 'Floor area', 'Wall length', 'Skirting (6 in)', 'Share of floor'],
          rows: [
            ['10 × 10 ft', '100 sq ft', '40 ft', '20 sq ft', '20%'],
            ['12 × 12 ft', '144 sq ft', '48 ft', '24 sq ft', '17%'],
            ['15 × 20 ft', '300 sq ft', '70 ft', '35 sq ft', '12%'],
          ],
        },
        after: [
          'Small rooms need proportionally more skirting and big halls less; 12 × 12 ft rooms sit in the middle. Doorways need no skirting, which roughly offsets the extra cutting at corners.',
        ],
      },
      {
        heading: 'Why you enter a rate, not a tile or marble type',
        paragraphs: [
          'Two vitrified tiles can differ in price by five times, and marble ranges from under ₹60 to several hundred rupees a sq ft depending on the stone, grade, thickness and city. A list of types with built-in prices would be wrong for most people.',
          'Enter the rate on your supplier’s quotation and the estimate reflects exactly what you are buying, wherever you are buying it.',
        ],
      },
    ],
    formula: `Skirting          = Floor area × 4 × 0.5 ft ÷ 12 ft  (= area ÷ 6)
Subtotal          = Area + Skirting
Wastage           = Subtotal × 5% (tile) or 7% (marble)
Total required    = Subtotal + Wastage
Material          = Total required × Rate
Labour            = Area × Labour rate        (no skirting, no wastage)

Marble area       = Floor & platform + Windows & stairs
Marble skirting   = on the floor & platform area only

Sand (CFT)        = (Tile + Marble area) × 0.115, rounded up
Cement (bags)     = (Tile + Marble area) × 0.025, rounded up
White cement (kg) = Marble area × 0.06, rounded up
Grout (kg)        = Tile area × 0.03, rounded up

Subtotal          = Material + Labour + Supporting materials
Extra expenses    = Subtotal × 3%
Total             = Subtotal + Extra expenses
Average per sq ft = Total ÷ (Tile area + Marble areas)`,
    example: [
      '660 sq ft of tile at ₹60 (₹20 labour); marble at ₹120 — 250 sq ft of floor and platform (₹160 labour) and 50 sq ft of windows and stairs (₹180 labour).',
      'Tile material ₹48,540 and marble material ₹43,920; labour ₹62,200 in all; supporting materials ₹20,900.',
      'Subtotal ₹1,75,560 plus 3% extra expenses ₹5,267 gives a total project cost of ₹1,80,827 — about ₹188 per sq ft.',
    ],
    assumptions: [
      'Every rate is the one you enter. Nothing is assumed about the brand, grade or quality of the tile or marble.',
      'Skirting is 6 inches high, along walls estimated from 12 × 12 ft rooms; marble skirting runs along the floor and platform area only.',
      'Wastage is 5% for tile and 7% for marble, on the area plus skirting.',
      'Setting materials use per-sq-ft consumption from the upper end of the usual ranges for a mortar-bed floor of about an inch, with a margin for levelling and loss. Real consumption depends on the site, so treat the quantities as a guide.',
      'Each line is rounded to the nearest rupee, so the lines add up exactly to the totals shown.',
    ],
    notes: [
      'Skirting, wastage and the quantity to buy are rounded up to whole sq ft. Tiles are sold by the box, so round up to whole boxes when you order.',
      'Use the calculator button beside each area to add up room sizes without leaving the page.',
      'Your inputs are saved in this browser, so the estimate is still here when you come back. Use Print / PDF or CSV to keep or share a copy.',
    ],
    faqs: [
      {
        q: 'Do I need to measure every room?',
        a: 'No. Add up the areas yourself — the calculator button beside each area helps — and enter one total for tile and two for marble. Skirting and wastage are added on top.',
      },
      {
        q: 'How much skirting does a 12 × 12 ft room need?',
        a: 'About 24 sq ft. The room has 48 ft of wall (4 × 12), and 6-inch skirting is 48 × 0.5 = 24 sq ft. A common slip is to multiply the floor area, 144, by the height — that gives 72 sq ft, three times too much, because skirting follows the walls, not the floor.',
      },
      {
        q: 'Why is labour worked on a smaller area than the material?',
        a: 'Because you buy extra material for skirting and for cutting losses, but the mason is paid for the area actually laid. Labour uses the area you entered; the material uses the larger required quantity.',
      },
      {
        q: 'Why are there two marble areas?',
        a: 'Window sills, frames and stairs take more cutting, edging and finishing than a floor, so they are usually charged at a higher labour rate. Entering them separately prices each correctly.',
      },
      {
        q: 'Are the sand, cement and grout quantities exact?',
        a: 'No. They come from consumption assumptions per sq ft. Real consumption depends on the surface, mortar thickness, joint width, installation method and the contractor. Confirm quantities before buying.',
      },
      {
        q: 'What do extra expenses cover?',
        a: 'Transport, loading and unloading, breakage, spacers, chemicals and the small purchases every job needs. The calculator adds a fixed 3% of the project cost for them.',
      },
      {
        q: 'Can I use only tile or only marble?',
        a: 'Yes. Leave the other areas at zero. The total and the average cost per sq ft then cover only what you entered.',
      },
    ],
  },
};

export default flooring;
