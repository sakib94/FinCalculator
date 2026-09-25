import type { CalculatorDef, ValidationErrors, Values } from '../types';
import { calculateAge, type AgeResult } from '@/engines/dates';
import { formatDate, formatNumber, toISODate } from '@/lib/format';
import { str } from '@/lib/validate';
import { Note } from '@/components/Results';

const today = () => toISODate(new Date());

const age: CalculatorDef<AgeResult> = {
  id: 'age',

  fields: [
    {
      name: 'dob',
      label: 'Date of Birth',
      type: 'date',
      default: '1994-05-12',
      help: 'The date you were born. Everything else is derived from it.',
    },
    {
      name: 'asOf',
      label: 'Calculate As Of Date',
      type: 'date',
      default: today(),
      help: 'Defaults to today. Change it to find your age on any past or future date.',
    },
  ],

  validate: (v: Values): ValidationErrors => {
    const result = calculateAge(str(v.dob), str(v.asOf));
    if (!result.valid) return { dob: 'Please enter a valid date of birth.' };
    if (result.future) return { dob: 'Date of birth cannot be after the “as of” date.' };
    return {};
  },

  compute: (v) => calculateAge(str(v.dob), str(v.asOf)),

  hero: (r) => ({
    label: 'Your age',
    value: `${r.years} yrs ${r.months} mo ${r.days} d`,
    caption: `You are ${r.years} years, ${r.months} months and ${r.days} days old.`,
  }),

  stats: (r) => [
    { label: 'Total months', value: formatNumber(r.totalMonths) },
    { label: 'Total weeks', value: formatNumber(r.totalWeeks) },
    { label: 'Total days', value: formatNumber(r.totalDays) },
    { label: 'Total hours', value: formatNumber(r.totalHours) },
    { label: 'Born on a', value: r.bornOn },
    {
      label: 'Days to next birthday',
      value: formatNumber(r.daysToNextBirthday),
      tone: 'accent',
    },
  ],

  extra: (r) => (
    <>
      {r.nextBirthday && (
        <section className="card card-pad">
          <div className="section-label" style={{ marginBottom: 10 }}>
            Next birthday
          </div>
          <dl style={{ margin: 0 }}>
            <div className="kv">
              <dt>Date</dt>
              <dd>{formatDate(r.nextBirthday)}</dd>
            </div>
            <div className="kv">
              <dt>Falls on a</dt>
              <dd>{r.nextBirthdayWeekday}</dd>
            </div>
            <div className="kv">
              <dt>You will turn</dt>
              <dd>{r.turningAge}</dd>
            </div>
            <div className="kv total">
              <dt>Days to go</dt>
              <dd>
                {r.daysToNextBirthday === 0 ? 'Today 🎉' : formatNumber(r.daysToNextBirthday)}
              </dd>
            </div>
          </dl>
        </section>
      )}
      <Note>
        Age is counted in calendar terms: whole years first, then whole months, then the remaining days —
        the same way official forms and passports count it. Leap days are handled automatically.
      </Note>
    </>
  ),

  summary: (r) => `Age: ${r.years} years, ${r.months} months and ${r.days} days (${formatNumber(r.totalDays)} days).`,

  content: {
    howItWorks: [
      'Age is a calendar calculation, not a division of days by 365.25. The calculator counts complete years from your date of birth, then complete months, then the days left over — which is why the answer matches what a passport or a government form expects.',
      'Because the arithmetic works on calendar dates, leap years and months of different lengths are handled naturally: someone born on 31 January turns a month older on 28 or 29 February, and a 29 February birthday falls back to 28 February in non-leap years.',
    ],
    formula: `years  = as-of year − birth year
months = as-of month − birth month      (borrow 12 if negative)
days   = as-of day − birth day          (borrow the previous month's length)`,
    example: [
      'Born 12 May 1994, calculated on 24 September 2026.',
      'Years: 2026 − 1994 = 32. Months: September − May = 4. Days: 24 − 12 = 12.',
      'Result: 32 years, 4 months and 12 days — about 11,793 days.',
    ],
    assumptions: [
      'Dates are treated as local calendar dates, so the result never shifts by a day because of time zones.',
      'The day you were born counts as day zero; you turn one day old the following day.',
    ],
    faqs: [
      {
        q: 'How is age calculated for school admission or government forms?',
        a: 'Almost always as completed years, months and days on a fixed cut-off date. Set the “as of” date to that cut-off and read the years figure.',
      },
      {
        q: 'What about a 29 February birthday?',
        a: 'In non-leap years the birthday is treated as 28 February, which is the common legal convention in India, so the countdown to the next birthday still works.',
      },
      {
        q: 'Can I calculate age on a future date?',
        a: 'Yes. Set the “as of” date to any future date to see how old you — or anyone else — will be then.',
      },
    ],
  },
};

export default age;
