import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { user } from "../src/lib/db/auth-schema";
import {
  questions,
  questionPackages,
  questionRevisions,
  tryoutResponses,
  tryoutSessions,
  irtCalibrations,
  irtDatasets,
} from "../src/lib/db/schema";
import { utbkSubtests, type AdminTryoutDetail, type IrtDatasetItem } from "@latveria/shared";
type Request = (
  path: string,
  cookie?: string,
  body?: unknown,
  method?: string,
) => Promise<Response>;
export async function verifyIrt(
  request: Request,
  adminCookie: string,
  learner: { cookie: string; id: string },
  signup: () => Promise<{ cookie: string; id: string }>,
) {
  const db = getDb();
  const qIds: string[] = [];
  const people: string[] = [];
  let datasetId = "";
  let modelId = "";
  const created = await request("/admin/tryouts", adminCookie, {
    name: `IRT QA ${crypto.randomUUID()}`,
  });
  assert.equal(created.status, 201);
  const pkg: AdminTryoutDetail = await created.json();
  try {
    const groups = utbkSubtests.map((s, index) => ({
      subtes: s.slug,
      category: "QA",
      questions: Array.from({ length: index === 0 ? 10 : 1 }, (_, n) => ({
        prompt: `QA ${s.short} ${n}`,
        options: ["one", "two", "three", "four", "five"],
        correctAnswer: 0,
        explanation: "QA explanation",
        source: "QA",
      })),
    }));
    assert.equal(
      (await request(`/admin/tryouts/${pkg.id}/import`, adminCookie, { groups })).status,
      201,
    );
    const detail: AdminTryoutDetail = await (
      await request(`/admin/tryouts/${pkg.id}`, adminCookie)
    ).json();
    qIds.push(...detail.sections.flatMap((s) => s.questions.map((q) => q.id)));
    assert.equal(
      (
        await request(`/admin/tryouts/${pkg.id}/import`, adminCookie, {
          groups: [groups[0], { ...groups[1], subtes: "not-a-subtest" }],
        })
      ).status,
      400,
    );
    const withBrokenSource = {
      ...groups[5],
      questions: groups[5].questions.map((q) => ({ ...q, passageId: crypto.randomUUID() })),
    };
    assert.equal(
      (
        await request(`/admin/tryouts/${pkg.id}/import`, adminCookie, {
          groups: [groups[0], withBrokenSource],
        })
      ).status,
      400,
    );
    assert.equal(
      (await (await request(`/admin/tryouts/${pkg.id}`, adminCookie)).json()).questionCount,
      16,
    );
    assert.equal(
      (await request(`/admin/tryouts/${pkg.id}`, adminCookie, { published: true }, "PUT")).status,
      200,
    );
    const initial = await (
      await request(`/learner/tryouts/start/${pkg.id}`, learner.cookie, {})
    ).json();
    const [stored] = await db
      .select()
      .from(tryoutSessions)
      .where(eq(tryoutSessions.id, initial.id));
    const first = detail.sections[0];
    const topic = utbkSubtests[0];
    const topicId = JSON.parse(stored.subtestConfig)[0].id as string;
    const revisions = first.questions.map((q) => stored.revisionSets[q.id]);
    assert.equal(
      (
        await request("/admin/irt/datasets", adminCookie, {
          topicSlug: topic.slug,
          revisionIds: revisions,
        })
      ).status,
      409,
    );
    // Synthetic cohort is confined to this fixture and removed in finally.
    const cohort = Array.from({ length: 201 }, (_, index) => ({
      id: crypto.randomUUID(),
      email: `irt-${crypto.randomUUID()}@example.test`,
      name: `IRT fixture ${index}`,
      isDemo: index === 200,
    }));
    people.push(...cohort.map((p) => p.id));
    await db.insert(user).values(cohort);
    const sessions = await db
      .insert(tryoutSessions)
      .values(
        cohort.map((p) => ({
          userId: p.id,
          packageId: pkg.id,
          state: "completed",
          completedAt: new Date(),
        })),
      )
      .returning();
    const responseRows = sessions.flatMap((session, index) =>
      first.questions.map((q, n) => ({
        sessionId: session.id,
        questionId: q.id,
        revisionId: stored.revisionSets[q.id],
        topicId,
        answer: 0,
        isAnswered: true,
        scoreFraction: (index + n) % 2,
        maxPoints: 1,
        timeSpentSeconds: 30,
        irtEligible: true,
      })),
    );
    for (let start = 0; start < responseRows.length; start += 500)
      await db.insert(tryoutResponses).values(responseRows.slice(start, start + 500));
    const [repeat, unfinished] = await db
      .insert(tryoutSessions)
      .values([
        { userId: cohort[0].id, packageId: pkg.id, state: "completed", completedAt: new Date() },
        { userId: cohort[1].id, packageId: pkg.id, state: "active" },
      ])
      .returning();
    await db.insert(tryoutResponses).values(
      [repeat, unfinished].flatMap((session) =>
        responseRows.slice(0, 10).map((row) => ({
          ...row,
          sessionId: session.id,
          scoreFraction: 1 - row.scoreFraction,
          submittedAt: new Date(Date.now() + 60000),
        })),
      ),
    );
    const exported = await request("/admin/irt/datasets", adminCookie, {
      topicSlug: topic.slug,
      revisionIds: revisions,
    });
    assert.equal(exported.status, 200);
    const dataset: {
      datasetId: string;
      datasetHash: string;
      sampleSize: number;
      items: IrtDatasetItem[];
    } = await exported.json();
    datasetId = dataset.datasetId;
    assert.equal(dataset.sampleSize, 200);
    assert.ok(
      dataset.items.every((item) => item.responseCount === 200 && item.correctRate === 0.5),
    );
    const artifact = {
      datasetId,
      datasetHash: dataset.datasetHash,
      version: `fixture-${crypto.randomUUID()}`,
      model: "2PL",
      source: "mirt",
      sourceVersion: "reference-fixture",
      parameters: revisions.map((revisionId) => ({ revisionId, a: 1, b: 0 })),
      diagnostics: { converged: true, rmsea: 0.01, reliability: 0.8 },
    };
    assert.equal((await request("/admin/irt/calibrations", learner.cookie, artifact)).status, 403);
    assert.equal(
      (
        await request("/admin/irt/calibrations", adminCookie, {
          ...artifact,
          diagnostics: { ...artifact.diagnostics, converged: false },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/admin/irt/calibrations", adminCookie, {
          ...artifact,
          datasetHash: "0".repeat(64),
        })
      ).status,
      400,
    );
    const imported = await request("/admin/irt/calibrations", adminCookie, artifact);
    assert.equal(imported.status, 201);
    const model = await imported.json();
    modelId = model.id;
    assert.equal(model.active, false);
    await request(
      `/admin/irt/calibrations/${modelId}/activation`,
      adminCookie,
      { active: true },
      "PUT",
    );
    const nextLearner = await signup();
    assert.deepEqual(
      await (await request("/learner/tryouts/history", nextLearner.cookie)).json(),
      [],
    );
    const calibrated = await (
      await request(`/learner/tryouts/start/${pkg.id}`, nextLearner.cookie, {})
    ).json();
    await request(
      `/admin/irt/calibrations/${modelId}/activation`,
      adminCookie,
      { active: false },
      "PUT",
    );
    const answers = Object.fromEntries(first.questions.map((q) => [q.id, "A"]));
    const response = await request(
      `/learner/tryouts/${calibrated.id}/subtest-submit`,
      nextLearner.cookie,
      { answers, timeSpentByQuestion: {} },
    );
    assert.equal(response.status, 200);
    const scored = await response.json();
    assert.equal(scored.score.subtests[0].score, 1000);
    assert.equal(scored.score.subtests[0].irt.calibrationId, modelId);
    assert.ok(Number.isFinite(scored.score.subtests[0].irt.theta));
    const old = await request(`/learner/tryouts/${initial.id}/subtest-submit`, learner.cookie, {
      answers,
      timeSpentByQuestion: {},
    });
    assert.equal(old.status, 200);
    assert.equal((await old.json()).score.subtests[0].irt, null);
    await db
      .update(questions)
      .set({ correctAnswer: 4 })
      .where(eq(questions.id, first.questions[0].id));
    await request(
      `/admin/irt/calibrations/${modelId}/activation`,
      adminCookie,
      { active: true },
      "PUT",
    );
    const changedLearner = await signup();
    const changed = await (
      await request(`/learner/tryouts/start/${pkg.id}`, changedLearner.cookie, {})
    ).json();
    const changedScore = await (
      await request(`/learner/tryouts/${changed.id}/subtest-submit`, changedLearner.cookie, {
        answers,
        timeSpentByQuestion: {},
      })
    ).json();
    assert.equal(changedScore.score.subtests[0].irtStatus, "missing-items");
    assert.equal(changedScore.score.subtests[0].irt, null);
    console.info(
      "IRT integration: first-exposure dataset, demo exclusion, provenance gates, activation snapshots and revision mismatch PASSED.",
    );
  } finally {
    if (modelId) await db.delete(irtCalibrations).where(eq(irtCalibrations.id, modelId));
    if (datasetId) await db.delete(irtDatasets).where(eq(irtDatasets.id, datasetId));
    await db.delete(tryoutSessions).where(eq(tryoutSessions.packageId, pkg.id));
    if (people.length) await db.delete(user).where(inArray(user.id, people));
    if (qIds.length) {
      await db.delete(questionRevisions).where(inArray(questionRevisions.questionId, qIds));
      await db.delete(questions).where(inArray(questions.id, qIds));
    }
    await db.delete(questionPackages).where(eq(questionPackages.id, pkg.id));
  }
}
