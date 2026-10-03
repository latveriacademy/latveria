// Leaderboard utilities for period calculations in WIB (Asia/Jakarta)
// All timestamps in DB are UTC; calculations convert to WIB for period boundaries

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

export type Period = "daily" | "weekly" | "monthly" | "all";
export type Metric = "xp" | "answered" | "correct" | "accuracy" | "streak";

export interface PeriodRange {
  start: Date; // UTC
  end: Date; // UTC (inclusive, up to 23:59:59.999 WIB)
  startWIB: string; // ISO string in WIB
  endWIB: string; // ISO string in WIB
}

const dayMs = 86_400_000;

/**
 * Get the start of a date in WIB, returns midnight UTC of that WIB day
 */
function startOfDayWIB(date: Date): Date {
  // Get the date string in WIB
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);
  const year = wibDate.getUTCFullYear();
  const month = wibDate.getUTCMonth();
  const day = wibDate.getUTCDate();
  // Return midnight UTC of that WIB day
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Get the end of a date in WIB, returns 23:59:59.999 UTC of that WIB day
 */
function endOfDayWIB(date: Date): Date {
  const start = startOfDayWIB(date);
  return new Date(start.getTime() + dayMs - 1);
}

/**
 * Get start of week (Monday) in WIB
 */
function startOfWeekWIB(date: Date): Date {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);
  const dayOfWeek = wibDate.getUTCDay(); // 0 = Sunday, 1 = Monday
  // Monday is day 1, Sunday is day 0
  const daysToMonday = (dayOfWeek + 6) % 7;
  const mondayWIB = new Date(wibDate.getTime() - daysToMonday * dayMs);
  const year = mondayWIB.getUTCFullYear();
  const month = mondayWIB.getUTCMonth();
  const day = mondayWIB.getUTCDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Get end of week (Sunday) in WIB
 */
function endOfWeekWIB(date: Date): Date {
  const start = startOfWeekWIB(date);
  return new Date(start.getTime() + 7 * dayMs - 1);
}

/**
 * Get start of month in WIB
 */
function startOfMonthWIB(date: Date): Date {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);
  const year = wibDate.getUTCFullYear();
  const month = wibDate.getUTCMonth();
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/**
 * Get end of month in WIB
 */
function endOfMonthWIB(date: Date): Date {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);
  const year = wibDate.getUTCFullYear();
  const month = wibDate.getUTCMonth();
  // Next month, then subtract 1ms
  const nextMonth = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0, 0));
  return new Date(nextMonth.getTime() + dayMs - 1);
}

/**
 * Format a UTC date to WIB ISO string (for display)
 */
function toWIBISO(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19) + " WIB";
}

/**
 * Calculate period range from now (or a specific date) in WIB
 */
export function getPeriodRange(period: Period, fromDate: Date = new Date()): PeriodRange {
  switch (period) {
    case "daily": {
      const start = startOfDayWIB(fromDate);
      const end = endOfDayWIB(fromDate);
      return { start, end, startWIB: toWIBISO(start), endWIB: toWIBISO(end) };
    }
    case "weekly": {
      const start = startOfWeekWIB(fromDate);
      const end = endOfWeekWIB(fromDate);
      return { start, end, startWIB: toWIBISO(start), endWIB: toWIBISO(end) };
    }
    case "monthly": {
      const start = startOfMonthWIB(fromDate);
      const end = endOfMonthWIB(fromDate);
      return { start, end, startWIB: toWIBISO(start), endWIB: toWIBISO(end) };
    }
    case "all":
    default: {
      // Return a very wide range (epoch to far future)
      const start = new Date(0);
      const end = new Date("2100-01-01T00:00:00.000Z");
      return { start, end, startWIB: "Awal zamanan", endWIB: "Sekarang" };
    }
  }
}

// Accuracy minimum requirements
export const ACCURACY_MIN_ANSWERS = {
  all: 50,
  PU: 20,
  PPU: 20,
  PBM: 20,
  PK: 20,
  BI: 20,
  EN: 20,
  PM: 20,
} as const;

export type Subtest = keyof typeof ACCURACY_MIN_ANSWERS;

// Map short codes to topic slugs
export const SUBTEST_TO_SLUG: Record<Subtest, string> = {
  all: "",
  PU: "penalaran-umum",
  PPU: "pengetahuan-pemahaman-umum",
  PBM: "pemahaman-bacaan-menulis",
  PK: "pengetahuan-kuantitatif",
  BI: "literasi-bahasa-indonesia",
  EN: "literasi-bahasa-inggris",
  PM: "penalaran-matematika",
};

// Tiebreaker helper: returns 0 if equal, negative if a < b, positive if a > b
export type TiebreakerKey = "value" | "timestamp" | "userId";
export function tiebreaker(
  a: { value: number; timestamp: Date; userId: string },
  b: { value: number; timestamp: Date; userId: string },
): number {
  if (a.value !== b.value) return b.value - a.value; // Higher value first
  if (a.timestamp.getTime() !== b.timestamp.getTime())
    return a.timestamp.getTime() - b.timestamp.getTime(); // Earlier first
  return a.userId.localeCompare(b.userId); // Alphabetical userId
}
