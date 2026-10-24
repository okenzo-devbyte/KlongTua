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
  STATE_CHANGE_EVENT 
} from './services/storageService';
import { 
  getMonthlyInstallmentTasks, 
  calculateMonthlySummary,
  calculateRollingProjection,
  calculatePortfolioDebtSummary
} from './utils/cashflowCalculator';
import { toggleSubItemPayment, saveWidgetSnapshot, syncPendingWidgetToggles } from './services/widgetBridgeService';
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
  PortfolioDebtSummary 
} from './types/loan';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { TodoListView } from './components/TodoListView';
import { WidgetStudioView } from './components/WidgetStudioView';
import { LoanManagerView } from './components/LoanManagerView';
import { LoanFormModal } from './components/LoanFormModal';
import { NotificationCenterView } from './components/NotificationCenterView';
import { GmailBackupView } from './components/GmailBackupView';
import { SettingsView } from './components/SettingsView';
import { ThaiPencilBackdrop } from './components/ThaiPencilBackdrop';
import { SecurityLockScreen } from './components/SecurityLockScreen';
import { DueAlertModal } from './components/DueAlertModal';
import { NotificationToastHub, ToastMessage } from './components/NotificationToastHub';
import { ExcelDataModal } from './components/ExcelDataModal';

export function App() {
  const [appState, setAppState] = useState(loadAppState());
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [editingLoan, setEditingLoan] = useState<LoanAccount | null | undefined>(undefined);
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

  const activeCustomTab = navTabs.find(tab => tab.isCustom && tab.id === currentTab);
  const customFilter = activeCustomTab?.customFilter;
  const customTabTasks = customFilter && customFilter !== 'ALL'
    ? tasks.filter(task => task.lender.category === customFilter)
    : tasks;
  const customTabSummary = activeCustomTab
    ? calculateMonthlySummary(customTabTasks, availableFunds, selectedYearMonth)
    : summary;

  useEffect(() => {
    const builtInTabs = ['dashboard', 'todos', 'todo', 'loans', 'widget', 'notifications', 'backup', 'settings'];
    const isVisibleCustomTab = navTabs.some(tab => tab.isCustom && tab.isVisible && tab.id === currentTab);
    if (!builtInTabs.includes(currentTab) && !isVisibleCustomTab) {
      setCurrentTab('dashboard');
    }
  }, [currentTab, navTabs]);

  // Auto-lock monitor on user activity
  useEffect(() => {
    const handleActivity = () => {
      recordUserActivity();
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    const interval = setInterval(() => {
      if (!isLocked && checkShouldAutoLock(securityConfig)) {
        setIsLocked(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      clearInterval(interval);
    };
  }, [isLocked, securityConfig]);

  // Check for urgent due alerts (respecting 1-hour snooze)
  useEffect(() => {
    const overdueOrToday = tasks.find(t => 
      (t.status === 'OVERDUE' || t.dueDate === new Date().toISOString().slice(0, 10)) &&
      !isTaskSnoozed(t.id)
    );
    if (overdueOrToday && !urgentAlertTask) {
      setUrgentAlertTask(overdueOrToday);
    }
  }, [tasks]);

  // Announce urgent due reminders with the Thai voice engine
  useEffect(() => {
    if (!urgentAlertTask) {
      spokenAlertRef.current = null;
      return;
    }
    if (spokenAlertRef.current === urgentAlertTask.id) return;

    spokenAlertRef.current = urgentAlertTask.id;
    if (voiceConfig.enabled && voiceConfig.speakOnDueReminder) {
      void announceTaskReminder(urgentAlertTask);
    }
  }, [urgentAlertTask, voiceConfig.enabled, voiceConfig.speakOnDueReminder]);

  // Keep native local notifications in sync with tasks and rules
  useEffect(() => {
    void syncScheduledNotifications(tasks, notificationRules);
  }, [tasks, notificationRules]);

  // Apply toggles performed on the Android home screen widget, then refresh state
  useEffect(() => {
    let isDisposed = false;

    const runWidgetSync = async () => {
      const applied = await syncPendingWidgetToggles();
      if (!isDisposed && applied > 0) {
        reloadState();
      }
    };

    void runWidgetSync();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runWidgetSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

    void syncScheduledNotifications(tasks, notificationRules);
    void syncPendingWidgetToggles().then(applied => {
      if (applied > 0) reloadState();
    });
  }), [tasks, notificationRules]);

  // Sync snapshot for Home Screen Widget
  useEffect(() => {
    saveWidgetSnapshot({
      updatedAt: new Date().toISOString(),
      yearMonth: selectedYearMonth,
      totalRemainingDue: summary.totalRemaining,
      availableFunds: summary.availableFunds,
      isSufficient: summary.isSufficient,
      shortfallAmount: summary.shortfallAmount,
      totalRemainingDebt: portfolioSummary.totalRemainingAllLoans,
      totalPrincipalDebt: portfolioSummary.totalPrincipalAllLoans,
      tasks: tasks.map(t => ({
        id: t.id,
        loanId: t.loanId,
        subItemId: t.subItemId,
        lenderNameTh: t.lender.nameTh,
        badgeText: t.lender.badgeText,
        primaryColor: t.lender.primaryColor,
        loanTitle: t.loanTitle,
        subTitle: t.subTitle,
        dueDateFormatted: t.dueDate,
        dueTime: t.dueTime,
        amount: t.amount,
        isPaid: t.status === 'PAID',
        isOverdue: t.status === 'OVERDUE',
      })),
    });
  }, [summary, tasks, selectedYearMonth, portfolioSummary]);

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

  const handleDeleteLoan = (loanId: string) => {
    const updated = loans.filter(l => l.id !== loanId);
    saveLoans(updated);
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

  return (
    <div className={`min-h-screen flex flex-col font-sans relative transition-colors duration-300 ${
      isDark ? 'bg-[#121212] text-stone-100 theme-pure-dark' : 'bg-[#FBF9F4] text-stone-900 theme-pure-light'
    }`}>
      {/* ThaiPencil Watermark Backdrop */}
      <ThaiPencilBackdrop 
        intensity={pencilConfig.pencilIntensity} 
        isDark={isDark} 
      />

      {/* Security Lock Screen */}
      {isLocked && (
        <SecurityLockScreen
          config={securityConfig}
          voiceConfig={voiceConfig}
          onUnlocked={() => setIsLocked(false)}
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

        {currentTab === 'loans' && (
          <LoanManagerView
            loans={loans}
            portfolioSummary={portfolioSummary}
            onAddLoan={() => setEditingLoan(null)}
            onEditLoan={(loan) => setEditingLoan(loan)}
            onDeleteLoan={handleDeleteLoan}
            onOpenExcelModal={() => setIsExcelModalOpen(true)}
            onLoadSampleData={handleLoadSampleData}
          />
        )}

        {currentTab === 'notifications' && (
          <NotificationCenterView
            rules={notificationRules}
            tasks={tasks}
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
      </main>

      {/* Add / Edit Loan Modal */}
      {editingLoan !== undefined && (
        <LoanFormModal
          initialLoan={editingLoan}
          onSave={handleSaveLoan}
          onClose={() => setEditingLoan(undefined)}
        />
      )}

      {/* Excel Import / Export / Sample Data Modal */}
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
    </div>
  );
}

export default App;
