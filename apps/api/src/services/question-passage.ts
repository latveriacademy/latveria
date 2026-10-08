import { and, eq, inArray, notInArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDb } from "../lib/db";
import { questions } from "../lib/db/schema";

type Reader = Pick<ReturnType<typeof getDb>, "select">;
export async function validatePassage(
  db: Reader,
  input: { topicId: string; packageId?: string | null; passageId?: string | null },
  id?: string,
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
  if (
    !source?.passage ||
    source.passageId ||
    source.topicId !== input.topicId ||
    source.packageId !== (input.packageId ?? null)
  )
    throw new HTTPException(400, {
      message: "Pilih soal sumber dengan wacana asli pada subtes dan paket yang sama.",
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
