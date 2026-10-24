import React, { useState } from 'react';
import { 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  LoanAccount, 
  WidgetConfig, 
  RollingProjectionMonth,
  MonthlyPaymentRecord,
  ThaiVoiceConfig,
  DashboardDrillDownModal
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
  calculateCategoryDistribution
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
  ArrowRight
} from 'lucide-react';
import { addMonths, subMonths, format, parseISO } from 'date-fns';

interface DashboardViewProps {
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
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

  // Mascot trigger timestamps for whole-card tapping
  const [triggerWaving, setTriggerWaving] = useState(0);
  const [triggerPlanning, setTriggerPlanning] = useState(0);
  const [triggerSuccess, setTriggerSuccess] = useState(0);
  const [triggerCheckingRem, setTriggerCheckingRem] = useState(0);
  const [triggerAlert, setTriggerAlert] = useState(0);

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

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      
      {/* 1. Month Selector & Title Bar - Pure Light & Midnight Obsidian Dark */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-4 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm transition-colors duration-300">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 text-xs font-bold transition-all shadow-xs active:scale-95"
              title="นำเข้าและส่งออกข้อมูล Excel (.xlsx / .csv)"
            >
              <FileSpreadsheet size={15} />
              <span>Excel</span>
            </button>
          )}

          {/* PDF Report Export Button */}
          {loans.length > 0 && (
            <button
              onClick={() => setIsPdfOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 text-xs font-bold transition-all shadow-xs active:scale-95"
              title="เปิดพรีวิวและพิมพ์รายงานสรุป PDF"
            >
              <FileText size={15} />
              <span>รายงาน PDF</span>
            </button>
          )}

          {/* Month Stepper Buttons */}
          <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl border border-stone-200 dark:border-stone-700">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 px-2 min-w-[90px] text-center font-num">
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>Pinned Android Quick Widget (แตะติ๊กชำระได้ทันที)</span>
            </span>
            <button 
              onClick={() => onNavigateToTab('widget')}
              className="text-[11px] text-brand-600 hover:underline font-semibold"
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
        <div className="bg-white/95 dark:bg-stone-900/90 border border-amber-300/80 dark:border-stone-800 p-6 rounded-3xl shadow-sm text-center space-y-4">
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
              className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md active:scale-95 transition-transform"
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
                <span>โหลดข้อมูลตัวอย่าง (4 สัญญา)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {loans.length > 0 && (
        <>
      {/* 3. Available Capital & Sufficiency Verdict (หัวใจหลักตามที่ผู้ใช้ร้องขอ) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Available Funds Card (5 cols) - Pure Light & Dark - Whole Card Tap-to-Speak */}
        <div 
          onClick={() => !isEditingFunds && setTriggerWaving(Date.now())}
          className="md:col-span-5 bg-white/95 dark:bg-stone-900/90 border border-amber-300/80 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-visible cursor-pointer hover:border-amber-400 active:scale-[0.99] transition-all group"
          title="แตะที่การ์ดเพื่อฟังเสียงน้องต้นหอมทักทาย"
        >
          <div>
            <div className="flex items-center justify-between text-stone-600 dark:text-stone-400 mb-1">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Wallet size={16} className="text-amber-600 dark:text-amber-400" />
                <span>เงินต้น / เงินสดที่มีอยู่ ณ ตอนนี้</span>
              </span>
              <div className="flex items-center gap-2">
                <ThaiMascot 
                  type="WAVING" 
                  size={52} 
                  voiceConfig={voiceConfig} 
                  lowSpecMode={lowSpecMode} 
                  triggerTimestamp={triggerWaving} 
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingFunds(!isEditingFunds);
                    setInputFunds(summary.availableFunds.toString());
                  }}
                  className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
                  title="แก้ไขยอดเงินสดที่มีอยู่"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            </div>

            {/* Editable or Display Mode */}
            {isEditingFunds ? (
              <form 
                onSubmit={handleSaveFunds} 
                onClick={(e) => e.stopPropagation()} 
                className="mt-2 space-y-2"
              >
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold">฿</span>
                  <input
                    type="number"
                    value={inputFunds}
                    onChange={(e) => setInputFunds(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono-numbers text-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                  >
                    บันทึกยอดเงิน
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingFunds(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-300 text-xs"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            ) : (
              <div className="my-2">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono-numbers text-stone-900 dark:text-stone-100">
                  ฿{formatCurrency(summary.availableFunds)}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-1">
                  <span>🔊 แตะที่การ์ดเพื่อฟังเสียงน้องต้นหอมทักทาย</span>
                </p>
              </div>
            )}
          </div>

          {/* Quick Adjustment Pills */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 mt-3">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium block mb-1.5">เติมเงินเข้าสภาพคล่องด่วน:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addQuickFunds(1000);
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] font-bold text-stone-800 dark:text-stone-200 transition-colors border border-stone-200 dark:border-stone-700"
              >
                +1,000
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addQuickFunds(5000);
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] font-bold text-stone-800 dark:text-stone-200 transition-colors border border-stone-200 dark:border-stone-700"
              >
                +5,000
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addQuickFunds(10000);
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] font-bold text-stone-800 dark:text-stone-200 transition-colors border border-stone-200 dark:border-stone-700"
              >
                +10,000
              </button>
            </div>
          </div>
        </div>

        {/* Sufficiency Verdict Card (7 cols) */}
        <div className={`md:col-span-7 p-6 rounded-3xl border flex flex-col justify-between transition-all ${
          summary.isSufficient
            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
            : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {summary.isSufficient ? (
                  <div className="p-2 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                    <CheckCircle2 size={24} />
                  </div>
                ) : (
                  <div className="p-2 rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-500/20 animate-pulse">
                    <AlertTriangle size={24} />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    {summary.isSufficient ? 'สภาพคล่องเพียงพอสำหรับเดือนนี้' : 'สภาพคล่องไม่เพียงพอ!'}
                  </h3>
                  <span className="text-xs font-medium opacity-80">
                    {summary.isSufficient ? 'เงินต้นที่คุณมีครอบคลุมยอดค้างชำระทั้งหมด' : 'จำเป็นต้องจัดหาเงินเพิ่มเติมเพื่อชำระหนี้ให้ทันกำหนด'}
                  </span>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                summary.isSufficient ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
              }`}>
                {summary.isSufficient ? 'SUFFICIENT' : 'DEFICIT'}
              </span>
            </div>

            {/* The Critical Shortfall / Surplus Number */}
            <div className="my-4 p-4 rounded-2xl bg-white/90 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400 block">
                  {summary.isSufficient ? 'ยอดเงินสดคงเหลือสุทธิหลังชำระครบ:' : 'ยอดเงินที่ต้องหาเพิ่มอีก (Shortfall):'}
                </span>
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono-numbers mt-0.5 ${
                  summary.isSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {summary.isSufficient 
                    ? `+฿${formatCurrency(summary.surplusAmount)}` 
                    : `-฿${formatCurrency(summary.shortfallAmount)}`}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-stone-400 block">ยอดค้างชำระเดือนนี้</span>
                <span className="text-sm font-bold font-mono-numbers text-stone-800 dark:text-stone-200">
                  ฿{formatCurrency(summary.totalRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Action advice */}
          <div className="text-xs font-medium opacity-90 flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-stone-800">
            <span>
              {summary.isSufficient 
                ? '💡 คุณสามารถชำระงวดใน To-Do List ได้อย่างสบายใจ' 
                : '🚨 แนะนำให้ทยอยชำระตามลำดับวันที่ครบกำหนดใน To-Do List'}
            </span>
            <button
              onClick={() => onNavigateToTab('todos')}
              className="font-bold underline text-amber-700 dark:text-amber-400 hover:text-amber-900"
            >
              ดูรายการที่ต้องจ่าย
            </button>
          </div>
        </div>

      </div>

      {/* 4. Monthly 4 Summary Metric Cards with Mascot Avatars - All Tap-to-Speak */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Due Card - PLANNING (น้องต้นหอมคำนวณงบประมาณ) */}
        <div 
          onClick={() => setTriggerPlanning(Date.now())}
          className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-start justify-between cursor-pointer hover:border-amber-400 active:scale-[0.99] transition-all group"
          title="แตะเพื่อฟังเสียงน้องต้นหอมสรุปงบประมาณยอดชำระรวม"
        >
          <div>
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 block">ยอดชำระรวมเดือนนี้</span>
            <div className="text-xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100 mt-1">
              ฿{formatCurrency(summary.totalDue)}
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block flex items-center gap-1">
              <span>🔊 รวม {tasks.length} รายการ (แตะฟัง)</span>
            </span>
          </div>
          <ThaiMascot 
            type="PLANNING" 
            size={46} 
            voiceConfig={voiceConfig} 
            lowSpecMode={lowSpecMode} 
            triggerTimestamp={triggerPlanning} 
          />
        </div>

        {/* Total Paid Card */}
        <div 
          onClick={() => setTriggerSuccess(Date.now())}
          className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-start justify-between cursor-pointer hover:border-emerald-400 active:scale-[0.99] transition-all group"
          title="แตะเพื่อฟังน้องต้นหอมชมเชยและฉลอง"
        >
          <div className="flex-1 mr-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">ชำระแล้ว</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                {summary.paidCount} งวด
              </span>
            </div>
            <div className="text-xl font-bold font-mono-numbers text-emerald-600 dark:text-emerald-400 mt-1">
              ฿{formatCurrency(summary.totalPaid)}
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${summary.completionRate}%` }} />
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">
              🔊 แตะฟังเสียงฉลอง
            </span>
          </div>
          <ThaiMascot 
            type="SUCCESS" 
            size={46} 
            voiceConfig={voiceConfig} 
            lowSpecMode={lowSpecMode} 
            triggerTimestamp={triggerSuccess} 
          />
        </div>

        {/* Total Remaining Card */}
        <div 
          onClick={() => setTriggerCheckingRem(Date.now())}
          className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-start justify-between cursor-pointer hover:border-amber-400 active:scale-[0.99] transition-all group"
          title="แตะเพื่อฟังเสียงน้องต้นหอมเตือนยอดค้าง"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">ค้างชำระคงเหลือ</span>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                {summary.pendingCount} งวด
              </span>
            </div>
            <div className="text-xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100 mt-1">
              ฿{formatCurrency(summary.totalRemaining)}
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">
              🔊 ครบกำหนดเดือนนี้ (แตะฟัง)
            </span>
          </div>
          <ThaiMascot 
            type="CHECKING" 
            size={46} 
            voiceConfig={voiceConfig} 
            lowSpecMode={lowSpecMode} 
            triggerTimestamp={triggerCheckingRem} 
          />
        </div>

        {/* Overdue Items Card */}
        <div 
          onClick={() => setTriggerAlert(Date.now())}
          className={`p-4 rounded-2xl border shadow-sm flex items-start justify-between cursor-pointer hover:border-rose-400 active:scale-[0.99] transition-all group ${
            summary.overdueCount > 0 
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100' 
              : 'bg-white/95 dark:bg-stone-900/90 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100'
          }`}
          title="แตะเพื่อฟังเสียงน้องต้นหอมแจ้งเตือนด่วน"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">เลยกำหนด (Overdue)</span>
              {summary.overdueCount > 0 && (
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900 px-1.5 py-0.5 rounded animate-pulse">
                  ด่วน
                </span>
              )}
            </div>
            <div className={`text-xl font-bold font-mono-numbers mt-1 ${summary.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-stone-900 dark:text-stone-100'}`}>
              {summary.overdueCount} งวด
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">
              {summary.overdueCount > 0 ? '🔊 แตะการ์ดเพื่อฟังเตือนด่วน' : 'ไม่มีรายการเลยกำหนด'}
            </span>
          </div>
          <ThaiMascot 
            type="ALERT" 
            size={46} 
            voiceConfig={voiceConfig} 
            lowSpecMode={lowSpecMode} 
            triggerTimestamp={triggerAlert} 
          />
        </div>

      </div>

      {/* 5. Rolling 6-Month Cashflow Projection Table (จำลองสภาพคล่องล่วงหน้า) */}
      <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 transition-colors duration-300">
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
                    tasks: mTasks,
                  });
                }}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-98 hover:shadow-md ${
                  idx === 0 
                    ? 'ring-2 ring-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/80' 
                    : proj.isSufficient 
                    ? 'bg-stone-50/80 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700/60' 
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/70'
                }`}
                title="แตะเพื่อดูรายละเอียดเจาะลึกของเดือนนี้"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold pb-1.5 border-b border-stone-200/60 dark:border-stone-700/60 mb-2">
                    <span className="text-stone-900 dark:text-stone-100 font-bold">{proj.monthLabelTh}</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                        ปัจจุบัน
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[9px] text-stone-400 dark:text-stone-500 block">ยอดต้องชำระ</span>
                      <span className="text-xs font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                        ฿{formatCurrency(proj.totalDue)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-stone-400 dark:text-stone-500 block">เงินต้นคงเหลือ</span>
                      <span className="text-xs font-bold font-mono-numbers text-stone-600 dark:text-stone-400">
                        ฿{formatCurrency(proj.endingFunds)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between">
                  {proj.isSufficient ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check size={12} /> พอจ่าย
                    </span>
                  ) : (
                    <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      <div>ขาดอีก:</div>
                      <div className="font-mono-numbers">฿{formatCurrency(proj.shortfall)}</div>
                    </div>
                  )}
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">ดูเพิ่ม →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Lender & Category Distribution Breakdown */}
      <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 transition-colors duration-300">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <PieChart size={16} className="text-amber-600 dark:text-amber-400" />
              <span>สัดส่วนภาระหนี้สินแยกตามประเภท (Debt Category Distribution)</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              วิเคราะห์การกระจายตัวของหนี้สิน แตะแต่ละหมวดหมู่เพื่อดูสัญญาย่อยที่เกี่ยวข้อง
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

        {/* Mini Summary Pill when Collapsed */}
        {isCategoryCollapsed ? (
          <div 
            onClick={toggleCategory}
            className="p-3.5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <span>🥧 ภาระหนี้สินกระจาย {Object.values(categoryTotals).filter(c => c.amount > 0).length} หมวดหมู่ • ยอดรวมทั้งเดือน ฿{formatCurrency(summary.totalDue)}</span>
            </div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline">
              แตะเพื่อขยายสัดส่วน ▾
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stacked Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {Object.entries(categoryTotals).map(([key, cat]) => {
                if (cat.amount === 0 || summary.totalDue === 0) return null;
                const pct = (cat.amount / summary.totalDue) * 100;
                return (
                  <div
                    key={key}
                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    className="h-full transition-all duration-300"
                    title={`${cat.label}: ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(categoryTotals).map(([key, cat]) => {
                if (cat.amount === 0) return null;
                const pct = summary.totalDue > 0 ? Math.round((cat.amount / summary.totalDue) * 100) : 0;
                const catTasks = tasks.filter(t => (t.lender.category || 'OTHER') === key);

                return (
                  <div 
                    key={key} 
                    onClick={() => {
                      setDrillDownModal({
                        type: 'CATEGORY',
                        categoryKey: key,
                        label: cat.label,
                        tasks: catTasks,
                        totalAmount: cat.amount,
                      });
                    }}
                    className="p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 bg-stone-50/80 dark:bg-stone-800/60 hover:bg-stone-100/80 dark:hover:bg-stone-800 flex items-center justify-between transition-all cursor-pointer hover:border-amber-400 hover:shadow-xs active:scale-98"
                    title="แตะเพื่อดูรายละเอียดสัญญาในหมวดนี้"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        {key === 'BANK' && <Building2 size={16} />}
                        {key === 'DIGITAL_LOAN' && '📱'}
                        {key === 'CREDIT_CARD' && <CreditCard size={16} />}
                        {key === 'AUTO_TITLE' && '🚗'}
                        {key === 'OTHER' && '👤'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{cat.label}</div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">{cat.count} งวด • {pct}%</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                        ฿{formatCurrency(cat.amount)}
                      </div>
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">ดูรายการ →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* ================= DRILL-DOWN MODAL SHEET ================= */}
      <AdaptiveDetailSheet
        isOpen={drillDownModal !== null}
        onClose={() => setDrillDownModal(null)}
        title={
          drillDownModal?.type === 'PROJECTION'
            ? `เจาะลึกการจำลองสภาพคล่อง: ${drillDownModal.data.monthLabelTh}`
            : `รายละเอียดหนี้สินหมวดหมู่: ${drillDownModal?.label || ''}`
        }
        subtitle={
          drillDownModal?.type === 'PROJECTION'
            ? `สรุปเงินต้นยกมา ภาระหนี้สิน และสถานะสภาพคล่องคงเหลือ`
            : `รายการสัญญาเงินกู้และซับย่อยในหมวดนี้ทั้งหมด (${drillDownModal?.tasks.length || 0} รายการ)`
        }
        icon={
          drillDownModal?.type === 'PROJECTION' ? (
            <TrendingUp size={20} className="text-amber-600 dark:text-amber-400" />
          ) : (
            <PieChart size={20} className="text-amber-600 dark:text-amber-400" />
          )
        }
        badge={
          drillDownModal?.type === 'PROJECTION' ? (
            drillDownModal.data.isSufficient ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                ✓ สภาพคล่องพอจ่าย
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                ⚠️ ขาดอีก ฿{formatCurrency(drillDownModal.data.shortfall)}
              </span>
            )
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              ยอดรวม ฿{formatCurrency(drillDownModal?.totalAmount || 0)}
            </span>
          )
        }
      >
        {drillDownModal?.type === 'PROJECTION' && (
          <div className="space-y-4">
            {/* Calculation summary bar */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-center">
              <div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 block">เงินต้นยกมา</span>
                <span className="text-xs font-bold font-mono-numbers text-stone-700 dark:text-stone-300">
                  ฿{formatCurrency(drillDownModal.data.startingFunds)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 block">ยอดต้องจ่ายเดือนนี้</span>
                <span className="text-xs font-bold font-mono-numbers text-rose-600 dark:text-rose-400">
                  -฿{formatCurrency(drillDownModal.data.totalDue)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 block">เงินคงเหลือสุทธิ</span>
                <span className="text-xs font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                  ฿{formatCurrency(drillDownModal.data.endingFunds)}
                </span>
              </div>
            </div>

            {/* List of loans due in that month */}
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
                    <span className="text-xs font-bold font-mono-numbers text-stone-900 dark:text-stone-100 block">
                      ฿{formatCurrency(t.amount)}
                    </span>
                    <span className="text-[10px] text-stone-400">{t.dueTime} น.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    <div className="text-xs font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
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
