import { getAuth } from "../../lib/auth";
import { allowedOrigins } from "../../lib/origins";
import type { ChatSocketData } from "./chat-ws.manager";

export async function authenticateChatWs(
  req: Request,
): Promise<
  { success: true; data: ChatSocketData } | { success: false; status: number; reason: string }
> {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().includes(origin)) {
    return { success: false, status: 403, reason: "Origin tidak diizinkan." };
  }

  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session?.user) {
    return { success: false, status: 401, reason: "Silakan masuk terlebih dahulu." };
  }

  return {
    success: true,
    data: {
      userId: session.user.id,
      name: session.user.name,
      image: session.user.image,
      role: session.user.role,
    },
  };
}
