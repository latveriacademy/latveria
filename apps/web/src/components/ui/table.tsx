import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <div data-slot="table-container" className="relative w-full overflow-x-auto"><table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} /></div>;
}
export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) { return <thead data-slot="table-header" className={cn("[&_tr]:border-b [&_tr]:border-[var(--edge)]", className)} {...props} />; }
export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) { return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />; }
export function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) { return <tfoot data-slot="table-footer" className={cn("border-t border-[var(--edge)] bg-[var(--paper-green)]/30 font-medium", className)} {...props} />; }
export function TableRow({ className, ...props }: React.ComponentProps<"tr">) { return <tr data-slot="table-row" className={cn("border-b border-[var(--edge)] transition-colors hover:bg-[var(--paper-green)]/25", className)} {...props} />; }
export function TableHead({ className, ...props }: React.ComponentProps<"th">) { return <th data-slot="table-head" className={cn("h-11 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-[var(--soft-ink)]", className)} {...props} />; }
export function TableCell({ className, ...props }: React.ComponentProps<"td">) { return <td data-slot="table-cell" className={cn("px-3 py-3 align-middle", className)} {...props} />; }
