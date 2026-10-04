import { createAuthClient } from "better-auth/react";

// Use the current origin since Vite proxy forwards /api to backend
export const authClient = createAuthClient({
  baseURL: window.location.origin,
});
