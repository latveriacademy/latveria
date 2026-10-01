import { LayoutDashboard, BookOpen, Trophy, User, Settings } from "lucide-react";
import type { NavigationItem } from "./ui/dashboard-shell";

export const learnerNavigation: NavigationItem[] = [
  { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { id: "practice", label: "Latihan", icon: BookOpen },
  { id: "leaderboard", label: "Peringkat", icon: Trophy },
  { id: "profile", label: "Profil", icon: User },
  { id: "settings", label: "Pengaturan", icon: Settings },
];
