"use client";

import { createContext, useContext } from "react";

const CurrencyContext = createContext<string | null>(null);

/** Provides the connected ad account's real currency (e.g. "EGP") to client components — see lib/data/currency.ts. */
export function CurrencyProvider({ currency, children }: { currency: string; children: React.ReactNode }) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): string {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}
