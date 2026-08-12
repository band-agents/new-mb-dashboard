import { AD_PLATFORMS, type AdPlatform } from "./types";

export const platformCookieName = "NEXT_AD_PLATFORM";
export const defaultPlatform: AdPlatform = "META";

/** "ALL" is the combined/blended view; anything else must be a real AdPlatform. */
export type PlatformSelection = AdPlatform | "ALL";

export function isPlatformSelection(value: string | undefined | null): value is PlatformSelection {
  return !!value && (value === "ALL" || (AD_PLATFORMS as readonly string[]).includes(value));
}
