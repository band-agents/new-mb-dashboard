// Server-only (uses next/headers cookies()) — do not import from a Client Component.
import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName, type Locale } from "./config";

/** Server-only: reads the active locale from the NEXT_LOCALE cookie. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
}
