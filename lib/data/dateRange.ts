import { addCalendarDays, addCalendarMonths, calendarDateInTimezone, calendarDateToUtcEnd, calendarDateToUtcStart, isValidTimezone, type CalendarDate } from "./timezone";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_14_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month"
  | "last_month"
  | "custom";

export type ComparePreset = "previous_period" | "previous_month" | "previous_year" | "none";

/**
 * Resolves a date-range preset into real UTC instants, computed in
 * `timezone` (the connected account/store's own IANA zone — see
 * lib/data/timezone.ts's getClientTimezone) so "Today" genuinely means
 * today in that timezone, not the server process's local time. Defaults
 * `timezone` to "UTC" only as a last resort — every call site should pass
 * the real resolved timezone.
 */
export function resolvePreset(preset: DateRangePreset, timezone: string = "UTC", custom?: { start: string; end: string }) {
  if (preset === "custom" && custom) {
    return { start: new Date(custom.start), end: new Date(custom.end) };
  }

  // Defensive: a bad timezone string here would throw inside
  // Intl.DateTimeFormat and break the whole page. getClientTimezone
  // already validates before returning, but this call site doesn't trust
  // that blindly — an unvalidated caller falls back to UTC instead of
  // crashing.
  const tz = isValidTimezone(timezone) ? timezone : "UTC";
  const today = calendarDateInTimezone(new Date(), tz);
  let startCal: CalendarDate = today;
  let endCal: CalendarDate = today;

  switch (preset) {
    case "today":
      break;
    case "yesterday":
      startCal = addCalendarDays(today, -1);
      endCal = startCal;
      break;
    case "last_7_days":
      startCal = addCalendarDays(today, -6);
      break;
    case "last_14_days":
      startCal = addCalendarDays(today, -13);
      break;
    case "last_30_days":
      startCal = addCalendarDays(today, -29);
      break;
    case "last_90_days":
      startCal = addCalendarDays(today, -89);
      break;
    case "this_month":
      startCal = { ...today, day: 1 };
      break;
    case "last_month": {
      const lastMonth = addCalendarMonths(today, -1);
      startCal = { ...lastMonth, day: 1 };
      // Last day of last month = day before day-1 of this month.
      endCal = addCalendarDays({ ...today, day: 1 }, -1);
      break;
    }
    case "custom":
      // No custom range supplied — fall back to today, same as an
      // unrecognized preset would, rather than silently picking a
      // different range.
      break;
  }

  return { start: calendarDateToUtcStart(startCal, tz), end: calendarDateToUtcEnd(endCal, tz) };
}

export function comparisonRange(
  current: { start: Date; end: Date },
  mode: ComparePreset
): { start: Date; end: Date } | null {
  if (mode === "none") return null;
  const spanMs = current.end.getTime() - current.start.getTime();

  if (mode === "previous_period") {
    const end = new Date(current.start.getTime() - 1);
    const start = new Date(end.getTime() - spanMs);
    return { start, end };
  }
  if (mode === "previous_month") {
    const start = new Date(current.start);
    start.setMonth(start.getMonth() - 1);
    const end = new Date(current.end);
    end.setMonth(end.getMonth() - 1);
    return { start, end };
  }
  if (mode === "previous_year") {
    const start = new Date(current.start);
    start.setFullYear(start.getFullYear() - 1);
    const end = new Date(current.end);
    end.setFullYear(end.getFullYear() - 1);
    return { start, end };
  }
  return null;
}

export const DATE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 days",
  last_14_days: "Last 14 days",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
  this_month: "This month",
  last_month: "Last month",
  custom: "Custom range",
};
