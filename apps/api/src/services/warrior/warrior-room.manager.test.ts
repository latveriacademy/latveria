import { describe, expect, it, vi } from "vitest";
import {
  registerSocket,
  unregisterSocket,
  getRoomSockets,
  broadcastToBattle,
  setRoomTimer,
  clearRoomTimer,
  type WarriorWebSocket,
} from "./warrior-room.manager";

describe("Warrior Room Manager", () => {
  it("registers and unregisters sockets correctly", () => {
    const battleId = "test-battle-1";
    const fakeSocket1 = {
      data: { userId: "user-1", battleId },
      send: vi.fn(),
    } as unknown as WarriorWebSocket;

    const fakeSocket2 = {
      data: { userId: "user-2", battleId },
      send: vi.fn(),
    } as unknown as WarriorWebSocket;

    registerSocket(battleId, fakeSocket1);
    registerSocket(battleId, fakeSocket2);

    expect(getRoomSockets(battleId)).toHaveLength(2);

    unregisterSocket(battleId, fakeSocket1);
    expect(getRoomSockets(battleId)).toHaveLength(1);

    unregisterSocket(battleId, fakeSocket2);
    expect(getRoomSockets(battleId)).toHaveLength(0);
  });

  it("broadcasts messages only to sockets in the target room", () => {
    const battleA = "battle-A";
    const battleB = "battle-B";

    const socketA = {
      data: { userId: "user-a", battleId: battleA },
      send: vi.fn(),
    } as unknown as WarriorWebSocket;

    const socketB = {
      data: { userId: "user-b", battleId: battleB },
      send: vi.fn(),
    } as unknown as WarriorWebSocket;

    registerSocket(battleA, socketA);
    registerSocket(battleB, socketB);

    broadcastToBattle(battleA, {
      type: "battle:player_ready",
      participantId: "00000000-0000-0000-0000-000000000001",
      isReady: true,
    });

    expect(socketA.send).toHaveBeenCalledTimes(1);
    expect(socketB.send).not.toHaveBeenCalled();

    unregisterSocket(battleA, socketA);
    unregisterSocket(battleB, socketB);
  });

  it("handles room timers safely", () => {
    const battleId = "battle-timer-test";
    let fired = false;
    const timer = setTimeout(() => {
      fired = true;
    }, 1000);

    setRoomTimer(battleId, timer);
    clearRoomTimer(battleId);

    expect(fired).toBe(false);
  });
});
