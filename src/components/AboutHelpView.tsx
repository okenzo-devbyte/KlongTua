import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  HelpCircle,
  Activity,
  Wrench,
  CheckCircle2,
  Info,
  Lock,
} from 'lucide-react';
import { LoanAccount, MonthlyPaymentRecord } from '../types/loan';
import { savePaymentRecords } from '../services/storageService';

interface AboutHelpViewProps {
  loans: LoanAccount[];
  paymentRecords: MonthlyPaymentRecord[];
  onRefreshState: () => void;
}

export const AboutHelpView: React.FC<AboutHelpViewProps> = ({
  loans,
  paymentRecords,
  onRefreshState,
}) => {
  const [repairMsg, setRepairMsg] = useState<string | null>(null);

  const diagnostics = useMemo(() => {
    const loanIds = new Set(loans.map(l => l.id));
    const orphanRecords = paymentRecords.filter(r => !loanIds.has(r.loanId));

    let storageBytes = 0;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) {
            storageBytes += k.length + (window.localStorage.getItem(k)?.length || 0);
          }
        }
      }
    } catch {}

    return {
      loanCount: loans.length,
      recordCount: paymentRecords.length,
      orphanCount: orphanRecords.length,
      storageKb: (storageBytes / 1024).toFixed(1),
    };
  }, [loans, paymentRecords]);

  const handleRepairOrphans = () => {
    const loanIds = new Set(loans.map(l => l.id));
    const cleaned = paymentRecords.filter(r => loanIds.has(r.loanId));
    savePaymentRecords(cleaned, true);
    onRefreshState();
    setRepairMsg(`ล้างประวัติกำพร้าออก ${diagnostics.orphanCount} รายการเรียบร้อยแล้ว`);
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
          <Info className="w-6 h-6 text-amber-600" />
          คู่มือการใช้งาน, นโยบาย PDPA & สุขภาพระบบ
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          คล่องตัว (KlongTua) เวอร์ชัน 2.0.0 — ระบบบริหารจัดการหนี้สินและกระแสเงินสดแบบ Offline-First 100%
        </p>
      </div>

      {/* Data Health Diagnostics */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            ตรวจสุขภาพข้อมูลในเครื่อง (Data Diagnostics)
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            Offline-First ปกติ
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <p className="text-[11px] text-stone-500">จำนวนสัญญา</p>
            <p className="text-lg font-extrabold font-mono-numbers text-stone-900 dark:text-white">
              {diagnostics.loanCount}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <p className="text-[11px] text-stone-500">ประวัติการชำระ</p>
            <p className="text-lg font-extrabold font-mono-numbers text-stone-900 dark:text-white">
              {diagnostics.recordCount}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <p className="text-[11px] text-stone-500">พื้นที่จัดเก็บที่ใช้</p>
            <p className="text-lg font-extrabold font-mono-numbers text-stone-900 dark:text-white">
              {diagnostics.storageKb} KB
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <p className="text-[11px] text-stone-500">ข้อมูลกำพร้า</p>
            <p className={`text-lg font-extrabold font-mono-numbers ${diagnostics.orphanCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {diagnostics.orphanCount}
            </p>
          </div>
        </div>

        {diagnostics.orphanCount > 0 && (
          <button
            type="button"
            onClick={handleRepairOrphans}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
          >
            <Wrench className="w-3.5 h-3.5" />
            ทำความสะอาดประวัติกำพร้า ({diagnostics.orphanCount} รายการ)
          </button>
        )}
        {repairMsg && (
          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {repairMsg}
          </p>
        )}
      </div>

      {/* Privacy Policy & PDPA */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          นโยบายความเป็นส่วนตัว & PDPA (Privacy Policy)
        </h2>
        <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-300 leading-relaxed list-disc pl-5">
          <li>
            <strong>จัดเก็บข้อมูลบนอุปกรณ์เท่านั้น (100% On-Device)</strong>: ข้อมูลสัญญาหนี้ ยอดเงิน และประวัติการชำระทั้งหมดถูกเก็บไว้ในอุปกรณ์ของคุณเท่านั้น ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์ภายนอก
          </li>
          <li>
            <strong>เสียงผู้ช่วยและการแจ้งเตือนแบบส่วนตัว</strong>: ระบบเสียงพูดใช้เครื่องมือเสียงในอุปกรณ์ (OS TTS) โดยไม่ส่งข้อความยอดหนี้ออกไปยังบริการภายนอก และสามารถเปิด “โหมดส่วนตัว” เพื่อปิดบังชื่อเจ้าหนี้และตัวเลขเงินได้
          </li>
          <li>
            <strong>ความปลอดภัยรหัส PIN</strong>: รหัส PIN ถูกเข้ารหัสด้วย PBKDF2-SHA256 พร้อม Random Salt และจะไม่ถูกส่งออกในไฟล์สำรองข้อมูล JSON
          </li>
          <li>
            <strong>สิทธิ์การลบและย้ายข้อมูล</strong>: คุณสามารถส่งออกข้อมูลทั้งหมดเป็น JSON/Excel/CSV/PDF หรือล้างข้อมูลทั้งหมดออกจากเครื่องได้ทันทีในหน้าตั้งค่า
          </li>
        </ul>
      </div>

      {/* Quick FAQ */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600" />
          คำถามที่พบบ่อย (FAQ)
        </h2>
        <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300">
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50">
            <p className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              เปลี่ยนเครื่องใหม่ ย้ายข้อมูลอย่างไร?
            </p>
            <p className="mt-1">
              ไปที่เมนู <strong>สำรองข้อมูล</strong> แล้วกดส่งออกไฟล์ JSON เก็บไว้ จากนั้นนำไปกด “กู้คืนข้อมูล” ในเครื่องใหม่ (รหัส PIN จะต้องตั้งใหม่ในเครื่องใหม่เพื่อความปลอดภัย)
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50">
            <p className="font-bold text-stone-900 dark:text-white">
              Avalanche กับ Snowball ต่างกันอย่างไร?
            </p>
            <p className="mt-1">
              <strong>Avalanche</strong> ปิดหนี้ที่อัตราดอกเบี้ยสูงสุดก่อนเพื่อประหยัดดอกเบี้ยรวมมากที่สุด ส่วน <strong>Snowball</strong> ปิดหนี้ก้อนเล็กสุดก่อนเพื่อลดจำนวนบิลและสร้างกำลังใจได้เร็วกว่า
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
