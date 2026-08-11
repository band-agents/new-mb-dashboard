"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { registerAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/components/i18n/locale-provider";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, undefined);
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">{t("auth.registerTitle")}</h1>
          <p className="text-center text-sm text-muted-foreground">{t("auth.registerSubtitle")}</p>
        </div>

        <Card className="p-5">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">{t("auth.orgName")}</Label>
              <Input id="orgName" name="orgName" placeholder="Band Digital" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("auth.name")}</Label>
              <Input id="name" name="name" placeholder="Jordan Smith" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" name="email" type="email" placeholder="you@agency.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" name="password" type="password" placeholder="At least 8 characters" required />
            </div>
            {state?.error && <p className="text-xs text-negative">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? t("common.connecting") : t("auth.createAccount")}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("auth.alreadyHaveAccount")} <Link href="/login" className="text-brand hover:underline">{t("auth.signInLink")}</Link>
        </p>
      </div>
    </div>
  );
}
