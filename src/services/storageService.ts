import { 
  LoanAccount, 
  MonthlyPaymentRecord, 
  NotificationRule, 
  WidgetConfig, 
  GmailBackupMeta,
  ThaiVoiceConfig,
  ThaiPencilConfig,
  NavTabItem,
  SecurityConfig,
  AppStateData 
} from '../types/loan';
import { 
  DEFAULT_NOTIFICATION_RULES, 
  DEFAULT_WIDGET_CONFIG,
  DEFAULT_VOICE_CONFIG,
  DEFAULT_PENCIL_CONFIG,
  DEFAULT_NAV_TABS,
  DEFAULT_SECURITY_CONFIG
} from '../data/lenders';
import { format } from 'date-fns';

const STORAGE_KEYS = {
  LOANS: 'debtflow_loans_v1',
  RECORDS: 'debtflow_records_v1',
  AVAILABLE_FUNDS: 'debtflow_available_funds_v1',
  NOTIFICATION_RULES: 'debtflow_notif_rules_v1',
  WIDGET_CONFIG: 'debtflow_widget_config_v1',
  BACKUP_META: 'debtflow_backup_meta_v1',
  VOICE_CONFIG: 'debtflow_voice_config_v1',
  SELECTED_YM: 'debtflow_selected_ym_v1',
  PENCIL_CONFIG: 'debtflow_pencil_config_v1',
  NAV_TABS: 'debtflow_nav_tabs_v1',
  SECURITY_CONFIG: 'debtflow_security_config_v1',
  SNOOZE_MAP: 'debtflow_snooze_alerts_v1',
  COLLAPSIBLE_MAP: 'debtflow_collapsible_v1',
};

export const DEMO_LOAN_IDS = [
  'loan-spaylater-1',
  'loan-kbank-split',
  'loan-linebk-1',
  'loan-tidlor-1',
] as const;

const EXTRA_CLEAR_KEYS = [
  'debtflow_widget_snapshot_v1',
  'debtflow_scheduled_notification_ids_v1',
  'debtflow_line_profile_v1',
];

// In-memory fallback store for Node.js / SSR / Unit test environment
const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryStore.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    memoryStore.delete(key);
  },
};

export const STATE_CHANGE_EVENT = 'debtflow_state_changed';

export type StateChangeListener = () => void;
const stateChangeListeners = new Set<StateChangeListener>();

export function addStateChangeListener(listener: StateChangeListener): () => void {
  stateChangeListeners.add(listener);
  return () => {
    stateChangeListeners.delete(listener);
  };
}

export function broadcastStateChange(): void {
  for (const listener of stateChangeListeners) {
    try {
      listener();
    } catch (e) {
      console.error('State change listener error', e);
    }
  }
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      window.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT));
    } catch {}
  }
}

export function getCurrentYearMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function loadAppState(): AppStateData {
  try {
    const rawLoans = safeStorage.getItem(STORAGE_KEYS.LOANS);
    const rawRecords = safeStorage.getItem(STORAGE_KEYS.RECORDS);
    const rawFunds = safeStorage.getItem(STORAGE_KEYS.AVAILABLE_FUNDS);
    const rawRules = safeStorage.getItem(STORAGE_KEYS.NOTIFICATION_RULES);
    const rawWidget = safeStorage.getItem(STORAGE_KEYS.WIDGET_CONFIG);
    const rawBackup = safeStorage.getItem(STORAGE_KEYS.BACKUP_META);
    const rawVoice = safeStorage.getItem(STORAGE_KEYS.VOICE_CONFIG);
    const rawYm = safeStorage.getItem(STORAGE_KEYS.SELECTED_YM);
    const rawPencil = safeStorage.getItem(STORAGE_KEYS.PENCIL_CONFIG);
    const rawTabs = safeStorage.getItem(STORAGE_KEYS.NAV_TABS);
    const rawSecurity = safeStorage.getItem(STORAGE_KEYS.SECURITY_CONFIG);

    const currentYm = getCurrentYearMonth();

    const loans: LoanAccount[] = rawLoans ? JSON.parse(rawLoans) : [];
    const paymentRecords: MonthlyPaymentRecord[] = rawRecords ? JSON.parse(rawRecords) : [];
    const parsedFunds = rawFunds !== null ? parseFloat(rawFunds) : 0;
    const availableFunds = Number.isFinite(parsedFunds) ? parsedFunds : 0;
    const notificationRules: NotificationRule[] = rawRules ? JSON.parse(rawRules) : DEFAULT_NOTIFICATION_RULES;
    const widgetConfig: WidgetConfig = rawWidget ? JSON.parse(rawWidget) : DEFAULT_WIDGET_CONFIG;
    const parsedBackup = rawBackup ? (JSON.parse(rawBackup) || {}) : {};
    const backupMeta: GmailBackupMeta = {
      lastBackupAt: parsedBackup.lastBackupAt,
      backupFileVersion: parsedBackup.backupFileVersion || '1.0.0',
      autoBackupOnPaid: parsedBackup.autoBackupOnPaid ?? true,
    };
    const voiceConfig: ThaiVoiceConfig = rawVoice 
      ? { ...DEFAULT_VOICE_CONFIG, ...JSON.parse(rawVoice) } 
      : DEFAULT_VOICE_CONFIG;
    const selectedYearMonth = rawYm || currentYm;
    const pencilConfig: ThaiPencilConfig = rawPencil
      ? { ...DEFAULT_PENCIL_CONFIG, ...JSON.parse(rawPencil) }
      : DEFAULT_PENCIL_CONFIG;
    const navTabs: NavTabItem[] = rawTabs
      ? JSON.parse(rawTabs)
      : DEFAULT_NAV_TABS;
    const securityConfig: SecurityConfig = rawSecurity
      ? { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(rawSecurity) }
      : DEFAULT_SECURITY_CONFIG;

    // First time setup: persist defaults
    if (!rawLoans) {
      saveLoans(loans, false);
      savePaymentRecords(paymentRecords, false);
      saveAvailableFunds(availableFunds, false);
      saveNotificationRules(notificationRules, false);
      saveWidgetConfig(widgetConfig, false);
      saveBackupMeta(backupMeta, false);
      saveVoiceConfig(voiceConfig, false);
      savePencilConfig(pencilConfig, false);
      saveNavTabs(navTabs, false);
      saveSecurityConfig(securityConfig, false);
    }

    return {
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
    };
  } catch (e) {
    console.error('Failed to load app state from localStorage', e);
    return {
      loans: [],
      paymentRecords: [],
      availableFunds: 0,
      notificationRules: DEFAULT_NOTIFICATION_RULES,
      widgetConfig: DEFAULT_WIDGET_CONFIG,
      backupMeta: {
        backupFileVersion: '1.0.0',
        autoBackupOnPaid: true,
      },
      voiceConfig: DEFAULT_VOICE_CONFIG,
      pencilConfig: DEFAULT_PENCIL_CONFIG,
      navTabs: DEFAULT_NAV_TABS,
      securityConfig: DEFAULT_SECURITY_CONFIG,
      selectedYearMonth: getCurrentYearMonth(),
    };
  }
}

export function saveLoans(loans: LoanAccount[], notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
  if (notify) broadcastStateChange();
}

export function savePaymentRecords(records: MonthlyPaymentRecord[], notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  if (notify) broadcastStateChange();
}

export function saveAvailableFunds(amount: number, notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.AVAILABLE_FUNDS, amount.toString());
  if (notify) broadcastStateChange();
}

export function saveNotificationRules(rules: NotificationRule[], notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.NOTIFICATION_RULES, JSON.stringify(rules));
  if (notify) broadcastStateChange();
}

export function saveWidgetConfig(config: WidgetConfig, notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.WIDGET_CONFIG, JSON.stringify(config));
  if (notify) broadcastStateChange();
}

export function saveBackupMeta(meta: GmailBackupMeta, notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.BACKUP_META, JSON.stringify(meta));
  if (notify) broadcastStateChange();
}

export function saveVoiceConfig(config: ThaiVoiceConfig, notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.VOICE_CONFIG, JSON.stringify(config));
  if (notify) broadcastStateChange();
}

export function savePencilConfig(config: ThaiPencilConfig, notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.PENCIL_CONFIG, JSON.stringify(config));
  if (notify) broadcastStateChange();
}

export function saveNavTabs(tabs: NavTabItem[], notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.NAV_TABS, JSON.stringify(tabs));
  if (notify) broadcastStateChange();
}

export function saveSecurityConfig(config: SecurityConfig, notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.SECURITY_CONFIG, JSON.stringify(config));
  if (notify) broadcastStateChange();
}

export function saveSelectedYearMonth(ym: string, notify: boolean = true): void {
  safeStorage.setItem(STORAGE_KEYS.SELECTED_YM, ym);
  if (notify) broadcastStateChange();
}

export function getSnoozeMap(): Record<string, number> {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.SNOOZE_MAP);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function snoozeTaskAlert(taskId: string, minutes: number = 60, notify: boolean = true): void {
  const map = getSnoozeMap();
  map[taskId] = Date.now() + minutes * 60 * 1000;
  safeStorage.setItem(STORAGE_KEYS.SNOOZE_MAP, JSON.stringify(map));
  if (notify) broadcastStateChange();
}

export function clearTaskSnooze(taskId: string, notify: boolean = false): void {
  const map = getSnoozeMap();
  if (map[taskId]) {
    delete map[taskId];
    safeStorage.setItem(STORAGE_KEYS.SNOOZE_MAP, JSON.stringify(map));
    if (notify) broadcastStateChange();
  }
}

export function isTaskSnoozed(taskId: string): boolean {
  const map = getSnoozeMap();
  const snoozedUntil = map[taskId];
  if (!snoozedUntil) return false;
  return Date.now() < snoozedUntil;
}

export function saveCollapsibleState(key: string, isCollapsed: boolean): void {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.COLLAPSIBLE_MAP);
    const map = raw ? JSON.parse(raw) : {};
    map[key] = isCollapsed;
    safeStorage.setItem(STORAGE_KEYS.COLLAPSIBLE_MAP, JSON.stringify(map));
  } catch {}
}

export function loadCollapsibleState(key: string, defaultVal: boolean = false): boolean {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.COLLAPSIBLE_MAP);
    if (!raw) return defaultVal;
    const map = JSON.parse(raw);
    return map[key] !== undefined ? !!map[key] : defaultVal;
  } catch {
    return defaultVal;
  }
}

export function clearAllData(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    safeStorage.removeItem(key);
  }
  for (const key of EXTRA_CLEAR_KEYS) {
    safeStorage.removeItem(key);
  }
  broadcastStateChange();
}

export function removeDemoData(): number {
  const demoIds = new Set<string>(DEMO_LOAN_IDS);
  let loans: LoanAccount[] = [];
  let records: MonthlyPaymentRecord[] = [];

  try {
    loans = JSON.parse(safeStorage.getItem(STORAGE_KEYS.LOANS) || '[]');
    records = JSON.parse(safeStorage.getItem(STORAGE_KEYS.RECORDS) || '[]');
  } catch {
    return 0;
  }

  const keptLoans = loans.filter(loan => !demoIds.has(loan.id));
  const removedCount = loans.length - keptLoans.length;
  const keptRecords = records.filter(record => !demoIds.has(record.loanId));

  saveLoans(keptLoans, false);
  savePaymentRecords(keptRecords, false);
  broadcastStateChange();
  return removedCount;
}

export const SAMPLE_DEMO_LOANS: LoanAccount[] = [
  {
    id: 'loan-kbank-split',
    lenderId: 'kbank',
    title: 'สินเชื่อ Xpress Loan กสิกรไทย',
    contractNumber: 'KB-884920',
    loanType: 'MULTI_DAY_SPLIT',
    totalPrincipal: 120000,
    remainingPrincipal: 85000,
    interestRateAnnual: 15.0,
    totalInstallments: 24,
    startDate: '2026-01-05',
    subItems: [
      {
        id: 'sub-kbank-1',
        loanId: 'loan-kbank-split',
        title: 'งวดรอบต้นเดือน (วันที่ 5)',
        dueDayOfMonth: 5,
        dueTime: '18:00',
        amount: 3500,
        subType: 'SPLIT_DAY',
      },
      {
        id: 'sub-kbank-2',
        loanId: 'loan-kbank-split',
        title: 'งวดรอบปลายเดือน (วันที่ 20)',
        dueDayOfMonth: 20,
        dueTime: '18:00',
        amount: 3500,
        subType: 'SPLIT_DAY',
      },
    ],
    isActive: true,
    notes: 'ข้อมูลตัวอย่าง: แบ่งจ่ายเดือนละ 2 รอบเพื่อลดภาระเงินก้อน',
    createdAt: '2026-01-05T09:00:00.000Z',
    updatedAt: '2026-01-05T09:00:00.000Z',
  },
  {
    id: 'loan-spaylater-1',
    lenderId: 'spaylater',
    title: 'Shopee SPayLater ผ่อนอุปกรณ์ทำงาน',
    contractNumber: 'SP-202610',
    loanType: 'INSTALLMENT_PLAN',
    totalPrincipal: 30000,
    remainingPrincipal: 12400,
    interestRateAnnual: 0,
    totalInstallments: 10,
    startDate: '2026-03-10',
    subItems: [
      {
        id: 'sub-spay-1',
        loanId: 'loan-spaylater-1',
        title: 'บิลรายเดือน SPayLater (วันที่ 10)',
        dueDayOfMonth: 10,
        dueTime: '20:00',
        amount: 2480,
        subType: 'SUB_BILL',
      },
    ],
    isActive: true,
    notes: 'ข้อมูลตัวอย่าง: ผ่อนสินค้า 0% ผ่านแอปดิจิทัล',
    createdAt: '2026-03-10T09:00:00.000Z',
    updatedAt: '2026-03-10T09:00:00.000Z',
  },
  {
    id: 'loan-linebk-1',
    lenderId: 'linebk',
    title: 'วงเงินให้ยืมพร้อมใช้ LINE BK',
    contractNumber: 'LBK-55109',
    loanType: 'REVOLVING_MIN',
    totalPrincipal: 50000,
    remainingPrincipal: 32000,
    interestRateAnnual: 18.0,
    totalInstallments: 12,
    startDate: '2026-02-15',
    subItems: [
      {
        id: 'sub-linebk-1',
        loanId: 'loan-linebk-1',
        title: 'งวดชำระประจำเดือน (วันที่ 15)',
        dueDayOfMonth: 15,
        dueTime: '18:00',
        amount: 3200,
        subType: 'SPLIT_DAY',
      },
    ],
    isActive: true,
    notes: 'ข้อมูลตัวอย่าง: วงเงินหมุนเวียนตัดบัญชีอัตโนมัติ',
    createdAt: '2026-02-15T09:00:00.000Z',
    updatedAt: '2026-02-15T09:00:00.000Z',
  },
  {
    id: 'loan-tidlor-1',
    lenderId: 'tidlor',
    title: 'สินเชื่อทะเบียนรถยนต์ เงินติดล้อ',
    contractNumber: 'NTL-90311',
    loanType: 'EFFECTIVE_RATE',
    totalPrincipal: 150000,
    remainingPrincipal: 96000,
    interestRateAnnual: 12.5,
    totalInstallments: 36,
    startDate: '2025-11-25',
    subItems: [
      {
        id: 'sub-tidlor-1',
        loanId: 'loan-tidlor-1',
        title: 'งวดไฟแนนซ์รถยนต์ (วันที่ 25)',
        dueDayOfMonth: 25,
        dueTime: '17:00',
        amount: 4800,
        subType: 'SPLIT_DAY',
      },
    ],
    isActive: true,
    notes: 'ข้อมูลตัวอย่าง: สินเชื่อลดต้นลดดอก',
    createdAt: '2025-11-25T09:00:00.000Z',
    updatedAt: '2025-11-25T09:00:00.000Z',
  },
];

export function hasDemoData(loans?: LoanAccount[]): boolean {
  const demoIds = new Set<string>(DEMO_LOAN_IDS);
  const targetLoans = loans ?? loadAppState().loans;
  return targetLoans.some(l => demoIds.has(l.id));
}

export function loadDemoData(): number {
  const state = loadAppState();
  const existingIds = new Set(state.loans.map(l => l.id));
  const toAdd = SAMPLE_DEMO_LOANS.filter(d => !existingIds.has(d.id));
  const merged = [...state.loans, ...toAdd];
  saveLoans(merged, false);

  if (state.availableFunds <= 0) {
    saveAvailableFunds(25000, false);
  }

  broadcastStateChange();
  return toAdd.length;
}

export function updateLoanSubItemAmount(loanId: string, subItemId: string, newAmount: number): boolean {
  const state = loadAppState();
  const idx = state.loans.findIndex(l => l.id === loanId);
  if (idx < 0) return false;

  const validAmount = Math.max(0, newAmount);
  const targetLoan = state.loans[idx];
  const updatedSubs = targetLoan.subItems.map(s =>
    s.id === subItemId ? { ...s, amount: validAmount } : s
  );
  const updatedLoans = [...state.loans];
  updatedLoans[idx] = {
    ...targetLoan,
    subItems: updatedSubs,
    updatedAt: new Date().toISOString(),
  };

  saveLoans(updatedLoans, false);

  // If there's an unpaid payment record for this subItem in current month, sync amountDue
  let recordUpdated = false;
  const currentYm = getCurrentYearMonth();
  const updatedRecords = state.paymentRecords.map(r => {
    if (r.loanId === loanId && r.subItemId === subItemId && r.yearMonth === currentYm && r.status !== 'PAID') {
      recordUpdated = true;
      return { ...r, amountDue: validAmount };
    }
    return r;
  });

  if (recordUpdated) {
    savePaymentRecords(updatedRecords, false);
  }

  broadcastStateChange();
  return true;
}

export function deleteLoanAndRecords(loanId: string): void {
  const state = loadAppState();
  const updatedLoans = state.loans.filter(l => l.id !== loanId);
  const updatedRecords = state.paymentRecords.filter(r => r.loanId !== loanId);
  saveLoans(updatedLoans, false);
  savePaymentRecords(updatedRecords, true);
}
