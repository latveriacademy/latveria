import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { HeaderBar } from "./components/HeaderBar";
import { LexiconDrawer } from "./components/lexicon/LexiconDrawer";
import { ToastNotification } from "./components/ToastNotification";
import { DashboardView } from "./views/DashboardView";
import { PracticeView } from "./views/practice/PracticeView";
import { LibraryView } from "./views/library/LibraryView";
import { LeaderboardView } from "./views/LeaderboardView";
import { ProfileView } from "./views/ProfileView";
import { SettingsView } from "./views/SettingsView";
import { BattleWorldView } from "./views/tryout/BattleWorldView";
import { WarriorBattleView } from "./views/WarriorBattleView";
import { ChatView } from "./views/chat/ChatView";
import "./learner-copy.css";
import { useMatch, useNavigation, useOutlet } from "react-router";
import { DashboardShell } from "./components/ui/dashboard-shell";

function AppShell() {
  const { currentTab, activeSession, sidebarOpen, toggleSidebar } = useApp();
  const outlet = useOutlet();
  const navigation = useNavigation();
  const historyResult = useMatch("/dashboard/riwayat/:id");
  const immersive = !!activeSession || !!historyResult;

  const renderActiveView = () => {
    if (activeSession) {
      return <PracticeView />;
    }
    switch (currentTab) {
      case "dashboard":
        return <DashboardView />;
      case "practice":
        return <PracticeView />;
      case "warrior":
        return <WarriorBattleView />;
      case "chat":
        return <ChatView />;
      case "library":
        return <LibraryView />;
      case "tryout":
        return <BattleWorldView />;
      case "leaderboard":
        return <LeaderboardView />;
      case "profile":
        return <ProfileView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <DashboardShell
      className="learner-shell"
      immersive={immersive}
      sidebarOpen={sidebarOpen}
      onCloseSidebar={toggleSidebar}
      sidebar={!immersive && <Sidebar />}
      header={!immersive && <HeaderBar />}
      bottomNav={!immersive && <BottomNav />}
      overlays={
        <>
          <LexiconDrawer />
          <ToastNotification />
        </>
      }
    >
      {navigation.state === "loading" && (
        <div
          className="motion-skeleton h-2 w-full mb-4 rounded"
          role="status"
          aria-label="Memuat"
        />
      )}
      <div key={outlet ? "outlet" : currentTab} className="motion-page-enter w-full">
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
