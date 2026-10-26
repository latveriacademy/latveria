import { z } from "zod";

export const libraryItemTypes = ["article", "video", "link"] as const;
export type LibraryItemType = (typeof libraryItemTypes)[number];

export const libraryItemTypeSchema = z.enum(libraryItemTypes);

export interface LibraryItemMetadata {
  youtubeId?: string | null;
  durationMinutes?: number | null;
  externalAuthor?: string | null;
  [key: string]: unknown;
}

export const libraryItemInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Judul materi minimal 2 karakter")
    .max(200, "Judul materi maksimal 200 karakter"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung")
    .optional()
    .or(z.literal("")),
  type: libraryItemTypeSchema,
  subtestSlug: z.string().trim().max(100).nullable().optional(),
  content: z.string().nullable().optional(),
  url: z.string().trim().url("URL tidak valid").nullable().optional().or(z.literal("")),
  thumbnailUrl: z.string().trim().nullable().optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1)).default([]),
  isPublished: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type LibraryItemInput = z.infer<typeof libraryItemInputSchema>;

export interface LibraryItemSummary {
  id: string;
  title: string;
  slug: string;
  type: LibraryItemType;
  subtestSlug: string | null;
  content: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  metadata: LibraryItemMetadata | null;
  tags: string[];
  isPublished: boolean;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryItemListResponse {
  rows: LibraryItemSummary[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Ekstraksi YouTube Video ID dari berbagai macam varian URL YouTube:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://www.youtube.com/v/dQw4w9WgXcQ
 * - https://m.youtube.com/watch?v=dQw4w9WgXcQ
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const pattern =
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = trimmed.match(pattern);
  return match ? match[1] : null;
}

/**
 * Menghasilkan URL thumbnail YouTube HQ resmi
 */
export function getYouTubeThumbnailUrl(videoId: string | null | undefined): string | null {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Membuat slug ramah URL dari judul
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
