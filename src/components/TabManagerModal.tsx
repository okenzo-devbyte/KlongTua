import React, { useCallback, useEffect, useState } from 'react';
import { NavTabItem, LenderCategory } from '../types/loan';
import { DEFAULT_NAV_TABS } from '../data/lenders';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { X, Eye, EyeOff, Plus, RotateCcw, LayoutGrid, Trash2 } from 'lucide-react';

const CATEGORY_LABELS: Record<LenderCategory, string> = {
  BANK: 'ธนาคาร',
  DIGITAL_LOAN: 'สินเชื่อดิจิทัล',
  CREDIT_CARD: 'บัตรเครดิต',
  AUTO_TITLE: 'จำนำทะเบียน / ไฟแนนซ์',
  OTHER: 'หนี้อื่นๆ / ส่วนบุคคล',
};

interface TabManagerModalProps {
  isOpen: boolean;
  tabs: NavTabItem[];
  onClose: () => void;
  onSaveTabs: (newTabs: NavTabItem[]) => void;
}

export const TabManagerModal: React.FC<TabManagerModalProps> = ({
  isOpen,
  tabs,
  onClose,
  onSaveTabs,
}) => {
  const [currentTabs, setCurrentTabs] = useState<NavTabItem[]>(tabs);
  const [newTabLabel, setNewTabLabel] = useState('');
  const [newTabCategory, setNewTabCategory] = useState<LenderCategory>('BANK');

  useEffect(() => {
    if (isOpen) {
      setCurrentTabs(tabs);
      setNewTabLabel('');
    }
  }, [isOpen, tabs]);

  const handleBack = useCallback(() => {
    onClose();
    return true;
  }, [onClose]);
  useAndroidBack(handleBack, isOpen);

  if (!isOpen) return null;

  const toggleTabVisibility = (id: string) => {
    // Keep at least one visible tab
    const visibleCount = currentTabs.filter(t => t.isVisible).length;
    const target = currentTabs.find(t => t.id === id);
    if (target?.isVisible && visibleCount <= 1) return;

    const updated = currentTabs.map(t => {
      if (t.id === id) {
        return { ...t, isVisible: !t.isVisible };
      }
      return t;
    });
    setCurrentTabs(updated);
  };

  const handleAddCustomTab = () => {
    if (!newTabLabel.trim()) return;
    const customId = `tab_custom_${Date.now()}`;
    const newTab: NavTabItem = {
      id: customId,
      label: newTabLabel.trim(),
      iconName: 'Filter',
      isVisible: true,
      isCustom: true,
      customFilter: newTabCategory,
    };
    setCurrentTabs([...currentTabs, newTab]);
    setNewTabLabel('');
  };

  const handleReset = () => {
    setCurrentTabs(DEFAULT_NAV_TABS);
  };

  const handleSave = () => {
    onSaveTabs(currentTabs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-800 dark:border-amber-400/80 shadow-2xl p-6 text-stone-900 dark:text-stone-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base">จัดการแท็บเมนูหลัก</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400 my-3">
          คุณสามารถซ่อน/แสดงแท็บเมนู หรือเพิ่มแท็บคัดกรองตามหมวดหมู่ได้ตามใจชอบ
        </p>

        {/* Tab List */}
        <div className="space-y-2 my-4">
          {currentTabs.map(tab => (
            <div
              key={tab.id}
              className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
                tab.isVisible
                  ? 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700'
                  : 'bg-stone-100/50 dark:bg-stone-900/40 border-dashed border-stone-300 dark:border-stone-800 opacity-60'
              }`}
            >
              <div>
                <span className="font-bold text-xs block">{tab.label}</span>
                {tab.isCustom && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    แท็บปรับแต่ง (หมวด {tab.customFilter ? CATEGORY_LABELS[tab.customFilter as LenderCategory] || tab.customFilter : 'ทั้งหมด'})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {tab.isCustom && (
                  <button
                    onClick={() => setCurrentTabs(prev => prev.filter(t => t.id !== tab.id))}
                    className="p-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="ลบแท็บที่ปรับแต่งนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => toggleTabVisibility(tab.id)}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    tab.isVisible
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
                  }`}
                >
                  {tab.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>{tab.isVisible ? 'แสดงอยู่' : 'ซ่อนไว้'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Custom Tab Section */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 my-4 space-y-2.5">
          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>เพิ่มแท็บเมนูแบบกำหนดเอง</span>
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ชื่อแท็บ เช่น หนี้ธนาคาร"
              value={newTabLabel}
              onChange={e => setNewTabLabel(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
            />
            <select
              value={newTabCategory}
              onChange={e => setNewTabCategory(e.target.value as LenderCategory)}
              className="px-2 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium"
            >
              <option value="BANK">ธนาคาร</option>
              <option value="DIGITAL_LOAN">สินเชื่อดิจิทัล</option>
              <option value="CREDIT_CARD">บัตรเครดิต</option>
              <option value="AUTO_TITLE">จำนำทะเบียน / ไฟแนนซ์</option>
              <option value="OTHER">หนี้อื่นๆ / ส่วนบุคคล</option>
            </select>
          </div>
          <button
            onClick={handleAddCustomTab}
            disabled={!newTabLabel.trim()}
            className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
          >
            + บันทึกแท็บใหม่
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
