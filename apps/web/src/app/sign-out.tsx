"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";

export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState("");
  return <><button type="button" onClick={async () => {
    setError("");
    const result = await authClient.signOut();
    if (result.error) { setError("Gagal keluar. Coba lagi."); return; }
    router.push("/login");
    router.refresh();
  }}>Keluar</button>{error && <span role="alert">{error}</span>}</>;
}
