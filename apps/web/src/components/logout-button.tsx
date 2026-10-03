import { useState } from "react";
import { useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { authClient } from "../lib/auth-client";

export function LogoutButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={async () => {
          setError("");
          setPending(true);
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error();
            localStorage.removeItem("latveria_user");
            navigate("/login", { replace: true });
          } catch {
            setError("Gagal keluar. Coba lagi.");
          } finally {
            setPending(false);
          }
        }}
      >
        <LogOut size={18} aria-hidden="true" />
        <span>{pending ? "Keluar…" : "Keluar"}</span>
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
