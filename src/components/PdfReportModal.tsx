import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  LoanAccount, 
  RollingProjectionMonth,
  PdfReportType 
} from '../types/loan';
import { 
  formatCurrency, 
  getThaiMonthYear, 
  formatThaiDateLong 
} from '../utils/cashflowCalculator';
import { 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Building2, 
  Sparkles,
  PieChart,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { printCurrentPage } from '../services/native/print';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  loans: LoanAccount[];
  selectedYearMonth: string;
  rollingProjections: RollingProjectionMonth[];
  categoryTotals: Record<string, { label: string; amount: number; count: number; color: string }>;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  summary,
  loans,
  selectedYearMonth,
  rollingProjections,
  categoryTotals,
}) => {
  const [reportType, setReportType] = useState<PdfReportType>('SUMMARY');

  const handleBack = useCallback(() => {
    onClose();
    return true;
  }, [onClose]);
  useAndroidBack(handleBack, isOpen);

  if (!isOpen) return null;

  const monthTh = getThaiMonthYear(selectedYearMonth);
  const nowFormatted = format(new Date(), 'dd/MM/yyyy HH:mm น.');
  const totalCategoryAmount = Object.values(categoryTotals).reduce((sum, c) => sum + c.amount, 0);

  const handlePrint = async () => {
    await printCurrentPage('KlongTua Financial Report');
  };

  return createPortal(
    <div className="pdf-print-root fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 select-none print:p-0 print:bg-white print:static">
      
      {/* Click outside backdrop to close (hidden during print) */}
      <div 
        className="fixed inset-0 -z-10 print:hidden" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Main Container */}
      <div className="bg-[#FAF8F5] dark:bg-stone-900 print:bg-white text-stone-900 dark:text-stone-100 print:text-black w-full max-w-4xl max-h-[94vh] rounded-3xl border border-stone-300 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden print:max-h-none print:rounded-none print:border-none print:shadow-none print:max-w-none">
        
        {/* Top Floating Control Bar (Hidden on Print) */}
        <div className="px-5 py-3.5 bg-white/95 dark:bg-stone-950/95 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                พรีวิวรายงานเอกสารทางการเงิน (Executive PDF Preview)
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                รอบเดือน {monthTh} • พร้อมพิมพ์หรือบันทึกเป็น PDF
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setReportType('SUMMARY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reportType === 'SUMMARY'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                📊 แบบสรุปผู้บริหาร
              </button>
              <button
                type="button"
                onClick={() => setReportType('DETAIL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reportType === 'DETAIL'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                📑 แบบแจกแจงละเอียด
              </button>
            </div>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Printer size={16} />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              title="ปิด"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ================= PRINTABLE DOCUMENT SHEET (A4 Aspect) ================= */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-10 print:p-0 print:overflow-visible">
          {/* Print Styles Injection */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm 12mm 10mm 12mm;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body > *:not(.pdf-print-root) {
                display: none !important;
              }
              html, body {
                background: #ffffff !important;
              }
              .print-table-header {
                display: table-header-group !important;
              }
              .print-table-footer {
                display: table-footer-group !important;
              }
              .print-page-break {
                page-break-before: always !important;
                break-before: page !important;
              }
              .print-avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}} />

          <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-stone-200/90 print:border-none print:shadow-none print:p-0 print:max-w-none text-stone-900 font-sans">
            
            {/* Outer Table Container to Enable Native Browser Running Header & Footer across all pages */}
            <table className="w-full border-collapse">
              {/* 1. Repeating Running Header (Appears on every printed A4 page) */}
              <thead className="print-table-header">
                <tr>
                  <td>
                    <div className="border-b-2 border-stone-900 pb-4 mb-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center font-black text-sm shadow-sm">
                            คล่องตัว
                          </div>
                          <div>
                            <h1 className="text-lg font-black tracking-tight text-stone-900">
                              คล่องตัว (KlongTua)
                            </h1>
                            <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase block">
                              ระบบบริหารหนี้สินและสภาพคล่องอัจฉริยะ • Financial Health Report
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[10px] text-stone-600">
                          <span className="font-bold text-stone-900 block text-xs">
                            {reportType === 'SUMMARY' ? 'รายงานสรุปภาพรวมผู้บริหาร' : 'รายงานแจกแจงรายละเอียดสัญญากู้'}
                          </span>
                          <span>ประจำเดือน: <strong className="text-stone-900">{monthTh}</strong></span>
                          <span className="block text-[9px] text-stone-500">พิมพ์เมื่อ: {nowFormatted}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </thead>

              {/* Document Body Content */}
              <tbody>
                <tr>
                  <td className="space-y-6 pt-1">
                    
                    {/* SECTION 1: Executive KPI Scorecards Grid */}
                    <div className="print-avoid-break">
                      <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-600" />
                        <span>สรุปตัวชี้วัดสถานะสภาพคล่อง (Monthly Financial Health Scorecard)</span>
                      </h2>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                          <span className="text-[10px] text-stone-500 font-semibold block">ยอดต้องชำระรวมทั้งเดือน</span>
                          <span className="text-base font-extrabold text-stone-900 font-mono-numbers">
                            ฿{formatCurrency(summary.totalDue)}
                          </span>
                          <span className="text-[9px] text-stone-400 block mt-0.5">{tasks.length} รายการซับย่อย</span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                          <span className="text-[10px] text-emerald-800 font-semibold block">ชำระแล้วเสร็จ</span>
                          <span className="text-base font-extrabold text-emerald-700 font-mono-numbers">
                            ฿{formatCurrency(summary.totalPaid)}
                          </span>
                          <span className="text-[9px] text-emerald-600 block mt-0.5">คิดเป็น {summary.completionRate}%</span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                          <span className="text-[10px] text-stone-500 font-semibold block">ค้างชำระคงเหลือ</span>
                          <span className="text-base font-extrabold text-stone-900 font-mono-numbers">
                            ฿{formatCurrency(summary.totalRemaining)}
                          </span>
                          <span className="text-[9px] text-stone-500 block mt-0.5">เหลือ {summary.pendingCount} งวด</span>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${summary.isSufficient ? 'border-amber-200 bg-amber-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
                          <span className="text-[10px] text-stone-600 font-semibold block">เงินต้นสำรองคงเหลือ</span>
                          <span className="text-base font-extrabold text-stone-900 font-mono-numbers">
                            ฿{formatCurrency(summary.availableFunds)}
                          </span>
                          <span className={`text-[9px] font-bold block mt-0.5 ${summary.isSufficient ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {summary.isSufficient ? `✓ เงินพอจ่าย (เหลือ ฿${formatCurrency(summary.surplusAmount)})` : `⚠️ ขาดอีก ฿${formatCurrency(summary.shortfallAmount)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Debt Category Proportion */}
                    <div className="print-avoid-break pt-4">
                      <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <PieChart size={13} className="text-amber-600" />
                        <span>สัดส่วนภาระหนี้สินแยกตามประเภท (Debt Category Distribution)</span>
                      </h2>

                      {/* Stacked Visual Bar */}
                      <div className="w-full h-3 rounded-full overflow-hidden flex bg-stone-200 mb-3 border border-stone-300">
                        {Object.entries(categoryTotals).map(([key, cat]) => {
                          if (cat.amount === 0 || totalCategoryAmount === 0) return null;
                          const pct = (cat.amount / totalCategoryAmount) * 100;
                          return (
                            <div 
                              key={key} 
                              style={{ width: `${pct}%`, backgroundColor: cat.color }} 
                              title={`${cat.label}: ${pct.toFixed(1)}%`}
                            />
                          );
                        })}
                      </div>

                      {/* Category Table */}
                      <table className="w-full text-xs border border-stone-200 rounded-xl overflow-hidden">
                        <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 print:table-header-group">
                          <tr>
                            <th className="py-2 px-3 text-left">หมวดหมู่สถาบัน/สินเชื่อ</th>
                            <th className="py-2 px-3 text-center">จำนวนงวด</th>
                            <th className="py-2 px-3 text-right">ยอดรวม (บาท)</th>
                            <th className="py-2 px-3 text-right">สัดส่วน (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {Object.entries(categoryTotals).map(([key, cat]) => {
                            if (cat.amount === 0) return null;
                            const pct = totalCategoryAmount > 0 ? ((cat.amount / totalCategoryAmount) * 100).toFixed(1) : '0';
                            return (
                              <tr key={key} className="hover:bg-stone-50 print-avoid-break">
                                <td className="py-2 px-3 font-semibold flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: cat.color }} />
                                  <span>{cat.label}</span>
                                </td>
                                <td className="py-2 px-3 text-center text-stone-600">{cat.count} งวด</td>
                                <td className="py-2 px-3 text-right font-bold font-mono-numbers">฿{formatCurrency(cat.amount)}</td>
                                <td className="py-2 px-3 text-right font-mono-numbers text-stone-600">{pct}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* SECTION 3: 6-Month Rolling Forecast Projection */}
                    <div className="print-avoid-break pt-4">
                      <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <TrendingUp size={13} className="text-amber-600" />
                        <span>การจำลองสภาพคล่องต่อเนื่อง 6 เดือนล่วงหน้า (Rolling Cashflow Forecast)</span>
                      </h2>

                      <table className="w-full text-xs border border-stone-200 rounded-xl overflow-hidden">
                        <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 print:table-header-group">
                          <tr>
                            <th className="py-2 px-3 text-left">เดือน / รอบ</th>
                            <th className="py-2 px-3 text-right">เงินต้นยกมา</th>
                            <th className="py-2 px-3 text-right">ยอดต้องชำระ</th>
                            <th className="py-2 px-3 text-right">เงินคงเหลือสุทธิ</th>
                            <th className="py-2 px-3 text-center">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {rollingProjections.map((proj, idx) => (
                            <tr key={proj.yearMonth} className={`print-avoid-break ${idx === 0 ? 'bg-amber-50/40 font-semibold' : ''}`}>
                              <td className="py-2 px-3 font-bold">
                                {proj.monthLabelTh} {idx === 0 && <span className="text-[10px] text-amber-700 font-normal">(ปัจจุบัน)</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-mono-numbers text-stone-600">฿{formatCurrency(proj.startingFunds)}</td>
                              <td className="py-2 px-3 text-right font-bold font-mono-numbers">฿{formatCurrency(proj.totalDue)}</td>
                              <td className="py-2 px-3 text-right font-bold font-mono-numbers text-stone-800">฿{formatCurrency(proj.endingFunds)}</td>
                              <td className="py-2 px-3 text-center">
                                {proj.isSufficient ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    พอจ่าย
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                    ขาด ฿{formatCurrency(proj.shortfall)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* SECTION 4: Comprehensive Details Table (Only in DETAIL Mode - Starts Cleanly on Page 2) */}
                    {reportType === 'DETAIL' && (
                      <div className="print-page-break pt-4 print:pt-6 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                          <h2 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={14} className="text-amber-600" />
                            <span>ตารางแจกแจงสัญญากู้และซับย่อยรายวัน ({tasks.length} รายการ)</span>
                          </h2>
                          <span className="text-[10px] text-stone-500 font-semibold">แผ่นที่ 2 • ตารางรายละเอียดรายสัญญา</span>
                        </div>

                        <table className="w-full text-xs border border-stone-200 rounded-xl overflow-hidden">
                          <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 text-[11px] print:table-header-group">
                            <tr>
                              <th className="py-2 px-2.5 text-left">เจ้าหนี้ / สัญญา</th>
                              <th className="py-2 px-2 text-left">ซับย่อย</th>
                              <th className="py-2 px-2 text-center">ครบกำหนด</th>
                              <th className="py-2 px-2.5 text-right">ยอดชำระ</th>
                              <th className="py-2 px-2.5 text-right">หนี้คงเหลือ</th>
                              <th className="py-2 px-2 text-center">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-[11px]">
                            {tasks.map(t => {
                              const isPaid = t.status === 'PAID';
                              const isOverdue = t.status === 'OVERDUE';
                              return (
                                <tr key={t.id} className={`print-avoid-break ${isPaid ? 'bg-stone-50/50 text-stone-500' : ''}`}>
                                  <td className="py-2 px-2.5 font-bold">
                                    <div>{t.loanTitle}</div>
                                    <div className="text-[10px] font-normal text-stone-400">
                                      {t.lender.nameTh} • สัญญา: {t.contractNumber || '-'}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2">{t.subTitle}</td>
                                  <td className="py-2 px-2 text-center font-mono-numbers">
                                    {t.dueDate.slice(-2)}/{selectedYearMonth.slice(5, 7)} ({t.dueTime} น.)
                                  </td>
                                  <td className="py-2 px-2.5 text-right font-bold font-mono-numbers text-stone-900">
                                    ฿{formatCurrency(t.amount)}
                                  </td>
                                  <td className="py-2 px-2.5 text-right font-mono-numbers text-stone-600">
                                    ฿{formatCurrency(t.remainingPrincipal)}
                                  </td>
                                  <td className="py-2 px-2 text-center font-bold">
                                    {isPaid ? (
                                      <span className="text-emerald-700">✓ จ่ายแล้ว</span>
                                    ) : isOverdue ? (
                                      <span className="text-rose-600">⚠️ เลยกำหนด</span>
                                    ) : (
                                      <span className="text-amber-700">รอชำระ</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* SECTION 5: Signature Certification & Prepared By Block */}
                    <div className="pt-8 border-t border-stone-200 print-avoid-break mt-6">
                      <div className="grid grid-cols-2 gap-8 text-center text-xs">
                        <div className="space-y-12">
                          <span className="text-stone-500 block">ลงชื่อผู้จัดทำรายงาน (Prepared By)</span>
                          <div className="border-b border-stone-400 w-48 mx-auto" />
                          <span className="text-stone-600 text-[11px] block">
                            (......................................................)<br />
                            วันที่: ...... / ...... / ..........
                          </span>
                        </div>

                        <div className="space-y-12">
                          <span className="text-stone-500 block">ลงชื่อผู้ตรวจสอบ / อนุมัติ (Approved By)</span>
                          <div className="border-b border-stone-400 w-48 mx-auto" />
                          <span className="text-stone-600 text-[11px] block">
                            (......................................................)<br />
                            วันที่: ...... / ...... / ..........
                          </span>
                        </div>
                      </div>

                      <div className="text-center pt-8 text-[10px] text-stone-400">
                        เอกสารนี้สร้างขึ้นโดยระบบ คล่องตัว (KlongTua - ระบบบริหารหนี้สินและสภาพคล่องอัจฉริยะ) เพื่อการวางแผนบริหารจัดการภาระหนี้สินส่วนบุคคล
                      </div>
                    </div>

                  </td>
                </tr>
              </tbody>

              {/* Repeating Running Footer (Appears on every printed A4 page) */}
              <tfoot className="print-table-footer">
                <tr>
                  <td>
                    <div className="pt-4 mt-6 border-t border-stone-300 text-[9px] text-stone-400 flex items-center justify-between">
                      <span>คล่องตัว (KlongTua) • เอกสารลับเฉพาะสำหรับการวางแผนการเงินส่วนบุคคล</span>
                      <span>รอบเดือน {monthTh} • เอกสารมีผลสมบูรณ์เมื่อลงนาม</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>

          </div>
        </div>

      </div>

    </div>,
    document.body
  );
};
