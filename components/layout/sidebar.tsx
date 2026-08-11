"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Menu, X } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV_ITEMS.map((item) => ({
    ...item,
    href: `/${clientId}/${item.href}`,
  }));

  return (
    <>
      <button
        className="fixed left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface md:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-60 shrink-0 flex-col border-r border-border bg-surface transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">MetaBoard</span>
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-soft text-brand"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <Link
            href="/clients"
            className="block rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            ← Switch client
          </Link>
        </div>
      </aside>
    </>
  );
}
