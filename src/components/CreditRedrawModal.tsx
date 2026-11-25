import React, { useEffect, useState } from 'react';
import { X, RefreshCw, ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';
import { CreditDrawdownMode, LoanAccount } from '../types/loan';
import { formatCurrency, getLenderById } from '../utils/cashflowCalculator';
import { LenderIcon } from './LenderIcon';
import { useAndroidBack } from '../hooks/useAndroidBack';

interface CreditRedrawModalProps {
  loan: LoanAccount | null;
  availableFunds: number;
  onClose: () => void;
  onConfirm: (
    loanId: string,
    options: {
      mode: CreditDrawdownMode;
      customAmount?: number;
      addToAvailableFunds: boolean;
      note?: string;
    }
  ) => void;
}

export const CreditRedrawModal: React.FC<CreditRedrawModalProps> = ({
  loan,
  availableFunds,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<CreditDrawdownMode>('FULL_RESET');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [addToAvailableFunds, setAddToAvailableFunds] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useAndroidBack(() => {
    onClose();
    return true;
  }, Boolean(loan));

  useEffect(() => {
    if (!loan) return;
    const avail = Math.max(0, Math.round((loan.totalPrincipal - loan.remainingPrincipal) * 100) / 100);
    setMode('FULL_RESET');
    setCustomAmount(avail > 0 ? String(avail) : '');
    setAddToAvailableFunds(true);
    setNote('');
    setErrorMsg(null);
  }, [loan]);

  if (!loan) return null;

  const lender = getLenderById(loan.lenderId, loan.customLenderName, loan.customColor);
  const totalPrincipal = Number.isFinite(loan.totalPrincipal) ? loan.totalPrincipal : 0;
  const remaining = Number.isFinite(loan.remainingPrincipal) ? Math.max(0, loan.remainingPrincipal) : 0;
  const availableCredit = Math.max(0, Math.round((totalPrincipal - remaining) * 100) / 100);

  const parsedCustom = Math.min(
    availableCredit,
    Math.max(0, Math.round((parseFloat(customAmount) || 0) * 100) / 100)
  );
  const effectiveDrawAmount = mode === 'FULL_RESET' ? availableCredit : parsedCustom;
  const nextRemaining = mode === 'FULL_RESET'
    ? totalPrincipal
    : Math.min(totalPrincipal, Math.round((remaining + effectiveDrawAmount) * 100) / 100);
  const nextAvailableFunds = addToAvailableFunds
    ? Math.round((availableFunds + effectiveDrawAmount) * 100) / 100
    : availableFunds;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveDrawAmount <= 0) {
      setErrorMsg('กรุณาระบุยอดเงินที่ต้องการกดให้มากกว่า 0 บาท');
      return;
    }
    onConfirm(loan.id, {
      mode,
      customAmount: effectiveDrawAmount,
      addToAvailableFunds,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="หมุนเงินและกดวงเงินมาใช้ต่อ"
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <LenderIcon lender={lender} size="md" />
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-stone-900 dark:text-white truncate">
                หมุนเงิน / กดใช้ต่อ
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                {loan.title} · {lender.nameTh}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* 3-Column Credit Limit Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/70">
              <span className="text-[10px] font-bold text-stone-400 block">วงเงินเต็ม</span>
              <span className="text-xs sm:text-sm font-extrabold font-mono-numbers text-stone-800 dark:text-stone-100">
                ฿{formatCurrency(totalPrincipal)}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/70">
              <span className="text-[10px] font-bold text-stone-400 block">หนี้คงเหลือเดิม</span>
              <span className="text-xs sm:text-sm font-extrabold font-mono-numbers text-stone-800 dark:text-stone-100">
                ฿{formatCurrency(remaining)}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">วงเงินกดใช้ได้</span>
              <span className="text-xs sm:text-sm font-extrabold font-mono-numbers text-emerald-700 dark:text-emerald-300">
                ฿{formatCurrency(availableCredit)}
              </span>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
              เลือกจำนวนที่ต้องการกดมาใช้ต่อ
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('FULL_RESET');
                  setErrorMsg(null);
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                  mode === 'FULL_RESET'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                    กดเต็มวงเงินเดิม
                  </span>
                  {mode === 'FULL_RESET' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  ยอดคงเหลือกลับเป็น ฿{formatCurrency(totalPrincipal)} (+฿{formatCurrency(availableCredit)})
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('PARTIAL');
                  setErrorMsg(null);
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                  mode === 'PARTIAL'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                    ระบุยอดเอง
                  </span>
                  {mode === 'PARTIAL' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  เลือกกดบางส่วนจากวงเงินที่เหลือ
                </p>
              </button>
            </div>
          </div>

          {mode === 'PARTIAL' && (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                  ฿
                </span>
                <input
                  type="number"
                  min={1}
                  max={availableCredit}
                  step="any"
                  value={customAmount}
                  onChange={e => {
                    setCustomAmount(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder={`สูงสุด ${formatCurrency(availableCredit)}`}
                  className="w-full pl-8 pr-4 py-2.5 text-sm font-extrabold font-mono-numbers rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                {[0.25, 0.5, 1].map(ratio => {
                  const val = Math.round(availableCredit * ratio);
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setCustomAmount(String(val))}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
                    >
                      {Math.round(ratio * 100)}% (฿{formatCurrency(val)})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add to Available Funds Toggle */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 cursor-pointer">
            <div className="flex items-center gap-2.5 pr-3">
              <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  บวกเงินเข้า “เงินสดพร้อมใช้” ในแอปอัตโนมัติ
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  เพิ่มสภาพคล่องบนหน้า Dashboard เพื่อหมุนจ่ายรายการอื่น
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={addToAvailableFunds}
              onChange={e => setAddToAvailableFunds(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 shrink-0"
            />
          </label>

          {/* Optional Note */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
              หมายเหตุ (ไม่บังคับ)
            </label>
            <input
              type="text"
              maxLength={120}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น กดหมุนจ่ายค่างวดอื่น / ใช้สำรอง"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
            />
          </div>

          {/* Before -> After Preview */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/50 space-y-1.5 text-xs">
            <div className="font-extrabold text-amber-800 dark:text-amber-300 text-[11px]">
              สรุปยอดหลังยืนยัน (Before → After)
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600 dark:text-stone-300">หนี้คงเหลือสัญญานี้</span>
              <span className="font-mono-numbers font-extrabold text-stone-900 dark:text-white inline-flex items-center gap-1.5">
                ฿{formatCurrency(remaining)}
                <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                ฿{formatCurrency(nextRemaining)}
                {nextRemaining >= totalPrincipal && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    เต็มวงเงิน
                  </span>
                )}
              </span>
            </div>
            {addToAvailableFunds && (
              <div className="flex items-center justify-between">
                <span className="text-stone-600 dark:text-stone-300">เงินสดพร้อมใช้ในแอป</span>
                <span className="font-mono-numbers font-extrabold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
                  ฿{formatCurrency(availableFunds)}
                  <ArrowRight className="w-3.5 h-3.5" />
                  ฿{formatCurrency(nextAvailableFunds)}
                </span>
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{errorMsg}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              ยืนยันหมุนเงิน ฿{formatCurrency(effectiveDrawAmount)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
