import { z } from "zod";
import type { TryoutSectionWithQuestions } from "./questions";

export const createTryoutSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional(),
    topicId: z.uuid().optional(),
    category: z.enum(["utbk", "tka", "mandiri"]).default("utbk"),
    targetYear: z.number().int().min(2020).max(2100).nullable().optional(),
    duration: z.number().int().min(1).max(1440).default(195),
    targetQuestions: z.number().int().min(1).max(1000).default(160),
    isFullTryout: z.boolean().default(true),
    autoSeedSections: z.boolean().default(true),
    published: z.boolean().default(false),
    isActive: z.boolean().default(true),
    order: z.number().int().min(0).max(10000).default(1),
  })
  .strict();
export const updateTryoutSchema = createTryoutSchema
  .omit({ topicId: true, autoSeedSections: true, isFullTryout: true })
  .partial();
export function isTryoutPackage(pkg: { isFullTryout?: boolean; packageType?: string }) {
  return Boolean(pkg.isFullTryout || pkg.packageType?.includes("Simulasi"));
}
export type AdminTryoutItem = {
  id: string;
  name: string;
  description: string | null;
  targetYear: number | null;
  published: boolean;
  durationMinutes: number;
  totalDurationSeconds: number;
  questionCount: number;
  sectionCount: number;
  createdAt: string;
};
export type AdminTryoutDetail = AdminTryoutItem & { sections: TryoutSectionWithQuestions[] };
