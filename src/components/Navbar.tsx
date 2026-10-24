import React, { useState } from 'react';
import {
  Home,
  CheckSquare,
  LayoutGrid,
  CreditCard,
  Bell,
  BellOff,
  Cloud,
  Settings,
  Filter,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { NavTabItem, ThaiPencilConfig, ThaiVoiceConfig } from '../types/loan';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount: number;
  navTabs?: NavTabItem[];
  pencilConfig?: ThaiPencilConfig;
  voiceConfig?: ThaiVoiceConfig;
  isDarkTheme?: boolean;
  onToggleThemeMode?: () => void;
  onUpdateVoiceConfig?: (cfg: ThaiVoiceConfig) => void;
  onOpenExcelModal?: () => void;
  onLoadSampleData?: () => void;
  onClearSampleData?: () => void;
  hasSampleData?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Home: Home,
  CheckSquare: CheckSquare,
  LayoutGrid: LayoutGrid,
  CreditCard: CreditCard,
  Bell: Bell,
  Cloud: Cloud,
  Settings: Settings,
  Filter: Filter,
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  pendingCount,
  navTabs,
  pencilConfig,
  voiceConfig,
  isDarkTheme,
  onToggleThemeMode,
  onUpdateVoiceConfig,
  onOpenExcelModal,
  onLoadSampleData,
  onClearSampleData,
  hasSampleData = false,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const defaultItems = [
    { id: 'dashboard', label: 'ภาพรวม & แผน', icon: Home },
    { id: 'todos', label: 'ต้องชำระ', icon: CheckSquare, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'widget', label: 'วิดเจ็ต', icon: LayoutGrid },
    { id: 'loans', label: 'บัญชีหนี้', icon: CreditCard },
    { id: 'notifications', label: 'แจ้งเตือน', icon: Bell },
    { id: 'backup', label: 'สำรองข้อมูล', icon: Cloud },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  const visibleTabs =
    navTabs && navTabs.length > 0
      ? navTabs
          .filter(t => t.isVisible)
          .map(t => ({
            id: t.id === 'todo' ? 'todos' : t.id,
            label: t.label,
            icon: ICON_MAP[t.iconName] || Filter,
            badge: (t.id === 'todos' || t.id === 'todo') && pendingCount > 0 ? pendingCount : undefined,
          }))
      : defaultItems;

  const isDark = isDarkTheme ?? pencilConfig?.themeMode === 'DARK';
  const notifSoundOn = voiceConfig?.enabled ?? true;
  const mascotVoiceOn = voiceConfig?.mascotGreetingEnabled ?? true;

  const handleSelectNav = (tabId: string) => {
    onSelectTab(tabId);
    setIsDrawerOpen(false);
  };

  const toggleNotifSound = () => {
    if (!voiceConfig || !onUpdateVoiceConfig) return;
    onUpdateVoiceConfig({
      ...voiceConfig,
      enabled: !voiceConfig.enabled,
    });
  };

  const toggleMascotVoice = () => {
    if (!voiceConfig || !onUpdateVoiceConfig) return;
    onUpdateVoiceConfig({
      ...voiceConfig,
      mascotGreetingEnabled: !voiceConfig.mascotGreetingEnabled,
    });
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-3 sm:px-6 lg:px-8 py-3 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          
          {/* Left: Hamburger Button (≡) & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-1 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-xs active:scale-95 shrink-0"
              title="เปิดเมนูด้านข้าง (Sidebar)"
              aria-label="Open Sidebar Menu"
            >
              <Menu size={20} />
            </button>

            {/* Brand Logo & Name */}
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none min-w-0"
              onClick={() => handleSelectNav('dashboard')}
            >
              <img
                src="/logo.svg"
                alt="คล่องตัว Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-md shadow-amber-600/20 object-contain ring-1 ring-amber-500/30 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100 tracking-tight truncate">
                    คล่องตัว
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-none hidden sm:block truncate">
                  ระบบบริหารหนี้สินและสภาพคล่องอัจฉริยะ
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links (For Wide Screens Only) */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleTabs.map(item => {
              const Icon = item.icon;
              const normalizedCurrent = currentTab === 'todo' ? 'todos' : currentTab;
              const isActive = normalizedCurrent === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>

                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-extrabold rounded-full ${
                        isActive
                          ? 'bg-rose-500 text-white'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Top Right Actions: Quick Sound Toggles, Excel, Theme & Settings */}
          <div className="flex items-center gap-1.5 shrink-0">
            {voiceConfig && onUpdateVoiceConfig && (
              <>
                {/* Toggle Notification Sound */}
                <button
                  type="button"
                  onClick={toggleNotifSound}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs ${
                    notifSoundOn
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500'
                  }`}
                  title={notifSoundOn ? 'เสียงแจ้งเตือน: เปิดอยู่ (แตะเพื่อปิด)' : 'เสียงแจ้งเตือน: ปิดอยู่ (แตะเพื่อเปิด)'}
                >
                  {notifSoundOn ? <Bell size={14} /> : <BellOff size={14} />}
                  <span className="hidden sm:inline">เสียงเตือน</span>
                </button>

                {/* Toggle Nong Tonhom Mascot Voice */}
                <button
                  type="button"
                  onClick={toggleMascotVoice}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs ${
                    mascotVoiceOn
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500'
                  }`}
                  title={mascotVoiceOn ? 'เสียงน้องต้นหอม: เปิดอยู่ (แตะเพื่อปิด)' : 'เสียงน้องต้นหอม: ปิดอยู่ (แตะเพื่อเปิด)'}
                >
                  {mascotVoiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span className="hidden sm:inline">น้องต้นหอม</span>
                </button>
              </>
            )}

            {onOpenExcelModal && (
              <button
                type="button"
                onClick={onOpenExcelModal}
                className="px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                title="นำเข้า / ส่งออกไฟล์ Excel & ดาวน์โหลดเทมเพลต"
              >
                <FileSpreadsheet size={14} />
                <span className="hidden sm:inline">Excel</span>
              </button>
            )}

            {onToggleThemeMode && (
              <button
                onClick={onToggleThemeMode}
                className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-xs"
                title={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}

            <button
              onClick={() => handleSelectNav('settings')}
              className={`p-2 rounded-xl border transition-colors shadow-xs ${
                currentTab === 'settings'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
              title="ตั้งค่าระบบ"
            >
              <Settings size={16} />
            </button>
          </div>

        </div>
      </header>

      {/* ================= LEFT SLIDE-OUT SIDEBAR DRAWER ================= */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-76 max-w-[85vw] bg-[#FBF9F4] dark:bg-[#18181B] border-r border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out select-none ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-label="Main Navigation Drawer"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="คล่องตัว Logo"
              className="w-10 h-10 rounded-xl shadow-lg shadow-amber-600/30 object-contain ring-1 ring-amber-500/40"
            />
            <div>
              <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100 leading-tight">
                คล่องตัว
              </h2>
              <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                บริหารหนี้สินและสภาพคล่องอัจฉริยะ
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="ปิดเมนู"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Navigation Links + Quick Controls */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Navigation Section */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              เมนูหลัก (Navigation)
            </div>

            {visibleTabs.map(item => {
              const Icon = item.icon;
              const normalizedCurrent = currentTab === 'todo' ? 'todos' : currentTab;
              const isActive = normalizedCurrent === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full p-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between group ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/30'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                      }`}
                    >
                      <Icon size={17} />
                    </div>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 text-[11px] font-extrabold rounded-full ${
                          isActive
                            ? 'bg-rose-500 text-white'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={14} className={isActive ? 'text-white' : 'text-stone-400'} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Sound Controls in Sidebar */}
          {voiceConfig && onUpdateVoiceConfig && (
            <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5">
              <div className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                ควบคุมระบบเสียงด่วน
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {notifSoundOn ? (
                    <Bell size={15} className="text-amber-600 dark:text-amber-400" />
                  ) : (
                    <BellOff size={15} className="text-stone-400" />
                  )}
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    เสียงแจ้งเตือนระบบ
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifSoundOn}
                  onChange={toggleNotifSound}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mascotVoiceOn ? (
                    <Volume2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <VolumeX size={15} className="text-stone-400" />
                  )}
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    เสียงพูดน้องต้นหอม
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={mascotVoiceOn}
                  onChange={toggleMascotVoice}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Excel & Sample Data Menu in Sidebar */}
          <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
            <div className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              จัดการข้อมูล & ข้อมูลตัวอย่าง
            </div>

            {onOpenExcelModal && (
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenExcelModal();
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <FileSpreadsheet size={15} />
                <span>Import / Export Excel (.xlsx)</span>
              </button>
            )}

            {onLoadSampleData && (
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onLoadSampleData();
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles size={15} />
                <span>โหลดข้อมูลตัวอย่าง</span>
              </button>
            )}

            {hasSampleData && onClearSampleData && (
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onClearSampleData();
                }}
                className="w-full py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 size={14} />
                <span>ล้างข้อมูลตัวอย่าง</span>
              </button>
            )}
          </div>
        </div>

        {/* Drawer Footer: Theme & Settings */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-400">โทนสีหน้าจอ</span>

            {onToggleThemeMode && (
              <button
                onClick={onToggleThemeMode}
                className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold flex items-center gap-1.5 text-stone-800 dark:text-amber-400 shadow-xs"
              >
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
                <span>{isDark ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
              </button>
            )}
          </div>

          <button
            onClick={() => handleSelectNav('settings')}
            className="w-full py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-2 transition-colors"
          >
            <Settings size={15} />
            <span>ศูนย์การตั้งค่าระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
};
