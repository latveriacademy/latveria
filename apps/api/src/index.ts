import { serveStatic } from "hono/bun";
import { app } from "./app";
import { authenticateWarriorWs } from "./services/warrior/warrior-auth-ws.service";
import type { WarriorSocketData } from "./services/warrior/warrior-room.manager";
import {
  onSocketClose,
  onSocketMessage,
  onSocketOpen,
} from "./services/warrior/warrior-ws.service";

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

export const server = Bun.serve<WarriorSocketData>({
  port,
  async fetch(req, bunServer) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/warrior/battles/") && url.pathname.endsWith("/ws")) {
      const authResult = await authenticateWarriorWs(req);
      if (!authResult.success) {
        return new Response(JSON.stringify({ error: authResult.reason }), {
          status: authResult.status,
          headers: { "Content-Type": "application/json" },
        });
      }
      const upgraded = bunServer.upgrade(req, { data: authResult.data });
      if (upgraded) return undefined as unknown as Response;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    open: onSocketOpen,
    message: onSocketMessage,
    close: onSocketClose,
  },
});

console.info(`Latveria API listening on http://localhost:${server.port}`);
