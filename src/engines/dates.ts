/**
 * Calendar maths.
 *
 * All dates are handled as LOCAL calendar dates (year, month, day) — never
 * as UTC timestamps — so a birthday never shifts by a day for users east or
 * west of GMT. Leap years fall out of the arithmetic naturally.
 */

export const MS_PER_DAY = 86_400_000;

export function parseDate(value: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) {
    const [, y, mo, d] = m;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    if (
      date.getFullYear() !== Number(y) ||
      date.getMonth() !== Number(mo) - 1 ||
      date.getDate() !== Number(d)
    )
      return null;
    return date;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const daysBetween = (a: Date, b: Date): number =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY);

/** Calendar difference: whole years, then whole months, then days. */
export function calendarDiff(from: Date, to: Date): { years: number; months: number; days: number } {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    // Borrow from the month preceding the end date. The start day is clamped to
    // that month's length so 31 Jan → 1 Mar reads as "1 month 1 day", not a
    // negative remainder.
    const prevMonthDays = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    days = to.getDate() + (prevMonthDays - Math.min(from.getDate(), prevMonthDays));
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/* ------------------------------ Age ------------------------------ */

export interface AgeResult {
  valid: boolean;
  future: boolean;
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalWeeks: number;
  totalDays: number;
  totalHours: number;
  bornOn: string;
  nextBirthday: Date | null;
  daysToNextBirthday: number;
  nextBirthdayWeekday: string;
  turningAge: number;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function calculateAge(dobStr: string, asOfStr: string): AgeResult {
  const dob = parseDate(dobStr);
  const asOf = parseDate(asOfStr) ?? new Date();
  const empty: AgeResult = {
    valid: false,
    future: false,
    years: 0,
    months: 0,
    days: 0,
    totalMonths: 0,
    totalWeeks: 0,
    totalDays: 0,
    totalHours: 0,
    bornOn: '',
    nextBirthday: null,
    daysToNextBirthday: 0,
    nextBirthdayWeekday: '',
    turningAge: 0,
  };
  if (!dob) return empty;
  if (dob > asOf) return { ...empty, valid: true, future: true };

  const { years, months, days } = calendarDiff(dob, asOf);
  const totalDays = daysBetween(dob, asOf);

  // Next birthday, handling 29 February gracefully.
  let next = new Date(asOf.getFullYear(), dob.getMonth(), dob.getDate());
  if (next.getMonth() !== dob.getMonth()) next = new Date(asOf.getFullYear(), dob.getMonth() + 1, 0);
  if (daysBetween(asOf, next) < 0) {
    next = new Date(asOf.getFullYear() + 1, dob.getMonth(), dob.getDate());
    if (next.getMonth() !== dob.getMonth()) next = new Date(asOf.getFullYear() + 1, dob.getMonth() + 1, 0);
  }

  return {
    valid: true,
    future: false,
    years,
    months,
    days,
    totalMonths: years * 12 + months,
    totalWeeks: Math.floor(totalDays / 7),
    totalDays,
    totalHours: totalDays * 24,
    bornOn: WEEKDAYS[dob.getDay()],
    nextBirthday: next,
    daysToNextBirthday: daysBetween(asOf, next),
    nextBirthdayWeekday: WEEKDAYS[next.getDay()],
    turningAge: years + 1,
  };
}

/* -------------------------- Date difference -------------------------- */

export interface DateDiffResult {
  valid: boolean;
  reversed: boolean;
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  remainderDays: number;
  totalMonths: number;
  totalHours: number;
  totalMinutes: number;
  weekdays: number;
  weekendDays: number;
  startWeekday: string;
  endWeekday: string;
}

export function dateDifference(startStr: string, endStr: string, inclusive: boolean): DateDiffResult {
  const a = parseDate(startStr);
  const b = parseDate(endStr);
  const empty: DateDiffResult = {
    valid: false,
    reversed: false,
    years: 0,
    months: 0,
    days: 0,
    totalDays: 0,
    totalWeeks: 0,
    remainderDays: 0,
    totalMonths: 0,
    totalHours: 0,
    totalMinutes: 0,
    weekdays: 0,
    weekendDays: 0,
    startWeekday: '',
    endWeekday: '',
  };
  if (!a || !b) return empty;

  const reversed = a > b;
  const from = reversed ? b : a;
  const to = reversed ? a : b;

  const { years, months, days } = calendarDiff(from, to);
  const rawDays = daysBetween(from, to);
  const totalDays = inclusive ? rawDays + 1 : rawDays;

  let weekdays = 0;
  let weekendDays = 0;
  const cursor = new Date(from);
  const spanDays = inclusive ? rawDays + 1 : rawDays;
  for (let i = 0; i < spanDays; i++) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) weekendDays++;
    else weekdays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    valid: true,
    reversed,
    years,
    months,
    days,
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
    remainderDays: totalDays % 7,
    totalMonths: years * 12 + months,
    totalHours: totalDays * 24,
    totalMinutes: totalDays * 24 * 60,
    weekdays,
    weekendDays,
    startWeekday: WEEKDAYS[from.getDay()],
    endWeekday: WEEKDAYS[to.getDay()],
  };
}
