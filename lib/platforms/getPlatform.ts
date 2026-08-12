// Server-only (uses next/headers cookies()) — do not import from a Client Component.
import { cookies } from "next/headers";
import { defaultPlatform, isPlatformSelection, platformCookieName, type PlatformSelection } from "./config";

export async function getPlatform(): Promise<PlatformSelection> {
  const store = await cookies();
  const value = store.get(platformCookieName)?.value;
  return isPlatformSelection(value) ? value : defaultPlatform;
}
