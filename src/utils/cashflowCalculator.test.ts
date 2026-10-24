import { describe, it, expect } from 'vitest';
import { 
  getMonthlyInstallmentTasks, 
  calculateMonthlySummary, 
  calculateRollingProjection,
  getSafeDueDate,
  formatShortThaiDayMonth,
  calculateCategoryDistribution,
  calculatePortfolioDebtSummary
} from './cashflowCalculator';
import { LoanAccount, MonthlyPaymentRecord } from '../types/loan';

describe('Cashflow & Sub-installment Calculator', () => {
  const sampleLoans: LoanAccount[] = [
    {
      id: 'loan-1',
      lenderId: 'kbank',
      title: 'KBank Multi-Day Split',
      loanType: 'MULTI_DAY_SPLIT',
      totalPrincipal: 30000,
      remainingPrincipal: 20000,
      interestRateAnnual: 18,
      startDate: '2026-01-01',
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      subItems: [
        {
          id: 'sub-1',
          loanId: 'loan-1',
          title: 'งวดวันที่ 5',
          dueDayOfMonth: 5,
          dueTime: '18:00',
          amount: 1500,
          subType: 'SPLIT_DAY',
        },
        {
          id: 'sub-2',
          loanId: 'loan-1',
          title: 'งวดวันที่ 20',
          dueDayOfMonth: 20,
          dueTime: '18:00',
          amount: 2500,
          subType: 'SPLIT_DAY',
        },
      ],
    },
    {
      id: 'loan-2',
      lenderId: 'spaylater',
      title: 'Shopee SPayLater Single Sub-Bill',
      loanType: 'INSTALLMENT_PLAN',
      totalPrincipal: 5000,
      remainingPrincipal: 3000,
      interestRateAnnual: 15,
      startDate: '2026-01-01',
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      subItems: [
        {
          id: 'sub-spay-1',
          loanId: 'loan-2',
          title: 'บิลสินค้า A',
          dueDayOfMonth: 10,
          dueTime: '18:00',
          amount: 1000,
          subType: 'SUB_BILL',
        },
      ],
    },
  ];

  it('correctly handles month end leap/shorter days in getSafeDueDate', () => {
    expect(getSafeDueDate('2026-02', 31)).toBe('2026-02-28');
    expect(getSafeDueDate('2026-04', 31)).toBe('2026-04-30');
    expect(getSafeDueDate('2026-10', 15)).toBe('2026-10-15');
  });

  it('generates individual sub-item tasks for each loan in the month', () => {
    const tasks = getMonthlyInstallmentTasks(sampleLoans, [], '2026-10', new Date('2026-10-01'));
    // 2 sub-items from loan-1 + 1 sub-item from loan-2 = 3 tasks
    expect(tasks).toHaveLength(3);
    
    // Check ordering: 5th (KBank) -> 10th (SPayLater) -> 20th (KBank)
    expect(tasks[0].dueDate).toBe('2026-10-05');
    expect(tasks[0].amount).toBe(1500);
    expect(tasks[1].dueDate).toBe('2026-10-10');
    expect(tasks[1].amount).toBe(1000);
    expect(tasks[2].dueDate).toBe('2026-10-20');
    expect(tasks[2].amount).toBe(2500);
  });

  it('calculates sufficiency and shortfall accurately when funds are NOT enough', () => {
    const tasks = getMonthlyInstallmentTasks(sampleLoans, [], '2026-10', new Date('2026-10-01'));
    // Total due is 1500 + 1000 + 2500 = 5000
    // User has availableFunds = 3200
    const summary = calculateMonthlySummary(tasks, 3200, '2026-10');

    expect(summary.totalDue).toBe(5000);
    expect(summary.totalRemaining).toBe(5000);
    expect(summary.isSufficient).toBe(false);
    expect(summary.shortfallAmount).toBe(1800); // 5000 - 3200 = 1800 to find!
    expect(summary.surplusAmount).toBe(0);
  });

  it('calculates surplus accurately when funds ARE sufficient', () => {
    const tasks = getMonthlyInstallmentTasks(sampleLoans, [], '2026-10', new Date('2026-10-01'));
    // Available funds = 7000
    const summary = calculateMonthlySummary(tasks, 7000, '2026-10');

    expect(summary.totalDue).toBe(5000);
    expect(summary.isSufficient).toBe(true);
    expect(summary.shortfallAmount).toBe(0);
    expect(summary.surplusAmount).toBe(2000); // 7000 - 5000 = 2000 remaining
  });

  it('updates remaining due when sub-item is paid', () => {
    const records: MonthlyPaymentRecord[] = [
      {
        id: 'loan-1_sub-1_2026-10',
        loanId: 'loan-1',
        subItemId: 'sub-1',
        yearMonth: '2026-10',
        dueDate: '2026-10-05',
        amountDue: 1500,
        amountPaid: 1500,
        status: 'PAID',
        paidAt: '2026-10-05T10:00:00.000Z',
      },
    ];

    const tasks = getMonthlyInstallmentTasks(sampleLoans, records, '2026-10', new Date('2026-10-06'));
    // Total due is 5000, but 1500 is paid -> 3500 remaining
    // If available funds = 3000 -> shortfall = 500
    const summary = calculateMonthlySummary(tasks, 3000, '2026-10');

    expect(summary.totalPaid).toBe(1500);
    expect(summary.totalRemaining).toBe(3500);
    expect(summary.shortfallAmount).toBe(500);
    expect(summary.paidCount).toBe(1);
    expect(summary.pendingCount).toBe(2);
  });

  it('simulates rolling multi-month cashflow forecast', () => {
    // Initial available = 8000
    // Each month due = 5000
    // Month 1: 8000 - 5000 = 3000 remaining (sufficient)
    // Month 2: 3000 - 5000 = -2000 (shortfall 2000)
    // Month 3: 0 - 5000 = -5000 (shortfall 5000)
    const projections = calculateRollingProjection(sampleLoans, [], 8000, '2026-10', 3);

    expect(projections).toHaveLength(3);
    expect(projections[0].isSufficient).toBe(true);
    expect(projections[0].endingFunds).toBe(3000);
    expect(projections[0].shortfall).toBe(0);

    expect(projections[1].isSufficient).toBe(false);
    expect(projections[1].startingFunds).toBe(3000);
    expect(projections[1].shortfall).toBe(2000);

    expect(projections[2].isSufficient).toBe(false);
    expect(projections[2].shortfall).toBe(5000);
  });

  it('formats a due day using the task real Thai month instead of a fixed month', () => {
    expect(formatShortThaiDayMonth('2026-10-05')).toBe('5 ต.ค.');
    expect(formatShortThaiDayMonth('2026-11-05')).toBe('5 พ.ย.');
    expect(formatShortThaiDayMonth('2027-01-31')).toBe('31 ม.ค.');
    expect(formatShortThaiDayMonth('invalid-date')).toBe('invalid-date');
  });

  it('aggregates category distribution from tasks and preserves zero categories', () => {
    const tasks = getMonthlyInstallmentTasks(sampleLoans, [], '2026-10', new Date('2026-10-01'));
    const distribution = calculateCategoryDistribution(tasks);

    expect(distribution.BANK.amount).toBe(4000);
    expect(distribution.BANK.count).toBe(2);
    expect(distribution.DIGITAL_LOAN.amount).toBe(1000);
    expect(distribution.DIGITAL_LOAN.count).toBe(1);
    expect(distribution.OTHER.amount).toBe(0);
    expect(distribution.OTHER.count).toBe(0);
    expect(Object.keys(distribution)).toHaveLength(5);
  });

  it('correctly calculates portfolio debt summary across all active loans', () => {
    const portfolio = calculatePortfolioDebtSummary(sampleLoans);

    // sampleLoans: loan-1 (principal 30000, rem 20000), loan-2 (principal 5000, rem 3000)
    expect(portfolio.activeLoanCount).toBe(2);
    expect(portfolio.totalPrincipalAllLoans).toBe(35000);
    expect(portfolio.totalRemainingAllLoans).toBe(23000);
    expect(portfolio.totalPaidOffAllLoans).toBe(12000); // 35000 - 23000
    // payoff rate = 12000 / 35000 * 100 = 34.2857%
    expect(portfolio.debtPayoffRate).toBeCloseTo(34.2857, 2);
    // monthly commitment: sub-1 (1500) + sub-2 (2500) + sub-3 (1000) = 5000
    expect(portfolio.monthlyCommitment).toBe(5000);
  });
});
