import { serveStatic } from "hono/bun";
import { app } from "./app";
import { logger } from "./lib/logger";
import { authenticateWarriorWs } from "./services/warrior/warrior-auth-ws.service";
import type { WarriorSocketData, WarriorWebSocket } from "./services/warrior/warrior-room.manager";
import {
  onSocketClose,
  onSocketMessage,
  onSocketOpen,
} from "./services/warrior/warrior-ws.service";
import { authenticateChatWs } from "./services/chat/chat-auth-ws.service";
import type { ChatSocketData, ChatWebSocket } from "./services/chat/chat-ws.manager";
import {
  onChatSocketClose,
  onChatSocketMessage,
  onChatSocketOpen,
} from "./services/chat/chat-ws.service";

type AppSocketData = WarriorSocketData | ChatSocketData;

// Jaga proses tetap hidup jika ada unhandled rejection (mis. Supabase statement timeout)
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "[API] Unhandled rejection (proses tetap berjalan)");
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

export const server = Bun.serve<AppSocketData>({
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

    if (url.pathname === "/api/chat/ws") {
      const authResult = await authenticateChatWs(req);
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
    open(ws) {
      if ("battleId" in ws.data) {
        onSocketOpen(ws as unknown as WarriorWebSocket);
      } else {
        onChatSocketOpen(ws as unknown as ChatWebSocket);
      }
    },
    message(ws, msg) {
      if ("battleId" in ws.data) {
        onSocketMessage(ws as unknown as WarriorWebSocket, msg);
      } else {
        void onChatSocketMessage(ws as unknown as ChatWebSocket, msg);
      }
    },
    close(ws) {
      if ("battleId" in ws.data) {
        onSocketClose(ws as unknown as WarriorWebSocket);
      } else {
        onChatSocketClose(ws as unknown as ChatWebSocket);
      }
    },
  },
});

logger.info({ port: server.port }, `Latveria API listening on http://localhost:${server.port}`);
