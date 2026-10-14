import { and, eq } from "drizzle-orm";
import { getAuth } from "../../lib/auth";
import { getDb } from "../../lib/db";
import { warriorBattleParticipants, warriorBattles, warriorBattleTeams } from "../../lib/db/schema";
import type { WarriorSocketData } from "./warrior-room.manager";
import { idSchema } from "@latveria/shared";
import { allowedOrigins } from "../../lib/origins";

export async function authenticateWarriorWs(
  req: Request,
): Promise<
  { success: true; data: WarriorSocketData } | { success: false; status: number; reason: string }
> {
  const url = new URL(req.url);
  const match = url.pathname.match(/^\/api\/warrior\/battles\/([^/]+)\/ws$/);
  if (!match) {
    return { success: false, status: 404, reason: "Not Found" };
  }
  const parsed = idSchema.safeParse(match[1]);
  if (!parsed.success) return { success: false, status: 400, reason: "ID battle tidak valid." };
  const battleId = parsed.data;
  if (!allowedOrigins().includes(req.headers.get("origin") ?? ""))
    return { success: false, status: 403, reason: "Origin tidak diizinkan." };

  // 1. Session verification via Better Auth
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session?.user) {
    return { success: false, status: 401, reason: "Silakan masuk terlebih dahulu." };
  }

  // 2. Battle existence and user membership verification
  const db = getDb();
  const [battle] = await db.select().from(warriorBattles).where(eq(warriorBattles.id, battleId));

  if (!battle) {
    return { success: false, status: 404, reason: "Battle tidak ditemukan." };
  }

  const [participant] = await db
    .select()
    .from(warriorBattleParticipants)
    .where(
      and(
        eq(warriorBattleParticipants.battleId, battleId),
        eq(warriorBattleParticipants.userId, session.user.id),
      ),
    );

  if (!participant) {
    return { success: false, status: 403, reason: "Anda bukan peserta battle ini." };
  }

  const [team] = await db
    .select()
    .from(warriorBattleTeams)
    .where(eq(warriorBattleTeams.id, participant.teamId));

  return {
    success: true,
    data: {
      userId: session.user.id,
      name: session.user.name,
      image: session.user.image,
      battleId,
      participantId: participant.id,
      teamId: participant.teamId,
      teamNumber: team?.teamNumber ?? 1,
    },
  };
}
