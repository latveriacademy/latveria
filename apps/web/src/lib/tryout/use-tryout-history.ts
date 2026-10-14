import { useCallback, useEffect, useState } from "react";
import type { TryoutHistoryEntry } from "@latveria/shared";
import { api } from "../api";

export function useTryoutHistory() {
  const [rows, setRows] = useState<TryoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<TryoutHistoryEntry[]>("/learner/tryouts/history", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setRows(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Riwayat Tryout tidak dapat dimuat.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  return { rows, loading, error, reload };
}
