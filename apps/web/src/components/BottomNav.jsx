import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  User,
  Settings
} from 'lucide-react';

export const BottomNav = () => {
  const { currentTab, setCurrentTab } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'leaderboard', label: 'Ranking', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="latveria-bottom-nav" aria-label="Navigasi Bergerak Latveria">
      <div className="bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              id={`mobile-nav-${item.id}`}
              className={`bottom-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
            >
              <div className="bottom-icon-wrapper">
                <Icon size={19} strokeWidth={isActive ? 2.3 : 1.7} />
                {isActive && <span className="bottom-active-dot" />}
              </div>
              <span className="bottom-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
