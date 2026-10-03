import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "../../lib/utils";
import logo from "../../assets/latveria.webp";
import { AnimatedNumber } from "../../lib/motion";

export function Brand({
  to = "/",
  className,
  children,
}: {
  to?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "app-brand group transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.015]",
        className,
      )}
    >
      <img
        src={logo}
        alt=""
        width={40}
        height={40}
        className="transition-transform duration-200 group-hover:scale-105"
      />
      <span>latveriacademy</span>
      {children}
    </Link>
  );
}

export function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="app-page-heading motion-fade-up">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="app-page-actions">{actions}</div>}
    </header>
  );
}

export function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel-header">
      <div className="panel-title-group">
        <h2 className="panel-title font-serif">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function Panel({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "dashboard-panel motion-fade-up transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--edge-strong)]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  icon,
  children,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const isNumeric = typeof value === "number";
  return (
    <div
      className={cn(
        "hero-metric-tile motion-fade-up transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-2px] hover:shadow-md hover:border-[var(--edge-strong)] group",
        className,
      )}
    >
      <span className="metric-label-mono font-mono">{label}</span>
      <div className="metric-val-row">
        {icon && (
          <span className="transition-transform duration-200 group-hover:scale-110">{icon}</span>
        )}
        <span className="metric-num font-serif">
          {isNumeric ? <AnimatedNumber value={value as number} /> : value}
        </span>
      </div>
      {children}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  label,
  className = "progress-track",
  fillClassName = "progress-fill",
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
  fillClassName?: string;
}) {
  const percent =
    max > 0 && Number.isFinite(value) && Number.isFinite(max)
      ? Math.max(0, Math.min(100, (value / max) * 100))
      : 0;

  return (
    <div
      className={className}
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          fillClassName,
          "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width]",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
