import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Link } from "react-router";
import { Clock, Menu, type LucideIcon } from "lucide-react";
import { Brand } from "./dashboard";
import { cn } from "../../lib/utils";

export function DashboardShell({
  sidebar,
  header,
  bottomNav,
  children,
  overlays,
  className,
  immersive = false,
  sidebarOpen = true,
  onCloseSidebar,
  contentId = "main-content-scroll",
  ...props
}: ComponentProps<"div"> & {
  sidebar?: ReactNode;
  header?: ReactNode;
  bottomNav?: ReactNode;
  overlays?: ReactNode;
  immersive?: boolean;
  sidebarOpen?: boolean;
  onCloseSidebar?: () => void;
  contentId?: string;
}) {
  return (
    <div className={cn("latveria-app-shell motion-fade-in", className)} {...props}>
      <a className="skip-link" href={`#${contentId}`}>
        Lewati navigasi
      </a>
      {sidebar}
      {sidebarOpen && onCloseSidebar && (
        <div
          className="sidebar-mobile-backdrop transition-opacity duration-200 ease-out"
          onClick={onCloseSidebar}
          aria-hidden="true"
        />
      )}
      <div
        className={`latveria-main-viewport ${immersive ? "in-exam-mode" : ""} ${!sidebarOpen ? "sidebar-collapsed" : ""}`}
      >
        {header}
        <main className="latveria-content-scroll motion-fade-up" id={contentId}>
          {children}
        </main>
        {bottomNav}
      </div>
      {overlays}
    </div>
  );
}

export function DashboardSidebar({
  home,
  children,
  collapsed = false,
}: {
  home: string;
  children: ReactNode;
  collapsed?: boolean;
}) {
  return (
    <aside
      className={`latveria-sidebar motion-slide-in-left${collapsed ? " sidebar-is-collapsed" : ""}`}
      aria-label="Navigasi utama"
      aria-hidden={collapsed}
      inert={collapsed}
    >
      <div className="sidebar-brand-wrapper">
        <Brand to={home} />
      </div>
      <div className="sidebar-scrollable-content">{children}</div>
    </aside>
  );
}

export type NavigationItem = { id: string; label: string; icon: LucideIcon; to?: string };

function NavigationAction({
  item,
  active,
  onSelect,
  mobile,
}: {
  item: NavigationItem;
  active: boolean;
  onSelect?: (id: string) => void;
  mobile: boolean;
}) {
  const Icon = item.icon;
  const className = `${mobile ? "bottom-nav-btn" : "nav-button"} ${active ? "active" : ""} transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.015] active:scale-[0.98]`;
  const content = mobile ? (
    <>
      <div className="bottom-icon-wrapper transition-transform duration-150">
        <Icon
          size={19}
          strokeWidth={active ? 2.3 : 1.7}
          className={
            active
              ? "scale-110 transition-transform duration-150"
              : "transition-transform duration-150"
          }
        />
        {active && <span className="bottom-active-dot motion-scale-in" />}
      </div>
      <span className="bottom-label">{item.label}</span>
    </>
  ) : (
    <>
      <span className="nav-icon-wrap transition-transform duration-150 group-hover:scale-110">
        <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
      </span>
      <div className="nav-label-box">
        <span className="nav-main-label">{item.label}</span>
      </div>
      {active && <span className="nav-active-pip motion-scale-in" />}
    </>
  );
  const props = {
    className,
    id: `${mobile ? "mobile-nav" : "nav-btn"}-${item.id}`,
    "aria-current": active ? ("page" as const) : undefined,
  };
  return item.to ? (
    <Link to={item.to} {...props}>
      {content}
    </Link>
  ) : (
    <button type="button" {...props} onClick={() => onSelect?.(item.id)}>
      {content}
    </button>
  );
}

export function DashboardNavigation({
  items,
  active,
  onSelect,
  mobile = false,
}: {
  items: NavigationItem[];
  active: string;
  onSelect?: (id: string) => void;
  mobile?: boolean;
}) {
  if (mobile)
    return (
      <nav className="latveria-bottom-nav motion-fade-down" aria-label="Navigasi utama">
        <div className="bottom-nav-inner">
          {items.map((item) => (
            <NavigationAction
              key={item.id}
              item={item}
              active={active === item.id}
              onSelect={onSelect}
              mobile
            />
          ))}
        </div>
      </nav>
    );
  return (
    <nav className="sidebar-nav" aria-label="Navigasi utama">
      <ul className="nav-list">
        {items.map((item) => (
          <li key={item.id} className="nav-item">
            <NavigationAction
              item={item}
              active={active === item.id}
              onSelect={onSelect}
              mobile={false}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function DashboardHeader({
  home = "/",
  children,
  onToggleSidebar,
  sidebarOpen = true,
}: {
  home?: string;
  children: ReactNode;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const showBrand = !sidebarOpen || !onToggleSidebar;
  return (
    <header
      className={`latveria-header-bar motion-fade-down${showBrand ? " header-brand-present" : ""}`}
    >
      <div className="header-left-group">
        {onToggleSidebar && (
          <button
            type="button"
            id="header-sidebar-toggle-btn"
            className="header-tool-btn sidebar-toggle-in-header transition-transform duration-150 hover:scale-105 active:scale-95"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
            title={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
          >
            <Menu size={17} />
          </button>
        )}
        {/* Logo header: navigasi ke home/landing page */}
        <div
          className={`header-brand-slot${sidebarOpen ? " header-brand-hidden" : " header-brand-visible"}`}
        >
          <Brand to={home} className="header-brand" />
        </div>
      </div>
      <div className="header-meta-group">
        <div className="live-clock-panel font-mono">
          <Clock size={13} className="text-gold" />
          <span className="clock-date">
            {now
              .toLocaleDateString("id-ID", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              })
              .toUpperCase()}
          </span>
          <span className="divider-slash">/</span>
          <span className="clock-digits">
            {now.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
              timeZone: "Asia/Jakarta",
            })}
          </span>
          <span className="timezone-tag">WIB</span>
        </div>
      </div>
      <div className="header-actions-group">{children}</div>
    </header>
  );
}
