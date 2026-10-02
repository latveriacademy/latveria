import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";
import { Button } from "./ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={theme === "dark" ? "Mode terang" : "Mode gelap"}
    >
      {theme === "dark" ? (
        <Sun className="size-4 text-[var(--bronze)] hover:text-[var(--emerald)] transition-all duration-200 hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-[var(--emerald-dark)] hover:text-[var(--emerald)] transition-all duration-200 hover:-rotate-12" />
      )}
    </Button>
  );
}
