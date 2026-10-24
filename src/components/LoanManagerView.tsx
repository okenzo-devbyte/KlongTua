import React, { useState } from 'react';
import { LoanAccount, LenderInfo, PortfolioDebtSummary } from '../types/loan';
import { LenderIcon } from './LenderIcon';
import { getLenderById, formatCurrency, calculatePortfolioDebtSummary } from '../utils/cashflowCalculator';
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
  Sparkles,
  BarChart3
} from 'lucide-react';

interface LoanManagerViewProps {
  loans: LoanAccount[];
  portfolioSummary?: PortfolioDebtSummary;
  onAddLoan: () => void;
  onEditLoan: (loan: LoanAccount) => void;
  onDeleteLoan: (loanId: string) => void;
  onOpenExcelModal?: () => void;
  onLoadSampleData?: () => void;
}

export const LoanManagerView: React.FC<LoanManagerViewProps> = ({
  loans,
  portfolioSummary: propPortfolioSummary,
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onOpenExcelModal,
  onLoadSampleData,
}) => {
  const [search, setSearch] = useState('');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  const portfolioSummary = propPortfolioSummary || calculatePortfolioDebtSummary(loans);

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
      case 'MULTI_DAY_SPLIT': return 'แบ่งจ่ายหลายรอบ';
      case 'INSTALLMENT_PLAN': return 'ผ่อนสินค้า/บิลย่อย';
      case 'EFFECTIVE_RATE': return 'ลดต้นลดดอก';
      case 'FLAT_RATE': return 'งวดคงที่';
      case 'REVOLVING_MIN': return 'จ่ายขั้นต่ำ';
      default: return 'สินเชื่อทั่วไป';
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-4xl mx-auto select-none">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">จัดการสัญญากู้ & บัญชีสินเชื่อ</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              บันทึกรายละเอียดหนี้สิน แยกตามธนาคารหรือแอป พร้อมกำหนดซับย่อยในแต่ละเดือน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {onOpenExcelModal && (
            <button
              onClick={onOpenExcelModal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 font-bold text-xs transition-all active:scale-95 shadow-xs"
              title="นำเข้าหรือส่งออกสัญญาผ่านไฟล์ Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Excel</span>
            </button>
          )}
          <button
            onClick={onAddLoan}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs"
          >
            <Plus size={15} />
            <span>+ เพิ่มสัญญาใหม่</span>
          </button>
        </div>
      </div>

      {/* 2. Portfolio Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs text-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 block uppercase">สัญญาทั้งหมด</span>
          <span className="text-sm font-extrabold font-num text-stone-900 dark:text-stone-100">
            {portfolioSummary.activeLoanCount} รายการ
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs text-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 block uppercase">หนี้คงเหลือรวม</span>
          <span className="text-sm font-extrabold font-num text-stone-900 dark:text-stone-100">
            ฿{formatCurrency(portfolioSummary.totalRemainingAllLoans)}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs text-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 block uppercase">ยอดตั้งต้นรวม</span>
          <span className="text-sm font-extrabold font-num text-stone-700 dark:text-stone-300">
            ฿{formatCurrency(portfolioSummary.totalPrincipalAllLoans)}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs text-center">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 block uppercase">ผ่อนต่อเดือนรวม</span>
          <span className="text-sm font-extrabold font-num text-amber-600 dark:text-amber-400">
            ฿{formatCurrency(portfolioSummary.monthlyCommitment)}
          </span>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-stone-400 dark:text-stone-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาเงินกู้ตามชื่อ หรือเลขที่สัญญา..."
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
        />
      </div>

      {/* 4. Loans List */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white/95 dark:bg-stone-900/90 p-10 rounded-3xl border border-stone-200 dark:border-stone-800 text-center space-y-4">
          <Building2 size={36} className="mx-auto text-stone-300 dark:text-stone-600" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">ยังไม่มีข้อมูลเงินกู้</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              กดปุ่ม "เพิ่มสัญญาใหม่" นำเข้าจากไฟล์ Excel หรือโหลดข้อมูลตัวอย่างเพื่อเริ่มใช้งาน
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={onAddLoan}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
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
            const remaining = loan.remainingPrincipal ?? loan.totalPrincipal;
            const paidOff = Math.max(0, loan.totalPrincipal - remaining);
            const rate = loan.totalPrincipal > 0 ? (paidOff / loan.totalPrincipal) * 100 : 0;

            return (
              <div 
                key={loan.id}
                className="bg-white/95 dark:bg-stone-900/90 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden transition-all hover:border-amber-400/80"
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
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                          {getLoanTypeBadge(loan.loanType)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-1 flex-wrap">
                        <span>สัญญา: {loan.contractNumber || 'ไม่ระบุ'}</span>
                        <span>•</span>
                        <span>ดอกเบี้ย: {loan.interestRateAnnual}% ต่อปี</span>
                        <span>•</span>
                        <span className="font-semibold text-stone-700 dark:text-stone-300">
                          {loan.subItems.length} ซับย่อย
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                        <div>
                          <span className="text-stone-400 dark:text-stone-500 text-[10px] block">หนี้คงเหลือ</span>
                          <span className="font-extrabold font-num text-stone-900 dark:text-stone-100">
                            ฿{formatCurrency(remaining)}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 dark:text-stone-500 text-[10px] block">วงเงินตั้งต้น</span>
                          <span className="font-bold font-num text-stone-500 dark:text-stone-400">
                            ฿{formatCurrency(loan.totalPrincipal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 dark:text-stone-500 text-[10px] block">ยอดต้องจ่าย/เดือน</span>
                          <span className="font-bold font-num text-amber-600 dark:text-amber-400">
                            ฿{formatCurrency(monthlyTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Payoff Progress Bar */}
                      <div className="mt-3 max-w-sm">
                        <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                          <span>ปลดหนี้แล้ว</span>
                          <span className="font-bold font-num text-emerald-600 dark:text-emerald-400">{rate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${rate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Expand Chevron */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditLoan(loan)}
                      className="p-2 rounded-xl text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
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
                      <Layers size={14} className="text-amber-600 dark:text-amber-400" />
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
                            <span className="text-xs font-bold font-num text-stone-900 dark:text-stone-100">
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