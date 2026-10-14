import { and, asc, eq, inArray, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { utbkSubtests } from "@latveria/shared";
import { getDb } from "../../lib/db";
import { questions, topics, tryoutPackageQuestions, tryoutSections } from "../../lib/db/schema";

type SubtestConfig = { id: string; slug: string; name: string; durationSeconds: number };
const durations: Record<string, number> = {
  PU: 1800,
  PPU: 900,
  PBM: 1500,
  PK: 1200,
  BI: 2700,
  EN: 1800,
  PM: 1800,
};
type Package = { id: string; topicId: string; isFullTryout: boolean; duration: number };
export async function buildTryoutConfig(
  pkg: Package,
  db: Pick<ReturnType<typeof getDb>, "select"> = getDb(),
) {
  const allTopics = await db.select().from(topics);
  const sections = await db
    .select()
    .from(tryoutSections)
    .where(eq(tryoutSections.packageId, pkg.id))
    .orderBy(asc(tryoutSections.sectionOrder));
  const pins = await db
    .select({
      id: questions.id,
      topicId: questions.topicId,
      sectionId: tryoutPackageQuestions.sectionId,
    })
    .from(questions)
    .leftJoin(
      tryoutPackageQuestions,
      and(
        eq(tryoutPackageQuestions.questionId, questions.id),
        eq(tryoutPackageQuestions.packageId, pkg.id),
      ),
    )
    .where(or(eq(tryoutPackageQuestions.packageId, pkg.id), eq(questions.packageId, pkg.id)))
    .orderBy(
      asc(tryoutPackageQuestions.position),
      asc(tryoutPackageQuestions.order),
      asc(questions.order),
      asc(questions.id),
    );
  const configs = sections.length
    ? sections.map((section) => {
        const official = utbkSubtests.find((s) => s.short === section.subtestCode);
        const topic = allTopics.find((t) => t.slug === official?.slug);
        if (!topic) throw new HTTPException(409, { message: "Kode subtes tryout tidak tersedia." });
        return {
          id: topic.id,
          slug: topic.slug,
          name: section.title,
          durationSeconds: section.durationSeconds,
          sectionId: section.id,
        };
      })
    : allTopics
        .filter((t) =>
          pkg.isFullTryout ? utbkSubtests.some((s) => s.slug === t.slug) : t.id === pkg.topicId,
        )
        .sort((a, b) => a.order - b.order)
        .map((t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          durationSeconds: pkg.isFullTryout
            ? durations[utbkSubtests.find((s) => s.slug === t.slug)!.short]
            : pkg.duration * 60,
          sectionId: null,
        }));
  const questionSets: Record<string, string[]> = {};
  for (const config of configs) {
    const selected = pins.filter(
      (q) => q.topicId === config.id && (!config.sectionId || q.sectionId === config.sectionId),
    );
    const ids = [...new Set(selected.map((q) => q.id))];
    if (!ids.length || config.durationSeconds < 60 || questionSets[config.id])
      throw new HTTPException(409, {
        message: `Lengkapi soal dan durasi subtes ${config.name} sebelum memublikasikan tryout.`,
      });
    questionSets[config.id] = ids;
  }
  if (!configs.length) throw new HTTPException(409, { message: "Tryout belum memiliki subtes." });
  return { questionSets, subtests: configs.map(({ sectionId: _sectionId, ...config }) => config) };
}

export async function sessionSubtests(
  session: { subtestConfig: string; questionSets: string },
  pkg: Package,
): Promise<SubtestConfig[]> {
  const stored = JSON.parse(session.subtestConfig) as SubtestConfig[];
  if (stored.length) return stored;
  // ponytail: older sessions retain their stored question-set order; new sessions snapshot section metadata.
  const ids = Object.keys(JSON.parse(session.questionSets));
  const rows = ids.length ? await getDb().select().from(topics).where(inArray(topics.id, ids)) : [];
  return ids.flatMap((id) => {
    const topic = rows.find((t) => t.id === id);
    return topic
      ? [
          {
            id,
            slug: topic.slug,
            name: topic.name,
            durationSeconds: pkg.isFullTryout
              ? (durations[utbkSubtests.find((s) => s.slug === topic.slug)?.short ?? ""] ?? 1800)
              : pkg.duration * 60,
          },
        ]
      : [];
  });
}
