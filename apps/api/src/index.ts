import { serveStatic } from "hono/bun";
import { app } from "./app";

// Jaga proses tetap hidup jika ada unhandled rejection (mis. Supabase statement timeout)
process.on("unhandledRejection", (reason) => {
  console.error("[API] Unhandled rejection (proses tetap berjalan):", reason);
});

if (process.env.NODE_ENV === "production") {
  app.get("/api/*", (c) => c.json({ error: "Endpoint tidak ditemukan." }, 404));
  if (process.env.SERVE_WEB !== "false") {
    const webRoot = `${import.meta.dir}/../../web/dist`;
    app.use("/*", serveStatic({ root: webRoot }));
    app.get("/assets/*", (c) => c.notFound());
    app.get("*", serveStatic({ root: webRoot, path: "index.html" }));
  }
}
const port = Number(process.env.PORT ?? (process.env.NODE_ENV === "production" ? 3000 : 3001));
const server = Bun.serve({ fetch: app.fetch, port });
console.info(`Latveria API listening on http://localhost:${server.port}`);
