import { LoanAccount } from '../types/loan';
import { addMonths, format } from 'date-fns';
import { getShortThaiMonthYear, roundBaht } from './cashflowCalculator';

export type PayoffStrategy = 'AVALANCHE' | 'SNOWBALL';

export interface LoanPayoffItemResult {
  loanId: string;
  loanTitle: string;
  startingBalance: number;
  interestRateAnnual: number;
  monthsToPayoff: number;
  payoffYearMonth: string;
  payoffLabelTh: string;
  totalInterestPaid: number;
}

export interface PayoffSimulationResult {
  strategy: PayoffStrategy;
  extraMonthlyPayment: number;
  totalMonths: number;
  debtFreeYearMonth: string;
  debtFreeLabelTh: string;
  totalInterestPaid: number;
  totalAmountPaid: number;
  loanResults: LoanPayoffItemResult[];
}

export interface PayoffComparison {
  avalanche: PayoffSimulationResult;
  snowball: PayoffSimulationResult;
  baselineNoExtra: PayoffSimulationResult;
  interestSavedVsBaseline: number;
  monthsSavedVsBaseline: number;
  recommendedStrategy: PayoffStrategy;
}

export interface RefinanceSimulationInput {
  selectedLoanIds: string[];
  newInterestRateAnnual: number;
  newTenureMonths: number;
}

export interface RefinanceSimulationResult {
  totalConsolidatedPrincipal: number;
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  monthlySavings: number;
  currentEstimatedInterest: number;
  newEstimatedInterest: number;
  interestSavings: number;
}

const MAX_SIMULATION_MONTHS = 360; // 30 years cap

function getLoanMonthlyMinimum(loan: LoanAccount): number {
  const sum = loan.subItems.reduce((acc, s) => acc + (Number.isFinite(s.amount) && s.amount > 0 ? s.amount : 0), 0);
  if (sum > 0) return roundBaht(sum);
  // Fallback if no subItems: 3% of remaining or 500 THB
  return roundBaht(Math.max(500, (loan.remainingPrincipal || 0) * 0.03));
}

export function simulateDebtPayoff(
  loans: LoanAccount[],
  strategy: PayoffStrategy,
  extraMonthlyPayment: number = 0,
  startDate: Date = new Date()
): PayoffSimulationResult {
  const activeLoans = loans
    .filter(l => l.isActive && Number.isFinite(l.remainingPrincipal) && l.remainingPrincipal > 0)
    .map(l => ({
      id: l.id,
      title: l.title,
      startingBalance: roundBaht(l.remainingPrincipal),
      balance: roundBaht(l.remainingPrincipal),
      rateAnnual: Number.isFinite(l.interestRateAnnual) && l.interestRateAnnual > 0 ? l.interestRateAnnual : 0,
      minPayment: getLoanMonthlyMinimum(l),
      interestPaid: 0,
      payoffMonth: 0,
    }));

  const safeExtra = roundBaht(Math.max(0, Number.isFinite(extraMonthlyPayment) ? extraMonthlyPayment : 0));

  if (activeLoans.length === 0) {
    const ym = format(startDate, 'yyyy-MM');
    return {
      strategy,
      extraMonthlyPayment: safeExtra,
      totalMonths: 0,
      debtFreeYearMonth: ym,
      debtFreeLabelTh: getShortThaiMonthYear(ym),
      totalInterestPaid: 0,
      totalAmountPaid: 0,
      loanResults: [],
    };
  }

  let month = 0;
  let totalInterestPaid = 0;
  let totalAmountPaid = 0;
  const totalBaseBudget = roundBaht(activeLoans.reduce((sum, l) => sum + l.minPayment, 0) + safeExtra);

  while (month < MAX_SIMULATION_MONTHS && activeLoans.some(l => l.balance > 0.01)) {
    month++;
    let remainingBudget = totalBaseBudget;

    // 1. Accrue monthly interest
    for (const item of activeLoans) {
      if (item.balance <= 0.01) continue;
      const monthlyInterest = roundBaht((item.balance * (item.rateAnnual / 100)) / 12);
      item.balance = roundBaht(item.balance + monthlyInterest);
      item.interestPaid = roundBaht(item.interestPaid + monthlyInterest);
      totalInterestPaid = roundBaht(totalInterestPaid + monthlyInterest);
    }

    // 2. Pay minimum on every open loan
    for (const item of activeLoans) {
      if (item.balance <= 0.01) continue;
      const payment = roundBaht(Math.min(item.balance, item.minPayment, remainingBudget));
      item.balance = roundBaht(item.balance - payment);
      remainingBudget = roundBaht(remainingBudget - payment);
      totalAmountPaid = roundBaht(totalAmountPaid + payment);
      if (item.balance <= 0.01) {
        item.balance = 0;
        item.payoffMonth = month;
      }
    }

    // 3. Apply remaining snowball/avalanche surplus to priority target
    if (remainingBudget > 0.01) {
      const openLoans = activeLoans.filter(l => l.balance > 0.01);
      openLoans.sort((a, b) => {
        if (strategy === 'AVALANCHE') {
          if (b.rateAnnual !== a.rateAnnual) return b.rateAnnual - a.rateAnnual;
          return a.balance - b.balance;
        }
        // SNOWBALL: smallest remaining balance first
        if (a.balance !== b.balance) return a.balance - b.balance;
        return b.rateAnnual - a.rateAnnual;
      });

      for (const target of openLoans) {
        if (remainingBudget <= 0.01) break;
        const extraApplied = roundBaht(Math.min(target.balance, remainingBudget));
        target.balance = roundBaht(target.balance - extraApplied);
        remainingBudget = roundBaht(remainingBudget - extraApplied);
        totalAmountPaid = roundBaht(totalAmountPaid + extraApplied);
        if (target.balance <= 0.01) {
          target.balance = 0;
          target.payoffMonth = month;
        }
      }
    }
  }

  const debtFreeDate = addMonths(startDate, month);
  const debtFreeYearMonth = format(debtFreeDate, 'yyyy-MM');

  return {
    strategy,
    extraMonthlyPayment: safeExtra,
    totalMonths: month,
    debtFreeYearMonth,
    debtFreeLabelTh: getShortThaiMonthYear(debtFreeYearMonth),
    totalInterestPaid: roundBaht(totalInterestPaid),
    totalAmountPaid: roundBaht(totalAmountPaid),
    loanResults: activeLoans.map(item => {
      const m = item.payoffMonth || month;
      const ym = format(addMonths(startDate, m), 'yyyy-MM');
      return {
        loanId: item.id,
        loanTitle: item.title,
        startingBalance: item.startingBalance,
        interestRateAnnual: item.rateAnnual,
        monthsToPayoff: m,
        payoffYearMonth: ym,
        payoffLabelTh: getShortThaiMonthYear(ym),
        totalInterestPaid: roundBaht(item.interestPaid),
      };
    }),
  };
}

export function comparePayoffStrategies(
  loans: LoanAccount[],
  extraMonthlyPayment: number = 0,
  startDate: Date = new Date()
): PayoffComparison {
  const avalanche = simulateDebtPayoff(loans, 'AVALANCHE', extraMonthlyPayment, startDate);
  const snowball = simulateDebtPayoff(loans, 'SNOWBALL', extraMonthlyPayment, startDate);
  const baselineNoExtra = simulateDebtPayoff(loans, 'AVALANCHE', 0, startDate);

  const recommendedStrategy: PayoffStrategy =
    avalanche.totalInterestPaid <= snowball.totalInterestPaid ? 'AVALANCHE' : 'SNOWBALL';
  const best = recommendedStrategy === 'AVALANCHE' ? avalanche : snowball;

  return {
    avalanche,
    snowball,
    baselineNoExtra,
    interestSavedVsBaseline: roundBaht(Math.max(0, baselineNoExtra.totalInterestPaid - best.totalInterestPaid)),
    monthsSavedVsBaseline: Math.max(0, baselineNoExtra.totalMonths - best.totalMonths),
    recommendedStrategy,
  };
}

export function simulateRefinance(
  loans: LoanAccount[],
  input: RefinanceSimulationInput
): RefinanceSimulationResult {
  const selected = loans.filter(
    l => input.selectedLoanIds.includes(l.id) && l.isActive && l.remainingPrincipal > 0
  );

  const totalConsolidatedPrincipal = roundBaht(selected.reduce((sum, l) => sum + l.remainingPrincipal, 0));
  const currentMonthlyPayment = roundBaht(selected.reduce((sum, l) => sum + getLoanMonthlyMinimum(l), 0));
  const currentBaseline = simulateDebtPayoff(selected, 'AVALANCHE', 0);

  const tenure = Math.max(1, Math.min(360, Math.round(input.newTenureMonths || 12)));
  const monthlyRate = Math.max(0, input.newInterestRateAnnual || 0) / 100 / 12;

  let newMonthlyPayment = 0;
  if (totalConsolidatedPrincipal > 0) {
    if (monthlyRate === 0) {
      newMonthlyPayment = roundBaht(totalConsolidatedPrincipal / tenure);
    } else {
      const factor = Math.pow(1 + monthlyRate, tenure);
      newMonthlyPayment = roundBaht((totalConsolidatedPrincipal * monthlyRate * factor) / (factor - 1));
    }
  }

  const newTotalPaid = roundBaht(newMonthlyPayment * tenure);
  const newEstimatedInterest = roundBaht(Math.max(0, newTotalPaid - totalConsolidatedPrincipal));

  return {
    totalConsolidatedPrincipal,
    currentMonthlyPayment,
    newMonthlyPayment,
    monthlySavings: roundBaht(currentMonthlyPayment - newMonthlyPayment),
    currentEstimatedInterest: currentBaseline.totalInterestPaid,
    newEstimatedInterest,
    interestSavings: roundBaht(currentBaseline.totalInterestPaid - newEstimatedInterest),
  };
}
