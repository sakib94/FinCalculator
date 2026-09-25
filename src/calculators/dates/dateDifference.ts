import type { CalculatorDef, ValidationErrors, Values } from '../types';
import { dateDifference, type DateDiffResult } from '@/engines/dates';
import { formatNumber, toISODate } from '@/lib/format';
import { str } from '@/lib/validate';

const addDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

const dateDiff: CalculatorDef<DateDiffResult> = {
  id: 'date-difference',

  fields: [
    { name: 'start', label: 'Start Date', type: 'date', default: toISODate(new Date()) },
    { name: 'end', label: 'End Date', type: 'date', default: addDays(90) },
    {
      name: 'inclusive',
      label: 'Count both dates',
      type: 'segmented',
      default: 'no',
      options: [
        { label: 'Days between', value: 'no' },
        { label: 'Include both days', value: 'yes' },
      ],
      help: 'Notice periods and leave applications usually count both the first and the last day.',
    },
  ],

  validate: (v: Values): ValidationErrors => {
    const r = dateDifference(str(v.start), str(v.end), false);
    return r.valid ? {} : { end: 'Please enter two valid dates.' };
  },

  compute: (v) => dateDifference(str(v.start), str(v.end), str(v.inclusive) === 'yes'),

  hero: (r) => ({
    label: 'Difference',
    value: `${formatNumber(r.totalDays)} days`,
    caption: `${r.years} years, ${r.months} months and ${r.days} days${r.reversed ? ' (dates were swapped)' : ''}`,
  }),

  stats: (r) => [
    { label: 'Total weeks', value: `${formatNumber(r.totalWeeks)}${r.remainderDays ? ` + ${r.remainderDays}d` : ''}` },
    { label: 'Total months', value: formatNumber(r.totalMonths) },
    { label: 'Total hours', value: formatNumber(r.totalHours) },
    { label: 'Weekdays', value: formatNumber(r.weekdays), tone: 'accent' },
    { label: 'Weekend days', value: formatNumber(r.weekendDays) },
    { label: 'Start / end day', value: `${r.startWeekday.slice(0, 3)} → ${r.endWeekday.slice(0, 3)}` },
  ],

  charts: (r) => [
    {
      kind: 'donut' as const,
      title: 'Weekdays vs weekend days',
      centerLabel: 'Days',
      format: (n: number) => `${formatNumber(n)} d`,
      data: [
        { label: 'Weekdays', value: r.weekdays },
        { label: 'Weekend days', value: r.weekendDays },
      ],
    },
  ],

  summary: (r) =>
    `${formatNumber(r.totalDays)} days (${r.years}y ${r.months}m ${r.days}d), of which ${formatNumber(
      r.weekdays,
    )} are weekdays.`,

  content: {
    howItWorks: [
      'The difference between two dates is reported two ways, because both are useful. The calendar difference — years, months and days — is what contracts and notice periods use. The total day count is what you need for interest, penalties and deadlines.',
      'Weekday and weekend counts are produced by walking the range day by day, so public holidays aside, the figure is exact rather than an approximation based on dividing by seven.',
    ],
    formula: `Total days = end date − start date      (+1 when both days are counted)
Calendar difference = whole years, then whole months, then leftover days
Weekdays = days in range that are not Saturday or Sunday`,
    example: [
      'From 1 April 2026 to 30 June 2026: 90 days between the dates, 91 if both are counted.',
      'That is 2 months and 29 days in calendar terms, with 65 weekdays.',
    ],
    assumptions: [
      'Public holidays are not excluded — only Saturdays and Sundays are treated as non-working days.',
      'If the end date is earlier than the start date, the two are swapped so the difference is never negative.',
    ],
    faqs: [
      {
        q: 'Should I include both the start and end date?',
        a: 'For a notice period, leave application or hotel stay, usually yes. For interest calculations and deadlines, usually no. Use the toggle to switch between the two.',
      },
      {
        q: 'Why do the months and days not simply come from the total days?',
        a: 'Months have different lengths, so 90 days is not exactly three months. The calendar difference counts real months on the calendar, which is what agreements and legal documents mean.',
      },
    ],
  },
};

export default dateDiff;
