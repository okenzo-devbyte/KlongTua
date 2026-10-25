import { 
  MonthlyInstallmentTask, 
  MonthlyPaymentRecord, 
  LoanAccount,
  PaymentStatus,
  AppStateData
} from '../types/loan';
import { 
  loadAppState, 
  savePaymentRecords, 
  saveAvailableFunds, 
  saveLoans,
  broadcastStateChange,
  safeStorage,
  addStateChangeListener 
} from './storageService';
import { 
  getMonthlyInstallmentTasks, 
  calculateMonthlySummary, 
  calculatePortfolioDebtSummary 
} from '../utils/cashflowCalculator';
import { format } from 'date-fns';
import { Capacitor, registerPlugin } from '@capacitor/core';
import confetti from 'canvas-confetti';

export interface WidgetSnapshot {
  updatedAt: string;
  yearMonth: string;
  totalRemainingDue: number;
  availableFunds: number;
  isSufficient: boolean;
  shortfallAmount: number;
  totalRemainingDebt?: number;
  totalPrincipalDebt?: number;
  hasLoans?: boolean;
  totalLoanCount?: number;
  tasks: Array<{
    id: string;
    loanId: string;
    subItemId: string;
    lenderNameTh: string;
    badgeText: string;
    primaryColor: string;
    loanTitle: string;
    subTitle: string;
    dueDateFormatted: string;
    dueTime: string;
    amount: number;
    isPaid: boolean;
    isOverdue: boolean;
  }>;
}

const WIDGET_SNAPSHOT_KEY = 'debtflow_widget_snapshot_v1';

export interface PendingWidgetToggle {
  taskId: string;
  isPaid: boolean;
}

interface WidgetBridgeNativePlugin {
  updateSnapshot(options: { snapshot: string }): Promise<void>;
  consumePendingToggles(): Promise<{ toggles: PendingWidgetToggle[] }>;
  clearSnapshot?(): Promise<void>;
}

const NativeWidgetBridge = registerPlugin<WidgetBridgeNativePlugin>('WidgetBridge');

export function saveWidgetSnapshot(snapshot: WidgetSnapshot): void {
  try {
    const serialized = JSON.stringify(snapshot);
    safeStorage.setItem(WIDGET_SNAPSHOT_KEY, serialized);
    if (Capacitor.isNativePlatform()) {
      void Promise.resolve(NativeWidgetBridge.updateSnapshot({ snapshot: serialized })).catch(() => {
        // Native widget is optional when the bridge is unavailable.
      });
    }
  } catch (e) {
    console.error('Failed to save widget snapshot', e);
  }
}

export function getWidgetSnapshot(): WidgetSnapshot | null {
  try {
    const raw = safeStorage.getItem(WIDGET_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function buildWidgetSnapshot(
  state?: AppStateData,
  targetYearMonth?: string
): WidgetSnapshot {
  const currentAppState = state || loadAppState();
  const currentMonth = targetYearMonth || format(new Date(), 'yyyy-MM');
  const monthTasks = getMonthlyInstallmentTasks(
    currentAppState.loans,
    currentAppState.paymentRecords,
    currentMonth
  );
  const summary = calculateMonthlySummary(
    monthTasks,
    currentAppState.availableFunds,
    currentMonth
  );
  const portfolioSummary = calculatePortfolioDebtSummary(currentAppState.loans);

  return {
    updatedAt: new Date().toISOString(),
    yearMonth: currentMonth,
    totalRemainingDue: summary.totalRemaining,
    availableFunds: summary.availableFunds,
    isSufficient: summary.isSufficient,
    shortfallAmount: summary.shortfallAmount,
    totalRemainingDebt: portfolioSummary.totalRemainingAllLoans,
    totalPrincipalDebt: portfolioSummary.totalPrincipalAllLoans,
    hasLoans: currentAppState.loans.length > 0,
    totalLoanCount: currentAppState.loans.length,
    tasks: monthTasks.map(t => ({
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
  };
}

export function syncWidgetSnapshot(
  state?: AppStateData,
  targetYearMonth?: string
): WidgetSnapshot {
  const snapshot = buildWidgetSnapshot(state, targetYearMonth);
  saveWidgetSnapshot(snapshot);
  return snapshot;
}

export function clearWidgetSnapshot(): void {
  try {
    safeStorage.removeItem(WIDGET_SNAPSHOT_KEY);
    if (Capacitor.isNativePlatform()) {
      void Promise.resolve(NativeWidgetBridge.clearSnapshot?.()).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to clear widget snapshot', e);
  }
}

// Keep snapshot continuously synchronized whenever app data changes
addStateChangeListener(() => {
  try {
    syncWidgetSnapshot();
  } catch {}
});

/**
 * ฟังก์ชันกดติ๊กชำระเงิน (Check / Uncheck) จากหน้าจอ Widget หรือ To-Do List
 * อัปเดตทั้งสถานะการชำระ, ยอดเงินสดคงเหลือ และยอดเงินต้นแบบเรียลไทม์
 */
export function toggleSubItemPayment(
  task: MonthlyInstallmentTask,
  options: {
    deductFromAvailableFunds?: boolean;
    triggerConfetti?: boolean;
    note?: string;
    targetStatus?: 'PAID' | 'PENDING' | 'OVERDUE';
  } = {}
): { newStatus: 'PAID' | 'PENDING' | 'OVERDUE'; newAvailableFunds: number } {
  const {
    deductFromAvailableFunds = true,
    triggerConfetti = true,
    note,
    targetStatus: explicitTargetStatus,
  } = options;

  const appState = loadAppState();
  const { loans, paymentRecords, availableFunds } = appState;

  const isCurrentlyPaid = task.status === 'PAID';
  const targetStatus = explicitTargetStatus
    ? explicitTargetStatus
    : isCurrentlyPaid 
      ? (task.daysRemaining < 0 ? 'OVERDUE' : 'PENDING') 
      : 'PAID';

  let updatedFunds = availableFunds;
  const existingRecordIndex = paymentRecords.findIndex(
    r => r.id === task.id || (r.loanId === task.loanId && r.subItemId === task.subItemId && r.yearMonth === task.dueDate.substring(0, 7))
  );
  const existingRecord = existingRecordIndex >= 0 ? paymentRecords[existingRecordIndex] : undefined;
  const targetLoan = loans.find(l => l.id === task.loanId);

  const ym = task.dueDate.substring(0, 7);

  if (targetStatus === 'PAID') {
    const deductedFromFunds = deductFromAvailableFunds
      ? Math.min(Math.max(0, availableFunds), task.amount)
      : 0;
    const deductedFromPrincipal = targetLoan
      ? Math.min(Math.max(0, targetLoan.remainingPrincipal), task.amount)
      : 0;

    // 1. ปรับปรุงสถานะใน PaymentRecords
    const newRecord: MonthlyPaymentRecord = {
      id: task.id,
      loanId: task.loanId,
      subItemId: task.subItemId,
      yearMonth: ym,
      dueDate: task.dueDate,
      amountDue: task.amount,
      amountPaid: task.amount,
      status: 'PAID',
      paidAt: new Date().toISOString(),
      paymentNote: note || 'ชำระผ่าน Widget / To-Do List',
      deductedFromFunds,
      deductedFromPrincipal,
    };

    if (existingRecordIndex >= 0) {
      paymentRecords[existingRecordIndex] = newRecord;
    } else {
      paymentRecords.push(newRecord);
    }

    // 2. หักเงินต้นคงเหลือในสัญญาเงินกู้ตามยอดที่หักได้จริง
    if (targetLoan) {
      targetLoan.remainingPrincipal = Math.max(0, targetLoan.remainingPrincipal - deductedFromPrincipal);
      targetLoan.updatedAt = new Date().toISOString();
    }

    // 3. หักเงินสดที่มีอยู่ ณ ตอนนี้ (หากเลือกไว้)
    if (deductFromAvailableFunds) {
      updatedFunds = availableFunds - deductedFromFunds;
    }

    // จุดพลุเฉลิมฉลองเมื่อชำระสำเร็จ
    if (triggerConfetti && typeof window !== 'undefined') {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#059669', '#10B981', '#34D399', '#2563EB', '#F59E0B'],
        });
      } catch (err) {
        // Confetti non-fatal
      }
    }
  } else {
    // ยกเลิกการชำระ (Unmark Paid กลับมาเป็น PENDING)
    if (existingRecordIndex >= 0) {
      paymentRecords.splice(existingRecordIndex, 1);
    }

    const refundedFunds = existingRecord?.deductedFromFunds
      ?? (deductFromAvailableFunds ? task.amount : 0);
    const refundedPrincipal = existingRecord?.deductedFromPrincipal ?? task.amount;

    // คืนยอดเงินต้นตามยอดที่หักจริงตอนชำระ
    if (targetLoan) {
      targetLoan.remainingPrincipal = Math.min(
        targetLoan.totalPrincipal,
        targetLoan.remainingPrincipal + refundedPrincipal
      );
      targetLoan.updatedAt = new Date().toISOString();
    }

    // คืนเงินสดเข้ากระเป๋าตามยอดที่หักจริงตอนชำระ
    updatedFunds = availableFunds + refundedFunds;
  }

  // บันทึกและส่งสัญญาณอัปเดตทุกหน้าจอ
  savePaymentRecords(paymentRecords, false);
  saveLoans(loans, false);
  saveAvailableFunds(updatedFunds, true);

  return {
    newStatus: targetStatus,
    newAvailableFunds: updatedFunds,
  };
}

export function resolveWidgetToggleAction(
  currentStatus: PaymentStatus,
  desiredPaid: boolean
): 'PAY' | 'UNPAY' | 'NONE' {
  if (desiredPaid && currentStatus !== 'PAID') return 'PAY';
  if (!desiredPaid && currentStatus === 'PAID') return 'UNPAY';
  return 'NONE';
}

let pendingSyncPromise: Promise<number> | null = null;

export async function syncPendingWidgetToggles(): Promise<number> {
  if (pendingSyncPromise) {
    return pendingSyncPromise;
  }
  pendingSyncPromise = doSyncPendingWidgetToggles().finally(() => {
    pendingSyncPromise = null;
  });
  return pendingSyncPromise;
}

async function doSyncPendingWidgetToggles(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;

  let pending: PendingWidgetToggle[] = [];
  try {
    const response = await NativeWidgetBridge.consumePendingToggles();
    pending = response?.toggles || [];
  } catch {
    return 0;
  }
  if (pending.length === 0) return 0;

  const state = loadAppState();
  const snapshot = getWidgetSnapshot();
  const months = new Set<string>();
  months.add(format(new Date(), 'yyyy-MM'));

  for (const toggle of pending) {
    const matchedMonth = /_(\d{4}-\d{2})$/.exec(toggle.taskId);
    if (matchedMonth) months.add(matchedMonth[1]);
  }
  if (snapshot?.yearMonth) months.add(snapshot.yearMonth);

  const tasksById = new Map<string, MonthlyInstallmentTask>();
  for (const month of months) {
    const monthTasks = getMonthlyInstallmentTasks(state.loans, state.paymentRecords, month);
    for (const task of monthTasks) tasksById.set(task.id, task);
  }

  let applied = 0;
  for (const toggle of pending) {
    const task = tasksById.get(toggle.taskId);
    if (!task) continue;

    const action = resolveWidgetToggleAction(task.status, toggle.isPaid);
    if (action === 'NONE') continue;

    const result = toggleSubItemPayment(task, {
      deductFromAvailableFunds: true,
      triggerConfetti: action === 'PAY',
      note: 'ชำระผ่าน Android Home Screen Widget',
      targetStatus: action === 'PAY' ? 'PAID' : (task.daysRemaining < 0 ? 'OVERDUE' : 'PENDING'),
    });
    tasksById.set(task.id, { ...task, status: result.newStatus });
    applied++;
  }

  if (applied > 0) broadcastStateChange();
  return applied;
}
