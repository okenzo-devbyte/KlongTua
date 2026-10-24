import React, { useState } from 'react';
import { 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  WidgetConfig, 
  WidgetSize, 
  WidgetTheme 
} from '../types/loan';
import { HomeWidgetCard } from './HomeWidgetCard';
import { saveWidgetConfig } from '../services/storageService';
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
  Pin
} from 'lucide-react';

interface WidgetStudioViewProps {
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  config: WidgetConfig;
  onToggleTask: (task: MonthlyInstallmentTask) => void;
  onUpdateConfig: (newConfig: WidgetConfig) => void;
}

export const WidgetStudioView: React.FC<WidgetStudioViewProps> = ({
  tasks,
  summary,
  config,
  onToggleTask,
  onUpdateConfig,
}) => {
  const [selectedSize, setSelectedSize] = useState<WidgetSize>(config.size || '4x2');
  const [selectedTheme, setSelectedTheme] = useState<WidgetTheme>(config.theme || 'LIGHT');
  const [showPaid, setShowPaid] = useState<boolean>(config.showPaidItems);
  const [pinned, setPinned] = useState<boolean>(config.pinnedToTop);
  const [savedToast, setSavedToast] = useState<boolean>(false);

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

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-brand-600 dark:text-blue-400">
              <LayoutGrid size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">Android Home Screen Widget Studio</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                ออกแบบและปรับแต่งวิดเจ็ตหน้าจอหลัก ตรวจสอบยอด และกดติ๊กจ่ายได้ทันทีโดยไม่ต้องเปิดแอป
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-md shadow-brand-600/20"
        >
          <Pin size={16} />
          <span>บันทึกการตั้งค่า Widget</span>
        </button>
      </div>

      {savedToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span>บันทึกการตั้งค่าและเปิดใช้งาน Widget บนหน้าจอหลักเรียบร้อยแล้ว!</span>
        </div>
      )}

      {/* Grid: Left Column Controls, Right Column Live Android Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* 1. Size Picker */}
          <div className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Sliders size={14} className="text-brand-600 dark:text-brand-400" />
              <span>เลือกขนาดวิดเจ็ต (Widget Size)</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedSize('2x2')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedSize === '2x2'
                    ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm ring-1 ring-brand-600'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="text-sm font-bold">2 x 2</div>
                <div className="text-[10px] opacity-75">กะทัดรัด</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSize('4x2')}
                className={`p-3 rounded-xl border text-center transition-all relative ${
                  selectedSize === '4x2'
                    ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm ring-1 ring-brand-600'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                }`}
              >
                <span className="absolute -top-1.5 -right-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                  แนะนำ
                </span>
                <div className="text-sm font-bold">4 x 2</div>
                <div className="text-[10px] opacity-75">มาตรฐาน</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSize('4x4')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedSize === '4x4'
                    ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm ring-1 ring-brand-600'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="text-sm font-bold">4 x 4</div>
                <div className="text-[10px] opacity-75">เต็มจอ</div>
              </button>
            </div>
          </div>

          {/* 2. Theme Picker */}
          <div className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Palette size={14} className="text-brand-600 dark:text-brand-400" />
              <span>เลือกธีมดีไซน์ (Design Theme)</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTheme('LIGHT')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  selectedTheme === 'LIGHT'
                    ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm ring-1 ring-brand-600'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white border border-stone-300 shadow-inner" />
                <span className="text-[11px]">Clean Light</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTheme('DARK')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  selectedTheme === 'DARK'
                    ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm ring-1 ring-brand-600'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-stone-900 border border-stone-700 shadow-inner" />
                <span className="text-[11px]">Executive Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTheme('GLASS')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  selectedTheme === 'GLASS'
                    ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm ring-1 ring-brand-600'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-900 to-stone-800 border border-white/40 shadow-inner" />
                <span className="text-[11px]">Frosted Glass</span>
              </button>
            </div>
          </div>

          {/* 3. Toggles */}
          <div className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Eye size={14} className="text-brand-600 dark:text-brand-400" />
              <span>การแสดงผลข้อมูลบนหน้าจอ</span>
            </label>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/60 hover:bg-stone-100/80 dark:hover:bg-stone-800 cursor-pointer transition-colors">
                <div>
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">แสดงรายการที่ชำระแล้ว (ขีดฆ่า)</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">ช่วยให้เช็กย้อนหลังได้ว่างวดไหนจ่ายแล้วบ้าง</div>
                </div>
                <input
                  type="checkbox"
                  checked={showPaid}
                  onChange={(e) => setShowPaid(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-stone-300 focus:ring-brand-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/60 hover:bg-stone-100/80 dark:hover:bg-stone-800 cursor-pointer transition-colors">
                <div>
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">ปักหมุด Quick Widget บนหน้า Dashboard</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">แสดงวิดเจ็ตนี้ที่ด้านบนสุดของหน้าหลักในแอป</div>
                </div>
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-stone-300 focus:ring-brand-500"
                />
              </label>
            </div>
          </div>

          {/* Instruction Card */}
          <div className="p-4 rounded-3xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700/60 text-[11px] text-stone-600 dark:text-stone-300 space-y-1.5">
            <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
              <Info size={13} className="text-brand-600 dark:text-brand-400" />
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
            <div className="rounded-[30px] overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 min-h-[540px] p-4 flex flex-col justify-between text-white">
              
              {/* Android Status Bar */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 px-1 pt-0.5">
                <span>19:30</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Widget Placement Area */}
              <div className="my-auto py-2">
                <div className="mb-2 text-center text-[10px] text-slate-400">
                  👆 ลองกดแตะปุ่มวงกลมเพื่อติ๊กจ่าย/ยกเลิกจ่ายได้จริง
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
                    <span className="text-[9px] text-slate-400">โทร</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-md">
                      💬
                    </div>
                    <span className="text-[9px] text-slate-400">ข้อความ</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md">
                      🌐
                    </div>
                    <span className="text-[9px] text-slate-400">Chrome</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-md ring-2 ring-white/20">
                      ⚡
                    </div>
                    <span className="text-[9px] text-blue-300 font-bold">คล่องตัว</span>
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
