import type { TryoutPackage } from "../components/battle-world-catalog";

/** Battle World hanya memuat tryout; paket latihan (Drilling) tidak ditampilkan di sini. */
export function isBattleWorldPackage(
  pkg: Pick<TryoutPackage, "published" | "questionCount" | "isFullTryout" | "packageType">,
) {
  return (
    pkg.published &&
    pkg.questionCount > 0 &&
    Boolean(pkg.isFullTryout || pkg.packageType?.includes("Simulasi"))
  );
}
