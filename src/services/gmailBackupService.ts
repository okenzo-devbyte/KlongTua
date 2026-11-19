import { AppStateData, MonthlyInstallmentTask, CashflowSummary, PortfolioDebtSummary } from '../types/loan';
import { 
  loadAppState, 
  saveLoans, 
  savePaymentRecords, 
  saveAvailableFunds, 
  saveNotificationRules, 
  saveWidgetConfig, 
  saveBackupMeta,
  saveVoiceConfig,
  savePencilConfig,
  saveNavTabs,
  saveSecurityConfig,
  saveSelectedYearMonth
} from './storageService';
import {
  DEFAULT_VOICE_CONFIG,
  DEFAULT_PENCIL_CONFIG,
  DEFAULT_NAV_TABS,
  DEFAULT_SECURITY_CONFIG
} from '../data/lenders';
import { format } from 'date-fns';
import { shareFile } from './native/files';

export interface ExportBackupPayload {
  app: string;
  schemaVersion: string;
  exportedAt: string;
  data: AppStateData;
}

export function generateBackupPayload(): ExportBackupPayload {
  const state = loadAppState();
  // ตัดข้อมูลความลับ (pinHash, biometricCredentialId) ออกจากไฟล์สำรองข้อมูลเพื่อความปลอดภัย
  const sanitizedSecurity = {
    ...state.securityConfig,
    pinHash: undefined,
    biometricCredentialId: undefined,
  };
  return {
    app: 'KlongTua',
    schemaVersion: '2.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      ...state,
      securityConfig: sanitizedSecurity,
    },
  };
}

export function buildBackupFileName(now = new Date()): string {
  return `debtflow_backup_${format(now, 'yyyyMMdd_HHmm')}.json`;
}

function isValidLoan(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const loan = value as Record<string, unknown>;

  if (
    typeof loan.id !== 'string'
    || typeof loan.lenderId !== 'string'
    || typeof loan.title !== 'string'
    || !Array.isArray(loan.subItems)
  ) {
    return false;
  }

  return loan.subItems.every(subItem => {
    if (!subItem || typeof subItem !== 'object') return false;
    const item = subItem as Record<string, unknown>;
    return typeof item.id === 'string'
      && typeof item.dueDayOfMonth === 'number'
      && typeof item.dueTime === 'string'
      && typeof item.amount === 'number';
  });
}

function isValidPaymentRecord(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.loanId === 'string'
    && typeof record.subItemId === 'string'
    && typeof record.yearMonth === 'string'
    && typeof record.amountDue === 'number'
    && typeof record.amountPaid === 'number'
    && (record.status === 'PENDING' || record.status === 'PAID' || record.status === 'OVERDUE');
}

/**
 * นำเข้าและกู้คืนข้อมูลจากไฟล์ JSON
 */
export function restoreBackupFile(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed: ExportBackupPayload = JSON.parse(jsonString);

    if (!parsed.data || !Array.isArray(parsed.data.loans) || !parsed.data.loans.every(isValidLoan)) {
      return { success: false, message: 'รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง กรุณาใช้ไฟล์ที่ส่งออกจาก คล่องตัว (KlongTua) หรือ DebtFlow Enterprise' };
    }

    const { data } = parsed;
    const records = Array.isArray(data.paymentRecords)
      ? data.paymentRecords.filter(isValidPaymentRecord)
      : [];

    saveLoans(data.loans, false);
    savePaymentRecords(records, false);
    saveAvailableFunds(Number.isFinite(data.availableFunds) ? data.availableFunds : 0, false);
    if (Array.isArray(data.notificationRules)) saveNotificationRules(data.notificationRules, false);
    if (data.widgetConfig && typeof data.widgetConfig === 'object') saveWidgetConfig(data.widgetConfig, false);
    saveVoiceConfig({ ...DEFAULT_VOICE_CONFIG, ...(data.voiceConfig || {}) }, false);
    savePencilConfig({ ...DEFAULT_PENCIL_CONFIG, ...(data.pencilConfig || {}) }, false);
    saveNavTabs(Array.isArray(data.navTabs) && data.navTabs.length > 0 ? data.navTabs : DEFAULT_NAV_TABS, false);
    // คงค่าความปลอดภัย PIN/Biometric เดิมบนเครื่องไว้ ไม่ให้ไฟล์ภายนอกมาปลดล็อกหรือทับรหัสผ่าน
    if (typeof data.selectedYearMonth === 'string' && /^\d{4}-\d{2}$/.test(data.selectedYearMonth)) {
      saveSelectedYearMonth(data.selectedYearMonth, false);
    }

    saveBackupMeta({
      lastBackupAt: new Date().toISOString(),
      backupFileVersion: data.backupMeta?.backupFileVersion || '2.0.0',
      autoBackupOnPaid: data.backupMeta?.autoBackupOnPaid ?? true,
    }, true);

    return {
      success: true,
      message: `กู้คืนข้อมูลสำเร็จ! นำเข้าเงินกู้ ${data.loans.length} รายการ และประวัติการชำระ ${records.length} รายการเรียบร้อย`,
    };
  } catch (err: any) {
    return { success: false, message: `เกิดข้อผิดพลาดในการอ่านไฟล์: ${err?.message || err}` };
  }
}

/**
 * แชร์ไฟล์สำรองข้อมูล JSON ผ่าน Android Share Sheet หรือดาวน์โหลดบนเว็บ
 */
export async function shareBackupFile(): Promise<boolean> {
  const payload = generateBackupPayload();
  const shared = await shareFile({
    fileName: buildBackupFileName(),
    contents: JSON.stringify(payload, null, 2),
    mimeType: 'application/json',
    title: 'แชร์ไฟล์สำรอง คล่องตัว',
  });

  if (shared) updateLastBackupTime();
  return shared;
}

function escapeCsvCell(raw: string | number | undefined | null): string {
  const str = String(raw ?? '');
  // ป้องกัน CSV Formula Injection (=, +, -, @, tab, CR)
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${neutralized.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

function formatPaidAtBE(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const thaiYear = d.getFullYear() + 543;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${thaiYear} ${hh}:${mm}`;
}

/**
 * ส่งออกรายงานตารางสรุปหนี้สินเป็น CSV
 */
export async function shareCsvReport(
  tasks: MonthlyInstallmentTask[],
  summary: CashflowSummary,
  portfolioSummary?: PortfolioDebtSummary
): Promise<boolean> {
  const headers = ['เจ้าหนี้', 'ชื่อรายการ', 'ซับย่อย', 'ประเภท', 'วันครบกำหนด', 'เวลา', 'ยอดชำระ (บาท)', 'สถานะ', 'วันที่ชำระ'];
  
  const rows = tasks.map(t => [
    escapeCsvCell(t.lender.nameTh),
    escapeCsvCell(t.loanTitle),
    escapeCsvCell(t.subTitle),
    escapeCsvCell(t.loanType),
    t.dueDate,
    t.dueTime,
    t.amount.toString(),
    t.status === 'PAID' ? 'ชำระแล้ว' : (t.status === 'OVERDUE' ? 'เลยกำหนด' : 'รอชำระ'),
    escapeCsvCell(formatPaidAtBE(t.paidAt)),
  ]);

  const summaryRows = [
    [],
    ['สรุปภาพรวมประจำเดือน', summary.yearMonth],
    ['ยอดชำระรวมทั้งหมด', summary.totalDue.toString()],
    ['ชำระแล้ว', summary.totalPaid.toString()],
    ['ค้างชำระคงเหลือ', summary.totalRemaining.toString()],
    ['เงินต้น/เงินสดที่มีอยู่', summary.availableFunds.toString()],
    ['สถานะสภาพคล่อง', summary.isSufficient ? 'เพียงพอ' : 'ไม่เพียงพอ'],
    [summary.isSufficient ? 'เงินคงเหลือสุทธิ' : 'ต้องหาเพิ่มอีก', (summary.isSufficient ? summary.surplusAmount : summary.shortfallAmount).toString()],
  ];

  if (portfolioSummary) {
    summaryRows.push(
      [],
      ['สรุปพอร์ตหนี้สินทั้งหมด (Portfolio Debt Summary)'],
      ['วงเงินกู้ตั้งต้นรวม', portfolioSummary.totalPrincipalAllLoans.toString()],
      ['หนี้คงเหลือรวมสุทธิ', portfolioSummary.totalRemainingAllLoans.toString()],
      ['ลดต้นสะสมแล้ว', portfolioSummary.totalPaidOffAllLoans.toString()],
      ['อัตราปลดหนี้ (%)', `${portfolioSummary.debtPayoffRate.toFixed(1)}%`],
      ['ภาระผ่อนรวมทุกเดือน', portfolioSummary.monthlyCommitment.toString()]
    );
  }

  const csvContent = '\uFEFF' + [
    headers.join(','),
    ...rows.map(r => r.join(',')),
    ...summaryRows.map(r => r.join(',')),
  ].join('\r\n');

  return shareFile({
    fileName: `klongtua_report_${summary.yearMonth}.csv`,
    contents: csvContent,
    mimeType: 'text/csv',
    title: 'แชร์รายงาน CSV คล่องตัว',
  });
}

function updateLastBackupTime(): void {
  const state = loadAppState();
  saveBackupMeta({
    ...state.backupMeta,
    lastBackupAt: new Date().toISOString(),
  }, true);
}
