import React, { useState } from 'react';
import { LoanAccount, LenderInfo } from '../types/loan';
import { LenderIcon } from './LenderIcon';
import { getLenderById, formatCurrency } from '../utils/cashflowCalculator';
import { confirmAction } from '../services/native/dialog';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Layers, 
  Calendar, 
  Clock, 
  Building2, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';

interface LoanManagerViewProps {
  loans: LoanAccount[];
  onAddLoan: () => void;
  onEditLoan: (loan: LoanAccount) => void;
  onDeleteLoan: (loanId: string) => void;
  onOpenExcelModal?: () => void;
  onLoadSampleData?: () => void;
}

export const LoanManagerView: React.FC<LoanManagerViewProps> = ({
  loans,
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onOpenExcelModal,
  onLoadSampleData,
}) => {
  const [search, setSearch] = useState('');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLoanId(expandedLoanId === id ? null : id);
  };

  const filteredLoans = loans.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.title.toLowerCase().includes(q) 
      || (l.contractNumber && l.contractNumber.toLowerCase().includes(q))
      || l.lenderId.toLowerCase().includes(q);
  });

  const getLoanTypeBadge = (loanType: string) => {
    switch (loanType) {
      case 'MULTI_DAY_SPLIT': return 'แบ่งจ่ายหลายรอบในเดือนเดียว';
      case 'INSTALLMENT_PLAN': return 'ผ่อนสินค้า / หลายบิลย่อย';
      case 'EFFECTIVE_RATE': return 'ลดต้นลดดอก';
      case 'FLAT_RATE': return 'งวดคงที่';
      case 'REVOLVING_MIN': return 'จ่ายขั้นต่ำ/หมุนเวียน';
      default: return 'สินเชื่อทั่วไป';
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">จัดการสัญญากู้ & บัญชีสินเชื่อ</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                บันทึกรายละเอียดหนี้สิน แยกตามธนาคารหรือแอป พร้อมกำหนดซับย่อยหลายวันในแต่ละเดือน
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenExcelModal && (
            <button
              onClick={onOpenExcelModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs transition-all active:scale-95"
              title="นำเข้าหรือส่งออกสัญญาผ่านไฟล์ Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Excel (นำเข้า/ส่งออก)</span>
            </button>
          )}
          <button
            onClick={onAddLoan}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-md shadow-brand-600/20"
          >
            <Plus size={16} />
            <span>เพิ่มเงินกู้ / แอปสินเชื่อใหม่</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-stone-400 dark:text-stone-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาเงินกู้ตามชื่อ หรือเลขที่สัญญา..."
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
        />
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white/95 dark:bg-stone-900/90 p-10 rounded-3xl border border-stone-200 dark:border-stone-800 text-center space-y-4">
          <Building2 size={36} className="mx-auto text-stone-300 dark:text-stone-600" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">ยังไม่มีข้อมูลเงินกู้</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              กดปุ่ม "เพิ่มเงินกู้ / แอปสินเชื่อใหม่" นำเข้าจากไฟล์ Excel หรือโหลดข้อมูลตัวอย่างเพื่อเริ่มใช้งาน
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={onAddLoan}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>เพิ่มสัญญาใหม่</span>
            </button>
            {onOpenExcelModal && (
              <button
                onClick={onOpenExcelModal}
                className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5"
              >
                <FileSpreadsheet size={14} />
                <span>นำเข้าจาก Excel</span>
              </button>
            )}
            {onLoadSampleData && (
              <button
                onClick={onLoadSampleData}
                className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-bold flex items-center gap-1.5"
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>โหลดข้อมูลตัวอย่าง</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map(loan => {
            const lender = getLenderById(loan.lenderId, loan.customLenderName, loan.customColor);
            const isExpanded = expandedLoanId === loan.id;
            const monthlyTotal = loan.subItems.reduce((sum, s) => sum + s.amount, 0);

            return (
              <div 
                key={loan.id}
                className="bg-white/95 dark:bg-stone-900/90 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-sm overflow-hidden transition-all hover:border-stone-300 dark:hover:border-stone-700"
              >
                {/* Main Card Header */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <LenderIcon lender={lender} size="lg" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                          {loan.title}
                        </h3>
                        <span className="text-[10px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-full">
                          {getLoanTypeBadge(loan.loanType)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-1 flex-wrap">
                        <span>สัญญา: {loan.contractNumber || 'ไม่ระบุ'}</span>
                        <span>•</span>
                        <span>ดอกเบี้ย: {loan.interestRateAnnual}% ต่อปี</span>
                        <span>•</span>
                        <span className="font-semibold text-stone-700 dark:text-stone-300">
                          {loan.subItems.length} ซับย่อยในแต่ละเดือน
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                        <div>
                          <span className="text-stone-400 dark:text-stone-500 text-[10px] block">วงเงินกู้ตั้งต้น</span>
                          <span className="font-bold font-mono-numbers text-stone-700 dark:text-stone-300">
                            ฿{formatCurrency(loan.totalPrincipal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 dark:text-stone-500 text-[10px] block">หนี้คงเหลือ</span>
                          <span className="font-bold font-mono-numbers text-stone-800 dark:text-stone-200">
                            ฿{formatCurrency(loan.remainingPrincipal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 dark:text-stone-500 text-[10px] block">ยอดต้องจ่าย/เดือน</span>
                          <span className="font-bold font-mono-numbers text-brand-600 dark:text-brand-400">
                            ฿{formatCurrency(monthlyTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Expand Chevron */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditLoan(loan)}
                      className="p-2 rounded-xl text-stone-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title="แก้ไขเงินกู้นี้"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (await confirmAction(`คุณต้องการลบ "${loan.title}" ใช่หรือไม่?`)) {
                          onDeleteLoan(loan.id);
                        }
                      }}
                      className="p-2 rounded-xl text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="ลบเงินกู้นี้"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(loan.id)}
                      className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title={isExpanded ? 'ย่อรายละเอียด' : 'ดูซับแยก'}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Sub-items Expansion Area */}
                {isExpanded && (
                  <div className="bg-stone-50/80 dark:bg-stone-950/40 p-4 border-t border-stone-100 dark:border-stone-800/80 space-y-2 animate-in fade-in duration-150">
                    <div className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 mb-2">
                      <Layers size={14} className="text-brand-600 dark:text-brand-400" />
                      <span>รายละเอียดการแบ่งจ่ายซับแยกในแต่ละเดือน ({loan.subItems.length} รายการ):</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {loan.subItems.map((sub, idx) => (
                        <div 
                          key={sub.id} 
                          className="p-3 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                              {idx + 1}. {sub.title}
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={11} className="text-stone-400" />
                              <span>ทุกวันที่ {sub.dueDayOfMonth} ของเดือน • {sub.dueTime} น.</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                              ฿{formatCurrency(sub.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {loan.notes && (
                      <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-800/80 p-2.5 rounded-xl border border-stone-200/70 dark:border-stone-700/80">
                        <strong className="text-stone-700 dark:text-stone-300">หมายเหตุ:</strong> {loan.notes}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
