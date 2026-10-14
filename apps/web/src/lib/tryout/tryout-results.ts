import { utbkSubtests, type TryoutHistoryEntry } from "@latveria/shared";

export const tryoutResultPath = (id: string) =>
  `/dashboard?tab=tryout&result=${encodeURIComponent(id)}`;
export const formatTryoutScore = (score: number | null) =>
  score === null ? "—" : new Intl.NumberFormat("id-ID").format(score);
export const formatTryoutDate = (date: string | null) =>
  date && Number.isFinite(Date.parse(date))
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(new Date(date))
    : "Tanggal tidak tersedia";
export function tryoutScoreLabel(method: TryoutHistoryEntry["method"], completeUtbk = false) {
  return method === "legacy"
    ? "Skor Latveria lama"
    : method === "irt-2pl"
      ? "Skor simulasi IRT 2PL"
      : completeUtbk
        ? "Skor simulasi UTBK"
        : "Skor simulasi";
}
/** API history is ordered newest first; zero scores are completed results too. */
export function latestTryoutsByPackage(rows: TryoutHistoryEntry[]) {
  const map = new Map<string, { latest: TryoutHistoryEntry; count: number }>();
  for (const row of rows) {
    const previous = map.get(row.packageId);
    map.set(
      row.packageId,
      previous ? { ...previous, count: previous.count + 1 } : { latest: row, count: 1 },
    );
  }
  return map;
}
export const subtestShort = (slug: string) => {
  const short = utbkSubtests.find((s) => s.slug === slug)?.short;
  return short === "BI" ? "LBI" : short === "EN" ? "LBE" : (short ?? slug);
};
export function radarPoint(score: number, index: number, radius = 112) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 7;
  const distance = (Math.max(0, Math.min(1000, score)) / 1000) * radius;
  return { x: 180 + Math.cos(angle) * distance, y: 168 + Math.sin(angle) * distance };
}
