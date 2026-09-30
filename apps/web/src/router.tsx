import { lazy, useState } from "react";
import { createBrowserRouter, Link, Navigate, Outlet, redirect, useLoaderData, useNavigate, useRevalidator, useRouteError, useRouteLoaderData, useSearchParams, useLocation } from "react-router";
import { ArrowLeft, Plus, Upload, Trash2, Pencil } from "lucide-react";
import { credentialsSchema, signupSchema, submissionSchema, type Bank, type HistoryItem, type PracticeQuestion, type QuestionDetail, type Result, type Topic, type User } from "@latveria/shared";
import { api, ApiError } from "./lib/api";
import { authClient } from "./lib/auth-client";
import { TopicList } from "./app/dashboard/topic-list";
import { QuestionForm } from "./app/admin/question-form";
import { ImportQuestions } from "./app/admin/import-questions";
import { Button } from "./components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import ds from "./app/dashboard/dashboard.module.css";
import as from "./app/admin/admin.module.css";
import logo from "../../../latveria.webp";

const Home = lazy(() => import("./app/landing"));
const QuestionFlow = lazy(() => import("./app/dashboard/question-flow").then((module) => ({ default: module.QuestionFlow })));
const MathText = lazy(() => import("./components/math-text").then((module) => ({ default: module.MathText })));
const QuestionBankTable = lazy(() => import("./app/admin/question-bank-table").then((module) => ({ default: module.QuestionBankTable })));

async function guard(role: "user" | "admin") {
  let user: User;
  try { user = await api<User>("/me"); } catch (error) { if (error instanceof ApiError && error.status === 401) throw redirect("/login"); throw error; }
  if (role === "user" && user.role === "admin") throw redirect("/admin");
  if (role === "admin" && user.role !== "admin") throw redirect("/forbidden");
  return user;
}
function Logout() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  return <><button type="button" onClick={async () => { try { const result = await authClient.signOut(); if (result.error) throw Error(); navigate("/login"); } catch { setError("Gagal keluar. Coba lagi."); } }}>Keluar</button>{error && <p role="alert">{error}</p>}</>;
}
function UserLayout() {
  const user = useRouteLoaderData<User>("learner")!;
  const location = useLocation();
  const links = [["/dashboard", "Beranda"], ["/dashboard/topik", "Latihan"], ["/dashboard/riwayat", "Riwayat"]];
  return <div className={ds.shell} data-dashboard><a className="skip-link" href="#konten">Lewati navigasi</a><aside className={ds.sidebar}><Link to="/dashboard" className={ds.brand}><img src={logo} width={34} height={34} alt="" />latveria</Link><nav aria-label="Navigasi dashboard">{links.map(([to, label]) => <Link key={to} to={to} aria-current={(to === "/dashboard" ? location.pathname === to : location.pathname.startsWith(to)) ? "page" : undefined} className={(to === "/dashboard" ? location.pathname === to : location.pathname.startsWith(to)) ? ds.active : undefined}>{label}</Link>)}</nav><div className={ds.sidebarBottom}><div className={ds.identity}><span className={ds.avatar}>{user.name[0]}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><Logout /></div></aside><main className={ds.main} id="konten"><header className={ds.topbar}><span>Ruang belajar</span><span className={ds.topbarContext}>Latihan UTBK</span></header><div className={ds.content}><Outlet /></div></main></div>;
}
function AdminLayout() {
  const user = useRouteLoaderData<User>("admin")!;
  const location = useLocation();
  return <div className={as.shell} data-admin><a className="skip-link" href="#admin-content">Lewati navigasi</a><aside className={as.sidebar}><Link to="/admin" className={as.brand}><img src={logo} width={34} height={34} alt="" />latveria <span>admin</span></Link><nav aria-label="Navigasi admin">{[["/admin", "Ringkasan"], ["/admin/soal", "Bank soal"], ["/admin/soal/baru", "Tambah soal"], ["/admin/soal/impor", "Impor JSON"]].map(([to, label]) => <Link key={to} to={to} className={location.pathname === to ? as.active : undefined} aria-current={location.pathname === to ? "page" : undefined}>{label}</Link>)}</nav><div className={as.sidebarBottom}><span className={as.identity}>{user.name}</span><Logout /></div></aside><main id="admin-content" className={as.main}><Outlet /></main></div>;
}
function Login() {
  const navigate = useNavigate();
  const [register, setRegister] = useState(false), [error, setError] = useState(""), [pending, setPending] = useState(false);
  return <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 px-6 py-12"><Link to="/" className="text-xl font-bold">Latveria</Link><h1 className="!mb-0 !text-5xl">Masuk ruang belajar</h1><form className="grid gap-4 border border-[var(--rule)] bg-[var(--paper-light)] p-6" onSubmit={async (event) => {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); const body = { email: String(form.get("email")), password: String(form.get("password")), name: String(form.get("name") ?? "") };
    const parsed = (register ? signupSchema : credentialsSchema).safeParse(body); if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true); try { const result = register ? await authClient.signUp.email(body) : await authClient.signIn.email(body); if (result.error) throw new Error(register ? "Pendaftaran gagal." : "Email atau kata sandi tidak cocok."); const user = await api<User>("/me"); navigate(user.role === "admin" ? "/admin" : "/dashboard"); } catch (error) { setError(error instanceof Error ? error.message : "Gagal masuk."); } finally { setPending(false); }
  }}>{register && <label className="grid gap-1">Nama<input className="min-h-11 border border-[var(--rule)] px-3" name="name" required autoComplete="name" /></label>}<label className="grid gap-1">Email<input className="min-h-11 border border-[var(--rule)] px-3" name="email" type="email" required autoComplete="email" /></label><label className="grid gap-1">Kata sandi<input className="min-h-11 border border-[var(--rule)] px-3" name="password" type="password" required autoComplete={register ? "new-password" : "current-password"} /></label>{error && <p role="alert">{error}</p>}<Button disabled={pending}>{pending ? "Memproses..." : register ? "Daftar" : "Masuk"}</Button>{import.meta.env.DEV && <Button variant="ghost" type="button" onClick={() => setRegister(!register)}>{register ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar lokal"}</Button>}</form></main>;
}
type DashboardData = { catalog: Topic[]; history: HistoryItem[]; summary: { attempts: number; tried: number; correct: number; answered: number } };
function Dashboard() {
  const { catalog, history, summary } = useLoaderData<DashboardData>();
  const recommended = history[0] ? { slug: history[0].slug, name: history[0].topic } : catalog.find((topic) => topic.questionCount);
  return <section className={ds.home}><div className={ds.pageHeading}><h1>Latihan</h1><p>Latihan per subtes UTBK-SNBT dengan soal contoh.</p></div><div className={ds.homeColumns}><div className={ds.homeMain}>{recommended && <section className={ds.continueCard}><div className={ds.continueCopy}><span>{history.length ? "Subtes terakhir" : "Mulai dari sini"}</span><h2>{recommended.name}</h2><p>Kerjakan soal, lalu tinjau pembahasannya.</p></div><Link className={ds.primary} to={`/dashboard/topik/${recommended.slug}`}>{history.length ? "Latihan lagi" : "Mulai latihan"}</Link></section>}<dl className={ds.quickStats}><div><dt>Sesi selesai</dt><dd>{summary.attempts}</dd></div><div><dt>Soal dikerjakan</dt><dd>{summary.answered}</dd></div></dl><div className={ds.listHeading}><h2>Pilih subtes</h2><Link to="/dashboard/topik">Lihat semua</Link></div><TopicList items={catalog} /></div><aside className={ds.progressPanel}><h2>Progres belajar</h2><div className={ds.progressMain}><span className={ds.progressValue}>{summary.answered ? `${Math.round(summary.correct / summary.answered * 100)}%` : "Belum ada"}</span><span>Akurasi latihan</span><p>{summary.correct} dari {summary.answered} soal dijawab benar.</p></div><dl className={ds.progressDetails}><div><dt>Subtes dicoba</dt><dd>{summary.tried}</dd></div><div><dt>Latihan selesai</dt><dd>{summary.attempts}</dd></div></dl><Link to="/dashboard/riwayat">Buka riwayat</Link></aside></div></section>;
}
function Topics() { const items = useLoaderData<Topic[]>(); return <section className={ds.page}><div className={ds.pageHeading}><h1>Subtes UTBK-SNBT</h1><p>Pilih subtes untuk mengerjakan soal contoh.</p></div><TopicList items={items} /></section>; }
function Practice() {
  const { topic, items } = useLoaderData<{ topic: Topic; items: PracticeQuestion[] }>();
  const navigate = useNavigate();
  return <section className={ds.practice}><Link to="/dashboard/topik">← Subtes</Link><h1>{topic.name}</h1><p>{items.length} soal</p><QuestionFlow key={topic.id} mode="attempt" items={items} action={async (form) => {
    const answers = Object.fromEntries(items.flatMap((item) => { const value = form.get(`answer-${item.id}`); return value !== null && value !== "" ? [[item.id, Number(value)]] : []; }));
    const parsed = submissionSchema.parse({ answers }); const result = await api<{ id: string }>(`/learner/practice/${topic.slug}`, { method: "POST", body: JSON.stringify(parsed) }); navigate(`/dashboard/riwayat/${result.id}`);
  }} /></section>;
}
function History() { const items = useLoaderData<HistoryItem[]>(); return <section className={ds.page}><div className={ds.pageHeading}><h1>Riwayat</h1><p>Hasil latihan yang sudah dikumpulkan.</p></div>{items.length ? <ul className={ds.rows}>{items.map((item) => <li key={item.id}><Link to={`/dashboard/riwayat/${item.id}`}><span><strong>{item.topic}</strong><small>{new Date(item.submittedAt).toLocaleString("id-ID")}</small></span><strong>{item.correct}/{item.total}</strong></Link></li>)}</ul> : <div className={ds.empty}>Belum ada latihan. <Link to="/dashboard/topik">Mulai latsol</Link></div>}</section>; }
function Review() { const { attempt, answers } = useLoaderData<Result>(); return <section className={ds.result}><Link to="/dashboard/riwayat">← Riwayat</Link><h1>{attempt.topic}</h1><p className={ds.score}>{attempt.correct} dari {attempt.total} benar</p><QuestionFlow key={attempt.id} mode="review" items={answers} current={0} backHref="/dashboard/riwayat" /></section>; }
function AdminSummary() { const topics = useLoaderData<Topic[]>(); return <><header className={as.pageHeader}><div><h1>Konten latihan</h1><p>{topics.length} subtes, {topics.reduce((sum, topic) => sum + topic.questionCount, 0)} soal</p></div><Button asChild><Link to="/admin/soal/baru"><Plus />Tambah soal</Link></Button></header><section className={as.summary}><h2>Soal per subtes</h2><ul>{topics.map((topic) => <li key={topic.id} className="border-b border-[var(--edge)]"><Link className="flex min-h-12 items-center justify-between" to={`/admin/soal?subtes=${topic.slug}`}><span>{topic.name}</span><strong>{topic.questionCount} soal</strong></Link></li>)}</ul></section></>; }
function BankPage() {
  const bank = useLoaderData<Bank>(); const [params, setParams] = useSearchParams();
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value === "semua") next.delete(key); else next.set(key, value); if (key !== "halaman") next.delete("halaman"); if (key === "subtes") next.delete("kategori"); setParams(next); };
  return <>
    <header className={as.pageHeader}><div><h1>Bank soal</h1><p>{bank.total} soal</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/admin/soal/impor"><Upload />Impor JSON</Link></Button><Button asChild><Link to={`/admin/soal/baru?subtes=${params.get("subtes") ?? ""}`}><Plus />Tambah soal</Link></Button></div></header>
    {(params.has("created") || params.has("imported") || params.has("updated") || params.has("deleted")) && <p role="status" className={as.success}>{params.has("deleted") ? `${params.get("deleted")} soal berhasil dihapus.` : params.has("imported") ? `${params.get("imported")} soal berhasil diimpor.` : "Soal tersimpan."}</p>}
    <Tabs value={params.get("subtes") ?? "semua"} onValueChange={(value) => update("subtes", value)}><TabsList aria-label="Subtes bank soal" className="flex h-auto max-w-full flex-wrap justify-start">{bank.tabs.map((tab) => <TabsTrigger key={tab.slug} value={tab.slug}>{tab.name}<span>{tab.value}</span></TabsTrigger>)}</TabsList></Tabs>
    <div className={as.filter}><span id="category-label">Kategori materi</span><Select value={params.get("kategori") ?? "semua"} onValueChange={(value) => update("kategori", value)}><SelectTrigger aria-labelledby="category-label" className="max-w-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua kategori</SelectItem>{bank.categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
    <QuestionBankTable key={`${params.get("subtes") ?? ""}:${params.get("kategori") ?? ""}:${bank.page}:${bank.rows.map((row) => row.id).join(",")}`} bank={bank} />
    <nav className={as.pagination} aria-label="Paginasi bank soal"><span>{bank.total ? `${(bank.page - 1) * 15 + 1}-${Math.min(bank.page * 15, bank.total)} dari ${bank.total}` : "0 soal"}</span><Button variant="outline" disabled={bank.page <= 1} onClick={() => update("halaman", String(bank.page - 1))}>Sebelumnya</Button><span>Halaman {bank.page} dari {bank.pageCount}</span><Button variant="outline" disabled={bank.page >= bank.pageCount} onClick={() => update("halaman", String(bank.page + 1))}>Berikutnya</Button></nav>
  </>;
}
function NewQuestion() { const topics = useLoaderData<Topic[]>(); const [params] = useSearchParams(); return <><header className={as.pageHeader}><div><h1>Tambah soal</h1><p>Soal langsung tersedia setelah disimpan.</p></div></header><QuestionForm topics={topics} initialTopicId={topics.find((topic) => topic.slug === params.get("subtes"))?.id} /></>; }
function ImportPage() { return <><header className={as.pageHeader}><div><h1>Impor soal dari JSON</h1><p>Unggah soal per subtes dan kategori sekaligus.</p></div></header><ImportQuestions /></>; }
function EditQuestion() {
  const { item, topics } = useLoaderData<{ item: QuestionDetail; topics: Topic[] }>();
  return <><header className={as.pageHeader}><div><h1>Edit soal</h1><p>{item.topic} · {item.category ?? "Tanpa kategori"}</p></div></header><QuestionForm key={item.id} topics={topics} question={item} /></>;
}
function Preview() {
  const item = useLoaderData<QuestionDetail>(); const navigate = useNavigate(); const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  return <><header className={as.pageHeader}><div><p>{item.topic} / {item.category ?? "Tanpa kategori"}</p><h1>Pratinjau soal</h1></div><Button asChild variant="outline"><Link to={`/admin/soal?subtes=${item.slug}`}><ArrowLeft />Bank soal</Link></Button></header><article className={as.preview}><div className={as.previewHeader}>{item.source}</div><div className={as.previewPrompt}><MathText>{item.prompt}</MathText></div><ol className={as.previewOptions}>{item.options.map((option, index) => <li key={index} className={index === item.correctAnswer ? as.correctOption : undefined}><span className={as.optionLetter}>{String.fromCharCode(65 + index)}</span><span className={as.optionText}><MathText>{option}</MathText></span>{index === item.correctAnswer && <strong>Kunci jawaban</strong>}</li>)}</ol><section className={as.previewExplanation}><h2>Pembahasan</h2><MathText>{item.explanation}</MathText></section></article><div className={as.previewActions}>{item.usage ? <p>Soal sudah dipakai dalam {item.usage} jawaban peserta sehingga tidak dapat diedit atau dihapus.</p> : <><Button asChild variant="outline"><Link to={`/admin/soal/${item.id}/edit`}><Pencil />Edit soal</Link></Button>{confirmDelete ? <div className="flex flex-wrap items-center gap-2"><span>Hapus soal ini?</span><Button variant="outline" onClick={() => setConfirmDelete(false)}>Batal</Button><Button onClick={async () => { try { await api(`/admin/questions/${item.id}`, { method: "DELETE" }); navigate(`/admin/soal?subtes=${item.slug}`); } catch (error) { setError(error instanceof Error ? error.message : "Gagal hapus."); } }}><Trash2 />Ya, hapus</Button></div> : <Button variant="outline" onClick={() => setConfirmDelete(true)}><Trash2 />Hapus soal</Button>}</>}{error && <p role="alert">{error}</p>}</div></>;
}
function ErrorPage() { const error = useRouteError(); const revalidator = useRevalidator(); return <main className="mx-auto grid max-w-xl gap-5 p-12"><h1 className="!text-4xl">Tidak dapat membuka halaman</h1><p role="alert">{error instanceof Error ? error.message : "Halaman tidak ditemukan."}</p><Button onClick={() => revalidator.revalidate()}>Coba lagi</Button><Link to="/">Beranda</Link></main>; }

export const router = createBrowserRouter([
  { path: "/", element: <Home />, errorElement: <ErrorPage /> },
  { path: "/login", element: <Login />, errorElement: <ErrorPage /> },
  { path: "/forbidden", element: <main className="p-12"><h1 className="!text-4xl">Akses khusus admin</h1><Link to="/dashboard">Dashboard</Link></main> },
  { id: "learner", path: "/dashboard", loader: () => guard("user"), hydrateFallbackElement: <p className="p-6" role="status">Memuat ruang belajar...</p>, element: <UserLayout />, errorElement: <ErrorPage />, children: [
    { index: true, loader: async () => { await guard("user"); const [catalog, history, summary] = await Promise.all([api<Topic[]>("/learner/topics"), api<HistoryItem[]>("/learner/history"), api<DashboardData["summary"]>("/learner/summary")]); return { catalog, history, summary }; }, element: <Dashboard /> },
    { path: "topik", loader: () => api<Topic[]>("/learner/topics"), element: <Topics /> },
    { path: "topik/:slug", loader: ({ params }) => api(`/learner/practice/${params.slug}`), element: <Practice /> },
    { path: "riwayat", loader: () => api<HistoryItem[]>("/learner/history"), element: <History /> },
    { path: "riwayat/:id", loader: ({ params }) => api<Result>(`/learner/results/${params.id}`), element: <Review /> },
  ] },
  { id: "admin", path: "/admin", loader: () => guard("admin"), hydrateFallbackElement: <p className="p-6" role="status">Memuat panel admin...</p>, element: <AdminLayout />, errorElement: <ErrorPage />, children: [
    { index: true, loader: () => api<Topic[]>("/admin/topics"), element: <AdminSummary /> },
    { path: "soal", loader: ({ request }) => api<Bank>(`/admin/questions?${new URL(request.url).searchParams}`), element: <BankPage /> },
    { path: "soal/baru", loader: () => api<Topic[]>("/admin/topics"), element: <NewQuestion /> },
    { path: "soal/impor", element: <ImportPage /> },
    { path: "soal/:id/edit", loader: async ({ params }) => {
      const [item, topics] = await Promise.all([api<QuestionDetail>(`/admin/questions/${params.id}`), api<Topic[]>("/admin/topics")]);
      if (item.usage) throw new ApiError(409, "Soal yang sudah digunakan peserta tidak dapat diedit.");
      return { item, topics };
    }, element: <EditQuestion /> },
    { path: "soal/:id", loader: ({ params }) => api<QuestionDetail>(`/admin/questions/${params.id}`), element: <Preview /> },
  ] },
  { path: "*", element: <Navigate to="/" replace /> },
]);
