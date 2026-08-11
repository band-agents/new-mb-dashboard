"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClientAction } from "./actions";

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add a new client</DialogTitle>
        <DialogDescription>
          Creates a workspace for this customer in Demo Mode. Connect their Meta account any time from
          the Account page.
        </DialogDescription>
        <form
          action={async (fd) => {
            await createClientAction(fd);
            setOpen(false);
          }}
          className="mt-4 space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" name="name" placeholder="e.g. Northside Dental" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry (optional)</Label>
            <Input id="industry" name="industry" placeholder="e.g. Healthcare" />
          </div>
          <Button type="submit" className="w-full">
            Create client
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
