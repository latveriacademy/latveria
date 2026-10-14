import assert from "node:assert/strict";
import { HTTPException } from "hono/http-exception";
import { eq, inArray } from "drizzle-orm";
import type { ServerWsMessage } from "@latveria/shared";
import { getDb } from "../src/lib/db";
import { user } from "../src/lib/db/auth-schema";
import { questions, topics, warriorBattles } from "../src/lib/db/schema";
import { clearRoomTimer } from "../src/services/warrior/warrior-room.manager";
import {
  updateQuestion,
  deleteQuestion,
  bulkDeleteQuestions,
} from "../src/services/question/question.service";

assert.equal(process.env.NODE_ENV, "development", "Verifikasi hanya untuk development.");
for (const name of ["DATABASE_URL", "DATABASE_MIGRATION_URL"])
  assert.ok(
    ["localhost", "127.0.0.1"].includes(new URL(process.env[name]!).hostname),
    "DB harus lokal.",
  );
process.env.PORT = "0";
const { server } = await import("../src/index");
const base = `http://127.0.0.1:${server.port}`;
const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
const db = getDb();
const users: { id: string; cookie: string; messages: ServerWsMessage[]; socket?: WebSocket }[] = [];
const battleIds: string[] = [];
const questionIds: string[] = [];
let topicId: string | undefined;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const request = (path: string, cookie = "", body?: unknown) =>
  fetch(`${base}/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
async function message(
  client: (typeof users)[number],
  predicate: (event: ServerWsMessage) => boolean,
  timeout = 7000,
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const event = client.messages.find(predicate);
    if (event) return event;
    const error = client.messages.find((event) => event.type === "battle:error");
    assert.ok(!error, JSON.stringify(error));
    await sleep(20);
  }
  throw new Error("Event battle tidak tiba sebelum timeout.");
}
try {
  const [topic] = await db
    .insert(topics)
    .values({ slug: `warrior-qa-${crypto.randomUUID()}`, name: "Warrior integration fixture" })
    .returning();
  topicId = topic.id;
  const rows = await db
    .insert(questions)
    .values(
      [1, 2].map((number) => ({
        topicId: topic.id,
        prompt: `Soal fixture battle ${number}: pilih opsi E.`,
        options: ["A", "B", "C", "D", "E"],
        correctAnswer: 4,
        explanation: "Opsi E benar.",
        source: "Fixture integrasi Warrior",
      })),
    )
    .returning();
  questionIds.push(...rows.map((row) => row.id));
  for (let i = 0; i < 4; i++) {
    const response = await request("/auth/sign-up/email", "", {
      name: `Warrior integration ${i}`,
      email: `warrior-${crypto.randomUUID()}@example.test`,
      password: `Qa-${crypto.randomUUID()}!`,
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    users.push({
      id: data.user.id,
      cookie: response.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; "),
      messages: [],
    });
  }
  for (const mode of ["1v1", "2v2"] as const) {
    const players = users.slice(0, mode === "1v1" ? 2 : 4);
    for (const player of players) player.messages = [];
    const created = await request("/warrior/battles", players[0].cookie, {
      mode,
      questionCount: 2,
      timePerQuestionSeconds: 10,
      topicId,
    });
    assert.equal(created.status, 201);
    const { battle } = await created.json();
    battleIds.push(battle.id);
    assert.equal(
      (await request(`/warrior/battles/${battle.id}/review`, players[0].cookie)).status,
      409,
    );
    assert.equal(
      (await request(`/warrior/battles/${battle.id}/rematch`, players[0].cookie, {})).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${base}/api/warrior/battles/${battle.id}/ws`, {
          headers: { Cookie: players[0].cookie, Origin: "https://invalid.example" },
        })
      ).status,
      403,
    );
    for (const player of players.slice(1))
      assert.equal(
        (await request("/warrior/battles/join", player.cookie, { code: battle.code })).status,
        200,
      );
    if (mode === "1v1") {
      assert.equal((await request(`/warrior/battles/${battle.id}`, users[2].cookie)).status, 403);
      assert.equal(
        (await request(`/warrior/battles/${battle.id}/review`, users[2].cookie)).status,
        403,
      );
      assert.equal(
        (await request("/warrior/battles/join", users[2].cookie, { code: battle.code })).status,
        400,
      );
    }
    for (const player of players) {
      // Bun supports handshake headers; the DOM constructor type only declares protocols.
      const socket: WebSocket = Reflect.construct(WebSocket, [
        `${base.replace("http", "ws")}/api/warrior/battles/${battle.id}/ws`,
        { headers: { Cookie: player.cookie, Origin: origin } },
      ]);
      player.socket = socket;
      socket.onmessage = (event) => player.messages.push(JSON.parse(String(event.data)));
      socket.onerror = () => {};
      const state = await message(player, (event) => event.type === "battle:state");
      assert.ok(state.type === "battle:state");
      assert.ok(state.state.myParticipantId);
    }
    await message(
      players[0],
      (event) =>
        event.type === "battle:state" && event.state.participants.length === players.length,
    );
    for (const player of players)
      player.socket!.send(JSON.stringify({ type: "battle:ready", isReady: true }));
    for (let position = 1; position <= 2; position++) {
      const started = await message(
        players[0],
        (event) =>
          (event.type === "battle:started" || event.type === "battle:next_question") &&
          event.question.position === position,
      );
      assert.ok(started.type === "battle:started" || started.type === "battle:next_question");
      const question = started.question;
      assert.equal("correctAnswer" in question, false);
      assert.equal("explanation" in question, false);
      if (position === 1) {
        assert.equal(
          (
            await request(`/warrior/battles/${battle.id}/answer`, players[0].cookie, {
              questionId: crypto.randomUUID(),
              position,
              selectedAnswer: 4,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(`/warrior/battles/${battle.id}/answer`, players[0].cookie, {
              questionId: question.id,
              position,
              selectedAnswer: 9,
            })
          ).status,
          400,
        );
      }
      for (const player of players) {
        if (mode === "2v2" && position === 2 && player === players[players.length - 1]) continue;
        const state = player.messages.find((event) => event.type === "battle:state");
        assert.ok(state?.type === "battle:state");
        const team = state.state.participants.find(
          (participant) => participant.id === state.state.myParticipantId,
        )!.teamNumber;
        player.socket!.send(
          JSON.stringify({
            type: "battle:answer",
            questionId: question.id,
            position,
            selectedAnswer: team === 1 ? 4 : 0,
          }),
        );
      }
      for (const player of players) {
        const feedback = await message(
          player,
          (event) => event.type === "battle:question_result" && event.result.position === position,
          mode === "2v2" && position === 2 ? 15000 : 3000,
        );
        assert.ok(feedback.type === "battle:question_result");
        assert.equal("correctAnswer" in feedback.result, false);
        assert.equal("explanation" in feedback.result, false);
        assert.ok(feedback.result.participants.every((entry) => !("selectedAnswer" in entry)));
      }
    }
    for (const player of players) {
      const completed = await message(player, (event) => event.type === "battle:completed");
      assert.ok(completed.type === "battle:completed");
      assert.equal(completed.summary.winnerTeamNumber, 1);
      assert.equal(completed.summary.participants.length, players.length);
      assert.equal(completed.summary.teams.find((team) => team.teamNumber === 2)!.score, 0);
      assert.ok(completed.summary.teams.find((team) => team.teamNumber === 1)!.score >= 200);
      const history = await (await request("/warrior/history", player.cookie)).json();
      assert.ok(history.some((entry: { id: string }) => entry.id === battle.id));
      const response = await request(`/warrior/battles/${battle.id}/review`, player.cookie);
      assert.equal(response.status, 200);
      const review = await response.json();
      assert.equal(review.items.length, 2);
      const participant = completed.summary.participants.find(
        (entry) => entry.userId === player.id,
      )!;
      for (const [index, item] of review.items.entries()) {
        assert.equal(item.correctAnswer, 4);
        assert.equal(item.explanation, "Opsi E benar.");
        const skipped = mode === "2v2" && player === players[players.length - 1] && index === 1;
        assert.equal(item.selectedAnswer, skipped ? null : participant.teamNumber === 1 ? 4 : 0);
        assert.equal(item.isCorrect, !skipped && participant.teamNumber === 1);
      }
      const again = await (
        await request(`/warrior/battles/${battle.id}/review`, player.cookie)
      ).json();
      assert.deepEqual(again, review);
      const after = await (await request(`/warrior/battles/${battle.id}`, player.cookie)).json();
      assert.deepEqual(after.teams, completed.summary.teams);
    }
    players[0].socket!.send(JSON.stringify({ type: "battle:rematch" }));
    const rematch = await message(players[0], (event) => event.type === "battle:rematch_created");
    assert.ok(rematch.type === "battle:rematch_created");
    battleIds.push(rematch.newBattleId);
    assert.notEqual(rematch.newBattleId, battle.id);
    for (const player of players) {
      await message(
        player,
        (event) =>
          event.type === "battle:rematch_created" && event.newBattleId === rematch.newBattleId,
      );
      player.socket!.close();
    }
    await sleep(100);
  }
  const used = questionIds[0];
  const conflict = (error: unknown) => error instanceof HTTPException && error.status === 409;
  await assert.rejects(
    updateQuestion(used, {
      topicId,
      prompt: "Perubahan tidak boleh disimpan.",
      options: ["A", "B", "C", "D", "E"],
      correctAnswer: 4,
      explanation: "Opsi E benar.",
      source: "Fixture integrasi Warrior",
    }),
    conflict,
  );
  await assert.rejects(deleteQuestion(used), conflict);
  await assert.rejects(bulkDeleteQuestions({ ids: [used] }), conflict);
  console.info(
    "Warrior integration: real WebSockets, 1v1/2v2, scoring, history, post-battle review (correct/wrong/unanswered), key secrecy, read-only guards, rematch, Origin and ownership PASSED.",
  );
} finally {
  for (const player of users) player.socket?.close();
  for (const id of battleIds) clearRoomTimer(id);
  await sleep(100);
  await server.stop(true);
  if (battleIds.length)
    await db.delete(warriorBattles).where(inArray(warriorBattles.id, battleIds));
  if (users.length)
    await db.delete(user).where(
      inArray(
        user.id,
        users.map((player) => player.id),
      ),
    );
  if (questionIds.length) await db.delete(questions).where(inArray(questions.id, questionIds));
  if (topicId) await db.delete(topics).where(eq(topics.id, topicId));
  await db.$client.end({ timeout: 5 });
}
