import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";
import { DashboardHeader } from "./ui/dashboard-shell";
import { AnimatedNumber } from "../lib/motion";
import { Flame, Award, UserRound, Settings, Bell, Users } from "lucide-react";
import { NotificationCenterModal } from "./social/NotificationCenterModal";
import { api } from "../lib/api";
import { newGlobalMessages } from "../views/chat/chat-notifications";
import { sound } from "../utils/audioFeedback";

export const HeaderBar = () => {
  const { user, currentTab, setCurrentTab, toggleSidebar, sidebarOpen } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(true);
  const [chatNotifications, setChatNotifications] = useState({ global: [], direct: [] });
  const prevCountRef = useRef(null);

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
      const userId = user.userId || user.id;
      const seenKey = `latveria_global_chat_seen_${userId}`;
      const seenAt = typeof localStorage !== "undefined" ? localStorage.getItem(seenKey) : null;
      if (!seenAt && typeof localStorage !== "undefined") {
        localStorage.setItem(seenKey, new Date().toISOString());
      }
      const global =
        globalData.status === "fulfilled" && seenAt && currentTab !== "chat"
          ? newGlobalMessages(globalData.value.messages, userId, seenAt)
          : [];
      if (currentTab === "chat" && typeof localStorage !== "undefined") {
        localStorage.setItem(seenKey, new Date().toISOString());
      }
      setChatNotifications({ global, direct });

      const total =
        reqCount +
        inviteCount +
        global.length +
        direct.reduce((count, item) => count + item.unreadCount, 0);

      setUnreadCount(total);

      const notifSeenKey = `latveria_notif_last_seen_count_${userId}`;
      const lastSeen =
        typeof localStorage !== "undefined" ? Number(localStorage.getItem(notifSeenKey) ?? -1) : -1;

      if (total === 0) {
        setHasInteracted(true);
        if (typeof localStorage !== "undefined") localStorage.setItem(notifSeenKey, "0");
      } else if (total > lastSeen) {
        setHasInteracted(false);
      } else {
        setHasInteracted(true);
      }

      // Play audio notification when new notification arrives (not on initial mount)
      if (prevCountRef.current !== null && total > prevCountRef.current) {
        sound.playNotification();
      }
      prevCountRef.current = total;
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

      {/* Mobile Friendlist Button */}
      <button
        type="button"
        id="header-mobile-friends-btn"
        className="header-tool-btn header-mobile-friends-btn transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
        onClick={() => setCurrentTab("connections")}
        title="Friendlist"
        aria-label="Buka Friendlist"
      >
        <Users size={16} />
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
        className="header-tool-btn relative transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 active:scale-95 cursor-pointer"
        onClick={() => {
          setHasInteracted(true);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(
              `latveria_notif_last_seen_count_${user.userId}`,
              String(unreadCount),
            );
          }
          setNotifOpen(true);
        }}
        title={unreadCount > 0 ? `${unreadCount} notifikasi` : "Pusat Notifikasi"}
        aria-label="Buka Notifikasi"
      >
        <Bell size={16} className="transition-transform duration-200" />
        {unreadCount > 0 && !hasInteracted && (
          <span
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse"
            data-testid="notification-red-dot"
          />
        )}
      </button>

      <NotificationCenterModal
        isOpen={notifOpen}
        onClose={() => {
          setNotifOpen(false);
          setHasInteracted(true);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(
              `latveria_notif_last_seen_count_${user.userId}`,
              String(unreadCount),
            );
          }
        }}
        onCountChange={fetchUnreadCount}
        chatNotifications={chatNotifications}
      />
    </DashboardHeader>
  );
};
