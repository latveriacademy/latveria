import { forwardRef, type ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SearchBarProps extends Omit<ComponentProps<"input">, "size"> {
  /** Callback opsional saat tombol bersihkan pencarian diklik */
  onClear?: () => void;
  /** ClassName untuk elemen pembungkus (container div) */
  containerClassName?: string;
  /** Ukuran visual search bar */
  sizeVariant?: "default" | "sm";
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      className,
      containerClassName,
      sizeVariant = "default",
      value,
      onClear,
      placeholder = "Cari…",
      disabled,
      ...props
    },
    ref,
  ) => {
    const hasValue = Boolean(value !== undefined && value !== null && String(value).length > 0);

    return (
      <div className={cn("relative flex items-center w-full", containerClassName)}>
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none shrink-0",
            sizeVariant === "sm" ? "w-3.5 h-3.5" : "w-4 h-4",
          )}
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "latveria-input latveria-search-input font-sans w-full disabled:opacity-50",
            sizeVariant === "sm" && "text-xs py-1.5",
            hasValue && onClear && "has-clear",
            className,
          )}
          {...props}
        />
        {hasValue && onClear && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
            aria-label="Hapus pencarian"
          >
            <X className={sizeVariant === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
          </button>
        )}
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";
