export function allowedOrigins() {
  const origins = [new URL(process.env.BETTER_AUTH_URL!).origin];
  const tunnel = process.env.DEV_TUNNEL_ORIGIN;
  if (process.env.NODE_ENV === "development" && tunnel) {
    const url = new URL(tunnel);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) throw new Error("DEV_TUNNEL_ORIGIN harus berupa origin HTTPS tanpa path.");
    origins.push(url.origin);
  }
  return origins;
}
