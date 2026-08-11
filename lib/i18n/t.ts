import en from "./dictionaries/en";
import ar from "./dictionaries/ar";
import type { Locale } from "./config";

const dictionaries = { en, ar } as const;

/** Dot-path lookup, e.g. "nav.overview" -> dictionaries[locale].nav.overview. */
function lookup(dict: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = params[key];
    return val === undefined ? match : String(val);
  });
}

/**
 * Translates a dot-path key for the given locale. Falls back to English if
 * the key is missing from the active locale's dictionary, and to the raw
 * key itself if it's missing from English too — so a typo or a not-yet-
 * translated string never renders "undefined" in the UI.
 */
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const primary = lookup(dictionaries[locale], key);
  const fallback = primary ?? lookup(dictionaries.en, key);
  return interpolate(fallback ?? key, params);
}
