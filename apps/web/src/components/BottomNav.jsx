import { useApp } from '../context/AppContext';
import { DashboardNavigation } from './ui/dashboard-shell';
import { learnerNavigation } from './learner-navigation';

export const BottomNav = () => {
  const { currentTab, setCurrentTab } = useApp();
  return <DashboardNavigation items={learnerNavigation} active={currentTab} onSelect={setCurrentTab} mobile />;
};
