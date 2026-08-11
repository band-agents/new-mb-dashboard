export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const localeCookieName = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}

/** Intl locale tag to use for Intl.NumberFormat/DateTimeFormat — Arabic numbers stay Latin-digit (see t.ts / utils.ts). */
export function intlTag(locale: Locale): string {
  return locale === "ar" ? "ar" : "en-US";
}
