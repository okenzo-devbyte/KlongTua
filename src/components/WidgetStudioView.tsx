import React, { useEffect, useState } from 'react';
import {
  MonthlyInstallmentTask,
  CashflowSummary,
  WidgetConfig,
  WidgetStyle,
  WidgetFontSize,
  WidgetPaidDisplay,
  WidgetMarkerStyle,
  WidgetSize,
  WidgetTheme,
  PortfolioDebtSummary,
} from '../types/loan';
import { DEFAULT_WIDGET_CONFIG } from '../data/lenders';
import { HomeWidgetCard } from './HomeWidgetCard';
import { saveWidgetConfig } from '../services/storageService';
import { syncWidgetSnapshot } from '../services/widgetBridgeService';
import {
  Smartphone,
  Sparkles,
  LayoutGrid,
  Palette,
  CheckCircle2,
  Info,
  Sliders,
  Pin,
  RefreshCw,
  Type,
  EyeOff,
} from 'lucide-react';

interface WidgetStudioViewProps {
  tasks: MonthlyInstallmentTask[];
  summary: CashflowSummary;
  portfolioSummary?: PortfolioDebtSummary;
  config: WidgetConfig;
  onToggleTask: (task: MonthlyInstallmentTask) => void;
  onUpdateConfig: (newConfig: WidgetConfig) => void;
}

const PRESETS: Array<{
  id: string;
  name: string;
  desc: string;
  patch: Partial<WidgetConfig>;
}> = [
  {
    id: 'noteplus-burgundy',
    name: 'NotePlus แดงเข้ม',
    desc: 'หัวแดงเบอร์กันดี · พื้นดำโปร่ง · ขีดฆ่า',
    patch: {
      style: 'NOTE_LIST',
      theme: 'DARK',
      headerColor: '#7F1D1D',
      backgroundColor: '#000000',
      backgroundOpacity: 92,
      textColor: '#FFFFFF',
      markerStyle: 'BULLET',
      paidDisplay: 'STRIKETHROUGH_KEEP',
    },
  },
  {
    id: 'obsidian-glass',
    name: 'กระจกดำโปร่งแสง',
    desc: 'เข้ากับทุกวอลเปเปอร์ · มินิมอล',
    patch: {
      style: 'NOTE_LIST',
      theme: 'GLASS',
      headerColor: '#1E293B',
      backgroundColor: '#0F172A',
      backgroundOpacity: 68,
      textColor: '#F8FAFC',
      markerStyle: 'CHECKBOX',
      paidDisplay: 'STRIKETHROUGH_BOTTOM',
    },
  },
  {
    id: 'paper-minimal',
    name: 'กระดาษโน้ตสว่าง',
    desc: 'หัวอำพัน · พื้นขาวสะอาดตา',
    patch: {
      style: 'NOTE_LIST',
      theme: 'LIGHT',
      headerColor: '#B45309',
      backgroundColor: '#FFFFFF',
      backgroundOpacity: 95,
      textColor: '#1C1917',
      markerStyle: 'CHECKBOX',
      paidDisplay: 'STRIKETHROUGH_KEEP',
    },
  },
  {
    id: 'card-dashboard',
    name: 'การ์ดสรุปการเงิน',
    desc: 'แสดงยอดค้างรวมและแถบความคืบหน้า',
    patch: {
      style: 'CARD_DASHBOARD',
      theme: 'LIGHT',
      size: '4x2',
      headerColor: '#0F172A',
      backgroundColor: '#FFFFFF',
      backgroundOpacity: 100,
      textColor: '#0F172A',
    },
  },
];

const HEADER_SWATCHES = ['#7F1D1D', '#B45309', '#065F46', '#1E3A8A', '#1E293B', '#6B21A8', '#BE123C', '#0F172A'];
const BG_SWATCHES = ['#000000', '#0F172A', '#1C1917', '#FFFFFF', '#FAF8F5', '#1E1B4B'];

export const WidgetStudioView: React.FC<WidgetStudioViewProps> = ({
  tasks,
  summary,
  portfolioSummary,
  config,
  onToggleTask,
  onUpdateConfig,
}) => {
  const [draft, setDraft] = useState<WidgetConfig>(() => ({
    ...DEFAULT_WIDGET_CONFIG,
    ...config,
  }));
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    setDraft(prev => ({ ...DEFAULT_WIDGET_CONFIG, ...prev, ...config }));
  }, [config]);

  const updateDraft = (patch: Partial<WidgetConfig>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  };

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handleSave = () => {
    const normalized: WidgetConfig = {
      ...DEFAULT_WIDGET_CONFIG,
      ...draft,
      showPaidItems: draft.paidDisplay !== 'HIDE',
    };
    saveWidgetConfig(normalized, false);
    onUpdateConfig(normalized);
    syncWidgetSnapshot();
    showToast('บันทึกการตั้งค่าและซิงก์ Widget บนหน้าจอหลักเรียบร้อยแล้ว!');
  };

  const triggerImmediateNativeSync = () => {
    setIsSyncing(true);
    const normalized: WidgetConfig = {
      ...DEFAULT_WIDGET_CONFIG,
      ...draft,
      showPaidItems: draft.paidDisplay !== 'HIDE',
    };
    saveWidgetConfig(normalized, false);
    onUpdateConfig(normalized);
    syncWidgetSnapshot();

    setTimeout(() => {
      setIsSyncing(false);
      showToast('ซิงก์ข้อมูลขึ้นหน้าจอหลัก Android สำเร็จแล้ว! วิดเจ็ตจะแสดงผลข้อมูลล่าสุดทันที');
    }, 350);
  };

  const isNoteStyle = (draft.style || 'NOTE_LIST') === 'NOTE_LIST';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <LayoutGrid size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              ปรับแต่งวิดเจ็ตหน้าจอหลัก (Widget Studio)
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              ปรับสีหัวข้อ พื้นหลังโปร่งใส ขนาดตัวอักษร และรูปแบบโน้ตเช็กลิสต์สไตล์ NotePlus พร้อมพรีวิวสด
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={triggerImmediateNativeSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 font-bold text-xs transition-all active:scale-95"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'กำลังซิงก์...' : 'ซิงก์ Widget ทันที'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs transition-all shadow-sm"
          >
            <Pin size={15} />
            <span>บันทึกและใช้งาน</span>
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Quick Presets Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESETS.map(preset => {
          const active =
            (draft.style || 'NOTE_LIST') === preset.patch.style &&
            draft.headerColor === preset.patch.headerColor &&
            draft.backgroundColor === preset.patch.backgroundColor;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => updateDraft(preset.patch)}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                active
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 shadow-sm'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                  style={{ backgroundColor: preset.patch.headerColor }}
                />
                <span className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                  {preset.name}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 truncate">
                {preset.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Style & Title */}
          <div className="p-4 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 space-y-3">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Sparkles size={15} className="text-amber-600" />
              <span>รูปแบบและชื่อหัวข้อวิดเจ็ต</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'NOTE_LIST' as WidgetStyle, label: 'โน้ตเช็กลิสต์ (NotePlus)', desc: 'เลื่อนดูได้ไม่จำกัด + ขีดฆ่า' },
                { id: 'CARD_DASHBOARD' as WidgetStyle, label: 'การ์ดสรุปการเงิน', desc: 'ยอดรวม + แถบความคืบหน้า' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateDraft({ style: opt.id })}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    (draft.style || 'NOTE_LIST') === opt.id
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-stone-900 dark:text-white'
                      : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <div className="text-xs font-extrabold">{opt.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                ข้อความหัวข้อ (ปรับแต่งเองได้)
              </label>
              <input
                type="text"
                maxLength={40}
                value={draft.customTitle || ''}
                onChange={e => updateDraft({ customTitle: e.target.value })}
                placeholder="เช่น รายจ่ายแต่ละเดือน"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>
          </div>

          {/* Colors & Opacity */}
          {isNoteStyle ? (
            <div className="p-4 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 space-y-4">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Palette size={15} className="text-amber-600" />
                <span>สีแถบหัวข้อ พื้นหลัง และความโปร่งใส</span>
              </span>

              {/* Header Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-stone-400">
                  <span>สีแถบหัวข้อ</span>
                  <span className="font-mono">{draft.headerColor || '#7F1D1D'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {HEADER_SWATCHES.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => updateDraft({ headerColor: color })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        draft.headerColor === color ? 'border-amber-400 scale-110' : 'border-white/40'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`เลือกสีหัวข้อ ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={draft.headerColor || '#7F1D1D'}
                    onChange={e => updateDraft({ headerColor: e.target.value })}
                    className="w-7 h-7 rounded-full overflow-hidden cursor-pointer border-0 bg-transparent"
                    title="เลือกสีหัวข้อแบบกำหนดเอง"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-stone-400">
                  <span>สีพื้นหลังวิดเจ็ต</span>
                  <span className="font-mono">{draft.backgroundColor || '#000000'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {BG_SWATCHES.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        updateDraft({
                          backgroundColor: color,
                          textColor: color.toUpperCase() === '#FFFFFF' || color.toUpperCase() === '#FAF8F5' ? '#1C1917' : '#FFFFFF',
                        })
                      }
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        draft.backgroundColor === color ? 'border-amber-500 scale-110' : 'border-stone-300 dark:border-stone-600'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`เลือกสีพื้นหลัง ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={draft.backgroundColor || '#000000'}
                    onChange={e => updateDraft({ backgroundColor: e.target.value })}
                    className="w-7 h-7 rounded-full overflow-hidden cursor-pointer border-0 bg-transparent"
                    title="เลือกสีพื้นหลังแบบกำหนดเอง"
                  />
                </div>
              </div>

              {/* Background Opacity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-stone-400">
                  <span>ความทึบพื้นหลัง (Opacity)</span>
                  <span className="font-mono-numbers">{draft.backgroundOpacity ?? 92}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={2}
                  value={draft.backgroundOpacity ?? 92}
                  onChange={e => updateDraft({ backgroundOpacity: Number(e.target.value) })}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* Text Color */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400">สีตัวอักษรรายการ</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateDraft({ textColor: '#FFFFFF' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      (draft.textColor || '#FFFFFF').toUpperCase() === '#FFFFFF'
                        ? 'border-amber-500 bg-stone-900 text-white'
                        : 'border-stone-300 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    ขาว
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDraft({ textColor: '#1C1917' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      (draft.textColor || '#FFFFFF').toUpperCase() === '#1C1917'
                        ? 'border-amber-500 bg-white text-stone-900'
                        : 'border-stone-300 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    เข้ม
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 space-y-3">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Palette size={15} className="text-amber-600" />
                <span>ธีมและขนาดการ์ด</span>
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['LIGHT', 'DARK', 'GLASS'] as WidgetTheme[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateDraft({ theme: t })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                      draft.theme === t
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {t === 'LIGHT' ? 'สว่าง' : t === 'DARK' ? 'มืด' : 'กระจกใส'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['2x2', '4x2', '4x4'] as WidgetSize[]).map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => updateDraft({ size: sz })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                      draft.size === sz
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Typography & List Behavior */}
          <div className="p-4 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 space-y-3">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Type size={15} className="text-amber-600" />
              <span>ตัวอักษรและพฤติกรรมรายการ</span>
            </span>

            {isNoteStyle && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'SM' as WidgetFontSize, label: 'เล็ก (11px)' },
                    { id: 'MD' as WidgetFontSize, label: 'กลาง (13px)' },
                    { id: 'LG' as WidgetFontSize, label: 'ใหญ่ (15px)' },
                  ]).map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateDraft({ fontSize: f.id })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border ${
                        (draft.fontSize || 'MD') === f.id
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'BULLET' as WidgetMarkerStyle, label: '• จุดนำหน้า (NotePlus)' },
                    { id: 'CHECKBOX' as WidgetMarkerStyle, label: '☐ กล่องติ๊ก (Checklist)' },
                  ]).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateDraft({ markerStyle: m.id })}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border ${
                        (draft.markerStyle || 'BULLET') === m.id
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    การแสดงผลรายการที่ชำระแล้ว
                  </label>
                  <select
                    value={draft.paidDisplay || 'STRIKETHROUGH_KEEP'}
                    onChange={e => updateDraft({ paidDisplay: e.target.value as WidgetPaidDisplay })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                  >
                    <option value="STRIKETHROUGH_KEEP">ขีดฆ่าและคงตำแหน่งเดิม (เหมือน NotePlus)</option>
                    <option value="STRIKETHROUGH_BOTTOM">ขีดฆ่าและย้ายไปไว้ด้านล่าง</option>
                    <option value="HIDE">ซ่อนรายการที่ชำระแล้วทันที</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 cursor-pointer">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
                  <Sliders size={14} className="text-amber-600" />
                  แสดงยอดค้างรวมบนแถบหัวข้อ
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(draft.showHeaderSummary)}
                  onChange={e => updateDraft({ showHeaderSummary: e.target.checked })}
                  className="w-4 h-4 accent-amber-600"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 cursor-pointer">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
                  <EyeOff size={14} className="text-amber-600" />
                  ซ่อนตัวเลขเงินบนวิดเจ็ต (โหมดส่วนตัว)
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(draft.hideAmounts)}
                  onChange={e => updateDraft({ hideAmounts: e.target.checked })}
                  className="w-4 h-4 accent-amber-600"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 cursor-pointer">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
                  <Pin size={14} className="text-amber-600" />
                  ปักหมุดวิดเจ็ตนี้ไว้บนหน้าแรกในแอป
                </span>
                <input
                  type="checkbox"
                  checked={draft.pinnedToTop}
                  onChange={e => updateDraft({ pinnedToTop: e.target.checked })}
                  className="w-4 h-4 accent-amber-600"
                />
              </label>
            </div>
          </div>

          {/* Instruction */}
          <div className="p-4 rounded-3xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-[11px] text-stone-600 dark:text-stone-300 space-y-1">
            <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
              <Info size={14} className="text-amber-600" />
              <span>วิธีวาง Widget บนหน้าจอหลัก Android:</span>
            </div>
            <p className="text-stone-500 dark:text-stone-400">
              กดค้างที่ว่างบนหน้าจอโฮม → เลือก <strong>วิดเจ็ต</strong> → เลือก <strong>คล่องตัว</strong> → ลากวางและปรับขนาดได้อิสระตั้งแต่ 2x2 ถึงเต็มหน้าจอ
            </p>
          </div>
        </div>

        {/* Right Live Wallpaper Preview (6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Smartphone size={15} />
            <span>พรีวิวสดบนหน้าจอโฮม (Interactive Live Preview)</span>
          </div>

          <div className="w-full max-w-[360px] bg-slate-900 p-3 rounded-[40px] shadow-2xl border-4 border-slate-800 relative">
            <div className="w-3.5 h-3.5 bg-black rounded-full mx-auto mb-2 border border-slate-700/50" />

            {/* Scenic Gradient Wallpaper Mockup */}
            <div
              className="rounded-[30px] overflow-hidden min-h-[560px] p-4 flex flex-col justify-between text-white relative"
              style={{
                background: 'linear-gradient(155deg, #d6cfc7 0%, #9b8e82 48%, #4a403a 100%)',
              }}
            >
              {/* Status Bar */}
              <div className="flex items-center justify-between text-[11px] font-bold text-white drop-shadow px-1">
                <span>13:05</span>
                <span>5G · 98%</span>
              </div>

              {/* Widget Area */}
              <div className="my-auto py-2">
                <div className="mb-2 text-center text-[10px] font-bold text-white/90 drop-shadow">
                  👆 แตะรายการเพื่อทดสอบติ๊กจ่าย / ขีดฆ่า
                </div>
                <HomeWidgetCard
                  tasks={tasks}
                  summary={summary}
                  portfolioSummary={portfolioSummary}
                  widgetConfig={draft}
                  onToggleTask={onToggleTask}
                  isStandaloneSimulation={true}
                />
              </div>

              {/* Dock */}
              <div className="pt-3 border-t border-white/20">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600/90 flex items-center justify-center shadow">📞</div>
                    <span className="text-[9px] text-white drop-shadow">โทร</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/90 flex items-center justify-center shadow">💬</div>
                    <span className="text-[9px] text-white drop-shadow">ข้อความ</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/90 flex items-center justify-center shadow">🌐</div>
                    <span className="text-[9px] text-white drop-shadow">เบราว์เซอร์</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center shadow ring-2 ring-white/40">⚡</div>
                    <span className="text-[9px] text-white font-bold drop-shadow">คล่องตัว</span>
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
