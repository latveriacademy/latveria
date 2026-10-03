import { lazy, useEffect, useState } from "react";
import { isRouteErrorResponse } from "react-router";
import { createBrowserRouter, Link, Navigate, redirect, useLoaderData, useNavigate, useNavigation, useRevalidator, useRouteError, useSearchParams } from "react-router";
import { ArrowLeft, Plus, Upload, Trash2, Pencil, Loader2 } from "lucide-react";
import { credentialsSchema, signupSchema, type Bank, type QuestionDetail, type Topic, type User, type HistoryItem, type Result, type QuestionPackage, type PackageDetail } from "@latveria/shared";
import { api, ApiError } from "./lib/api";
import { authClient } from "./lib/auth-client";
import { QuestionForm } from "./app/admin/question-form";
import { AdminLayout } from "./app/admin/admin-layout";
import { ImportQuestions } from "./app/admin/import-questions";
import { Button } from "./components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { ThemeToggle } from "./components/theme-toggle";
import { Brand, PageHeading, Panel, PanelHeader, StatTile } from "./components/ui/dashboard";
import { MathText } from "./components/math-text";
import as from "./app/admin/admin.module.css";
import { HistoryView, HistoryErrorView } from "./views/HistoryView";

const Home = lazy(() => import("./app/landing"));
const LatveriaOSApp = lazy(() => import("./LatveriaOSApp").then((module) => ({ default: module.LatveriaOSApp })));
import { QuestionBankTable } from "./app/admin/question-bank-table";
const HistoryResultView = lazy(() => import("./views/HistoryResultView").then((module) => ({ default: module.HistoryResultView })));
const AdminSubtestPackages = lazy(() => import("./app/admin/admin-subtest-packages").then((module) => ({ default: module.AdminSubtestPackages })));
const AdminPackageDetail = lazy(() => import("./app/admin/admin-package-detail").then((module) => ({ default: module.AdminPackageDetail })));
const AdminReports = lazy(() => import("./app/admin/admin-reports").then((module) => ({ default: module.AdminReports })));
const AdminAffirmations = lazy(() => import("./app/admin/admin-affirmations").then((module) => ({ default: module.AdminAffirmations })));

async function guard(role: "user" | "admin") {
  let user: User;
  try { user = await api<User>("/me"); } catch (error) { if (error instanceof ApiError && error.status === 401) throw redirect("/login"); throw error; }
  if (role === "user" && user.role === "admin") throw redirect("/admin");
  if (role === "admin" && user.role !== "admin") throw new Response(null, { status: 404 });
  return user;
}
function Login() {
  const navigate = useNavigate();
  const [register, setRegister] = useState(false), [error, setError] = useState(""), [pending, setPending] = useState(false);
  return <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 px-6 py-12 motion-page-enter"><div className="flex items-center justify-between"><Brand /><ThemeToggle /></div><h1 className="!mb-0 !text-5xl text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>Masuk ruang belajar</h1><form className="grid gap-4 border border-[var(--edge)] bg-[var(--surface)] p-6 rounded-md shadow-sm motion-fade-up" onSubmit={async (event) => {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); const body = { email: String(form.get("email")), password: String(form.get("password")), name: String(form.get("name") ?? "") };
    const parsed = (register ? signupSchema : credentialsSchema).safeParse(body); if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true); try { const result = register ? await authClient.signUp.email(body) : await authClient.signIn.email(body); if (result.error) throw new Error(register ? "Pendaftaran gagal." : "Email atau kata sandi tidak cocok."); const user = await api<User>("/me"); navigate(user.role === "admin" ? "/admin" : "/dashboard"); } catch (error) { setError(error instanceof Error ? error.message : "Gagal masuk."); } finally { setPending(false); }
  }}>{register && <label className="grid gap-1 text-[var(--ink)] font-medium">Nama<input className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-3 rounded-md focus:border-[var(--emerald)] focus:outline-none transition-colors duration-150" name="name" required autoComplete="name" /></label>}<label className="grid gap-1 text-[var(--ink)] font-medium">Email<input className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-3 rounded-md focus:border-[var(--emerald)] focus:outline-none transition-colors duration-150" name="email" type="email" required autoComplete="email" /></label><label className="grid gap-1 text-[var(--ink)] font-medium">Kata sandi<input className="min-h-11 border border-[var(--edge)] bg-[var(--bg)] text-[var(--ink)] px-3 rounded-md focus:border-[var(--emerald)] focus:outline-none transition-colors duration-150" name="password" type="password" required autoComplete={register ? "new-password" : "current-password"} /></label>{error && <p role="alert" className="text-red-500 text-sm motion-fade-in">{error}</p>}<Button disabled={pending} loading={pending}>{register ? "Daftar" : "Masuk"}</Button>{import.meta.env.DEV && <Button variant="ghost" type="button" onClick={() => setRegister(!register)}>{register ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar lokal"}</Button>}</form></main>;
}
function AdminSummary() {
  const loadedTopics = useLoaderData<Topic[]>();
  const [topics, setTopics] = useState<Topic[]>(loadedTopics);
  const revalidator = useRevalidator();

  useEffect(() => {
    api<Topic[]>("/admin/topics").then(setTopics).catch(() => {});
  }, [revalidator.state]);

  const totalPackages = topics.reduce((sum, topic) => sum + (topic.packageCount ?? 0), 0);
  const totalQuestions = topics.reduce((sum, topic) => sum + topic.questionCount, 0);

  return <div className="motion-page-enter">
    <PageHeading title="Konten latihan" actions={<Button asChild><Link to="/admin/soal/baru"><Plus />Tambah soal</Link></Button>} />
    <div className="hero-metrics-grid admin-stats">
      <StatTile label="Subtes" value={topics.length} />
      <StatTile label="Paket Soal" value={totalPackages} />
      <StatTile label="Total Soal" value={totalQuestions} />
    </div>
    <Panel>
      <PanelHeader title="Subtes & Paket Soal" />
      <ul>
        {topics.map((topic, idx) => (
          <li
            key={topic.id}
            className="border-b border-[var(--edge)] last:border-b-0 motion-fade-up transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--surface-hover)]"
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div className="flex min-h-14 items-center justify-between gap-4 py-2">
              <div className="grid gap-1">
                <Link className="font-semibold text-[var(--ink)] hover:text-[var(--emerald)] transition-colors" to={`/admin/subtes/${topic.slug}`}>
                  {topic.name}
                </Link>
                <span className="text-xs text-[var(--soft-ink)]">{topic.section === "tps" ? "TPS" : "Literasi"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/subtes/${topic.slug}`}>
                    {topic.packageCount ?? 0} Paket
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/admin/soal?subtes=${topic.slug}`}>
                    {topic.questionCount} Soal
                  </Link>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  </div>;
}
function BankPage() {
  const bank = useLoaderData<Bank>();
  const [params, setParams] = useSearchParams();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "semua") next.delete(key);
    else next.set(key, value);
    if (key !== "halaman") next.delete("halaman");
    if (key === "subtes") {
      next.delete("kategori");
      next.delete("paket");
    }
    setParams(next);
  };
  return (
    <div className={as.bankPage}>
      <PageHeading
        title="Bank soal"
        description={
          <span className="inline-flex items-center gap-2">
            <span>{bank.total} soal</span>
            {isNavigating && <Loader2 className="size-3.5 animate-spin text-[var(--gold)]" />}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/soal/impor"><Upload />Impor JSON</Link>
            </Button>
            <Button asChild>
              <Link to={`/admin/soal/baru?subtes=${params.get("subtes") ?? ""}`}><Plus />Tambah soal</Link>
            </Button>
          </>
        }
      />
      {(params.has("created") || params.has("imported") || params.has("updated") || params.has("deleted")) && (
        <p role="status" className={as.success}>
          {params.has("deleted")
            ? `${params.get("deleted")} soal berhasil dihapus.`
            : params.has("imported")
              ? `${params.get("imported")} soal berhasil diimpor.`
              : "Soal tersimpan."}
        </p>
      )}
      <div className={as.bankFilters}>
        <div className={as.bankFilterField}>
          <span id="subtest-label">Subtes</span>
          <Select value={params.get("subtes") ?? "semua"} onValueChange={(value) => update("subtes", value)}>
            <SelectTrigger aria-labelledby="subtest-label"><SelectValue /></SelectTrigger>
            <SelectContent>
              {bank.tabs.map((tab) => (
                <SelectItem key={tab.slug} value={tab.slug}>
                  {tab.slug === "semua" ? "Semua subtes" : tab.name} ({tab.value})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={as.bankFilterField}>
          <span id="category-label">Kategori materi</span>
          <Select value={params.get("kategori") ?? "semua"} onValueChange={(value) => update("kategori", value)}>
            <SelectTrigger aria-labelledby="category-label"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua kategori</SelectItem>
              {bank.categories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {bank.packages && bank.packages.length > 0 && (
          <div className={as.bankFilterField}>
            <span id="package-label">Paket soal</span>
            <Select value={params.get("paket") ?? "semua"} onValueChange={(value) => update("paket", value)}>
              <SelectTrigger aria-labelledby="package-label"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua paket</SelectItem>
                {bank.packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.name}>{pkg.name} ({pkg.questionCount})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {(params.has("subtes") || params.has("kategori") || params.has("paket")) && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isNavigating}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete("subtes");
              next.delete("kategori");
              next.delete("paket");
              next.delete("halaman");
              setParams(next);
            }}
          >
            Reset filter
          </Button>
        )}
      </div>
      <QuestionBankTable
        key={`${params.get("subtes") ?? ""}:${params.get("kategori") ?? ""}:${params.get("paket") ?? ""}:${bank.page}:${bank.rows.map((row) => row.id).join(",")}`}
        bank={bank}
      />
      <nav className={as.pagination} aria-label="Paginasi bank soal">
        <span className="inline-flex items-center gap-2">
          <span>{bank.total ? `${(bank.page - 1) * 15 + 1}–${Math.min(bank.page * 15, bank.total)} dari ${bank.total} soal` : "0 soal"}</span>
          {isNavigating && <Loader2 className="size-3.5 animate-spin text-[var(--gold)]" />}
        </span>
        <div className={as.paginationActions}>
          <Button
            variant="outline"
            size="sm"
            disabled={bank.page <= 1 || isNavigating}
            onClick={() => update("halaman", String(bank.page - 1))}
          >
            Sebelumnya
          </Button>
          <span>{bank.page} / {bank.pageCount}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={bank.page >= bank.pageCount || isNavigating}
            onClick={() => update("halaman", String(bank.page + 1))}
          >
            Berikutnya
          </Button>
        </div>
      </nav>
    </div>
  );
}
function NewQuestion() { const topics = useLoaderData<Topic[]>(); const [params] = useSearchParams(); return <><PageHeading title="Tambah soal" description="Soal langsung tersedia setelah disimpan." /><QuestionForm topics={topics} initialTopicId={topics.find((topic) => topic.slug === params.get("subtes"))?.id} initialPackageId={params.get("paket") ?? undefined} /></>; }
function ImportPage() { return <><PageHeading title="Impor soal dari JSON" description="Tempel JSON atau unggah file, lalu periksa sebelum mengimpor." /><ImportQuestions /></>; }
function EditQuestion() {
  const { item, topics } = useLoaderData<{ item: QuestionDetail; topics: Topic[] }>();
  return <><PageHeading title="Edit soal" description={`${item.topic} · ${item.category ?? "Tanpa kategori"}`} /><QuestionForm key={item.id} topics={topics} question={item} /></>;
}
function Preview() {
  const item = useLoaderData<QuestionDetail>();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <PageHeading
        title="Pratinjau soal"
        description={`${item.topic} / ${item.category ?? "Tanpa kategori"}`}
        actions={
          <Button asChild variant="outline">
            <Link to={`/admin/soal?subtes=${item.slug}`}><ArrowLeft />Bank soal</Link>
          </Button>
        }
      />
      <Panel className={as.preview}>
        <div className={as.previewHeader}>{item.source}</div>
        <div className={as.previewPrompt}><MathText>{item.prompt}</MathText></div>
        <ol className={as.previewOptions}>
          {item.options.map((option, index) => (
            <li key={index} className={index === item.correctAnswer ? as.correctOption : undefined}>
              <span className={as.optionLetter}>{String.fromCharCode(65 + index)}</span>
              <span className={as.optionText}><MathText>{option}</MathText></span>
              {index === item.correctAnswer && <strong>Kunci jawaban</strong>}
            </li>
          ))}
        </ol>
        <section className={as.previewExplanation}>
          <h2>Pembahasan</h2>
          <MathText>{item.explanation}</MathText>
        </section>
      </Panel>
      <div className={as.previewActions}>
        {item.usage ? (
          <p>Soal sudah dipakai dalam {item.usage} jawaban peserta sehingga tidak dapat diedit atau dihapus.</p>
        ) : (
          <>
            <Button asChild variant="outline">
              <Link to={`/admin/soal/${item.id}/edit`}><Pencil />Edit soal</Link>
            </Button>
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>Hapus soal ini?</span>
                <Button variant="outline" disabled={deleting} onClick={() => setConfirmDelete(false)}>Batal</Button>
                <Button
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    setError("");
                    try {
                      await api(`/admin/questions/${item.id}`, { method: "DELETE" });
                      navigate(`/admin/soal?subtes=${item.slug}&deleted=1`);
                    } catch (error) {
                      setError(error instanceof Error ? error.message : "Gagal hapus.");
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  {deleting ? "Menghapus..." : "Ya, hapus"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                <Trash2 />Hapus soal
              </Button>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </>
  );
}
function NotFound() { return <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-5 px-6 py-12"><h1 className="!mb-0 !text-4xl">Halaman tidak ditemukan</h1><Link to="/">Kembali ke beranda</Link></main>; }
function ErrorPage() { const error = useRouteError(); const revalidator = useRevalidator(); if ((isRouteErrorResponse(error) && error.status === 404) || (error instanceof ApiError && [403, 404].includes(error.status))) return <NotFound />; return <main className="mx-auto grid max-w-xl gap-5 p-12"><h1 className="!text-4xl">Tidak dapat membuka halaman</h1><p role="alert">{error instanceof Error ? error.message : "Halaman tidak ditemukan."}</p><Button onClick={() => revalidator.revalidate()}>Coba lagi</Button><Link to="/">Beranda</Link></main>; }

export const router = createBrowserRouter([
  { path: "/", element: <Home />, errorElement: <ErrorPage /> },
  { path: "/login", element: <Login />, errorElement: <ErrorPage /> },
  { path: "/forbidden", element: <NotFound /> },
  { path: "/dashboard", loader: () => guard("user"), shouldRevalidate: ({ currentUrl, nextUrl, defaultShouldRevalidate }) => {
    if (currentUrl.pathname.startsWith("/dashboard") && nextUrl.pathname.startsWith("/dashboard")) return false;
    return defaultShouldRevalidate;
  }, hydrateFallbackElement: <main className="mx-auto grid min-h-dvh max-w-xl content-center justify-items-center gap-4 px-6 py-12 text-center"><div className="size-8 animate-spin rounded-full border-2 border-[var(--emerald)] border-t-transparent" /><p className="text-[var(--soft-ink)]" role="status">Memuat ruang belajar…</p></main>, element: <LatveriaOSApp />, errorElement: <ErrorPage />, children: [
    { path: "riwayat", loader: () => api<HistoryItem[]>("/learner/history"), element: <HistoryView />, errorElement: <HistoryErrorView /> },
    { path: "riwayat/:id", loader: ({ params }) => api<Result>(`/learner/results/${encodeURIComponent(params.id ?? "")}`), element: <HistoryResultView />, errorElement: <HistoryErrorView /> },
  ] },
  { path: "/practice", element: <Navigate to="/dashboard?tab=practice" replace /> },
  { path: "/library", element: <Navigate to="/dashboard?tab=library" replace /> },
  { path: "/leaderboard", element: <Navigate to="/dashboard?tab=leaderboard" replace /> },
  { path: "/profile", element: <Navigate to="/dashboard?tab=profile" replace /> },
  { path: "/settings", element: <Navigate to="/dashboard?tab=settings" replace /> },
  { path: "/dashboard/topik", element: <Navigate to="/dashboard?tab=practice" replace /> },
  { path: "/dashboard/topik/:slug", element: <Navigate to="/dashboard?tab=practice" replace /> },
  { id: "admin", path: "/admin", loader: () => guard("admin"), shouldRevalidate: ({ currentUrl, nextUrl, defaultShouldRevalidate }) => {
    if (currentUrl.pathname.startsWith("/admin") && nextUrl.pathname.startsWith("/admin")) return false;
    return defaultShouldRevalidate;
  }, hydrateFallbackElement: <main className="mx-auto grid min-h-dvh max-w-xl content-center justify-items-center gap-4 px-6 py-12 text-center"><div className="size-8 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" /><p className="text-[var(--soft-ink)] text-sm font-medium tracking-wide" role="status">Memuat panel admin…</p></main>, element: <AdminLayout />, errorElement: <ErrorPage />, children: [
    { index: true, loader: () => api<Topic[]>("/admin/topics"), element: <AdminSummary /> },
    { path: "subtes/:slug", loader: async ({ params }) => {
      const topics = await api<Topic[]>("/admin/topics");
      const topic = topics.find((t) => t.slug === params.slug || String(t.id) === params.slug);
      if (!topic) throw new Response(null, { status: 404 });
      const initialPackages = await api<QuestionPackage[]>(`/admin/subtests/${topic.slug}/packages`);
      return { topic, initialPackages };
    }, element: <AdminSubtestPackages /> },
    { path: "paket/:packageId", loader: async ({ params }) => {
      const pkg = await api<PackageDetail>(`/admin/packages/${params.packageId}`);
      const otherPackages = (await api<QuestionPackage[]>(`/admin/subtests/${pkg.topicSlug}/packages`)).filter((p) => p.id !== pkg.id);
      return { pkg, otherPackages };
    }, element: <AdminPackageDetail /> },
    { path: "soal", loader: ({ request }) => api<Bank>(`/admin/questions?${new URL(request.url).searchParams}`), element: <BankPage /> },
    { path: "soal/baru", loader: () => api<Topic[]>("/admin/topics"), element: <NewQuestion /> },
    { path: "soal/impor", element: <ImportPage /> },
    { path: "soal/:id/edit", loader: async ({ params }) => {
      const [item, topics] = await Promise.all([api<QuestionDetail>(`/admin/questions/${params.id}`), api<Topic[]>("/admin/topics")]);
      if (item.usage) throw new ApiError(409, "Soal yang sudah digunakan peserta tidak dapat diedit.");
      return { item, topics };
    }, element: <EditQuestion /> },
    { path: "soal/:id", loader: ({ params }) => api<QuestionDetail>(`/admin/questions/${params.id}`), element: <Preview /> },
    { path: "laporan", element: <AdminReports /> },
    { path: "afirmasi", element: <AdminAffirmations /> },
  ] },
  { path: "*", element: <NotFound /> },
]);
