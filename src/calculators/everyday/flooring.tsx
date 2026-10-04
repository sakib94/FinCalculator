import type { CalculatorDef } from '../types';
import { calculateFlooringEstimate, type FlooringResult } from '@/engines/flooring';
import { formatINR, formatNumber } from '@/lib/format';
import { FlooringWorkspace } from '@/components/FlooringWorkspace';
import { defaultInput } from './flooringModel';

/**
 * Tile & Marble Flooring Cost Calculator.
 *
 * Rooms come and go and whole sections switch on and off, which a flat
 * field list cannot express, so the inputs and results live in their own
 * workspace (src/components/FlooringWorkspace.tsx). `compute` and `hero`
 * describe the example the page opens with.
 */
const flooring: CalculatorDef<FlooringResult> = {
  id: 'tile-marble-flooring',
  fields: [],
  compute: () => calculateFlooringEstimate(defaultInput()),
  hero: (r) => ({
    label: 'Grand total',
    value: formatINR(r.grandTotal),
    caption: `${formatNumber(r.totalArea)} sq ft of flooring`,
  }),
  workspace: FlooringWorkspace,
  workspaceSections: [
    { id: 'fl-estimate', label: 'Estimate' },
    { id: 'fl-working', label: 'Workings' },
  ],

  content: {
    intro: {
      heading: 'What does tile or marble flooring cost?',
      paragraphs: [
        'The price of tile or marble per square foot is only the start. A real flooring budget also has to cover the extra material bought for cutting and breakage, the laying charge, the cement and sand of the mortar bed, white cement or grout for the joints, skirting along the walls, a marble staircase if there is one, polishing, transport and a cushion for surprises.',
        'This calculator puts all of it in one place. Measure each room, hall, kitchen and any other space in feet or metres, say how much of the floor is tile and how much is marble, and enter the rates your supplier and contractor actually quote you. It works out the quantities, prices every item and shows the grand total and the average cost per square foot — with the arithmetic behind every figure.',
      ],
    },
    howItWorks: [
      'Every space is measured as length × width or entered directly as an area. Metric entries are worked in m² first and converted at 1 m² = 10.7639 sq ft, so a 5 m × 4 m room is 20 m², or 215.28 sq ft. The rooms, hall, kitchen and other areas add up to the total flooring area.',
      'With one material, it covers the whole floor. With both, you decide how many square feet are tile and how many are marble; the two together cannot exceed the total floor area.',
      'Wastage is added to the material you buy, not to the labour: 1,200 sq ft of tile with 5% wastage means buying 1,260 sq ft, while the laying charge is paid on the 1,200 sq ft actually laid. Polishing is also charged on the marble area alone.',
      'A marble staircase is priced per step and kept out of the floor area. The per-step price is quoted for a base width — usually 3 ft — and scaled to the real width of your steps: ₹1,000 for a 3 ft step becomes ₹4,000 for a 12 ft step. Risers and nosing can be added separately.',
      'Cement, sand and white cement are estimated from consumption per square foot of flooring; cement and adhesive are rounded up to whole bags. Contingency is a percentage of every cost before it, and the average cost per sq ft divides the grand total by the actual floor area — not the larger purchase area.',
    ],
    sections: [
      {
        heading: 'A worked example: a 2,000 sq ft home',
        paragraphs: [
          'Three rooms, a hall, a kitchen and a dining area add up to 2,000 sq ft. Of that, 1,200 sq ft is tile at ₹60 a sq ft with ₹40 labour and 5% wastage, and 800 sq ft is marble at ₹120 with ₹65 labour and 7% wastage. There is also a 20-step marble staircase at ₹1,000 a step for 3 ft wide steps.',
        ],
        table: {
          caption: 'The calculator’s opening example',
          columns: ['Item', 'Working', 'Cost'],
          rows: [
            ['Tile', '1,200 + 5% = 1,260 sq ft × ₹60', '₹75,600'],
            ['Tile labour', '1,200 sq ft × ₹40', '₹48,000'],
            ['Marble', '800 + 7% = 856 sq ft × ₹120', '₹1,02,720'],
            ['Marble labour', '800 sq ft × ₹65', '₹52,000'],
            ['Staircase', '20 steps × ₹1,000', '₹20,000'],
            ['Cement', '2,000 × 0.02 = 40 bags × ₹450', '₹18,000'],
            ['Sand', '2,000 × 0.1 = 200 CFT × ₹60', '₹12,000'],
            ['White cement', '2,000 × 0.03 = 60 kg × ₹80', '₹4,800'],
            ['Contingency', '5% of ₹3,33,120', '₹16,656'],
            ['Grand total', '₹3,49,776 ÷ 2,000 sq ft', '₹174.89 per sq ft'],
          ],
        },
      },
      {
        heading: 'Why the calculator asks for your rate, not a tile or marble type',
        paragraphs: [
          'Two vitrified tiles can differ in price by five times, and Indian marble ranges from under ₹60 to several hundred rupees a square foot depending on the quarry, grade, thickness and city. A list of types with a built-in price would be wrong for most people.',
          'Enter the rate on your supplier’s quotation instead. The estimate then reflects the exact material you are buying, wherever you are buying it.',
        ],
      },
      {
        heading: 'How much wastage to allow',
        table: {
          columns: ['Situation', 'Typical wastage'],
          rows: [
            ['Large rectangular rooms, straight laying', '3–5%'],
            ['Normal homes with a few cuts', '5–7%'],
            ['Marble slabs, veined or matched patterns', '7–10%'],
            ['Diagonal or herringbone laying, many small rooms', '10% or more'],
          ],
        },
        after: [
          'The defaults — 5% for tile and 7% for marble — are suggestions you can change. Bigger tiles and slabs, complex layouts and fragile material all push wastage up.',
        ],
      },
    ],
    formula: `Area (ft)          = Length × Width
Area (m)           = Length × Width = m²;  sq ft = m² × 10.7639
Total floor area   = Rooms + Hall + Kitchen + Other areas

Purchase area      = Area × (1 + Wastage ÷ 100)
Material cost      = Purchase area × Rate
Labour cost        = Area × Labour rate          (no wastage)
Polishing          = Marble area × Polishing rate (no wastage)

Cost per step      = Base cost × (Step width ÷ Base width)
Staircase          = Cost per step × Number of steps
Riser area         = Risers × Height × Width
Nosing             = Steps × Length per step × Rate per running ft

Cement (bags)      = Area × bags per sq ft, rounded up
Sand (CFT)         = Area × CFT per sq ft
Adhesive (bags)    = Tile area ÷ Coverage per bag, rounded up
Skirting (rft)     = Σ 2 × (Length + Width) − Openings

Contingency        = Eligible cost × Contingency %
Grand total        = Every item + Contingency
Average per sq ft  = Grand total ÷ Total floor area`,
    example: [
      'A 2,000 sq ft home: 1,200 sq ft of tile at ₹60 (₹40 labour, 5% wastage) and 800 sq ft of marble at ₹120 (₹65 labour, 7% wastage).',
      'Tile ₹75,600 + labour ₹48,000; marble ₹1,02,720 + labour ₹52,000; a 20-step staircase ₹20,000; cement, sand and white cement ₹34,800.',
      'Subtotal ₹3,33,120 plus 5% contingency ₹16,656 gives a grand total of ₹3,49,776 — about ₹175 per sq ft.',
    ],
    assumptions: [
      'Every rate is the one you enter. Nothing is assumed about the brand, grade or quality of the tile or marble.',
      'The floor is laid on a cement–sand mortar bed. The default consumption — 0.02 bag of cement, 0.1 CFT of sand and 0.03 kg of white cement per sq ft — suits a bed of roughly an inch; change it in Advanced mode for your site.',
      'Wastage applies to the material bought, never to labour or polishing.',
      'The staircase is not part of the floor area, so it raises the grand total and the average cost per sq ft without changing the area.',
      'Each line is rounded to the nearest rupee, so the lines always add up to the total shown.',
    ],
    notes: [
      'Use Advanced mode for skirting, adhesive, grout, polishing, risers, nosing, transport, loading, other expenses and contingency.',
      'Automatic skirting uses the perimeter of every space measured by length and width. A space entered as an area only has no known perimeter, so it is listed and left out.',
      'Your inputs are saved in this browser, so the estimate is still there when you come back. Use Print / PDF or CSV to keep or share a copy.',
    ],
    faqs: [
      {
        q: 'How do I calculate the flooring area of my house?',
        a: 'Measure each room wall to wall and multiply length by width. Add the hall, kitchen, dining, passage and any other area you are flooring. In metres, multiply to get m² and then multiply by 10.7639 for square feet. The calculator does all of this as you type.',
      },
      {
        q: 'Should wastage be added to labour?',
        a: 'No. You buy extra material to allow for cutting and breakage, but the mason is paid for the area actually laid. The calculator adds wastage to the material only.',
      },
      {
        q: 'How is a marble staircase priced?',
        a: 'Usually per step, for a standard width such as 3 ft. Wider steps cost proportionally more: at ₹1,000 for a 3 ft step, a 6 ft step is ₹2,000 and a 12 ft step ₹4,000. Enter the number of steps and the step width separately — a “12 ft staircase” means 12 ft wide steps, not 12 steps.',
      },
      {
        q: 'Are the cement and sand quantities exact?',
        a: 'No. They come from consumption assumptions per square foot. Real consumption depends on the floor level, mortar thickness, joint width, the installation method and the contractor. Treat them as a planning estimate and confirm with your contractor before buying.',
      },
      {
        q: 'Can I use tile in some rooms and marble in others?',
        a: 'Yes. Tick both, then enter the tile area and the marble area. The calculator checks that the two fit inside the total floor area and shows how much floor is left over.',
      },
      {
        q: 'What should the contingency be?',
        a: 'Five per cent is a common starting point for flooring. Use more for old floors that need levelling, fragile or imported material, or when prices are rising.',
      },
      {
        q: 'Why is the average cost per sq ft higher than my tile rate?',
        a: 'Because it includes everything: wastage, labour, mortar, joints, the staircase, transport and contingency, all divided by the floor area. It is the true all-in cost of each square foot.',
      },
    ],
  },
};

export default flooring;
