"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClientAction } from "./actions";
import { useLocale } from "@/components/i18n/locale-provider";

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t("clients.addClient")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("clients.addNewClient")}</DialogTitle>
        <DialogDescription>{t("clients.addClientDesc")}</DialogDescription>
        <form
          action={async (fd) => {
            await createClientAction(fd);
            setOpen(false);
          }}
          className="mt-4 space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("clients.businessName")}</Label>
            <Input id="name" name="name" placeholder={t("clients.businessNamePlaceholder")} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">{t("clients.industryOptional")}</Label>
            <Input id="industry" name="industry" placeholder={t("clients.industryPlaceholder")} />
          </div>
          <Button type="submit" className="w-full">
            {t("clients.createClient")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
