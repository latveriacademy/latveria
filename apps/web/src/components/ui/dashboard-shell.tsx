import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Link } from "react-router";
import { Clock, type LucideIcon } from "lucide-react";
import { Brand } from "./dashboard";
import { LogoutButton } from "../logout-button";
import { cn } from "../../lib/utils";

export function DashboardShell({ sidebar, header, bottomNav, children, overlays, className, immersive = false, contentId = "main-content-scroll", ...props }: ComponentProps<"div"> & { sidebar?: ReactNode; header?: ReactNode; bottomNav?: ReactNode; overlays?: ReactNode; immersive?: boolean; contentId?: string }) {
  return <div className={cn("latveria-app-shell", className)} {...props}>
    <a className="skip-link" href={`#${contentId}`}>Lewati navigasi</a>
    {sidebar}
    <div className={`latveria-main-viewport ${immersive ? "in-exam-mode" : ""}`}>
      {header}
      <main className="latveria-content-scroll" id={contentId}>{children}</main>
      {bottomNav}
    </div>
    {overlays}
  </div>;
}

export function DashboardSidebar({ home, identity, children }: { home: string; identity: ReactNode; children: ReactNode }) {
  return <aside className="latveria-sidebar" aria-label="Navigasi utama">
    <div className="sidebar-brand-wrapper"><Brand to={home} /></div>
    {identity}
    {children}
    <div className="sidebar-footer"><LogoutButton className="nav-button" /></div>
  </aside>;
}

export type NavigationItem = { id: string; label: string; icon: LucideIcon; to?: string };

function NavigationAction({ item, active, onSelect, mobile }: { item: NavigationItem; active: boolean; onSelect?: (id: string) => void; mobile: boolean }) {
  const Icon = item.icon;
  const className = `${mobile ? "bottom-nav-btn" : "nav-button"} ${active ? "active" : ""}`;
  const content = mobile ? <><div className="bottom-icon-wrapper"><Icon size={19} strokeWidth={active ? 2.3 : 1.7} />{active && <span className="bottom-active-dot" />}</div><span className="bottom-label">{item.label}</span></> : <><span className="nav-icon-wrap"><Icon size={18} strokeWidth={active ? 2.2 : 1.7} /></span><div className="nav-label-box"><span className="nav-main-label">{item.label}</span></div>{active && <span className="nav-active-pip" />}</>;
  const props = { className, id: `${mobile ? "mobile-nav" : "nav-btn"}-${item.id}`, "aria-current": active ? "page" as const : undefined };
  return item.to ? <Link to={item.to} {...props}>{content}</Link> : <button type="button" {...props} onClick={() => onSelect?.(item.id)}>{content}</button>;
}

export function DashboardNavigation({ items, active, onSelect, mobile = false }: { items: NavigationItem[]; active: string; onSelect?: (id: string) => void; mobile?: boolean }) {
  if (mobile) return <nav className="latveria-bottom-nav" aria-label="Navigasi utama"><div className="bottom-nav-inner">{items.map((item) => <NavigationAction key={item.id} item={item} active={active === item.id} onSelect={onSelect} mobile />)}</div></nav>;
  return <nav className="sidebar-nav" aria-label="Navigasi utama"><ul className="nav-list">{items.map((item) => <li key={item.id} className="nav-item"><NavigationAction item={item} active={active === item.id} onSelect={onSelect} mobile={false} /></li>)}</ul></nav>;
}

export function DashboardHeader({ home, children }: { home: string; children: ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  return <header className="latveria-header-bar">
    <div className="mobile-brand-slot"><Brand to={home} className="mobile-title" /></div>
    <div className="header-meta-group"><div className="live-clock-panel font-mono">
      <Clock size={13} className="text-gold" />
      <span>{now.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).toUpperCase()}</span>
      <span className="divider-slash">/</span>
      <span className="clock-digits">{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Jakarta" })}</span>
      <span className="timezone-tag">WIB</span>
    </div></div>
    <div className="header-actions-group">{children}</div>
  </header>;
}
