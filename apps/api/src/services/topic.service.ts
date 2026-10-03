import { count, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { idSchema, utbkSubtests, type Topic } from "@latveria/shared";
import { getDb } from "../lib/db";
import { questionPackages, questions, topics } from "../lib/db/schema";

const cachedCatalog: Map<boolean, { data: Topic[]; expiresAt: number }> = new Map();

export function invalidateCatalogCache() {
  cachedCatalog.clear();
}

export async function resolveTopic(idOrSlug: string) {
  const isUuid = idSchema.safeParse(idOrSlug).success;
  const [topic] = await getDb()
    .select()
    .from(topics)
    .where(isUuid ? eq(topics.id, idOrSlug) : eq(topics.slug, idOrSlug));
  return topic ?? null;
}

export async function catalog(activeOnly = false): Promise<Topic[]> {
  const now = Date.now();
  const cached = cachedCatalog.get(activeOnly);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }
  const [rows, pkgRows] = await Promise.all([
    getDb()
      .select({
        id: topics.id,
        slug: topics.slug,
        name: topics.name,
        description: topics.description,
        category: topics.category,
        section: topics.section,
        order: topics.order,
        questionCount: count(questions.id),
      })
      .from(topics)
      .leftJoin(questions, eq(questions.topicId, topics.id))
      .groupBy(topics.id),
    getDb()
      .select({ topicId: questionPackages.topicId, packageCount: count(questionPackages.id) })
      .from(questionPackages)
      .where(activeOnly ? eq(questionPackages.isActive, true) : undefined)
      .groupBy(questionPackages.topicId),
  ]);
  const pkgMap = new Map(pkgRows.map((p) => [p.topicId, Number(p.packageCount ?? 0)]));
  const utbkMap = new Map<string, (typeof utbkSubtests)[number]>(
    utbkSubtests.map((s) => [s.slug, s]),
  );

  const result: Topic[] = rows.map((row) => {
    const utbk = utbkMap.get(row.slug);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      short: utbk ? utbk.short : row.slug.slice(0, 4).toUpperCase(),
      section: utbk ? utbk.section : row.section || "mandiri",
      category: row.category || "utbk",
      questionCount: Number(row.questionCount ?? 0),
      packageCount: pkgMap.get(row.id) ?? 0,
    };
  });

  result.sort((a, b) => {
    const idxA = utbkSubtests.findIndex((s) => (s.slug as string) === a.slug);
    const idxB = utbkSubtests.findIndex((s) => (s.slug as string) === b.slug);
    if (idxA >= 0 && idxB >= 0) return idxA - idxB;
    if (idxA >= 0) return -1;
    if (idxB >= 0) return 1;
    return a.name.localeCompare(b.name);
  });

  cachedCatalog.set(activeOnly, { data: result, expiresAt: now + 30_000 });
  return result;
}

export async function createAdminTopic(body: unknown) {
  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    !("slug" in body) ||
    !body.name ||
    !body.slug
  ) {
    throw new HTTPException(400, { message: "Nama dan slug topik wajib diisi." });
  }
  const b = body as {
    name: string;
    slug: string;
    description?: string;
    category?: string;
    section?: string;
    order?: number;
  };
  const [existing] = await getDb().select().from(topics).where(eq(topics.slug, b.slug));
  if (existing) throw new HTTPException(409, { message: "Slug sudah digunakan." });

  const [created] = await getDb()
    .insert(topics)
    .values({
      slug: b.slug,
      name: b.name,
      description: b.description ?? "",
      category: b.category || "utbk",
      section: b.section || "tps",
      order: Number(b.order || 0),
    })
    .returning();

  invalidateCatalogCache();
  return created;
}

export async function updateAdminTopic(id: string, body: unknown) {
  const b = (body && typeof body === "object" ? body : {}) as {
    name?: string;
    description?: string;
    category?: string;
    section?: string;
    order?: number;
  };
  const [updated] = await getDb()
    .update(topics)
    .set({
      name: b.name,
      description: b.description,
      category: b.category,
      section: b.section,
      order: b.order,
    })
    .where(eq(topics.id, id))
    .returning();
  if (!updated) throw new HTTPException(404, { message: "Topik tidak ditemukan." });

  invalidateCatalogCache();
  return updated;
}

export async function deleteAdminTopic(id: string) {
  const [qCount] = await getDb()
    .select({ value: count() })
    .from(questions)
    .where(eq(questions.topicId, id));
  if (qCount.value > 0) {
    throw new HTTPException(409, {
      message: `Topik masih memiliki ${qCount.value} soal. Hapus soal terlebih dahulu.`,
    });
  }
  await getDb().delete(topics).where(eq(topics.id, id));
  invalidateCatalogCache();
  return { success: true };
}
