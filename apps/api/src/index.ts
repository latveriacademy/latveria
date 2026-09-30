import { serveStatic } from "hono/bun";
import { app } from "./app";

if (process.env.NODE_ENV === "production") {
  app.get("/api/*", (c) => c.json({ error: "Endpoint tidak ditemukan." }, 404));
  app.use("/*", serveStatic({ root: "../web/dist" }));
  app.get("*", serveStatic({ path: "../web/dist/index.html" }));
}

const port = Number(process.env.PORT ?? (process.env.NODE_ENV === "production" ? 3000 : 3001));
const server = Bun.serve({ port, fetch: app.fetch });
console.info(`Latveria API listening on http://localhost:${server.port}`);
