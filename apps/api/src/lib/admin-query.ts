import { z } from "zod";
import { HTTPException } from "hono/http-exception";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export function pagination(query: Record<string, string>, defaultLimit = 50) {
  const parsed = paginationSchema.safeParse({ ...query, limit: query.limit ?? defaultLimit });
  if (!parsed.success) throw new HTTPException(400, { message: "Paginasi tidak valid." });
  return parsed.data;
}
