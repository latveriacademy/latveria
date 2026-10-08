import assert from "node:assert/strict";
import { inArray, eq } from "drizzle-orm";
import { app } from "../src/app";
import { getDb } from "../src/lib/db";
import { user } from "../src/lib/db/auth-schema";
import { questionPackages, questions } from "../src/lib/db/schema";
import { invalidateCatalogCache } from "../src/services/topic.service";

export async function verifyPassage() {
  if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname))
    throw new Error("Verifikasi passage hanya untuk DB lokal.");
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
      name: "Passage Tester",
      email: `passage-${crypto.randomUUID()}@example.test`,
      password: `Test-${crypto.randomUUID()}!`,
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    users.push(data.user.id);
    return {
      id: data.user.id,
      cookie: res.headers
        .getSetCookie()
        .map((v) => v.split(";")[0])
        .join("; "),
    };
  };

  try {
    const admin = await signup();
    const learner = await signup();
    await getDb()
      .update(user)
      .set({ role: "admin" })
      .where(inArray(user.id, [admin.id]));

    const topics = await (await request("/admin/topics", admin.cookie)).json();
    const pu = topics.find((t: { slug: string }) => t.slug === "penalaran-umum") || topics[0];

    const pkgRes = await request(`/admin/subtests/${pu.id}/packages`, admin.cookie, {
      name: `Paket Wacana ${crypto.randomUUID().slice(0, 8)}`,
      targetQuestions: 2,
    });
    assert.equal(pkgRes.status, 201);
    const pkg = await pkgRes.json();
    packageIds.push(pkg.id);

    // 1. Create Question 1 with a rich passage
    const passageText =
      "Ekosistem terumbu karang tropis mengalami pemutihan massal akibat kenaikan suhu laut global.";
    const q1Res = await request("/admin/questions", admin.cookie, {
      topicId: pu.id,
      packageId: pkg.id,
      prompt: "Berdasarkan wacana di atas, apa penyebab utama pemutihan karang?",
      passage: passageText,
      options: [
        "Kenaikan suhu laut global",
        "Polusi plastik",
        "Penangkapan ikan",
        "Gelombang tsunami",
        "Kurangnya nutrisi laut",
      ],
      correctAnswer: 0,
      explanation: "Disebutkan eksplisit: pemutihan massal akibat kenaikan suhu laut global.",
      source: "Arsip Sains 2026",
    });
    assert.equal(q1Res.status, 201);
    const q1 = await q1Res.json();
    questionIds.push(q1.id);

    // 2. Create Question 2 reusing Question 1's passage via passageId
    const q2Res = await request("/admin/questions", admin.cookie, {
      topicId: pu.id,
      packageId: pkg.id,
      prompt: "Kata 'massal' dalam wacana memiliki arti paling dekat dengan...",
      passageId: q1.id,
      options: [
        "Serentak dan menyeluruh",
        "Sangat lambat",
        "Hanya sementara",
        "Tidak menentu",
        "Terbatas pada wilayah tertentu",
      ],
      correctAnswer: 0,
      explanation:
        "Massal berarti melibatkan jumlah atau cakupan yang sangat besar secara serentak.",
      source: "Arsip Sains 2026",
    });
    assert.equal(q2Res.status, 201);
    const q2 = await q2Res.json();
    questionIds.push(q2.id);

    // 3. GET Question 2 detail resolves the shared passage
    const q2Detail = await (await request(`/admin/questions/${q2.id}`, admin.cookie)).json();
    assert.equal(q2Detail.passage, passageText);
    assert.equal(q2Detail.passageId, q1.id);
    const edit = { ...q2Detail, annotations: [] };
    assert.equal(
      (await request(`/admin/questions/${q2.id}`, admin.cookie, edit, "PUT")).status,
      200,
    );
    const [stored] = await getDb().select().from(questions).where(eq(questions.id, q2.id));
    assert.equal(stored.passage, null);
    assert.equal(
      (
        await request(
          `/admin/questions/${q2.id}`,
          admin.cookie,
          { ...edit, passageId: q2.id },
          "PUT",
        )
      ).status,
      400,
    );
    assert.equal(
      (await request(`/admin/questions/${q1.id}`, admin.cookie, undefined, "DELETE")).status,
      409,
    );
    assert.equal(
      (await request("/admin/questions/bulk-delete", admin.cookie, { ids: [q1.id] })).status,
      409,
    );

    // 4. Learner practice receives the passage on both questions
    const practiceRes = await request(`/learner/practice/${pu.slug}/${pkg.id}`, learner.cookie);
    assert.equal(practiceRes.status, 200);
    const practiceData = await practiceRes.json();
    assert.equal(practiceData.items.length, 2);
    const pQ1 = practiceData.items.find((item: { id: string }) => item.id === q1.id);
    const pQ2 = practiceData.items.find((item: { id: string }) => item.id === q2.id);
    assert.equal(pQ1.passage, passageText);
    assert.equal(pQ2.passage, passageText);

    // 5. Bank search matches against passage content
    const searchRes = await request(`/admin/questions?cari=terumbu%20karang`, admin.cookie);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(searchData.rows.some((r: { id: string }) => r.id === q1.id));
    const source = await (await request(`/admin/questions/${q1.id}`, admin.cookie)).json();
    const updatedPassage = `${passageText} Perubahan sumber.`;
    assert.equal(
      (
        await request(
          `/admin/questions/${q1.id}`,
          admin.cookie,
          { ...source, passage: updatedPassage },
          "PUT",
        )
      ).status,
      200,
    );
    assert.equal(
      (await (await request(`/admin/questions/${q2.id}`, admin.cookie)).json()).passage,
      updatedPassage,
    );
    const cloned = await request(`/admin/packages/${pkg.id}/duplicate`, admin.cookie, {});
    assert.equal(cloned.status, 201);
    const copy = await cloned.json();
    packageIds.push(copy.id);
    const copiedQuestions = await getDb()
      .select()
      .from(questions)
      .where(eq(questions.packageId, copy.id));
    questionIds.push(...copiedQuestions.map((q) => q.id));
    assert.equal(copiedQuestions.length, 2);
    const copiedSource = copiedQuestions.find((q) => q.passage)!;
    assert.equal(copiedSource.passage, updatedPassage);
    assert.equal(copiedQuestions.find((q) => q.passageId)!.passageId, copiedSource.id);

    console.info(
      "Passage integration: creation, reusable linking, resolution, learner view, and search PASSED.",
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
