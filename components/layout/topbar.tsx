"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { InitialsAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

type ClientSummary = { id: string; name: string; avatarHue: number; isLive: boolean };

export function Topbar({
  activeClient,
  clients,
  userName,
  isLive,
}: {
  activeClient: ClientSummary;
  clients: ClientSummary[];
  userName: string;
  isLive: boolean;
}) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    const stored = localStorage.getItem("mbdash-theme");
    const isDark =
      stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("mbdash-theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur ps-14 md:ps-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium hover:bg-surface-muted cursor-pointer">
            <InitialsAvatar name={activeClient.name} hue={activeClient.avatarHue} size={22} />
            <span className="max-w-[10rem] truncate">{activeClient.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[16rem]">
          <DropdownMenuLabel>{t("clients.yourClients")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {clients.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onSelect={() => router.push(`/${c.id}/overview`)}
              className="justify-between"
            >
              <span className="flex items-center gap-2">
                <InitialsAvatar name={c.name} hue={c.avatarHue} size={20} />
                {c.name}
              </span>
              {c.isLive ? (
                <Badge variant="positive">{t("common.live")}</Badge>
              ) : (
                <Badge variant="neutral">{t("common.demo")}</Badge>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/clients">{t("common.manageClients")}</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2">
        {isLive ? (
          <Badge variant="positive">{t("common.liveData")}</Badge>
        ) : (
          <Badge variant="brand">{t("common.demoData")}</Badge>
        )}

        <LanguageSwitcher />

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t("common.toggleTheme")}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer">
              <InitialsAvatar name={userName} hue={210} size={30} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="me-2 h-3.5 w-3.5" /> {t("common.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
