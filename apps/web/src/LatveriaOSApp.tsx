import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
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
import { useSearchParams } from 'react-router';
import { DashboardShell } from './components/ui/dashboard-shell';

function AppShell() {
  const { currentTab, setCurrentTab, activeSession } = useApp();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'practice', 'leaderboard', 'profile', 'settings'].includes(tab)) {
      setCurrentTab(tab);
    }
  }, [searchParams, setCurrentTab]);

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
      <DashboardShell
        immersive={!!activeSession}
        sidebar={!activeSession && <Sidebar />}
        header={!activeSession && <HeaderBar />}
        bottomNav={!activeSession && <BottomNav />}
        overlays={<><LexiconDrawer /><ToastNotification /></>}
      >{renderActiveView()}</DashboardShell>
  );
}

export function LatveriaOSApp() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default LatveriaOSApp;
