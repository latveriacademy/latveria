import { expect, it } from "vitest";
import { chatSearchParams } from "./chat-search-params";

it("keeps the chat tab when selecting or closing a DM", () => {
  const current = new URLSearchParams("tab=chat&dm=old-contact");

  expect(chatSearchParams(current, "new-contact").toString()).toBe("tab=chat&dm=new-contact");
  expect(chatSearchParams(current, null).toString()).toBe("tab=chat");
  expect(current.toString()).toBe("tab=chat&dm=old-contact");
});
