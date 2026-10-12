import {
  BookOpenText,
  Brain,
  Calculator,
  Languages,
  PenLine,
  Sigma,
  SpellCheck,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "penalaran-umum": Brain,
  "pengetahuan-pemahaman-umum": BookOpenText,
  "pemahaman-bacaan-menulis": PenLine,
  "pengetahuan-kuantitatif": Calculator,
  "literasi-bahasa-indonesia": SpellCheck,
  "literasi-bahasa-inggris": Languages,
  "penalaran-matematika": Sigma,
};

export function SubtestIcon({ slug, size = 24 }: { slug: string; size?: number }) {
  const Icon = icons[slug] ?? BookOpenText;
  return <Icon size={size} aria-hidden="true" />;
}
