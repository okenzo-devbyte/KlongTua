import * as XLSX from 'xlsx';
import {
  LoanAccount,
  LoanSubItem,
  LoanType,
  MonthlyInstallmentTask,
  CashflowSummary,
  RollingProjectionMonth,
  PortfolioDebtSummary,
} from '../types/loan';
import { LENDERS_CATALOG } from '../data/lenders';
import { getLenderById, getThaiMonthYear, calculatePortfolioDebtSummary } from '../utils/cashflowCalculator';
import { format } from 'date-fns';

export interface ParsedExcelImportResult {
  loans: LoanAccount[];
  rowCount: number;
  errors: string[];
}

function resolveLenderFromText(rawText: string): { lenderId: string; customLenderName?: string } {
  const clean = (rawText || '').trim();
  if (!clean) {
    return { lenderId: 'kbank' };
  }

  const lower = clean.toLowerCase();
  const matched = LENDERS_CATALOG.find(
    l =>
      l.id.toLowerCase() === lower ||
      l.code.toLowerCase() === lower ||
      l.nameTh.toLowerCase().includes(lower) ||
      lower.includes(l.nameTh.toLowerCase()) ||
      l.nameEn.toLowerCase().includes(lower) ||
      l.badgeText.toLowerCase() === lower
  );

  if (matched && matched.id !== 'custom') {
    return { lenderId: matched.id };
  }

  return {
    lenderId: 'custom',
    customLenderName: clean,
  };
}

function resolveLoanTypeFromText(rawText: string): LoanType {
  const clean = (rawText || '').trim().toLowerCase();
  if (!clean) return 'FLAT_RATE';

  if (clean.includes('multi') || clean.includes('แบ่งจ่าย') || clean.includes('หลายรอบ')) {
    return 'MULTI_DAY_SPLIT';
  }
  if (clean.includes('installment') || clean.includes('ผ่อนสินค้า') || clean.includes('บิลย่อย') || clean.includes('bnpl')) {
    return 'INSTALLMENT_PLAN';
  }
  if (clean.includes('effective') || clean.includes('ลดต้นลดดอก')) {
    return 'EFFECTIVE_RATE';
  }
  if (clean.includes('revolving') || clean.includes('ขั้นต่ำ') || clean.includes('หมุนเวียน')) {
    return 'REVOLVING_MIN';
  }
  if (clean.includes('personal') || clean.includes('ส่วนบุคคล') || clean.includes('ทั่วไป')) {
    return 'PERSONAL_LOAN';
  }
  return 'FLAT_RATE';
}

function getLoanTypeLabelTh(loanType: LoanType): string {
  switch (loanType) {
    case 'MULTI_DAY_SPLIT':
      return 'แบ่งจ่ายหลายรอบ';
    case 'INSTALLMENT_PLAN':
      return 'ผ่อนสินค้า';
    case 'EFFECTIVE_RATE':
      return 'ลดต้นลดดอก';
    case 'REVOLVING_MIN':
      return 'จ่ายขั้นต่ำ';
    case 'PERSONAL_LOAN':
      return 'สินเชื่อทั่วไป';
    case 'FLAT_RATE':
    default:
      return 'งวดคงที่';
  }
}

function parseNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[,฿\s]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * สร้างและดาวน์โหลดไฟล์ Template สำหรับนำเข้าข้อมูลสินเชื่อ (.xlsx)
 */
export function downloadLoanImportTemplate(): void {
  const templateRows = [
    {
      'ผู้ให้บริการ/ธนาคาร': 'kbank',
      'ชื่อรายการสินเชื่อ': 'สินเชื่อธุรกิจกสิกรไทย',
      'เลขที่สัญญา': 'KB-10293',
      'ประเภทสินเชื่อ': 'แบ่งจ่ายหลายรอบ',
      'วงเงินกู้ตั้งต้น': 100000,
      'ยอดหนี้คงเหลือ': 75000,
      'อัตราดอกเบี้ยต่อปี(%)': 15.0,
      'จำนวนงวดทั้งหมด': 24,
      'ชื่องวดชำระย่อย': 'งวดต้นเดือน (วันที่ 5)',
      'วันที่ครบกำหนดของเดือน(1-31)': 5,
      'เวลาแจ้งเตือน': '18:00',
      'ยอดที่ต้องชำระต่องวด': 3500,
      'หมายเหตุ': 'ตัวอย่างการแบ่งจ่าย 2 รอบในเดือนเดียว (แถวที่ 1)',
    },
    {
      'ผู้ให้บริการ/ธนาคาร': 'kbank',
      'ชื่อรายการสินเชื่อ': 'สินเชื่อธุรกิจกสิกรไทย',
      'เลขที่สัญญา': 'KB-10293',
      'ประเภทสินเชื่อ': 'แบ่งจ่ายหลายรอบ',
      'วงเงินกู้ตั้งต้น': 100000,
      'ยอดหนี้คงเหลือ': 75000,
      'อัตราดอกเบี้ยต่อปี(%)': 15.0,
      'จำนวนงวดทั้งหมด': 24,
      'ชื่องวดชำระย่อย': 'งวดปลายเดือน (วันที่ 20)',
      'วันที่ครบกำหนดของเดือน(1-31)': 20,
      'เวลาแจ้งเตือน': '18:00',
      'ยอดที่ต้องชำระต่องวด': 3500,
      'หมายเหตุ': 'ตัวอย่างการแบ่งจ่าย 2 รอบในเดือนเดียว (แถวที่ 2 ชื่อรายการเดียวกัน)',
    },
    {
      'ผู้ให้บริการ/ธนาคาร': 'spaylater',
      'ชื่อรายการสินเชื่อ': 'Shopee SPayLater ผ่อนของใช้',
      'เลขที่สัญญา': 'SP-2026',
      'ประเภทสินเชื่อ': 'ผ่อนสินค้า',
      'วงเงินกู้ตั้งต้น': 15000,
      'ยอดหนี้คงเหลือ': 9000,
      'อัตราดอกเบี้ยต่อปี(%)': 0,
      'จำนวนงวดทั้งหมด': 6,
      'ชื่องวดชำระย่อย': 'งวดประจำเดือน (วันที่ 10)',
      'วันที่ครบกำหนดของเดือน(1-31)': 10,
      'เวลาแจ้งเตือน': '20:00',
      'ยอดที่ต้องชำระต่องวด': 1500,
      'หมายเหตุ': 'จ่ายเดือนละ 1 ครั้ง',
    },
    {
      'ผู้ให้บริการ/ธนาคาร': 'เงินติดล้อ',
      'ชื่อรายการสินเชื่อ': 'สินเชื่อทะเบียนรถยนต์',
      'เลขที่สัญญา': 'NTL-5581',
      'ประเภทสินเชื่อ': 'ลดต้นลดดอก',
      'วงเงินกู้ตั้งต้น': 120000,
      'ยอดหนี้คงเหลือ': 84000,
      'อัตราดอกเบี้ยต่อปี(%)': 12.5,
      'จำนวนงวดทั้งหมด': 36,
      'ชื่องวดชำระย่อย': 'งวดประจำเดือน (วันที่ 25)',
      'วันที่ครบกำหนดของเดือน(1-31)': 25,
      'เวลาแจ้งเตือน': '17:00',
      'ยอดที่ต้องชำระต่องวด': 4200,
      'หมายเหตุ': 'ระบุชื่อผู้ให้บริการเป็นภาษาไทยหรือรหัสก็ได้',
    },
  ];

  const guideRows = LENDERS_CATALOG.map(l => ({
    'รหัสอ้างอิง (Code)': l.id,
    'ชื่อผู้ให้บริการ (ภาษาไทย)': l.nameTh,
    'ชื่อผู้ให้บริการ (อังกฤษ)': l.nameEn,
    'ป้ายย่อ': l.badgeText,
  }));

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.json_to_sheet(templateRows);
  wsData['!cols'] = [
    { wch: 20 },
    { wch: 28 },
    { wch: 15 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 26 },
    { wch: 24 },
    { wch: 14 },
    { wch: 20 },
    { wch: 36 },
  ];

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 18 }, { wch: 38 }, { wch: 30 }, { wch: 16 }];

  XLSX.utils.book_append_sheet(wb, wsData, 'รายการนำเข้าสินเชื่อ');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'รหัสผู้ให้บริการ');

  XLSX.writeFile(wb, `KlongTua_Template_นำเข้าสินเชื่อ.xlsx`);
}

function findRowField(row: Record<string, unknown>, keywords: string[], defaultValue: unknown = ''): unknown {
  for (const key of keywords) {
    if (row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  const entries = Object.entries(row);
  for (const keyword of keywords) {
    const kwLower = keyword.toLowerCase();
    for (const [colName, val] of entries) {
      if (val !== undefined && val !== '' && colName.toLowerCase().includes(kwLower)) {
        return val;
      }
    }
  }
  return defaultValue;
}

/**
 * อ่านและแปลงข้อมูลจากไฟล์ Excel (.xlsx / .xls / .csv) เป็นรายการ LoanAccount[]
 */
export function parseExcelImportBuffer(buffer: ArrayBuffer): ParsedExcelImportResult {
  const errors: string[] = [];

  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { loans: [], rowCount: 0, errors: ['ไม่พบแผ่นงาน (Sheet) ในไฟล์ที่อัปโหลด'] };
    }

    // Prefer sheet named 'รายการนำเข้าสินเชื่อ' or 'ทะเบียนสัญญาสินเชื่อ' or fallback to first sheet
    const targetSheetName =
      wb.SheetNames.find(n => n.includes('รายการนำเข้า') || n.includes('ทะเบียนสัญญา') || n.includes('Loans')) ||
      wb.SheetNames[0];

    const sheet = wb.Sheets[targetSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (rows.length === 0) {
      return { loans: [], rowCount: 0, errors: ['ไม่พบข้อมูลแถวในไฟล์ Excel กรุณากรอกข้อมูลอย่างน้อย 1 แถว'] };
    }

    const loanMap = new Map<string, LoanAccount>();
    let validRows = 0;

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      // Support flexible column names (exact or substring match)
      const rawLender = String(
        findRowField(row, ['ผู้ให้บริการ/ธนาคาร', 'รหัสหรือชื่อผู้ให้บริการ', 'ผู้ให้บริการ', 'ธนาคาร', 'เจ้าหนี้', 'lender'], '')
      ).trim();

      const rawTitle = String(
        findRowField(row, ['ชื่อรายการสินเชื่อ', 'ชื่อรายการเงินกู้', 'ชื่อรายการ', 'ชื่อสินเชื่อ', 'รายการ', 'title'], '')
      ).trim();

      const rawContract = String(
        findRowField(row, ['เลขที่สัญญา', 'สัญญา', 'contractNumber'], '')
      ).trim();

      const rawLoanType = String(
        findRowField(row, ['ประเภทสินเชื่อ', 'ประเภทเงินกู้', 'loanType'], 'งวดคงที่')
      ).trim();

      const rawTotalPrincipal = findRowField(
        row,
        ['วงเงินกู้ตั้งต้น', 'วงเงินสินเชื่อ', 'วงเงินกู้', 'totalPrincipal'],
        0
      );

      const rawRemainingPrincipal = findRowField(
        row,
        ['ยอดหนี้คงเหลือ', 'หนี้คงเหลือ', 'เงินต้นคงเหลือ', 'remainingPrincipal'],
        0
      );

      const rawInterestRate = findRowField(
        row,
        ['อัตราดอกเบี้ย', 'ดอกเบี้ย', 'interestRate'],
        0
      );

      const rawTotalInstallments = findRowField(
        row,
        ['จำนวนงวดทั้งหมด', 'จำนวนงวด', 'totalInstallments'],
        ''
      );

      const rawSubTitle = String(
        findRowField(row, ['ชื่องวดชำระย่อย', 'ชื่องวดชำระ', 'งวดชำระ', 'ซับย่อย', 'subTitle'], '')
      ).trim();

      const rawDueDay = findRowField(
        row,
        ['วันที่ครบกำหนด', 'วันครบกำหนด', 'วันที่ชำระ', 'ทุกวันที่', 'dueDay'],
        28
      );

      const rawDueTime = String(
        findRowField(row, ['เวลาแจ้งเตือน', 'เวลาครบกำหนด', 'เวลา', 'dueTime'], '18:00')
      ).trim();

      const rawAmount = findRowField(
        row,
        ['ยอดที่ต้องชำระ', 'ยอดชำระ', 'ค่างวด', 'จำนวนเงิน', 'amount'],
        0
      );

      const rawNotes = String(findRowField(row, ['หมายเหตุ', 'notes'], '')).trim();

      const amount = Math.max(0, parseNumber(rawAmount, 0));
      if (!rawTitle && !rawLender && amount <= 0) {
        // Empty row, skip silently
        return;
      }

      if (amount <= 0) {
        errors.push(`แถวที่ ${rowNum}: ยอดที่ต้องชำระต่องวดต้องมากกว่า 0 บาท`);
        return;
      }

      const { lenderId, customLenderName } = resolveLenderFromText(rawLender || rawTitle);
      const finalTitle = rawTitle || customLenderName || 'รายการสินเชื่อนำเข้า';
      const dueDay = Math.min(31, Math.max(1, Math.round(parseNumber(rawDueDay, 28))));
      const dueTime = /^\d{1,2}:\d{2}$/.test(rawDueTime) ? rawDueTime.padStart(5, '0') : '18:00';

      const remPrincipal = Math.max(0, parseNumber(rawRemainingPrincipal, 0));
      const totPrincipal = Math.max(remPrincipal, parseNumber(rawTotalPrincipal, remPrincipal || amount * 12));
      const interestRate = Math.max(0, parseNumber(rawInterestRate, 0));
      const totalInstallmentsNum = parseNumber(rawTotalInstallments, 0);

      const groupKey = `${lenderId}__${finalTitle.toLowerCase()}__${rawContract.toLowerCase()}`;

      const existing = loanMap.get(groupKey);
      if (existing) {
        const subIndex = existing.subItems.length + 1;
        const newSub: LoanSubItem = {
          id: `sub-imp-${Date.now()}-${index}-${subIndex}`,
          loanId: existing.id,
          title: rawSubTitle || `งวดที่ ${subIndex} (วันที่ ${dueDay})`,
          dueDayOfMonth: dueDay,
          dueTime,
          amount,
          subType: 'SPLIT_DAY',
        };
        existing.subItems.push(newSub);
        if (existing.subItems.length > 1 && existing.loanType === 'FLAT_RATE') {
          existing.loanType = 'MULTI_DAY_SPLIT';
        }
      } else {
        const loanId = `loan-imp-${Date.now()}-${index}`;
        const firstSub: LoanSubItem = {
          id: `sub-imp-${Date.now()}-${index}-1`,
          loanId,
          title: rawSubTitle || `งวดประจำเดือน (วันที่ ${dueDay})`,
          dueDayOfMonth: dueDay,
          dueTime,
          amount,
          subType: 'SPLIT_DAY',
        };

        const newLoan: LoanAccount = {
          id: loanId,
          lenderId,
          customLenderName,
          title: finalTitle,
          contractNumber: rawContract || undefined,
          loanType: resolveLoanTypeFromText(rawLoanType),
          totalPrincipal: totPrincipal,
          remainingPrincipal: remPrincipal || totPrincipal,
          interestRateAnnual: interestRate,
          totalInstallments: totalInstallmentsNum > 0 ? totalInstallmentsNum : undefined,
          startDate: new Date().toISOString().slice(0, 10),
          subItems: [firstSub],
          isActive: true,
          notes: rawNotes || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        loanMap.set(groupKey, newLoan);
      }

      validRows++;
    });

    return {
      loans: Array.from(loanMap.values()),
      rowCount: validRows,
      errors,
    };
  } catch (err: any) {
    return {
      loans: [],
      rowCount: 0,
      errors: [`ไม่สามารถอ่านไฟล์ Excel ได้: ${err?.message || 'รูปแบบไฟล์ไม่รองรับ'}`],
    };
  }
}

/**
 * ส่งออกข้อมูลทั้งหมดของระบบเป็นไฟล์ Excel (.xlsx) แบบ 3 ชีตระดับมืออาชีพ
 */
export function exportFullExcelWorkbook(params: {
  loans: LoanAccount[];
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  rollingProjections: RollingProjectionMonth[];
  selectedYearMonth: string;
  portfolioSummary?: PortfolioDebtSummary;
}): void {
  const { loans, tasks, summary, rollingProjections, selectedYearMonth } = params;
  const portfolio = params.portfolioSummary || calculatePortfolioDebtSummary(loans);
  const monthLabel = getThaiMonthYear(selectedYearMonth);

  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: สรุปภาพรวมและสภาพคล่อง
  const summaryRows: Record<string, string | number>[] = [
    { 'หัวข้อสรุปทางการเงิน': 'ชื่อแอปพลิเคชัน', 'รายละเอียด / ยอดเงิน (บาท)': 'คล่องตัว (KlongTua) - ระบบบริหารหนี้สินและสภาพคล่องอัจฉริยะ' },
    { 'หัวข้อสรุปทางการเงิน': 'ประจำเดือน', 'รายละเอียด / ยอดเงิน (บาท)': monthLabel },
    { 'หัวข้อสรุปทางการเงิน': 'วันที่ส่งออกรายงาน', 'รายละเอียด / ยอดเงิน (บาท)': format(new Date(), 'dd/MM/yyyy HH:mm') },
    { 'หัวข้อสรุปทางการเงิน': 'เงินต้น / เงินสำรองที่มีอยู่ (บาท)', 'รายละเอียด / ยอดเงิน (บาท)': summary.availableFunds },
    { 'หัวข้อสรุปทางการเงิน': 'ยอดที่ต้องชำระรวมทั้งเดือน (บาท)', 'รายละเอียด / ยอดเงิน (บาท)': summary.totalDue },
    { 'หัวข้อสรุปทางการเงิน': 'ยอดที่ชำระแล้ว (บาท)', 'รายละเอียด / ยอดเงิน (บาท)': summary.totalPaid },
    { 'หัวข้อสรุปทางการเงิน': 'ยอดค้างชำระคงเหลือ (บาท)', 'รายละเอียด / ยอดเงิน (บาท)': summary.totalRemaining },
    {
      'หัวข้อสรุปทางการเงิน': 'สถานะสภาพคล่องสุทธิ',
      'รายละเอียด / ยอดเงิน (บาท)': summary.isSufficient
        ? `เพียงพอ (เหลือเงินสุทธิ +${summary.surplusAmount} บาท)`
        : `ไม่เพียงพอ (ขาดอีก -${summary.shortfallAmount} บาท)`,
    },
    { 'หัวข้อสรุปทางการเงิน': 'อัตราความสำเร็จการชำระ (%)', 'รายละเอียด / ยอดเงิน (บาท)': `${summary.completionRate}%` },
    { 'หัวข้อสรุปทางการเงิน': '', 'รายละเอียด / ยอดเงิน (บาท)': '' },
    { 'หัวข้อสรุปทางการเงิน': '--- ภาพรวมพอร์ตหนี้สินทั้งหมด (Portfolio Debt) ---', 'รายละเอียด / ยอดเงิน (บาท)': '' },
    { 'หัวข้อสรุปทางการเงิน': 'จำนวนสัญญาเงินกู้ที่ใช้งานอยู่ (สัญญา)', 'รายละเอียด / ยอดเงิน (บาท)': portfolio.activeLoanCount },
    { 'หัวข้อสรุปทางการเงิน': 'วงเงินกู้ตั้งต้นรวมทุกสัญญา (บาท)', 'รายละเอียด / ยอดเงิน (บาท)': portfolio.totalPrincipalAllLoans },
    { 'หัวข้อสรุปทางการเงิน': 'ยอดหนี้คงเหลือรวมสุทธิ (บาท)', 'รายละเอียด / ยอดเงิน (บาท)': portfolio.totalRemainingAllLoans },
    { 'หัวข้อสรุปทางการเงิน': 'ยอดเงินต้นที่ชำระลดลงแล้ว (บาท)', 'รายละเอียด / ยอดเงิน (บาท)': portfolio.totalPaidOffAllLoans },
    { 'หัวข้อสรุปทางการเงิน': 'อัตราความคืบหน้าการปลดหนี้สะสม (%)', 'รายละเอียด / ยอดเงิน (บาท)': `${portfolio.debtPayoffRate.toFixed(2)}%` },
    { 'หัวข้อสรุปทางการเงิน': 'ภาระผ่อนชำระรวมต่อเดือน (บาท)', 'รายละเอียด / ยอดเงิน (บาท)': portfolio.monthlyCommitment },
    { 'หัวข้อสรุปทางการเงิน': '', 'รายละเอียด / ยอดเงิน (บาท)': '' },
    { 'หัวข้อสรุปทางการเงิน': '--- พยากรณ์สภาพคล่องล่วงหน้า 6 เดือน ---', 'รายละเอียด / ยอดเงิน (บาท)': '' },
  ];

  for (const proj of rollingProjections) {
    summaryRows.push({
      'หัวข้อสรุปทางการเงิน': `${proj.monthLabelTh} (${proj.yearMonth})`,
      'รายละเอียด / ยอดเงิน (บาท)': `เงินตั้งต้น ${proj.startingFunds} | ยอดต้องจ่าย ${proj.totalDue} | คงเหลือปลายเดือน ${proj.endingFunds} (${proj.isSufficient ? 'เพียงพอ' : `ขาด ${proj.shortfall}`})`,
    });
  }

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 64 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาพรวมสภาพคล่อง');

  // 2. Sheet 2: รายการต้องชำระประจำเดือน
  const scheduleRows = tasks.map((t, i) => ({
    'ลำดับ': i + 1,
    'สถานะ': t.status === 'PAID' ? 'ชำระแล้ว' : t.status === 'OVERDUE' ? 'เลยกำหนด' : 'รอชำระ',
    'ผู้ให้บริการ': t.lender.nameTh,
    'ชื่อรายการสินเชื่อ': t.loanTitle,
    'ชื่องวดชำระย่อย': t.subTitle,
    'วันครบกำหนด': t.dueDate,
    'เวลาแจ้งเตือน': t.dueTime,
    'ยอดที่ต้องชำระ (บาท)': t.amount,
    'ยอดหนี้คงเหลือรวม (บาท)': t.remainingPrincipal,
    'วงเงินกู้ตั้งต้น (บาท)': t.totalPrincipal,
    'เลขที่สัญญา': t.contractNumber || '-',
  }));

  const wsSchedule = XLSX.utils.json_to_sheet(
    scheduleRows.length > 0
      ? scheduleRows
      : [{ 'สถานะ': 'ไม่มีรายการที่ต้องชำระในเดือนนี้' }]
  );
  wsSchedule['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 24 },
    { wch: 26 },
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSchedule, 'รายการชำระประจำเดือน');

  // 3. Sheet 3: ทะเบียนสัญญาสินเชื่อ (โครงสร้างเดียวกับไฟล์ Import สามารถแก้ไขและนำเข้ากลับได้ทันที)
  const contractRows: Record<string, string | number>[] = [];
  for (const loan of loans) {
    const lender = getLenderById(loan.lenderId, loan.customLenderName, loan.customColor);
    for (const sub of loan.subItems) {
      contractRows.push({
        'ผู้ให้บริการ/ธนาคาร': loan.lenderId === 'custom' ? (loan.customLenderName || lender.nameTh) : loan.lenderId,
        'ชื่อรายการสินเชื่อ': loan.title,
        'เลขที่สัญญา': loan.contractNumber || '',
        'ประเภทสินเชื่อ': getLoanTypeLabelTh(loan.loanType),
        'วงเงินกู้ตั้งต้น': loan.totalPrincipal,
        'ยอดหนี้คงเหลือ': loan.remainingPrincipal,
        'อัตราดอกเบี้ยต่อปี(%)': loan.interestRateAnnual,
        'จำนวนงวดทั้งหมด': loan.totalInstallments || '',
        'ชื่องวดชำระย่อย': sub.title,
        'วันที่ครบกำหนดของเดือน(1-31)': sub.dueDayOfMonth,
        'เวลาแจ้งเตือน': sub.dueTime,
        'ยอดที่ต้องชำระต่องวด': sub.amount,
        'หมายเหตุ': loan.notes || '',
      });
    }
  }

  const wsContracts = XLSX.utils.json_to_sheet(
    contractRows.length > 0
      ? contractRows
      : [{ 'ชื่อรายการสินเชื่อ': 'ยังไม่มีข้อมูลสัญญาสินเชื่อ' }]
  );
  wsContracts['!cols'] = [
    { wch: 20 },
    { wch: 28 },
    { wch: 15 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 26 },
    { wch: 24 },
    { wch: 14 },
    { wch: 20 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsContracts, 'ทะเบียนสัญญาสินเชื่อ');

  XLSX.writeFile(wb, `KlongTua_รายงานสินเชื่อ_${selectedYearMonth}.xlsx`);
}
