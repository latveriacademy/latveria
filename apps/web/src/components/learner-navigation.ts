import { LayoutDashboard, BookOpen, Swords, Trophy } from "lucide-react";
import type { NavigationItem } from "./ui/dashboard-shell";

export const learnerNavigation: NavigationItem[] = [
  { id: "dashboard", label: "Basecamp", icon: LayoutDashboard },
  { id: "practice", label: "Drilling", icon: BookOpen },
  { id: "tryout", label: "Battle World", icon: Swords },
  { id: "leaderboard", label: "Rank", icon: Trophy },
];
