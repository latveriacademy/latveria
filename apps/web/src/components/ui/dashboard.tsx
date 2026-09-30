import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "../../lib/utils";
import logo from "../../assets/latveria.webp";

export function Brand({ to = "/", className, children }: { to?: string; className?: string; children?: ReactNode }) {
  return <Link to={to} className={cn("app-brand", className)}><img src={logo} alt="" width={40} height={40} /><span>latveriacademy</span>{children}</Link>;
}

export function PageHeading({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return <header className="app-page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="app-page-actions">{actions}</div>}</header>;
}

export function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="panel-header"><div className="panel-title-group"><h2 className="panel-title font-serif">{title}</h2></div>{children}</div>;
}

export function Panel({ className, children, ...props }: ComponentProps<"section">) {
  return <section className={cn("dashboard-panel", className)} {...props}>{children}</section>;
}

export function StatTile({ label, value, icon, children }: { label: string; value: ReactNode; icon?: ReactNode; children?: ReactNode }) {
  return <div className="hero-metric-tile"><span className="metric-label-mono font-mono">{label}</span><div className="metric-val-row">{icon}<span className="metric-num font-serif">{value}</span></div>{children}</div>;
}

export function ProgressBar({ value, max = 100, label, className = "progress-track", fillClassName = "progress-fill" }: { value: number; max?: number; label: string; className?: string; fillClassName?: string }) {
  const percent = max > 0 && Number.isFinite(value) && Number.isFinite(max) ? Math.max(0, Math.min(100, value / max * 100)) : 0;
  return <div className={className} role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><div className={fillClassName} style={{ width: `${percent}%` }} /></div>;
}
