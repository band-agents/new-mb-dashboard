import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// All formatters take an Intl locale tag ("en-US" | "ar"). Arabic explicitly
// forces numberingSystem: "latn" so figures stay in familiar Western digits —
// only currency/date wording and layout direction change for Arabic, per spec.
function resolveLocale(locale: string) {
  return locale.startsWith("ar") ? "ar-u-nu-latn" : locale;
}

export function formatCurrency(value: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(resolveLocale(locale), {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function formatNumber(value: number, locale = "en-US") {
  return new Intl.NumberFormat(resolveLocale(locale), { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

export function formatCompact(value: number, locale = "en-US") {
  return new Intl.NumberFormat(resolveLocale(locale), { notation: "compact", maximumFractionDigits: 1 }).format(
    value
  );
}

export function formatDate(date: Date | string, locale = "en-US") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(resolveLocale(locale), { month: "short", day: "numeric", year: "numeric" }).format(
    d
  );
}

/** Percent change from previous -> current, safe against divide-by-zero. */
export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}
