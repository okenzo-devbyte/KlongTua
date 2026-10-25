import { describe, it, expect, beforeEach } from 'vitest';
import { toggleSubItemPayment, resolveWidgetToggleAction } from './widgetBridgeService';
import { MonthlyInstallmentTask } from '../types/loan';
import { loadAppState, saveAvailableFunds, savePaymentRecords, saveLoans } from './storageService';

describe('Widget Bridge & Interactive 2-Way Toggling', () => {
  const dummyTask: MonthlyInstallmentTask = {
    id: 'test-loan-1_test-sub-1_2026-10',
    loanId: 'test-loan-1',
    subItemId: 'test-sub-1',
    lender: {
      id: 'kbank',
      code: 'KBANK',
      nameTh: 'ธนาคารกสิกรไทย',
      nameEn: 'Kasikornbank',
      category: 'BANK',
      primaryColor: '#138F2D',
      secondaryColor: '#E8F5E9',
      textColor: '#FFFFFF',
      badgeText: 'KBank',
    },
    loanTitle: 'KBank Multi-Day Split',
    subTitle: 'งวดวันที่ 5',
    loanType: 'MULTI_DAY_SPLIT',
    dueDate: '2026-10-05',
    dueDayOfMonth: 5,
    dueTime: '18:00',
    amount: 1500,
    status: 'PENDING',
    isOverdue: false,
    daysRemaining: 4,
    subType: 'SPLIT_DAY',
    totalPrincipal: 30000,
    remainingPrincipal: 20000,
  };

  beforeEach(() => {
    // Reset test state in localStorage
    saveLoans([
      {
        id: 'test-loan-1',
        lenderId: 'kbank',
        title: 'KBank Multi-Day Split',
        loanType: 'MULTI_DAY_SPLIT',
        totalPrincipal: 30000,
        remainingPrincipal: 20000,
        interestRateAnnual: 18,
        startDate: '2026-01-01',
        subItems: [
          {
            id: 'test-sub-1',
            loanId: 'test-loan-1',
            title: 'งวดวันที่ 5',
            dueDayOfMonth: 5,
            dueTime: '18:00',
            amount: 1500,
            subType: 'SPLIT_DAY',
          },
        ],
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);
    savePaymentRecords([]);
    saveAvailableFunds(10000);
  });

  it('marks sub-item as PAID and deducts amount from available funds', () => {
    const res = toggleSubItemPayment(dummyTask, { deductFromAvailableFunds: true, triggerConfetti: false });

    expect(res.newStatus).toBe('PAID');
    expect(res.newAvailableFunds).toBe(8500); // 10000 - 1500 = 8500

    const state = loadAppState();
    expect(state.paymentRecords).toHaveLength(1);
    expect(state.paymentRecords[0].status).toBe('PAID');
    expect(state.availableFunds).toBe(8500);
    // Loan remaining principal is also reduced from 20000 to 18500
    expect(state.loans[0].remainingPrincipal).toBe(18500);
  });

  it('unmarks PAID item back to PENDING and refunds available funds', () => {
    // First, mark as paid
    toggleSubItemPayment(dummyTask, { deductFromAvailableFunds: true, triggerConfetti: false });

    // Now task is paid
    const paidTask: MonthlyInstallmentTask = {
      ...dummyTask,
      status: 'PAID',
    };

    // Toggle again to unmark
    const res = toggleSubItemPayment(paidTask, { deductFromAvailableFunds: true, triggerConfetti: false });

    expect(res.newStatus).toBe('PENDING');
    expect(res.newAvailableFunds).toBe(10000); // 8500 + 1500 = 10000 restored!

    const state = loadAppState();
    expect(state.paymentRecords).toHaveLength(0);
    expect(state.availableFunds).toBe(10000);
    expect(state.loans[0].remainingPrincipal).toBe(20000);
  });

  it('restores only the funds and principal actually deducted when payment exceeded balances', () => {
    saveAvailableFunds(500);
    saveLoans([
      {
        ...loadAppState().loans[0],
        remainingPrincipal: 300,
      },
    ]);

    const payRes = toggleSubItemPayment(dummyTask, { deductFromAvailableFunds: true, triggerConfetti: false });
    expect(payRes.newAvailableFunds).toBe(0);

    let state = loadAppState();
    expect(state.loans[0].remainingPrincipal).toBe(0);
    expect(state.paymentRecords[0].deductedFromFunds).toBe(500);
    expect(state.paymentRecords[0].deductedFromPrincipal).toBe(300);

    const undoRes = toggleSubItemPayment(
      { ...dummyTask, status: 'PAID' },
      { deductFromAvailableFunds: true, triggerConfetti: false }
    );
    expect(undoRes.newAvailableFunds).toBe(500);

    state = loadAppState();
    expect(state.availableFunds).toBe(500);
    expect(state.loans[0].remainingPrincipal).toBe(300);
  });

  it('resolves widget toggle intents without applying duplicate toggles', () => {
    expect(resolveWidgetToggleAction('PENDING', true)).toBe('PAY');
    expect(resolveWidgetToggleAction('PAID', true)).toBe('NONE');
    expect(resolveWidgetToggleAction('PAID', false)).toBe('UNPAY');
    expect(resolveWidgetToggleAction('PENDING', false)).toBe('NONE');
    expect(resolveWidgetToggleAction('OVERDUE', true)).toBe('PAY');
  });

  it('builds a complete widget snapshot for existing loans and tasks', async () => {
    const { buildWidgetSnapshot, syncWidgetSnapshot, getWidgetSnapshot } = await import('./widgetBridgeService');
    const snapshot = buildWidgetSnapshot(undefined, '2026-10');

    expect(snapshot.yearMonth).toBe('2026-10');
    expect(snapshot.hasLoans).toBe(true);
    expect(snapshot.totalLoanCount).toBe(1);
    expect(snapshot.totalRemainingDue).toBe(1500);
    expect(snapshot.availableFunds).toBe(10000);
    expect(snapshot.isSufficient).toBe(true);
    expect(snapshot.shortfallAmount).toBe(0);
    expect(snapshot.totalRemainingDebt).toBe(20000);
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.tasks[0].loanTitle).toBe('KBank Multi-Day Split');
    expect(snapshot.tasks[0].amount).toBe(1500);
    expect(snapshot.tasks[0].isPaid).toBe(false);

    syncWidgetSnapshot(undefined, '2026-10');
    const retrieved = getWidgetSnapshot();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.tasks).toHaveLength(1);
    expect(retrieved?.totalRemainingDebt).toBe(20000);
  });

  it('builds an empty widget snapshot with clear fallback metadata when no loans exist', async () => {
    const { buildWidgetSnapshot } = await import('./widgetBridgeService');
    saveLoans([]);
    savePaymentRecords([]);
    saveAvailableFunds(0);

    const snapshot = buildWidgetSnapshot(undefined, '2026-10');
    expect(snapshot.hasLoans).toBe(false);
    expect(snapshot.totalLoanCount).toBe(0);
    expect(snapshot.totalRemainingDue).toBe(0);
    expect(snapshot.tasks).toHaveLength(0);
    expect(snapshot.totalRemainingDebt).toBe(0);
  });

  it('automatically keeps widget snapshot in sync when storage state changes', async () => {
    const { getWidgetSnapshot } = await import('./widgetBridgeService');
    // Save new loan and verify listener automatically synced the snapshot
    saveLoans([
      {
        id: 'test-loan-2',
        lenderId: 'scb',
        title: 'SCB Speedy Loan',
        loanType: 'MULTI_DAY_SPLIT',
        totalPrincipal: 50000,
        remainingPrincipal: 45000,
        interestRateAnnual: 15,
        startDate: '2026-10-01',
        subItems: [
          {
            id: 'test-sub-2',
            loanId: 'test-loan-2',
            title: 'งวดวันที่ 15',
            dueDayOfMonth: 15,
            dueTime: '18:00',
            amount: 2500,
            subType: 'SPLIT_DAY',
          },
        ],
        isActive: true,
        createdAt: '2026-10-01',
        updatedAt: '2026-10-01',
      },
    ]);

    const snapshot = getWidgetSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.hasLoans).toBe(true);
    expect(snapshot?.tasks.some(t => t.loanId === 'test-loan-2')).toBe(true);
  });

  it('honors explicit targetStatus in toggleSubItemPayment', () => {
    // Force targetStatus PAID
    const payRes = toggleSubItemPayment(dummyTask, {
      targetStatus: 'PAID',
      deductFromAvailableFunds: true,
      triggerConfetti: false,
    });
    expect(payRes.newStatus).toBe('PAID');

    // Force targetStatus PENDING
    const unpayRes = toggleSubItemPayment(
      { ...dummyTask, status: 'PAID' },
      {
        targetStatus: 'PENDING',
        deductFromAvailableFunds: true,
        triggerConfetti: false,
      }
    );
    expect(unpayRes.newStatus).toBe('PENDING');
  });

  it('clamps remainingPrincipal to totalPrincipal when unpaying', async () => {
    saveLoans([
      {
        id: 'test-loan-clamp',
        lenderId: 'kbank',
        title: 'Clamp Loan',
        loanType: 'INSTALLMENT_PLAN',
        totalPrincipal: 10000,
        remainingPrincipal: 10000, // already at max
        interestRateAnnual: 10,
        startDate: '2026-10-01',
        subItems: [
          {
            id: 'test-sub-clamp',
            loanId: 'test-loan-clamp',
            title: 'งวดที่ 1',
            dueDayOfMonth: 10,
            dueTime: '18:00',
            amount: 2000,
            subType: 'SUB_BILL',
          },
        ],
        isActive: true,
        createdAt: '2026-10-01',
        updatedAt: '2026-10-01',
      },
    ]);
    savePaymentRecords([]);
    saveAvailableFunds(5000);

    const taskToUnpay = {
      ...dummyTask,
      id: 'test-loan-clamp_test-sub-clamp_2026-10',
      loanId: 'test-loan-clamp',
      subItemId: 'test-sub-clamp',
      amount: 2000,
      status: 'PAID' as const,
    };

    toggleSubItemPayment(taskToUnpay, {
      targetStatus: 'PENDING',
      deductFromAvailableFunds: true,
      triggerConfetti: false,
    });

    const { loadAppState } = await import('./storageService');
    const updatedState = loadAppState();
    const loan = updatedState.loans.find(l => l.id === 'test-loan-clamp');
    expect(loan?.remainingPrincipal).toBe(10000);
  });

  it('correctly resolves widget toggle actions without flip jitter', async () => {
    const { resolveWidgetToggleAction } = await import('./widgetBridgeService');
    expect(resolveWidgetToggleAction('PENDING', true)).toBe('PAY');
    expect(resolveWidgetToggleAction('OVERDUE', true)).toBe('PAY');
    expect(resolveWidgetToggleAction('PAID', true)).toBe('NONE');
    expect(resolveWidgetToggleAction('PAID', false)).toBe('UNPAY');
    expect(resolveWidgetToggleAction('PENDING', false)).toBe('NONE');
    expect(resolveWidgetToggleAction('OVERDUE', false)).toBe('NONE');
  });

  it('restores OVERDUE status when an overdue task is unmarked from PAID', () => {
    const overdueTask: MonthlyInstallmentTask = {
      ...dummyTask,
      id: 'test-loan-1_test-sub-1_2026-09',
      dueDate: '2026-09-01',
      daysRemaining: -30,
      status: 'OVERDUE',
    };

    // 1. Mark as PAID
    const payRes = toggleSubItemPayment(overdueTask, { deductFromAvailableFunds: true, triggerConfetti: false });
    expect(payRes.newStatus).toBe('PAID');

    // 2. Unmark back - since daysRemaining < 0, it should return to OVERDUE
    const unpayRes = toggleSubItemPayment(
      { ...overdueTask, status: 'PAID' },
      { deductFromAvailableFunds: true, triggerConfetti: false }
    );
    expect(unpayRes.newStatus).toBe('OVERDUE');
  });

  it('clears snapshot from storage upon clearWidgetSnapshot', async () => {
    const { clearWidgetSnapshot, getWidgetSnapshot } = await import('./widgetBridgeService');
    saveLoans([]);
    clearWidgetSnapshot();
    expect(getWidgetSnapshot()).toBeNull();
  });
});
