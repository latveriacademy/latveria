export function allowedOrigins() {
  const base = new URL(process.env.BETTER_AUTH_URL!);
  const origins = [base.origin];
  if (process.env.NODE_ENV === "development") {
    if (base.hostname === "localhost") {
      origins.push(
        `${base.protocol}//127.0.0.1:${base.port || (base.protocol === "https:" ? "443" : "80")}`,
      );
    } else if (base.hostname === "127.0.0.1") {
      origins.push(
        `${base.protocol}//localhost:${base.port || (base.protocol === "https:" ? "443" : "80")}`,
      );
    }
  }
  const tunnel = process.env.DEV_TUNNEL_ORIGIN;
  if (process.env.NODE_ENV === "development" && tunnel) {
    const url = new URL(tunnel);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash)
      throw new Error("DEV_TUNNEL_ORIGIN harus berupa origin HTTPS tanpa path.");
    origins.push(url.origin);
  }
  return origins;
}
