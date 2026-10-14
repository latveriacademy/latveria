import { eq } from "drizzle-orm";
import type { ClientWsMessage } from "@latveria/shared";
import { clientWsMessageSchema } from "@latveria/shared";
import { getDb } from "../../lib/db";
import { warriorBattleParticipants } from "../../lib/db/schema";
import {
  broadcastToBattle,
  registerSocket,
  sendToSocket,
  unregisterSocket,
  getRoomSockets,
  type WarriorWebSocket,
} from "./warrior-room.manager";

import { getBattleState } from "./warrior-battle.service";
import { submitAnswer, togglePlayerReady } from "./warrior-engine.service";
import { createRematch } from "./warrior-history.service";

export async function onSocketOpen(ws: WarriorWebSocket) {
  const { battleId, participantId } = ws.data;
  registerSocket(battleId, ws);

  // Mark participant as connected in DB
  try {
    const db = getDb();
    await db
      .update(warriorBattleParticipants)
      .set({
        connectedAt: new Date(),
        disconnectedAt: null,
      })
      .where(eq(warriorBattleParticipants.id, participantId));

    // Refresh everyone's personalized state when someone joins or reconnects.
    for (const socket of getRoomSockets(battleId)) {
      const currentState = await getBattleState(battleId, socket.data.userId);
      sendToSocket(socket, { type: "battle:state", state: currentState });
    }
  } catch (err) {
    console.error(`[WarriorSocket] Error in onSocketOpen for battle ${battleId}:`, err);
  }
}

export async function onSocketMessage(ws: WarriorWebSocket, message: string | Buffer) {
  const { battleId, userId } = ws.data;
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(typeof message === "string" ? message : message.toString());
  } catch {
    sendToSocket(ws, { type: "battle:error", message: "Payload pesan tidak valid." });
    return;
  }

  const result = clientWsMessageSchema.safeParse(parsedJson);
  if (!result.success) {
    sendToSocket(ws, { type: "battle:error", message: "Format aksi tidak valid." });
    return;
  }

  const cmd: ClientWsMessage = result.data;
  try {
    switch (cmd.type) {
      case "battle:ready":
        await togglePlayerReady(battleId, userId, cmd.isReady);
        break;

      case "battle:answer":
        await submitAnswer(battleId, userId, {
          battleId,
          questionId: cmd.questionId,
          position: cmd.position,
          selectedAnswer: cmd.selectedAnswer,
          responsePayload: cmd.responsePayload,
        });
        break;

      case "battle:rematch":
        await createRematch(battleId, userId);
        break;

      case "battle:heartbeat":
        ws.ping();
        break;
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    sendToSocket(ws, { type: "battle:error", message: errorMessage });
  }
}

export async function onSocketClose(ws: WarriorWebSocket) {
  const { battleId, participantId } = ws.data;
  unregisterSocket(battleId, ws);
  if (getRoomSockets(battleId).some((socket) => socket.data.participantId === participantId))
    return;

  try {
    const db = getDb();
    await db
      .update(warriorBattleParticipants)
      .set({ disconnectedAt: new Date() })
      .where(eq(warriorBattleParticipants.id, participantId));

    // Broadcast player left/disconnected
    broadcastToBattle(battleId, {
      type: "battle:player_left",
      participantId,
      reason: "Koneksi terputus.",
    });
  } catch (err) {
    console.error(`[WarriorSocket] Error in onSocketClose for battle ${battleId}:`, err);
  }
}
