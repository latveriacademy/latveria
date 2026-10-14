import { useEffect, useState } from "react";
import { Link } from "react-router";
import { utbkSubtests, type IrtCalibrationItem } from "@latveria/shared";
import { api } from "../../lib/api";
import { downloadJson } from "../../lib/question/question-export";
import { PageHeading, Panel, PanelHeader } from "../../components/ui/dashboard";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/confirm-dialog";

export function AdminIrt() {
  const [models, setModels] = useState<IrtCalibrationItem[]>([]);
  const [overview, setOverview] = useState<
    { slug: string; respondents: number; responses: number }[]
  >([]);
  const [slug, setSlug] = useState<string>(utbkSubtests[0].slug);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<IrtCalibrationItem | null>(null);
  const load = async () => {
    setLoading(true);
    try {
      const [items, data] = await Promise.all([
        api<IrtCalibrationItem[]>("/admin/irt/calibrations"),
        api<typeof overview>("/admin/irt/overview"),
      ]);
      setModels(items);
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kalibrasi tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operasi gagal.");
    } finally {
      setBusy(false);
    }
  };
  const selected = overview.find((row) => row.slug === slug);
  return (
    <div className="space-y-6 min-w-0">
      <PageHeading
        title="Kalibrasi IRT"
        description="Model 2PL per subtes, berdasarkan respons pertama pada sesi Tryout yang selesai."
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/tryouts">Daftar Tryout</Link>
          </Button>
        }
      />
      {error && (
        <p role="alert" className="text-[var(--crimson)]">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <Panel>
        <PanelHeader title="Dataset kalibrasi" />
        <div className="space-y-3">
          <label className="grid gap-2 text-sm">
            Subtes
            <select
              value={slug}
              disabled={busy}
              onChange={(e) => setSlug(e.target.value)}
              className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] p-2 text-[var(--ink)]"
            >
              {utbkSubtests.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-[var(--soft-ink)]">
            {selected?.respondents ?? 0} responden · {selected?.responses ?? 0} respons dikotomis
            tersimpan. Akun demo dan pengulangan tidak digunakan dalam kalibrasi.
          </p>
          <p className="text-sm text-[var(--soft-ink)]">
            Ekspor memerlukan ≥200 responden, ≥10 soal layak, ≥100 respons per soal, serta tingkat
            benar 5–95%. Estimasi 2PL dan pemeriksaan kualitas dijalankan offline dengan mirt.
          </p>
          <Button
            disabled={busy || loading}
            onClick={() =>
              run(async () => {
                const dataset = await api("/admin/irt/datasets", {
                  method: "POST",
                  body: JSON.stringify({ topicSlug: slug }),
                });
                downloadJson(`irt-${slug}-dataset.json`, JSON.stringify(dataset, null, 2));
                setMessage(
                  "Dataset diunduh. Jalankan skrip kalibrasi, lalu impor artefaknya di bawah.",
                );
              })
            }
          >
            Ekspor dataset respons
          </Button>
          <code className="block overflow-x-auto text-xs">
            Rscript apps/api/scripts/calibrate-irt.R dataset.json calibration.json versi-model
          </code>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Impor artefak kalibrasi" />
        <div className="space-y-3">
          <p className="text-sm text-[var(--soft-ink)]">
            Artefak harus cocok dengan hash dataset terdaftar, konvergen, RMSEA ≤0,10 dan
            reliabilitas ≥0,60. Model yang diimpor belum aktif sampai ditinjau.
          </p>
          <label className="grid gap-2 text-sm">
            JSON hasil mirt
            <textarea
              value={text}
              disabled={busy}
              rows={8}
              onChange={(e) => setText(e.target.value)}
              className="w-full border border-[var(--edge)] bg-[var(--bg)] p-3 font-mono text-xs text-[var(--ink)]"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Atau unggah JSON
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 200_000) throw new Error("Artefak maksimal 200 KB.");
                  setText(await file.text());
                  setError("");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "File tidak dapat dibaca.");
                }
              }}
            />
          </label>
          <Button
            disabled={busy || !text.trim()}
            onClick={() =>
              run(async () => {
                if (new TextEncoder().encode(text).byteLength > 200_000)
                  throw new Error("Artefak maksimal 200 KB.");
                await api("/admin/irt/calibrations", {
                  method: "POST",
                  body: JSON.stringify(JSON.parse(text)),
                });
                setText("");
                setMessage(
                  "Model diimpor sebagai draf. Tinjau parameter dan kualitas sebelum mengaktifkan.",
                );
                await load();
              })
            }
          >
            {busy ? "Memproses…" : "Validasi dan impor model"}
          </Button>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Versi model" />
        {loading ? (
          <p role="status">Memuat model…</p>
        ) : !models.length ? (
          <p>
            Belum ada model terkalibrasi. Sesi baru menggunakan skor simulasi dasar tanpa bonus
            waktu.
          </p>
        ) : (
          <ul className="space-y-4">
            {models.map((model) => (
              <li key={model.id} className="border-b border-[var(--edge)] py-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <strong>
                      {utbkSubtests.find((s) => s.slug === model.topicSlug)?.name} · {model.version}
                    </strong>
                    <p className="text-sm text-[var(--soft-ink)]">
                      {model.active ? "Aktif untuk sesi baru" : "Nonaktif"} · {model.sampleSize}{" "}
                      responden · RMSEA {model.diagnostics.rmsea.toFixed(3)} · Reliabilitas{" "}
                      {model.diagnostics.reliability.toFixed(3)} · mirt {model.sourceVersion}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setTarget(model);
                    }}
                  >
                    {model.active ? "Nonaktifkan" : "Tinjau dan aktifkan"}
                  </Button>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm">
                    Parameter {model.parameters.length} versi soal
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th>Versi soal</th>
                          <th>Daya pembeda a</th>
                          <th>Kesulitan b</th>
                        </tr>
                      </thead>
                      <tbody>
                        {model.parameters.map((p) => (
                          <tr key={p.revisionId}>
                            <td className="p-2 font-mono text-xs">{p.revisionId}</td>
                            <td>{p.a.toFixed(3)}</td>
                            <td>{p.b.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={
          target?.active ? "Nonaktifkan model IRT?" : "Aktifkan model IRT yang sudah ditinjau?"
        }
        description="Perubahan berlaku untuk sesi baru. Sesi yang sudah dimulai dan nilai lama tetap memakai snapshot modelnya."
        pending={busy}
        error={error}
        confirmLabel={target?.active ? "Nonaktifkan" : "Aktifkan model"}
        onConfirm={() =>
          run(async () => {
            if (!target) return;
            await api(`/admin/irt/calibrations/${target.id}/activation`, {
              method: "PUT",
              body: JSON.stringify({ active: !target.active }),
            });
            setTarget(null);
            await load();
          })
        }
      />
    </div>
  );
}
