import { and, eq, inArray, notInArray, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDb } from "../../lib/db";
import { questions, tryoutPackageQuestions, warriorBattleAnswers } from "../../lib/db/schema";

type Reader = Pick<ReturnType<typeof getDb>, "select">;
export async function validatePassage(
  db: Reader,
  input: { topicId: string; packageId?: string | null; passageId?: string | null },
  id?: string,
  scope?: { packageId: string; sectionId: string },
) {
  if (!input.passageId) return;
  if (input.passageId === id)
    throw new HTTPException(400, {
      message: "Soal tidak dapat memakai wacananya sendiri sebagai referensi.",
    });
  const [source] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, input.passageId))
    .for("key share");
  const [member] = scope
    ? await db
        .select()
        .from(tryoutPackageQuestions)
        .where(
          and(
            eq(tryoutPackageQuestions.packageId, scope.packageId),
            eq(tryoutPackageQuestions.sectionId, scope.sectionId),
            eq(tryoutPackageQuestions.questionId, input.passageId),
          ),
        )
    : [];
  const [target] =
    id && !scope
      ? await db
          .select({ passageId: questions.passageId })
          .from(questions)
          .where(eq(questions.id, id))
      : [];
  if (
    !(source?.passage || source?.stimulus?.passage) ||
    source.passageId ||
    source.topicId !== input.topicId ||
    (scope
      ? !member
      : source.packageId !== (input.packageId ?? null) && target?.passageId !== input.passageId)
  )
    throw new HTTPException(400, {
      message: scope
        ? "Pilih wacana asli dari soal lain pada subtes Tryout yang sama."
        : "Pilih soal sumber dengan wacana asli pada subtes dan paket yang sama.",
    });
}
export async function protectPassageSources(db: Reader, ids: string[]) {
  const [dependent] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(and(inArray(questions.passageId, ids), notInArray(questions.id, ids)))
    .limit(1);
  if (dependent)
    throw new HTTPException(409, {
      message:
        "Wacana soal masih digunakan oleh soal lain. Lepaskan referensi sebelum menghapus atau memindahkan sumber.",
    });
}

export async function protectWarriorAnswers(db: Reader, ids: string[]) {
  const found = await db
    .select({ id: warriorBattleAnswers.questionId })
    .from(warriorBattleAnswers)
    .innerJoin(questions, eq(questions.id, warriorBattleAnswers.questionId))
    .where(or(inArray(warriorBattleAnswers.questionId, ids), inArray(questions.passageId, ids)))
    .limit(1);
  if (found.length)
    throw new HTTPException(409, {
      message: "Soal sudah dijawab dalam battle dan tidak dapat diubah atau dihapus.",
    });
}
