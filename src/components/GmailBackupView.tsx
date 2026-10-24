import React, { useState } from 'react';
import { 
  GmailBackupMeta, 
  MonthlyInstallmentTask, 
  CashflowSummary,
  LoanAccount,
  MonthlyPaymentRecord
} from '../types/loan';
import { 
  restoreBackupFile, 
  shareBackupFile, 
  shareCsvReport 
} from '../services/gmailBackupService';
import { exportFullExcelWorkbook } from '../services/excelService';
import { loadAppState } from '../services/storageService';
import { calculateRollingProjection, calculateCategoryDistribution } from '../utils/cashflowCalculator';
import { PdfReportModal } from './PdfReportModal';
import { 
  Cloud, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  FileText,
  Printer,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';

interface GmailBackupViewProps {
  backupMeta: GmailBackupMeta;
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  loans?: LoanAccount[];
  paymentRecords?: MonthlyPaymentRecord[];
  selectedYearMonth?: string;
  onRefreshState: () => void;
  onOpenExcelModal?: () => void;
}

export const GmailBackupView: React.FC<GmailBackupViewProps> = ({
  backupMeta,
  tasks,
  summary,
  loans,
  paymentRecords,
  selectedYearMonth,
  onRefreshState,
  onOpenExcelModal,
}) => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  // Compute rolling projection and category totals for PDF
  const activeLoans = loans ?? loadAppState().loans;
  const activePaymentRecords = paymentRecords ?? loadAppState().paymentRecords;
  const activeYearMonth = selectedYearMonth ?? format(new Date(), 'yyyy-MM');

  const rollingProjections = calculateRollingProjection(
    activeLoans,
    activePaymentRecords,
    summary.availableFunds,
    activeYearMonth,
    6
  );

  const categoryTotals = calculateCategoryDistribution(tasks);

  // Share JSON backup
  const handleShareBackup = async () => {
    try {
      await shareBackupFile();
      setStatusMessage({
        type: 'success',
        text: 'แชร์ไฟล์สำรองข้อมูล .JSON เรียบร้อยแล้ว',
      });
      onRefreshState();
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `แชร์ไฟล์ไม่สำเร็จ: ${e?.message || e}`,
      });
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      await shareCsvReport(tasks, summary);
      setStatusMessage({
        type: 'success',
        text: 'แชร์รายงานตารางสรุปหนี้สิน .CSV เรียบร้อยแล้ว',
      });
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `แชร์ไฟล์ไม่สำเร็จ: ${e?.message || e}`,
      });
    }
  };

  // Restore from File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = restoreBackupFile(content);
      if (result.success) {
        setStatusMessage({ type: 'success', text: result.message });
        onRefreshState();
      } else {
        setStatusMessage({ type: 'error', text: result.message });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Cloud size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">ระบบสำรองและกู้คืนข้อมูล</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                แชร์ไฟล์สำรองข้อมูล JSON หรือรายงาน CSV ผ่าน Android Share Sheet และกู้คืนจากไฟล์ในเครื่อง
              </p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-stone-400 dark:text-stone-500 block">สำรองข้อมูลล่าสุด:</span>
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            {backupMeta.lastBackupAt 
              ? format(new Date(backupMeta.lastBackupAt), 'dd/MM/yyyy HH:mm น.')
              : 'ยังไม่เคยสำรองข้อมูล'}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Local JSON, Excel and PDF Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Share backup JSON */}
        <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 w-fit">
              <Share2 size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">แชร์ไฟล์สำรอง (.json)</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              สร้างไฟล์สำรองข้อมูลฉบับเต็มแล้วเปิด Android Share Sheet เพื่อบันทึกหรือส่งต่อ
            </p>
          </div>

          <button
            onClick={handleShareBackup}
            className="w-full py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition-colors"
          >
            แชร์ไฟล์สำรอง
          </button>
        </div>

        {/* Restore from File */}
        <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 w-fit">
              <Upload size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">กู้คืนข้อมูล (Restore)</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              นำเข้าไฟล์ JSON ที่เคยสำรองไว้เพื่อกู้คืนสัญญากู้และประวัติการชำระทั้งหมด
            </p>
          </div>

          <label className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors text-center cursor-pointer block shadow-md">
            เลือกไฟล์เพื่อกู้คืน
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Export / Import Excel & CSV */}
        <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-emerald-500/30 dark:border-emerald-500/30 shadow-sm flex flex-col justify-between space-y-4 ring-1 ring-emerald-500/10">
          <div className="space-y-1.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 w-fit">
              <FileSpreadsheet size={20} />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">ไฟล์ Excel (.xlsx) & CSV</h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                3 ชีต
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              นำเข้าสินเชื่อจากเทมเพลต Excel หรือส่งออกรายงาน 3 ชีต (.xlsx) และตารางสรุป (.csv)
            </p>
          </div>

          <div className="space-y-1.5">
            {onOpenExcelModal ? (
              <button
                onClick={onOpenExcelModal}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Import / Export Excel (.xlsx)
              </button>
            ) : (
              <button
                onClick={() => exportFullExcelWorkbook({
                  loans: activeLoans,
                  tasks,
                  summary,
                  rollingProjections,
                  selectedYearMonth: activeYearMonth,
                })}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                ส่งออกไฟล์ Excel (.xlsx)
              </button>
            )}
            <button
              onClick={handleExportCsv}
              className="w-full py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-bold transition-colors"
            >
              ส่งออกไฟล์ .CSV
            </button>
          </div>
        </div>

        {/* Export Official PDF Report */}
        <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-amber-500/30 dark:border-amber-500/30 shadow-sm flex flex-col justify-between space-y-4 ring-1 ring-amber-500/10">
          <div className="space-y-1.5">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 w-fit">
              <FileText size={20} />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">รายงานเอกสาร PDF</h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                ทางการ
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              พิมพ์หรือบันทึก PDF รายงานสรุปผู้บริหาร สัดส่วนหนี้ และตารางงวดซับพร้อมช่องลงนาม
            </p>
          </div>

          <button
            onClick={() => setIsPdfOpen(true)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 active:scale-95"
          >
            <Printer size={15} />
            <span>เปิดเอกสาร PDF</span>
          </button>
        </div>

      </div>

      {/* Official PDF Report Printable Modal */}
      <PdfReportModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        tasks={tasks}
        summary={summary}
        loans={activeLoans}
        selectedYearMonth={activeYearMonth}
        rollingProjections={rollingProjections}
        categoryTotals={categoryTotals}
      />

    </div>
  );
};
