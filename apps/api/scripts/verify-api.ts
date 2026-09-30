import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { app } from "../src/app";
import { getDb } from "../src/lib/db";
import { user } from "../src/lib/db/auth-schema";
import { questions } from "../src/lib/db/schema";

if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Verifikasi integrasi hanya untuk DB lokal.");
const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
const users: string[] = [];
const questionIds: string[] = [];
async function request(path: string, cookie = "", body?: unknown, method = body ? "POST" : "GET") {
  return app.request(`${origin}/api${path}`, { method, headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}
async function signup() {
  const response = await request("/auth/sign-up/email", "", { name: "Penguji API", email: `api-${crypto.randomUUID()}@example.test`, password: `Test-${crypto.randomUUID()}!`, role: "admin" });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.user.role, "user");
  users.push(data.user.id);
  const cookie = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  assert.ok(cookie);
  return { cookie, id: data.user.id as string };
}
try {
  assert.equal((await request("/learner/topics")).status, 401);
  const learner = await signup();
  const other = await signup();
  assert.equal((await request("/admin/questions", learner.cookie)).status, 403);
  const topics = await (await request("/learner/topics", learner.cookie)).json();
  assert.equal(topics.length, 7);
  const practice = await (await request(`/learner/practice/${topics[0].slug}`, learner.cookie)).json();
  assert.ok(practice.items.length > 0);
  for (const item of practice.items) { assert.ok(!("correctAnswer" in item)); assert.ok(!("explanation" in item)); }
  assert.equal((await request(`/learner/practice/${topics[0].slug}`, learner.cookie, { answers: {} })).status, 400);
  const submission = await request(`/learner/practice/${topics[0].slug}`, learner.cookie, { answers: Object.fromEntries(practice.items.map((item: { id: string }) => [item.id, 0])) });
  assert.equal(submission.status, 201);
  const attempt = await submission.json();
  assert.equal((await request(`/learner/results/${attempt.id}`, other.cookie)).status, 404);
  const result = await (await request(`/learner/results/${attempt.id}`, learner.cookie)).json();
  assert.equal(result.answers.length, practice.items.length);
  assert.ok("correctAnswer" in result.answers[0]);
  await getDb().update(user).set({ role: "admin" }).where(eq(user.id, other.id));
  assert.equal((await request("/learner/topics", other.cookie)).status, 403);
  assert.equal((await request("/admin/questions", other.cookie)).status, 200);
  const created = await request("/admin/questions", other.cookie, { topicId: topics[0].id, prompt: "Soal uji API $x^2$", options: ["1", "2", "3", "4"], correctAnswer: 3, explanation: "Penjelasan uji API.", source: "Dummy integrasi", category: "Kategori uji API" });
  assert.equal(created.status, 201);
  const question = await created.json(); questionIds.push(question.id);
  const filtered = await (await request(`/admin/questions?subtes=${topics[0].slug}&kategori=Kategori%20uji%20API`, other.cookie)).json();
  assert.equal(filtered.total, 1);
  assert.equal((await request(`/admin/questions/${question.id}`, learner.cookie)).status, 403);
  assert.equal((await request(`/admin/questions/${question.id}`, other.cookie)).status, 200);
  assert.equal((await request(`/admin/questions/${practice.items[0].id}`, other.cookie, undefined, "DELETE")).status, 409);
  assert.equal((await request(`/admin/questions/${question.id}`, other.cookie, undefined, "DELETE")).status, 200);
  assert.equal((await request("/auth/sign-out", learner.cookie, {})).status, 200);
  assert.equal((await request("/learner/topics", learner.cookie)).status, 401);
  console.info("API integration: auth, roles, key secrecy, ownership, submission, admin category/preview/delete, logout PASSED.");
} finally {
  if (users.length) await getDb().delete(user).where(inArray(user.id, users));
  if (questionIds.length) await getDb().delete(questions).where(inArray(questions.id, questionIds));
}
