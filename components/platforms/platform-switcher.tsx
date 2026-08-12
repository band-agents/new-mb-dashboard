"use client";

import { ChevronDown, Layers, Music2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePlatform } from "./platform-provider";
import { useLocale } from "@/components/i18n/locale-provider";
import type { PlatformSelection } from "@/lib/platforms/config";

const ICON: Record<PlatformSelection, typeof Layers> = { ALL: Layers, META: Layers, TIKTOK: Music2 };

export function PlatformSwitcher() {
  const { platform, setPlatform, pending } = usePlatform();
  const { t } = useLocale();
  const Icon = ICON[platform];
  const currentLabel = platform === "ALL" ? t("platform.all") : platform === "META" ? t("platform.meta") : t("platform.tiktok");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={pending}
          className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium hover:bg-surface-muted cursor-pointer disabled:opacity-60"
        >
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{currentLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        <DropdownMenuItem onSelect={() => setPlatform("ALL")} className="justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5" /> {t("platform.all")}
          </span>
          {platform === "ALL" && <span className="text-xs text-brand">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setPlatform("META")} className="justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5" /> {t("platform.meta")}
          </span>
          {platform === "META" && <span className="text-xs text-brand">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setPlatform("TIKTOK")} className="justify-between">
          <span className="flex items-center gap-2">
            <Music2 className="h-3.5 w-3.5" /> {t("platform.tiktok")}
          </span>
          {platform === "TIKTOK" && <span className="text-xs text-brand">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
