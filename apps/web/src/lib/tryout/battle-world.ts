import type { TryoutPackage } from "../../components/tryout/battle-world-catalog";
import { isTryoutPackage } from "@latveria/shared";

/** Battle World hanya memuat tryout; paket latihan (Drilling) tidak ditampilkan di sini. */
export function isBattleWorldPackage(
  pkg: Pick<TryoutPackage, "published" | "questionCount" | "isFullTryout" | "packageType">,
) {
  return pkg.published && pkg.questionCount > 0 && isTryoutPackage(pkg);
}
