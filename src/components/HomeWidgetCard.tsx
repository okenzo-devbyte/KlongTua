import React, { useState } from 'react';
import { 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  WidgetSize, 
  WidgetTheme,
  WidgetConfig,
  PortfolioDebtSummary
} from '../types/loan';
import { DEFAULT_WIDGET_CONFIG } from '../data/lenders';
import { LenderIcon } from './LenderIcon';
import { formatCurrency, getShortThaiMonthYear, formatShortThaiDayMonth } from '../utils/cashflowCalculator';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface HomeWidgetCardProps {
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  portfolioSummary?: PortfolioDebtSummary;
  size?: WidgetSize;
  theme?: WidgetTheme;
  showPaidItems?: boolean;
  widgetConfig?: WidgetConfig;
  onToggleTask: (task: MonthlyInstallmentTask) => void;
  onOpenApp?: () => void;
  className?: string;
  isStandaloneSimulation?: boolean;
}

function hexToRgba(hex: string, opacityPercent: number): string {
  const safeHex = (hex || '#000000').trim().replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;
  if (safeHex.length === 3) {
    r = parseInt(safeHex[0] + safeHex[0], 16);
    g = parseInt(safeHex[1] + safeHex[1], 16);
    b = parseInt(safeHex[2] + safeHex[2], 16);
  } else if (safeHex.length >= 6) {
    r = parseInt(safeHex.slice(0, 2), 16);
    g = parseInt(safeHex.slice(2, 4), 16);
    b = parseInt(safeHex.slice(4, 6), 16);
  }
  const alpha = Math.min(1, Math.max(0, (Number.isFinite(opacityPercent) ? opacityPercent : 92) / 100));
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return `rgba(0, 0, 0, ${alpha.toFixed(2)})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

export const HomeWidgetCard: React.FC<HomeWidgetCardProps> = ({
  tasks,
  summary,
  portfolioSummary,
  size,
  theme,
  showPaidItems,
  widgetConfig,
  onToggleTask,
  onOpenApp,
  className = '',
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [showUnpaidOnlyNote, setShowUnpaidOnlyNote] = useState<boolean>(false);

  const effectiveConfig: WidgetConfig = {
    ...DEFAULT_WIDGET_CONFIG,
    ...(widgetConfig || {}),
    ...(size ? { size } : {}),
    ...(theme ? { theme } : {}),
    ...(showPaidItems !== undefined ? { showPaidItems } : {}),
  };

  const effectiveSize = effectiveConfig.size || '4x2';
  const effectiveTheme = effectiveConfig.theme || 'DARK';
  const effectiveStyle = effectiveConfig.style || 'NOTE_LIST';
  const effectiveShowPaid = effectiveConfig.showPaidItems;

  // -------------------------------------------------------------
  // STYLE A: NOTE_LIST (NotePlus-inspired Flexible Scrollable Checklist)
  // -------------------------------------------------------------
  if (effectiveStyle === 'NOTE_LIST') {
    const paidDisplay = effectiveConfig.paidDisplay || (effectiveShowPaid ? 'STRIKETHROUGH_KEEP' : 'HIDE');
    const markerStyle = effectiveConfig.markerStyle || 'BULLET';
    const fontSizeClass =
      effectiveConfig.fontSize === 'SM'
        ? 'text-[11px]'
        : effectiveConfig.fontSize === 'LG'
        ? 'text-[15px]'
        : 'text-[13px]';

    const headerColor = effectiveConfig.headerColor || '#7F1D1D';
    const bgRgba = hexToRgba(
      effectiveConfig.backgroundColor || '#000000',
      effectiveConfig.backgroundOpacity ?? 92
    );
    const bodyTextColor = effectiveConfig.textColor || '#FFFFFF';
    const customTitle = effectiveConfig.customTitle?.trim() || 'รายจ่ายแต่ละเดือน';

    let noteTasks = tasks.filter(t => {
      if (showUnpaidOnlyNote && t.status === 'PAID') return false;
      if (paidDisplay === 'HIDE' && t.status === 'PAID') return false;
      return true;
    });

    if (paidDisplay === 'STRIKETHROUGH_BOTTOM') {
      noteTasks = [
        ...noteTasks.filter(t => t.status !== 'PAID'),
        ...noteTasks.filter(t => t.status === 'PAID'),
      ];
    }

    const maxWidthClass =
      effectiveSize === '2x2' ? 'max-w-[230px]' : 'max-w-md';

    return (
      <div
        className={`rounded-2xl overflow-hidden border border-white/15 shadow-2xl select-none w-full mx-auto transition-all ${maxWidthClass} ${className}`}
        style={{ backgroundColor: bgRgba, color: bodyTextColor }}
      >
        {/* Colored Header Bar */}
        <div
          className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-white"
          style={{ backgroundColor: headerColor }}
        >
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-tight truncate">
              {customTitle}
            </span>
            {effectiveConfig.showHeaderSummary && (
              <span className="text-[11px] font-bold font-mono-numbers px-2 py-0.5 rounded-full bg-black/25 text-white/95 shrink-0">
                ฿{formatCurrency(summary.totalRemaining)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowUnpaidOnlyNote(prev => !prev)}
            title={showUnpaidOnlyNote ? 'แสดงทุกรายการ' : 'ซ่อนรายการที่จ่ายแล้ว'}
            className="shrink-0 w-7 h-7 rounded-lg hover:bg-white/15 active:scale-90 flex items-center justify-center text-white/90 transition-all"
          >
            {showUnpaidOnlyNote ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Scrollable Note Checklist Body */}
        <div className="px-3 py-2.5 max-h-[340px] overflow-y-auto space-y-1">
          {tasks.length === 0 ? (
            <div className="py-6 text-center space-y-1 opacity-80">
              <div className="text-xs font-bold">ยังไม่มีสัญญา</div>
              <div className="text-[11px] opacity-75">แตะเพื่อเพิ่มรายการชำระ</div>
            </div>
          ) : noteTasks.length === 0 ? (
            <div className="py-6 text-center space-y-1">
              <CheckCircle2 size={22} className="mx-auto text-emerald-400" />
              <div className="text-xs font-bold text-emerald-400">ชำระครบแล้ว! 🎉</div>
            </div>
          ) : (
            noteTasks.map(task => {
              const isPaid = task.status === 'PAID';
              const isOverdue = task.status === 'OVERDUE';
              const marker =
                markerStyle === 'CHECKBOX' ? (isPaid ? '☑' : '☐') : '•';

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onToggleTask(task)}
                  className={`w-full text-left py-1 px-1.5 rounded-lg hover:bg-white/10 active:scale-[0.99] transition-all flex items-start gap-1.5 leading-snug ${fontSizeClass} ${
                    isPaid ? 'line-through opacity-55' : ''
                  }`}
                >
                  <span className="shrink-0 font-bold select-none">{marker}</span>
                  <span className="flex-1 break-words">
                    <span className={isOverdue && !isPaid ? 'text-rose-400 font-bold' : 'font-medium'}>
                      {task.loanTitle}
                    </span>{' '}
                    <span className="opacity-85">ไม่เกินวันที่ {task.dueDayOfMonth}</span>
                    {!effectiveConfig.hideAmounts && (
                      <span className="font-mono-numbers font-bold ml-1.5">
                        {formatCurrency(task.amount)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {onOpenApp && (
          <div className="px-3.5 py-1.5 border-t border-white/10 flex items-center justify-between text-[10px] opacity-75">
            <span>แตะรายการเพื่อติ๊กจ่าย / ขีดฆ่า</span>
            <button
              type="button"
              onClick={onOpenApp}
              className="font-bold hover:underline inline-flex items-center gap-0.5"
            >
              เปิดแอป <ArrowRight size={10} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // STYLE B: CARD_DASHBOARD (Classic Financial Card Widget)
  // -------------------------------------------------------------
  const displayedTasks = tasks.filter(t => {
    if (!effectiveShowPaid && t.status === 'PAID') return false;
    if (filterMode === 'UNPAID') return t.status !== 'PAID';
    if (filterMode === 'PAID') return t.status === 'PAID';
    return true;
  });

  const nextPendingTask = tasks.find(t => t.status !== 'PAID');

  const themeClasses = {
    LIGHT: 'bg-white text-slate-800 border-slate-200/90 shadow-lg shadow-slate-200/50',
    DARK: 'bg-slate-900 text-white border-slate-800 shadow-xl shadow-black/40',
    GLASS: 'bg-slate-900/80 backdrop-blur-xl text-white border-white/15 shadow-2xl shadow-indigo-950/30',
  }[effectiveTheme];

  const primaryNumberClass = effectiveTheme === 'LIGHT' ? 'text-slate-900' : 'text-white';
  const secondaryNumberClass = effectiveTheme === 'LIGHT' ? 'text-slate-700' : 'text-slate-200';
  const subTextClass = effectiveTheme === 'LIGHT' ? 'text-slate-500' : 'text-slate-400';
  const itemBorderClass =
    effectiveTheme === 'LIGHT'
      ? 'border-slate-100 hover:bg-slate-50/80'
      : 'border-slate-800/80 hover:bg-slate-800/50';
  const headerBorderClass = effectiveTheme === 'LIGHT' ? 'border-slate-100' : 'border-slate-800';

  if (effectiveSize === '2x2') {
    return (
      <div
        className={`rounded-3xl p-4 border transition-all select-none flex flex-col justify-between aspect-square w-full max-w-[200px] mx-auto ${themeClasses} ${className}`}
      >
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${subTextClass}`}>
                {getShortThaiMonthYear(summary.yearMonth)}
              </span>
            </div>
            {summary.isSufficient ? (
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                พอจ่าย
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
                ขาด ฿{formatCurrency(summary.shortfallAmount)}
              </span>
            )}
          </div>

          <div className="text-[11px] font-medium leading-tight opacity-75">ยอดค้างชำระ</div>
          <div className={`text-xl font-bold tracking-tight font-mono-numbers ${effectiveTheme === 'LIGHT' ? 'text-blue-600' : 'text-blue-400'}`}>
            ฿{formatCurrency(summary.totalRemaining)}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-2">
            <div className={`text-[11px] font-semibold ${subTextClass}`}>ยังไม่มีสัญญา</div>
          </div>
        ) : nextPendingTask ? (
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

            {!effectiveConfig.hideAmounts && (
              <div className={`text-right text-[11px] font-bold font-mono-numbers mt-1 ${secondaryNumberClass}`}>
                ฿{formatCurrency(nextPendingTask.amount)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
            <div className="text-[11px] font-semibold text-emerald-500">ชำระครบแล้ว!</div>
          </div>
        )}

        <div className={`text-[9px] text-center pt-1 border-t ${headerBorderClass} ${subTextClass}`}>
          {effectiveConfig.customTitle || 'คล่องตัว Widget'}
        </div>
      </div>
    );
  }

  if (effectiveSize === '4x2') {
    return (
      <div
        className={`rounded-3xl p-4 border transition-all select-none flex flex-col justify-between w-full max-w-md mx-auto ${themeClasses} ${className}`}
      >
        <div className={`pb-3 border-b ${headerBorderClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-500/20" />
              <div>
                <span className="text-xs font-bold tracking-tight">
                  {effectiveConfig.customTitle || 'คล่องตัว (KlongTua)'}
                </span>
                <span className={`text-[10px] ml-1.5 ${subTextClass}`}>
                  • {getShortThaiMonthYear(summary.yearMonth)}
                </span>
              </div>
            </div>

            {summary.isSufficient ? (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Sparkles size={11} />
                <span>เงินต้นพอจ่าย (เหลือ ฿{formatCurrency(summary.surplusAmount)})</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">
                <AlertTriangle size={11} />
                <span>ต้องหาเพิ่มอีก ฿{formatCurrency(summary.shortfallAmount)}</span>
              </div>
            )}
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-[11px] font-medium ${subTextClass}`}>ยอดค้างเดือนนี้: </span>
                <span className={`text-xl font-bold font-mono-numbers ${primaryNumberClass}`}>
                  ฿{formatCurrency(summary.totalRemaining)}
                </span>
                <span className={`text-[10px] ${subTextClass}`}>
                  (จ่ายแล้ว {summary.paidCount}/{summary.paidCount + summary.pendingCount + summary.overdueCount} งวด)
                </span>
              </div>
              {portfolioSummary && (
                <div className={`text-[10px] mt-0.5 ${subTextClass}`}>
                  หนี้คงเหลือรวม: <span className={`font-bold font-mono-numbers ${secondaryNumberClass}`}>฿{formatCurrency(portfolioSummary.totalRemainingAllLoans)}</span>
                </div>
              )}
            </div>

            <div className="w-24 flex flex-col items-end">
              <div className="text-[10px] font-semibold text-blue-500">
                {summary.completionRate}%
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${effectiveTheme === 'LIGHT' ? 'bg-slate-200' : 'bg-slate-700'}`}>
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="my-2 space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
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
                    isPaid ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task)}
                      className={`shrink-0 transition-transform active:scale-90 p-0.5 rounded-full focus:outline-none ${
                        isPaid ? 'text-emerald-500 hover:text-slate-400' : 'text-slate-400 hover:text-emerald-500'
                      }`}
                    >
                      {isPaid ? (
                        <CheckCircle2 size={20} className="fill-emerald-500 text-white" />
                      ) : (
                        <Circle size={20} strokeWidth={2.2} />
                      )}
                    </button>

                    <LenderIcon lender={task.lender} size="sm" />

                    <div className="min-w-0">
                      <div className={`text-xs font-semibold truncate leading-snug ${isPaid ? 'line-through opacity-60' : ''}`}>
                        {task.loanTitle}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className={`font-medium truncate ${subTextClass}`}>
                          {task.subTitle}
                        </span>
                        <span className="opacity-40">•</span>
                        <span className={`font-semibold shrink-0 ${
                          isOverdue
                            ? 'text-rose-500 font-bold'
                            : isPaid
                            ? 'text-emerald-500'
                            : 'text-amber-500'
                        }`}>
                          {isPaid ? 'ชำระแล้ว' : isOverdue ? 'เลยกำหนด!' : `ครบ ${formatShortThaiDayMonth(task.dueDate)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!effectiveConfig.hideAmounts && (
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-bold font-mono-numbers ${isPaid ? 'line-through opacity-60' : primaryNumberClass}`}>
                        ฿{formatCurrency(task.amount)}
                      </div>
                      <div className={`text-[9px] ${subTextClass}`}>
                        {task.dueTime} น.
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${headerBorderClass} ${subTextClass}`}>
          <span>แตะที่ปุ่มวงกลมเพื่อติ๊กจ่ายได้ทันทีจากหน้าจอ</span>
          {onOpenApp && (
            <button
              onClick={onOpenApp}
              className="text-blue-500 hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              เปิดแอป <ArrowRight size={10} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl p-5 border transition-all select-none flex flex-col justify-between w-full max-w-md mx-auto aspect-square ${themeClasses} ${className}`}
    >
      <div>
        <div className={`flex items-center justify-between pb-3 border-b ${headerBorderClass}`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-500/20" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {effectiveConfig.customTitle || 'คล่องตัว (KlongTua)'}
              </h3>
              <p className={`text-[10px] ${subTextClass}`}>{getShortThaiMonthYear(summary.yearMonth)} • สรุปสถานะการเงิน</p>
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            summary.isSufficient
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse'
          }`}>
            {summary.isSufficient ? '✓ เงินต้นพอจ่าย' : `⚠ ต้องหาเพิ่ม ฿${formatCurrency(summary.shortfallAmount)}`}
          </div>
        </div>

        <div className={`grid ${portfolioSummary ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-3`}>
          <div className={`p-2.5 rounded-2xl border ${itemBorderClass}`}>
            <span className={`text-[10px] font-medium ${subTextClass}`}>ยอดค้างเดือนนี้</span>
            <div className={`text-sm sm:text-base font-bold font-mono-numbers ${primaryNumberClass}`}>
              ฿{formatCurrency(summary.totalRemaining)}
            </div>
          </div>
          {portfolioSummary && (
            <div className={`p-2.5 rounded-2xl border ${itemBorderClass}`}>
              <span className={`text-[10px] font-medium ${subTextClass}`}>หนี้คงเหลือรวม</span>
              <div className={`text-sm sm:text-base font-bold font-mono-numbers ${secondaryNumberClass}`}>
                ฿{formatCurrency(portfolioSummary.totalRemainingAllLoans)}
              </div>
            </div>
          )}
          <div className={`p-2.5 rounded-2xl border ${itemBorderClass}`}>
            <span className={`text-[10px] font-medium ${subTextClass}`}>เงินต้นสำรอง</span>
            <div className="text-sm sm:text-base font-bold font-mono-numbers text-emerald-500">
              ฿{formatCurrency(summary.availableFunds)}
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-1 mt-3 p-1 rounded-xl text-[10px] font-medium ${effectiveTheme === 'LIGHT' ? 'bg-slate-100' : 'bg-slate-800'}`}>
          <button
            onClick={() => setFilterMode('ALL')}
            className={`flex-1 py-1 rounded-lg transition-colors ${filterMode === 'ALL' ? (effectiveTheme === 'LIGHT' ? 'bg-white shadow-sm font-bold text-slate-900' : 'bg-slate-700 shadow-sm font-bold text-white') : subTextClass}`}
          >
            ทั้งหมด ({tasks.length})
          </button>
          <button
            onClick={() => setFilterMode('UNPAID')}
            className={`flex-1 py-1 rounded-lg transition-colors ${filterMode === 'UNPAID' ? (effectiveTheme === 'LIGHT' ? 'bg-white shadow-sm font-bold text-amber-600' : 'bg-slate-700 shadow-sm font-bold text-amber-400') : subTextClass}`}
          >
            ค้างชำระ ({summary.pendingCount + summary.overdueCount})
          </button>
          <button
            onClick={() => setFilterMode('PAID')}
            className={`flex-1 py-1 rounded-lg transition-colors ${filterMode === 'PAID' ? (effectiveTheme === 'LIGHT' ? 'bg-white shadow-sm font-bold text-emerald-600' : 'bg-slate-700 shadow-sm font-bold text-emerald-400') : subTextClass}`}
          >
            จ่ายแล้ว ({summary.paidCount})
          </button>
        </div>
      </div>

      <div className="flex-1 my-3 space-y-1.5 overflow-y-auto pr-0.5">
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

              {!effectiveConfig.hideAmounts && (
                <div className="text-right shrink-0 font-mono-numbers">
                  <div className={`text-xs font-bold ${isPaid ? 'line-through' : ''}`}>
                    ฿{formatCurrency(task.amount)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${headerBorderClass} ${subTextClass}`}>
        <span>ความคืบหน้า {summary.completionRate}%</span>
        {onOpenApp && (
          <button onClick={onOpenApp} className="text-blue-500 font-semibold hover:underline">
            เปิดแอปพลิเคชัน
          </button>
        )}
      </div>
    </div>
  );
};
