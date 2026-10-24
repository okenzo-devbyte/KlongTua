export type LenderCategory = 
  | 'BANK'          // ธนาคารพาณิชย์และรัฐ
  | 'DIGITAL_LOAN'   // แอปสินเชื่อดิจิทัล & PayLater
  | 'CREDIT_CARD'    // บัตรกดเงินสด / บัตรเครดิต Non-bank
  | 'AUTO_TITLE'     // จำนำทะเบียน / ไฟแนนซ์
  | 'OTHER';         // หนี้ส่วนบุคคล / สหกรณ์ / อื่นๆ

export interface LenderInfo {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  category: LenderCategory;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  badgeText: string;
  logoType?: 'kbank' | 'scb' | 'bbl' | 'ktb' | 'bay' | 'ttb' | 'gsb' | 'uob' | 'kkp' | 'cimb' | 'tisco' | 'baac' | 'ghb'
    | 'linebk' | 'finnix' | 'moneythunder' | 'spaylater' | 'seasycash' | 'lazada' | 'truemoney' | 'tiktok'
    | 'ktc' | 'cardx' | 'firstchoice' | 'aeon' | 'umayplus' | 'promise' | 'amoney'
    | 'tidlor' | 'srisawad' | 'mtc' | 'somwang'
    | 'personal' | 'custom';
}

export type LoanType = 
  | 'EFFECTIVE_RATE'   // ลดต้นลดดอก (Effective Interest Rate)
  | 'FLAT_RATE'        // ดอกเบี้ยคงที่ / ผ่อนรายงวดคงที่
  | 'REVOLVING_MIN'    // สินเชื่อหมุนเวียน / ชำระขั้นต่ำ
  | 'INSTALLMENT_PLAN' // ผ่อนสินค้า 0% / Buy Now Pay Later
  | 'MULTI_DAY_SPLIT'  // แบ่งจ่ายหลายวันในเดือนเดียว
  | 'PERSONAL_LOAN';   // ยืมส่วนบุคคล / สัญญาทั่วไป

export interface LoanSubItem {
  id: string;
  loanId: string;
  title: string;          // เช่น "งวดวันที่ 5 (ต้นเดือน)", "บิลไอโฟน 15", "งวดวันที่ 20"
  dueDayOfMonth: number;  // 1 - 31
  dueTime: string;        // เช่น "18:00"
  amount: number;         // ยอดเงินที่ต้องชำระของซับย่อยนี้
  subType: 'SPLIT_DAY' | 'SUB_BILL'; // แบ่งตามวันจ่ายในเดือน หรือบิลย่อย
  note?: string;
}

export interface LoanAccount {
  id: string;
  lenderId: string;
  customLenderName?: string;
  customColor?: string;
  title: string;                 // ชื่อรายการเงินกู้ เช่น "ผ่อนโน้ตบุ๊ก + บิลย่อย", "สินเชื่อเพื่อธุรกิจ KBank"
  contractNumber?: string;       // เลขที่สัญญา / บัญชีอ้างอิง
  loanType: LoanType;
  totalPrincipal: number;        // วงเงินกู้ / ยอดหนี้ตั้งต้น
  remainingPrincipal: number;    // ยอดหนี้คงเหลือรวม
  interestRateAnnual: number;    // อัตราดอกเบี้ยต่อปี (%)
  startDate: string;             // YYYY-MM-DD
  totalInstallments?: number;    // จำนวนเดือน/งวดทั้งหมด (ถ้ามี)
  subItems: LoanSubItem[];       // รายการซับแยกในแต่ละเดือน (รองรับ 1 หรือหลายรายการ)
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface MonthlyPaymentRecord {
  id: string;                    // `${loanId}_${subItemId}_${yearMonth}`
  loanId: string;
  subItemId: string;
  yearMonth: string;             // YYYY-MM เช่น "2026-10"
  dueDate: string;               // YYYY-MM-DD
  amountDue: number;
  amountPaid: number;
  status: PaymentStatus;
  paidAt?: string;               // ISO Timestamp เมื่อกดติ๊กชำระ
  paymentNote?: string;
  deductedFromFunds?: number;
  deductedFromPrincipal?: number;
}

export interface MonthlyInstallmentTask {
  id: string;                    // record id or synthetic id
  loanId: string;
  subItemId: string;
  lender: LenderInfo;
  loanTitle: string;
  subTitle: string;
  loanType: LoanType;
  dueDate: string;               // YYYY-MM-DD
  dueDayOfMonth: number;
  dueTime: string;
  amount: number;
  status: PaymentStatus;
  paidAt?: string;
  isOverdue: boolean;
  daysRemaining: number;
  subType: 'SPLIT_DAY' | 'SUB_BILL';
  totalPrincipal: number;
  remainingPrincipal: number;
  interestRateAnnual?: number;
  totalInstallments?: number;
  contractNumber?: string;
}

export interface CashflowSummary {
  yearMonth: string;
  totalDue: number;              // ยอดต้องชำระรวมทั้งเดือน
  totalPaid: number;             // ชำระแล้ว
  totalRemaining: number;        // ยอดค้างชำระ
  availableFunds: number;        // เงินต้น/เงินสดที่มีอยู่ ณ ตอนนี้
  isSufficient: boolean;         // พอจ่ายหรือไม่
  surplusAmount: number;         // เงินเหลือสุทธิหลังหักชำระ
  shortfallAmount: number;       // ยอดเงินที่ต้องหาเพิ่ม (หากไม่พอ)
  completionRate: number;        // % การชำระเสร็จสิ้น (0-100)
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
}

export interface RollingProjectionMonth {
  yearMonth: string;
  monthLabelTh: string;          // เช่น "ตุลาคม 2569"
  totalDue: number;
  startingFunds: number;
  endingFunds: number;
  isSufficient: boolean;
  shortfall: number;
}

export type NotificationUnit = 'HOURS' | 'DAYS' | 'WEEKS';

export interface NotificationRule {
  id: string;
  enabled: boolean;
  unit: NotificationUnit;
  amount: number;                // เช่น 3 (ชั่วโมง), 1 (วัน), 1 (สัปดาห์)
  timeOfDay: string;             // เช่น "09:00"
  labelTh: string;
}

export type WidgetTheme = 'LIGHT' | 'DARK' | 'GLASS';
export type WidgetSize = '2x2' | '4x2' | '4x4';

export interface WidgetConfig {
  size: WidgetSize;
  theme: WidgetTheme;
  showPaidItems: boolean;
  showAvailableFunds: boolean;
  pinnedToTop: boolean;
  autoHideCompleted: boolean;
}

export interface GmailBackupMeta {
  lastBackupAt?: string;
  backupFileVersion: string;
  autoBackupOnPaid: boolean;
}

export type ChimeStyle = 'ENTERPRISE' | 'GENTLE' | 'URGENT' | 'NONE';
export type PoliteParticle = 'KA' | 'KRUB';

export interface ThaiVoiceConfig {
  enabled: boolean;              // เปิด-ปิดเสียงแจ้งเตือนระบบ (Notification & Alert Sound)
  privacyMode: boolean;          // โหมดส่วนตัว (ไม่พูดชื่อเจ้าหนี้และตัวเลขเงิน)
  politeParticle: PoliteParticle; // ค่ะ / ครับ
  chimeStyle: ChimeStyle;        // เสียงกระดิ่งนำก่อนพูด
  speechRate: number;            // 0.8 - 1.3
  volume: number;                // 0.0 - 1.0
  speakOnDueReminder: boolean;   // พูดเมื่อถึงเวลาแจ้งเตือนกำหนดชำระ
  speakOnMarkPaid: boolean;      // พูดเมื่อกดติ๊กชำระเงินสำเร็จ
  speakOnShortfallAlert: boolean; // พูดเตือนเมื่อเงินต้นไม่พอจ่าย
  mascotGreetingEnabled: boolean; // เปิด-ปิดเสียงพูดของน้องต้นหอม (Mascot Voice)
  customPhrases?: {
    waving?: string;    // คำทักทายหน้าจอหลัก / แตะการ์ดเงินต้น
    planning?: string;  // วางแผนยอดชำระรวมเดือนนี้ / แตะการ์ดยอดชำระรวม
    success?: string;   // คำฉลองเมื่อชำระสำเร็จ / แตะการ์ดยอดชำระแล้ว
    checking?: string;  // คำเตือนตรวจสอบงวดคงค้าง / แตะการ์ดยอดค้างชำระ
    alert?: string;     // คำเตือนด่วน / แตะการ์ดยอดเลยกำหนด
  };
}

export interface PortfolioDebtSummary {
  totalPrincipalAllLoans: number;  // ยอดวงเงินกู้ตั้งต้นรวมทุกสัญญาที่ใช้งานอยู่
  totalRemainingAllLoans: number;  // ยอดหนี้คงเหลือรวมทุกสัญญาปัจจุบัน
  totalPaidOffAllLoans: number;    // ยอดเงินต้นที่ชำระลดลงไปแล้ว
  debtPayoffRate: number;          // % ความคืบหน้าการปลดหนี้รวม (0-100)
  activeLoanCount: number;         // จำนวนสัญญาที่ใช้งานอยู่
  monthlyCommitment: number;       // ยอดภาระผ่อนรวมต่อเดือนของทุกสัญญา
}

export type DashboardDrillDownModal = 
  | { type: 'TOTAL_DEBT'; summary: PortfolioDebtSummary; loans: LoanAccount[] }
  | { type: 'AVAILABLE_FUNDS'; summary: CashflowSummary }
  | { type: 'MONTHLY_TASKS'; filter: 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE'; title: string; subtitle: string; tasks: MonthlyInstallmentTask[]; totalAmount: number }
  | { type: 'PROJECTION'; data: RollingProjectionMonth; tasks: MonthlyInstallmentTask[] }
  | { type: 'CATEGORY'; categoryKey: string; label: string; tasks: MonthlyInstallmentTask[]; totalAmount: number }
  | null;

export type PdfReportType = 'SUMMARY' | 'DETAIL';

export type ThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';

export interface ThaiPencilConfig {
  themeMode: ThemeMode;
  pencilIntensity: number;       // 10 - 60 (%)
  lowSpecMode: boolean;          // โหมดมือถือสเปกประหยัด
}

export interface NavTabItem {
  id: string;
  label: string;
  iconName: string;
  isVisible: boolean;
  isCustom?: boolean;
  customFilter?: LenderCategory | 'ALL';
  badgeCount?: number;
}

export interface SecurityConfig {
  pinEnabled: boolean;
  pinLength: 4 | 6;
  pinHash?: string;
  biometricEnabled: boolean;
  biometricCredentialId?: string;
  scrambledKeypad: boolean;
  autoLockTimeoutMinutes: number; // 0 = ทันที, 1, 5, 15, -1 = ปิด
}

export interface AppStateData {
  loans: LoanAccount[];
  paymentRecords: MonthlyPaymentRecord[];
  availableFunds: number;
  notificationRules: NotificationRule[];
  widgetConfig: WidgetConfig;
  backupMeta: GmailBackupMeta;
  voiceConfig: ThaiVoiceConfig;
  pencilConfig: ThaiPencilConfig;
  navTabs: NavTabItem[];
  securityConfig: SecurityConfig;
  selectedYearMonth: string;
}
