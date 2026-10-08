import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { app } from "../src/app";
import { getDb } from "../src/lib/db";
import { user, session } from "../src/lib/db/auth-schema";
import { questions, topics, practiceAttempts, practiceAnswers } from "../src/lib/db/schema";
import { learnerSummary } from "@latveria/shared";
import { verifyAdminTryouts } from "./verify-admin-tryouts";
import { verifyIrt } from "./verify-irt";

if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Verifikasi admin hanya untuk DB lokal.");
const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
const ids: string[] = [];
const questionIds: string[] = [];
const request = async (path: string, cookie = "", body?: unknown, method = body ? "POST" : "GET") =>
  app.request(`${origin}/api${path}`, {
    method,
    headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
async function signup() {
  const credentials = {
    email: `admin-qa-${crypto.randomUUID()}@example.test`,
    password: `Test-${crypto.randomUUID()}!`,
  };
  const response = await request("/auth/sign-up/email", "", { ...credentials, name: "Admin QA" });
  assert.equal(response.status, 200);
  const data = await response.json();
  ids.push(data.user.id);
  return {
    id: data.user.id as string,
    credentials,
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
  };
}
try {
  const admin = await signup();
  const learner = await signup();
  await getDb().update(user).set({ role: "admin" }).where(eq(user.id, admin.id));
  const details = await (await request(`/admin/users/${learner.id}`, admin.cookie)).json();
  assert.ok(details.lastLoginAt);
  assert.equal(
    (await request(`/admin/users/${learner.id}/deactivate`, admin.cookie, { deactivate: true }))
      .status,
    200,
  );
  assert.equal((await request("/me", learner.cookie)).status, 401);
  assert.equal((await request("/auth/sign-in/email", "", learner.credentials)).status, 403);
  assert.equal(
    (await getDb().select().from(session).where(eq(session.userId, learner.id))).length,
    0,
  );
  assert.equal(
    (await request(`/admin/users/${learner.id}/deactivate`, admin.cookie, { deactivate: false }))
      .status,
    200,
  );
  assert.equal(
    (
      await request("/auth/sign-in/email", "", {
        ...learner.credentials,
        password: "Incorrect-password!",
      })
    ).status,
    401,
  );
  const [failed] = await getDb().select().from(user).where(eq(user.id, learner.id));
  assert.equal(failed.failedLoginAttempts, 1);
  assert.equal((await request("/auth/sign-in/email", "", learner.credentials)).status, 200);
  assert.equal((await request("/admin/users?page=-1&limit=0", admin.cookie)).status, 400);
  const search = await (
    await request(
      `/admin/users?search=${encodeURIComponent(learner.credentials.email)}`,
      admin.cookie,
    )
  ).json();
  assert.equal(search.pagination.total, 1);
  const [topic] = await getDb().select().from(topics).limit(1);
  const created = await getDb()
    .insert(questions)
    .values(
      ["answered", "unanswered"].map((name) => ({
        topicId: topic.id,
        prompt: `QA ${name}`,
        options: ["A", "B", "C", "D", "E"],
        correctAnswer: 0,
        explanation: "QA explanation",
        source: "QA",
      })),
    )
    .returning();
  questionIds.push(...created.map((q) => q.id));
  for (let index = 0; index < 10; index++) {
    const [attempt] = await getDb()
      .insert(practiceAttempts)
      .values({
        userId: learner.id,
        topicId: topic.id,
        correctCount: index % 2,
        totalCount: 1,
        timeSpentSeconds: 10,
      })
      .returning();
    await getDb()
      .insert(practiceAnswers)
      .values({
        attemptId: attempt.id,
        questionId: created[0].id,
        selectedAnswer: index % 2 ? 0 : 1,
        isCorrect: index % 2,
      });
  }
  const attempts = await getDb()
    .select()
    .from(practiceAttempts)
    .where(eq(practiceAttempts.userId, learner.id));
  const expected = learnerSummary(attempts);
  const detail = await (await request(`/admin/users/${learner.id}`, admin.cookie)).json();
  assert.equal(detail.totalXP, expected.totalXP);
  assert.equal(detail.level, expected.level);
  assert.equal(detail.timeSpent, 100);
  const analytics = await (
    await request("/admin/analytics/questions?limit=100", admin.cookie)
  ).json();
  const stats = analytics.rows.find(
    (row: { questionId: string }) => row.questionId === created[0].id,
  );
  assert.equal(stats.attempts, 10);
  assert.equal(stats.correctRate, 50);
  assert.ok(
    !analytics.rows.some((row: { questionId: string }) => row.questionId === created[1].id),
  );
  for (const type of ["users", "questions", "leaderboard"]) {
    const response = await request(`/admin/export/${type}?format=json`, admin.cookie);
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(await response.json()));
  }
  const exported = await (await request(`/admin/users/${learner.id}/export`, admin.cookie)).json();
  assert.equal(exported.stats.totalXP, expected.totalXP);
  assert.equal(exported.stats.timeSpent, 100);
  const audit = await (await request(`/admin/audit?admin_id=${admin.id}`, admin.cookie)).json();
  assert.ok(audit.rows.some((row: { action: string }) => row.action === "user.status_changed"));
  assert.ok(audit.rows.some((row: { action: string }) => row.action === "users.exported"));
  assert.equal(
    (await request(`/admin/users/${admin.id}/deactivate`, admin.cookie, { deactivate: true }))
      .status,
    409,
  );
  assert.equal(
    (await request(`/admin/users/${learner.id}/deactivate`, admin.cookie, { deactivate: "false" }))
      .status,
    400,
  );
  const login = await request("/auth/sign-in/email", "", learner.credentials);
  const learnerCookie = login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  await verifyAdminTryouts(request, admin.cookie, learnerCookie, learner.id);
  await verifyIrt(request, admin.cookie, { ...learner, cookie: learnerCookie }, signup);
  console.info("Verifikasi kontrol akun dan tryout admin berhasil.");
} finally {
  if (ids.length) await getDb().delete(user).where(inArray(user.id, ids));
  if (questionIds.length) await getDb().delete(questions).where(inArray(questions.id, questionIds));
}
