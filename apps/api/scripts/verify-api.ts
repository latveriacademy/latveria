import { loadEnvFile } from "node:process";
import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { app } from "../src/app";
import { getDb } from "../src/lib/db";
import { user } from "../src/lib/db/auth-schema";
import { questions } from "../src/lib/db/schema";
import { pyramidQuestion } from "@latveria/shared";

loadEnvFile(".env.local");
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
  const mathTopic = topics.find((topic: { slug: string }) => topic.slug === "penalaran-matematika");
  assert.ok(mathTopic);
  const mathPractice = await (await request(`/learner/practice/${mathTopic.slug}`, learner.cookie)).json();
  const roofQuestion = mathPractice.items.find((item: { prompt: string }) => /atap/i.test(item.prompt) && /limas/i.test(item.prompt) && /genteng/i.test(item.prompt));
  assert.ok(roofQuestion, "The seeded roof question should be visible to learners");
  assert.match(roofQuestion.prompt, /\\begin\{tikzpicture\}/);
  assert.doesNotMatch(roofQuestion.prompt, /\$\$\\begin\{tikzpicture\}/);
  assert.ok(!("correctAnswer" in roofQuestion) && !("explanation" in roofQuestion));
  const geometryQuestions = mathPractice.items.filter((item: { id: string }) => ["00000000-0000-4000-8000-000000000015", "00000000-0000-4000-8000-000000000016", "00000000-0000-4000-8000-000000000017"].includes(item.id));
  assert.equal(geometryQuestions.length, 3, "All seeded geometry examples should be in the math topic");
  for (const item of geometryQuestions) {
    assert.match(item.prompt, /\\begin\{tikzpicture\}/);
    assert.doesNotMatch(item.prompt, /\$\$\\begin\{tikzpicture\}/);
  }
  const legacyRoof = await getDb().insert(questions).values({
    id: crypto.randomUUID(),
    topicId: mathTopic.id,
    prompt: "Atap lama limas membutuhkan genteng. $$\\begin{tikzpicture}[scale=0.35]\\draw (0,0)--cycle;\\end{tikzpicture}$$",
    options: ["A", "B", "C", "D"],
    correctAnswer: 0,
    explanation: "Penjelasan lama.",
    source: "Uji migrasi prompt seed",
  }).returning({ id: questions.id });
  questionIds.push(legacyRoof[0].id);
  await getDb().update(questions).set({ prompt: pyramidQuestion.prompt, options: [...pyramidQuestion.options], correctAnswer: pyramidQuestion.correctAnswer, explanation: pyramidQuestion.explanation }).where(eq(questions.id, legacyRoof[0].id));
  const repaired = await getDb().select().from(questions).where(eq(questions.id, legacyRoof[0].id));
  assert.equal(repaired[0].prompt, pyramidQuestion.prompt);
  assert.deepEqual(repaired[0].options, pyramidQuestion.options);
  assert.equal(repaired[0].correctAnswer, pyramidQuestion.correctAnswer);
  assert.equal((await request(`/learner/practice/${topics[0].slug}`, learner.cookie, { answers: {} })).status, 400);
  const selected = practice.items.slice(0, 1);
  const partial = await request(`/learner/practice/${topics[0].slug}`, learner.cookie, { answers: Object.fromEntries(selected.map((item: { id: string }) => [item.id, 0])) });
  assert.equal(partial.status, 201, "A selected subset must be submittable without answering the entire question bank");
  const selectedAttempt = await partial.json();
  const selectedResult = await (await request(`/learner/results/${selectedAttempt.id}`, learner.cookie)).json();
  assert.equal(selectedResult.attempt.total, selected.length);
  assert.equal(selectedResult.answers.length, selected.length);
  assert.equal(selectedResult.answers[0].id, selected[0].id);
  const foreignPractice = await (await request(`/learner/practice/${topics[1].slug}`, learner.cookie)).json();
  assert.equal((await request(`/learner/practice/${topics[0].slug}`, learner.cookie, { answers: { [selected[0].id]: 0, [foreignPractice.items[0].id]: 0 } })).status, 400);
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
  const change = { topicId: topics[0].id, prompt: "Soal uji API versi edit", options: ["5", "6", "7", "8"], correctAnswer: 0, explanation: "Penjelasan soal sesudah diedit.", source: "Dummy integrasi", category: "Materi baru" };
  assert.equal((await request(`/admin/questions/${question.id}`, other.cookie, change, "PUT")).status, 200);
  const edited = await (await request(`/admin/questions/${question.id}`, other.cookie)).json();
  assert.equal(edited.prompt, change.prompt);
  assert.equal(edited.category, change.category);
  assert.equal((await request(`/admin/questions/${practice.items[0].id}`, other.cookie, change, "PUT")).status, 409);
  assert.equal((await request(`/admin/questions/${practice.items[0].id}`, other.cookie, undefined, "DELETE")).status, 409);
  const batch = { groups: [{ subtes: topics[0].slug, category: "Materi batch", questions: [
    { prompt: "Contoh soal batch pertama", options: ["A", "B", "C", "D"], correctAnswer: 1, explanation: "Pembahasan soal pertama.", source: "Dummy integrasi" },
    { prompt: "Contoh soal batch kedua", options: ["E", "F", "G", "H"], correctAnswer: 2, explanation: "Pembahasan soal kedua.", source: "Dummy integrasi" },
  ] }] };
  const imported = await request("/admin/questions/import", other.cookie, batch);
  assert.equal(imported.status, 201);
  assert.equal((await imported.json()).count, 2);
  const batchRows = await getDb().select({ id: questions.id }).from(questions).where(eq(questions.category, "Materi batch"));
  questionIds.push(...batchRows.map((row) => row.id));
  assert.equal((await request("/admin/questions/bulk-delete", learner.cookie, { ids: batchRows.map((row) => row.id) })).status, 403);
  assert.equal((await request("/admin/questions/bulk-delete", other.cookie, { ids: [practice.items[0].id, batchRows[0].id] })).status, 409);
  assert.equal((await request(`/admin/questions/${batchRows[0].id}`, other.cookie)).status, 200);
  const invalidBatch = { groups: [{ ...batch.groups[0], questions: [batch.groups[0].questions[0], { ...batch.groups[0].questions[1], options: ["X", "X", "Y", "Z"] }] }] };
  assert.equal((await request("/admin/questions/import", other.cookie, invalidBatch)).status, 400);
  assert.equal((await getDb().select({ id: questions.id }).from(questions).where(eq(questions.category, "Materi batch"))).length, 2);
  const bulk = await request("/admin/questions/bulk-delete", other.cookie, { ids: batchRows.map((row) => row.id) });
  assert.equal(bulk.status, 200);
  assert.equal((await bulk.json()).count, 2);
  assert.equal((await request(`/admin/questions/${batchRows[0].id}`, other.cookie)).status, 404);
  assert.equal((await request(`/admin/questions/${question.id}`, other.cookie, undefined, "DELETE")).status, 200);
  assert.equal((await request("/auth/sign-out", learner.cookie, {})).status, 200);
  assert.equal((await request("/learner/topics", learner.cookie)).status, 401);
  console.info("API integration: auth, roles, key secrecy, ownership, submission, admin edit/delete, atomic import, logout PASSED.");
} finally {
  if (users.length) await getDb().delete(user).where(inArray(user.id, users));
  if (questionIds.length) await getDb().delete(questions).where(inArray(questions.id, questionIds));
}
