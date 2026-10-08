import { useCallback, useState } from "react";
import { Outlet, useLocation, useNavigation, useRouteLoaderData } from "react-router";
import {
  LayoutDashboard,
  BookOpen,
  AlertCircle,
  MessageSquareQuote,
  Loader2,
  Users,
  BarChart3,
  FileText,
  Activity,
  Download,
  Trophy,
  Menu,
} from "lucide-react";
import type { User } from "@latveria/shared";
import {
  DashboardShell,
  DashboardSidebar,
  DashboardHeader,
  DashboardNavigation,
  type NavigationItem,
} from "../../components/ui/dashboard-shell";
import { ThemeToggle } from "../../components/theme-toggle";
import { LogoutButton } from "../../components/logout-button";

const navigation: NavigationItem[] = [
  { id: "summary", label: "Ringkasan", icon: LayoutDashboard, to: "/admin" },
  { id: "tryouts", label: "Tryout", icon: Trophy, to: "/admin/tryouts" },
  { id: "questions", label: "Bank soal", icon: BookOpen, to: "/admin/soal" },
  { id: "reports", label: "Laporan soal", icon: AlertCircle, to: "/admin/laporan" },
  { id: "affirmations", label: "Afirmasi", icon: MessageSquareQuote, to: "/admin/afirmasi" },
  { id: "users", label: "User", icon: Users, to: "/admin/users" },
  { id: "analytics", label: "Analytics", icon: BarChart3, to: "/admin/analytics" },
  { id: "audit", label: "Log Aktivitas", icon: FileText, to: "/admin/audit" },
  { id: "export", label: "Ekspor", icon: Download, to: "/admin/export" },
  { id: "system", label: "Sistem", icon: Activity, to: "/admin/system" },
];

export function AdminLayout() {
  const user = useRouteLoaderData<User>("admin")!;
  const { pathname } = useLocation();
  const navigationState = useNavigation();

  // Sidebar toggle state - default terbuka di desktop (>768px), tertutup di mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (window.innerWidth <= 768) return false;
    const saved = localStorage.getItem("latveria_admin_sidebar");
    if (saved !== null) return saved === "true";
    return window.innerWidth > 768;
  });

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("latveria_admin_sidebar", String(next));
      return next;
    });
  }, []);

  const isNavigating = navigationState.state !== "idle";
  // Responsive target pathname for instant tab highlight on click
  const targetPath = navigationState.location?.pathname ?? pathname;
  const active =
    [...navigation]
      .reverse()
      .find(
        (item) =>
          targetPath === item.to || (item.to !== "/admin" && targetPath.startsWith(`${item.to}/`)),
      )?.id ?? "summary";

  return (
    <DashboardShell
      data-admin
      contentId="admin-content"
      sidebarOpen={sidebarOpen}
      onCloseSidebar={toggleSidebar}
      sidebar={
        <DashboardSidebar home="/admin" collapsed={!sidebarOpen}>
          <DashboardNavigation items={navigation} active={active} />
          <div className="sidebar-profile-section">
            <div className="admin-user-info">
              <span className="dossier-name">{user.name}</span>
              <span className="dossier-badge">Admin</span>
            </div>
            <p className="admin-identity-email">{user.email}</p>
            <LogoutButton className="nav-button sidebar-logout-btn" />
          </div>
        </DashboardSidebar>
      }
      header={
        <DashboardHeader home="/admin" onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen}>
          <div className="admin-mobile-logout">
            <LogoutButton className="header-tool-btn admin-header-logout" />
          </div>
          <ThemeToggle className="header-tool-btn" />
        </DashboardHeader>
      }
      bottomNav={
        <DashboardNavigation
          items={[
            ...navigation.filter((item) =>
              ["summary", "tryouts", "questions", "users"].includes(item.id),
            ),
            { id: "menu", label: "Menu", icon: Menu },
          ]}
          active={["summary", "tryouts", "questions", "users"].includes(active) ? active : "menu"}
          onSelect={() => setSidebarOpen(true)}
          mobile
        />
      }
    >
      {isNavigating && (
        <>
          <div
            className="fixed top-0 left-0 right-0 z-50 h-1 bg-[var(--gold)]/20 overflow-hidden"
            role="progressbar"
            aria-label="Memuat halaman admin"
          >
            <div className="h-full bg-[var(--gold)] w-full animate-[progress_1s_ease-in-out_infinite] origin-left shadow-[0_0_8px_var(--gold)]" />
          </div>
          <div
            className="fixed top-3.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--gold)]/50 shadow-2xl text-[var(--ink)] text-xs font-mono tracking-wider backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-3.5 animate-spin text-[var(--gold)]" />
            <span className="font-semibold text-[11px]">MEMUAT DATA…</span>
          </div>
        </>
      )}
      <div
        key={pathname}
        className={`latveria-view-container admin-view motion-page-enter ${isNavigating ? "opacity-60 transition-opacity duration-150" : ""}`}
      >
        {isNavigating && (
          <p className="sr-only" role="status">
            Memuat…
          </p>
        )}
        <Outlet />
      </div>
    </DashboardShell>
  );
}
