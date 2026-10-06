import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { UserRound, Settings, ChevronUp, Flame } from "lucide-react";
import { useApp } from "../context/AppContext";
import { DashboardSidebar, DashboardNavigation } from "./ui/dashboard-shell";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { learnerNavigation } from "./learner-navigation";
import { LogoutButton } from "./logout-button";
import { ProgressBar } from "./ui/dashboard";

function CompactProfileCard({
  user,
  xpPercentage,
  open,
  onOpenChange,
  onNavigate,
  profileActive,
  settingsActive,
  collapsed,
}) {
  const active = profileActive || settingsActive;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <div
        className={
          collapsed
            ? "compact-profile-collapsed"
            : `compact-profile-card ${active ? "is-active" : ""}`
        }
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={
              collapsed
                ? `compact-avatar-btn ${active ? "is-active" : ""}`
                : "compact-profile-trigger"
            }
            aria-label="Buka menu profil"
          >
            <div className="compact-avatar-wrapper">
              <div className="compact-avatar-mini">
                {user.image ? (
                  <img src={user.image} alt="" className="compact-avatar-img" />
                ) : (
                  <UserRound size={18} className="text-gold" />
                )}
              </div>
              <span className="compact-online-dot" />
            </div>
            {!collapsed && (
              <>
                <div className="compact-info">
                  <span className="compact-name">{user.name}</span>
                  <span className="compact-level font-mono">
                    <span className="compact-level-text">
                      LVL {String(user.level).padStart(2, "0")} · {user.currentXP}/
                      {user.nextLevelXP} EXP
                    </span>
                    <span className="compact-streak-indicator">
                      <Flame
                        size={10}
                        className={`compact-streak-icon ${user.streakDays === 0 ? "streak-zero" : ""}`}
                      />
                      <span className={user.streakDays === 0 ? "streak-zero" : ""}>
                        {user.streakDays}
                      </span>
                    </span>
                  </span>
                </div>
                <ChevronUp size={14} className={`compact-chevron ${open ? "is-open" : ""}`} />
              </>
            )}
          </button>
        </PopoverTrigger>
        {!collapsed && (
          <div className="compact-xp-bar">
            <ProgressBar
              value={xpPercentage}
              label="Progres level"
              className="popup-progress-track"
              fillClassName="popup-progress-fill"
            />
          </div>
        )}
      </div>
      <PopoverContent
        side="top"
        className="profile-popup-menu is-open"
        aria-label="Menu profil"
        style={{ position: "relative", top: "auto", left: "auto" }}
      >
        <div className="popup-stats-header">
          <div className="popup-id-row">
            <span className="popup-code font-mono">{user.id}</span>
            <span className="popup-badge">LVL {String(user.level).padStart(2, "0")}</span>
            <span className="popup-status">
              <span className="status-blink-dot" />
            </span>
          </div>
          <div className="popup-name">{user.name}</div>
          <div className="popup-xp-container">
            <div className="popup-xp-labels font-mono">
              <span>
                {user.currentXP.toLocaleString()} / {user.nextLevelXP.toLocaleString()} EXP
              </span>
              <span>{xpPercentage}%</span>
            </div>
            <ProgressBar
              value={xpPercentage}
              label="Progres level"
              className="popup-progress-track"
              fillClassName="popup-progress-fill"
            />
          </div>
          <div className="popup-streak-row">
            <Flame
              size={12}
              className={`popup-streak-icon ${user.streakDays === 0 ? "streak-zero" : ""}`}
            />
            <span
              className={`popup-streak-text font-mono ${user.streakDays === 0 ? "streak-zero" : ""}`}
            >
              {user.streakDays} DAY STREAK
            </span>
          </div>
        </div>
        <div className="popup-menu-items">
          <button
            type="button"
            className={`popup-menu-item ${profileActive ? "is-active" : ""}`}
            onClick={() => {
              onNavigate("/dashboard?tab=profile");
              onOpenChange(false);
            }}
          >
            <UserRound size={16} />
            Profil
          </button>
          <button
            type="button"
            className={`popup-menu-item ${settingsActive ? "is-active" : ""}`}
            onClick={() => {
              onNavigate("/dashboard?tab=settings");
              onOpenChange(false);
            }}
          >
            <Settings size={16} />
            Setelan
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Sidebar() {
  const { currentTab, setCurrentTab, user, sidebarOpen, toggleSidebar } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const xpPercentage = Math.min(100, Math.round((user.currentXP / user.nextLevelXP) * 100));
  useEffect(() => {
    setProfilePopupOpen(false);
  }, [sidebarOpen, location.key]);
  const closeMobileSidebar = () => {
    if (window.innerWidth <= 768 && sidebarOpen) toggleSidebar();
  };
  return (
    <DashboardSidebar home="/dashboard" collapsed={!sidebarOpen}>
      <DashboardNavigation
        items={learnerNavigation}
        active={currentTab}
        onSelect={(tab) => {
          setCurrentTab(tab);
          setProfilePopupOpen(false);
          closeMobileSidebar();
        }}
      />
      <div className="sidebar-profile-section">
        <CompactProfileCard
          user={user}
          xpPercentage={xpPercentage}
          open={profilePopupOpen}
          onOpenChange={setProfilePopupOpen}
          onNavigate={(path) => {
            navigate(path);
            closeMobileSidebar();
          }}
          profileActive={currentTab === "profile"}
          settingsActive={currentTab === "settings"}
          collapsed={!sidebarOpen}
        />
        <LogoutButton className="nav-button sidebar-logout-btn transition-transform duration-150 hover:scale-[1.015] active:scale-[0.98]" />
      </div>
    </DashboardSidebar>
  );
}
