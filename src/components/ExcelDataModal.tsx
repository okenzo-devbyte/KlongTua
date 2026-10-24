import React, { useState, useRef, useCallback } from 'react';
import {
  LoanAccount,
  MonthlyInstallmentTask,
  CashflowSummary,
  RollingProjectionMonth,
} from '../types/loan';
import {
  downloadLoanImportTemplate,
  parseExcelImportBuffer,
  exportFullExcelWorkbook,
  ParsedExcelImportResult,
} from '../services/excelService';
import { LenderIcon } from './LenderIcon';
import { getLenderById, formatCurrency } from '../utils/cashflowCalculator';
import { useAndroidBack } from '../hooks/useAndroidBack';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Layers,
  Trash2,
  PlusCircle,
  FileDown,
} from 'lucide-react';

interface ExcelDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  loans: LoanAccount[];
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  rollingProjections: RollingProjectionMonth[];
  selectedYearMonth: string;
  onImportLoans: (importedLoans: LoanAccount[], mode: 'MERGE' | 'REPLACE') => void;
  onLoadSampleData?: () => void;
  onClearSampleData?: () => void;
  hasSampleData?: boolean;
}

export const ExcelDataModal: React.FC<ExcelDataModalProps> = ({
  isOpen,
  onClose,
  loans,
  tasks,
  summary,
  rollingProjections,
  selectedYearMonth,
  onImportLoans,
  onLoadSampleData,
  onClearSampleData,
  hasSampleData = false,
}) => {
  const [importMode, setImportMode] = useState<'MERGE' | 'REPLACE'>('MERGE');
  const [parsedResult, setParsedResult] = useState<ParsedExcelImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBack = useCallback(() => {
    onClose();
    return true;
  }, [onClose]);
  useAndroidBack(handleBack, isOpen);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const buffer = await file.arrayBuffer();
    const res = parseExcelImportBuffer(buffer);
    setParsedResult(res);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!parsedResult || parsedResult.loans.length === 0) return;
    onImportLoans(parsedResult.loans, importMode);
    setParsedResult(null);
    setFileName('');
    onClose();
  };

  const handleExportExcel = () => {
    exportFullExcelWorkbook({
      loans,
      tasks,
      summary,
      rollingProjections,
      selectedYearMonth,
    });
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 my-auto max-h-[90vh] flex flex-col text-stone-900 dark:text-stone-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100">
                จัดการไฟล์ Excel (Import / Export & Template)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                นำเข้าสินเชื่อจากไฟล์ Excel/CSV ดาวน์โหลดเทมเพลต หรือส่งออกรายงาน 3 ชีต
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          
          {/* Section 1: Export & Template Quick Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export Full Excel Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <FileDown size={16} />
                  <span>ส่งออกรายงาน Excel (.xlsx)</span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                  ส่งออกข้อมูลครบ 3 ชีต: สรุปสภาพคล่อง 6 เดือน, ตารางชำระรายเดือน และทะเบียนสัญญาสินเชื่อ
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Download size={14} />
                <span>{exportSuccess ? '✓ ดาวน์โหลดไฟล์ Excel แล้ว' : 'ดาวน์โหลดรายงาน Excel (.xlsx)'}</span>
              </button>
            </div>

            {/* Download Import Template Card */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <FileSpreadsheet size={16} />
                  <span>ไฟล์ตัวอย่างสำหรับกรอกนำเข้า (Template)</span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                  ดาวน์โหลดเทมเพลตมาตรฐานพร้อมตัวอย่างการกรอกสินเชื่อและรหัสธนาคารครบทุกแห่ง
                </p>
              </div>
              <button
                type="button"
                onClick={downloadLoanImportTemplate}
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Download size={14} />
                <span>ดาวน์โหลดไฟล์ Template (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Section 2: Upload & Import Excel */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Upload size={15} className="text-amber-600 dark:text-amber-400" />
                  <span>อัปโหลดไฟล์ Excel / CSV เพื่อนำเข้าสินเชื่อ</span>
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  รองรับไฟล์ .xlsx, .xls และ .csv (สามารถนำไฟล์ที่ Export ออกไปมาแก้ไขแล้วอัปโหลดกลับได้ทันที)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition-all"
              >
                <Upload size={14} />
                <span>เลือกไฟล์ Excel / CSV</span>
              </button>
            </div>

            {/* Import Mode Selection */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">รูปแบบการนำเข้า:</span>
              <button
                type="button"
                onClick={() => setImportMode('MERGE')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  importMode === 'MERGE'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                เพิ่มรวมกับรายการเดิม (Merge)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('REPLACE')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  importMode === 'REPLACE'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                แทนที่รายการเดิมทั้งหมด (Replace)
              </button>
            </div>

            {/* Parsed Preview Area */}
            {parsedResult && (
              <div className="mt-3 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100">
                      พรีวิวข้อมูลจากไฟล์ "{fileName}" ({parsedResult.loans.length} สัญญา จาก {parsedResult.rowCount} แถว)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setParsedResult(null)}
                    className="text-[11px] text-stone-400 hover:text-rose-500 font-semibold"
                  >
                    ล้างค่า
                  </button>
                </div>

                {parsedResult.errors.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 space-y-1">
                    {parsedResult.errors.map((err, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}

                {parsedResult.loans.length > 0 && (
                  <div className="max-h-48 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                    {parsedResult.loans.map(loan => {
                      const lender = getLenderById(loan.lenderId, loan.customLenderName);
                      const monthlySum = loan.subItems.reduce((acc, s) => acc + s.amount, 0);
                      return (
                        <div key={loan.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <LenderIcon lender={lender} size="sm" />
                            <div className="min-w-0">
                              <div className="font-bold text-stone-900 dark:text-stone-100 truncate">
                                {loan.title}
                              </div>
                              <div className="text-[10px] text-stone-500 dark:text-stone-400">
                                {lender.nameTh} • {loan.subItems.length} งวด/เดือน • หนี้คงเหลือ ฿{formatCurrency(loan.remainingPrincipal)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-stone-400 block">ยอดชำระ/เดือน</span>
                            <span className="font-extrabold font-mono-numbers text-amber-600 dark:text-amber-400">
                              ฿{formatCurrency(monthlySum)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {parsedResult.loans.length > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      ยืนยันนำเข้าข้อมูลทั้ง {parsedResult.loans.length} สัญญา ({importMode === 'MERGE' ? 'รวมกับข้อมูลเดิม' : 'แทนที่ข้อมูลเดิม'})
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Sample Data Quick Menu */}
          {(onLoadSampleData || onClearSampleData) && (
            <div className="p-4 rounded-2xl bg-stone-50/90 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
                  <Sparkles size={15} className="text-amber-500" />
                  <span>เมนูข้อมูลตัวอย่าง (Sample Demo Data)</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  ทดลองใช้งานด้วยชุดข้อมูลสินเชื่อตัวอย่าง 4 สัญญา (กสิกรไทย, SPayLater, LINE BK, เงินติดล้อ)
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onLoadSampleData && (
                  <button
                    type="button"
                    onClick={() => {
                      onLoadSampleData();
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <PlusCircle size={14} />
                    <span>โหลดข้อมูลตัวอย่าง</span>
                  </button>
                )}
                {hasSampleData && onClearSampleData && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearSampleData();
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>ล้างข้อมูลตัวอย่าง</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
