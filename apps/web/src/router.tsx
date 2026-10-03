import { lazy } from "react";
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
} from "@latveria/shared";
import { api, ApiError } from "./lib/api";
import { Login } from "./app/login";
import { AdminSummary } from "./app/admin/admin-summary";
import { BankPage } from "./app/admin/question-bank";
import { QuestionForm } from "./app/admin/question-form";
import { AdminLayout } from "./app/admin/admin-layout";
import { ImportQuestions } from "./app/admin/import-questions";
import { QuestionPreview } from "./app/admin/question-preview";
import { Button } from "./components/ui/button";
import { PageHeading } from "./components/ui/dashboard";
import { HistoryView, HistoryErrorView } from "./views/HistoryView";

const Home = lazy(() => import("./app/landing"));
const LatveriaOSApp = lazy(() =>
  import("./LatveriaOSApp").then((module) => ({ default: module.LatveriaOSApp })),
);
const HistoryResultView = lazy(() =>
  import("./views/HistoryResultView").then((module) => ({ default: module.HistoryResultView })),
);
const AdminSubtestPackages = lazy(() =>
  import("./app/admin/admin-subtest-packages").then((module) => ({
    default: module.AdminSubtestPackages,
  })),
);
const AdminPackageDetail = lazy(() =>
  import("./app/admin/admin-package-detail").then((module) => ({
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
  return (
    <>
      <PageHeading
        title="Edit soal"
        description={`${item.topic} · ${item.category ?? "Tanpa kategori"}`}
      />
      <QuestionForm key={item.id} topics={topics} question={item} />
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
      { path: "laporan", element: <AdminReports /> },
      { path: "afirmasi", element: <AdminAffirmations /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
