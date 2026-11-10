import { z } from "zod";

export const libraryItemTypes = ["article", "video", "link"] as const;
export type LibraryItemType = (typeof libraryItemTypes)[number];

export const libraryItemTypeSchema = z.enum(libraryItemTypes);

export interface LibraryItemMetadata {
  youtubeId?: string | null;
  durationMinutes?: number | null;
  externalAuthor?: string | null;
  materialUrl?: string | null;
  materialTitle?: string | null;
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
  materialUrl: z
    .string()
    .trim()
    .url("URL materi tidak valid")
    .nullable()
    .optional()
    .or(z.literal("")),
  materialTitle: z
    .string()
    .trim()
    .max(200, "Judul materi maksimal 200 karakter")
    .nullable()
    .optional()
    .or(z.literal("")),
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
 * Ekstraksi YouTube Video ID dari berbagai varian URL YouTube:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ (publik & unlisted/tidak publik)
 * - https://youtu.be/dQw4w9WgXcQ (share link unlisted/publik dengan ?si=...)
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://www.youtube.com/live/dQw4w9WgXcQ (live stream / unlisted live)
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - https://studio.youtube.com/video/dQw4w9WgXcQ/edit
 * - youtu.be/dQw4w9WgXcQ atau youtube.com/watch?v=... (tanpa protokol https)
 * - <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" ...>
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  let trimmed = url.trim();

  // Ekstrak URL jika pengguna menempelkan kode iframe sematan
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (iframeMatch) {
    trimmed = iframeMatch[1].trim();
  }

  // Normalisasi jika tanpa protokol
  let normalizedUrl = trimmed;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const parsed = new URL(normalizedUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    // 1. Domain youtu.be
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\/+/, "").split("/")[0]?.split("?")[0];
      if (id && /^[\w-]{11}$/.test(id)) return id;
    }

    // 2. Domain youtube.com / m.youtube.com / studio.youtube.com / youtube-nocookie.com
    if (
      host === "youtube.com" ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube.com")
    ) {
      // Query param v (e.g. ?v=... atau &v=...)
      const v = parsed.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;

      // Path: /embed/<id>, /live/<id>, /shorts/<id>, /v/<id>, /e/<id>, /video/<id>
      const pathSegments = parsed.pathname.replace(/^\/+/, "").split("/");
      const first = pathSegments[0]?.toLowerCase();
      if (["embed", "live", "shorts", "v", "e", "video"].includes(first) && pathSegments[1]) {
        const id = pathSegments[1].split("?")[0];
        if (id && /^[\w-]{11}$/.test(id)) return id;
      }
    }
  } catch {
    // Fallback regex jika parsing URL gagal
  }

  const fallbackPattern =
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|e\/|live\/|shorts\/|video\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = trimmed.match(fallbackPattern);
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
