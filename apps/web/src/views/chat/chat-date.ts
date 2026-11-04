/**
 * Helper pemformatan tanggal dan waktu untuk percakapan obrolan (Global & DM).
 */

export function isDifferentDay(currentIso: string, previousIso?: string): boolean {
  if (!previousIso) return true;
  const current = new Date(currentIso);
  const previous = new Date(previousIso);
  if (Number.isNaN(current.getTime()) || Number.isNaN(previous.getTime())) return false;

  return (
    current.getFullYear() !== previous.getFullYear() ||
    current.getMonth() !== previous.getMonth() ||
    current.getDate() !== previous.getDate()
  );
}

export function formatChatDividerDate(isoString: string, referenceDate = new Date()): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hari Ini";
  if (diffDays === 1) return "Kemarin";

  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}

export function formatMessageTime(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function formatFullTimestamp(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });
}
