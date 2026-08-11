"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t as translate } from "@/lib/i18n/t";
import { setLocaleAction } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/config";
import { intlTag, isRtl } from "@/lib/i18n/config";

type LocaleContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  intlTag: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  pending: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Provides the active locale + t() to client components. Server components import lib/i18n/t.ts + getLocale.ts directly instead. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  const value: LocaleContextValue = {
    locale,
    dir: isRtl(locale) ? "rtl" : "ltr",
    intlTag: intlTag(locale),
    t: (key, params) => translate(locale, key, params),
    setLocale,
    pending,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
