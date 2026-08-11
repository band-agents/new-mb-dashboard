"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Sign in to MetaBoard</h1>
          <p className="text-center text-sm text-muted-foreground">
            Your agency&apos;s Meta performance, in one place.
          </p>
        </div>

        <Card className="p-5">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@agency.com" required defaultValue="band.digi.tech@gmail.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required defaultValue="demo1234" />
            </div>
            {state?.error && <p className="text-xs text-negative">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo login pre-filled — <span className="font-medium text-foreground">band.digi.tech@gmail.com</span> / demo1234
          </p>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Need an account? <Link href="/register" className="text-brand hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
