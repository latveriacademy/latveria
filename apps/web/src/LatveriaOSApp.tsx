import React from 'react';
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
import { useMatch, useNavigation, useOutlet } from 'react-router';
import { DashboardShell } from './components/ui/dashboard-shell';

function AppShell() {
  const { currentTab, activeSession, sidebarOpen, toggleSidebar } = useApp();
  const outlet = useOutlet();
  const navigation = useNavigation();
  const historyResult = useMatch('/dashboard/riwayat/:id');
  const immersive = !!activeSession || !!historyResult;

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
      immersive={immersive}
      sidebarOpen={sidebarOpen}
      onCloseSidebar={toggleSidebar}
      sidebar={!immersive && <Sidebar />}
      header={!immersive && <HeaderBar />}
      bottomNav={!immersive && <BottomNav />}
      overlays={<><LexiconDrawer /><ToastNotification /></>}
    >
      {navigation.state === 'loading' && (
        <div className="motion-skeleton h-2 w-full mb-4 rounded" role="status" aria-label="Memuat" />
      )}
      <div key={outlet ? 'outlet' : currentTab} className="motion-page-enter w-full">
        {outlet ?? renderActiveView()}
      </div>
    </DashboardShell>
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
