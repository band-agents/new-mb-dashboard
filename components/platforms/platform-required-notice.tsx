"use client";

import { Layers, Music2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { usePlatform } from "./platform-provider";

/**
 * Shown instead of a data table on campaign/ad-group/ad/creative pages when
 * "All Platforms" is selected — per spec, single-platform detail views must
 * never mix Meta and TikTok rows together, so these pages ask the user to
 * pick one rather than fabricating a merged table.
 */
export function PlatformRequiredNotice() {
  const { t } = useLocale();
  const { setPlatform } = usePlatform();

  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      <Layers className="h-6 w-6 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{t("platform.pickPlatform")}</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{t("platform.pickPlatformDesc")}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setPlatform("META")}>
          <Layers className="h-3.5 w-3.5" /> {t("platform.switchToMeta")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPlatform("TIKTOK")}>
          <Music2 className="h-3.5 w-3.5" /> {t("platform.switchToTikTok")}
        </Button>
      </div>
    </Card>
  );
}
