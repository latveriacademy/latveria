import type { ChatMessage } from "@latveria/shared";
import { api } from "../../lib/api";

export async function uploadChatFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api<{ url: string }>("/learner/chat/upload", {
    method: "POST",
    body: formData,
  });
  return res.url;
}

export async function sendChatMessageApi(
  endpoint: string,
  message: string,
  mediaUrl?: string | null,
): Promise<ChatMessage> {
  const res = await api<{ message: ChatMessage }>(endpoint, {
    method: "POST",
    body: JSON.stringify({ message, mediaUrl }),
  });
  return res.message;
}

export async function editChatMessage(messageId: string, message: string): Promise<ChatMessage> {
  const res = await api<{ message: ChatMessage }>(`/learner/chat/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ message }),
  });
  return res.message;
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  await api(`/learner/chat/messages/${messageId}`, {
    method: "DELETE",
  });
}
