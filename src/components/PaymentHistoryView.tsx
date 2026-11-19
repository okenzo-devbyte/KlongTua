import React, { useMemo, useState } from 'react';
import { History, Search, CheckCircle2, Filter, RotateCcw } from 'lucide-react';
import { LoanAccount, MonthlyPaymentRecord } from '../types/loan';
import { formatCurrency, getLenderById, getThaiMonthYear } from '../utils/cashflowCalculator';
import { LenderIcon } from './LenderIcon';

interface PaymentHistoryViewProps {
  loans: LoanAccount[];
  paymentRecords: MonthlyPaymentRecord[];
}

function formatThaiTimestamp(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const thaiYear = d.getFullYear() + 543;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${thaiYear} ${hh}:${mm} น.`;
}

export const PaymentHistoryView: React.FC<PaymentHistoryViewProps> = ({ loans, paymentRecords }) => {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  const loanMap = useMemo(() => {
    const map = new Map<string, LoanAccount>();
    for (const loan of loans) map.set(loan.id, loan);
    return map;
  }, [loans]);

  const paidRecords = useMemo(() => {
    return paymentRecords
      .filter(r => r.status === 'PAID')
      .slice()
      .sort((a, b) => (b.paidAt || b.dueDate || '').localeCompare(a.paidAt || a.dueDate || ''));
  }, [paymentRecords]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    paidRecords.forEach(r => set.add(r.yearMonth));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [paidRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paidRecords.filter(r => {
      if (selectedMonth !== 'ALL' && r.yearMonth !== selectedMonth) return false;
      if (!q) return true;
      const loan = loanMap.get(r.loanId);
      const lender = loan ? getLenderById(loan.lenderId, loan.customLenderName, loan.customColor) : null;
      return (
        (loan?.title || '').toLowerCase().includes(q) ||
        (lender?.nameTh || '').toLowerCase().includes(q) ||
        (r.paymentNote || '').toLowerCase().includes(q)
      );
    });
  }, [paidRecords, selectedMonth, search, loanMap]);

  const totalPaidAmount = useMemo(
    () => filtered.reduce((sum, r) => sum + (Number.isFinite(r.amountPaid) ? r.amountPaid : r.amountDue), 0),
    [filtered]
  );

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
          <History className="w-6 h-6 text-amber-600" />
          ประวัติการชำระเงิน (Payment Ledger)
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          บันทึกการชำระย้อนหลังทั้งหมดพร้อมวัน-เวลาที่กดชำระและยอดตัดเงินต้น
        </p>
      </div>

      {/* Summary & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">ยอดชำระรวมตามตัวกรอง</p>
          <p className="text-2xl font-extrabold font-mono-numbers text-emerald-800 dark:text-emerald-200 mt-1">
            ฿{formatCurrency(totalPaidAmount)}
          </p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
            ทั้งหมด {filtered.length} รายการ
          </p>
        </div>

        <div className="sm:col-span-2 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อสัญญา, ธนาคาร, หมายเหตุ..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
            >
              <option value="ALL">ทุกเดือน ({availableMonths.length})</option>
              {availableMonths.map(ym => (
                <option key={ym} value={ym}>
                  {getThaiMonthYear(ym)}
                </option>
              ))}
            </select>
            {(search || selectedMonth !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedMonth('ALL');
                }}
                className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                title="ล้างตัวกรอง"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ledger List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-10 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-700" />
          <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
            {paidRecords.length === 0
              ? 'ยังไม่มีประวัติการชำระเงิน'
              : 'ไม่พบประวัติการชำระตามตัวกรองที่เลือก'}
          </p>
          <p className="text-xs text-stone-500">
            เมื่อคุณกดติ๊กชำระงวดในหน้ารายการต้องชำระ ประวัติจะถูกบันทึกที่นี่โดยอัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
          {filtered.map(rec => {
            const loan = loanMap.get(rec.loanId);
            const sub = loan?.subItems.find(s => s.id === rec.subItemId);
            const lender = loan
              ? getLenderById(loan.lenderId, loan.customLenderName, loan.customColor)
              : getLenderById('custom', 'สัญญาที่ลบแล้ว');
            return (
              <div key={rec.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <LenderIcon lender={lender} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900 dark:text-white truncate">
                      {loan?.title || 'รายการสัญญาเดิม'}
                      {sub ? ` · ${sub.title}` : ''}
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {lender.nameTh} · งวด {getThaiMonthYear(rec.yearMonth)} · ชำระเมื่อ {formatThaiTimestamp(rec.paidAt)}
                    </p>
                    {rec.paymentNote && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        หมายเหตุ: {rec.paymentNote}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold font-mono-numbers text-emerald-600 dark:text-emerald-400">
                    ฿{formatCurrency(rec.amountPaid || rec.amountDue)}
                  </p>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                    ชำระแล้ว
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
