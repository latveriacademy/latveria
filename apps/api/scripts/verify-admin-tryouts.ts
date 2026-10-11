import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import {
  questionPackages,
  questions,
  tryoutSessions,
  questionRevisions,
} from "../src/lib/db/schema";
import type { AdminTryoutDetail } from "@latveria/shared";

type Request = (
  path: string,
  cookie?: string,
  body?: unknown,
  method?: string,
) => Promise<Response>;
export async function verifyAdminTryouts(
  request: Request,
  adminCookie: string,
  learnerCookie: string,
  learnerId: string,
) {
  const questionIds: string[] = [];
  const response = await request("/admin/tryouts", adminCookie, {
    name: `QA Tryout ${crypto.randomUUID()}`,
    targetYear: 2027,
  });
  assert.equal(response.status, 201);
  const pkg: AdminTryoutDetail = await response.json();
  try {
    assert.equal(pkg.targetYear, 2027);
    assert.equal(pkg.published, false);
    assert.equal(
      (await request(`/admin/tryouts/${pkg.id}`, adminCookie, { published: true }, "PUT")).status,
      409,
    );
    for (const section of pkg.sections) {
      const imported = await request(`/admin/tryouts/sections/${section.id}/import`, adminCookie, {
        questions: [
          {
            type: "single_choice",
            prompt: `QA ${section.subtestCode}`,
            options: ["one", "two", "three", "four", "five"],
            correctAnswer: 0,
            explanation: "QA explanation",
          },
        ],
      });
      assert.equal(imported.status, 200);
      const detail: AdminTryoutDetail = await (
        await request(`/admin/tryouts/${pkg.id}`, adminCookie)
      ).json();
      questionIds.push(
        ...detail.sections
          .find((s) => s.id === section.id)!
          .questions.map((q) => q.id)
          .filter((id) => !questionIds.includes(id)),
      );
    }
    const section = pkg.sections[0];
    const sectionDetail = await (
      await request(`/admin/tryouts/${pkg.id}/sections/${section.id}`, adminCookie)
    ).json();
    assert.equal(sectionDetail.section.questions.length, 1);
    const qToEdit = sectionDetail.section.questions[0];
    const editPayload = {
      type: "single_choice",
      prompt: "Edited Tryout Prompt with Passage Ref",
      options: ["one", "two", "three", "four", "five"],
      correctAnswer: 0,
      explanation: "Edited explanation",
      source: "Edited Source",
    };
    const editRes = await request(
      `/admin/tryouts/${pkg.id}/sections/${section.id}/questions/${qToEdit.id}`,
      adminCookie,
      editPayload,
      "PUT",
    );
    assert.equal(editRes.status, 200);
    const updatedSection = await (
      await request(`/admin/tryouts/${pkg.id}/sections/${section.id}`, adminCookie)
    ).json();
    assert.equal(updatedSection.section.questions[0].prompt, editPayload.prompt);
    assert.equal(updatedSection.section.questions[0].correctAnswer, 0);
    assert.equal(
      (
        await request(
          `/admin/tryouts/sections/${section.id}`,
          adminCookie,
          { durationSeconds: -60 },
          "PUT",
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          `/admin/tryouts/sections/${section.id}`,
          adminCookie,
          { durationSeconds: 600 },
          "PUT",
        )
      ).status,
      200,
    );
    assert.equal(
      (await request(`/admin/tryouts/${pkg.id}`, adminCookie, { published: true }, "PUT")).status,
      200,
    );
    const started = await request(`/learner/tryouts/start/${pkg.id}`, learnerCookie, {});
    assert.equal(started.status, 201);
    const session = await started.json();
    const state = await (await request(`/learner/tryouts/${session.id}`, learnerCookie)).json();
    assert.equal(state.questions.length, 1);
    assert.equal(state.questions[0].id, questionIds[0]);
    assert.ok(!("correctAnswer" in state.questions[0]));
    assert.ok(!("scoringPlan" in state.session));
    assert.ok(!("revisionSets" in state.session));
    await getDb()
      .update(questions)
      .set({ prompt: "Edited after start", correctAnswer: 4 })
      .where(eq(questions.id, questionIds[0]));
    const frozen = await (await request(`/learner/tryouts/${session.id}`, learnerCookie)).json();
    assert.equal(frozen.questions[0].prompt, state.questions[0].prompt);
    assert.ok(state.session.secondsRemaining <= 600 && state.session.secondsRemaining > 590);
    await request(
      `/admin/tryouts/sections/${section.id}`,
      adminCookie,
      { durationSeconds: 1200 },
      "PUT",
    );
    const unchanged = await (await request(`/learner/tryouts/${session.id}`, learnerCookie)).json();
    assert.ok(unchanged.session.secondsRemaining <= 600);
    assert.equal(
      (await request(`/admin/tryouts/${pkg.id}`, adminCookie, undefined, "DELETE")).status,
      409,
    );
    assert.equal(
      (await request(`/admin/packages/${pkg.id}`, adminCookie, undefined, "DELETE")).status,
      409,
    );
    for (let index = 0; index < 7; index++) {
      const submitted = await request(
        `/learner/tryouts/${session.id}/subtest-submit`,
        learnerCookie,
        { answers: index === 0 ? { [questionIds[0]]: "0" } : {}, timeSpentByQuestion: {} },
      );
      assert.equal(submitted.status, 200);
      if (index < 6)
        assert.equal(
          (await request(`/learner/tryouts/${session.id}/advance`, learnerCookie, {})).status,
          200,
        );
      if (index === 0) {
        const autosaved = await request(`/learner/tryouts/${session.id}/autosave`, learnerCookie, {
          answers: { [questionIds[0]]: "4" },
          flags: {},
          questionTimes: {},
          currentQuestionIndex: 0,
        });
        assert.equal(autosaved.status, 200);
        const preserved = await (
          await request(`/learner/tryouts/${session.id}`, learnerCookie)
        ).json();
        assert.equal(preserved.session.answers[questionIds[0]], "0");
      }
    }
    assert.equal(
      (await request(`/admin/tryouts/${pkg.id}`, adminCookie, undefined, "DELETE")).status,
      409,
    );
    const completed = await (await request(`/learner/tryouts/${session.id}`, learnerCookie)).json();
    assert.equal(completed.score.score, 143);
    assert.equal(completed.score.correctCount, 1);
    assert.equal(completed.score.unansweredCount, 6);
    assert.equal(completed.score.subtests[0].score, 1000);
    assert.equal(completed.score.irtScore, null);
    await getDb()
      .update(tryoutSessions)
      .set({ answers: JSON.stringify({ [questionIds[0]]: "4" }) })
      .where(eq(tryoutSessions.id, session.id));
    const restored = await (await request(`/learner/tryouts/${session.id}`, learnerCookie)).json();
    assert.equal(restored.session.answers[questionIds[0]], "0");
    const history = await (await request("/learner/tryouts/history", learnerCookie)).json();
    assert.ok(history.some((row: { id: string }) => row.id === session.id));
    const historyRow = history.find((row: { id: string }) => row.id === session.id);
    assert.equal(historyRow.packageId, pkg.id);
    assert.equal(historyRow.score, 143);
    assert.equal(historyRow.method, "simulation");
    assert.equal(historyRow.isCompleteUtbk, true);
    assert.ok(!("answers" in historyRow) && !("scoringPlan" in historyRow));
    assert.equal(
      (await request(`/admin/questions/${questionIds[0]}`, adminCookie, undefined, "DELETE"))
        .status,
      200,
    );
    const review = await (await request(`/learner/tryouts/${session.id}`, learnerCookie)).json();
    assert.deepEqual(review.score, completed.score);
    assert.equal(
      review.reviewQuestions.find((q: { id: string }) => q.id === questionIds[0]).correctAnswer,
      0,
    );
    assert.equal((await request(`/admin/users/${learnerId}/reset`, adminCookie, {})).status, 200);
    assert.equal(
      (await getDb().select().from(tryoutSessions).where(eq(tryoutSessions.userId, learnerId)))
        .length,
      0,
    );
    // Bulk remove questions from section
    const bulkRemoveRes = await request(
      `/admin/tryouts/sections/${section.id}/questions/bulk-delete`,
      adminCookie,
      { ids: [questionIds[0]] },
    );
    assert.equal(bulkRemoveRes.status, 200);
    const bulkRemoveData = await bulkRemoveRes.json();
    assert.equal(bulkRemoveData.count, 1);

    assert.equal(
      (
        await request(
          `/admin/tryouts/${pkg.id}/sections/${section.id}`,
          adminCookie,
          undefined,
          "DELETE",
        )
      ).status,
      200,
    );
    assert.equal(
      (await request(`/admin/tryouts/${pkg.id}`, adminCookie, undefined, "DELETE")).status,
      200,
    );
  } finally {
    await getDb().delete(tryoutSessions).where(eq(tryoutSessions.packageId, pkg.id));
    if (questionIds.length)
      await getDb()
        .delete(questionRevisions)
        .where(inArray(questionRevisions.questionId, questionIds));
    if (questionIds.length)
      await getDb().delete(questions).where(inArray(questions.id, questionIds));
    await getDb().delete(questionPackages).where(eq(questionPackages.id, pkg.id));
  }
}
