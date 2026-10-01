import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { app } from "./app";

// Jaga proses tetap hidup jika ada unhandled rejection (mis. Supabase statement timeout)
process.on("unhandledRejection", (reason) => {
  console.error("[API] Unhandled rejection (proses tetap berjalan):", reason);
});


if (process.env.NODE_ENV === "production") {
  app.get("/api/*", (c) => c.json({ error: "Endpoint tidak ditemukan." }, 404));
  app.use("/*", serveStatic({ root: "../web/dist" }));
  app.get("*", serveStatic({ path: "../web/dist/index.html" }));
}
const port = Number(process.env.PORT ?? (process.env.NODE_ENV === "production" ? 3000 : 3001));
serve({ fetch: app.fetch, port }, () => console.info(`Latveria API listening on http://localhost:${port}`));
