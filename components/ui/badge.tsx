import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-muted-foreground border-border",
        brand: "bg-brand-soft text-brand border-transparent",
        positive: "bg-positive-soft text-positive border-transparent",
        negative: "bg-negative-soft text-negative border-transparent",
        warning: "bg-warning-soft text-warning border-transparent",
        info: "bg-info-soft text-info border-transparent",
        outline: "bg-transparent text-foreground border-border",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
