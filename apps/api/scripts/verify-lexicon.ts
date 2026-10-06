import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { app } from "../src/app";
import { getDb } from "../src/lib/db";
import { user } from "../src/lib/db/auth-schema";
import { questionPackages, questions, tryoutPackageQuestions } from "../src/lib/db/schema";
import { invalidateCatalogCache } from "../src/services/topic.service";
import { verifyAvatar } from "./verify-avatar";
import { verifyPassage } from "./verify-passage";

export async function verifyLexicon() {
  await verifyAvatar();
  await verifyPassage();
  if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname))
    throw new Error("Verifikasi Lexicon hanya untuk DB lokal.");
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  const users: string[] = [];
  const questionIds: string[] = [];
  const packageIds: string[] = [];
  const request = (path: string, cookie = "", body?: unknown, method = body ? "POST" : "GET") =>
    app.request(`${origin}/api${path}`, {
      method,
      headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  const signup = async () => {
    const res = await request("/auth/sign-up/email", "", {
      name: "Lexicon integration",
      email: `lexicon-${crypto.randomUUID()}@example.test`,
      password: `Test-${crypto.randomUUID()}!`,
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    users.push(data.user.id);
    return {
      id: data.user.id,
      cookie: res.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; "),
    };
  };
  try {
    const admin = await signup(),
      learner = await signup(),
      other = await signup();
    await getDb().update(user).set({ role: "admin" }).where(eq(user.id, admin.id));
    assert.equal((await request("/learner/vocabulary")).status, 401);
    assert.equal((await request("/learner/vocabulary", admin.cookie)).status, 403);
    const topics = await (await request("/admin/topics", admin.cookie)).json();
    const lbe = topics.find((item: { slug: string }) => item.slug === "literasi-bahasa-inggris");
    assert.ok(lbe);
    const pkgRes = await request(`/admin/subtests/${lbe.id}/packages`, admin.cookie, {
      name: `Lexicon ${crypto.randomUUID()}`,
      targetQuestions: 1,
    });
    assert.equal(pkgRes.status, 201);
    const pkg = await pkgRes.json();
    packageIds.push(pkg.id);
    const annotation = {
      id: crypto.randomUUID(),
      term: "fried",
      start: 14,
      end: 19,
      definition: "Rusak akibat korsleting",
      partOfSpeech: "adjective",
      phonetic: "",
      context: "The phone was fried.",
      example: "The circuit was fried.",
      etymology: "",
      synonyms: ["damaged"],
    };
    const input = {
      topicId: lbe.id,
      packageId: pkg.id,
      prompt: "The phone was fried. What does fried mean?",
      options: ["Damaged", "Cooked", "Wet", "Clean", "Broken"],
      correctAnswer: 0,
      explanation: "Fried berarti rusak pada perangkat elektronik.",
      source: "Lexicon integration fixture",
      annotations: [annotation],
    };
    assert.equal((await request("/admin/questions", learner.cookie, input)).status, 403);
    assert.equal(
      (
        await request("/admin/questions", admin.cookie, {
          ...input,
          topicId: topics.find((item: { slug: string }) => item.slug !== lbe.slug).id,
          packageId: undefined,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/admin/questions", admin.cookie, {
          ...input,
          annotations: [{ ...annotation, start: 1 }],
        })
      ).status,
      400,
    );
    const created = await request("/admin/questions", admin.cookie, input);
    assert.equal(created.status, 201);
    const question = await created.json();
    questionIds.push(question.id);
    const detail = await (await request(`/admin/questions/${question.id}`, admin.cookie)).json();
    assert.deepEqual(detail.annotations, [annotation]);
    const practiceRes = await request(`/learner/practice/${lbe.slug}/${pkg.id}`, learner.cookie);
    assert.equal(practiceRes.status, 200);
    const practiceData = await practiceRes.json();
    assert.deepEqual(practiceData.items[0].annotations, [annotation]);
    assert.equal(practiceData.items[0].correctAnswer, undefined);
    const submitted = await request(`/learner/practice/${lbe.slug}/${pkg.id}`, learner.cookie, {
      answers: { [question.id]: 0 },
    });
    assert.equal(submitted.status, 201);
    const attempt = await submitted.json();
    const review = await (await request(`/learner/results/${attempt.id}`, learner.cookie)).json();
    assert.deepEqual(review.answers[0].annotations, [annotation]);
    assert.equal(
      (
        await request("/admin/questions/import", admin.cookie, {
          groups: [
            {
              subtes: lbe.slug,
              category: "Lexicon",
              packageId: pkg.id,
              questions: [
                {
                  ...input,
                  topicId: undefined,
                  packageId: undefined,
                  annotations: [{ ...annotation, end: 1 }],
                },
              ],
            },
          ],
        })
      ).status,
      400,
    );
    const save = { questionId: question.id, annotationId: annotation.id };
    const first = await request("/learner/vocabulary", learner.cookie, save);
    assert.equal(first.status, 200);
    const saved = await first.json();
    assert.equal(
      (await (await request("/learner/vocabulary", learner.cookie, save)).json()).id,
      saved.id,
    );
    assert.equal(
      (await request("/learner/vocabulary", learner.cookie, { ...save, definition: "Forged" }))
        .status,
      400,
    );
    assert.equal(
      (
        await request("/learner/vocabulary", learner.cookie, {
          ...save,
          annotationId: crypto.randomUUID(),
        })
      ).status,
      404,
    );
    assert.deepEqual(await (await request("/learner/vocabulary", other.cookie)).json(), []);
    assert.equal(
      (await request(`/learner/vocabulary/${saved.id}`, other.cookie, undefined, "DELETE")).status,
      404,
    );
    const collection = await (await request("/learner/vocabulary", learner.cookie)).json();
    assert.equal(collection.length, 1);
    assert.deepEqual(collection[0].annotation, annotation);

    await getDb()
      .update(questionPackages)
      .set({ packageType: "Simulasi" })
      .where(eq(questionPackages.id, pkg.id));
    await getDb()
      .insert(tryoutPackageQuestions)
      .values({ packageId: pkg.id, questionId: question.id });
    invalidateCatalogCache();
    const started = await request(`/learner/tryouts/start/${pkg.id}`, learner.cookie, {});
    assert.equal(started.status, 201);
    const session = await started.json();
    const active = await (await request(`/learner/tryouts/${session.id}`, learner.cookie)).json();
    assert.equal(active.reviewQuestions, undefined);
    assert.equal(active.questions[0].annotations, undefined);
    assert.equal(JSON.stringify(active).includes(annotation.definition), false);
    assert.equal((await request(`/learner/tryouts/${session.id}`, other.cookie)).status, 404);
    assert.equal(
      (
        await request(`/learner/tryouts/${session.id}/subtest-submit`, learner.cookie, {
          answers: { [question.id]: "0" },
          timeSpentByQuestion: {},
        })
      ).status,
      200,
    );
    const completed = await (
      await request(`/learner/tryouts/${session.id}`, learner.cookie)
    ).json();
    assert.equal(completed.session.state, "completed");
    assert.deepEqual(completed.reviewQuestions[0].annotations, [annotation]);
    assert.equal(
      (
        await request(
          `/admin/questions/${question.id}`,
          admin.cookie,
          { ...input, annotations: [{ ...annotation, definition: "Updated definition" }] },
          "PUT",
        )
      ).status,
      200,
    );
    assert.equal(
      (await (await request("/learner/vocabulary", learner.cookie)).json())[0].annotation
        .definition,
      annotation.definition,
    );
    assert.equal(
      (await request(`/admin/questions/${question.id}`, admin.cookie, undefined, "DELETE")).status,
      200,
    );
    const afterDelete = await (await request("/learner/vocabulary", learner.cookie)).json();
    assert.equal(afterDelete[0].questionId, null);
    assert.deepEqual(afterDelete[0].annotation, annotation);
    assert.equal(
      (await request(`/learner/vocabulary/${saved.id}`, learner.cookie, undefined, "DELETE"))
        .status,
      200,
    );
    assert.deepEqual(await (await request("/learner/vocabulary", learner.cookie)).json(), []);
    console.info(
      "Lexicon integration: annotations, validation, private vocabulary, idempotency, snapshots, and tryout secrecy PASSED.",
    );
  } finally {
    if (users.length) await getDb().delete(user).where(inArray(user.id, users));
    if (questionIds.length)
      await getDb().delete(questions).where(inArray(questions.id, questionIds));
    if (packageIds.length)
      await getDb().delete(questionPackages).where(inArray(questionPackages.id, packageIds));
    invalidateCatalogCache();
  }
}
