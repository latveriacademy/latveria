import { lazy, useState } from "react";
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Link,
  Navigate,
  redirect,
  useLoaderData,
  useRevalidator,
  useRouteError,
  useSearchParams,
} from "react-router";
import type {
  Bank,
  QuestionDetail,
  Topic,
  User,
  HistoryItem,
  Result,
  QuestionPackage,
  PackageDetail,
  AdminTryoutSectionDetail,
} from "@latveria/shared";
import { api, ApiError } from "./lib/api";
import { Login } from "./app/login";
import { AdminSummary } from "./app/admin/admin-summary";
import { BankPage } from "./app/admin/soal/question-bank";
import { QuestionForm } from "./app/admin/soal/question-form";
import { QuestionJsonEditor } from "./app/admin/soal/question-json-editor";
import { AdminLayout } from "./app/admin/admin-layout";
import { ImportQuestions } from "./app/admin/import/import-questions";
import { QuestionPreview } from "./app/admin/soal/question-preview";
import { Button } from "./components/ui/button";
import { PageHeading } from "./components/ui/dashboard";
import { HistoryView, HistoryErrorView } from "./views/history/HistoryView";

const Home = lazy(() => import("./app/landing/landing"));
const About = lazy(() => import("./app/landing/about"));
const LatveriaOSApp = lazy(() =>
  import("./LatveriaOSApp").then((module) => ({ default: module.LatveriaOSApp })),
);
const HistoryResultView = lazy(() =>
  import("./views/history/HistoryResultView").then((module) => ({
    default: module.HistoryResultView,
  })),
);
const AdminSubtestPackages = lazy(() =>
  import("./app/admin/packages/admin-subtest-packages").then((module) => ({
    default: module.AdminSubtestPackages,
  })),
);
const AdminPackageDetail = lazy(() =>
  import("./app/admin/packages/admin-package-detail").then((module) => ({
    default: module.AdminPackageDetail,
  })),
);
const AdminReports = lazy(() =>
  import("./app/admin/admin-reports").then((module) => ({ default: module.AdminReports })),
);
const AdminAffirmations = lazy(() =>
  import("./app/admin/admin-affirmations").then((module) => ({
    default: module.AdminAffirmations,
  })),
);
const AdminUsers = lazy(() =>
  import("./app/admin/users/admin-users").then((module) => ({ default: module.AdminUsers })),
);
const AdminAnalytics = lazy(() =>
  import("./app/admin/admin-analytics").then((module) => ({ default: module.AdminAnalytics })),
);
const AdminAuditLog = lazy(() =>
  import("./app/admin/admin-audit-log").then((module) => ({ default: module.AdminAuditLog })),
);
const AdminExport = lazy(() =>
  import("./app/admin/admin-export").then((module) => ({ default: module.AdminExport })),
);
const AdminSystemHealth = lazy(() =>
  import("./app/admin/admin-system-health").then((module) => ({
    default: module.AdminSystemHealth,
  })),
);
const AdminTryouts = lazy(() =>
  import("./app/admin/tryout/admin-tryouts").then((module) => ({
    default: module.AdminTryouts,
  })),
);
const AdminTryoutDetail = lazy(() =>
  import("./app/admin/tryout/admin-tryout-detail").then((module) => ({
    default: module.AdminTryoutDetail,
  })),
);
const AdminIrt = lazy(() =>
  import("./app/admin/admin-irt").then((module) => ({
    default: module.AdminIrt,
  })),
);
const AdminTryoutSection = lazy(() =>
  import("./app/admin/tryout/admin-tryout-section").then((module) => ({
    default: module.AdminTryoutSection,
  })),
);
const TryoutQuestionPreview = lazy(() =>
  import("./app/admin/tryout/tryout-question-preview").then((module) => ({
    default: module.TryoutQuestionPreview,
  })),
);
const TryoutQuestionEditor = lazy(() =>
  import("./app/admin/tryout/tryout-question-editor").then((module) => ({
    default: module.TryoutQuestionEditor,
  })),
);
const TryoutImportPage = lazy(() =>
  import("./app/admin/tryout/tryout-import-page").then((module) => ({
    default: module.TryoutImportPage,
  })),
);
const PassageLibraryPage = lazy(() =>
  import("./app/admin/passage-library").then((module) => ({
    default: module.PassageLibraryPage,
  })),
);
const LibraryAdminPage = lazy(() =>
  import("./app/admin/library/library-page").then((module) => ({
    default: module.LibraryAdminPage,
  })),
);

async function guard(role: "user" | "admin") {
  let user: User;
  try {
    user = await api<User>("/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw redirect("/login");
    throw error;
  }
  if (role === "user" && user.role === "admin") throw redirect("/admin");
  if (role === "admin" && user.role !== "admin") throw new Response(null, { status: 404 });
  return user;
}

function NewQuestion() {
  const topics = useLoaderData<Topic[]>();
  const [params] = useSearchParams();
  return (
    <>
      <PageHeading title="Tambah soal" description="Soal langsung tersedia setelah disimpan." />
      <QuestionForm
        topics={topics}
        initialTopicId={topics.find((topic) => topic.slug === params.get("subtes"))?.id}
        initialPackageId={params.get("paket") ?? undefined}
      />
    </>
  );
}
function ImportPage() {
  return (
    <>
      <PageHeading
        title="Impor soal dari JSON"
        description="Tempel JSON atau unggah file, lalu periksa sebelum mengimpor."
      />
      <ImportQuestions />
    </>
  );
}
function EditQuestion() {
  const { item, topics } = useLoaderData<{ item: QuestionDetail; topics: Topic[] }>();
  const [mode, setMode] = useState<"form" | "json">("form");
  return (
    <>
      <PageHeading
        title="Edit soal"
        description={`${item.topic} · ${item.category ?? "Tanpa kategori"}`}
        actions={
          <div className="flex gap-2" role="group" aria-label="Mode edit">
            <Button
              type="button"
              variant={mode === "form" ? "default" : "outline"}
              aria-pressed={mode === "form"}
              onClick={() => setMode("form")}
            >
              Formulir
            </Button>
            <Button
              type="button"
              variant={mode === "json" ? "default" : "outline"}
              aria-pressed={mode === "json"}
              onClick={() => setMode("json")}
            >
              JSON
            </Button>
          </div>
        }
      />
      {mode === "form" ? (
        <QuestionForm key={item.id} topics={topics} question={item} />
      ) : (
        <QuestionJsonEditor key={item.id} topics={topics} question={item} />
      )}
    </>
  );
}
function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-5 px-6 py-12">
      <h1 className="!mb-0 !text-4xl">Halaman tidak ditemukan</h1>
      <Link to="/">Kembali ke beranda</Link>
    </main>
  );
}
function ErrorPage() {
  const error = useRouteError();
  const revalidator = useRevalidator();
  if (
    (isRouteErrorResponse(error) && error.status === 404) ||
    (error instanceof ApiError && [403, 404].includes(error.status))
  )
    return <NotFound />;
  return (
    <main className="mx-auto grid max-w-xl gap-5 p-12">
      <h1 className="!text-4xl">Tidak dapat membuka halaman</h1>
      <p role="alert">{error instanceof Error ? error.message : "Halaman tidak ditemukan."}</p>
      <Button onClick={() => revalidator.revalidate()}>Coba lagi</Button>
      <Link to="/">Beranda</Link>
    </main>
  );
}
function LoadingPage({ message }: { message: string }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center justify-items-center gap-4 px-6 py-12 text-center">
      <div className="size-8 animate-spin rounded-full border-2 border-[var(--emerald)] border-t-transparent" />
      <p className="text-[var(--soft-ink)]" role="status">
        {message}
      </p>
    </main>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <Home />, errorElement: <ErrorPage /> },
  { path: "/tentang", element: <About />, errorElement: <ErrorPage /> },
  { path: "/login", element: <Login />, errorElement: <ErrorPage /> },
  { path: "/forbidden", element: <NotFound /> },
  {
    path: "/dashboard",
    loader: () => guard("user"),
    shouldRevalidate: ({ currentUrl, nextUrl, defaultShouldRevalidate }) => {
      if (currentUrl.pathname.startsWith("/dashboard") && nextUrl.pathname.startsWith("/dashboard"))
        return false;
      return defaultShouldRevalidate;
    },
    hydrateFallbackElement: <LoadingPage message="Memuat ruang belajar…" />,
    element: <LatveriaOSApp />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "riwayat",
        loader: () => api<HistoryItem[]>("/learner/history"),
        element: <HistoryView />,
        errorElement: <HistoryErrorView />,
      },
      {
        path: "riwayat/:id",
        loader: ({ params }) =>
          api<Result>(`/learner/results/${encodeURIComponent(params.id ?? "")}`),
        element: <HistoryResultView />,
        errorElement: <HistoryErrorView />,
      },
    ],
  },
  { path: "/practice", element: <Navigate to="/dashboard?tab=practice" replace /> },
  { path: "/battle", element: <Navigate to="/dashboard?tab=warrior" replace /> },
  { path: "/library", element: <Navigate to="/dashboard?tab=library" replace /> },
  { path: "/leaderboard", element: <Navigate to="/dashboard?tab=leaderboard" replace /> },
  { path: "/profile", element: <Navigate to="/dashboard?tab=profile" replace /> },
  { path: "/settings", element: <Navigate to="/dashboard?tab=settings" replace /> },
  { path: "/dashboard/topik", element: <Navigate to="/dashboard?tab=practice" replace /> },
  { path: "/dashboard/topik/:slug", element: <Navigate to="/dashboard?tab=practice" replace /> },

  {
    id: "admin",
    path: "/admin",
    loader: () => guard("admin"),
    shouldRevalidate: ({ currentUrl, nextUrl, defaultShouldRevalidate }) => {
      if (currentUrl.pathname.startsWith("/admin") && nextUrl.pathname.startsWith("/admin"))
        return false;
      return defaultShouldRevalidate;
    },
    hydrateFallbackElement: <LoadingPage message="Memuat panel admin…" />,
    element: <AdminLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, loader: () => api<Topic[]>("/admin/topics"), element: <AdminSummary /> },
      {
        path: "subtes/:slug",
        loader: async ({ params }) => {
          const topics = await api<Topic[]>("/admin/topics");
          const topic = topics.find(
            (item) => item.slug === params.slug || String(item.id) === params.slug,
          );
          if (!topic) throw new Response(null, { status: 404 });
          const initialPackages = await api<QuestionPackage[]>(
            `/admin/subtests/${topic.slug}/packages`,
          );
          return { topic, initialPackages };
        },
        element: <AdminSubtestPackages />,
      },
      {
        path: "paket/:packageId",
        loader: async ({ params }) => {
          const pkg = await api<PackageDetail>(`/admin/packages/${params.packageId}`);
          const otherPackages = (
            await api<QuestionPackage[]>(`/admin/subtests/${pkg.topicSlug}/packages`)
          ).filter((item) => item.id !== pkg.id);
          return { pkg, otherPackages };
        },
        element: <AdminPackageDetail />,
      },
      { path: "tryouts", element: <AdminTryouts /> },
      { path: "tryouts/kalibrasi", element: <AdminIrt /> },
      { path: "tryouts/:id", element: <AdminTryoutDetail /> },
      {
        path: "tryouts/:id/subtes/:sectionId",
        loader: ({ params }) =>
          api<AdminTryoutSectionDetail>(`/admin/tryouts/${params.id}/sections/${params.sectionId}`),
        element: <AdminTryoutSection />,
      },
      {
        path: "tryouts/:id/subtes/:sectionId/soal/:questionId",
        loader: async ({ params }) => {
          const detail = await api<AdminTryoutSectionDetail>(
            `/admin/tryouts/${params.id}/sections/${params.sectionId}`,
          );
          const question = detail.section.questions.find((q) => q.id === params.questionId);
          if (!question) throw new Response(null, { status: 404 });
          return { ...detail, question };
        },
        element: <TryoutQuestionPreview />,
      },
      {
        path: "tryouts/:id/subtes/:sectionId/soal/:questionId/edit",
        loader: async ({ params }) => {
          const detail = await api<AdminTryoutSectionDetail>(
            `/admin/tryouts/${params.id}/sections/${params.sectionId}`,
          );
          const question = detail.section.questions.find((q) => q.id === params.questionId);
          if (!question) throw new Response(null, { status: 404 });
          return { ...detail, question };
        },
        element: <TryoutQuestionEditor />,
      },
      {
        path: "tryouts/:id/impor",
        loader: ({ params }) => api(`/admin/tryouts/${params.id}`),
        element: <TryoutImportPage />,
      },
      {
        path: "soal",
        loader: ({ request }) => api<Bank>(`/admin/questions?${new URL(request.url).searchParams}`),
        element: <BankPage />,
      },
      { path: "soal/baru", loader: () => api<Topic[]>("/admin/topics"), element: <NewQuestion /> },
      { path: "soal/impor", element: <ImportPage /> },
      {
        path: "soal/:id/edit",
        loader: async ({ params }) => {
          const [item, topics] = await Promise.all([
            api<QuestionDetail>(`/admin/questions/${params.id}`),
            api<Topic[]>("/admin/topics"),
          ]);
          return { item, topics };
        },
        element: <EditQuestion />,
      },
      {
        path: "soal/:id",
        loader: ({ params }) => api<QuestionDetail>(`/admin/questions/${params.id}`),
        element: <QuestionPreview />,
      },
      { path: "passages", element: <PassageLibraryPage /> },
      { path: "library", element: <LibraryAdminPage /> },
      { path: "laporan", element: <AdminReports /> },
      { path: "afirmasi", element: <AdminAffirmations /> },
      { path: "users", element: <AdminUsers /> },
      { path: "analytics", element: <AdminAnalytics /> },
      { path: "audit", element: <AdminAuditLog /> },
      { path: "export", element: <AdminExport /> },
      { path: "system", element: <AdminSystemHealth /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
