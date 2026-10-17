import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  utbkSubtests,
  normalizeTryoutImport,
  type TryoutImport,
  type AdminTryoutDetail,
  type QuestionImport,
  type QuestionPackage,
} from "@latveria/shared";
import { Download, FileCheck, Loader2, Sparkles, Upload } from "lucide-react";
import { api } from "../../../lib/api";
import {
  downloadJson,
  importExample,
  parseQuestionImport,
  IMPORT_EXAMPLE_KINDS,
} from "../../../lib/question/question-import";
import { ImportGuide } from "./import-guide";
import { ImportDryRunDialog } from "./import-dryrun-dialog";
import { Button } from "../../../components/ui/button";
import { Panel, PanelHeader } from "../../../components/ui/dashboard";
import styles from "../admin.module.css";
import packageStyles from "../packages/packages.module.css";

export function ImportQuestions({
  tryout,
  initialSubtest,
}: {
  tryout?: AdminTryoutDetail;
  initialSubtest?: string;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(
    tryout ? (initialSubtest ? "section" : "json") : params.has("paket") ? "package" : "json",
  );
  const [subtest, setSubtest] = useState(
    initialSubtest ?? params.get("subtes") ?? "pengetahuan-kuantitatif",
  );
  const [packageId, setPackageId] = useState(params.get("paket") ?? "");
  const [packages, setPackages] = useState<QuestionPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packagesError, setPackagesError] = useState("");
  const [packagesRetry, setPackagesRetry] = useState(0);
  const [text, setText] = useState("");
  const [batch, setBatch] = useState<QuestionImport | TryoutImport | null>(null);
  const [preview, setPreview] = useState<{ name: string; isNew: boolean }[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [fileName, setFileName] = useState("");
  const [exampleKind, setExampleKind] = useState("basic");
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const busy = pending || reading || checking || loadingPackages;
  const selectedPackage = packages.find((pkg) => pkg.id === packageId);
  const count = batch?.groups.reduce((sum, group) => sum + group.questions.length, 0) ?? 0;

  useEffect(() => {
    if (tryout || mode !== "package") return;
    const controller = new AbortController();
    setLoadingPackages(true);
    setPackagesError("");
    setPackages([]);
    api<QuestionPackage[]>(`/admin/subtests/${subtest}/packages`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setPackages(data);
          setPackageId((current) => (data.some((pkg) => pkg.id === current) ? current : ""));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setPackagesError("Gagal memuat paket tujuan. Coba lagi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPackages(false);
      });
    return () => controller.abort();
  }, [subtest, mode, packagesRetry, tryout]);

  const example = (kind: string): QuestionImport =>
    importExample(
      kind,
      mode === "package" || (tryout && mode === "section") ? subtest : undefined,
      mode === "package" ? selectedPackage?.name : undefined,
    );

  async function check(source: string) {
    setError("");
    setBatch(null);
    setChecking(true);
    try {
      if (tryout) {
        if (new TextEncoder().encode(source).byteLength > 200_000)
          throw new Error("JSON maksimal 200 KB.");
        const data = normalizeTryoutImport(
          JSON.parse(source),
          mode === "section" ? subtest : undefined,
        );
        const targets = data.groups.map((group) => {
          const official = utbkSubtests.find((s) => s.slug === group.subtes)!;
          const section = tryout.sections.find((s) => s.subtestCode === official.short);
          if (!section)
            throw new Error(`Subtes ${official.name} belum dikonfigurasi pada tryout ini.`);
          return { name: `${tryout.name} · ${section.title}`, isNew: false };
        });
        setPreview(targets);
        setBatch(data);
        return;
      }
      let data = parseQuestionImport(source);
      if (mode === "package") {
        if (!selectedPackage) throw new Error("Pilih paket tujuan terlebih dahulu.");
        if (data.groups.some((group) => group.subtes !== subtest))
          throw new Error(
            "Semua grup JSON harus menggunakan subtes yang dipilih pada tujuan impor.",
          );
        data = {
          groups: data.groups.map((group) => ({
            ...group,
            packageName: undefined,
            packageId: selectedPackage.id,
          })),
        };
      }
      data = parseQuestionImport(JSON.stringify(data));
      const destinations = new Map<string, QuestionPackage[]>();
      await Promise.all(
        [...new Set(data.groups.map((group) => group.subtes))].map(async (slug) => {
          destinations.set(slug, await api<QuestionPackage[]>(`/admin/subtests/${slug}/packages`));
        }),
      );
      const targets = data.groups.map((group) => {
        const list = destinations.get(group.subtes)!;
        const pkg = group.packageId
          ? list.find((item) => item.id === group.packageId)
          : list.find((item) => item.name === (group.packageName ?? "Paket 1"));
        if (group.packageId && !pkg)
          throw new Error(`Paket tujuan tidak tersedia pada subtes ${group.subtes}.`);
        return { name: pkg?.name ?? group.packageName ?? "Paket 1", isNew: !pkg };
      });
      setPreview(targets);
      setBatch(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "JSON tidak dapat diperiksa.");
    } finally {
      setChecking(false);
    }
  }

  async function handleImport() {
    if (!batch || busy) return;
    setPending(true);
    setError("");
    try {
      const endpoint = tryout
        ? mode === "section"
          ? `/admin/tryouts/sections/${tryout.sections.find((s) => s.subtestCode === utbkSubtests.find((t) => t.slug === subtest)?.short)!.id}/import`
          : `/admin/tryouts/${tryout.id}/import`
        : "/admin/questions/import";
      const result = await api<{ count: number; packages?: { id: string }[] }>(endpoint, {
        method: "POST",
        body: JSON.stringify(batch),
      });
      const redirectPath = tryout
        ? `/admin/tryouts/${tryout.id}?imported=${result.count}`
        : result.packages?.length === 1
          ? `/admin/paket/${result.packages[0].id}?imported=${result.count}`
          : `/admin/soal?imported=${result.count}`;
      navigate(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impor gagal. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.importLayout}>
      <div className={packageStyles.page}>
        <Panel>
          <PanelHeader title="Tujuan impor" />
          {tryout ? (
            <>
              <p className={packageStyles.help}>
                Tryout: <strong>{tryout.name}</strong>
              </p>
              <div className={styles.field}>
                <label htmlFor="tryout-import-target">Subtes tujuan</label>
                <select
                  id="tryout-import-target"
                  disabled={busy}
                  value={mode === "section" ? subtest : "json"}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMode(value === "json" ? "json" : "section");
                    if (value !== "json") setSubtest(value);
                    setBatch(null);
                    setError("");
                  }}
                >
                  <option value="json">Subtes yang ditentukan dalam JSON</option>
                  {tryout.sections.map((section) => {
                    const official = utbkSubtests.find((s) => s.short === section.subtestCode);
                    return official ? (
                      <option key={section.id} value={official.slug}>
                        {section.title}
                      </option>
                    ) : null;
                  })}
                </select>
              </div>
              <p className={packageStyles.help}>
                Gunakan format groups seperti Bank soal. Format lama questions diterima saat satu
                subtes dipilih. Tujuan paket pada JSON tidak membuat paket baru; soal masuk ke
                Tryout ini.
              </p>
            </>
          ) : (
            <>
              <div className={styles.field}>
                <label htmlFor="import-mode">Masukkan soal ke</label>
                <select
                  id="import-mode"
                  disabled={busy}
                  value={mode}
                  onChange={(event) => {
                    setMode(event.target.value);
                    setBatch(null);
                    setError("");
                  }}
                >
                  <option value="json">Paket yang ditentukan dalam JSON</option>
                  <option value="package">Satu paket yang sudah ada</option>
                </select>
              </div>
              {mode === "package" ? (
                <div className={packageStyles.fields}>
                  <div className={styles.field}>
                    <label htmlFor="import-subtest">Subtes tujuan</label>
                    <select
                      id="import-subtest"
                      disabled={busy}
                      value={subtest}
                      onChange={(event) => {
                        setSubtest(event.target.value);
                        setPackageId("");
                        setBatch(null);
                        setError("");
                      }}
                    >
                      {utbkSubtests.map((topic) => (
                        <option key={topic.slug} value={topic.slug}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="import-package">Paket tujuan</label>
                    <select
                      id="import-package"
                      disabled={busy}
                      value={packageId}
                      onChange={(event) => {
                        setPackageId(event.target.value);
                        setBatch(null);
                        setError("");
                      }}
                    >
                      <option value="">{loadingPackages ? "Memuat paket…" : "Pilih paket"}</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name}
                          {pkg.isActive ? "" : " (nonaktif)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className={packageStyles.help}>
                    Tujuan dari form diterapkan ke seluruh soal. Semua grup harus memakai subtes
                    yang dipilih.
                  </p>
                  {packagesError ? (
                    <div role="alert">
                      <p>{packagesError}</p>
                      <Button
                        variant="outline"
                        onClick={() => setPackagesRetry((value) => value + 1)}
                      >
                        Coba lagi
                      </Button>
                    </div>
                  ) : (
                    !loadingPackages &&
                    !packages.length && (
                      <Link to={`/admin/subtes/${subtest}`}>Buat paket pada subtes ini</Link>
                    )
                  )}
                </div>
              ) : (
                <p className={packageStyles.help}>
                  Isi <code>packageName</code> pada setiap grup. Nama yang belum ada dibuat otomatis
                  pada subtes tersebut; tanpa tujuan paket, soal masuk ke “Paket 1”.
                </p>
              )}
            </>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Data soal" />
          <p className={packageStyles.help}>
            Mulai dari contoh format, lalu ganti pertanyaan, jawaban, dan sumber sesuai soalmu.
          </p>
          <div className={packageStyles.toolbar}>
            {IMPORT_EXAMPLE_KINDS.filter(
              ({ kind }) =>
                kind !== "lexicon" ||
                !tryout ||
                mode !== "section" ||
                subtest === "literasi-bahasa-inggris",
            ).map(({ kind, label }) => (
              <Button
                key={kind}
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setExampleKind(kind);
                  setText(JSON.stringify(example(kind), null, 2));
                  setBatch(null);
                  setError("");
                  setFileName("");
                }}
              >
                {label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => downloadJson(example(exampleKind), "contoh-impor-paket.json")}
            >
              <Download />
              Unduh contoh JSON
            </Button>
          </div>
          <div className={styles.importEditor}>
            <div className={styles.field}>
              <label htmlFor="json-input">Tempel atau edit JSON</label>
              <textarea
                id="json-input"
                className={styles.jsonEditor}
                value={text}
                disabled={busy}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="Tempel JSON soal di sini…"
                aria-describedby="json-help"
                aria-invalid={!!error}
                onChange={(event) => {
                  setText(event.target.value);
                  setBatch(null);
                  setError("");
                  setFileName("");
                }}
              />
              <p id="json-help" className={styles.importHelp}>
                Maksimal 100 soal dan 200 KB. Lima opsi A–E per soal; <code>correctAnswer</code>: 0
                = A, 1 = B, 2 = C, 3 = D, 4 = E.
              </p>
            </div>
            <div className={styles.field}>
              <label htmlFor="json-file">Atau unggah file JSON</label>
              <input
                id="json-file"
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  event.target.value = "";
                  setBatch(null);
                  setError("");
                  setFileName("");
                  if (file.size > 200_000) {
                    setError("File melebihi 200 KB. Pilih file yang lebih kecil.");
                    return;
                  }
                  setReading(true);
                  try {
                    const source = await file.text();
                    setText(source);
                    setFileName(file.name);
                    await check(source);
                  } catch {
                    setError("File tidak dapat dibaca. Coba pilih file lagi.");
                  } finally {
                    setReading(false);
                  }
                }}
              />
              <p className={styles.importHelp}>
                {reading
                  ? "Membaca file…"
                  : fileName
                    ? `${fileName} sudah dimuat dan bisa diedit.`
                    : "Isi file akan masuk ke editor; periksa ringkasannya sebelum menyimpan."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={!text.trim() || busy || (mode === "package" && !selectedPackage)}
                onClick={() => check(text)}
              >
                {checking ? <Loader2 className="animate-spin" /> : <FileCheck />}
                {checking ? "Memeriksa…" : "Periksa JSON"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!text.trim() || busy}
                onClick={() => setDryRunOpen(true)}
              >
                <Sparkles className="size-4 mr-1 text-[var(--gold)]" />
                Uji Coba Dry Run
              </Button>
            </div>
            {error && (
              <p id="json-error" className={styles.formError} role="alert">
                {error}
              </p>
            )}
          </div>
          <ImportGuide />
        </Panel>
      </div>
      <Panel className={styles.importSummary}>
        <PanelHeader title="Ringkasan impor" />
        {batch ? (
          <div role="status">
            <p className={styles.importCount}>{count} soal siap diimpor</p>
            <ul className={styles.importGroups}>
              {batch.groups.map((group, index) => (
                <li key={index}>
                  <strong>
                    {preview[index].name}
                    {preview[index].isNew ? " · Paket baru" : ""}
                  </strong>
                  <span>{utbkSubtests.find((topic) => topic.slug === group.subtes)?.name}</span>
                  <span>
                    {group.category ?? "Tanpa kategori"} · {group.questions.length} soal
                    {tryout &&
                      ` · ${group.questions.filter((q) => "type" in q && q.type === "true_false_group").length} benar/salah kompleks`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={styles.importHelp}>
            Pilih tujuan, muat JSON, lalu tekan “Periksa JSON” untuk melihat paket dan jumlah soal
            yang akan disimpan.
          </p>
        )}
        <p className={styles.importHelp}>
          {tryout ? "Seluruh soal dan relasi subtes Tryout" : "Paket baru dan seluruh soal"}{" "}
          disimpan dalam satu transaksi. Jika ada data yang tidak valid, tidak ada perubahan yang
          disimpan.
        </p>
        <div className={styles.importActions}>
          <Button disabled={!batch || busy} onClick={handleImport}>
            {pending ? <Loader2 className="animate-spin" /> : <Upload />}
            {pending ? "Mengimpor…" : batch ? `Impor ${count} soal` : "Impor soal"}
          </Button>
          <Button asChild variant="ghost">
            <Link
              to={
                tryout
                  ? `/admin/tryouts/${tryout.id}`
                  : params.has("paket")
                    ? `/admin/paket/${params.get("paket")}`
                    : "/admin/soal"
              }
            >
              Batal
            </Link>
          </Button>
        </div>
      </Panel>
      <ImportDryRunDialog
        text={text}
        open={dryRunOpen}
        onOpenChange={setDryRunOpen}
        onProceed={() => check(text)}
      />
    </div>
  );
}
