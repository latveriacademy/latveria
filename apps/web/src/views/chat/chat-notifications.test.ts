import { expect, it } from "vitest";
import type { ChatMessage } from "@latveria/shared";
import { newGlobalMessages } from "./chat-notifications";

it("only notifies about other users' global messages after the last visit", () => {
  const message = (id: string, senderId: string, createdAt: string) =>
    ({ id, senderId, createdAt }) as ChatMessage;
  expect(
    newGlobalMessages(
      [
        message("old", "other", "2026-01-01T00:00:00.000Z"),
        message("own", "me", "2026-01-02T00:00:00.000Z"),
        message("new", "other", "2026-01-02T00:00:00.000Z"),
      ],
      "me",
      "2026-01-01T12:00:00.000Z",
    ).map((item) => item.id),
  ).toEqual(["new"]);
});
