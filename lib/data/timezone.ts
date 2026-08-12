// Timezone-correct calendar-day arithmetic, with zero new dependencies —
// built on Intl.DateTimeFormat, which every Node runtime this app targets
// ships full ICU data for.
//
// Audit finding this fixes: date range presets ("Today", "Yesterday", ...)
// were previously computed with plain `new Date()` + `setHours()`, which
// operate in the SERVER PROCESS's local timezone — not the connected ad
// account's or Shopify store's real timezone. A client in Africa/Cairo
// viewing "Today" while the server runs in UTC could see the wrong day's
// data near midnight in either zone. Every date-range call site now must
// resolve the relevant platform's real timezone (see getClientTimezone
// below) and pass it through explicitly.

import { prisma } from "@/lib/prisma";
import type { AdPlatform } from "@/lib/platforms/types";

/** The wall-clock offset (in ms) of `timeZone` from UTC, at the instant `date` — correctly DST-aware since it's evaluated at that specific instant. */
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

/**
 * Meta's Marketing API documents `timezone_name` only as "name for the
 * time zone" — not confirmed to always be a strict IANA identifier the way
 * Shopify's `iana_timezone` explicitly is. Rather than assume and risk
 * Intl.DateTimeFormat throwing (which would break every date range on the
 * page), every timezone string is validated before use; an invalid one
 * falls back to "UTC" — the same safe default used when nothing has synced
 * yet — instead of crashing.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type CalendarDate = { year: number; month: number; day: number };

/** The real Y-M-D calendar date `instant` falls on, as seen in `timeZone`. */
export function calendarDateInTimezone(instant: Date, timeZone: string): CalendarDate {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

/** Adds `deltaDays` (may be negative) to a calendar date — pure calendar arithmetic, timezone-independent. */
export function addCalendarDays({ year, month, day }: CalendarDate, deltaDays: number): CalendarDate {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function addCalendarMonths({ year, month, day }: CalendarDate, deltaMonths: number): CalendarDate {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCMonth(d.getUTCMonth() + deltaMonths);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function withDay({ year, month }: CalendarDate, day: number): CalendarDate {
  return { year, month, day };
}

/** The real UTC instant that is midnight (00:00:00.000) of the given calendar date, in `timeZone`. */
export function calendarDateToUtcStart(cal: CalendarDate, timeZone: string): Date {
  const guessUtc = Date.UTC(cal.year, cal.month - 1, cal.day, 0, 0, 0, 0);
  const offsetMs = getTimezoneOffsetMs(new Date(guessUtc), timeZone);
  return new Date(guessUtc - offsetMs);
}

/** The real UTC instant that is the last millisecond (23:59:59.999) of the given calendar date, in `timeZone`. */
export function calendarDateToUtcEnd(cal: CalendarDate, timeZone: string): Date {
  const nextDayStart = calendarDateToUtcStart(addCalendarDays(cal, 1), timeZone);
  return new Date(nextDayStart.getTime() - 1);
}

/**
 * The real timezone to use for this client's date-range calculations, for
 * the given platform. Meta/TikTok: AdAccount.timezone, captured from each
 * platform's own API at sync time (see lib/meta/sync.ts, lib/tiktok/sync.ts).
 * Shopify: ShopifyConnection.timezone, captured from shop.iana_timezone
 * (see lib/shopify/sync.ts). Falls back to "UTC" — never a guessed
 * real-world zone — when nothing has synced yet.
 */
export async function getClientTimezone(clientId: string, platform: AdPlatform | "SHOPIFY"): Promise<string> {
  let stored: string | null | undefined;
  if (platform === "SHOPIFY") {
    const conn = await prisma.shopifyConnection.findUnique({ where: { clientId }, select: { timezone: true } });
    stored = conn?.timezone;
  } else {
    const adAccount = await prisma.adAccount.findFirst({ where: { clientId, adPlatform: platform }, select: { timezone: true } });
    stored = adAccount?.timezone;
  }
  if (stored && isValidTimezone(stored)) return stored;
  return "UTC";
}
