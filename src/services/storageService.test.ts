import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  deleteLoanAndRecords,
  hasDemoData,
  loadAppState,
  loadDemoData,
  redrawLoanCredit,
  removeDemoData,
  revertLoanDrawdown,
  safeStorage,
  saveAvailableFunds,
  saveLoans,
  savePaymentRecords,
  snoozeTaskAlert,
  updateLoanSubItemAmount,
} from './storageService';
import { calculateMonthlySummary } from '../utils/cashflowCalculator';
import { LoanAccount, MonthlyPaymentRecord } from '../types/loan';

function makeLoan(id: string, title: string): LoanAccount {
  return {
    id,
    lenderId: 'kbank',
    title,
    loanType: 'MULTI_DAY_SPLIT',
    totalPrincipal: 1000,
    remainingPrincipal: 1000,
    interestRateAnnual: 0,
    startDate: '2026-10-01',
    subItems: [{
      id: `${id}-sub`,
      loanId: id,
      title: 'งวดเดียว',
      dueDayOfMonth: 5,
      dueTime: '18:00',
      amount: 100,
      subType: 'SPLIT_DAY',
    }],
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

function makeRecord(loanId: string): MonthlyPaymentRecord {
  return {
    id: `${loanId}_${loanId}-sub_2026-10`,
    loanId,
    subItemId: `${loanId}-sub`,
    yearMonth: '2026-10',
    dueDate: '2026-10-05',
    amountDue: 100,
    amountPaid: 100,
    status: 'PAID',
  };
}

beforeEach(() => {
  clearAllData();
});

describe('storageService defaults', () => {
  it('starts with empty loans, records, and funds', () => {
    const state = loadAppState();
    expect(state.loans).toEqual([]);
    expect(state.paymentRecords).toEqual([]);
    expect(state.availableFunds).toBe(0);
  });

  it('produces a safe zero summary without data', () => {
    const summary = calculateMonthlySummary([], 0, '2026-10');
    expect(summary.totalDue).toBe(0);
    expect(summary.totalRemaining).toBe(0);
    expect(summary.completionRate).toBe(100);
    expect(Number.isNaN(summary.shortfallAmount)).toBe(false);
  });

  it('drops legacy Gmail fields from stored backup metadata', () => {
    safeStorage.setItem(
      'debtflow_backup_meta_v1',
      JSON.stringify({
        isConnected: true,
        googleEmail: 'old@example.com',
        backupFileVersion: '1.0.0',
        autoBackupOnPaid: true,
      })
    );

    const state = loadAppState();
    expect(state.backupMeta).not.toHaveProperty('isConnected');
    expect(state.backupMeta).not.toHaveProperty('googleEmail');
  });
});

describe('clearAllData', () => {
  it('removes loans, records, funds, and snoozes', () => {
    saveLoans([makeLoan('loan-user-1', 'ของฉัน')]);
    savePaymentRecords([makeRecord('loan-user-1')]);
    saveAvailableFunds(5000);
    snoozeTaskAlert('task-1', 60, false);

    clearAllData();

    const state = loadAppState();
    expect(state.loans).toEqual([]);
    expect(state.paymentRecords).toEqual([]);
    expect(state.availableFunds).toBe(0);
    expect(state.availableFunds).not.toBeNaN();
  });
});

describe('removeDemoData', () => {
  it('removes only known demo loans and their records', () => {
    saveLoans([
      makeLoan('loan-kbank-split', 'Demo KBank'),
      makeLoan('loan-user-1', 'ของฉัน'),
    ]);
    savePaymentRecords([
      makeRecord('loan-kbank-split'),
      makeRecord('loan-user-1'),
    ]);

    expect(removeDemoData()).toBe(1);

    const state = loadAppState();
    expect(state.loans.map(l => l.id)).toEqual(['loan-user-1']);
    expect(state.paymentRecords.map(r => r.loanId)).toEqual(['loan-user-1']);
  });

  it('loads demo data on demand and updates custom sub-item amounts', () => {
    expect(hasDemoData()).toBe(false);
    const added = loadDemoData();
    expect(added).toBe(4);
    expect(hasDemoData()).toBe(true);

    const state = loadAppState();
    expect(state.loans).toHaveLength(4);
    expect(state.availableFunds).toBe(25000);

    const updated = updateLoanSubItemAmount('loan-kbank-split', 'sub-kbank-1', 4250);
    expect(updated).toBe(true);

    const afterState = loadAppState();
    const kbankLoan = afterState.loans.find(l => l.id === 'loan-kbank-split');
    expect(kbankLoan?.subItems[0].amount).toBe(4250);
  });
});

describe('credit redraw and cash rotation', () => {
  it('resets remainingPrincipal back to totalPrincipal on FULL_RESET and adds to availableFunds', () => {
    const loan = makeLoan('loan-revolving', 'บัตรกดเงินสด');
    loan.totalPrincipal = 30000;
    loan.remainingPrincipal = 24000;
    saveLoans([loan]);
    saveAvailableFunds(5000);

    const res = redrawLoanCredit('loan-revolving', {
      mode: 'FULL_RESET',
      addToAvailableFunds: true,
      note: 'กดหมุนใช้จ่าย',
    });

    expect(res.success).toBe(true);
    expect(res.newRemaining).toBe(30000);
    expect(res.newAvailableFunds).toBe(11000);

    const state = loadAppState();
    expect(state.loans[0].remainingPrincipal).toBe(30000);
    expect(state.availableFunds).toBe(11000);
    expect(state.drawdownRecords).toHaveLength(1);
    expect(state.drawdownRecords?.[0].amountDrawn).toBe(6000);
    expect(state.drawdownRecords?.[0].mode).toBe('FULL_RESET');
  });

  it('supports PARTIAL redraw without adding to availableFunds and reverts cleanly', () => {
    const loan = makeLoan('loan-partial', 'SPayLater');
    loan.totalPrincipal = 10000;
    loan.remainingPrincipal = 4000;
    saveLoans([loan]);
    saveAvailableFunds(2000);

    const drawRes = redrawLoanCredit('loan-partial', {
      mode: 'PARTIAL',
      customAmount: 2500,
      addToAvailableFunds: false,
    });

    expect(drawRes.success).toBe(true);
    expect(drawRes.newRemaining).toBe(6500);
    expect(drawRes.newAvailableFunds).toBe(2000);

    const recordId = drawRes.record!.id;
    const revertRes = revertLoanDrawdown(recordId);
    expect(revertRes.success).toBe(true);

    const afterRevert = loadAppState();
    expect(afterRevert.loans[0].remainingPrincipal).toBe(4000);
    expect(afterRevert.availableFunds).toBe(2000);
    expect(afterRevert.drawdownRecords).toHaveLength(0);
  });

  it('removes drawdown records when deleteLoanAndRecords is called', () => {
    const loan = makeLoan('loan-del', 'สัญญาชั่วคราว');
    loan.totalPrincipal = 10000;
    loan.remainingPrincipal = 5000;
    saveLoans([loan]);

    redrawLoanCredit('loan-del', { mode: 'FULL_RESET', addToAvailableFunds: true });
    expect(loadAppState().drawdownRecords).toHaveLength(1);

    deleteLoanAndRecords('loan-del');
    expect(loadAppState().loans).toHaveLength(0);
    expect(loadAppState().drawdownRecords).toHaveLength(0);
  });
});
