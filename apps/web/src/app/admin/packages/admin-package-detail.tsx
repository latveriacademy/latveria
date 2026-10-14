import { useEffect, useState } from "react";
import { Link, useLoaderData, useNavigate, useRevalidator, useSearchParams } from "react-router";
import { ArrowLeft, Plus, Save, Upload } from "lucide-react";
import type { Bank, PackageDetail, QuestionPackage } from "@latveria/shared";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { PageHeading, Panel, PanelHeader } from "../../../components/ui/dashboard";
import { MathText } from "../../../components/math/math-text";
import formStyles from "../admin.module.css";
import styles from "./packages.module.css";

type LoaderData = { pkg: PackageDetail; otherPackages: QuestionPackage[] };

export function AdminPackageDetail() {
  const { pkg, otherPackages } = useLoaderData<LoaderData>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState(pkg.name);
  const [description, setDescription] = useState(pkg.description ?? "");
  const [order, setOrder] = useState(pkg.order);
  const [isActive, setIsActive] = useState(pkg.isActive);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [showBank, setShowBank] = useState(false);
  const [bankPage, setBankPage] = useState(1);
  const [bankReload, setBankReload] = useState(0);
  const [bank, setBank] = useState<Bank | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");

  useEffect(() => {
    setName(pkg.name);
    setDescription(pkg.description ?? "");
    setOrder(pkg.order);
    setIsActive(pkg.isActive);
  }, [pkg.id, pkg.name, pkg.description, pkg.order, pkg.isActive]);

  useEffect(() => {
    if (!showBank) return;
    const controller = new AbortController();
    setBankLoading(true);
    setBankError("");
    setSelectedQuestionId("");
    api<Bank>(`/admin/questions?subtes=${pkg.topicSlug}&halaman=${bankPage}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setBank(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setBankError(error instanceof Error ? error.message : "Gagal memuat bank soal.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBankLoading(false);
      });
    return () => controller.abort();
  }, [showBank, pkg.topicSlug, bankPage, bankReload]);

  async function runAction(key: string, path: string, init: RequestInit, text: string) {
    if (busy) return;
    setBusy(key);
    setMessage(null);
    try {
      await api(path, init);
      await revalidator.revalidate();
      setMessage({ error: false, text });
      setSelectedQuestionId("");
      setBankReload((value) => value + 1);
    } catch (error) {
      setMessage({
        error: true,
        text: error instanceof Error ? error.message : "Perubahan belum tersimpan. Coba lagi.",
      });
    } finally {
      setBusy("");
    }
  }

  const createUrl = `/admin/soal/baru?subtes=${pkg.topicSlug}&paket=${pkg.id}`;
  const importUrl = `/admin/soal/impor?subtes=${pkg.topicSlug}&paket=${pkg.id}`;
  const selectedQuestion = bank?.rows.find((question) => question.id === selectedQuestionId);

  return (
    <div className={styles.page}>
      <Link className={styles.back} to={`/admin/subtes/${pkg.topicSlug}`}>
        <ArrowLeft size={16} />
        {pkg.topicName}
      </Link>
      <PageHeading
        title={pkg.name}
        description={
          <>
            {pkg.questionCount} soal ·{" "}
            {pkg.isActive ? "Ditampilkan kepada peserta" : "Tidak ditampilkan kepada peserta"}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to={importUrl}>
                <Upload />
                Impor JSON
              </Link>
            </Button>
            <Button asChild>
              <Link to={createUrl}>
                <Plus />
                Buat soal
              </Link>
            </Button>
          </>
        }
      />
      {params.has("imported") && (
        <p className={styles.success} role="status">
          {params.get("imported")} soal berhasil diimpor ke paket ini.
        </p>
      )}
      {message && (
        <p
          className={message.error ? formStyles.formError : styles.success}
          role={message.error ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}

      <Panel>
        <PanelHeader title={`Soal dalam paket (${pkg.questions.length})`}>
          <Button
            variant="outline"
            disabled={!!busy}
            aria-expanded={showBank}
            onClick={() => setShowBank(!showBank)}
          >
            {showBank ? "Tutup bank soal" : "Tambahkan dari bank soal"}
          </Button>
        </PanelHeader>
        {showBank && (
          <div className={styles.bank}>
            <h3>Pilih soal dari {pkg.topicName}</h3>
            <p className={styles.help}>
              Soal yang sudah ada di paket ini tidak ditampilkan. Soal dari paket lain akan
              dipindahkan, bukan disalin.
            </p>
            {bankLoading ? (
              <p role="status">Memuat soal…</p>
            ) : bankError ? (
              <div role="alert">
                <p>{bankError}</p>
                <Button variant="outline" onClick={() => setBankReload((value) => value + 1)}>
                  Coba lagi
                </Button>
              </div>
            ) : (
              bank && (
                <>
                  <fieldset disabled={!!busy} className={styles.choices}>
                    <legend className="sr-only">Soal yang akan ditambahkan</legend>
                    {bank.rows
                      .filter((question) => question.packageId !== pkg.id)
                      .map((question) => (
                        <label key={question.id} className={styles.choice}>
                          <input
                            type="radio"
                            name="bank-question"
                            checked={selectedQuestionId === question.id}
                            onChange={() => setSelectedQuestionId(question.id)}
                          />
                          <span>
                            <MathText>{question.prompt}</MathText>
                            <span className={styles.help}>
                              {question.packageName
                                ? `Saat ini di ${question.packageName}`
                                : "Belum masuk paket"}
                              {question.category ? ` · ${question.category}` : ""}
                            </span>
                          </span>
                        </label>
                      ))}
                    {!bank.rows.some((question) => question.packageId !== pkg.id) && (
                      <p>
                        Tidak ada soal lain pada halaman ini. Cek halaman berikutnya atau buat soal
                        baru.
                      </p>
                    )}
                  </fieldset>
                  <div className={styles.toolbar}>
                    <Button
                      variant="outline"
                      disabled={bankPage <= 1 || !!busy}
                      onClick={() => setBankPage(bankPage - 1)}
                    >
                      Sebelumnya
                    </Button>
                    <span>
                      Halaman {bank.page} / {bank.pageCount}
                    </span>
                    <Button
                      variant="outline"
                      disabled={bankPage >= bank.pageCount || !!busy}
                      onClick={() => setBankPage(bankPage + 1)}
                    >
                      Berikutnya
                    </Button>
                  </div>
                  <div className={styles.toolbar}>
                    <p className={styles.help}>
                      {selectedQuestion?.packageName
                        ? `Soal akan dipindahkan dari ${selectedQuestion.packageName} ke ${pkg.name}.`
                        : "Pilih satu soal untuk dimasukkan ke paket ini."}
                    </p>
                    <Button
                      disabled={!selectedQuestionId || !!busy}
                      onClick={() =>
                        runAction(
                          "add",
                          `/admin/packages/${pkg.id}/questions`,
                          {
                            method: "POST",
                            body: JSON.stringify({ questionId: selectedQuestionId }),
                          },
                          "Soal berhasil dimasukkan ke paket.",
                        )
                      }
                    >
                      {busy === "add" ? "Menambahkan…" : "Tambahkan soal"}
                    </Button>
                  </div>
                </>
              )
            )}
          </div>
        )}
        {!pkg.questions.length ? (
          <div className={styles.empty}>
            <h3>Mulai isi paket ini</h3>
            <p>Buat soal satu per satu, impor JSON, atau pilih soal yang sudah ada di bank soal.</p>
            <div className={styles.toolbar}>
              <Button asChild>
                <Link to={createUrl}>Buat soal</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={importUrl}>Impor JSON</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className={styles.help}>
              Mengeluarkan soal hanya melepasnya dari paket. Soal tetap tersimpan di bank soal.
            </p>
            <ol className={styles.questions}>
              {pkg.questions.map((question, index) => (
                <li
                  key={question.id}
                  className="motion-fade-up transition-colors duration-150 hover:bg-[var(--surface-elevated)]"
                  style={{ animationDelay: `${index * 25}ms` }}
                >
                  <div className={styles.question}>
                    <span className={styles.number}>{index + 1}.</span>
                    <div>
                      <MathText>{question.prompt}</MathText>
                      <p className={styles.help}>
                        {question.category ?? "Tanpa kategori"} ·{" "}
                        {question.usage > 0
                          ? `${question.usage} jawaban peserta`
                          : "Belum dikerjakan peserta"}
                      </p>
                    </div>
                  </div>
                  <div className={styles.toolbar}>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/admin/soal/${question.id}`}>Lihat soal</Link>
                    </Button>
                    {!!otherPackages.length && (
                      <details className={styles.move}>
                        <summary>Pindahkan ke paket lain</summary>
                        <div className={styles.toolbar}>
                          <label className="sr-only" htmlFor={`move-${question.id}`}>
                            Paket tujuan soal {index + 1}
                          </label>
                          <select
                            id={`move-${question.id}`}
                            disabled={!!busy}
                            value={moveTargets[question.id] ?? ""}
                            onChange={(event) =>
                              setMoveTargets({ ...moveTargets, [question.id]: event.target.value })
                            }
                          >
                            <option value="">Pilih paket tujuan</option>
                            {otherPackages.map((other) => (
                              <option key={other.id} value={other.id}>
                                {other.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={!moveTargets[question.id] || !!busy}
                            onClick={() =>
                              runAction(
                                question.id,
                                `/admin/questions/${question.id}/package`,
                                {
                                  method: "PUT",
                                  body: JSON.stringify({ packageId: moveTargets[question.id] }),
                                },
                                "Soal berhasil dipindahkan.",
                              )
                            }
                          >
                            {busy === question.id ? "Memproses…" : "Pindahkan"}
                          </Button>
                        </div>
                      </details>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      onClick={() =>
                        runAction(
                          question.id,
                          `/admin/packages/${pkg.id}/questions/${question.id}`,
                          { method: "DELETE" },
                          "Soal dikeluarkan dari paket, tetap tersimpan di bank soal.",
                        )
                      }
                    >
                      Keluarkan dari paket
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </Panel>

      <Panel>
        <details className={styles.settings}>
          <summary>Pengaturan paket · {pkg.isActive ? "Aktif" : "Nonaktif"}</summary>
          <form
            className={styles.settingsForm}
            onSubmit={(event) => {
              event.preventDefault();
              runAction(
                "settings",
                `/admin/packages/${pkg.id}`,
                {
                  method: "PUT",
                  body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    order,
                    isActive,
                  }),
                },
                "Pengaturan paket tersimpan.",
              );
            }}
          >
            <fieldset disabled={!!busy} className={styles.fields}>
              <div className={formStyles.field}>
                <label htmlFor="package-name">Nama paket</label>
                <input
                  id="package-name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className={formStyles.field}>
                <label htmlFor="package-order">Urutan tampilan</label>
                <input
                  id="package-order"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={order}
                  onChange={(event) => setOrder(Number(event.target.value))}
                />
                <span className={styles.help}>Angka yang lebih kecil tampil lebih dahulu.</span>
              </div>
              <div className={formStyles.field}>
                <label htmlFor="package-description">Deskripsi (opsional)</label>
                <textarea
                  id="package-description"
                  maxLength={500}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                Tampilkan paket kepada peserta
              </label>
              <Button type="submit">
                <Save />
                {busy === "settings" ? "Menyimpan…" : "Simpan pengaturan"}
              </Button>
            </fieldset>
          </form>
          <div className={styles.delete}>
            <p className={styles.help}>
              {pkg.questionCount
                ? "Pindahkan atau keluarkan semua soal sebelum menghapus paket. Paket dapat dinonaktifkan tanpa menghapus soal."
                : "Paket kosong dapat dihapus. Soal dan hasil latihan yang sudah tersimpan tidak ikut dihapus."}
            </p>
            <Button
              variant="outline"
              disabled={pkg.questionCount > 0 || !!busy}
              onClick={() => {
                setMessage(null);
                setConfirmDelete(true);
              }}
            >
              Hapus paket kosong
            </Button>
            <ConfirmDialog
              open={confirmDelete}
              onOpenChange={setConfirmDelete}
              title={`Hapus paket ${pkg.name}?`}
              description="Paket kosong akan dihapus. Soal dan hasil latihan yang sudah tersimpan tidak ikut dihapus."
              destructive
              confirmLabel="Ya, hapus paket"
              pending={!!busy}
              pendingLabel="Menghapus…"
              error={message?.error ? message.text : undefined}
              onConfirm={async () => {
                setBusy("delete");
                setMessage(null);
                try {
                  await api(`/admin/packages/${pkg.id}`, { method: "DELETE" });
                  setConfirmDelete(false);
                  navigate(`/admin/subtes/${pkg.topicSlug}`);
                } catch (error) {
                  setMessage({
                    error: true,
                    text: error instanceof Error ? error.message : "Gagal menghapus paket.",
                  });
                } finally {
                  setBusy("");
                }
              }}
            />
          </div>
        </details>
      </Panel>
    </div>
  );
}
