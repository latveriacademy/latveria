import type { ServerWebSocket } from "bun";
import type { ServerWsMessage } from "@latveria/shared";

export interface WarriorSocketData {
  userId: string;
  name: string;
  image?: string | null;
  battleId: string;
  participantId: string;
  teamId: string;
  teamNumber: number;
}

export type WarriorWebSocket = ServerWebSocket<WarriorSocketData>;

// In-memory active sockets per battle room
const activeRooms = new Map<string, Set<WarriorWebSocket>>();

// Active question transition timers per battle (to prevent stale timers)
const activeTimers = new Map<string, Timer>();

export function registerSocket(battleId: string, ws: WarriorWebSocket) {
  let sockets = activeRooms.get(battleId);
  if (!sockets) {
    sockets = new Set();
    activeRooms.set(battleId, sockets);
  }
  sockets.add(ws);
}

export function unregisterSocket(battleId: string, ws: WarriorWebSocket) {
  const sockets = activeRooms.get(battleId);
  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) {
      activeRooms.delete(battleId);
    }
  }
}

export function getRoomSockets(battleId: string): WarriorWebSocket[] {
  const sockets = activeRooms.get(battleId);
  return sockets ? Array.from(sockets) : [];
}

export function broadcastToBattle(battleId: string, message: ServerWsMessage) {
  const sockets = activeRooms.get(battleId);
  if (!sockets || sockets.size === 0) return;
  const payload = JSON.stringify(message);
  for (const socket of sockets) {
    try {
      socket.send(payload);
    } catch (err) {
      console.error(`[WarriorRoom] Failed to send to socket in room ${battleId}:`, err);
    }
  }
}

export function sendToSocket(ws: WarriorWebSocket, message: ServerWsMessage) {
  try {
    ws.send(JSON.stringify(message));
  } catch (err) {
    console.error(`[WarriorRoom] Failed to send message to user ${ws.data.userId}:`, err);
  }
}

export function setRoomTimer(battleId: string, timer: Timer) {
  clearRoomTimer(battleId);
  activeTimers.set(battleId, timer);
}

export function clearRoomTimer(battleId: string) {
  const timer = activeTimers.get(battleId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(battleId);
  }
}
