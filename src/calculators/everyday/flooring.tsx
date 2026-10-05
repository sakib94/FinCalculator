import type { CalculatorDef } from '../types';
import { calculateFlooringEstimate, type FlooringResult } from '@/engines/flooring';
import { formatINR, formatNumber } from '@/lib/format';
import { FlooringWorkspace } from '@/components/FlooringWorkspace';
import { defaultInput } from './flooringModel';

/**
 * Tile & Marble Cost Calculator.
 *
 * Two tabs over one project, with a staircase, window and door finishing
 * and supporting materials — more than a flat field list can express — so
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
        'You know roughly how much tile and marble you need — the rooms, hall and bathrooms in tile, the kitchen floor and platform in marble. What is harder to add up is everything around it: the extra pieces for skirting, wastage from cutting, the laying labour, a marble staircase, finishing around windows and doors, the sand and cement under the floor, grout and white cement for the joints, and the small expenses that always turn up.',
        'This calculator does that adding up. Enter your total tile area and total marble area, the rates you have been quoted and the labour charges; skirting, wastage, setting materials and an extra-expenses allowance are added automatically. Both tabs feed one project total, with the arithmetic behind every figure.',
      ],
    },
    howItWorks: [
      'Enter the tile and marble areas you have worked out yourself — there is no need to measure room by room. These areas never change: labour and the average cost per sq ft are based on them.',
      'To find what to buy, the calculator adds skirting (5% of the area by default) and then wastage on the area plus skirting (5% for tile, 7% for marble). 660 sq ft of tile becomes 660 + 33 = 693 sq ft, plus 34.65 sq ft of wastage: 727.65 sq ft to buy. The material cost is that quantity times your rate.',
      'Labour is charged on the area you entered, never on skirting or wastage. Marble labour per sq ft covers the marble floor and kitchen platform; the staircase, windows and doors are priced separately so nothing is counted twice.',
      'The marble staircase keeps the usual per-step pricing: the labour quoted for a base width — say ₹1,000 for a 3 ft step — is scaled to the real width of your steps. A 12 ft step costs ₹1,000 × 12 ÷ 3 = ₹4,000, and three of them ₹12,000. The number of steps and the width are separate inputs, so “12 ft” is never mistaken for 12 steps.',
      'Sand, cement, white cement and grout are estimated from consumption per sq ft and rounded up to whole bags, kilograms and CFT. Extra expenses are a percentage of everything before them, 3% by default.',
    ],
    sections: [
      {
        heading: 'A worked example: tile in the rooms, marble in the kitchen',
        paragraphs: [
          'Two rooms, a hall, a kitchen and bathrooms, measured by the owner as 660 sq ft of tile and 300 sq ft of marble. Tile is ₹60 a sq ft with ₹20 labour; marble is ₹120 with ₹200 labour for the floor and platform. There are three 12 ft marble steps at ₹1,000 per 3 ft step, three windows at ₹1,000 and three doors at ₹1,500.',
        ],
        table: {
          caption: 'The calculator’s opening example',
          columns: ['Item', 'Working', 'Cost'],
          rows: [
            ['Tile material', '660 + 5% skirting + 5% wastage = 727.65 sq ft × ₹60', '₹43,659'],
            ['Marble material', '300 + 5% skirting + 7% wastage = 337.05 sq ft × ₹120', '₹40,446'],
            ['Tile labour', '660 sq ft × ₹20', '₹13,200'],
            ['Marble floor & platform labour', '300 sq ft × ₹200', '₹60,000'],
            ['Staircase labour', '3 steps × ₹1,000 × 12 ÷ 3', '₹12,000'],
            ['Window & door finishing', '3 × ₹1,000 + 3 × ₹1,500', '₹7,500'],
            ['Sand, cement, white cement, grout', '96 CFT, 20 bags, 15 kg, 17 kg', '₹17,660'],
            ['Extra expenses', '3% of ₹1,94,465', '₹5,834'],
            ['Total project cost', '₹2,00,299 ÷ 960 sq ft', '₹208.64 per sq ft'],
          ],
        },
      },
      {
        heading: 'Why you enter a rate, not a tile or marble type',
        paragraphs: [
          'Two vitrified tiles can differ in price by five times, and marble ranges from under ₹60 to several hundred rupees a sq ft depending on the stone, grade, thickness and city. A list of types with built-in prices would be wrong for most people.',
          'Enter the rate on your supplier’s quotation and the estimate reflects exactly what you are buying, wherever you are buying it.',
        ],
      },
      {
        heading: 'How much skirting and wastage to allow',
        table: {
          columns: ['Allowance', 'Typical', 'Use more when'],
          rows: [
            ['Tile skirting', '5% of the area', 'Many small rooms or long passages'],
            ['Marble skirting', '5% of the area', 'Tall skirting or a lot of wall length'],
            ['Tile wastage', '3–7%', 'Large tiles, diagonal laying, many cuts'],
            ['Marble wastage', '5–10%', 'Veined slabs that must match, fragile stone'],
          ],
        },
        after: ['The suggested defaults are editable. Set skirting to 0% if your skirting is priced separately or you are not fitting any.'],
      },
    ],
    formula: `Tile / marble quantity
  Skirting        = Area × Skirting %
  Subtotal        = Area + Skirting
  Wastage         = Subtotal × Wastage %
  Total required  = Subtotal + Wastage
  Material        = Total required × Rate
  Labour          = Area × Labour rate        (no skirting, no wastage)

Staircase labour  = Steps × Base cost × (Step width ÷ Base width)
Windows           = Windows × Cost per window
Doors             = Doors × Cost per door

Sand (CFT)        = (Tile + Marble area) × 0.1
Cement (bags)     = (Tile + Marble area) × 0.02, rounded up
White cement (kg) = Marble area × 0.05, rounded up
Grout (kg)        = Tile area × 0.025, rounded up

Subtotal          = Material + Labour + Supporting materials
Extra expenses    = Subtotal × Extra %
Total             = Subtotal + Extra expenses
Average per sq ft = Total ÷ (Tile area + Marble area)`,
    example: [
      '660 sq ft of tile at ₹60 (₹20 labour) and 300 sq ft of marble at ₹120 (₹200 labour), three 12 ft marble steps, three windows and three doors.',
      'Tile material ₹43,659 and marble material ₹40,446; labour ₹92,700 in all; supporting materials ₹17,660.',
      'Subtotal ₹1,94,465 plus 3% extra expenses ₹5,834 gives a total project cost of ₹2,00,299 — about ₹209 per sq ft of tile and marble.',
    ],
    assumptions: [
      'Every rate is the one you enter. Nothing is assumed about the brand, grade or quality of the tile or marble.',
      'Skirting is a share of the area; wastage is a share of the area plus skirting.',
      'Labour is paid on the area entered. Marble labour per sq ft covers the floor and kitchen platform; the staircase, windows and doors are separate.',
      'Setting materials use per-sq-ft consumption suited to a mortar-bed floor of about an inch. Real consumption depends on the site, so treat the quantities as a guide.',
      'Each line is rounded to the nearest rupee, so the lines add up exactly to the totals shown.',
    ],
    notes: [
      'The required quantity is shown to two decimals for checking, with a whole number to order alongside. Tiles are sold by the box, so round up to whole boxes when you order.',
      'Your inputs are saved in this browser, so the estimate is still here when you come back. Use Print / PDF or CSV to keep or share a copy.',
    ],
    faqs: [
      {
        q: 'Do I need to measure every room?',
        a: 'No. Add up the areas yourself — or take them from your contractor or plan — and enter one total for tile and one for marble. The calculator adds skirting and wastage on top.',
      },
      {
        q: 'Why is labour worked on a smaller area than the material?',
        a: 'Because you buy extra material for skirting and for cutting losses, but the mason is paid for the floor actually laid. Labour uses the area you entered; the material uses the larger required quantity.',
      },
      {
        q: 'Does the marble labour rate include the staircase, windows and doors?',
        a: 'No. Marble labour per sq ft covers the marble floor and kitchen platform. The staircase is priced per step, and window and door finishing per piece, so each is counted once.',
      },
      {
        q: 'How is the marble staircase priced?',
        a: 'Per step, for a base width such as 3 ft, scaled to the real width. At ₹1,000 for a 3 ft step, a 12 ft step is ₹4,000; three such steps are ₹12,000. Enter the number of steps and the step width separately.',
      },
      {
        q: 'Are the sand, cement and grout quantities exact?',
        a: 'No. They come from consumption assumptions per sq ft. Real consumption depends on the surface, mortar thickness, joint width, installation method and the contractor. Confirm quantities before buying.',
      },
      {
        q: 'What do extra expenses cover?',
        a: 'Transport, loading and unloading, breakage, spacers, chemicals and the small purchases every job needs. 3% of the project cost is a sensible default; use 5% for a complicated job or rising prices.',
      },
      {
        q: 'Can I use only tile or only marble?',
        a: 'Yes. Leave the other area at zero, and set the staircase, windows or doors to zero if you have none. The total and the average cost per sq ft then cover only what you entered.',
      },
    ],
  },
};

export default flooring;
