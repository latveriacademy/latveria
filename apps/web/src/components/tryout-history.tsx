import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageHeading, Panel } from "./ui/dashboard";
import { Button } from "./ui/button";
type Row = { id: string; name: string; completedAt: string; score: number; scoringVersion: string };
export function TryoutHistory({
  onBack,
  onOpen,
}: {
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await api<Row[]>("/learner/tryouts/history"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Riwayat tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="latveria-view-container space-y-5">
      <PageHeading
        title="Riwayat Tryout"
        description="Buka hasil tersimpan tanpa membuat sesi atau memberikan EXP lagi."
        actions={
          <Button variant="outline" onClick={onBack}>
            Battle World
          </Button>
        }
      />
      <Panel>
        {loading ? (
          <p role="status">Memuat riwayat…</p>
        ) : error ? (
          <div role="alert">
            <p>{error}</p>
            <Button onClick={load}>Coba lagi</Button>
          </div>
        ) : !rows.length ? (
          <p>Belum ada Tryout yang selesai.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--edge)] py-4"
              >
                <div>
                  <strong>{row.name}</strong>
                  <p className="text-sm text-[var(--soft-ink)]">
                    {new Date(row.completedAt).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })}{" "}
                    · {row.score}/1.000 ·{" "}
                    {row.scoringVersion === "legacy" ? "Skor Latveria lama" : "Skor simulasi"}
                  </p>
                </div>
                <Button variant="outline" onClick={() => onOpen(row.id)}>
                  Buka hasil
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
