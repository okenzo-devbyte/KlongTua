import React, { useState } from 'react';
import { 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  WidgetConfig, 
  WidgetSize, 
  WidgetTheme,
  PortfolioDebtSummary 
} from '../types/loan';
import { HomeWidgetCard } from './HomeWidgetCard';
import { saveWidgetConfig } from '../services/storageService';
import { saveWidgetSnapshot } from '../services/widgetBridgeService';
import { 
  Smartphone, 
  Sparkles, 
  Check, 
  LayoutGrid, 
  Eye, 
  Palette, 
  ShieldCheck, 
  CheckCircle2, 
  Info,
  Sliders,
  Pin,
  RefreshCw,
  Zap
} from 'lucide-react';

interface WidgetStudioViewProps {
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  portfolioSummary?: PortfolioDebtSummary;
  config: WidgetConfig;
  onToggleTask: (task: MonthlyInstallmentTask) => void;
  onUpdateConfig: (newConfig: WidgetConfig) => void;
}

export const WidgetStudioView: React.FC<WidgetStudioViewProps> = ({
  tasks,
  summary,
  portfolioSummary,
  config,
  onToggleTask,
  onUpdateConfig,
}) => {
  const [selectedSize, setSelectedSize] = useState<WidgetSize>(config.size || '4x2');
  const [selectedTheme, setSelectedTheme] = useState<WidgetTheme>(config.theme || 'LIGHT');
  const [showPaid, setShowPaid] = useState<boolean>(config.showPaidItems);
  const [pinned, setPinned] = useState<boolean>(config.pinnedToTop);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSave = () => {
    const updated: WidgetConfig = {
      ...config,
      size: selectedSize,
      theme: selectedTheme,
      showPaidItems: showPaid,
      pinnedToTop: pinned,
    };
    saveWidgetConfig(updated);
    onUpdateConfig(updated);

    // Also trigger native snapshot sync
    triggerImmediateNativeSync();

    setSavedToast('บันทึกการตั้งค่าและซิงก์ Widget บนหน้าจอหลักเรียบร้อยแล้ว!');
    setTimeout(() => setSavedToast(null), 3000);
  };

  const triggerImmediateNativeSync = () => {
    setIsSyncing(true);
    saveWidgetSnapshot({
      updatedAt: new Date().toISOString(),
      yearMonth: summary.yearMonth,
      totalRemainingDue: summary.totalRemaining,
      availableFunds: summary.availableFunds,
      isSufficient: summary.isSufficient,
      shortfallAmount: summary.shortfallAmount,
      totalRemainingDebt: portfolioSummary?.totalRemainingAllLoans,
      totalPrincipalDebt: portfolioSummary?.totalPrincipalAllLoans,
      tasks: tasks.map(t => ({
        id: t.id,
        loanId: t.loanId,
        subItemId: t.subItemId,
        lenderNameTh: t.lender.nameTh,
        badgeText: t.lender.badgeText,
        primaryColor: t.lender.primaryColor,
        loanTitle: t.loanTitle,
        subTitle: t.subTitle,
        dueDateFormatted: t.dueDate,
        dueTime: t.dueTime,
        amount: t.amount,
        isPaid: t.status === 'PAID',
        isOverdue: t.status === 'OVERDUE',
      })),
    });

    setTimeout(() => {
      setIsSyncing(false);
      setSavedToast('ซิงก์ข้อมูลขึ้นหน้าจอหลัก Android สำเร็จแล้ว! วิดเจ็ตจะแสดงผลข้อมูลล่าสุดทันที');
      setTimeout(() => setSavedToast(null), 3000);
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <LayoutGrid size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">Android Home Screen Widget Studio</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              ปรับแต่งและซิงก์วิดเจ็ตหน้าจอหลัก ตรวจสอบยอดหนี้คงเหลือ และกดติ๊กจ่ายได้ทันทีโดยไม่ต้องเปิดแอป
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={triggerImmediateNativeSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 font-bold text-xs transition-all active:scale-95 shadow-xs"
            title="ส่งข้อมูลยอดหนี้และรายการค้างชำระขึ้น Widget ทันที"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'กำลังซิงก์...' : 'ซิงก์ Widget ทันที'}</span>
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs"
          >
            <Pin size={15} />
            <span>บันทึกการตั้งค่า</span>
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Grid: Left Column Controls, Right Column Live Android Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Theme Selector */}
          <div className="p-4 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Palette size={15} className="text-amber-600 dark:text-amber-400" />
              <span>ธีมวิดเจ็ต (Theme Color)</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTheme('LIGHT')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedTheme === 'LIGHT'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 dark:border-amber-500 font-bold text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                }`}
              >
                <div className="text-xs font-bold">สว่าง (Clean Minimal)</div>
                <div className="text-[10px] text-stone-400 mt-0.5">พื้นขาว สบายตา</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTheme('DARK')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedTheme === 'DARK'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 dark:border-amber-500 font-bold text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                }`}
              >
                <div className="text-xs font-bold">มืด (Midnight Dark)</div>
                <div className="text-[10px] text-stone-400 mt-0.5">พื้นดำ ประหยัดแบตเตอรี่</div>
              </button>
            </div>
          </div>

          {/* Size Selector */}
          <div className="p-4 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Eye size={15} className="text-amber-600 dark:text-amber-400" />
              <span>ขนาดช่องตาราง (Grid Size)</span>
            </span>

            <div className="space-y-2">
              {[
                { size: '4x3' as WidgetSize, label: 'ขนาดใหญ่ 4 x 3 (แนะนำ)', desc: 'แสดงยอดหนี้คงเหลือ + สูงสุด 4 รายการ พร้อมปุ่มติ๊กจ่าย' },
                { size: '4x2' as WidgetSize, label: 'ขนาดมาตรฐาน 4 x 2', desc: 'แสดงยอดหนี้คงเหลือ + 2 รายการค้างชำระ' },
                { size: '2x2' as WidgetSize, label: 'ขนาดกะทัดรัด 2 x 2', desc: 'แสดงเฉพาะยอดรวมคงเหลือและสถานะเงินต้น' },
              ].map(opt => (
                <button
                  key={opt.size}
                  type="button"
                  onClick={() => setSelectedSize(opt.size)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedSize === opt.size
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 dark:border-amber-500 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{opt.desc}</div>
                  </div>
                  {selectedSize === opt.size && (
                    <Check size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="p-4 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Sliders size={15} className="text-amber-600 dark:text-amber-400" />
              <span>ตัวเลือกเพิ่มเติม</span>
            </span>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-200">แสดงรายการที่จ่ายแล้ว</div>
                  <div className="text-[10px] text-stone-400">แสดงรายการที่มีขีดฆ่าในวิดเจ็ต</div>
                </div>
                <input
                  type="checkbox"
                  checked={showPaid}
                  onChange={(e) => setShowPaid(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-200">ปักหมุดไว้บนสุดของ Dashboard ในแอป</div>
                  <div className="text-[10px] text-stone-400">แสดง Widget แบนเนอร์ด้านบนของหน้าแรก</div>
                </div>
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                />
              </label>
            </div>
          </div>

          {/* Instruction Card */}
          <div className="p-4 rounded-3xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-[11px] text-stone-600 dark:text-stone-300 space-y-1.5">
            <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
              <Info size={14} className="text-amber-600 dark:text-amber-400" />
              <span>วิธีเพิ่ม Widget ลงในหน้าจอหลัก Android:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-stone-500 dark:text-stone-400 pl-1">
              <li>กดค้างที่พื้นที่ว่างบนหน้าจอโฮมของโทรศัพท์มือถือ</li>
              <li>เลือกเมนู <strong>วิดเจ็ต (Widgets)</strong></li>
              <li>ค้นหา <strong>คล่องตัว (KlongTua)</strong> และเลือกขนาดที่ต้องการ</li>
              <li>ลากวางบนหน้าจอเพื่อเริ่มกดติ๊กและดูยอดได้ทันที</li>
            </ol>
          </div>

        </div>

        {/* Right Column: Interactive Android Simulator (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Smartphone size={15} />
            <span>โหมดจำลองหน้าจอโฮม Android (Interactive Preview)</span>
          </div>

          {/* Android Device Mockup Frame */}
          <div className="w-full max-w-[340px] bg-slate-900 p-3 rounded-[40px] shadow-2xl border-4 border-slate-800 relative">
            {/* Camera Punch-hole */}
            <div className="w-3.5 h-3.5 bg-black rounded-full mx-auto mb-2 border border-slate-700/50" />

            {/* Android Screen Wallpaper Area */}
            <div className="rounded-[30px] overflow-hidden bg-gradient-to-b from-stone-900 via-stone-900 to-black min-h-[540px] p-4 flex flex-col justify-between text-white">
              
              {/* Android Status Bar */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300 px-1 pt-0.5">
                <span>19:30</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Widget Placement Area */}
              <div className="my-auto py-2">
                <div className="mb-2 text-center text-[10px] text-stone-400">
                  👆 ลองกดแตะเพื่อติ๊กจ่าย/ยกเลิกจ่ายได้จริง
                </div>

                <HomeWidgetCard
                  tasks={tasks}
                  summary={summary}
                  size={selectedSize}
                  theme={selectedTheme}
                  showPaidItems={showPaid}
                  onToggleTask={onToggleTask}
                  isStandaloneSimulation={true}
                />
              </div>

              {/* Simulated Android App Dock */}
              <div className="pt-4 border-t border-white/10">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                      📞
                    </div>
                    <span className="text-[9px] text-stone-400">โทร</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-md">
                      💬
                    </div>
                    <span className="text-[9px] text-stone-400">ข้อความ</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md">
                      🌐
                    </div>
                    <span className="text-[9px] text-stone-400">Chrome</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-md ring-2 ring-white/20">
                      ⚡
                    </div>
                    <span className="text-[9px] text-amber-300 font-bold">คล่องตัว</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};