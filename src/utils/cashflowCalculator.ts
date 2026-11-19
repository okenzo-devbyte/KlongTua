import { 
  LoanAccount, 
  MonthlyPaymentRecord, 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  RollingProjectionMonth,
  LenderInfo,
  PaymentStatus,
  PortfolioDebtSummary
} from '../types/loan';
import { LENDERS_CATALOG } from '../data/lenders';
import { parseISO, format, isValid, differenceInCalendarDays, addMonths } from 'date-fns';

export function roundBaht(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export interface InstallmentBreakdown {
  totalPayment: number;
  interestPortion: number;
  principalPortion: number;
}

/**
 * แยกสัดส่วนดอกเบี้ยและเงินต้นของงวดชำระตามประเภทสินเชื่อ
 */
export function calculateInstallmentBreakdown(
  loan: Pick<LoanAccount, 'loanType' | 'remainingPrincipal' | 'totalPrincipal' | 'interestRateAnnual' | 'totalInstallments'>,
  paymentAmount: number
): InstallmentBreakdown {
  const safePayment = roundBaht(Math.max(0, paymentAmount));
  const rate = Number.isFinite(loan.interestRateAnnual) && loan.interestRateAnnual > 0 ? loan.interestRateAnnual : 0;
  const remaining = Number.isFinite(loan.remainingPrincipal) && loan.remainingPrincipal > 0 ? loan.remainingPrincipal : 0;

  if (safePayment <= 0 || rate <= 0 || loan.loanType === 'INSTALLMENT_PLAN' || loan.loanType === 'PERSONAL_LOAN') {
    return {
      totalPayment: safePayment,
      interestPortion: 0,
      principalPortion: roundBaht(Math.min(safePayment, remaining > 0 ? remaining : safePayment)),
    };
  }

  let estimatedInterest = 0;
  if (loan.loanType === 'FLAT_RATE') {
    const basePrincipal = Number.isFinite(loan.totalPrincipal) && loan.totalPrincipal > 0 ? loan.totalPrincipal : remaining;
    estimatedInterest = roundBaht((basePrincipal * (rate / 100)) / 12);
  } else {
    // EFFECTIVE_RATE, REVOLVING_MIN, MULTI_DAY_SPLIT
    estimatedInterest = roundBaht((remaining * (rate / 100)) / 12);
  }

  const interestPortion = roundBaht(Math.min(safePayment, Math.max(0, estimatedInterest)));
  const principalPortion = roundBaht(Math.max(0, safePayment - interestPortion));

  return {
    totalPayment: safePayment,
    interestPortion,
    principalPortion: remaining > 0 ? roundBaht(Math.min(principalPortion, remaining)) : principalPortion,
  };
}

export function getLenderById(lenderId: string, customName?: string, customColor?: string): LenderInfo {
  const isCustom = !lenderId || lenderId === 'custom';
  if (!isCustom) {
    const found = LENDERS_CATALOG.find(l => l.id === lenderId);
    if (found) return found;
  }

  const trimmedName = customName?.trim();
  return {
    id: lenderId || 'custom',
    code: 'CUSTOM',
    nameTh: trimmedName || 'เจ้าหนี้กำหนดเอง',
    nameEn: trimmedName || 'Custom Creditor',
    category: 'OTHER',
    primaryColor: customColor || '#4A5568',
    secondaryColor: '#EDF2F7',
    textColor: '#FFFFFF',
    badgeText: trimmedName ? trimmedName.substring(0, 5) : 'อื่น',
    logoType: 'custom',
  };
}

/**
 * คำนวณวันครบกำหนดจริงของเดือน (ปรับตามจำนวนวันสูงสุดของเดือน เช่น ก.พ. มี 28 หรือ 29 วัน)
 */
export function getSafeDueDate(yearMonth: string, dayOfMonth: number): string {
  const [yearStr, monthStr] = (yearMonth || '').split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1 - 12
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return `${yearMonth || '2026-01'}-01`;
  }

  const lastDay = new Date(year, month, 0).getDate();
  const intDay = Number.isFinite(dayOfMonth) ? Math.floor(dayOfMonth) : 1;
  const safeDay = Math.min(Math.max(1, intDay), lastDay);
  const padDay = safeDay.toString().padStart(2, '0');

  return `${yearStr}-${monthStr.padStart(2, '0')}-${padDay}`;
}

/**
 * แตกรายการภาระหนี้สินที่ต้องจ่ายในเดือนนั้นๆ ออกเป็นซับย่อย (Sub-items Tasks)
 */
export function getMonthlyInstallmentTasks(
  loans: LoanAccount[],
  paymentRecords: MonthlyPaymentRecord[],
  yearMonth: string,
  referenceDate: Date = new Date()
): MonthlyInstallmentTask[] {
  const tasks: MonthlyInstallmentTask[] = [];

  for (const loan of loans) {
    for (const sub of loan.subItems) {
      const recordId = `${loan.id}_${sub.id}_${yearMonth}`;
      const record = paymentRecords.find(r => r.id === recordId || (r.loanId === loan.id && r.subItemId === sub.id && r.yearMonth === yearMonth));
      const isPaidRecord = record?.status === 'PAID';

      // สัญญาที่ปิดแล้วให้แสดงเฉพาะเดือนที่มีประวัติชำระแล้ว
      if (!loan.isActive && !isPaidRecord) continue;

      const dueDate = getSafeDueDate(yearMonth, sub.dueDayOfMonth);
      const parsedDueDate = parseISO(dueDate);
      const daysRemaining = isValid(parsedDueDate)
        ? differenceInCalendarDays(parsedDueDate, referenceDate)
        : 0;

      let status: PaymentStatus = 'PENDING';
      let paidAt: string | undefined = undefined;

      if (isPaidRecord) {
        status = 'PAID';
        paidAt = record.paidAt;
      } else if (daysRemaining < 0) {
        status = 'OVERDUE';
      } else if (daysRemaining === 0 && (referenceDate.getHours() > 0 || referenceDate.getMinutes() > 0)) {
        const [dueH, dueM] = (sub.dueTime || '18:00').split(':').map(Number);
        const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
        const dueMinutes = (Number.isFinite(dueH) ? dueH : 18) * 60 + (Number.isFinite(dueM) ? dueM : 0);
        status = nowMinutes > dueMinutes ? 'OVERDUE' : 'PENDING';
      }

      const lender = getLenderById(loan.lenderId, loan.customLenderName, loan.customColor);
      // คงยอดประวัติที่จ่ายไปแล้วไม่ให้เพี้ยนเมื่อผู้ใช้แก้ค่างวดในอนาคต
      const resolvedAmount = isPaidRecord && typeof record.amountPaid === 'number' && Number.isFinite(record.amountPaid) && record.amountPaid > 0
        ? roundBaht(record.amountPaid)
        : roundBaht(sub.amount);

      tasks.push({
        id: recordId,
        loanId: loan.id,
        subItemId: sub.id,
        lender,
        loanTitle: loan.title,
        subTitle: sub.title,
        loanType: loan.loanType,
        dueDate,
        dueDayOfMonth: sub.dueDayOfMonth,
        dueTime: sub.dueTime || '18:00',
        amount: resolvedAmount,
        status,
        paidAt,
        isOverdue: status === 'OVERDUE',
        daysRemaining,
        subType: sub.subType,
        totalPrincipal: loan.totalPrincipal,
        remainingPrincipal: loan.remainingPrincipal,
        interestRateAnnual: loan.interestRateAnnual,
        totalInstallments: loan.totalInstallments,
        contractNumber: loan.contractNumber,
      });
    }
  }

  // เรียงลำดับตาม: สถานะ (OVERDUE ขึ้นก่อน, PENDING ตามวันครบกำหนด, PAID อยู่ท้ายสุด)
  return tasks.sort((a, b) => {
    if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
    if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
    if (a.status === 'PAID' && b.status !== 'PAID') return 1;
    if (b.status === 'PAID' && a.status !== 'PAID') return -1;

    // ถ้าสถานะเหมือนกัน เรียงตามวันครบกำหนด
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return a.dueTime.localeCompare(b.dueTime);
  });
}

/**
 * คำนวณสรุปยอดรายเดือน และวิเคราะห์ความเพียงพอของเงินต้นที่มีอยู่ (Sufficiency & Shortfall)
 */
export function calculateMonthlySummary(
  tasks: MonthlyInstallmentTask[],
  availableFunds: number,
  yearMonth: string
): CashflowSummary {
  let totalDue = 0;
  let totalPaid = 0;
  let pendingCount = 0;
  let paidCount = 0;
  let overdueCount = 0;

  for (const task of tasks) {
    const amt = roundBaht(Math.max(0, task.amount));
    totalDue = roundBaht(totalDue + amt);
    if (task.status === 'PAID') {
      totalPaid = roundBaht(totalPaid + amt);
      paidCount++;
    } else {
      if (task.status === 'OVERDUE') {
        overdueCount++;
      } else {
        pendingCount++;
      }
    }
  }

  const safeFunds = roundBaht(Number.isFinite(availableFunds) ? availableFunds : 0);
  const totalRemaining = roundBaht(Math.max(0, totalDue - totalPaid));
  const isSufficient = safeFunds >= totalRemaining;
  const surplusAmount = isSufficient ? roundBaht(safeFunds - totalRemaining) : 0;
  const shortfallAmount = !isSufficient ? roundBaht(totalRemaining - safeFunds) : 0;
  const completionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;

  return {
    yearMonth,
    totalDue,
    totalPaid,
    totalRemaining,
    availableFunds: safeFunds,
    isSufficient,
    surplusAmount,
    shortfallAmount,
    completionRate,
    pendingCount,
    paidCount,
    overdueCount,
  };
}

/**
 * รายชื่อเดือนภาษาไทย
 */
const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export function getThaiMonthYear(yearMonth: string): string {
  const [yearStr, monthStr] = (yearMonth || '').split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (!Number.isFinite(year) || !THAI_MONTH_NAMES[monthIdx]) return yearMonth || '';
  const thaiYear = year + 543;
  return `${THAI_MONTH_NAMES[monthIdx]} ${thaiYear}`;
}

const THAI_SHORT_MONTH_NAMES = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function getShortThaiMonthYear(yearMonth: string): string {
  const [yearStr, monthStr] = (yearMonth || '').split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (!Number.isFinite(year) || !THAI_SHORT_MONTH_NAMES[monthIdx]) return yearMonth || '';
  const thaiShort = THAI_SHORT_MONTH_NAMES[monthIdx];
  const thaiYearShort = (year + 543).toString().slice(-2);
  return `${thaiShort} ${thaiYearShort}`;
}

export function formatShortThaiDayMonth(dateStr: string): string {
  const [yearStr, monthStr, dayStr] = (dateStr || '').split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(day) || !THAI_SHORT_MONTH_NAMES[monthIdx]) {
    return dateStr;
  }
  return `${day} ${THAI_SHORT_MONTH_NAMES[monthIdx]}`;
}

export interface CategoryDistributionItem {
  label: string;
  amount: number;
  count: number;
  color: string;
}

export function calculateCategoryDistribution(
  tasks: MonthlyInstallmentTask[]
): Record<string, CategoryDistributionItem> {
  const categoryTotals: Record<string, CategoryDistributionItem> = {
    BANK: { label: 'ธนาคารพาณิชย์', amount: 0, count: 0, color: '#1E3F8A' },
    DIGITAL_LOAN: { label: 'สินเชื่อดิจิทัล & PayLater', amount: 0, count: 0, color: '#EE4D2D' },
    CREDIT_CARD: { label: 'บัตรกดเงินสด & เครดิต', amount: 0, count: 0, color: '#0072BC' },
    AUTO_TITLE: { label: 'จำนำทะเบียน & ไฟแนนซ์', amount: 0, count: 0, color: '#005CA9' },
    OTHER: { label: 'หนี้อื่นๆ / ส่วนบุคคล', amount: 0, count: 0, color: '#4A5568' },
  };

  for (const task of tasks) {
    const category = task.lender.category || 'OTHER';
    if (!categoryTotals[category]) continue;
    categoryTotals[category].amount += task.amount;
    categoryTotals[category].count += 1;
  }

  return categoryTotals;
}

/**
 * จำลองสภาพคล่องล่วงหน้า 6-12 เดือนแบบสะสมต่อเนื่อง (Rolling Cashflow Forecast)
 */
export function calculateRollingProjection(
  loans: LoanAccount[],
  paymentRecords: MonthlyPaymentRecord[],
  initialAvailableFunds: number,
  startYearMonth: string,
  monthsCount: number = 6,
  monthlyNetIncome: number = 0
): RollingProjectionMonth[] {
  const projections: RollingProjectionMonth[] = [];
  let rollingCash = roundBaht(Math.max(0, Number.isFinite(initialAvailableFunds) ? initialAvailableFunds : 0));

  const [startYear, startMonth] = (startYearMonth || '').split('-').map(Number);
  const baseDate = Number.isFinite(startYear) && Number.isFinite(startMonth) && startMonth >= 1 && startMonth <= 12
    ? new Date(startYear, startMonth - 1, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const safeMonthlyIncome = roundBaht(Math.max(0, Number.isFinite(monthlyNetIncome) ? monthlyNetIncome : 0));

  for (let i = 0; i < monthsCount; i++) {
    const currentMonthDate = addMonths(baseDate, i);
    const ym = format(currentMonthDate, 'yyyy-MM');
    const tasks = getMonthlyInstallmentTasks(loans, paymentRecords, ym, currentMonthDate);

    // คิดเฉพาะยอดที่ยังค้างจ่ายในเดือนนั้น ๆ (ไม่นับซ้ำงวดที่จ่ายล่วงหน้าแล้ว)
    const summary = calculateMonthlySummary(tasks, rollingCash, ym);
    const monthDue = summary.totalRemaining;

    const startingFunds = roundBaht(i === 0 ? rollingCash : rollingCash + safeMonthlyIncome);
    const endingFunds = roundBaht(startingFunds - monthDue);
    const isSufficient = endingFunds >= 0;
    const shortfall = isSufficient ? 0 : roundBaht(Math.abs(endingFunds));

    projections.push({
      yearMonth: ym,
      monthLabelTh: getShortThaiMonthYear(ym),
      totalDue: monthDue,
      startingFunds,
      endingFunds,
      isSufficient,
      shortfall,
    });

    rollingCash = roundBaht(Math.max(0, endingFunds));
  }

  return projections;
}

/**
 * ฟอร์แมตจำนวนเงินให้อ่านง่าย
 */
export function formatCurrency(amount: number, includeDecimals: boolean = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const fixed = includeDecimals ? safe.toFixed(2) : Math.round(safe).toString();
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * คำนวณภาพรวมพอร์ตหนี้สินทั้งหมด (วงเงินกู้ตั้งต้นรวม, หนี้คงเหลือรวม, เงินต้นที่ชำระไปแล้ว และอัตราการปลดหนี้)
 */
export function calculatePortfolioDebtSummary(loans: LoanAccount[]): PortfolioDebtSummary {
  const activeLoans = loans.filter(l => l.isActive);
  let totalPrincipalAllLoans = 0;
  let totalRemainingAllLoans = 0;
  let monthlyCommitment = 0;

  for (const loan of activeLoans) {
    const loanPrincipal = Number.isFinite(loan.totalPrincipal) && loan.totalPrincipal > 0
      ? loan.totalPrincipal
      : (loan.remainingPrincipal || 0);
    const loanRemaining = Number.isFinite(loan.remainingPrincipal) && loan.remainingPrincipal > 0
      ? loan.remainingPrincipal
      : 0;

    totalPrincipalAllLoans += Math.max(loanPrincipal, loanRemaining);
    totalRemainingAllLoans += loanRemaining;

    const loanMonthly = loan.subItems.reduce((sum, s) => sum + (Number.isFinite(s.amount) ? s.amount : 0), 0);
    monthlyCommitment += loanMonthly;
  }

  const totalPaidOffAllLoans = Math.max(0, totalPrincipalAllLoans - totalRemainingAllLoans);
  const debtPayoffRate = totalPrincipalAllLoans > 0
    ? Number(((totalPaidOffAllLoans / totalPrincipalAllLoans) * 100).toFixed(2))
    : 0;

  return {
    totalPrincipalAllLoans,
    totalRemainingAllLoans,
    totalPaidOffAllLoans,
    debtPayoffRate,
    activeLoanCount: activeLoans.length,
    monthlyCommitment,
  };
}

export function formatThaiDateLong(dateStr: string): string {
  try {
    const [yearStr, monthStr, dayStr] = (dateStr || '').split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    if (!Number.isFinite(year) || !Number.isFinite(day) || !THAI_MONTH_NAMES[monthIdx]) {
      return dateStr || '';
    }
    const thaiYear = year + 543;
    return `${day} ${THAI_MONTH_NAMES[monthIdx]} ${thaiYear}`;
  } catch {
    return dateStr || '';
  }
}
