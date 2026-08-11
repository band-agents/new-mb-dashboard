"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { registerAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Create your agency workspace</h1>
          <p className="text-center text-sm text-muted-foreground">
            Manage every client&apos;s Meta performance from one login.
          </p>
        </div>

        <Card className="p-5">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Agency / workspace name</Label>
              <Input id="orgName" name="orgName" placeholder="Band Digital" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" placeholder="Jordan Smith" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@agency.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="At least 8 characters" required />
            </div>
            {state?.error && <p className="text-xs text-negative">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating…" : "Create workspace"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account? <Link href="/login" className="text-brand hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
