"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPlatformAction } from "@/lib/platforms/actions";
import type { PlatformSelection } from "@/lib/platforms/config";
import { PLATFORM_TERMINOLOGY, PLATFORM_LABEL, type AdPlatform } from "@/lib/platforms/types";

type PlatformContextValue = {
  platform: PlatformSelection;
  setPlatform: (platform: PlatformSelection) => void;
  pending: boolean;
  /** Terminology for the active single platform — falls back to Meta's wording when platform is "ALL" (used only where a page must show *a* label, e.g. a combined-view heading). */
  terminology: (typeof PLATFORM_TERMINOLOGY)["META"];
  label: string;
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ platform, children }: { platform: PlatformSelection; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setPlatform(next: PlatformSelection) {
    startTransition(async () => {
      await setPlatformAction(next);
      router.refresh();
    });
  }

  const singlePlatform: AdPlatform = platform === "ALL" ? "META" : platform;

  const value: PlatformContextValue = {
    platform,
    setPlatform,
    pending,
    terminology: PLATFORM_TERMINOLOGY[singlePlatform],
    label: platform === "ALL" ? "All Platforms" : PLATFORM_LABEL[platform],
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within a PlatformProvider");
  return ctx;
}
