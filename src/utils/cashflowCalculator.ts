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
import { parseISO, format, isValid, differenceInCalendarDays, addMonths, startOfMonth } from 'date-fns';

export function getLenderById(lenderId: string, customName?: string, customColor?: string): LenderInfo {
  const found = LENDERS_CATALOG.find(l => l.id === lenderId);
  if (found) return found;

  return {
    id: lenderId || 'custom',
    code: 'CUSTOM',
    nameTh: customName || 'เจ้าหนี้กำหนดเอง',
    nameEn: customName || 'Custom Creditor',
    category: 'OTHER',
    primaryColor: customColor || '#4A5568',
    secondaryColor: '#EDF2F7',
    textColor: '#FFFFFF',
    badgeText: customName ? customName.substring(0, 5) : 'อื่น',
    logoType: 'custom',
  };
}

/**
 * คำนวณวันครบกำหนดจริงของเดือน (ปรับตามจำนวนวันสูงสุดของเดือน เช่น ก.พ. มี 28 หรือ 29 วัน)
 */
export function getSafeDueDate(yearMonth: string, dayOfMonth: number): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1 - 12
  
  // หาวันสุดท้ายของเดือนนั้น
  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(1, dayOfMonth), lastDay);
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
    if (!loan.isActive) continue;

    for (const sub of loan.subItems) {
      const recordId = `${loan.id}_${sub.id}_${yearMonth}`;
      const record = paymentRecords.find(r => r.id === recordId || (r.loanId === loan.id && r.subItemId === sub.id && r.yearMonth === yearMonth));
      
      const dueDate = getSafeDueDate(yearMonth, sub.dueDayOfMonth);
      const parsedDueDate = parseISO(dueDate);
      
      const daysRemaining = isValid(parsedDueDate) 
        ? differenceInCalendarDays(parsedDueDate, referenceDate)
        : 0;

      let status: PaymentStatus = 'PENDING';
      let paidAt: string | undefined = undefined;

      if (record && record.status === 'PAID') {
        status = 'PAID';
        paidAt = record.paidAt;
      } else {
        // หากยังไม่ได้จ่าย และเลยกำหนดวันมาแล้ว
        if (daysRemaining < 0) {
          status = 'OVERDUE';
        } else {
          status = 'PENDING';
        }
      }

      const lender = getLenderById(loan.lenderId, loan.customLenderName, loan.customColor);

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
        amount: sub.amount,
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
    totalDue += task.amount;
    if (task.status === 'PAID') {
      totalPaid += task.amount;
      paidCount++;
    } else {
      if (task.status === 'OVERDUE') {
        overdueCount++;
      } else {
        pendingCount++;
      }
    }
  }

  const totalRemaining = Math.max(0, totalDue - totalPaid);
  const isSufficient = availableFunds >= totalRemaining;
  const surplusAmount = isSufficient ? (availableFunds - totalRemaining) : 0;
  const shortfallAmount = !isSufficient ? (totalRemaining - availableFunds) : 0;
  const completionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;

  return {
    yearMonth,
    totalDue,
    totalPaid,
    totalRemaining,
    availableFunds,
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
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const thaiYear = year + 543;
  return `${THAI_MONTH_NAMES[monthIdx] || ''} ${thaiYear}`;
}

const THAI_SHORT_MONTH_NAMES = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function getShortThaiMonthYear(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const thaiShort = THAI_SHORT_MONTH_NAMES[monthIdx] || '';
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
  monthsCount: number = 6
): RollingProjectionMonth[] {
  const projections: RollingProjectionMonth[] = [];
  let rollingCash = initialAvailableFunds;

  const [startYear, startMonth] = startYearMonth.split('-').map(Number);
  let baseDate = new Date(startYear, startMonth - 1, 1);

  for (let i = 0; i < monthsCount; i++) {
    const currentMonthDate = addMonths(baseDate, i);
    const ym = format(currentMonthDate, 'yyyy-MM');
    const tasks = getMonthlyInstallmentTasks(loans, paymentRecords, ym, currentMonthDate);

    // ในเดือนแรก ถ้ามีรายการที่จ่ายไปแล้ว ให้คิดเฉพาะยอดที่ยังค้างจ่าย
    // ในเดือนถัดไป (อนาคต) ยอดที่ต้องจ่ายคือยอดรวมทั้งเดือน
    let monthDue = 0;
    if (i === 0) {
      const summary = calculateMonthlySummary(tasks, rollingCash, ym);
      monthDue = summary.totalRemaining;
    } else {
      monthDue = tasks.reduce((sum, t) => sum + t.amount, 0);
    }

    const startingFunds = rollingCash;
    const endingFunds = startingFunds - monthDue;
    const isSufficient = endingFunds >= 0;
    const shortfall = isSufficient ? 0 : Math.abs(endingFunds);

    projections.push({
      yearMonth: ym,
      monthLabelTh: getShortThaiMonthYear(ym),
      totalDue: monthDue,
      startingFunds: Math.max(0, startingFunds),
      endingFunds,
      isSufficient,
      shortfall,
    });

    // ทบยอดเงินไปยังเดือนถัดไป (ถ้าเงินหมด ติดลบ ให้จำลองว่าเงินสดตั้งต้นเดือนถัดไปเป็น 0)
    rollingCash = Math.max(0, endingFunds);
  }

  return projections;
}

/**
 * ฟอร์แมตจำนวนเงินให้อ่านง่าย
 */
export function formatCurrency(amount: number, includeDecimals: boolean = false): string {
  const fixed = includeDecimals ? amount.toFixed(2) : Math.round(amount).toString();
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
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const thaiYear = year + 543;
    return `${day} ${THAI_MONTH_NAMES[monthIdx]} ${thaiYear}`;
  } catch {
    return dateStr;
  }
}
