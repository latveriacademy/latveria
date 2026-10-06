import assert from "node:assert/strict";
import { inArray } from "drizzle-orm";
import { app } from "../src/app";
import { getDb } from "../src/lib/db";
import { user } from "../src/lib/db/auth-schema";

export async function verifyAvatar() {
  if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname))
    throw new Error("Verifikasi avatar hanya untuk DB lokal.");
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  const users: string[] = [];

  const signup = async () => {
    const res = await app.request(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Avatar tester",
        email: `avatar-${crypto.randomUUID()}@example.test`,
        password: `Test-${crypto.randomUUID()}!`,
      }),
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
    const learner = await signup();

    // 1. Unauthenticated upload rejected
    const unauth = await app.request(`${origin}/api/learner/profile/avatar`, {
      method: "POST",
      headers: { Origin: origin },
      body: new FormData(),
    });
    assert.equal(unauth.status, 401);

    // 2. Reject invalid files
    const tooSmall = new FormData();
    tooSmall.append("avatar", new File([new Uint8Array(100)], "small.png", { type: "image/png" }));
    const smallRes = await app.request(`${origin}/api/learner/profile/avatar`, {
      method: "POST",
      headers: { Origin: origin, Cookie: learner.cookie },
      body: tooSmall,
    });
    assert.equal(smallRes.status, 400);

    const wrongType = new FormData();
    wrongType.append(
      "avatar",
      new File([new Uint8Array(6000)], "doc.pdf", { type: "application/pdf" }),
    );
    const wrongTypeRes = await app.request(`${origin}/api/learner/profile/avatar`, {
      method: "POST",
      headers: { Origin: origin, Cookie: learner.cookie },
      body: wrongType,
    });
    assert.equal(wrongTypeRes.status, 400);

    // 3. Valid upload (6 KB WebP image)
    const validBytes = new Uint8Array(6144);
    validBytes.fill(42);
    const validForm = new FormData();
    validForm.append("avatar", new File([validBytes], "avatar.webp", { type: "image/webp" }));
    const uploadRes = await app.request(`${origin}/api/learner/profile/avatar`, {
      method: "POST",
      headers: { Origin: origin, Cookie: learner.cookie },
      body: validForm,
    });
    assert.equal(uploadRes.status, 200);
    const uploadData = await uploadRes.json();
    assert.ok(uploadData.image);
    assert.match(uploadData.image, /\/api\/avatar\/avatar-[a-zA-Z0-9_-]+\.webp$/);

    // 4. GET /learner/profile reflects the uploaded image
    const profileRes = await app.request(`${origin}/api/learner/profile`, {
      headers: { Origin: origin, Cookie: learner.cookie },
    });
    assert.equal(profileRes.status, 200);
    const profile = await profileRes.json();
    assert.equal(profile.image, uploadData.image);

    // 5. Public GET /api/avatar/:key returns the file stream without auth
    const key = uploadData.image.split("/").pop();
    const publicRes = await app.request(`${origin}/api/avatar/${key}`);
    assert.equal(publicRes.status, 200);
    assert.equal(publicRes.headers.get("content-type"), "image/webp");
    const downloaded = await publicRes.bytes();
    assert.equal(downloaded.length, 6144);

    // 6. Replacing avatar deletes old one and serves new one
    const newBytes = new Uint8Array(7000);
    newBytes.fill(99);
    const replaceForm = new FormData();
    replaceForm.append("avatar", new File([newBytes], "new-avatar.png", { type: "image/png" }));
    const replaceRes = await app.request(`${origin}/api/learner/profile/avatar`, {
      method: "POST",
      headers: { Origin: origin, Cookie: learner.cookie },
      body: replaceForm,
    });
    assert.equal(replaceRes.status, 200);
    const replaceData = await replaceRes.json();
    assert.notEqual(replaceData.image, uploadData.image);

    // Old key is gone (404)
    const oldPublicRes = await app.request(`${origin}/api/avatar/${key}`);
    assert.equal(oldPublicRes.status, 404);

    // New key is available
    const newKey = replaceData.image.split("/").pop();
    const newPublicRes = await app.request(`${origin}/api/avatar/${newKey}`);
    assert.equal(newPublicRes.status, 200);
    assert.equal(newPublicRes.headers.get("content-type"), "image/png");

    // 7. Delete avatar cleans up storage and sets profile image to null
    const delRes = await app.request(`${origin}/api/learner/profile/avatar`, {
      method: "DELETE",
      headers: { Origin: origin, Cookie: learner.cookie },
    });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.image, null);

    const deletedPublicRes = await app.request(`${origin}/api/avatar/${newKey}`);
    assert.equal(deletedPublicRes.status, 404);

    const afterDelProfile = await (
      await app.request(`${origin}/api/learner/profile`, {
        headers: { Origin: origin, Cookie: learner.cookie },
      })
    ).json();
    assert.equal(afterDelProfile.image, null);

    console.info(
      "Avatar storage integration: validation, upload, S3 stream, replacement, and deletion PASSED.",
    );
  } finally {
    if (users.length) {
      await getDb().delete(user).where(inArray(user.id, users));
    }
  }
}
