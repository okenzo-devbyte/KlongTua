import React, { useState } from 'react';
import { 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  LoanAccount, 
  WidgetConfig, 
  RollingProjectionMonth,
  MonthlyPaymentRecord,
  ThaiVoiceConfig,
  DashboardDrillDownModal,
  PortfolioDebtSummary
} from '../types/loan';
import { HomeWidgetCard } from './HomeWidgetCard';
import { LenderIcon } from './LenderIcon';
import { ThaiMascot } from './ThaiMascot';
import { AdaptiveDetailSheet } from './AdaptiveDetailSheet';
import { PdfReportModal } from './PdfReportModal';
import { 
  loadCollapsibleState, 
  saveCollapsibleState 
} from '../services/storageService';
import { 
  formatCurrency, 
  getThaiMonthYear, 
  calculateRollingProjection,
  getMonthlyInstallmentTasks,
  formatThaiDateLong,
  formatShortThaiDayMonth,
  calculateCategoryDistribution,
  calculatePortfolioDebtSummary,
  getLenderById
} from '../utils/cashflowCalculator';
import { 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  PieChart, 
  Edit3, 
  Check, 
  X,
  CreditCard,
  Building2,
  ChevronUp,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  BarChart3,
  CheckSquare,
  Square,
  Volume2
} from 'lucide-react';
import { addMonths, subMonths, format } from 'date-fns';

interface DashboardViewProps {
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  portfolioSummary?: PortfolioDebtSummary;
  loans: LoanAccount[];
  paymentRecords: MonthlyPaymentRecord[];
  widgetConfig: WidgetConfig;
  selectedYearMonth: string;
  voiceConfig?: ThaiVoiceConfig;
  lowSpecMode?: boolean;
  onSelectYearMonth: (ym: string) => void;
  onUpdateAvailableFunds: (funds: number) => void;
  onToggleTask: (task: MonthlyInstallmentTask) => void;
  onNavigateToTab: (tab: string) => void;
  onAddFirstLoan: () => void;
  onOpenExcelModal?: () => void;
  onLoadSampleData?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  summary,
  portfolioSummary: propPortfolioSummary,
  loans,
  paymentRecords,
  widgetConfig,
  selectedYearMonth,
  voiceConfig,
  lowSpecMode = false,
  onSelectYearMonth,
  onUpdateAvailableFunds,
  onToggleTask,
  onNavigateToTab,
  onAddFirstLoan,
  onOpenExcelModal,
  onLoadSampleData,
}) => {
  const [isEditingFunds, setIsEditingFunds] = useState(false);
  const [inputFunds, setInputFunds] = useState(summary.availableFunds.toString());

  // Compute portfolio summary if not provided
  const portfolioSummary = propPortfolioSummary || calculatePortfolioDebtSummary(loans);

  // Collapsible sections state (persisted)
  const [isProjectionCollapsed, setIsProjectionCollapsed] = useState(() => 
    loadCollapsibleState('dashboard_projection', false)
  );
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(() => 
    loadCollapsibleState('dashboard_category', false)
  );

  // Drill-down Modal state (Adaptive Hybrid Sheet)
  const [drillDownModal, setDrillDownModal] = useState<DashboardDrillDownModal>(null);

  // PDF Report Modal state
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const toggleProjection = () => {
    const next = !isProjectionCollapsed;
    setIsProjectionCollapsed(next);
    saveCollapsibleState('dashboard_projection', next);
  };

  const toggleCategory = () => {
    const next = !isCategoryCollapsed;
    setIsCategoryCollapsed(next);
    saveCollapsibleState('dashboard_category', next);
  };

  // Mascot trigger timestamps for tapping
  const [triggerWaving, setTriggerWaving] = useState(0);
  const [triggerPlanning, setTriggerPlanning] = useState(0);
  const [triggerSuccess, setTriggerSuccess] = useState(0);
  const [triggerCheckingRem, setTriggerCheckingRem] = useState(0);
  const [triggerAlert, setTriggerAlert] = useState(0);
  const [triggerPortfolio, setTriggerPortfolio] = useState(0);

  // Handle Month Stepping
  const handlePrevMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const prevDate = subMonths(new Date(y, m - 1, 1), 1);
    onSelectYearMonth(format(prevDate, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const nextDate = addMonths(new Date(y, m - 1, 1), 1);
    onSelectYearMonth(format(nextDate, 'yyyy-MM'));
  };

  // Save updated funds
  const handleSaveFunds = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(inputFunds) || 0;
    onUpdateAvailableFunds(val);
    setIsEditingFunds(false);
  };

  // Quick Add Funds shortcuts
  const addQuickFunds = (amount: number) => {
    const newVal = summary.availableFunds + amount;
    onUpdateAvailableFunds(newVal);
    setInputFunds(newVal.toString());
  };

  // Compute 6-Month Rolling Projection
  const rollingProjections = calculateRollingProjection(
    loans,
    paymentRecords,
    summary.availableFunds,
    selectedYearMonth,
    6
  );

  // Group tasks by category for distribution overview
  const categoryTotals = calculateCategoryDistribution(tasks);

  // Tasks filtered for drilldown
  const overdueTasks = tasks.filter(t => t.status === 'OVERDUE');
  const paidTasks = tasks.filter(t => t.status === 'PAID');
  const pendingTasks = tasks.filter(t => t.status !== 'PAID');
  const overdueTotalAmount = overdueTasks.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      
      {/* 1. Month Selector & Title Bar - Minimalist High Contrast */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-4 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Calendar size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">ภาพรวมการเงินประจำเดือน</span>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {getThaiMonthYear(selectedYearMonth)}
            </h1>
          </div>
        </div>

        {/* Action Controls: Excel, PDF Report & Month Stepper */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Excel Import / Export Button */}
          {onOpenExcelModal && (
            <button
              onClick={onOpenExcelModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 text-xs font-bold transition-all shadow-xs active:scale-95"
              title="นำเข้าและส่งออกข้อมูล Excel (.xlsx / .csv)"
            >
              <FileSpreadsheet size={14} />
              <span>Excel</span>
            </button>
          )}

          {/* PDF Report Export Button */}
          <button
            onClick={() => setIsPdfOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 text-xs font-bold transition-all shadow-xs active:scale-95"
            title="ออกรายงานเอกสารการเงินทางการ PDF พร้อมหัวกระดาษทุกหน้า"
          >
            <FileText size={14} />
            <span>รายงาน PDF</span>
          </button>

          {/* Month Stepper Buttons */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl border border-stone-200 dark:border-stone-700">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 px-2 min-w-[85px] text-center font-num">
              {selectedYearMonth}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="เดือนถัดไป"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Pinned Home Screen Quick Widget (If Enabled) */}
      {widgetConfig.pinnedToTop && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>Pinned Android Quick Widget (แตะติ๊กชำระได้ทันที)</span>
            </span>
            <button 
              onClick={() => onNavigateToTab('widget')}
              className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold"
            >
              ปรับแต่งขนาด & ธีม
            </button>
          </div>
          <HomeWidgetCard
            tasks={tasks}
            summary={summary}
            size={widgetConfig.size}
            theme={widgetConfig.theme}
            showPaidItems={widgetConfig.showPaidItems}
            onToggleTask={onToggleTask}
          />
        </div>
      )}

      {loans.length === 0 && (
        <div className="bg-white/95 dark:bg-stone-900/90 border border-amber-300/80 dark:border-stone-800 p-8 rounded-3xl shadow-xs text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <PlusCircle size={24} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">เริ่มต้นวางแผนการเงินกับ "คล่องตัว"</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
              ยังไม่มีสัญญาเงินกู้ในระบบ คุณสามารถเพิ่มสัญญาแรก นำเข้าจากไฟล์ Excel หรือโหลดข้อมูลตัวอย่างเพื่อทดลองใช้งานได้ทันที
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              onClick={onAddFirstLoan}
              className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform"
            >
              + เพิ่มสัญญาแรก
            </button>
            {onOpenExcelModal && (
              <button
                onClick={onOpenExcelModal}
                className="px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold active:scale-95 transition-transform flex items-center gap-1.5"
              >
                <FileSpreadsheet size={15} />
                <span>นำเข้าจาก Excel</span>
              </button>
            )}
            {onLoadSampleData && (
              <button
                onClick={onLoadSampleData}
                className="px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-bold active:scale-95 transition-transform flex items-center gap-1.5"
              >
                <Sparkles size={15} className="text-amber-500" />
                <span>โหลดข้อมูลตัวอย่าง</span>
              </button>
            )}
          </div>
        </div>
      )}

      {loans.length > 0 && (
        <>
          {/* ================= TIER 1: DUAL HERO KPI BENTO ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* HERO 1: TOTAL DEBT PORTFOLIO CARD (สรุปยอดหนี้สินทั้งหมด และยอดคงเหลือ) */}
            <div 
              onClick={() => setDrillDownModal({
                type: 'TOTAL_DEBT',
                summary: portfolioSummary,
                loans: loans
              })}
              className="bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-5 rounded-3xl shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-400/80 active:scale-[0.99] transition-all group"
              title="แตะเพื่อดูรายละเอียดหนี้สินคงเหลือทุกสัญญา"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <BarChart3 size={16} className="text-amber-600 dark:text-amber-400" />
                    <span>หนี้สินรวมทั้งหมด (Portfolio Debt)</span>
                  </span>
                  
                  {/* Mascot / Voice Trigger Button */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setTriggerPortfolio(Date.now());
                    }}
                    className="p-1 rounded-2xl hover:bg-amber-50 dark:hover:bg-stone-800 transition-colors"
                    title="แตะที่น้องต้นหอมเพื่อฟังเสียงสรุปพอร์ตหนี้สิน"
                  >
                    <ThaiMascot 
                      type="PLANNING" 
                      size={46} 
                      voiceConfig={voiceConfig} 
                      lowSpecMode={lowSpecMode} 
                      triggerTimestamp={triggerPortfolio} 
                    />
                  </div>
                </div>

                {/* Big Number: Total Remaining Debt */}
                <div className="my-1">
                  <span className="text-[11px] font-medium text-stone-400 block">ยอดหนี้คงเหลือรวมสุทธิ</span>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-num text-stone-900 dark:text-stone-100">
                    ฿{formatCurrency(portfolioSummary.totalRemainingAllLoans)}
                  </div>
                </div>

                {/* Sub-metrics */}
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>ยอดตั้งต้นรวม ({portfolioSummary.activeLoanCount} สัญญา):</span>
                    <span className="font-bold font-num text-stone-800 dark:text-stone-200">฿{formatCurrency(portfolioSummary.totalPrincipalAllLoans)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ลดต้นสะสมแล้ว:</span>
                    <span className="font-bold font-num text-emerald-600 dark:text-emerald-400">฿{formatCurrency(portfolioSummary.totalPaidOffAllLoans)}</span>
                  </div>
                </div>

                {/* Debt Payoff Rate Progress Bar */}
                <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-stone-600 dark:text-stone-300">อัตราการปลดหนี้สะสม</span>
                    <span className="font-extrabold font-num text-emerald-600 dark:text-emerald-400">
                      {portfolioSummary.debtPayoffRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(0, portfolioSummary.debtPayoffRate))}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* Drilldown cue pill */}
              <div className="mt-4 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                <span>แตะการ์ดเพื่อดูแจกแจงทุกสัญญา</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* HERO 2: AVAILABLE CAPITAL & SUFFICIENCY (เงินต้นที่มี & สภาพคล่อง) */}
            <div 
              onClick={() => setDrillDownModal({
                type: 'AVAILABLE_FUNDS',
                summary: summary
              })}
              className="bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-5 rounded-3xl shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-400/80 active:scale-[0.99] transition-all group"
              title="แตะเพื่อดูสมการสภาพคล่องหรือปรับยอดเงินต้น"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Wallet size={16} className="text-amber-600 dark:text-amber-400" />
                    <span>เงินต้น / สภาพคล่องที่มีอยู่</span>
                  </span>

                  {/* Mascot / Voice Trigger Button */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setTriggerWaving(Date.now());
                    }}
                    className="p-1 rounded-2xl hover:bg-amber-50 dark:hover:bg-stone-800 transition-colors"
                    title="แตะที่น้องต้นหอมเพื่อฟังเสียงทักทาย"
                  >
                    <ThaiMascot 
                      type="WAVING" 
                      size={46} 
                      voiceConfig={voiceConfig} 
                      lowSpecMode={lowSpecMode} 
                      triggerTimestamp={triggerWaving} 
                    />
                  </div>
                </div>

                {/* Big Number: Available Funds */}
                <div className="my-1">
                  <span className="text-[11px] font-medium text-stone-400 block">เงินสดพร้อมใช้สำหรับชำระหนี้</span>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-num text-stone-900 dark:text-stone-100">
                    ฿{formatCurrency(summary.availableFunds)}
                  </div>
                </div>

                {/* Sufficiency Verdict Banner */}
                <div className={`mt-3 p-3 rounded-2xl border flex items-center justify-between ${
                  summary.isSufficient
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {summary.isSufficient ? (
                      <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold">
                        {summary.isSufficient ? 'สภาพคล่องเพียงพอสำหรับเดือนนี้' : 'สภาพคล่องไม่เพียงพอ'}
                      </div>
                      <div className="text-[11px] font-num font-semibold">
                        {summary.isSufficient 
                          ? `เงินเหลือสุทธิ +฿${formatCurrency(summary.surplusAmount)}` 
                          : `ต้องหาเพิ่ม -฿${formatCurrency(summary.shortfallAmount)}`}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    summary.isSufficient ? 'bg-emerald-200/70 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-rose-200/70 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                  }`}>
                    {summary.isSufficient ? 'พอจ่าย' : 'ขาดเงิน'}
                  </span>
                </div>
              </div>

              {/* Quick Top-up adjustment pills */}
              <div className="mt-4 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px]">
                <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                  <span>แตะการ์ดเพื่อปรับยอดเงินต้น / สมการ</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="text-[10px] text-stone-400 font-num">
                  ค้างจ่าย ฿{formatCurrency(summary.totalRemaining)}
                </span>
              </div>
            </div>

          </div>

          {/* ================= TIER 2: MONTHLY 4 KPI CARDS ================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* 1. ยอดชำระรวมเดือนนี้ -> Click opens ALL monthly tasks */}
            <div 
              onClick={() => setDrillDownModal({
                type: 'MONTHLY_TASKS',
                filter: 'ALL',
                title: 'ยอดชำระประจำเดือนนี้',
                subtitle: `รวม ${tasks.length} รายการที่ต้องชำระในรอบเดือน ${selectedYearMonth}`,
                tasks: tasks,
                totalAmount: summary.totalDue
              })}
              className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-start justify-between cursor-pointer hover:border-amber-400/80 active:scale-[0.99] transition-all group"
              title="แตะเพื่อดูรายการหนี้ที่ต้องชำระทั้งหมดในเดือนนี้"
            >
              <div>
                <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">ยอดชำระเดือนนี้</span>
                <div className="text-xl sm:text-2xl font-extrabold font-num text-stone-900 dark:text-stone-100 mt-1">
                  ฿{formatCurrency(summary.totalDue)}
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block font-num">
                  รวม {tasks.length} รายการ (แตะดู)
                </span>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setTriggerPlanning(Date.now());
                }}
                className="shrink-0 p-0.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"
                title="แตะเพื่อฟังเสียงน้องต้นหอมสรุปงบประมาณ"
              >
                <ThaiMascot 
                  type="PLANNING" 
                  size={40} 
                  voiceConfig={voiceConfig} 
                  lowSpecMode={lowSpecMode} 
                  triggerTimestamp={triggerPlanning} 
                />
              </div>
            </div>

            {/* 2. ชำระแล้ว -> Click opens PAID monthly tasks */}
            <div 
              onClick={() => setDrillDownModal({
                type: 'MONTHLY_TASKS',
                filter: 'PAID',
                title: 'รายการที่ชำระเรียบร้อยแล้ว',
                subtitle: `ชำระสำเร็จแล้ว ${summary.paidCount} งวด ยอดสะสม ฿${formatCurrency(summary.totalPaid)}`,
                tasks: paidTasks,
                totalAmount: summary.totalPaid
              })}
              className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-start justify-between cursor-pointer hover:border-emerald-400/80 active:scale-[0.99] transition-all group"
              title="แตะเพื่อดูรายการที่ชำระแล้ว"
            >
              <div className="flex-1 mr-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">ชำระแล้ว</span>
                  <span className="text-[10px] font-bold font-num text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                    {summary.paidCount} งวด
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-num text-emerald-600 dark:text-emerald-400 mt-1">
                  ฿{formatCurrency(summary.totalPaid)}
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${summary.completionRate}%` }} />
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-num">
                  สำเร็จ {summary.completionRate.toFixed(0)}% (แตะดู)
                </span>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setTriggerSuccess(Date.now());
                }}
                className="shrink-0 p-0.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"
                title="แตะเพื่อฟังเสียงฉลองชำระเงิน"
              >
                <ThaiMascot 
                  type="SUCCESS" 
                  size={40} 
                  voiceConfig={voiceConfig} 
                  lowSpecMode={lowSpecMode} 
                  triggerTimestamp={triggerSuccess} 
                />
              </div>
            </div>

            {/* 3. ค้างชำระคงเหลือ -> Click opens PENDING tasks */}
            <div 
              onClick={() => setDrillDownModal({
                type: 'MONTHLY_TASKS',
                filter: 'PENDING',
                title: 'รายการค้างชำระคงเหลือ',
                subtitle: `เหลืออีก ${summary.pendingCount} งวด ยอดรวม ฿${formatCurrency(summary.totalRemaining)}`,
                tasks: pendingTasks,
                totalAmount: summary.totalRemaining
              })}
              className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-start justify-between cursor-pointer hover:border-amber-400/80 active:scale-[0.99] transition-all group"
              title="แตะเพื่อดูรายการค้างชำระที่ต้องจ่าย"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">ค้างชำระคงเหลือ</span>
                  <span className="text-[10px] font-bold font-num text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                    {summary.pendingCount} งวด
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-num text-stone-900 dark:text-stone-100 mt-1">
                  ฿{formatCurrency(summary.totalRemaining)}
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  รอชำระ (แตะดู & ติ๊กจ่าย)
                </span>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setTriggerCheckingRem(Date.now());
                }}
                className="shrink-0 p-0.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"
                title="แตะเพื่อฟังเสียงน้องต้นหอมเตือนยอดค้าง"
              >
                <ThaiMascot 
                  type="CHECKING" 
                  size={40} 
                  voiceConfig={voiceConfig} 
                  lowSpecMode={lowSpecMode} 
                  triggerTimestamp={triggerCheckingRem} 
                />
              </div>
            </div>

            {/* 4. เลยกำหนด (Overdue) -> Click opens OVERDUE tasks */}
            <div 
              onClick={() => setDrillDownModal({
                type: 'MONTHLY_TASKS',
                filter: 'OVERDUE',
                title: 'รายการเลยกำหนดชำระ (Overdue)',
                subtitle: summary.overdueCount > 0 
                  ? `พบ ${summary.overdueCount} รายการเลยกำหนด ยอดรวม ฿${formatCurrency(overdueTotalAmount)}` 
                  : 'ไม่มีรายการเลยกำหนดชำระในรอบเดือนนี้',
                tasks: overdueTasks,
                totalAmount: overdueTotalAmount
              })}
              className={`p-4 rounded-2xl border shadow-xs flex items-start justify-between cursor-pointer hover:border-rose-400/80 active:scale-[0.99] transition-all group ${
                summary.overdueCount > 0 
                  ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100' 
                  : 'bg-white/95 dark:bg-stone-900/90 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100'
              }`}
              title="แตะเพื่อดูรายการที่เลยกำหนดชำระ"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">เลยกำหนด</span>
                  {summary.overdueCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900 px-1.5 py-0.5 rounded animate-pulse">
                      ด่วน
                    </span>
                  )}
                </div>
                <div className={`text-xl sm:text-2xl font-extrabold font-num mt-1 ${summary.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-stone-900 dark:text-stone-100'}`}>
                  {summary.overdueCount} งวด
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  {summary.overdueCount > 0 ? 'แตะดู & ชำระทันที' : 'ไม่มีรายการเลยกำหนด'}
                </span>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setTriggerAlert(Date.now());
                }}
                className="shrink-0 p-0.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"
                title="แตะเพื่อฟังเสียงแจ้งเตือนด่วน"
              >
                <ThaiMascot 
                  type="ALERT" 
                  size={40} 
                  voiceConfig={voiceConfig} 
                  lowSpecMode={lowSpecMode} 
                  triggerTimestamp={triggerAlert} 
                />
              </div>
            </div>

          </div>

          {/* ================= 3. ROLLING 6-MONTH PROJECTION ================= */}
          <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 transition-colors duration-300">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-amber-600 dark:text-amber-400" />
                  <span>การจำลองสภาพคล่องต่อเนื่อง 6 เดือนล่วงหน้า (Rolling Cashflow Forecast)</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  วิเคราะห์ว่าเงินสดที่มีอยู่ ณ ปัจจุบัน จะครอบคลุมภาระหนี้สินได้ถึงเดือนไหน แตะแต่ละเดือนเพื่อดูรายละเอียด
                </p>
              </div>

              <button
                type="button"
                onClick={toggleProjection}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title={isProjectionCollapsed ? 'ขยายดูตาราง' : 'ย่อเก็บ'}
              >
                {isProjectionCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>

            {/* Mini Summary Pill when Collapsed */}
            {isProjectionCollapsed ? (
              <div 
                onClick={toggleProjection}
                className="p-3.5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {rollingProjections.every(p => p.isSufficient) 
                      ? 'สภาพคล่องครอบคลุมต่อเนื่อง 6 เดือนสมบูรณ์แบบ (เงินสำรองเพียงพอทุกเดือน)' 
                      : `คาดการณ์สภาพคล่อง: มีงวดที่ต้องหาเงินสำรองเพิ่ม (${rollingProjections.find(p => !p.isSufficient)?.monthLabelTh})`}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline">
                  แตะเพื่อขยายตาราง ▾
                </span>
              </div>
            ) : (
              /* Projection Cards */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {rollingProjections.map((proj, idx) => (
                  <div 
                    key={proj.yearMonth}
                    onClick={() => {
                      const mTasks = getMonthlyInstallmentTasks(loans, paymentRecords, proj.yearMonth);
                      setDrillDownModal({
                        type: 'PROJECTION',
                        data: proj,
                        tasks: mTasks
                      });
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer hover:shadow-xs active:scale-95 ${
                      proj.isSufficient 
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60' 
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 block">
                      {proj.monthLabelTh}
                    </span>
                    <div className="my-1.5">
                      <span className="text-[10px] text-stone-400 block">ยอดต้องจ่าย</span>
                      <span className="text-xs font-bold font-num text-stone-900 dark:text-stone-100">
                        ฿{formatCurrency(proj.totalDue)}
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-stone-200/50 dark:border-stone-800">
                      <span className="text-[10px] text-stone-400 block">เงินคงเหลือ</span>
                      <span className={`text-xs font-bold font-num ${proj.isSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        ฿{formatCurrency(proj.endingFunds)}
                      </span>
                    </div>
                    <span className={`mt-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      proj.isSufficient ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200' : 'bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200'
                    }`}>
                      {proj.isSufficient ? 'พอจ่าย' : 'ขาดเงิน'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= 4. CATEGORY BREAKDOWN OVERVIEW ================= */}
          <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 transition-colors duration-300">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <PieChart size={16} className="text-amber-600 dark:text-amber-400" />
                  <span>สัดส่วนหนี้สินตามประเภทเจ้าหนี้ (Category Breakdown)</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  วิเคราะห์สัดส่วนภาระหนี้สินในเดือนนี้ แยกตามประเภทเพื่อวางแผนการเงิน
                </p>
              </div>

              <button
                type="button"
                onClick={toggleCategory}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title={isCategoryCollapsed ? 'ขยายดูสัดส่วน' : 'ย่อเก็บ'}
              >
                {isCategoryCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>

            {!isCategoryCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(categoryTotals).filter(([_, cat]) => cat.amount > 0).map(([catKey, cat]) => {
                  const percentage = summary.totalDue > 0 ? (cat.amount / summary.totalDue) * 100 : 0;
                  return (
                    <div
                      key={catKey}
                      onClick={() => {
                        const cTasks = tasks.filter(t => t.lender.category === catKey);
                        setDrillDownModal({
                          type: 'CATEGORY',
                          categoryKey: catKey,
                          label: cat.label,
                          tasks: cTasks,
                          totalAmount: cat.amount
                        });
                      }}
                      className="p-3.5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors active:scale-95"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="p-2 rounded-xl bg-white dark:bg-stone-700 shadow-xs shrink-0">
                          <CreditCard size={16} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{cat.label}</div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-num">
                            {cat.count} รายการ ({percentage.toFixed(0)}%)
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-num text-stone-900 dark:text-stone-100">
                          ฿{formatCurrency(cat.amount)}
                        </div>
                        <div className="w-16 bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full mt-1 overflow-hidden ml-auto">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ================= ADAPTIVE DETAIL DRILL-DOWN SHEET ================= */}
      <AdaptiveDetailSheet
        isOpen={drillDownModal !== null}
        onClose={() => setDrillDownModal(null)}
        title={
          drillDownModal?.type === 'TOTAL_DEBT' ? 'แจกแจงหนี้สินรวมทุกสัญญา' :
          drillDownModal?.type === 'AVAILABLE_FUNDS' ? 'สมการสภาพคล่องและการเงิน' :
          drillDownModal?.type === 'MONTHLY_TASKS' ? drillDownModal.title :
          drillDownModal?.type === 'PROJECTION' ? `คาดการณ์เดือน ${drillDownModal.data.monthLabelTh}` :
          drillDownModal?.type === 'CATEGORY' ? `หนี้หมวด ${drillDownModal.label}` :
          'รายละเอียด'
        }
        subtitle={
          drillDownModal?.type === 'TOTAL_DEBT' ? `สัญญาทั้งหมด ${portfolioSummary.activeLoanCount} สัญญา • ยอดคงเหลือรวม ฿${formatCurrency(portfolioSummary.totalRemainingAllLoans)}` :
          drillDownModal?.type === 'AVAILABLE_FUNDS' ? 'วิเคราะห์เงินสดที่มีอยู่และสภาพคล่องการชำระหนี้' :
          drillDownModal?.type === 'MONTHLY_TASKS' ? drillDownModal.subtitle :
          drillDownModal?.type === 'PROJECTION' ? `ยอดต้องจ่าย ฿${formatCurrency(drillDownModal.data.totalDue)}` :
          drillDownModal?.type === 'CATEGORY' ? `ยอดรวม ฿${formatCurrency(drillDownModal.totalAmount)} (${drillDownModal.tasks.length} รายการ)` :
          undefined
        }
        footerActions={
          drillDownModal?.type === 'TOTAL_DEBT' ? (
            <button
              onClick={() => {
                setDrillDownModal(null);
                onNavigateToTab('loans');
              }}
              className="w-full py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5"
            >
              <span>เปิดหน้าจัดการสัญญา (Loan Manager)</span>
              <ArrowRight size={14} />
            </button>
          ) : drillDownModal?.type === 'MONTHLY_TASKS' ? (
            <button
              onClick={() => {
                setDrillDownModal(null);
                onNavigateToTab('todos');
              }}
              className="w-full py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5"
            >
              <span>เปิด To-Do List เต็มรูปแบบ</span>
              <ArrowRight size={14} />
            </button>
          ) : undefined
        }
      >
        {/* TOTAL DEBT DRILLDOWN */}
        {drillDownModal?.type === 'TOTAL_DEBT' && (
          <div className="space-y-4">
            {/* Top KPI Metrics 4-grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-center">
                <span className="text-[10px] text-stone-400 block">หนี้คงเหลือรวม</span>
                <span className="text-sm font-extrabold font-num text-stone-900 dark:text-stone-100">
                  ฿{formatCurrency(portfolioSummary.totalRemainingAllLoans)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-center">
                <span className="text-[10px] text-stone-400 block">ยอดตั้งต้นรวม</span>
                <span className="text-sm font-extrabold font-num text-stone-700 dark:text-stone-300">
                  ฿{formatCurrency(portfolioSummary.totalPrincipalAllLoans)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-center">
                <span className="text-[10px] text-stone-400 block">ลดต้นสะสมแล้ว</span>
                <span className="text-sm font-extrabold font-num text-emerald-600 dark:text-emerald-400">
                  ฿{formatCurrency(portfolioSummary.totalPaidOffAllLoans)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-center">
                <span className="text-[10px] text-stone-400 block">อัตราปลดหนี้</span>
                <span className="text-sm font-extrabold font-num text-emerald-600 dark:text-emerald-400">
                  {portfolioSummary.debtPayoffRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* List of active loans */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                รายละเอียดแยกตามสัญญาเงินกู้ ({loans.length} สัญญา):
              </span>

              {loans.map(loan => {
                const remaining = loan.remainingPrincipal ?? loan.totalPrincipal;
                const paidOff = Math.max(0, loan.totalPrincipal - remaining);
                const rate = loan.totalPrincipal > 0 ? (paidOff / loan.totalPrincipal) * 100 : 0;
                const lender = getLenderById(loan.lenderId, loan.customLenderName, loan.customColor);
                const monthlyCommitment = loan.subItems.reduce((sum, s) => sum + s.amount, 0);
                
                return (
                  <div 
                    key={loan.id}
                    className="p-3.5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <LenderIcon lender={lender} size="md" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                            {loan.title}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">
                            {loan.contractNumber ? `สัญญา ${loan.contractNumber} • ` : ''}ผ่อน ฿{formatCurrency(monthlyCommitment)}/ด.
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-num text-stone-900 dark:text-stone-100">
                          คงเหลือ ฿{formatCurrency(remaining)}
                        </div>
                        <span className="text-[10px] text-stone-400 font-num">
                          จาก ฿{formatCurrency(loan.totalPrincipal)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar per loan */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                        <span>ปลดหนี้แล้ว</span>
                        <span className="font-bold font-num text-emerald-600 dark:text-emerald-400">{rate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AVAILABLE FUNDS DRILLDOWN */}
        {drillDownModal?.type === 'AVAILABLE_FUNDS' && (
          <div className="space-y-4">
            {/* Cashflow Equation Banner */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                สมการสภาพคล่องการชำระหนี้ (Cashflow Equation):
              </span>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-stone-500 dark:text-stone-400">เงินสดพร้อมใช้ที่มีอยู่:</span>
                <span className="font-bold font-num text-stone-900 dark:text-stone-100">
                  ฿{formatCurrency(summary.availableFunds)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-t border-stone-200/50 dark:border-stone-700/50">
                <span className="text-stone-500 dark:text-stone-400">หัก ยอดค้างชำระเดือนนี้:</span>
                <span className="font-bold font-num text-rose-600 dark:text-rose-400">
                  -฿{formatCurrency(summary.totalRemaining)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5 border-t border-stone-300 dark:border-stone-600 font-bold">
                <span className={summary.isSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {summary.isSufficient ? 'เงินคงเหลือสุทธิ (Surplus):' : 'ยอดเงินที่ต้องหาเพิ่ม (Shortfall):'}
                </span>
                <span className={`font-num ${summary.isSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {summary.isSufficient ? `+฿${formatCurrency(summary.surplusAmount)}` : `-฿${formatCurrency(summary.shortfallAmount)}`}
                </span>
              </div>
            </div>

            {/* Quick Top-up buttons */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                เติมเงินเข้าสภาพคล่องด่วน:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[1000, 5000, 10000, 50000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => addQuickFunds(amt)}
                    className="py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-bold font-num text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 active:scale-95 transition-all"
                  >
                    +{amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <form onSubmit={handleSaveFunds} className="space-y-2">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                หรือกำหนดตัวเลขเงินต้นเอง:
              </span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold">฿</span>
                  <input
                    type="number"
                    value={inputFunds}
                    onChange={(e) => setInputFunds(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-num text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="0"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MONTHLY TASKS DRILLDOWN (Interactive 1-Tap Checkbox) */}
        {drillDownModal?.type === 'MONTHLY_TASKS' && (
          <div className="space-y-3">
            {/* Header summary pill */}
            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                พบทั้งหมด {drillDownModal.tasks.length} รายการ
              </span>
              <span className="text-sm font-extrabold font-num text-stone-900 dark:text-stone-100">
                รวม ฿{formatCurrency(drillDownModal.totalAmount)}
              </span>
            </div>

            {drillDownModal.tasks.length === 0 ? (
              <div className="p-8 text-center text-stone-400 space-y-1">
                <p className="text-xs">ไม่มีรายการในหมวดนี้</p>
              </div>
            ) : (
              <div className="space-y-2">
                {drillDownModal.tasks.map(t => {
                  const isPaid = t.status === 'PAID';
                  const isOverdue = t.status === 'OVERDUE';
                  
                  return (
                    <div 
                      key={t.id}
                      onClick={() => onToggleTask(t)}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none active:scale-[0.99] ${
                        isPaid 
                          ? 'bg-stone-50/60 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800 opacity-75' 
                          : isOverdue 
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900' 
                            : 'bg-stone-50/80 dark:bg-stone-800/80 border-stone-200/80 dark:border-stone-700/80 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* 1-Tap Interactive Checkbox */}
                        <div 
                          className="shrink-0 p-1"
                          title={isPaid ? 'แตะเพื่อเปลี่ยนเป็นค้างชำระ' : 'แตะเพื่อทำเครื่องหมายว่าชำระแล้ว'}
                        >
                          {isPaid ? (
                            <CheckSquare size={20} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square size={20} className="text-stone-400 dark:text-stone-500" />
                          )}
                        </div>

                        <LenderIcon lender={t.lender} size="md" />

                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${isPaid ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-900 dark:text-stone-100'}`}>
                            {t.loanTitle}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                            <span>{t.subTitle}</span>
                            <span>•</span>
                            <span className={isOverdue ? 'font-bold text-rose-600 dark:text-rose-400' : ''}>
                              ครบ {formatShortThaiDayMonth(t.dueDate)} ({t.dueTime} น.)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs font-extrabold font-num ${isPaid ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-stone-900 dark:text-stone-100'}`}>
                          ฿{formatCurrency(t.amount)}
                        </div>
                        <span className={`text-[10px] font-bold ${
                          isPaid ? 'text-emerald-600 dark:text-emerald-400' : isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {isPaid ? '✓ ชำระแล้ว' : isOverdue ? '⚠ เลยกำหนด' : 'รอชำระ'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROJECTION DRILLDOWN */}
        {drillDownModal?.type === 'PROJECTION' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
              <div>
                <span className="text-[10px] text-stone-400 block">ยอดต้องจ่ายเดือนนี้</span>
                <span className="text-xs font-bold font-num text-rose-600 dark:text-rose-400">
                  -฿{formatCurrency(drillDownModal.data.totalDue)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block">เงินคงเหลือสุทธิ</span>
                <span className="text-xs font-bold font-num text-stone-900 dark:text-stone-100">
                  ฿{formatCurrency(drillDownModal.data.endingFunds)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                รายการหนี้สินที่จะครบกำหนดในรอบเดือนนี้ ({drillDownModal.tasks.length} รายการ):
              </span>

              {drillDownModal.tasks.map(t => (
                <div 
                  key={t.id} 
                  className="p-3 rounded-xl bg-stone-50/80 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <LenderIcon lender={t.lender} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{t.loanTitle}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                        <span>{t.subTitle}</span>
                        <span>•</span>
                        <span>ทุกวันที่ {t.dueDayOfMonth}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-num text-stone-900 dark:text-stone-100 block">
                      ฿{formatCurrency(t.amount)}
                    </span>
                    <span className="text-[10px] text-stone-400">{t.dueTime} น.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORY DRILLDOWN */}
        {drillDownModal?.type === 'CATEGORY' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
              รายการสัญญากู้และซับย่อยในหมวด {drillDownModal.label}:
            </span>

            {drillDownModal.tasks.map(t => {
              const isPaid = t.status === 'PAID';
              return (
                <div 
                  key={t.id}
                  className={`p-3.5 rounded-2xl border transition-colors flex items-center justify-between ${
                    isPaid 
                      ? 'bg-stone-50/60 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800 opacity-75' 
                      : 'bg-stone-50/80 dark:bg-stone-800/80 border-stone-200/80 dark:border-stone-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <LenderIcon lender={t.lender} size="md" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{t.loanTitle}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {t.subTitle} • ครบวันที่ {formatShortThaiDayMonth(t.dueDate)} ({t.dueTime} น.)
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-num text-stone-900 dark:text-stone-100">
                      ฿{formatCurrency(t.amount)}
                    </div>
                    <span className={`text-[10px] font-bold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {isPaid ? '✓ ชำระแล้ว' : 'ค้างชำระ'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdaptiveDetailSheet>

      {/* ================= PDF REPORT MODAL ================= */}
      <PdfReportModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        tasks={tasks}
        summary={summary}
        loans={loans}
        selectedYearMonth={selectedYearMonth}
        rollingProjections={rollingProjections}
        categoryTotals={categoryTotals}
      />

    </div>
  );
};