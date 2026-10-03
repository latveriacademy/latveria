import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { DashboardSidebar, DashboardNavigation } from './ui/dashboard-shell';
import { learnerNavigation } from './learner-navigation';
import { UserRound, Settings, ChevronUp, LogOut, Flame } from 'lucide-react';
import { authClient } from '../lib/auth-client';

const ProfilePopup = ({ user, xpPercentage, isOpen, onClose, onNavigate, isProfileActive, isSettingsActive, anchorRef }) => {
  const popupRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Position popup above the anchor element
  useEffect(() => {
    if (isOpen && anchorRef?.current && popupRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popupHeight = popupRef.current.offsetHeight || 200;
      const popupWidth = popupRef.current.offsetWidth || 260;

      // Position above the card, aligned to the left edge of the sidebar
      let top = rect.top - popupHeight - 8;
      let left = rect.left;

      // Ensure popup doesn't go off-screen
      if (top < 10) {
        top = rect.bottom + 8; // Flip below if not enough space above
      }
      if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
      }
      if (left < 10) left = 10;

      setPosition({ top, left });
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, anchorRef]);

  const popup = (
    <div
      ref={popupRef}
      className={`profile-popup-menu ${isOpen ? 'is-open' : ''}`}
      role="menu"
      aria-label="Menu profil"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Header stats */}
      <div className="popup-stats-header">
        <div className="popup-id-row">
          <span className="popup-code font-mono">{user.id}</span>
          <span className="popup-badge">LVL {user.level < 10 ? `0${user.level}` : user.level}</span>
          <span className="popup-status"><span className="status-blink-dot" /></span>
        </div>
        <div className="popup-name">{user.name}</div>
        <div className="popup-xp-container">
          <div className="popup-xp-labels font-mono">
            <span>{user.currentXP.toLocaleString()} / {user.nextLevelXP.toLocaleString()} XP</span>
            <span>{xpPercentage}%</span>
          </div>
          <div className="popup-progress-track">
            <div className="popup-progress-fill" style={{ width: `${xpPercentage}%` }} />
          </div>
        </div>
        <div className="popup-streak-row">
          <Flame size={12} className={`popup-streak-icon ${user.streakDays === 0 ? 'streak-zero' : ''}`} />
          <span className={`popup-streak-text font-mono ${user.streakDays === 0 ? 'streak-zero' : ''}`}>
            {user.streakDays} DAY STREAK
          </span>
        </div>
      </div>

      {/* Menu items */}
      <div className="popup-menu-items">
        <button
          type="button"
          className={`popup-menu-item ${isProfileActive ? 'is-active' : ''}`}
          role="menuitem"
          onClick={() => onNavigate('/dashboard?tab=profile')}
        >
          <UserRound size={16} />
          <span>Profil</span>
        </button>
        <button
          type="button"
          className={`popup-menu-item ${isSettingsActive ? 'is-active' : ''}`}
          role="menuitem"
          onClick={() => onNavigate('/dashboard?tab=settings')}
        >
          <Settings size={16} />
          <span>Setelan</span>
        </button>
      </div>
    </div>
  );

  // Render via portal to escape sidebar overflow
  return createPortal(popup, document.body);
};

const CompactProfileCard = ({ user, xpPercentage, isPopupOpen, onToggle, isProfileActive, isSettingsActive, isCollapsed }) => {
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const handleNavigate = useCallback((path) => {
    navigate(path);
    onToggle();
  }, [navigate, onToggle]);

  if (isCollapsed) {
    return (
      <div className="compact-profile-collapsed" ref={cardRef}>
        <button
          type="button"
          className={`compact-avatar-btn ${isProfileActive || isSettingsActive ? 'is-active' : ''}`}
          onClick={onToggle}
          aria-haspopup="menu"
          aria-expanded={isPopupOpen}
          aria-label="Buka menu profil"
        >
          <div className="compact-avatar-mini">
            <UserRound size={18} className="text-gold" />
            <span className="compact-online-dot" />
          </div>
        </button>
        {isPopupOpen && (
          <ProfilePopup
            user={user}
            xpPercentage={xpPercentage}
            isOpen={isPopupOpen}
            onClose={onToggle}
            onNavigate={handleNavigate}
            isProfileActive={isProfileActive}
            isSettingsActive={isSettingsActive}
            anchorRef={cardRef}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`compact-profile-card ${isProfileActive || isSettingsActive ? 'is-active' : ''}`} ref={cardRef}>
      <button
        type="button"
        className="compact-profile-trigger"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isPopupOpen}
      >
        <div className="compact-avatar-wrapper">
          <div className="compact-avatar-mini">
            <UserRound size={18} className="text-gold" />
          </div>
          <span className="compact-online-dot" />
        </div>
        <div className="compact-info">
          <span className="compact-name">{user.name}</span>
          <span className="compact-level font-mono">
            <span className="compact-level-text">LVL {user.level < 10 ? `0${user.level}` : user.level} · {user.currentXP}/{user.nextLevelXP} XP</span>
            <span className="compact-streak-indicator">
              <Flame size={10} className={`compact-streak-icon ${user.streakDays === 0 ? 'streak-zero' : ''}`} />
              <span className={user.streakDays === 0 ? 'streak-zero' : ''}>{user.streakDays}</span>
            </span>
          </span>
        </div>
        <ChevronUp size={14} className={`compact-chevron ${isPopupOpen ? 'is-open' : ''}`} />
      </button>
      <div className="compact-xp-bar">
        <div className="popup-progress-track">
          <div className="popup-progress-fill" style={{ width: `${xpPercentage}%` }} />
        </div>
      </div>

      {isPopupOpen && (
        <ProfilePopup
          user={user}
          xpPercentage={xpPercentage}
          isOpen={isPopupOpen}
          onClose={onToggle}
          onNavigate={handleNavigate}
          isProfileActive={isProfileActive}
          isSettingsActive={isSettingsActive}
          anchorRef={cardRef}
        />
      )}
    </div>
  );
};

export const Sidebar = () => {
  const { currentTab, setCurrentTab, user, sidebarOpen } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);

  const xpPercentage = Math.min(100, Math.round(user.currentXP / user.nextLevelXP * 100));
  const isProfileActive = location.search.includes('tab=profile');
  const isSettingsActive = location.search.includes('tab=settings');

  const toggleProfilePopup = () => setProfilePopupOpen(prev => !prev);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      localStorage.removeItem("latveria_user");
      navigate("/login", { replace: true });
    } catch {
      // Fallback navigation
      localStorage.removeItem("latveria_user");
      navigate("/login", { replace: true });
    }
  };

  return (
    <DashboardSidebar home="/dashboard" collapsed={!sidebarOpen}>
      <DashboardNavigation items={learnerNavigation} active={currentTab} onSelect={setCurrentTab} />
      <div className="sidebar-profile-section">
        <CompactProfileCard
          user={user}
          xpPercentage={xpPercentage}
          isPopupOpen={profilePopupOpen}
          onToggle={toggleProfilePopup}
          isProfileActive={isProfileActive}
          isSettingsActive={isSettingsActive}
          isCollapsed={!sidebarOpen}
        />
        <button
          type="button"
          className="nav-button sidebar-logout-btn transition-transform duration-150 hover:scale-[1.015] active:scale-[0.98]"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </DashboardSidebar>
  );
};
