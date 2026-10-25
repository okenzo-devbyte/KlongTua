import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockConsumePendingToggles: vi.fn().mockResolvedValue({ toggles: [] }),
  mockUpdateSnapshot: vi.fn().mockResolvedValue(undefined),
  mockClearSnapshot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
  },
  registerPlugin: (name: string) => {
    if (name === 'WidgetBridge') {
      return {
        consumePendingToggles: mocks.mockConsumePendingToggles,
        updateSnapshot: mocks.mockUpdateSnapshot,
        clearSnapshot: mocks.mockClearSnapshot,
      };
    }
    return {};
  },
}));

import { 
  syncPendingWidgetToggles, 
  saveWidgetSnapshot, 
  clearWidgetSnapshot,
  buildWidgetSnapshot 
} from './widgetBridgeService';
import { 
  saveLoans, 
  savePaymentRecords, 
  saveAvailableFunds, 
  loadAppState 
} from './storageService';

describe('widgetBridgeService native bridge synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveLoans([
      {
        id: 'native-loan-1',
        lenderId: 'kbank',
        title: 'สินเชื่อบุคคลเพื่อธุรกิจ',
        loanType: 'INSTALLMENT_PLAN',
        totalPrincipal: 50000,
        remainingPrincipal: 30000,
        interestRateAnnual: 12,
        startDate: '2026-10-01',
        subItems: [
          {
            id: 'sub-1',
            loanId: 'native-loan-1',
            title: 'งวดวันที่ 15',
            dueDayOfMonth: 15,
            dueTime: '18:00',
            amount: 3000,
            subType: 'SUB_BILL',
          },
        ],
        isActive: true,
        createdAt: '2026-10-01',
        updatedAt: '2026-10-01',
      },
    ]);
    savePaymentRecords([]);
    saveAvailableFunds(10000);
    mocks.mockUpdateSnapshot.mockClear();
    mocks.mockClearSnapshot.mockClear();
    mocks.mockConsumePendingToggles.mockClear();
  });

  it('consumes pending widget toggles and applies payment on native platform', async () => {
    mocks.mockConsumePendingToggles.mockResolvedValueOnce({
      toggles: [
        {
          taskId: 'native-loan-1_sub-1_2026-10',
          isPaid: true,
        },
      ],
    });

    const applied = await syncPendingWidgetToggles();
    expect(applied).toBe(1);
    expect(mocks.mockConsumePendingToggles).toHaveBeenCalledTimes(1);

    const state = loadAppState();
    expect(state.availableFunds).toBe(7000); // 10000 - 3000
    expect(state.loans[0].remainingPrincipal).toBe(27000); // 30000 - 3000
    expect(state.paymentRecords).toHaveLength(1);
    expect(state.paymentRecords[0].status).toBe('PAID');
  });

  it('deduplicates concurrent in-flight syncPendingWidgetToggles calls', async () => {
    mocks.mockConsumePendingToggles.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 20));
      return { toggles: [] };
    });

    const [res1, res2] = await Promise.all([
      syncPendingWidgetToggles(),
      syncPendingWidgetToggles(),
    ]);

    expect(res1).toBe(0);
    expect(res2).toBe(0);
    expect(mocks.mockConsumePendingToggles).toHaveBeenCalledTimes(1);
  });

  it('dispatches serialized snapshot to native bridge plugin on saveWidgetSnapshot', () => {
    mocks.mockUpdateSnapshot.mockClear();
    const snapshot = buildWidgetSnapshot(undefined, '2026-10');
    saveWidgetSnapshot(snapshot);

    expect(mocks.mockUpdateSnapshot).toHaveBeenCalledTimes(1);
    const passedArg = mocks.mockUpdateSnapshot.mock.calls[0][0];
    expect(passedArg).toHaveProperty('snapshot');
    const parsed = JSON.parse(passedArg.snapshot);
    expect(parsed.yearMonth).toBe('2026-10');
    expect(parsed.totalRemainingDue).toBe(3000);
  });

  it('correctly unpays an overdue task via native bridge toggle to OVERDUE status', async () => {
    const { toggleSubItemPayment } = await import('./widgetBridgeService');
    const { getMonthlyInstallmentTasks } = await import('../utils/cashflowCalculator');

    const task202609 = getMonthlyInstallmentTasks(loadAppState().loans, [], '2026-09')[0];
    toggleSubItemPayment(task202609, {
      deductFromAvailableFunds: true,
      triggerConfetti: false,
    });

    let state = loadAppState();
    expect(state.paymentRecords).toHaveLength(1);
    expect(state.paymentRecords[0].status).toBe('PAID');

    mocks.mockConsumePendingToggles.mockResolvedValueOnce({
      toggles: [
        {
          taskId: 'native-loan-1_sub-1_2026-09',
          isPaid: false,
        },
      ],
    });

    const applied = await syncPendingWidgetToggles();
    expect(applied).toBe(1);

    state = loadAppState();
    expect(state.paymentRecords).toHaveLength(0);
    expect(state.availableFunds).toBe(10000);
  });

  it('invokes clearSnapshot on native bridge plugin on clearWidgetSnapshot', () => {
    clearWidgetSnapshot();
    expect(mocks.mockClearSnapshot).toHaveBeenCalledTimes(1);
  });
});
