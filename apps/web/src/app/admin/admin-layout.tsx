import { Outlet, useLocation, useRouteLoaderData } from "react-router";
import { LayoutDashboard, BookOpen, Plus, Upload } from "lucide-react";
import type { User } from "@latveria/shared";
import { DashboardShell, DashboardSidebar, DashboardHeader, DashboardNavigation, type NavigationItem } from "../../components/ui/dashboard-shell";
import { ThemeToggle } from "../../components/theme-toggle";
import { LogoutButton } from "../../components/logout-button";

const navigation: NavigationItem[] = [
  { id: "summary", label: "Ringkasan", icon: LayoutDashboard, to: "/admin" },
  { id: "questions", label: "Bank soal", icon: BookOpen, to: "/admin/soal" },
  { id: "new", label: "Tambah soal", icon: Plus, to: "/admin/soal/baru" },
  { id: "import", label: "Impor JSON", icon: Upload, to: "/admin/soal/impor" },
];

export function AdminLayout() {
  const user = useRouteLoaderData<User>("admin")!;
  const { pathname } = useLocation();
  const active = [...navigation].reverse().find((item) => pathname === item.to || (item.to !== "/admin" && pathname.startsWith(`${item.to}/`)))?.id ?? "summary";
  const identity = <div className="sidebar-user-dossier"><div className="dossier-name-row"><span className="dossier-name">{user.name}</span><span className="dossier-badge">Admin</span></div><p className="admin-identity-email">{user.email}</p></div>;

  return <DashboardShell
    data-admin
    contentId="admin-content"
    sidebar={<DashboardSidebar home="/admin" identity={identity}><DashboardNavigation items={navigation} active={active} /></DashboardSidebar>}
    header={<DashboardHeader home="/admin"><div className="admin-mobile-logout"><LogoutButton className="header-tool-btn admin-header-logout" /></div><ThemeToggle className="header-tool-btn" /></DashboardHeader>}
    bottomNav={<DashboardNavigation items={navigation} active={active} mobile />}
  ><div className="latveria-view-container admin-view"><Outlet /></div></DashboardShell>;
}
