import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Landmark,
  TrendingDown,
  Menu,
  Plus,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenMoreMenu: () => void;
  onQuickAddLoan: () => void;
  overdueCount: number;
  remainingCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMoreMenu,
  onQuickAddLoan,
  overdueCount,
  remainingCount,
}) => {
  const items = [
    { id: 'dashboard', label: 'หน้าแรก', icon: LayoutDashboard },
    {
      id: 'todos',
      label: 'รายการชำระ',
      icon: CheckSquare,
      badge: overdueCount > 0 ? overdueCount : remainingCount > 0 ? remainingCount : 0,
      badgeUrgent: overdueCount > 0,
    },
    { id: 'loans', label: 'บัญชีหนี้', icon: Landmark },
    { id: 'planner', label: 'ปลดหนี้', icon: TrendingDown },
  ];

  const isMoreActive = !items.some(i => i.id === currentTab);

  return (
    <>
      {/* Quick-Add Floating Button on Mobile */}
      <button
        type="button"
        onClick={onQuickAddLoan}
        aria-label="เพิ่มสัญญาหนี้ใหม่"
        className="lg:hidden fixed right-4 bottom-20 z-30 w-12 h-12 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-lg shadow-amber-600/30 flex items-center justify-center transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="แถบนำทางหลัก"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-stone-950/95 border-t border-stone-200 dark:border-stone-800 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
          {items.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
                  active
                    ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                    : 'text-stone-500 dark:text-stone-400 font-medium hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center ${
                        item.badgeUrgent ? 'bg-rose-600' : 'bg-amber-600'
                      }`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] leading-tight truncate max-w-full px-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenMoreMenu}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
              isMoreActive
                ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                : 'text-stone-500 dark:text-stone-400 font-medium hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] leading-tight">เพิ่มเติม</span>
          </button>
        </div>
      </nav>
    </>
  );
};
