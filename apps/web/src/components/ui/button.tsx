import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forest)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-[var(--forest-dark)] text-[var(--paper-light)] hover:bg-[var(--forest)]",
      outline: "border border-[var(--edge)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--paper-green)]",
      ghost: "text-[var(--ink)] hover:bg-[var(--paper-green)]",
      link: "text-[var(--forest-dark)] underline-offset-4 hover:underline",
    },
    size: {
      default: "min-h-10 px-4 py-2",
      sm: "min-h-9 rounded-md px-3",
      icon: "size-10",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...(asChild ? { "aria-disabled": props.disabled || undefined, tabIndex: props.disabled ? -1 : undefined } : {})} {...props} />;
}
