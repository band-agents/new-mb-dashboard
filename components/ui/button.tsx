import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-foreground hover:opacity-90",
        secondary: "bg-surface-muted text-foreground border border-border hover:bg-border/40",
        outline: "border border-border bg-transparent hover:bg-surface-muted text-foreground",
        ghost: "hover:bg-surface-muted text-foreground",
        destructive: "bg-negative text-white hover:opacity-90",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-2.5 text-xs",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disabled, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        // asChild commonly wraps an <a> (e.g. "Connect with OAuth" links).
        // HTML anchors have no `disabled` attribute — the browser ignores
        // it entirely, so the link stays fully clickable/navigable and the
        // `disabled:` Tailwind variant never matches (it's a pseudo-class
        // that only applies to real form controls). Block the click
        // directly so "disabled" is enforced no matter what Comp renders
        // as, and apply the dimmed/inert styling via className instead of
        // relying on the pseudo-class.
        onClick={disabled ? (e) => e.preventDefault() : onClick}
        className={cn(buttonVariants({ variant, size }), className, disabled && "pointer-events-none opacity-50")}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
