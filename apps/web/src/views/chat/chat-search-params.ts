export function chatSearchParams(current: URLSearchParams, dm: string | null) {
  const next = new URLSearchParams(current);
  next.set("tab", "chat");
  if (dm) next.set("dm", dm);
  else next.delete("dm");
  return next;
}
