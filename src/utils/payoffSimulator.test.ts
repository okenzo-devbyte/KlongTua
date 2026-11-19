import { describe, it, expect } from 'vitest';
import { LoanAccount } from '../types/loan';
import { comparePayoffStrategies, simulateRefinance } from './payoffSimulator';
import { calculateInstallmentBreakdown, getLenderById } from './cashflowCalculator';

const sampleLoans: LoanAccount[] = [
  {
    id: 'loan-high-rate',
    lenderId: 'ktc',
    title: 'บัตรกดเงินสดดอกสูง',
    loanType: 'REVOLVING_MIN',
    totalPrincipal: 30000,
    remainingPrincipal: 25000,
    interestRateAnnual: 25,
    startDate: '2026-01-01',
    subItems: [{ id: 's1', loanId: 'loan-high-rate', title: 'งวดปกติ', dueDayOfMonth: 5, dueTime: '18:00', amount: 2500, subType: 'SPLIT_DAY' }],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'loan-small-balance',
    lenderId: 'custom',
    customLenderName: 'สหกรณ์ออมทรัพย์',
    customColor: '#0F766E',
    title: 'กู้สหกรณ์ยอดเล็ก',
    loanType: 'EFFECTIVE_RATE',
    totalPrincipal: 15000,
    remainingPrincipal: 8000,
    interestRateAnnual: 6,
    startDate: '2026-01-01',
    subItems: [{ id: 's2', loanId: 'loan-small-balance', title: 'งวดปกติ', dueDayOfMonth: 15, dueTime: '18:00', amount: 1500, subType: 'SPLIT_DAY' }],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('Debt Payoff Simulator & Core Fixes', () => {
  it('resolves custom lender name and color when lenderId is custom', () => {
    const lender = getLenderById('custom', 'สหกรณ์ออมทรัพย์', '#0F766E');
    expect(lender.nameTh).toBe('สหกรณ์ออมทรัพย์');
    expect(lender.primaryColor).toBe('#0F766E');
  });

  it('splits interest and principal accurately for EFFECTIVE_RATE loans', () => {
    const breakdown = calculateInstallmentBreakdown(
      { loanType: 'EFFECTIVE_RATE', remainingPrincipal: 120000, totalPrincipal: 120000, interestRateAnnual: 12 },
      5000
    );
    expect(breakdown.interestPortion).toBe(1200);
    expect(breakdown.principalPortion).toBe(3800);
  });

  it('compares Avalanche vs Snowball and shows savings with extra monthly payment', () => {
    const result = comparePayoffStrategies(sampleLoans, 3000, new Date('2026-11-01'));
    expect(result.avalanche.totalInterestPaid).toBeLessThanOrEqual(result.snowball.totalInterestPaid);
    expect(result.interestSavedVsBaseline).toBeGreaterThan(0);
    expect(result.monthsSavedVsBaseline).toBeGreaterThan(0);
  });

  it('simulates refinance / debt consolidation accurately', () => {
    const refi = simulateRefinance(sampleLoans, {
      selectedLoanIds: ['loan-high-rate', 'loan-small-balance'],
      newInterestRateAnnual: 8,
      newTenureMonths: 12,
    });
    expect(refi.totalConsolidatedPrincipal).toBe(33000);
    expect(refi.newMonthlyPayment).toBeGreaterThan(0);
    expect(refi.newEstimatedInterest).toBeGreaterThan(0);
  });
});
