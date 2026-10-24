import React, { useState } from 'react';
import { 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  LoanAccount,
  MonthlyPaymentRecord,
  PaymentStatus,
  PortfolioDebtSummary 
} from '../types/loan';
import { LenderIcon } from './LenderIcon';
import { AdaptiveDetailSheet } from './AdaptiveDetailSheet';
import { PdfReportModal } from './PdfReportModal';
import { snoozeTaskAlert, updateLoanSubItemAmount } from '../services/storageService';
import { 
  formatCurrency, 
  formatThaiDateLong, 
  getThaiMonthYear,
  formatShortThaiDayMonth,
  calculateRollingProjection,
  calculateCategoryDistribution
} from '../utils/cashflowCalculator';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  Layers, 
  Calendar, 
  ChevronRight, 
  Info, 
  Sparkles,
  CheckCheck,
  FileText,
  FileSpreadsheet,
  Building2,
  ShieldAlert,
  Percent,
  Receipt,
  Edit3,
  Check,
  X
} from 'lucide-react';

interface TodoListViewProps {
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  portfolioSummary?: PortfolioDebtSummary;
  loans: LoanAccount[];
  paymentRecords?: MonthlyPaymentRecord[];
  selectedYearMonth: string;
  titleOverride?: string;
  onToggleTask: (task: MonthlyInstallmentTask) => void;
  onAddNewLoan: () => void;
  onInspectAlert?: (task: MonthlyInstallmentTask) => void;
  onOpenExcelModal?: () => void;
}

export const TodoListView: React.FC<TodoListViewProps> = ({
  tasks,
  summary,
  portfolioSummary,
  loans,
  paymentRecords = [],
  selectedYearMonth,
  titleOverride,
  onToggleTask,
  onAddNewLoan,
  onInspectAlert,
  onOpenExcelModal,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OVERDUE' | 'UPCOMING' | 'PAID'>('ALL');
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'GROUPED'>('TIMELINE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<MonthlyInstallmentTask | null>(null);
  const [isEditingTaskAmount, setIsEditingTaskAmount] = useState(false);
  const [editedTaskAmount, setEditedTaskAmount] = useState('');
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [snoozeFeedback, setSnoozeFeedback] = useState<string | null>(null);

  // Compute projections & category totals for PDF export if opened
  const rollingProjections = calculateRollingProjection(
    loans,
    paymentRecords,
    summary.availableFunds,
    selectedYearMonth,
    6
  );

  const categoryTotals = calculateCategoryDistribution(tasks);

  // Filter tasks based on search & tab
  const filteredTasks = tasks.filter(task => {
    // Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = task.loanTitle.toLowerCase().includes(q) 
        || task.subTitle.toLowerCase().includes(q) 
        || task.lender.nameTh.toLowerCase().includes(q)
        || task.lender.badgeText.toLowerCase().includes(q);
      if (!matchName) return false;
    }

    // Tab filter
    if (activeFilter === 'OVERDUE') return task.status === 'OVERDUE';
    if (activeFilter === 'PAID') return task.status === 'PAID';
    if (activeFilter === 'UPCOMING') {
      return task.status === 'PENDING' && task.daysRemaining <= 7 && task.daysRemaining >= 0;
    }
    return true;
  });

  // Loan type badge text
  const getLoanTypeBadge = (loanType: string) => {
    switch (loanType) {
      case 'MULTI_DAY_SPLIT': return 'แบ่งจ่ายหลายรอบ';
      case 'INSTALLMENT_PLAN': return 'ผ่อนสินค้า/บิลย่อย';
      case 'EFFECTIVE_RATE': return 'ลดต้นลดดอก';
      case 'FLAT_RATE': return 'งวดคงที่';
      case 'REVOLVING_MIN': return 'จ่ายขั้นต่ำ';
      default: return 'สินเชื่อทั่วไป';
    }
  };

  // Group tasks by loan for GROUPED mode
  const groupedByLoan = loans.map(loan => {
    const loanTasks = filteredTasks.filter(t => t.loanId === loan.id);
    const totalDue = loanTasks.reduce((sum, t) => sum + t.amount, 0);
    const paidTasks = loanTasks.filter(t => t.status === 'PAID');
    const remainingDue = loanTasks.filter(t => t.status !== 'PAID').reduce((sum, t) => sum + t.amount, 0);

    return {
      loan,
      tasks: loanTasks,
      totalDue,
      remainingDue,
      isFullyPaid: loanTasks.length > 0 && paidTasks.length === loanTasks.length,
    };
  }).filter(group => group.tasks.length > 0);

  const handleSnoozeCurrentTask = (task: MonthlyInstallmentTask) => {
    snoozeTaskAlert(task.id, 60);
    setSnoozeFeedback(`เลื่อนการแจ้งเตือนงวด "${task.loanTitle} - ${task.subTitle}" ไปอีก 1 ชั่วโมงเรียบร้อยแล้ว`);
    setTimeout(() => setSnoozeFeedback(null), 3000);
  };

  return (
    <div className="space-y-5 pb-8 max-w-4xl mx-auto select-none">
      
      {/* 1. Header & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CheckCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                {titleOverride || 'To-Do List รายการชำระหนี้สิน'}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {titleOverride ? `แท็บกำหนดเอง • ${tasks.length} รายการ • ` : 'เช็กลิสต์ซับย่อยในเดือน '}
                {titleOverride ? getThaiMonthYear(selectedYearMonth) : `${getThaiMonthYear(selectedYearMonth)} • แตะเพื่อติ๊กจ่ายได้ทันที`}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Excel, PDF Report & View Mode Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
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

          <button
            onClick={() => setIsPdfOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 text-xs font-bold transition-all shadow-xs active:scale-95"
            title="เปิดพรีวิวและพิมพ์รายงานสรุป PDF"
          >
            <FileText size={15} />
            <span>รายงาน PDF</span>
          </button>

          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              onClick={() => setViewMode('TIMELINE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'TIMELINE' 
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              เรียงตามวันที่
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GROUPED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'GROUPED' 
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              จัดกลุ่มตามเจ้าหนี้
            </button>
          </div>
        </div>
      </div>

      {snoozeFeedback && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-2xl text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Clock size={16} className="text-amber-600 dark:text-amber-400" />
          <span>{snoozeFeedback}</span>
        </div>
      )}

      {/* 2. Compact Minimalist Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs text-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 block uppercase">ยอดรวมเดือนนี้</span>
          <span className="text-sm font-extrabold font-num text-stone-900 dark:text-stone-100">
            ฿{formatCurrency(summary.totalDue)}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs text-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 block uppercase">ชำระแล้ว ({summary.paidCount})</span>
          <span className="text-sm font-extrabold font-num text-emerald-600 dark:text-emerald-400">
            ฿{formatCurrency(summary.totalPaid)}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs text-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 block uppercase">ค้างชำระ ({summary.pendingCount})</span>
          <span className="text-sm font-extrabold font-num text-amber-600 dark:text-amber-400">
            ฿{formatCurrency(summary.totalRemaining)}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs text-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 block uppercase">หนี้คงเหลือรวม</span>
          <span className="text-sm font-extrabold font-num text-stone-900 dark:text-stone-100">
            ฿{formatCurrency(portfolioSummary ? portfolioSummary.totalRemainingAllLoans : summary.totalRemaining)}
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3 transition-colors">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามชื่อธนาคาร, แอปเงินกู้ หรือซับย่อย..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 dark:text-stone-100"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-600"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              activeFilter === 'ALL'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            ทั้งหมด ({tasks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('OVERDUE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
              activeFilter === 'OVERDUE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
            }`}
          >
            <span>เลยกำหนด ({summary.overdueCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('UPCOMING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              activeFilter === 'UPCOMING'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
            }`}
          >
            ต้องจ่ายใน 7 วัน
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('PAID')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              activeFilter === 'PAID'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
            }`}
          >
            ชำระแล้ว ({summary.paidCount})
          </button>
        </div>
      </div>

      {/* 3. Minimalist Task List View (TIMELINE or GROUPED) */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white/95 dark:bg-stone-900/90 p-12 rounded-3xl border border-stone-200 dark:border-stone-800 text-center space-y-3">
          <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">ยังไม่มีรายการต้องชำระในเดือนนี้</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
            เพิ่มสัญญาเงินกู้หรือเลือกเดือนอื่นเพื่อดูรายการ
          </p>
        </div>
      ) : viewMode === 'TIMELINE' ? (
        /* --- TIMELINE MODE: Minimalist Clean Stream --- */
        <div className="space-y-2">
          {filteredTasks.map(task => {
            const isPaid = task.status === 'PAID';
            const isOverdue = task.status === 'OVERDUE';

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTaskDetails(task)}
                className={`bg-white/95 dark:bg-stone-900/90 p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs hover:border-amber-400 hover:shadow-sm cursor-pointer border-stone-200/90 dark:border-stone-800 ${
                  isPaid ? 'opacity-60 bg-stone-50/50 dark:bg-stone-900/40' : ''
                }`}
                title="แตะเพื่อดูรายละเอียดเจาะลึกของงวดนี้"
              >
                {/* 1-Tap Checkbox + Icon + Clean Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTask(task);
                    }}
                    className="shrink-0 p-1 rounded-full text-stone-300 hover:text-emerald-500 active:scale-90 transition-transform"
                    title={isPaid ? 'กดเพื่อยกเลิกการชำระ' : 'กดเพื่อทำเครื่องหมายว่าชำระแล้ว'}
                  >
                    {isPaid ? (
                      <CheckCircle2 size={24} className="fill-emerald-500 text-white" />
                    ) : (
                      <Circle size={24} strokeWidth={2.2} className="text-stone-400 hover:text-emerald-500" />
                    )}
                  </button>

                  <LenderIcon lender={task.lender} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold text-stone-900 dark:text-stone-100 truncate ${isPaid ? 'line-through text-stone-400 dark:text-stone-500' : ''}`}>
                        {task.loanTitle}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {task.subTitle}
                      </span>
                      <span>•</span>
                      {isPaid ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          ✓ จ่ายแล้ว
                        </span>
                      ) : isOverdue ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1">
                          <AlertTriangle size={12} /> เลยกำหนด ({formatShortThaiDayMonth(task.dueDate)})
                        </span>
                      ) : task.daysRemaining === 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                          ครบกำหนดวันนี้ ({task.dueTime} น.)
                        </span>
                      ) : (
                        <span className="text-[11px]">
                          ครบ {formatShortThaiDayMonth(task.dueDate)} (อีก {task.daysRemaining} วัน)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount Due & Minimal Chevron */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div className={`text-sm sm:text-base font-extrabold font-mono-numbers ${
                    isPaid ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-900 dark:text-stone-100'
                  }`}>
                    ฿{formatCurrency(task.amount)}
                  </div>
                  <ChevronRight size={16} className="text-stone-300 dark:text-stone-600 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- GROUPED BY LENDER MODE: Minimal Clean Grouping --- */
        <div className="space-y-4">
          {groupedByLoan.map(group => (
            <div key={group.loan.id} className="bg-white/95 dark:bg-stone-900/90 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
              
              {/* Group Header */}
              <div className="p-3.5 sm:p-4 bg-stone-50/70 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <LenderIcon lender={group.tasks[0].lender} size="md" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">{group.loan.title}</h3>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      สัญญา: {group.loan.contractNumber || 'ไม่ระบุ'} • {group.tasks.length} ซับย่อย
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-stone-400 block">ยอดรวมทั้งเดือน</span>
                  <span className="text-sm font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                    ฿{formatCurrency(group.totalDue)}
                  </span>
                </div>
              </div>

              {/* Sub-items list within this loan */}
              <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {group.tasks.map(task => {
                  const isPaid = task.status === 'PAID';
                  const isOverdue = task.status === 'OVERDUE';

                  return (
                    <div 
                      key={task.id} 
                      onClick={() => setSelectedTaskDetails(task)}
                      className={`p-3 px-4 flex items-center justify-between transition-colors hover:bg-stone-50/60 dark:hover:bg-stone-800/40 cursor-pointer ${
                        isPaid ? 'opacity-60 bg-stone-50/40 dark:bg-stone-900/30' : ''
                      }`}
                      title="แตะเพื่อดูรายละเอียดเจาะลึกของงวดนี้"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTask(task);
                          }}
                          className="shrink-0 text-stone-400 hover:text-emerald-500 p-0.5"
                        >
                          {isPaid ? (
                            <CheckCircle2 size={20} className="fill-emerald-500 text-white" />
                          ) : (
                            <Circle size={20} strokeWidth={2.2} />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className={`text-xs font-bold text-stone-900 dark:text-stone-100 ${isPaid ? 'line-through text-stone-400 dark:text-stone-500' : ''}`}>
                            {task.subTitle}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                            <span>ครบวันที่ {formatShortThaiDayMonth(task.dueDate)}</span>
                            {isOverdue && !isPaid && (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">• เลยกำหนด!</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div className={`text-sm font-bold font-mono-numbers ${isPaid ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-900 dark:text-stone-100'}`}>
                          ฿{formatCurrency(task.amount)}
                        </div>
                        <ChevronRight size={14} className="text-stone-300 dark:text-stone-600" />
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ================= DEEP-DIVE DETAILS ADAPTIVE SHEET ================= */}
      <AdaptiveDetailSheet
        isOpen={selectedTaskDetails !== null}
        onClose={() => {
          setSelectedTaskDetails(null);
          setIsEditingTaskAmount(false);
        }}
        title={selectedTaskDetails?.loanTitle || ''}
        subtitle={selectedTaskDetails?.subTitle}
        icon={selectedTaskDetails && <LenderIcon lender={selectedTaskDetails.lender} size="md" />}
        badge={
          selectedTaskDetails && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              selectedTaskDetails.status === 'PAID'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                : selectedTaskDetails.status === 'OVERDUE'
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
            }`}>
              {selectedTaskDetails.status === 'PAID' ? '✓ ชำระแล้ว' : selectedTaskDetails.status === 'OVERDUE' ? '⚠️ เลยกำหนด' : 'รอชำระ'}
            </span>
          )
        }
        footerActions={
          selectedTaskDetails && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onToggleTask(selectedTaskDetails);
                  setSelectedTaskDetails(null);
                  setIsEditingTaskAmount(false);
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                  selectedTaskDetails.status === 'PAID'
                    ? 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {selectedTaskDetails.status === 'PAID' ? 'ยกเลิกการชำระ (Mark Unpaid)' : '✓ ทำเครื่องหมายว่าชำระแล้ว'}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSnoozeCurrentTask(selectedTaskDetails);
                  setSelectedTaskDetails(null);
                  setIsEditingTaskAmount(false);
                }}
                className="px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center gap-1.5"
                title="เตือนอีกครั้งใน 1 ชั่วโมง"
              >
                <Clock size={14} />
                <span>เตือนใน 1 ชม.</span>
              </button>
            </div>
          )
        }
      >
        {selectedTaskDetails && (
          <div className="space-y-4 text-xs">
            {/* Amount Banner with Inline Custom Amount Editor */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-200 dark:border-amber-800/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block">ยอดที่ต้องชำระของซับย่อยนี้</span>
                  {!isEditingTaskAmount && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-extrabold font-mono-numbers text-amber-600 dark:text-amber-400">
                        ฿{formatCurrency(selectedTaskDetails.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedTaskAmount(selectedTaskDetails.amount.toString());
                          setIsEditingTaskAmount(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 flex items-center gap-1"
                        title="แก้ไขยอดชำระของรายการนี้"
                      >
                        <Edit3 size={11} />
                        <span>แก้ไขยอด</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">วันและเวลาครบกำหนด</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200 font-mono-numbers">
                    {formatThaiDateLong(selectedTaskDetails.dueDate)} ({selectedTaskDetails.dueTime} น.)
                  </span>
                </div>
              </div>

              {isEditingTaskAmount && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-stone-400 font-bold">฿</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editedTaskAmount}
                      onChange={e => setEditedTaskAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-amber-400 text-sm font-bold font-mono-numbers text-stone-900 dark:text-stone-100 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextAmt = parseFloat(editedTaskAmount);
                      if (!isNaN(nextAmt) && nextAmt > 0) {
                        updateLoanSubItemAmount(
                          selectedTaskDetails.loanId,
                          selectedTaskDetails.subItemId,
                          nextAmt
                        );
                        setSelectedTaskDetails({
                          ...selectedTaskDetails,
                          amount: nextAmt,
                        });
                        setIsEditingTaskAmount(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <Check size={13} />
                    <span>บันทึก</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTaskAmount(false)}
                    className="p-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Contract & Loan Breakdown Details */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-2.5">
              <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-stone-700/60">
                <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Building2 size={13} className="text-amber-600" />
                  <span>ผู้ให้บริการ / ธนาคาร:</span>
                </span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {selectedTaskDetails.lender.nameTh} ({selectedTaskDetails.lender.badgeText})
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-stone-700/60">
                <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Receipt size={13} className="text-amber-600" />
                  <span>เลขที่สัญญา / บัญชีอ้างอิง:</span>
                </span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {selectedTaskDetails.contractNumber || 'ไม่ระบุ'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-stone-700/60">
                <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Layers size={13} className="text-amber-600" />
                  <span>ประเภทสินเชื่อ:</span>
                </span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {getLoanTypeBadge(selectedTaskDetails.loanType)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-stone-700/60">
                <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-600" />
                  <span>วงเงินกู้ตั้งต้น (Principal):</span>
                </span>
                <span className="font-bold font-mono-numbers text-stone-800 dark:text-stone-200">
                  ฿{formatCurrency(selectedTaskDetails.totalPrincipal)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-stone-700/60">
                <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Percent size={13} className="text-amber-600" />
                  <span>ยอดหนี้คงเหลือรวมของสัญญานี้:</span>
                </span>
                <span className="font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                  ฿{formatCurrency(selectedTaskDetails.remainingPrincipal)}
                </span>
              </div>

              {selectedTaskDetails.interestRateAnnual !== undefined && (
                <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-stone-700/60">
                  <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                    <Percent size={13} className="text-amber-600" />
                    <span>อัตราดอกเบี้ยต่อปี:</span>
                  </span>
                  <span className="font-semibold font-mono-numbers text-stone-800 dark:text-stone-200">
                    {selectedTaskDetails.interestRateAnnual}% ต่อปี
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1">
                <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Clock size={13} className="text-amber-600" />
                  <span>สถานะวันครบกำหนด:</span>
                </span>
                <span className="font-bold">
                  {selectedTaskDetails.status === 'PAID' ? (
                    <span className="text-emerald-600">ชำระแล้วเสร็จ</span>
                  ) : selectedTaskDetails.isOverdue ? (
                    <span className="text-rose-600">เลยกำหนดแล้ว {Math.abs(selectedTaskDetails.daysRemaining)} วัน</span>
                  ) : selectedTaskDetails.daysRemaining === 0 ? (
                    <span className="text-amber-600">ครบกำหนดวันนี้</span>
                  ) : (
                    <span className="text-stone-700 dark:text-stone-300">เหลืออีก {selectedTaskDetails.daysRemaining} วัน</span>
                  )}
                </span>
              </div>
            </div>
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
