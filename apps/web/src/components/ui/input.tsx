import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn("latveria-input font-sans w-full disabled:opacity-50", className)}
      {...props}
    />
  );
}
