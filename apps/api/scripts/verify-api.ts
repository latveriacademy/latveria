import assert from "node:assert/strict";
import { verifyBankSearch } from "./verify-bank-search";
import { verifyLexicon } from "./verify-lexicon";
import { createTryoutFixture, tryoutDummyAnswers } from "./verify-tryout-fixture";
import { eq, inArray } from "drizzle-orm";
import { app } from "../src/app";
import { getDb } from "../src/lib/db";
import { user } from "../src/lib/db/auth-schema";
import {
  questions,
  questionPackages,
  practiceAttempts,
  tryoutSessions,
  questionRevisions,
} from "../src/lib/db/schema";
import { pyramidQuestion } from "@latveria/shared";

if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Verifikasi integrasi hanya untuk DB lokal.");
const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
const users: string[] = [];
const questionIds: string[] = [];
const packageIds: string[] = [];
const tryoutSessionIds: string[] = [];
async function request(path: string, cookie = "", body?: unknown, method = body ? "POST" : "GET") {
  return app.request(`${origin}/api${path}`, {
    method,
    headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function signup() {
  const response = await request("/auth/sign-up/email", "", {
    name: "Penguji API",
    email: `api-${crypto.randomUUID()}@example.test`,
    password: `Test-${crypto.randomUUID()}!`,
    role: "admin",
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.user.role, "user");
  users.push(data.user.id);
  const cookie = response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  assert.ok(cookie);
  return { cookie, id: data.user.id as string };
}
try {
  await verifyLexicon();
  assert.equal((await request("/learner/topics")).status, 401);
  assert.equal((await request("/learner/profile")).status, 401);
  const [learner, other] = [await signup(), await signup()];
  const initialProfile = await (await request("/learner/profile", learner.cookie)).json();
  assert.equal(initialProfile.name, "Penguji API");
  assert.equal(initialProfile.bio, "");
  const profileInput = {
    name: " Peserta baru ",
    codename: "Pelajar",
    targetUniversity: "UI - Matematika",
    bio: "Latihan setiap hari",
    motto: "Terus belajar",
  };
  const expectedProfile = { ...profileInput, name: "Peserta baru", image: null };
  const profileUpdate = await request("/learner/profile", learner.cookie, profileInput, "PUT");
  assert.equal(profileUpdate.status, 200);
  assert.deepEqual(await profileUpdate.json(), expectedProfile);
  assert.deepEqual(
    await (await request("/learner/profile", learner.cookie)).json(),
    expectedProfile,
  );
  assert.equal((await (await request("/me", learner.cookie)).json()).name, expectedProfile.name);
  assert.equal(
    (await (await request("/learner/profile", other.cookie)).json()).name,
    initialProfile.name,
  );
  for (const field of ["role", "id", "email", "level", "totalXP", "streakDays"]) {
    const res = await request(
      "/learner/profile",
      learner.cookie,
      { ...profileInput, [field]: "forbidden" },
      "PUT",
    );
    assert.equal(res.status, 400);
  }
  assert.equal(
    (await request("/learner/profile", learner.cookie, { ...profileInput, name: " " }, "PUT"))
      .status,
    400,
  );
  assert.equal(
    (
      await request(
        "/learner/profile",
        learner.cookie,
        { ...profileInput, bio: "x".repeat(501) },
        "PUT",
      )
    ).status,
    400,
  );
  const deniedProfile = await app.request(`${origin}/api/learner/profile`, {
    method: "PUT",
    headers: {
      Cookie: learner.cookie,
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...profileInput, name: "Changed" }),
  });
  assert.equal(deniedProfile.status, 403);
  assert.deepEqual(
    await (await request("/learner/profile", learner.cookie)).json(),
    expectedProfile,
  );
  assert.equal((await request("/admin/questions", learner.cookie)).status, 403);
  const topics = await (await request("/learner/topics", learner.cookie)).json();
  assert.equal(topics.length, 7);
  const practice = await (
    await request(`/learner/practice/${topics[0].slug}`, learner.cookie)
  ).json();
  assert.ok(practice.items.length > 0);
  for (const item of practice.items) {
    assert.ok(!("correctAnswer" in item));
    assert.ok(!("explanation" in item));
  }
  const mathTopic = topics.find((topic: { slug: string }) => topic.slug === "penalaran-matematika");
  assert.ok(mathTopic);
  const mathPractice = await (
    await request(`/learner/practice/${mathTopic.slug}`, learner.cookie)
  ).json();
  const roofQuestion = mathPractice.items.find(
    (item: { prompt: string }) =>
      /atap/i.test(item.prompt) && /limas/i.test(item.prompt) && /genteng/i.test(item.prompt),
  );
  assert.ok(roofQuestion, "The seeded roof question should be visible to learners");
  assert.match(roofQuestion.prompt, /\\begin\{tikzpicture\}/);
  assert.doesNotMatch(roofQuestion.prompt, /\$\$\\begin\{tikzpicture\}/);
  assert.ok(!("correctAnswer" in roofQuestion) && !("explanation" in roofQuestion));
  const geometryQuestions = mathPractice.items.filter((item: { id: string }) =>
    [
      "00000000-0000-4000-8000-000000000015",
      "00000000-0000-4000-8000-000000000016",
      "00000000-0000-4000-8000-000000000017",
    ].includes(item.id),
  );
  assert.equal(
    geometryQuestions.length,
    3,
    "All seeded geometry examples should be in the math topic",
  );
  for (const item of geometryQuestions) {
    assert.match(item.prompt, /\\begin\{tikzpicture\}/);
    assert.doesNotMatch(item.prompt, /\$\$\\begin\{tikzpicture\}/);
  }
  const legacyRoof = await getDb()
    .insert(questions)
    .values({
      id: crypto.randomUUID(),
      topicId: mathTopic.id,
      prompt:
        "Atap lama limas membutuhkan genteng. $$\\begin{tikzpicture}[scale=0.35]\\draw (0,0)--cycle;\\end{tikzpicture}$$",
      options: ["A", "B", "C", "D", "E"],
      correctAnswer: 0,
      explanation: "Penjelasan lama.",
      source: "Uji migrasi prompt seed",
    })
    .returning({ id: questions.id });
  questionIds.push(legacyRoof[0].id);
  await getDb()
    .update(questions)
    .set({
      prompt: pyramidQuestion.prompt,
      options: [...pyramidQuestion.options],
      correctAnswer: pyramidQuestion.correctAnswer,
      explanation: pyramidQuestion.explanation,
    })
    .where(eq(questions.id, legacyRoof[0].id));
  const repaired = await getDb().select().from(questions).where(eq(questions.id, legacyRoof[0].id));
  assert.equal(repaired[0].prompt, pyramidQuestion.prompt);
  assert.deepEqual(repaired[0].options, pyramidQuestion.options);
  assert.equal(repaired[0].correctAnswer, pyramidQuestion.correctAnswer);
  assert.equal(
    (await request(`/learner/practice/${topics[0].slug}`, learner.cookie, { answers: {} })).status,
    400,
  );
  const selected = practice.items.slice(0, 1);
  const partial = await request(`/learner/practice/${topics[0].slug}`, learner.cookie, {
    answers: Object.fromEntries(selected.map((item: { id: string }) => [item.id, 0])),
  });
  assert.equal(
    partial.status,
    201,
    "A selected subset must be submittable without answering the entire question bank",
  );
  const selectedAttempt = await partial.json();
  const selectedResult = await (
    await request(`/learner/results/${selectedAttempt.id}`, learner.cookie)
  ).json();
  assert.equal(selectedResult.attempt.total, selected.length);
  assert.equal(selectedResult.answers.length, selected.length);
  assert.equal(selectedResult.answers[0].id, selected[0].id);
  const foreignPractice = await (
    await request(`/learner/practice/${topics[1].slug}`, learner.cookie)
  ).json();
  assert.equal(
    (
      await request(`/learner/practice/${topics[0].slug}`, learner.cookie, {
        answers: { [selected[0].id]: 0, [foreignPractice.items[0].id]: 0 },
      })
    ).status,
    400,
  );
  const submission = await request(`/learner/practice/${topics[0].slug}`, learner.cookie, {
    answers: Object.fromEntries(practice.items.map((item: { id: string }) => [item.id, 0])),
  });
  assert.equal(submission.status, 201);
  const attempt = await submission.json();
  assert.equal((await request(`/learner/results/${attempt.id}`, other.cookie)).status, 404);
  const result = await (await request(`/learner/results/${attempt.id}`, learner.cookie)).json();
  assert.equal(result.answers.length, practice.items.length);
  assert.ok("correctAnswer" in result.answers[0]);
  const history = await (await request("/learner/history", learner.cookie)).json();
  assert.ok(
    history.some(
      (item: { id: string; total: number }) =>
        item.id === attempt.id && item.total === result.answers.length,
    ),
  );
  assert.deepEqual(await (await request("/learner/history", other.cookie)).json(), []);
  const summaryBeforeReview = await (await request("/learner/summary", learner.cookie)).json();
  assert.equal(
    summaryBeforeReview.totalXP,
    history.reduce((sum: number, item: { correct: number }) => sum + 30 + item.correct * 15, 0),
  );
  assert.equal(summaryBeforeReview.streakDays, 1);
  assert.equal(summaryBeforeReview.practicedToday, true);
  assert.equal((await request(`/learner/results/${attempt.id}`, learner.cookie)).status, 200);
  assert.deepEqual(
    await (await request("/learner/summary", learner.cookie)).json(),
    summaryBeforeReview,
  );
  const retryInput = { submissionId: crypto.randomUUID(), answers: { [selected[0].id]: 0 } };
  const retries = await Promise.all([
    request(`/learner/practice/${topics[0].slug}`, learner.cookie, retryInput),
    request(`/learner/practice/${topics[0].slug}`, learner.cookie, retryInput),
  ]);
  assert.ok(retries.every((response) => response.status === 201));
  const retryResults = await Promise.all(retries.map((response) => response.json()));
  assert.equal(retryResults[0].id, retryResults[1].id);
  assert.equal(retryResults[0].id, retryInput.submissionId);
  const afterRetries = await (await request("/learner/summary", learner.cookie)).json();
  assert.equal(afterRetries.attempts, summaryBeforeReview.attempts + 1);
  assert.equal(afterRetries.totalXP, summaryBeforeReview.totalXP + retryResults[0].earnedXP);
  assert.equal(
    (
      await request(`/learner/practice/${topics[0].slug}`, learner.cookie, {
        ...retryInput,
        answers: { [selected[0].id]: 1 },
      })
    ).status,
    409,
  );
  assert.equal(
    (await request(`/learner/practice/${topics[0].slug}`, other.cookie, retryInput)).status,
    409,
  );
  const forgedXP = await request(`/learner/practice/${topics[0].slug}`, learner.cookie, {
    ...retryInput,
    earnedXP: 999999,
    correctCount: 999999,
  });
  assert.equal((await forgedXP.json()).earnedXP, retryResults[0].earnedXP);
  assert.deepEqual(await (await request("/learner/summary", learner.cookie)).json(), afterRetries);
  const oldDate = new Date(Date.now() - 3 * 86_400_000);
  await getDb()
    .update(practiceAttempts)
    .set({ submittedAt: oldDate })
    .where(eq(practiceAttempts.userId, learner.id));
  const expired = await (await request("/learner/summary", learner.cookie)).json();
  assert.equal(expired.streakDays, 0);
  assert.equal(expired.totalXP, afterRetries.totalXP);
  await getDb()
    .update(practiceAttempts)
    .set({ submittedAt: new Date() })
    .where(eq(practiceAttempts.userId, learner.id));
  const beforeTryoutSummary = await (await request("/learner/summary", learner.cookie)).json();
  const fixture = await createTryoutFixture(topics);
  const fullTryout = fixture.pkg;
  packageIds.push(fullTryout.id);
  questionIds.push(...fixture.questionIds);
  const pinnedCount = fixture.questionIds.length;
  const learnerPackageCatalog = await (await request("/learner/packages", learner.cookie)).json();
  assert.equal(
    learnerPackageCatalog.find((item: { id: string }) => item.id === fullTryout.id)?.questionCount,
    pinnedCount,
  );
  const startedTryout = await request(
    `/learner/tryouts/start/${fullTryout.id}`,
    learner.cookie,
    {},
  );
  assert.equal(startedTryout.status, 201);
  const tryoutSession = await startedTryout.json();
  tryoutSessionIds.push(tryoutSession.id);
  assert.equal((await request(`/learner/tryouts/${tryoutSession.id}`, other.cookie)).status, 404);
  let completedSubtests = 0;
  let finalScore: number | null = null;
  while (completedSubtests < 7) {
    const state = await (
      await request(`/learner/tryouts/${tryoutSession.id}`, learner.cookie)
    ).json();
    assert.equal(state.totalSubtests, 7);
    assert.ok(
      state.questions.length > 0,
      `Subtest ${completedSubtests + 1} should contain pinned questions.`,
    );
    const answers = {
      ...state.session.answers,
      ...tryoutDummyAnswers(state.questions),
    };
    const timeSpentByQuestion = Object.fromEntries(
      state.questions.map((question: { id: string }) => [question.id, 12]),
    );
    const submission = await request(
      `/learner/tryouts/${tryoutSession.id}/subtest-submit`,
      learner.cookie,
      { answers, timeSpentByQuestion },
    );
    assert.equal(submission.status, 200);
    const outcome = await submission.json();
    completedSubtests++;
    if (outcome.status === "break") {
      await getDb()
        .update(tryoutSessions)
        .set({ breakEndsAt: new Date(Date.now() - 1000) })
        .where(eq(tryoutSessions.id, tryoutSession.id));
    } else if (outcome.status === "section_ready") {
      assert.equal(
        (await request(`/learner/tryouts/${tryoutSession.id}/advance`, learner.cookie, {})).status,
        200,
      );
    } else {
      assert.equal(outcome.status, "completed");
      assert.equal(outcome.score.totalCount, Object.keys(answers).length);
      assert.ok(
        Number.isInteger(outcome.score.score) &&
          outcome.score.score >= 0 &&
          outcome.score.score <= 1000,
      );
      finalScore = outcome.score.score;
    }
  }
  const completedState = await (
    await request(`/learner/tryouts/${tryoutSession.id}`, learner.cookie)
  ).json();
  assert.equal(completedState.session.state, "completed");
  assert.equal(completedState.score.score, finalScore);
  assert.deepEqual(
    await (await request("/learner/summary", learner.cookie)).json(),
    beforeTryoutSummary,
    "Tryouts do not grant practice EXP.",
  );
  await getDb().update(user).set({ role: "admin" }).where(eq(user.id, other.id));
  assert.equal((await request("/learner/topics", other.cookie)).status, 403);
  assert.equal((await request("/learner/profile", other.cookie)).status, 403);
  assert.equal((await request("/admin/questions", other.cookie)).status, 200);
  const created = await request("/admin/questions", other.cookie, {
    topicId: topics[0].id,
    prompt: "Soal uji API $x^2$",
    options: ["1", "2", "3", "4", "5"],
    correctAnswer: 3,
    explanation: "Penjelasan uji API.",
    source: "Dummy integrasi",
    category: "Kategori uji API",
  });
  assert.equal(created.status, 201);
  const question = await created.json();
  questionIds.push(question.id);
  const filtered = await (
    await request(
      `/admin/questions?subtes=${topics[0].slug}&kategori=Kategori%20uji%20API`,
      other.cookie,
    )
  ).json();
  assert.equal(filtered.total, 1);
  await verifyBankSearch((path) => request(path, other.cookie));
  assert.equal((await request(`/admin/questions/${question.id}`, learner.cookie)).status, 403);
  assert.equal((await request(`/admin/questions/${question.id}`, other.cookie)).status, 200);
  const change = {
    topicId: topics[0].id,
    prompt: "Soal uji API versi edit",
    options: ["5", "6", "7", "8", "9"],
    correctAnswer: 0,
    explanation: "Penjelasan soal sesudah diedit.",
    source: "Dummy integrasi",
    category: "Materi baru",
  };
  assert.equal(
    (await request(`/admin/questions/${question.id}`, other.cookie, change, "PUT")).status,
    200,
  );
  const edited = await (await request(`/admin/questions/${question.id}`, other.cookie)).json();
  assert.equal(edited.prompt, change.prompt);
  assert.equal(edited.category, change.category);
  // Questions can be edited even after usage in attempts
  assert.equal(
    (
      await request(`/learner/practice/${topics[0].slug}`, learner.cookie, {
        answers: { [question.id]: 0 },
      })
    ).status,
    201,
  );
  assert.equal(
    (await request(`/admin/questions/${question.id}`, other.cookie, change, "PUT")).status,
    200,
  );
  const batch = {
    groups: [
      {
        subtes: topics[0].slug,
        category: "Materi batch",
        questions: [
          {
            prompt: "Contoh soal batch pertama",
            options: ["A", "B", "C", "D", "E"],
            correctAnswer: 1,
            explanation: "Pembahasan soal pertama.",
            source: "Dummy integrasi",
          },
          {
            prompt: "Contoh soal batch kedua",
            options: ["E", "F", "G", "H", "I"],
            correctAnswer: 2,
            explanation: "Pembahasan soal kedua.",
            source: "Dummy integrasi",
          },
        ],
      },
    ],
  };
  const imported = await request("/admin/questions/import", other.cookie, batch);
  assert.equal(imported.status, 201);
  assert.equal((await imported.json()).count, 2);
  const batchRows = await getDb()
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.category, "Materi batch"));
  questionIds.push(...batchRows.map((row) => row.id));
  assert.equal(
    (
      await request("/admin/questions/bulk-delete", learner.cookie, {
        ids: batchRows.map((row) => row.id),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/admin/questions/bulk-delete", other.cookie, {
        ids: [crypto.randomUUID(), batchRows[0].id],
      })
    ).status,
    404,
  );
  assert.equal((await request(`/admin/questions/${batchRows[0].id}`, other.cookie)).status, 200);
  const invalidBatch = {
    groups: [
      {
        ...batch.groups[0],
        questions: [
          batch.groups[0].questions[0],
          { ...batch.groups[0].questions[1], options: ["X", "X", "Y", "Z", "W"] },
        ],
      },
    ],
  };
  assert.equal((await request("/admin/questions/import", other.cookie, invalidBatch)).status, 400);
  assert.equal(
    (
      await getDb()
        .select({ id: questions.id })
        .from(questions)
        .where(eq(questions.category, "Materi batch"))
    ).length,
    2,
  );
  const bulk = await request("/admin/questions/bulk-delete", other.cookie, {
    ids: batchRows.map((row) => row.id),
  });
  assert.equal(bulk.status, 200);
  assert.equal((await bulk.json()).count, 2);
  assert.equal((await request(`/admin/questions/${batchRows[0].id}`, other.cookie)).status, 404);
  assert.equal(
    (await request(`/admin/questions/${question.id}`, other.cookie, undefined, "DELETE")).status,
    200,
  );

  // --- Question Packages Verification ---
  // 1. Learner cannot access admin package routes
  assert.equal(
    (await request(`/admin/subtests/${topics[0].slug}/packages`, learner.cookie)).status,
    403,
  );
  assert.equal(
    (
      await request(`/admin/subtests/${topics[0].slug}/packages`, learner.cookie, {
        name: "Paket Uji",
      })
    ).status,
    403,
  );

  // 2. Admin creates a new package
  const testPkgName = `Paket Uji ${crypto.randomUUID().slice(0, 8)}`;
  const pkgRes = await request(`/admin/subtests/${topics[0].slug}/packages`, other.cookie, {
    name: testPkgName,
    description: "Deskripsi paket uji coba",
    order: 99,
  });
  assert.equal(pkgRes.status, 201);
  const testPkg = await pkgRes.json();
  packageIds.push(testPkg.id);
  assert.equal(testPkg.name, testPkgName);
  assert.equal(testPkg.order, 99);

  // Duplicate name in same topic is rejected with 409 Conflict
  const dupPkgRes = await request(`/admin/subtests/${topics[0].slug}/packages`, other.cookie, {
    name: testPkgName,
  });
  assert.equal(dupPkgRes.status, 409);

  // 3. Admin creates another package on a different topic
  const testPkg2Name = `Paket Subtes 2 ${crypto.randomUUID().slice(0, 8)}`;
  const pkgResTopic1 = await request(`/admin/subtests/${topics[1].slug}/packages`, other.cookie, {
    name: testPkg2Name,
    order: 1,
  });
  assert.equal(pkgResTopic1.status, 201);
  const testPkgTopic1 = await pkgResTopic1.json();
  packageIds.push(testPkgTopic1.id);
  const importName = `Paket impor ${crypto.randomUUID()}`;
  const namedImport = await request("/admin/questions/import", other.cookie, {
    groups: [{ ...batch.groups[0], packageName: importName }],
  });
  assert.equal(namedImport.status, 201);
  const namedResult = await namedImport.json();
  assert.equal(namedResult.packages[0].name, importName);
  const importedPackageId = namedResult.packages[0].id;
  packageIds.push(importedPackageId);
  const existingImport = await request("/admin/questions/import", other.cookie, {
    groups: [
      { ...batch.groups[0], packageId: importedPackageId },
      { ...batch.groups[0], packageName: importName },
    ],
  });
  assert.equal(existingImport.status, 201);
  const existingResult = await existingImport.json();
  assert.equal(existingResult.packages.length, 1);
  assert.equal(existingResult.packages[0].id, importedPackageId);
  assert.equal(existingResult.packages[0].count, 4);
  const importedPackageQuestions = await getDb()
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.packageId, importedPackageId));
  questionIds.push(...importedPackageQuestions.map((row) => row.id));
  assert.equal(importedPackageQuestions.length, 6);
  const rollbackName = `Rollback ${crypto.randomUUID()}`;
  const badDestination = await request("/admin/questions/import", other.cookie, {
    groups: [
      { ...batch.groups[0], packageName: rollbackName },
      { ...batch.groups[0], packageId: testPkgTopic1.id },
    ],
  });
  assert.equal(badDestination.status, 400);
  assert.equal(
    (await getDb().select().from(questionPackages).where(eq(questionPackages.name, rollbackName)))
      .length,
    0,
  );
  assert.equal(
    (await getDb().select().from(questions).where(eq(questions.packageId, importedPackageId)))
      .length,
    6,
  );
  assert.equal(
    (await request("/admin/questions/import", other.cookie, { padding: "é".repeat(100_000) }))
      .status,
    413,
  );

  // 4. Admin creates a question inside testPkg
  const qInPkgRes = await request("/admin/questions", other.cookie, {
    topicId: topics[0].id,
    packageId: testPkg.id,
    prompt: "Soal dalam paket uji coba $y=2x$",
    options: ["A", "B", "C", "D", "E"],
    correctAnswer: 0,
    explanation: "Penjelasan soal paket uji coba.",
    source: "Dummy paket",
    category: "Aljabar",
  });
  assert.equal(qInPkgRes.status, 201);
  const qInPkg = await qInPkgRes.json();
  questionIds.push(qInPkg.id);
  assert.equal(qInPkg.packageId, testPkg.id);

  // 5. Cross-subtest rejection: cannot create question with package from different topic (400)
  const crossSubtestCreate = await request("/admin/questions", other.cookie, {
    topicId: topics[0].id,
    packageId: testPkgTopic1.id, // belongs to topics[1]!
    prompt: "Soal silang subtes",
    options: ["A", "B", "C", "D", "E"],
    correctAnswer: 0,
    explanation: "Penjelasan.",
    source: "Dummy",
  });
  assert.equal(crossSubtestCreate.status, 400);

  // 6. Cross-subtest rejection on question package assignment / move (400)
  const crossAssign = await request(`/admin/packages/${testPkgTopic1.id}/questions`, other.cookie, {
    questionId: qInPkg.id,
  });
  assert.equal(crossAssign.status, 400);

  const crossMove = await request(
    `/admin/questions/${qInPkg.id}/package`,
    other.cookie,
    {
      packageId: testPkgTopic1.id,
    },
    "PUT",
  );
  assert.equal(crossMove.status, 400);

  // 7. Safe package deletion: cannot delete package that contains questions (409 Conflict)
  const deleteConflict = await request(
    `/admin/packages/${testPkg.id}`,
    other.cookie,
    undefined,
    "DELETE",
  );
  assert.equal(deleteConflict.status, 409);

  // 8. Learner fetches active packages for subtest
  const learnerPackagesRes = await request(
    `/learner/topics/${topics[0].slug}/packages`,
    learner.cookie,
  );
  assert.equal(learnerPackagesRes.status, 200);
  const learnerPackages = await learnerPackagesRes.json();
  assert.ok(learnerPackages.some((p: { id: string }) => p.id === testPkg.id));

  // 9. Learner fetches practice by package
  const pkgPracticeRes = await request(
    `/learner/practice/${topics[0].slug}/${testPkg.id}`,
    learner.cookie,
  );
  assert.equal(pkgPracticeRes.status, 200);
  const pkgPractice = await pkgPracticeRes.json();
  assert.equal(pkgPractice.packageId, testPkg.id);
  assert.equal(pkgPractice.packageName, testPkgName);
  assert.equal(pkgPractice.items.length, 1);
  assert.equal(pkgPractice.items[0].id, qInPkg.id);

  // 10. Learner cannot submit questions from outside the package to a package attempt (400)
  const crossPkgSubmit = await request(
    `/learner/practice/${topics[0].slug}/${testPkg.id}`,
    learner.cookie,
    {
      answers: {
        [qInPkg.id]: 0,
        [practice.items[0].id]: 1, // belongs to Paket 1, not testPkg!
      },
    },
  );
  assert.equal(crossPkgSubmit.status, 400);

  // 11. Learner submits attempt for testPkg
  const pkgSubmit = await request(
    `/learner/practice/${topics[0].slug}/${testPkg.id}`,
    learner.cookie,
    {
      answers: { [qInPkg.id]: 0 },
    },
  );
  assert.equal(pkgSubmit.status, 201);
  const pkgAttempt = await pkgSubmit.json();
  assert.equal(pkgAttempt.packageId, testPkg.id);

  // 12. Learner views result: result contains packageName and packageId
  const pkgResult = await (
    await request(`/learner/results/${pkgAttempt.id}`, learner.cookie)
  ).json();
  assert.equal(pkgResult.attempt.packageId, testPkg.id);
  assert.equal(pkgResult.attempt.packageName, testPkgName);

  // 13. History includes packageName
  const updatedHistory = await (await request("/learner/history", learner.cookie)).json();
  const histItem = updatedHistory.find((h: { id: string }) => h.id === pkgAttempt.id);
  assert.ok(histItem);
  assert.equal(histItem.packageName, testPkgName);

  // 14. Question in pkg can be deleted even if it has usage from attempt (cascade clean)
  assert.equal(
    (await request(`/admin/questions/${qInPkg.id}`, other.cookie, undefined, "DELETE")).status,
    200,
  );

  assert.equal((await request("/auth/sign-out", learner.cookie, {})).status, 200);
  assert.equal((await request("/learner/topics", learner.cookie)).status, 401);
  console.info(
    "API integration: auth, roles, key secrecy, ownership, submission, admin edit/delete, atomic import, packages, logout PASSED.",
  );
} finally {
  if (tryoutSessionIds.length)
    await getDb().delete(tryoutSessions).where(inArray(tryoutSessions.id, tryoutSessionIds));
  if (users.length) await getDb().delete(user).where(inArray(user.id, users));
  if (questionIds.length)
    await getDb()
      .delete(questionRevisions)
      .where(inArray(questionRevisions.questionId, questionIds));
  if (questionIds.length) await getDb().delete(questions).where(inArray(questions.id, questionIds));
  if (packageIds.length)
    await getDb().delete(questionPackages).where(inArray(questionPackages.id, packageIds));
}
