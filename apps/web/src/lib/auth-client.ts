import { createAuthClient } from "better-auth/react";

// Use the current origin since Vite proxy forwards /api to backend
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
});
