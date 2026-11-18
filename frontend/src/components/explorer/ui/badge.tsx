import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border-border text-foreground [a&]:hover:bg-secondary",
        ghost: "[a&]:hover:bg-secondary",
        link: "text-accent underline-offset-4 [a&]:hover:underline",
        success: "bg-success text-success-foreground [a&]:hover:bg-success/90",
        accent: "bg-accent text-accent-foreground [a&]:hover:bg-accent/90",
        soft: "bg-secondary text-foreground [a&]:hover:bg-secondary/80",
        "soft-accent":
          "bg-accent/10 text-accent border-accent/20 [a&]:hover:bg-accent/15",
        "soft-success":
          "bg-success/10 text-success border-success/20 [a&]:hover:bg-success/15",
        "soft-destructive":
          "bg-destructive/10 text-destructive border-destructive/20 [a&]:hover:bg-destructive/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
