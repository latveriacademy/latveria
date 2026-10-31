import type { ChatMessage } from "@latveria/shared";

export function newGlobalMessages(messages: ChatMessage[], userId: string, seenAt: string) {
  return messages.filter((message) => message.senderId !== userId && message.createdAt > seenAt);
}
