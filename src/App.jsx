import React from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { HeaderBar } from './components/HeaderBar';
import { LexiconDrawer } from './components/LexiconDrawer';
import { ToastNotification } from './components/ToastNotification';
import { DashboardView } from './views/DashboardView';
import { PracticeView } from './views/PracticeView';
import { LeaderboardView } from './views/LeaderboardView';
import { ProfileView } from './views/ProfileView';
import { SettingsView } from './views/SettingsView';

export function App() {
  const { currentTab, activeSession } = useApp();

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'practice':
        return <PracticeView />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="latveria-app-shell">
      {/* Institutional Left Sidebar (Desktop) */}
      {!activeSession && <Sidebar />}

      {/* Main View Area */}
      <div className={`latveria-main-viewport ${activeSession ? 'in-exam-mode' : ''}`}>
        {/* Top Header Bar */}
        {!activeSession && <HeaderBar />}

        {/* Dynamic View Container */}
        <main className="latveria-content-scroll" id="main-content-scroll">
          {renderActiveView()}
        </main>

        {/* Compact Bottom Navigation (Mobile) */}
        {!activeSession && <BottomNav />}
      </div>

      {/* Interactive Lexicon Modal (English Literacy Annotation) */}
      <LexiconDrawer />

      {/* Floating Institutional Toasts */}
      <ToastNotification />
    </div>
  );
}

export default App;
