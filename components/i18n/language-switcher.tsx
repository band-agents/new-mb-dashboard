"use client";

import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocale } from "./locale-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t, pending } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.language")} disabled={pending}>
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setLocale("en")} className="justify-between">
          {t("common.english")}
          {locale === "en" && <span className="text-xs text-brand">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLocale("ar")} className="justify-between">
          {t("common.arabic")}
          {locale === "ar" && <span className="text-xs text-brand">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
