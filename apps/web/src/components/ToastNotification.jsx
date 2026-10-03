import React from "react";
import { useApp } from "../context/AppContext";
import { Award, Zap, CheckCircle2, AlertCircle, Info, Sparkles } from "lucide-react";

export const ToastNotification = () => {
  const { toasts } = useApp();

  if (!toasts.length) return null;

  return (
    <div className="latveria-toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        let Icon = Award;
        let badgeStyle = "gold";

        if (toast.type === "xp") {
          Icon = Zap;
          badgeStyle = "gold";
        } else if (toast.type === "level-up") {
          Icon = Sparkles;
          badgeStyle = "emerald";
        } else if (toast.type === "success") {
          Icon = CheckCircle2;
          badgeStyle = "emerald";
        } else if (toast.type === "error") {
          Icon = AlertCircle;
          badgeStyle = "crimson";
        } else {
          Icon = Info;
          badgeStyle = "brass";
        }

        return (
          <div
            key={toast.id}
            className={`toast-card toast-${badgeStyle} motion-slide-in-right transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] cursor-default`}
          >
            <div className="toast-icon-wrap transition-transform duration-150 group-hover:scale-110">
              <Icon size={18} />
            </div>
            <div className="toast-body">
              <div className="toast-title font-mono">{toast.title}</div>
              {toast.subtitle && <div className="toast-subtitle">{toast.subtitle}</div>}
            </div>
            <div className="toast-insignia-mono font-mono">LAT-SYS</div>
          </div>
        );
      })}
    </div>
  );
};
