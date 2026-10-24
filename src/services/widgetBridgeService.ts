import { 
  MonthlyInstallmentTask, 
  MonthlyPaymentRecord, 
  LoanAccount,
  PaymentStatus
} from '../types/loan';
import { 
  loadAppState, 
  savePaymentRecords, 
  saveAvailableFunds, 
  saveLoans,
  broadcastStateChange,
  safeStorage 
} from './storageService';
import { getMonthlyInstallmentTasks } from '../utils/cashflowCalculator';
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
}

const NativeWidgetBridge = registerPlugin<WidgetBridgeNativePlugin>('WidgetBridge');

export function saveWidgetSnapshot(snapshot: WidgetSnapshot): void {
  try {
    const serialized = JSON.stringify(snapshot);
    safeStorage.setItem(WIDGET_SNAPSHOT_KEY, serialized);
    if (Capacitor.isNativePlatform()) {
      void NativeWidgetBridge.updateSnapshot({ snapshot: serialized }).catch(() => {
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
  } = {}
): { newStatus: 'PAID' | 'PENDING' | 'OVERDUE'; newAvailableFunds: number } {
  const {
    deductFromAvailableFunds = true,
    triggerConfetti = true,
    note
  } = options;

  const appState = loadAppState();
  const { loans, paymentRecords, availableFunds } = appState;

  const isCurrentlyPaid = task.status === 'PAID';
  const targetStatus = isCurrentlyPaid ? 'PENDING' : 'PAID';

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
      targetLoan.remainingPrincipal = targetLoan.remainingPrincipal + refundedPrincipal;
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

export async function syncPendingWidgetToggles(): Promise<number> {
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

    toggleSubItemPayment(task, {
      deductFromAvailableFunds: true,
      triggerConfetti: action === 'PAY',
      note: 'ชำระผ่าน Android Home Screen Widget',
    });
    tasksById.set(task.id, { ...task, status: action === 'PAY' ? 'PAID' : 'PENDING' });
    applied++;
  }

  if (applied > 0) broadcastStateChange();
  return applied;
}
