import { useApp } from "../context/AppContext";
import { DashboardNavigation } from "./ui/dashboard-shell";
import { learnerMobileNavigation } from "./learner-navigation";

export const BottomNav = () => {
  const { currentTab, setCurrentTab } = useApp();
  return (
    <DashboardNavigation
      items={learnerMobileNavigation}
      active={currentTab}
      onSelect={setCurrentTab}
      mobile
    />
  );
};
