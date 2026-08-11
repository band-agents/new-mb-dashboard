"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({ className, ...props }: DropdownPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={6}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-surface p-1 shadow-lg",
          className
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: DropdownPrimitive.DropdownMenuItemProps) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center rounded-sm px-2.5 py-1.5 text-sm text-foreground outline-none data-[highlighted]:bg-surface-muted",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: DropdownPrimitive.DropdownMenuCheckboxItemProps) {
  return (
    <DropdownPrimitive.CheckboxItem
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-foreground outline-none data-[highlighted]:bg-surface-muted",
        className
      )}
      {...props}
    >
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: DropdownPrimitive.DropdownMenuLabelProps) {
  return (
    <DropdownPrimitive.Label
      className={cn("px-2.5 py-1.5 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: DropdownPrimitive.DropdownMenuSeparatorProps) {
  return <DropdownPrimitive.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}
