import { useApp } from '../context/AppContext';
import { ProgressBar } from './ui/dashboard';
import { DashboardSidebar, DashboardNavigation } from './ui/dashboard-shell';
import { learnerNavigation } from './learner-navigation';
import { AnimatedNumber } from '../lib/motion';

export const Sidebar = () => {
  const { currentTab, setCurrentTab, user, sidebarOpen } = useApp();
  const xpPercentage = Math.min(100, Math.round(user.currentXP / user.nextLevelXP * 100));
  const identity = (
    <div className="sidebar-user-dossier motion-fade-in">
      <div className="dossier-top">
        <span className="dossier-code">{user.id}</span>
        <span className="dossier-status"><span className="status-blink-dot" />ONLINE</span>
      </div>
      <div className="dossier-name-row">
        <span className="dossier-name">{user.name}</span>
        <span className="dossier-badge">LVL {user.level < 10 ? `0${user.level}` : user.level}</span>
      </div>
      <div className="dossier-xp-container">
        <div className="dossier-xp-labels">
          <span className="xp-metric-text">
            <AnimatedNumber value={user.currentXP} /> / <AnimatedNumber value={user.nextLevelXP} /> XP
          </span>
          <span className="xp-percentage-text">
            <AnimatedNumber value={xpPercentage} formatter={(n) => `${n}%`} />
          </span>
        </div>
        <ProgressBar value={xpPercentage} label="EXP" fillClassName="progress-fill gold-gradient" />
      </div>
    </div>
  );
  return (
    <DashboardSidebar home="/dashboard" identity={identity} collapsed={!sidebarOpen}>
      <DashboardNavigation items={learnerNavigation} active={currentTab} onSelect={setCurrentTab} />
    </DashboardSidebar>
  );
};

