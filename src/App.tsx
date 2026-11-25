import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  loadAppState, 
  saveLoans, 
  saveAvailableFunds, 
  saveSelectedYearMonth, 
  saveWidgetConfig, 
  saveNotificationRules,
  savePencilConfig,
  saveVoiceConfig,
  saveSecurityConfig,
  saveNavTabs,
  clearAllData,
  hasDemoData,
  loadDemoData,
  removeDemoData,
  snoozeTaskAlert,
  clearTaskSnooze,
  isTaskSnoozed,
  deleteLoanAndRecords,
  redrawLoanCredit,
  revertLoanDrawdown,
  STATE_CHANGE_EVENT 
} from './services/storageService';
import { format, addMonths } from 'date-fns';
import { 
  getMonthlyInstallmentTasks, 
  calculateMonthlySummary,
  calculateRollingProjection,
  calculatePortfolioDebtSummary
} from './utils/cashflowCalculator';
import { toggleSubItemPayment, saveWidgetSnapshot, syncPendingWidgetToggles, syncWidgetSnapshot } from './services/widgetBridgeService';
import { checkShouldAutoLock, recordUserActivity } from './services/securityService';
import { announcePaymentToggle, announceTaskReminder } from './services/thaiVoiceService';
import { syncScheduledNotifications } from './services/notificationService';
import { applySystemBars, hideSplash, addAppStateListener, addBackButtonListener } from './services/native/shell';
import { runBackHandlers } from './services/backHandler';
import { App as CapacitorApp } from '@capacitor/app';
import { 
  LoanAccount, 
  MonthlyInstallmentTask, 
  WidgetConfig, 
  NotificationRule, 
  ThaiPencilConfig, 
  ThaiVoiceConfig, 
  SecurityConfig, 
  NavTabItem,
  PortfolioDebtSummary,
  CreditDrawdownMode 
} from './types/loan';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardView } from './components/DashboardView';
import { TodoListView } from './components/TodoListView';
import { LoanManagerView } from './components/LoanManagerView';
import { LoanFormModal } from './components/LoanFormModal';
import { CreditRedrawModal } from './components/CreditRedrawModal';
import { ThaiPencilBackdrop } from './components/ThaiPencilBackdrop';
import { SecurityLockScreen } from './components/SecurityLockScreen';
import { DueAlertModal } from './components/DueAlertModal';
import { NotificationToastHub, ToastMessage } from './components/NotificationToastHub';

const WidgetStudioView = React.lazy(() => import('./components/WidgetStudioView').then(m => ({ default: m.WidgetStudioView })));
const NotificationCenterView = React.lazy(() => import('./components/NotificationCenterView').then(m => ({ default: m.NotificationCenterView })));
const GmailBackupView = React.lazy(() => import('./components/GmailBackupView').then(m => ({ default: m.GmailBackupView })));
const SettingsView = React.lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const ExcelDataModal = React.lazy(() => import('./components/ExcelDataModal').then(m => ({ default: m.ExcelDataModal })));
const DebtPlannerView = React.lazy(() => import('./components/DebtPlannerView').then(m => ({ default: m.DebtPlannerView })));
const PaymentHistoryView = React.lazy(() => import('./components/PaymentHistoryView').then(m => ({ default: m.PaymentHistoryView })));
const AboutHelpView = React.lazy(() => import('./components/AboutHelpView').then(m => ({ default: m.AboutHelpView })));

export function App() {
  const [appState, setAppState] = useState(loadAppState());
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [editingLoan, setEditingLoan] = useState<LoanAccount | null | undefined>(undefined);
  const [redrawingLoan, setRedrawingLoan] = useState<LoanAccount | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const initial = loadAppState();
    return initial.securityConfig.pinEnabled && !!initial.securityConfig.pinHash;
  });
  const [urgentAlertTask, setUrgentAlertTask] = useState<MonthlyInstallmentTask | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const spokenAlertRef = useRef<string | null>(null);
  const lastBackRef = useRef(0);
  const [isWidgetSyncReady, setIsWidgetSyncReady] = useState<boolean>(false);

  // Sync state reactively
  const reloadState = () => {
    setAppState(loadAppState());
  };

  useEffect(() => {
    const handleStateChange = () => reloadState();
    window.addEventListener(STATE_CHANGE_EVENT, handleStateChange);
    return () => window.removeEventListener(STATE_CHANGE_EVENT, handleStateChange);
  }, []);

  const {
    loans,
    paymentRecords,
    drawdownRecords = [],
    availableFunds,
    notificationRules,
    widgetConfig,
    backupMeta,
    voiceConfig,
    pencilConfig,
    navTabs,
    securityConfig,
    selectedYearMonth,
  } = appState;

  // Apply Dark/Light theme class to html root
  const isDark = pencilConfig.themeMode === 'DARK'
    || (pencilConfig.themeMode === 'SYSTEM' && systemPrefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    void applySystemBars(isDark);
  }, [isDark]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void hideSplash();
    }, 3000);

    void hideSplash();
    return () => clearTimeout(timer);
  }, []);

  // Compute monthly tasks & financial summary
  const tasks = useMemo(
    () => getMonthlyInstallmentTasks(loans, paymentRecords, selectedYearMonth),
    [loans, paymentRecords, selectedYearMonth]
  );
  const summary = useMemo(
    () => calculateMonthlySummary(tasks, availableFunds, selectedYearMonth),
    [tasks, availableFunds, selectedYearMonth]
  );
  const rollingProjections = useMemo(
    () => calculateRollingProjection(loans, paymentRecords, availableFunds, selectedYearMonth, 6),
    [loans, paymentRecords, availableFunds, selectedYearMonth]
  );
  const portfolioSummary = useMemo(
    () => calculatePortfolioDebtSummary(loans),
    [loans]
  );

  // Compute tasks for real current month (for native Android widget, urgent alerts & notifications)
  const currentRealMonth = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const todayDateString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const currentRealTasks = useMemo(
    () => getMonthlyInstallmentTasks(loans, paymentRecords, currentRealMonth),
    [loans, paymentRecords, currentRealMonth]
  );
  const currentRealSummary = useMemo(
    () => calculateMonthlySummary(currentRealTasks, availableFunds, currentRealMonth),
    [currentRealTasks, availableFunds, currentRealMonth]
  );

  const nextRealMonth = useMemo(() => format(addMonths(new Date(), 1), 'yyyy-MM'), []);
  const nextRealTasks = useMemo(
    () => getMonthlyInstallmentTasks(loans, paymentRecords, nextRealMonth),
    [loans, paymentRecords, nextRealMonth]
  );
  const notificationTasks = useMemo(
    () => [...currentRealTasks, ...nextRealTasks],
    [currentRealTasks, nextRealTasks]
  );

  const activeCustomTab = navTabs.find(tab => tab.isCustom && tab.id === currentTab);
  const customFilter = activeCustomTab?.customFilter;
  const customTabTasks = customFilter && customFilter !== 'ALL'
    ? tasks.filter(task => task.lender.category === customFilter)
    : tasks;
  const customTabSummary = activeCustomTab
    ? calculateMonthlySummary(customTabTasks, availableFunds, selectedYearMonth)
    : summary;

  useEffect(() => {
    const builtInTabs = ['dashboard', 'todos', 'todo', 'loans', 'planner', 'history', 'widget', 'notifications', 'backup', 'about', 'settings'];
    const isVisibleCustomTab = navTabs.some(tab => tab.isCustom && tab.isVisible && tab.id === currentTab);
    if (!builtInTabs.includes(currentTab) && !isVisibleCustomTab) {
      setCurrentTab('dashboard');
    }
  }, [currentTab, navTabs]);

  // Auto-lock monitor on user activity & visibility/background resume
  useEffect(() => {
    const handleActivity = () => {
      if (!isLocked) recordUserActivity();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!isLocked && checkShouldAutoLock(securityConfig, true)) {
          setIsLocked(true);
        }
      }
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(() => {
      if (!isLocked && checkShouldAutoLock(securityConfig, false)) {
        setIsLocked(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [isLocked, securityConfig]);

  // Check for urgent due alerts (respecting 1-hour snooze & lock screen)
  useEffect(() => {
    if (isLocked) return;
    const overdueOrToday = currentRealTasks.find(t => 
      (t.status === 'OVERDUE' || t.dueDate === todayDateString) &&
      !isTaskSnoozed(t.id)
    );
    if (overdueOrToday && !urgentAlertTask) {
      setUrgentAlertTask(overdueOrToday);
    }
  }, [currentRealTasks, todayDateString, urgentAlertTask, isLocked]);

  // Announce urgent due reminders with the Thai voice engine (suppressed while locked)
  useEffect(() => {
    if (isLocked || !urgentAlertTask) {
      if (!urgentAlertTask) spokenAlertRef.current = null;
      return;
    }
    if (spokenAlertRef.current === urgentAlertTask.id) return;

    spokenAlertRef.current = urgentAlertTask.id;
    if (voiceConfig.enabled && voiceConfig.speakOnDueReminder) {
      void announceTaskReminder(urgentAlertTask);
    }
  }, [urgentAlertTask, voiceConfig.enabled, voiceConfig.speakOnDueReminder, isLocked]);

  // Keep native local notifications in sync with tasks, rules, sound & privacyMode
  useEffect(() => {
    void syncScheduledNotifications(
      notificationTasks,
      notificationRules,
      new Date(),
      voiceConfig.enabled,
      voiceConfig.privacyMode
    );
  }, [notificationTasks, notificationRules, voiceConfig.enabled, voiceConfig.privacyMode]);

  // Apply toggles performed on the Android home screen widget, then refresh state
  useEffect(() => {
    let isDisposed = false;

    const runWidgetSync = async () => {
      try {
        const applied = await syncPendingWidgetToggles();
        if (!isDisposed && applied > 0) {
          reloadState();
        }
      } finally {
        if (!isDisposed) {
          setIsWidgetSyncReady(true);
        }
      }
    };

    void runWidgetSync();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runWidgetSync();
      }
    };
    const handleFocus = () => {
      void runWidgetSync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      isDisposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Android back button: close modals, return to dashboard, then double-back to exit
  useEffect(() => addBackButtonListener(() => {
    if (runBackHandlers()) return;

    if (currentTab !== 'dashboard') {
      setCurrentTab('dashboard');
      return;
    }

    const now = Date.now();
    if (now - lastBackRef.current < 2000) {
      void CapacitorApp.exitApp();
      return;
    }

    lastBackRef.current = now;
    addToast('INFO', 'กดอีกครั้งเพื่อออก', 'กดปุ่ม Back อีกครั้งภายใน 2 วินาทีเพื่อปิดแอป');
  }), [currentTab]);

  // Refresh native state when the app returns to the foreground
  useEffect(() => addAppStateListener(isActive => {
    if (!isActive) return;

    void syncScheduledNotifications(notificationTasks, notificationRules, new Date(), voiceConfig.enabled);
    void syncPendingWidgetToggles().then(applied => {
      if (applied > 0) reloadState();
    });
  }), [notificationTasks, notificationRules, voiceConfig.enabled]);

  // Sync snapshot for Home Screen Widget (only after initial widget toggles are reconciled)
  useEffect(() => {
    if (!isWidgetSyncReady) return;
    syncWidgetSnapshot(appState, currentRealMonth);
  }, [appState, currentRealMonth, isWidgetSyncReady]);

  // Toast Helpers - Single Floating Pill with 1.5s Auto-Fade
  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const newToast: ToastMessage = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      title,
      message,
      timestamp: Date.now(),
    };
    // Replace previous toast immediately (Single Capsule Only)
    setToasts([newToast]);
    const duration = type === 'WARNING' ? 3000 : 1500;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, duration);
  };

  // Handlers
  const handleToggleTask = (task: MonthlyInstallmentTask) => {
    if (task.status !== 'PAID') {
      clearTaskSnooze(task.id, false);
    }

    const result = toggleSubItemPayment(task, { deductFromAvailableFunds: true, triggerConfetti: true });

    const updatedState = loadAppState();
    const updatedTasks = getMonthlyInstallmentTasks(
      updatedState.loans,
      updatedState.paymentRecords,
      selectedYearMonth
    );
    const remainingMonthlyDue = calculateMonthlySummary(
      updatedTasks,
      updatedState.availableFunds,
      selectedYearMonth
    ).totalRemaining;

    if (voiceConfig.enabled && voiceConfig.speakOnMarkPaid) {
      void announcePaymentToggle(task, result.newStatus, remainingMonthlyDue);
    }

    addToast(
      task.status === 'PAID' ? 'INFO' : 'SUCCESS',
      task.status === 'PAID' ? 'ยกเลิกชำระ' : 'ชำระแล้ว',
      `${task.loanTitle} (${task.subTitle})`
    );
  };

  const handleUpdateAvailableFunds = (funds: number) => {
    saveAvailableFunds(funds);
  };

  const handleSelectYearMonth = (ym: string) => {
    saveSelectedYearMonth(ym);
  };

  const handleSaveLoan = (loan: LoanAccount) => {
    const existingIndex = loans.findIndex(l => l.id === loan.id);
    let updatedLoans: LoanAccount[];
    if (existingIndex >= 0) {
      updatedLoans = [...loans];
      updatedLoans[existingIndex] = loan;
    } else {
      updatedLoans = [loan, ...loans];
    }
    saveLoans(updatedLoans);
    setEditingLoan(undefined);
    addToast('SUCCESS', 'บันทึกสัญญาแล้ว', loan.title);
  };

  const handleRedrawLoan = (
    loanId: string,
    options: {
      mode: CreditDrawdownMode;
      customAmount?: number;
      addToAvailableFunds: boolean;
      note?: string;
    }
  ) => {
    const res = redrawLoanCredit(loanId, options);
    setRedrawingLoan(null);
    if (res.success) {
      addToast('SUCCESS', 'หมุนเงินสำเร็จ', res.message);
    } else {
      addToast('WARNING', 'ไม่สามารถหมุนเงินได้', res.message);
    }
  };

  const handleRevertDrawdown = (drawdownId: string) => {
    const res = revertLoanDrawdown(drawdownId);
    if (res.success) {
      addToast('INFO', 'ยกเลิกรายการหมุนเงินแล้ว', res.message);
    } else {
      addToast('WARNING', 'ไม่สามารถยกเลิกได้', res.message);
    }
  };

  const handleDeleteLoan = (loanId: string) => {
    deleteLoanAndRecords(loanId);
    addToast('INFO', 'ลบสัญญาแล้ว', 'นำออกจากระบบเรียบร้อย');
  };

  const handleToggleThemeMode = () => {
    const nextMode = isDark ? 'LIGHT' : 'DARK';
    savePencilConfig({ ...pencilConfig, themeMode: nextMode });
  };

  const handleImportLoans = (importedLoans: LoanAccount[], mode: 'MERGE' | 'REPLACE') => {
    if (mode === 'REPLACE') {
      saveLoans(importedLoans);
      addToast('SUCCESS', 'นำเข้าข้อมูลแล้ว', `แทนที่สัญญาทั้งหมดด้วย ${importedLoans.length} สัญญาจาก Excel`);
    } else {
      const merged = [...importedLoans, ...loans];
      saveLoans(merged);
      addToast('SUCCESS', 'นำเข้าข้อมูลแล้ว', `เพิ่มสัญญาใหม่ ${importedLoans.length} สัญญาจาก Excel`);
    }
  };

  const handleLoadSampleData = () => {
    loadDemoData();
    addToast('SUCCESS', 'โหลดข้อมูลตัวอย่างแล้ว', 'เพิ่มสัญญาตัวอย่าง 4 รายการเข้าสู่ระบบ');
  };

  const handleClearSampleData = () => {
    removeDemoData();
    addToast('INFO', 'ล้างข้อมูลตัวอย่างแล้ว', 'ลบสัญญาตัวอย่างออกจากระบบเรียบร้อย');
  };

  const hasDemoLoans = useMemo(() => hasDemoData(loans), [loans]);

  // Strict Lock Screen Isolation: ขณะล็อกห้าม mount เนื้อหาหรือ Modal ใด ๆ ทับหน้าจอล็อก
  if (isLocked) {
    return (
      <div className={`min-h-screen flex flex-col font-sans relative ${
        isDark ? 'bg-[#121212] text-stone-100 theme-pure-dark' : 'bg-[#FBF9F4] text-stone-900 theme-pure-light'
      }`}>
        <SecurityLockScreen
          config={securityConfig}
          voiceConfig={voiceConfig}
          onUnlocked={() => {
            recordUserActivity();
            setIsLocked(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans relative transition-colors duration-300 ${
      isDark ? 'bg-[#121212] text-stone-100 theme-pure-dark' : 'bg-[#FBF9F4] text-stone-900 theme-pure-light'
    }`}>
      {/* ThaiPencil Watermark Backdrop (เคารพ lowSpecMode) */}
      {!pencilConfig.lowSpecMode && (
        <ThaiPencilBackdrop
          intensity={pencilConfig.pencilIntensity}
          isDark={isDark}
        />
      )}

      {/* Notification Toast Hub */}
      <NotificationToastHub
        toasts={toasts}
        onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />

      {/* In-App Due Alert Modal */}
      <DueAlertModal
        task={urgentAlertTask}
        isOpen={urgentAlertTask !== null}
        voiceConfig={voiceConfig}
        onClose={() => {
          if (urgentAlertTask) {
            snoozeTaskAlert(urgentAlertTask.id, 60, false);
            addToast('INFO', 'เลื่อนเตือน 1 ชม.', urgentAlertTask.loanTitle);
          }
          setUrgentAlertTask(null);
        }}
        onMarkPaid={(t) => {
          clearTaskSnooze(t.id, false);
          handleToggleTask(t);
          setUrgentAlertTask(null);
        }}
        onSnooze={(t) => {
          snoozeTaskAlert(t.id, 60, false);
          addToast('INFO', 'เลื่อนเตือน 1 ชม.', t.loanTitle);
          setUrgentAlertTask(null);
        }}
      />

      {/* Top & Mobile Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingCount={summary.pendingCount + summary.overdueCount}
        navTabs={navTabs}
        pencilConfig={pencilConfig}
        voiceConfig={voiceConfig}
        onUpdateVoiceConfig={saveVoiceConfig}
        isDarkTheme={isDark}
        onToggleThemeMode={handleToggleThemeMode}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onLoadSampleData={handleLoadSampleData}
        onClearSampleData={handleClearSampleData}
        hasSampleData={hasDemoLoans}
      />

      {/* Main Screen Content - Edge-to-edge Fullscreen without bottom bar */}
      <main className="flex-1 px-3 sm:px-6 lg:px-8 py-5 max-w-6xl w-full mx-auto relative z-10 pb-8 md:pb-12">
        {currentTab === 'dashboard' && (
          <DashboardView
            tasks={tasks}
            summary={summary}
            portfolioSummary={portfolioSummary}
            loans={loans}
            paymentRecords={paymentRecords}
            widgetConfig={widgetConfig}
            selectedYearMonth={selectedYearMonth}
            voiceConfig={voiceConfig}
            lowSpecMode={pencilConfig.lowSpecMode}
            onSelectYearMonth={handleSelectYearMonth}
            onUpdateAvailableFunds={handleUpdateAvailableFunds}
            onToggleTask={handleToggleTask}
            onNavigateToTab={setCurrentTab}
            onAddFirstLoan={() => setEditingLoan(null)}
            onOpenExcelModal={() => setIsExcelModalOpen(true)}
            onLoadSampleData={handleLoadSampleData}
          />
        )}

        {(currentTab === 'todos' || currentTab === 'todo' || activeCustomTab) && (
          <TodoListView
            tasks={activeCustomTab ? customTabTasks : tasks}
            summary={activeCustomTab ? customTabSummary : summary}
            portfolioSummary={portfolioSummary}
            loans={loans}
            paymentRecords={paymentRecords}
            selectedYearMonth={selectedYearMonth}
            titleOverride={activeCustomTab?.label}
            onToggleTask={handleToggleTask}
            onAddNewLoan={() => setEditingLoan(null)}
            onInspectAlert={(task) => setUrgentAlertTask(task)}
            onOpenExcelModal={() => setIsExcelModalOpen(true)}
          />
        )}

        {currentTab === 'loans' && (
          <LoanManagerView
            loans={loans}
            paymentRecords={paymentRecords}
            portfolioSummary={portfolioSummary}
            onAddLoan={() => setEditingLoan(null)}
            onEditLoan={(loan) => setEditingLoan(loan)}
            onSaveLoan={handleSaveLoan}
            onDeleteLoan={handleDeleteLoan}
            onRedrawLoan={(loan) => setRedrawingLoan(loan)}
            onOpenExcelModal={() => setIsExcelModalOpen(true)}
            onLoadSampleData={handleLoadSampleData}
          />
        )}

        <React.Suspense
          fallback={
            <div className="py-16 text-center text-xs font-bold text-stone-400 animate-pulse">
              กำลังโหลดหน้าจอ...
            </div>
          }
        >
          {currentTab === 'planner' && (
            <DebtPlannerView
              loans={loans}
              onAddNewLoan={() => setEditingLoan(null)}
            />
          )}

          {currentTab === 'history' && (
            <PaymentHistoryView
              loans={loans}
              paymentRecords={paymentRecords}
              drawdownRecords={drawdownRecords}
              onRevertDrawdown={handleRevertDrawdown}
            />
          )}

          {currentTab === 'about' && (
            <AboutHelpView
              loans={loans}
              paymentRecords={paymentRecords}
              onRefreshState={reloadState}
            />
          )}

          {currentTab === 'widget' && (
            <WidgetStudioView
              tasks={tasks}
              summary={summary}
              portfolioSummary={portfolioSummary}
              config={widgetConfig}
              onToggleTask={handleToggleTask}
              onUpdateConfig={(cfg) => saveWidgetConfig(cfg)}
            />
          )}

          {currentTab === 'notifications' && (
            <NotificationCenterView
              rules={notificationRules}
              tasks={notificationTasks}
              voiceConfig={voiceConfig}
              onUpdateRules={(rules) => saveNotificationRules(rules)}
              onUpdateVoiceConfig={saveVoiceConfig}
            />
          )}

          {currentTab === 'backup' && (
            <GmailBackupView
              backupMeta={backupMeta}
              tasks={tasks}
              summary={summary}
              loans={loans}
              paymentRecords={paymentRecords}
              selectedYearMonth={selectedYearMonth}
              onRefreshState={reloadState}
              onOpenExcelModal={() => setIsExcelModalOpen(true)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              pencilConfig={pencilConfig}
              voiceConfig={voiceConfig}
              securityConfig={securityConfig}
              navTabs={navTabs}
              onUpdatePencilConfig={savePencilConfig}
              onUpdateVoiceConfig={saveVoiceConfig}
              onUpdateSecurityConfig={saveSecurityConfig}
              onUpdateNavTabs={saveNavTabs}
              onClearAllData={clearAllData}
              isDarkTheme={isDark}
              onOpenExcelModal={() => setIsExcelModalOpen(true)}
            />
          )}
        </React.Suspense>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenMoreMenu={() => setCurrentTab('settings')}
        onQuickAddLoan={() => setEditingLoan(null)}
        overdueCount={summary.overdueCount}
        remainingCount={summary.pendingCount + summary.overdueCount}
      />

      {/* Add / Edit Loan Modal */}
      {editingLoan !== undefined && (
        <LoanFormModal
          initialLoan={editingLoan}
          onSave={handleSaveLoan}
          onClose={() => setEditingLoan(undefined)}
        />
      )}

      {/* Credit Redraw / Cash Rotation Modal */}
      <CreditRedrawModal
        loan={redrawingLoan}
        availableFunds={availableFunds}
        onClose={() => setRedrawingLoan(null)}
        onConfirm={handleRedrawLoan}
      />

      {/* Excel Import / Export / Sample Data Modal (Lazy Loaded) */}
      {isExcelModalOpen && (
        <React.Suspense fallback={null}>
          <ExcelDataModal
            isOpen={isExcelModalOpen}
            onClose={() => setIsExcelModalOpen(false)}
            loans={loans}
            tasks={tasks}
            summary={summary}
            rollingProjections={rollingProjections}
            selectedYearMonth={selectedYearMonth}
            hasSampleData={hasDemoLoans}
            onImportLoans={handleImportLoans}
            onLoadSampleData={handleLoadSampleData}
            onClearSampleData={handleClearSampleData}
          />
        </React.Suspense>
      )}
    </div>
  );
}

export default App;
