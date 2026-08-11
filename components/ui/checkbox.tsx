"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded border border-border bg-surface data-[state=checked]:bg-brand data-[state=checked]:border-brand cursor-pointer",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="h-3 w-3 text-white" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
