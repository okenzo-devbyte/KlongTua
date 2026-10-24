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
});
