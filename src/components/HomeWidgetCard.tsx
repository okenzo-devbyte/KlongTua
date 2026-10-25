import React, { useState } from 'react';
import { 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  WidgetSize, 
  WidgetTheme,
  PortfolioDebtSummary
} from '../types/loan';
import { LenderIcon } from './LenderIcon';
import { formatCurrency, getShortThaiMonthYear, formatShortThaiDayMonth } from '../utils/cashflowCalculator';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface HomeWidgetCardProps {
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  portfolioSummary?: PortfolioDebtSummary;
  size?: WidgetSize;
  theme?: WidgetTheme;
  showPaidItems?: boolean;
  onToggleTask: (task: MonthlyInstallmentTask) => void;
  onOpenApp?: () => void;
  className?: string;
  isStandaloneSimulation?: boolean;
}

export const HomeWidgetCard: React.FC<HomeWidgetCardProps> = ({
  tasks,
  summary,
  portfolioSummary,
  size = '4x2',
  theme = 'LIGHT',
  showPaidItems = true,
  onToggleTask,
  onOpenApp,
  className = '',
  isStandaloneSimulation = false,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

  // Filter tasks according to settings and user selection
  const displayedTasks = tasks.filter(t => {
    if (!showPaidItems && t.status === 'PAID') return false;
    if (filterMode === 'UNPAID') return t.status !== 'PAID';
    if (filterMode === 'PAID') return t.status === 'PAID';
    return true;
  });

  // Next urgent pending task for 2x2 widget
  const nextPendingTask = tasks.find(t => t.status !== 'PAID');

  // Theme styling rules
  const themeClasses = {
    LIGHT: 'bg-white text-slate-800 border-slate-200/90 shadow-lg shadow-slate-200/50',
    DARK: 'bg-slate-900 text-white border-slate-800 shadow-xl shadow-black/40',
    GLASS: 'bg-slate-900/80 backdrop-blur-xl text-white border-white/15 shadow-2xl shadow-indigo-950/30',
  }[theme];

  const subTextClass = theme === 'LIGHT' ? 'text-slate-500' : 'text-slate-400';
  const itemBorderClass = theme === 'LIGHT' ? 'border-slate-100 hover:bg-slate-50/80' : 'border-slate-800/80 hover:bg-slate-800/50';
  const headerBorderClass = theme === 'LIGHT' ? 'border-slate-100' : 'border-slate-800';

  // -------------------------------------------------------------
  // 1. SIZE: 2x2 (Compact Widget)
  // -------------------------------------------------------------
  if (size === '2x2') {
    return (
      <div 
        className={`rounded-3xl p-4 border transition-all select-none flex flex-col justify-between aspect-square w-full max-w-[200px] mx-auto ${themeClasses} ${className}`}
      >
        {/* Top: Header & Sufficiency Badge */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${subTextClass}`}>
                {getShortThaiMonthYear(summary.yearMonth)}
              </span>
            </div>
            {summary.isSufficient ? (
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                พอจ่าย
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 px-1.5 py-0.5 rounded-full">
                ขาด ฿{formatCurrency(summary.shortfallAmount)}
              </span>
            )}
          </div>

          <div className="text-[11px] font-medium leading-tight opacity-75">ยอดค้างชำระ</div>
          <div className="text-xl font-bold tracking-tight font-mono-numbers text-brand-600 dark:text-blue-400">
            ฿{formatCurrency(summary.totalRemaining)}
          </div>
        </div>

        {/* Middle/Bottom: Next Urgent Task with Quick Checkbox */}
        {nextPendingTask ? (
          <div className={`mt-2 p-2 rounded-xl border ${itemBorderClass} transition-colors`}>
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <LenderIcon lender={nextPendingTask.lender} size="sm" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold truncate leading-tight">
                    {nextPendingTask.loanTitle}
                  </div>
                  <div className={`text-[9px] truncate ${subTextClass}`}>
                    ครบ {formatShortThaiDayMonth(nextPendingTask.dueDate)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTask(nextPendingTask);
                }}
                className="shrink-0 p-1 text-slate-400 hover:text-emerald-500 transition-transform active:scale-90"
                title="กดเพื่อทำเครื่องหมายว่าชำระแล้ว"
              >
                <Circle size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="text-right text-[11px] font-bold font-mono-numbers text-slate-700 dark:text-slate-200 mt-1">
              ฿{formatCurrency(nextPendingTask.amount)}
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">ชำระครบแล้ว!</div>
          </div>
        )}

        <div className={`text-[9px] text-center pt-1 border-t ${headerBorderClass} ${subTextClass}`}>
          คล่องตัว Widget
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. SIZE: 4x2 (Standard Checklist Widget - Recommended)
  // -------------------------------------------------------------
  if (size === '4x2') {
    return (
      <div 
        className={`rounded-3xl p-4 border transition-all select-none flex flex-col justify-between w-full max-w-md mx-auto ${themeClasses} ${className}`}
      >
        {/* Widget Top Bar: App Title & Monthly Status Badge */}
        <div className={`pb-3 border-b ${headerBorderClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 ring-4 ring-blue-500/20" />
              <div>
                <span className="text-xs font-bold tracking-tight">คล่องตัว (KlongTua)</span>
                <span className={`text-[10px] ml-1.5 ${subTextClass}`}>
                  • {getShortThaiMonthYear(summary.yearMonth)}
                </span>
              </div>
            </div>

            {/* Sufficiency Indicator Pill */}
            {summary.isSufficient ? (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles size={11} />
                <span>เงินต้นพอจ่าย (เหลือ ฿{formatCurrency(summary.surplusAmount)})</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                <AlertTriangle size={11} />
                <span>ต้องหาเพิ่มอีก ฿{formatCurrency(summary.shortfallAmount)}</span>
              </div>
            )}
          </div>

          {/* Quick Metrics Line */}
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-[11px] font-medium ${subTextClass}`}>ยอดค้างเดือนนี้: </span>
                <span className="text-xl font-bold font-mono-numbers text-slate-900 dark:text-white">
                  ฿{formatCurrency(summary.totalRemaining)}
                </span>
                <span className={`text-[10px] ${subTextClass}`}>
                  (จ่ายแล้ว {summary.paidCount}/{summary.paidCount + summary.pendingCount + summary.overdueCount} งวด)
                </span>
              </div>
              {portfolioSummary && (
                <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                  หนี้คงเหลือรวม: <span className="font-bold font-mono-numbers text-stone-700 dark:text-stone-300">฿{formatCurrency(portfolioSummary.totalRemainingAllLoans)}</span>
                </div>
              )}
            </div>

            {/* Monthly Progress Bar */}
            <div className="w-24 flex flex-col items-end">
              <div className="text-[10px] font-semibold text-brand-600 dark:text-blue-400">
                {summary.completionRate}%
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sub-items Interactive Checklist List (Scrollable if many) */}
        <div className="my-2 space-y-1.5 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
          {displayedTasks.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-1" />
              ไม่มีรายการที่ต้องชำระในตัวกรองนี้
            </div>
          ) : (
            displayedTasks.map(task => {
              const isPaid = task.status === 'PAID';
              const isOverdue = task.status === 'OVERDUE';

              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all ${itemBorderClass} ${
                    isPaid ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/30' : 'bg-transparent'
                  }`}
                >
                  {/* Left: Interactive Checkbox + Lender Icon + Titles */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task)}
                      className={`shrink-0 transition-transform active:scale-90 p-0.5 rounded-full focus:outline-none ${
                        isPaid ? 'text-emerald-500 hover:text-slate-400' : 'text-slate-400 hover:text-emerald-500'
                      }`}
                      title={isPaid ? 'กดเพื่อยกเลิกการชำระ' : 'กดเพื่อทำเครื่องหมายว่าชำระแล้ว'}
                    >
                      {isPaid ? (
                        <CheckCircle2 size={20} className="fill-emerald-500 text-white" />
                      ) : (
                        <Circle size={20} strokeWidth={2.2} />
                      )}
                    </button>

                    <LenderIcon lender={task.lender} size="sm" />

                    <div className="min-w-0">
                      <div className={`text-xs font-semibold truncate leading-snug ${isPaid ? 'line-through text-slate-400' : ''}`}>
                        {task.loanTitle}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className={`font-medium truncate ${subTextClass}`}>
                          {task.subTitle}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className={`font-semibold shrink-0 ${
                          isOverdue 
                            ? 'text-rose-500 font-bold' 
                            : isPaid 
                            ? 'text-emerald-500' 
                            : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {isPaid ? 'ชำระแล้ว' : isOverdue ? 'เลยกำหนด!' : `ครบ ${formatShortThaiDayMonth(task.dueDate)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount in Tabular Numerals */}
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-bold font-mono-numbers ${isPaid ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      ฿{formatCurrency(task.amount)}
                    </div>
                    <div className={`text-[9px] ${subTextClass}`}>
                      {task.dueTime} น.
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Quick Hint */}
        <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${headerBorderClass} ${subTextClass}`}>
          <span>แตะที่ปุ่มวงกลมเพื่อติ๊กจ่ายได้ทันทีจากหน้าจอ</span>
          {onOpenApp && (
            <button 
              onClick={onOpenApp}
              className="text-brand-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              เปิดแอป <ArrowRight size={10} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. SIZE: 4x4 (Executive Full Command Widget)
  // -------------------------------------------------------------
  return (
    <div 
      className={`rounded-3xl p-5 border transition-all select-none flex flex-col justify-between w-full max-w-md mx-auto aspect-square ${themeClasses} ${className}`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-500/20" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">คล่องตัว (KlongTua)</h3>
              <p className={`text-[10px] ${subTextClass}`}>{getShortThaiMonthYear(summary.yearMonth)} • สรุปสถานะการเงิน</p>
            </div>
          </div>

          {/* Sufficiency Status */}
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            summary.isSufficient 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse'
          }`}>
            {summary.isSufficient ? '✓ เงินต้นพอจ่าย' : `⚠ ต้องหาเพิ่ม ฿${formatCurrency(summary.shortfallAmount)}`}
          </div>
        </div>

        {/* High-level financial cards */}
        <div className={`grid ${portfolioSummary ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-3`}>
          <div className={`p-2.5 rounded-2xl border ${itemBorderClass}`}>
            <span className={`text-[10px] font-medium ${subTextClass}`}>ยอดค้างเดือนนี้</span>
            <div className="text-sm sm:text-base font-bold font-mono-numbers text-slate-900 dark:text-white">
              ฿{formatCurrency(summary.totalRemaining)}
            </div>
          </div>
          {portfolioSummary && (
            <div className={`p-2.5 rounded-2xl border ${itemBorderClass}`}>
              <span className={`text-[10px] font-medium ${subTextClass}`}>หนี้คงเหลือรวม</span>
              <div className="text-sm sm:text-base font-bold font-mono-numbers text-stone-700 dark:text-stone-300">
                ฿{formatCurrency(portfolioSummary.totalRemainingAllLoans)}
              </div>
            </div>
          )}
          <div className={`p-2.5 rounded-2xl border ${itemBorderClass}`}>
            <span className={`text-[10px] font-medium ${subTextClass}`}>เงินต้นสำรอง</span>
            <div className="text-sm sm:text-base font-bold font-mono-numbers text-emerald-600 dark:text-emerald-400">
              ฿{formatCurrency(summary.availableFunds)}
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 mt-3 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`flex-1 py-1 rounded-lg transition-colors ${filterMode === 'ALL' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold' : subTextClass}`}
          >
            ทั้งหมด ({tasks.length})
          </button>
          <button
            onClick={() => setFilterMode('UNPAID')}
            className={`flex-1 py-1 rounded-lg transition-colors ${filterMode === 'UNPAID' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold text-amber-600' : subTextClass}`}
          >
            ค้างชำระ ({summary.pendingCount + summary.overdueCount})
          </button>
          <button
            onClick={() => setFilterMode('PAID')}
            className={`flex-1 py-1 rounded-lg transition-colors ${filterMode === 'PAID' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold text-emerald-600' : subTextClass}`}
          >
            จ่ายแล้ว ({summary.paidCount})
          </button>
        </div>
      </div>

      {/* Sub-item Tasks List */}
      <div className="flex-1 my-3 space-y-1.5 overflow-y-auto pr-0.5 scrollbar-thin">
        {displayedTasks.map(task => {
          const isPaid = task.status === 'PAID';
          return (
            <div
              key={task.id}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all ${itemBorderClass} ${
                isPaid ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <button
                  type="button"
                  onClick={() => onToggleTask(task)}
                  className="shrink-0 p-0.5 text-slate-400 hover:text-emerald-500"
                >
                  {isPaid ? (
                    <CheckCircle2 size={18} className="fill-emerald-500 text-white" />
                  ) : (
                    <Circle size={18} strokeWidth={2.2} />
                  )}
                </button>
                <LenderIcon lender={task.lender} size="sm" />
                <div className="min-w-0">
                  <div className={`text-xs font-semibold truncate ${isPaid ? 'line-through' : ''}`}>
                    {task.loanTitle}
                  </div>
                  <div className={`text-[10px] truncate ${subTextClass}`}>
                    {task.subTitle} • ครบ {formatShortThaiDayMonth(task.dueDate)}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 font-mono-numbers">
                <div className={`text-xs font-bold ${isPaid ? 'line-through' : ''}`}>
                  ฿{formatCurrency(task.amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${headerBorderClass} ${subTextClass}`}>
        <span>ความคืบหน้า {summary.completionRate}%</span>
        {onOpenApp && (
          <button onClick={onOpenApp} className="text-brand-600 dark:text-blue-400 font-semibold hover:underline">
            เปิดแอปพลิเคชัน
          </button>
        )}
      </div>
    </div>
  );
};
