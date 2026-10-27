import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  slugifyTitle,
  type LibraryItemInput,
  type LibraryItemListResponse,
  type LibraryItemSummary,
  type LibraryItemType,
} from "@latveria/shared";
import { getDb } from "../lib/db";
import { libraryItems } from "../lib/db/schema";

export async function getLibraryItems(query: {
  cari?: string;
  type?: LibraryItemType;
  subtestSlug?: string;
  isPublished?: boolean;
  page?: number;
  limit?: number;
}): Promise<LibraryItemListResponse> {
  const db = getDb();
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 12));
  const offset = (page - 1) * limit;

  const conditions = [
    query.cari
      ? ilike(libraryItems.title, `%${query.cari.replace(/[\\%_]/g, "\\$&")}%`)
      : undefined,
    query.type ? eq(libraryItems.type, query.type) : undefined,
    query.subtestSlug ? eq(libraryItems.subtestSlug, query.subtestSlug) : undefined,
    query.isPublished !== undefined ? eq(libraryItems.isPublished, query.isPublished) : undefined,
  ].filter(Boolean);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [[totalRes], rows] = await Promise.all([
    db.select({ value: count() }).from(libraryItems).where(where),
    db
      .select()
      .from(libraryItems)
      .where(where)
      .orderBy(desc(libraryItems.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalRes?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / limit));

  const items: LibraryItemSummary[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    type: r.type,
    subtestSlug: r.subtestSlug,
    content: r.content,
    url: r.url,
    thumbnailUrl: r.thumbnailUrl,
    metadata: r.metadata,
    tags: r.tags,
    isPublished: r.isPublished,
    authorId: r.authorId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return {
    rows: items,
    total,
    page,
    pageCount,
  };
}

export async function getLibraryItemById(id: string): Promise<LibraryItemSummary> {
  const db = getDb();
  const [item] = await db.select().from(libraryItems).where(eq(libraryItems.id, id));
  if (!item) {
    throw new HTTPException(404, { message: "Materi library tidak ditemukan." });
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    type: item.type,
    subtestSlug: item.subtestSlug,
    content: item.content,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    metadata: item.metadata,
    tags: item.tags,
    isPublished: item.isPublished,
    authorId: item.authorId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function getPublishedLibraryItem(slugOrId: string): Promise<LibraryItemSummary> {
  const db = getDb();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const condition = isUuid
    ? and(
        or(eq(libraryItems.slug, slugOrId), eq(libraryItems.id, slugOrId)),
        eq(libraryItems.isPublished, true),
      )
    : and(eq(libraryItems.slug, slugOrId), eq(libraryItems.isPublished, true));

  const [item] = await db.select().from(libraryItems).where(condition);
  if (!item) {
    throw new HTTPException(404, { message: "Materi library tidak ditemukan." });
  }

  void db
    .update(libraryItems)
    .set({ viewCount: sql`${libraryItems.viewCount} + 1` })
    .where(eq(libraryItems.id, item.id))
    .catch(() => {});

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    type: item.type,
    subtestSlug: item.subtestSlug,
    content: item.content,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    metadata: item.metadata,
    tags: item.tags,
    isPublished: item.isPublished,
    authorId: item.authorId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

async function resolveUniqueSlug(baseSlug: string, currentId?: string): Promise<string> {
  const db = getDb();
  let slug = baseSlug || "materi";
  let counter = 1;

  while (true) {
    const [existing] = await db
      .select({ id: libraryItems.id })
      .from(libraryItems)
      .where(eq(libraryItems.slug, slug));

    if (!existing || (currentId && existing.id === currentId)) {
      return slug;
    }
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function createLibraryItem(
  data: LibraryItemInput,
  authorId?: string | null,
): Promise<LibraryItemSummary> {
  const db = getDb();
  const rawSlug = data.slug?.trim() || slugifyTitle(data.title);
  const slug = await resolveUniqueSlug(rawSlug);

  let thumbnailUrl = data.thumbnailUrl?.trim() || null;
  const metadata = { ...(data.metadata || {}) };

  if (data.type === "video" && data.url) {
    const ytid = extractYouTubeVideoId(data.url);
    if (ytid) {
      metadata.youtubeId = ytid;
      if (!thumbnailUrl) {
        thumbnailUrl = getYouTubeThumbnailUrl(ytid);
      }
    }
  }

  const [created] = await db
    .insert(libraryItems)
    .values({
      title: data.title.trim(),
      slug,
      type: data.type,
      subtestSlug: data.subtestSlug || null,
      content: data.content || null,
      url: data.url?.trim() || null,
      thumbnailUrl,
      metadata,
      tags: data.tags || [],
      isPublished: data.isPublished ?? true,
      authorId: authorId || null,
    })
    .returning();

  return {
    id: created.id,
    title: created.title,
    slug: created.slug,
    type: created.type,
    subtestSlug: created.subtestSlug,
    content: created.content,
    url: created.url,
    thumbnailUrl: created.thumbnailUrl,
    metadata: created.metadata,
    tags: created.tags,
    isPublished: created.isPublished,
    authorId: created.authorId,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function updateLibraryItem(
  id: string,
  data: Partial<LibraryItemInput>,
): Promise<LibraryItemSummary> {
  const db = getDb();
  const [existing] = await db.select().from(libraryItems).where(eq(libraryItems.id, id));
  if (!existing) {
    throw new HTTPException(404, { message: "Materi library tidak ditemukan." });
  }

  let slug = existing.slug;
  if (data.slug && data.slug !== existing.slug) {
    slug = await resolveUniqueSlug(data.slug, id);
  } else if (data.title && !data.slug && data.title !== existing.title) {
    slug = await resolveUniqueSlug(slugifyTitle(data.title), id);
  }

  let thumbnailUrl =
    data.thumbnailUrl !== undefined ? data.thumbnailUrl?.trim() || null : existing.thumbnailUrl;
  const metadata = { ...(existing.metadata || {}), ...(data.metadata || {}) };

  const effectiveType = data.type || existing.type;
  const effectiveUrl = data.url !== undefined ? data.url?.trim() || null : existing.url;

  if (effectiveType === "video" && effectiveUrl) {
    const ytid = extractYouTubeVideoId(effectiveUrl);
    if (ytid) {
      metadata.youtubeId = ytid;
      if (!thumbnailUrl) {
        thumbnailUrl = getYouTubeThumbnailUrl(ytid);
      }
    }
  }

  const [updated] = await db
    .update(libraryItems)
    .set({
      title: data.title ? data.title.trim() : existing.title,
      slug,
      type: effectiveType,
      subtestSlug: data.subtestSlug !== undefined ? data.subtestSlug : existing.subtestSlug,
      content: data.content !== undefined ? data.content : existing.content,
      url: effectiveUrl,
      thumbnailUrl,
      metadata,
      tags: data.tags !== undefined ? data.tags : existing.tags,
      isPublished: data.isPublished !== undefined ? data.isPublished : existing.isPublished,
      updatedAt: new Date(),
    })
    .where(eq(libraryItems.id, id))
    .returning();

  return {
    id: updated.id,
    title: updated.title,
    slug: updated.slug,
    type: updated.type,
    subtestSlug: updated.subtestSlug,
    content: updated.content,
    url: updated.url,
    thumbnailUrl: updated.thumbnailUrl,
    metadata: updated.metadata,
    tags: updated.tags,
    isPublished: updated.isPublished,
    authorId: updated.authorId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteLibraryItem(id: string): Promise<{ success: boolean; id: string }> {
  const db = getDb();
  const [deleted] = await db
    .delete(libraryItems)
    .where(eq(libraryItems.id, id))
    .returning({ id: libraryItems.id });

  if (!deleted) {
    throw new HTTPException(404, { message: "Materi library tidak ditemukan." });
  }

  return { success: true, id: deleted.id };
}

export async function togglePublishLibraryItem(
  id: string,
): Promise<{ id: string; isPublished: boolean }> {
  const db = getDb();
  const [existing] = await db
    .select({ id: libraryItems.id, isPublished: libraryItems.isPublished })
    .from(libraryItems)
    .where(eq(libraryItems.id, id));

  if (!existing) {
    throw new HTTPException(404, { message: "Materi library tidak ditemukan." });
  }

  const [updated] = await db
    .update(libraryItems)
    .set({
      isPublished: !existing.isPublished,
      updatedAt: new Date(),
    })
    .where(eq(libraryItems.id, id))
    .returning({ id: libraryItems.id, isPublished: libraryItems.isPublished });

  return updated;
}
