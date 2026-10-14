import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createBattleSchema, idSchema, joinBattleSchema } from "@latveria/shared";
import type { AppEnv } from "../types";
import { createBattle, getBattleState, joinBattleByCode } from "../services/warrior/warrior-battle.service";
import { togglePlayerReady, submitAnswer } from "../services/warrior/warrior-engine.service";
import { createRematch, getUserBattleHistory } from "../services/warrior/warrior-history.service";

export const warriorHandler = new Hono<AppEnv>();

// Create a new battle
warriorHandler.post("/api/warrior/battles", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = createBattleSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Pengaturan battle tidak valid." });
  }

  const { battle, participant } = await createBattle(user.id, parsed.data);
  return c.json({ battle, participant }, 201);
});

// Join battle by room code
warriorHandler.post("/api/warrior/battles/join", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = joinBattleSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Kode room tidak valid." });
  }

  const { battle, participant } = await joinBattleByCode(user.id, parsed.data.code);
  return c.json({ battle, participant });
});

// Get battle state (sync / polling fallback)
warriorHandler.get("/api/warrior/battles/:id", async (c) => {
  const user = c.get("user");
  const battleId = c.req.param("id");
  const parsedId = idSchema.safeParse(battleId);
  if (!parsedId.success) {
    throw new HTTPException(400, { message: "ID battle tidak valid." });
  }

  const state = await getBattleState(parsedId.data, user.id);
  return c.json(state);
});

// Toggle player ready status
warriorHandler.post("/api/warrior/battles/:id/ready", async (c) => {
  const user = c.get("user");
  const battleId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const isReady = body.isReady !== false;

  await togglePlayerReady(battleId, user.id, isReady);
  return c.json({ success: true, isReady });
});

// HTTP fallback for submitting answer
warriorHandler.post("/api/warrior/battles/:id/answer", async (c) => {
  const user = c.get("user");
  const battleId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) throw new HTTPException(400, { message: "Data jawaban tidak valid." });

  const result = await submitAnswer(battleId, user.id, {
    battleId,
    questionId: body.questionId,
    position: body.position,
    selectedAnswer: body.selectedAnswer,
    responsePayload: body.responsePayload,
  });

  return c.json(result);
});

// Create rematch
warriorHandler.post("/api/warrior/battles/:id/rematch", async (c) => {
  const user = c.get("user");
  const battleId = c.req.param("id");
  const result = await createRematch(battleId, user.id);
  return c.json(result, 201);
});

// User battle history
warriorHandler.get("/api/warrior/history", async (c) => {
  const user = c.get("user");
  const history = await getUserBattleHistory(user.id);
  return c.json(history);
});
