"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-fit items-center gap-1 overflow-x-auto rounded-lg border border-[var(--edge)] bg-[var(--surface)] p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-[var(--soft-ink)] outline-none transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--ink)] hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--emerald)] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[var(--emerald-tint)] data-[state=active]:text-[var(--emerald)] data-[state=active]:border data-[state=active]:border-[var(--emerald)]/20 font-sans cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] motion-fade-up",
        className,
      )}
      {...props}
    />
  );
}
