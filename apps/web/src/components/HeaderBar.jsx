import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { DashboardHeader } from "./ui/dashboard-shell";
import { AnimatedNumber } from "../lib/motion";
import { Flame, Award, UserRound, Settings, Bell } from "lucide-react";
import { NotificationCenterModal } from "./social/NotificationCenterModal";
import { api } from "../lib/api";
import { newGlobalMessages } from "../views/chat/chat-notifications";

export const HeaderBar = () => {
  const { user, currentTab, setCurrentTab, toggleSidebar, sidebarOpen } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatNotifications, setChatNotifications] = useState({ global: [], direct: [] });

  const fetchUnreadCount = useCallback(async () => {
    try {
      const [friendsData, battleData, conversationsData, globalData] = await Promise.allSettled([
        api("/friends"),
        api("/warrior/invites"),
        api("/learner/chat/conversations"),
        api("/learner/chat/global?limit=50"),
      ]);
      const reqCount =
        friendsData.status === "fulfilled" && friendsData.value?.pendingIncoming
          ? friendsData.value.pendingIncoming.length
          : 0;
      const inviteCount =
        battleData.status === "fulfilled" && battleData.value?.invites
          ? battleData.value.invites.length
          : 0;
      const direct =
        conversationsData.status === "fulfilled"
          ? conversationsData.value.conversations.filter(
              (conversation) => conversation.unreadCount > 0,
            )
          : [];
      const seenKey = `latveria_global_chat_seen_${user.userId}`;
      const seenAt = localStorage.getItem(seenKey);
      if (!seenAt) localStorage.setItem(seenKey, new Date().toISOString());
      const global =
        globalData.status === "fulfilled" && seenAt && currentTab !== "chat"
          ? newGlobalMessages(globalData.value.messages, user.userId, seenAt)
          : [];
      if (currentTab === "chat") localStorage.setItem(seenKey, new Date().toISOString());
      setChatNotifications({ global, direct });
      setUnreadCount(
        reqCount +
          inviteCount +
          global.length +
          direct.reduce((count, item) => count + item.unreadCount, 0),
      );
    } catch {
      // ignore
    }
  }, [currentTab, user.userId]);

  useEffect(() => {
    void fetchUnreadCount();
    const interval = setInterval(() => {
      void fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <DashboardHeader home="/" onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen}>
      {/* Mobile Profile Avatar Button */}
      <button
        type="button"
        id="header-mobile-profile-btn"
        className="header-tool-btn header-mobile-profile-btn transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
        onClick={() => setCurrentTab("profile")}
        title="Buka Profil & Catatan Prestasi"
        aria-label="Buka Profil dan Catatan Prestasi"
      >
        <div className="w-5.5 h-5.5 rounded-full overflow-hidden border border-[var(--gold)]/70 flex items-center justify-center bg-[var(--surface-elevated)] shrink-0">
          {user.image ? (
            <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <UserRound size={13} className="text-gold" />
          )}
        </div>
      </button>

      {/* Mobile Settings Button */}
      <button
        type="button"
        id="header-mobile-settings-btn"
        className="header-tool-btn header-mobile-settings-btn transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
        onClick={() => setCurrentTab("settings")}
        title="Setelan Aplikasi"
        aria-label="Buka Setelan Aplikasi"
      >
        <Settings size={16} />
      </button>

      {/* Streak Pill */}
      <div
        className="header-stat-pill transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] cursor-default"
        title={`Streak ${user.streakDays} hari. Selesaikan minimal satu latihan per hari WIB.${user.practicedToday ? " Latihan hari ini sudah selesai." : " Belum latihan hari ini."}`}
      >
        <Flame
          size={14}
          className="text-orange transition-transform duration-200 group-hover:scale-110"
        />
        <span className="stat-pill-val font-mono">
          <AnimatedNumber value={user.streakDays} />
        </span>
        <span className="stat-pill-label">DAY STREAK</span>
      </div>

      {/* XP Quick Pill */}
      <button
        type="button"
        className="header-stat-pill xp-pill font-sans transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        onClick={() => setCurrentTab("profile")}
        title="Klik untuk membuka Profil & Catatan Prestasi"
        aria-label="Buka Profil dan Catatan Prestasi"
      >
        <Award
          size={14}
          className="text-gold transition-transform duration-200 group-hover:scale-110"
        />
        <span className="stat-pill-val font-mono">
          <AnimatedNumber value={user.totalXP} />
        </span>
        <span className="stat-pill-label">EXP</span>
      </button>

      {/* Notifications Button */}
      <button
        type="button"
        id="notification-center-btn"
        className="header-tool-btn relative transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 active:scale-95"
        onClick={() => setNotifOpen(true)}
        title={unreadCount > 0 ? `${unreadCount} notifikasi baru` : "Pusat Notifikasi"}
        aria-label="Buka Notifikasi"
      >
        <Bell size={16} className="transition-transform duration-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-gold text-black text-[9px] font-mono font-bold flex items-center justify-center border border-[var(--surface)] shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenterModal
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        onCountChange={fetchUnreadCount}
        chatNotifications={chatNotifications}
      />
    </DashboardHeader>
  );
};
