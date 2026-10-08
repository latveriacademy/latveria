import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { app } from "../src/app";
import { getDb } from "../src/lib/db";
import { user, session } from "../src/lib/db/auth-schema";

if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Verifikasi admin hanya untuk DB lokal.");
const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
const ids: string[] = [];
const request = (path: string, cookie = "", body?: unknown, method = body ? "POST" : "GET") =>
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
  console.info("Verifikasi kontrol akun admin berhasil.");
} finally {
  if (ids.length) await getDb().delete(user).where(inArray(user.id, ids));
}
