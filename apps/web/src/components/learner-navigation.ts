import { LayoutDashboard, BookOpen, Swords, Trophy, User, Settings } from "lucide-react";
import type { NavigationItem } from "./ui/dashboard-shell";

export const learnerNavigation: NavigationItem[] = [
  { id: "dashboard", label: "Basecamp", icon: LayoutDashboard },
  { id: "practice", label: "Drilling", icon: BookOpen },
  { id: "tryout", label: "Battle World", icon: Swords },
  { id: "leaderboard", label: "Rank", icon: Trophy },
];

export const learnerMobileNavigation: NavigationItem[] = [
  ...learnerNavigation,
  { id: "profile", label: "Profil", icon: User },
  { id: "settings", label: "Setelan", icon: Settings },
];
