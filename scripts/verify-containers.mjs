import assert from "node:assert/strict";

const origin = new URL(process.env.SMOKE_URL ?? "http://127.0.0.1:8080").origin;
const get = (path) => fetch(`${origin}${path}`, { signal: AbortSignal.timeout(10_000) });
const landing = await get("/");
assert.equal(landing.status, 200);
const html = await landing.text();
assert.match(html, /<div id="root"><\/div>/);
const asset = html.match(/src="(\/assets\/[^" ]+\.js)"/)?.[1];
assert.ok(asset, "HTML harus memuat bundle frontend.");
const bundle = await get(asset);
assert.equal(bundle.status, 200);
assert.match(bundle.headers.get("content-type"), /javascript/);
assert.match(bundle.headers.get("cache-control"), /immutable/);
const deepLink = await get("/dashboard/riwayat");
assert.equal(deepLink.status, 200);
assert.equal(await deepLink.text(), html, "Deep link harus memakai fallback SPA.");
assert.equal((await get("/assets/missing.js")).status, 404);
const health = await get("/api/health");
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: "ok" });
assert.equal((await get("/api/learner/profile")).status, 401);
const missingApi = await get("/api/missing");
assert.equal(missingApi.status, 401);
assert.match(missingApi.headers.get("content-type"), /application\/json/);
const signup = await fetch(`${origin}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Container check",
    email: "container-check@example.test",
    password: "Container-check-password!",
  }),
  signal: AbortSignal.timeout(10_000),
});
assert.equal(signup.status, 400);
assert.equal(
  (await signup.json()).code,
  "EMAIL_PASSWORD_SIGN_UP_DISABLED",
  "Signup harus ditutup di produksi.",
);
// This function plot requires real TeX compilation, not the native bar-chart fallback.
const diagram = await fetch(`${origin}/api/latex/render`, {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({
    source: String.raw`\begin{tikzpicture}\begin{axis}\addplot[domain=-3:3,samples=50] {x^2};\end{axis}\end{tikzpicture}`,
  }),
  signal: AbortSignal.timeout(30_000),
});
assert.equal(
  diagram.status,
  200,
  "Worker harus mengompilasi diagram yang tidak didukung renderer native.",
);
const rendered = await diagram.json();
assert.match(rendered.svg, /<svg\b/);
assert.doesNotMatch(rendered.svg, /latex-(?:placeholder|fallback)-svg/);
console.info(
  "Smoke test container: SPA, asset, proxy API, autentikasi, signup produksi, dan kompilasi TeX nyata lolos.",
);
