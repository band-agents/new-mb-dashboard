"use server";

import { cookies } from "next/headers";
import { isPlatformSelection, platformCookieName } from "./config";

export async function setPlatformAction(platform: string) {
  if (!isPlatformSelection(platform)) return;
  const store = await cookies();
  store.set(platformCookieName, platform, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
