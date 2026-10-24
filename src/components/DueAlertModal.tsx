import React, { useCallback } from 'react';
import { MonthlyInstallmentTask, ThaiVoiceConfig } from '../types/loan';
import { ThaiMascot } from './ThaiMascot';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { formatCurrency, formatThaiDateLong } from '../utils/cashflowCalculator';
import { LenderIcon } from './LenderIcon';
import { X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface DueAlertModalProps {
  task: MonthlyInstallmentTask | null;
  isOpen: boolean;
  voiceConfig?: ThaiVoiceConfig;
  onClose: () => void;
  onMarkPaid: (task: MonthlyInstallmentTask) => void;
  onSnooze: (task: MonthlyInstallmentTask) => void;
}

export const DueAlertModal: React.FC<DueAlertModalProps> = ({
  task,
  isOpen,
  voiceConfig,
  onClose,
  onMarkPaid,
  onSnooze,
}) => {
  const handleBack = useCallback(() => {
    onClose();
    return true;
  }, [onClose]);
  useAndroidBack(handleBack, isOpen);

  if (!isOpen || !task) return null;

  const isOverdue = task.status === 'OVERDUE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-800 dark:border-amber-400/80 shadow-2xl p-6 text-stone-900 dark:text-stone-100 overflow-hidden">
        {/* Top corner close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mascot + Heading */}
        <div className="flex items-center gap-4 mb-4">
          <ThaiMascot type="ALERT" size={54} voiceConfig={voiceConfig} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isOverdue
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                {isOverdue ? 'เลยกำหนดชำระแล้ว!' : 'ครบกำหนดชำระวันนี้!'}
              </span>
            </div>
            <h3 className="text-lg font-extrabold mt-1">
              แจ้งเตือนกำหนดชำระเงิน
            </h3>
          </div>
        </div>

        {/* Item Details Box */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 my-4 space-y-3">
          <div className="flex items-center gap-3">
            <LenderIcon lender={task.lender} size="md" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate">{task.loanTitle}</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{task.subTitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-700/60 text-xs">
            <div>
              <span className="text-stone-400 block">วันครบกำหนด</span>
              <span className="font-bold text-stone-800 dark:text-stone-200">
                {formatThaiDateLong(task.dueDate)} ({task.dueTime} น.)
              </span>
            </div>
            <div className="text-right">
              <span className="text-stone-400 block">ยอดที่ต้องชำระ</span>
              <span className="font-extrabold text-base text-rose-600 dark:text-rose-400 font-num">
                ฿{formatCurrency(task.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => onSnooze(task)}
            className="px-4 py-3 rounded-2xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>เตือนอีกครั้งใน 1 ชม.</span>
          </button>

          <button
            onClick={() => onMarkPaid(task)}
            className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ชำระเรียบร้อยแล้ว</span>
          </button>
        </div>
      </div>
    </div>
  );
};
