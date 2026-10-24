import React, { useState, useCallback } from 'react';
import {
  LoanAccount,
  LoanSubItem,
  LoanType,
} from '../types/loan';
import { LENDERS_CATALOG } from '../data/lenders';
import { LenderIcon } from './LenderIcon';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { alertMessage } from '../services/native/dialog';
import { formatCurrency } from '../utils/cashflowCalculator';
import {
  Plus,
  Trash2,
  Search,
  Layers,
  Copy,
} from 'lucide-react';

interface LoanFormModalProps {
  initialLoan?: LoanAccount | null;
  onSave: (loan: LoanAccount) => void;
  onClose: () => void;
}

export const LoanFormModal: React.FC<LoanFormModalProps> = ({
  initialLoan,
  onSave,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2>(initialLoan ? 2 : 1);

  const handleBack = useCallback(() => {
    onClose();
    return true;
  }, [onClose]);
  useAndroidBack(handleBack);

  // Selected Lender
  const [selectedLenderId, setSelectedLenderId] = useState<string>(initialLoan?.lenderId || 'kbank');
  const [customLenderName, setCustomLenderName] = useState<string>(initialLoan?.customLenderName || '');
  const [lenderCategoryFilter, setLenderCategoryFilter] = useState<string>('ALL');
  const [lenderSearch, setLenderSearch] = useState<string>('');

  // Loan Details - Start clean for new loans so users can freely enter their own amounts
  const [title, setTitle] = useState<string>(initialLoan?.title || '');
  const [contractNumber, setContractNumber] = useState<string>(initialLoan?.contractNumber || '');
  const [loanType, setLoanType] = useState<LoanType>(initialLoan?.loanType || 'FLAT_RATE');
  const [totalPrincipal, setTotalPrincipal] = useState<string>(
    initialLoan?.totalPrincipal ? initialLoan.totalPrincipal.toString() : ''
  );
  const [remainingPrincipal, setRemainingPrincipal] = useState<string>(
    initialLoan?.remainingPrincipal ? initialLoan.remainingPrincipal.toString() : ''
  );
  const [interestRate, setInterestRate] = useState<string>(
    initialLoan?.interestRateAnnual !== undefined ? initialLoan.interestRateAnnual.toString() : ''
  );
  const [totalInstallments, setTotalInstallments] = useState<string>(
    initialLoan?.totalInstallments ? initialLoan.totalInstallments.toString() : ''
  );
  const [notes, setNotes] = useState<string>(initialLoan?.notes || '');

  // Sub-items Schedule (Default to 1 single monthly installment for new loans)
  const initialMonthlySum = initialLoan?.subItems?.reduce((sum, s) => sum + (Number(s.amount) || 0), 0) || 0;
  const [monthlyInput, setMonthlyInput] = useState<string>(
    initialMonthlySum > 0 ? initialMonthlySum.toString() : ''
  );

  const [subItems, setSubItems] = useState<LoanSubItem[]>(
    initialLoan?.subItems?.length
      ? initialLoan.subItems
      : [
          {
            id: 'sub-1',
            loanId: '',
            title: 'งวดประจำเดือน',
            dueDayOfMonth: 28,
            dueTime: '18:00',
            amount: 0,
            subType: 'SPLIT_DAY',
          },
        ]
  );

  const selectedLender = LENDERS_CATALOG.find(l => l.id === selectedLenderId) || LENDERS_CATALOG[0];

  // Filter Catalog
  const filteredLenders = LENDERS_CATALOG.filter(l => {
    if (lenderCategoryFilter !== 'ALL' && l.category !== lenderCategoryFilter) return false;
    if (lenderSearch.trim()) {
      const q = lenderSearch.toLowerCase();
      return (
        l.nameTh.toLowerCase().includes(q) ||
        l.nameEn.toLowerCase().includes(q) ||
        l.badgeText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate Sub-items Total
  const totalSubAmount = subItems.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Distribute a total monthly amount evenly across current subItems
  const distributeMonthlyAmount = (rawAmountStr: string, targetSubs: LoanSubItem[] = subItems) => {
    setMonthlyInput(rawAmountStr);
    const total = Math.max(0, parseFloat(rawAmountStr) || 0);
    const count = targetSubs.length;
    if (count === 0) return;

    if (count === 1) {
      setSubItems([{ ...targetSubs[0], amount: total }]);
      return;
    }

    const basePart = Math.floor(total / count);
    const remainder = Math.round((total - basePart * count) * 100) / 100;
    setSubItems(
      targetSubs.map((s, idx) => ({
        ...s,
        amount: idx === count - 1 ? basePart + remainder : basePart,
      }))
    );
  };

  // Quick Preset Handlers (Respects user's entered monthly amount)
  const applyPresetSchedule = (type: 'SINGLE' | '2_PARTS' | '3_PARTS' | 'WEEKLY') => {
    const baseTotal =
      parseFloat(monthlyInput) > 0
        ? parseFloat(monthlyInput)
        : totalSubAmount > 0
        ? totalSubAmount
        : 0;

    if (type === 'SINGLE') {
      const nextSubs: LoanSubItem[] = [
        {
          id: `sub-${Date.now()}-1`,
          loanId: initialLoan?.id || '',
          title: 'งวดประจำเดือน',
          dueDayOfMonth: 28,
          dueTime: '18:00',
          amount: baseTotal,
          subType: 'SPLIT_DAY',
        },
      ];
      setSubItems(nextSubs);
      if (loanType === 'MULTI_DAY_SPLIT') setLoanType('FLAT_RATE');
    } else if (type === '2_PARTS') {
      const half = Math.floor(baseTotal / 2);
      const nextSubs: LoanSubItem[] = [
        {
          id: `sub-${Date.now()}-1`,
          loanId: initialLoan?.id || '',
          title: 'งวดรอบที่ 1 (ต้นเดือน)',
          dueDayOfMonth: 5,
          dueTime: '18:00',
          amount: half,
          subType: 'SPLIT_DAY',
        },
        {
          id: `sub-${Date.now()}-2`,
          loanId: initialLoan?.id || '',
          title: 'งวดรอบที่ 2 (ปลายเดือน)',
          dueDayOfMonth: 20,
          dueTime: '18:00',
          amount: Math.max(0, baseTotal - half),
          subType: 'SPLIT_DAY',
        },
      ];
      setSubItems(nextSubs);
      setLoanType('MULTI_DAY_SPLIT');
    } else if (type === '3_PARTS') {
      const part = Math.floor(baseTotal / 3);
      const nextSubs: LoanSubItem[] = [
        {
          id: `sub-${Date.now()}-1`,
          loanId: initialLoan?.id || '',
          title: 'งวดต้นเดือน (วันที่ 5)',
          dueDayOfMonth: 5,
          dueTime: '18:00',
          amount: part,
          subType: 'SPLIT_DAY',
        },
        {
          id: `sub-${Date.now()}-2`,
          loanId: initialLoan?.id || '',
          title: 'งวดกลางเดือน (วันที่ 15)',
          dueDayOfMonth: 15,
          dueTime: '18:00',
          amount: part,
          subType: 'SPLIT_DAY',
        },
        {
          id: `sub-${Date.now()}-3`,
          loanId: initialLoan?.id || '',
          title: 'งวดปลายเดือน (วันที่ 25)',
          dueDayOfMonth: 25,
          dueTime: '18:00',
          amount: Math.max(0, baseTotal - part * 2),
          subType: 'SPLIT_DAY',
        },
      ];
      setSubItems(nextSubs);
      setLoanType('MULTI_DAY_SPLIT');
    } else if (type === 'WEEKLY') {
      const q = Math.floor(baseTotal / 4);
      const nextSubs: LoanSubItem[] = [
        { id: `sub-${Date.now()}-1`, loanId: initialLoan?.id || '', title: 'สัปดาห์ที่ 1 (วันที่ 7)', dueDayOfMonth: 7, dueTime: '18:00', amount: q, subType: 'SPLIT_DAY' },
        { id: `sub-${Date.now()}-2`, loanId: initialLoan?.id || '', title: 'สัปดาห์ที่ 2 (วันที่ 14)', dueDayOfMonth: 14, dueTime: '18:00', amount: q, subType: 'SPLIT_DAY' },
        { id: `sub-${Date.now()}-3`, loanId: initialLoan?.id || '', title: 'สัปดาห์ที่ 3 (วันที่ 21)', dueDayOfMonth: 21, dueTime: '18:00', amount: q, subType: 'SPLIT_DAY' },
        { id: `sub-${Date.now()}-4`, loanId: initialLoan?.id || '', title: 'สัปดาห์ที่ 4 (วันที่ 28)', dueDayOfMonth: 28, dueTime: '18:00', amount: Math.max(0, baseTotal - q * 3), subType: 'SPLIT_DAY' },
      ];
      setSubItems(nextSubs);
      setLoanType('MULTI_DAY_SPLIT');
    }
  };

  // Add new sub-item
  const handleAddSubItem = () => {
    const newSub: LoanSubItem = {
      id: `sub-${Date.now()}`,
      loanId: initialLoan?.id || '',
      title: `งวดย่อยที่ ${subItems.length + 1}`,
      dueDayOfMonth: Math.min(28, (subItems.length + 1) * 7),
      dueTime: '18:00',
      amount: 0,
      subType: 'SPLIT_DAY',
    };
    const next = [...subItems, newSub];
    setSubItems(next);
  };

  // Remove sub-item
  const handleRemoveSubItem = (id: string) => {
    if (subItems.length <= 1) {
      void alertMessage('สัญญาสินเชื่อต้องมีอย่างน้อย 1 งวดการชำระ');
      return;
    }
    const next = subItems.filter(s => s.id !== id);
    setSubItems(next);
    const newSum = next.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    setMonthlyInput(newSum > 0 ? newSum.toString() : '');
  };

  // Update sub-item
  const handleUpdateSubItem = (id: string, field: keyof LoanSubItem, val: any) => {
    const next = subItems.map(s => {
      if (s.id === id) {
        return { ...s, [field]: val };
      }
      return s;
    });
    setSubItems(next);
    if (field === 'amount') {
      const newSum = next.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      setMonthlyInput(newSum > 0 ? newSum.toString() : '');
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTitle = title.trim() || (selectedLenderId === 'custom' ? customLenderName.trim() : selectedLender.nameTh);
    if (!finalTitle) {
      await alertMessage('กรุณาระบุชื่อรายการสินเชื่อ');
      return;
    }

    if (subItems.length === 0) {
      await alertMessage('กรุณากำหนดงวดการชำระอย่างน้อย 1 รายการ');
      return;
    }

    // If user typed monthlyInput but left sub-item amount at 0, apply monthlyInput
    let finalSubs = subItems;
    const currentSubSum = subItems.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const typedMonthly = parseFloat(monthlyInput) || 0;
    if (currentSubSum <= 0 && typedMonthly > 0) {
      const part = Math.floor(typedMonthly / subItems.length);
      const rem = typedMonthly - part * subItems.length;
      finalSubs = subItems.map((s, i) => ({
        ...s,
        amount: i === subItems.length - 1 ? part + rem : part,
      }));
    }

    const totalSubVerify = finalSubs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    if (totalSubVerify <= 0) {
      await alertMessage('กรุณาระบุยอดผ่อนชำระต่อเดือน หรือจำนวนเงินในแต่ละงวดให้มากกว่า 0 บาท');
      return;
    }

    const parsedTotPrincipal = parseFloat(totalPrincipal) || 0;
    const parsedRemPrincipal = parseFloat(remainingPrincipal) || 0;
    const effectiveRem = parsedRemPrincipal > 0 ? parsedRemPrincipal : (parsedTotPrincipal > 0 ? parsedTotPrincipal : totalSubVerify);
    const effectiveTot = parsedTotPrincipal > 0 ? parsedTotPrincipal : effectiveRem;
    const parsedInstallments = parseInt(totalInstallments, 10);

    const loanId = initialLoan?.id || `loan-${Date.now()}`;

    const newLoan: LoanAccount = {
      id: loanId,
      lenderId: selectedLenderId,
      customLenderName: selectedLenderId === 'custom' ? (customLenderName.trim() || finalTitle) : undefined,
      title: finalTitle,
      contractNumber: contractNumber.trim() || undefined,
      loanType,
      totalPrincipal: effectiveTot,
      remainingPrincipal: effectiveRem,
      interestRateAnnual: parseFloat(interestRate) || 0,
      totalInstallments: parsedInstallments > 0 ? parsedInstallments : undefined,
      startDate: initialLoan?.startDate || new Date().toISOString().substring(0, 10),
      subItems: finalSubs.map(s => ({
        ...s,
        loanId,
        amount: Number(s.amount) || 0,
        dueDayOfMonth: Math.min(31, Math.max(1, Number(s.dueDayOfMonth) || 1)),
        dueTime: s.dueTime || '18:00',
      })),
      isActive: true,
      notes: notes.trim() || undefined,
      createdAt: initialLoan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newLoan);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 my-auto max-h-[92vh] flex flex-col text-stone-900 dark:text-stone-100">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <LenderIcon lender={selectedLender} size="md" />
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialLoan ? 'แก้ไขสัญญาสินเชื่อ & กำหนดค่างวด' : 'เพิ่มสัญญาสินเชื่อ & กำหนดยอดผ่อนชำระ'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                    step === 1
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  1. เลือกผู้ให้บริการ ({selectedLender.badgeText})
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                    step === 2
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  2. กำหนดยอดสินเชื่อ & งวดชำระ
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-lg font-bold p-1.5 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          
          {/* STEP 1: Select Lender from Catalog */}
          {step === 1 ? (
            <div className="space-y-4">
              {/* Search & Category Pills */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-stone-400 dark:text-stone-500" />
                  <input
                    type="text"
                    value={lenderSearch}
                    onChange={e => setLenderSearch(e.target.value)}
                    placeholder="ค้นหาธนาคารหรือแอปสินเชื่อ เช่น กสิกร, SPayLater, FINNIX, เงินติดล้อ..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold scrollbar-none">
                  {[
                    { id: 'ALL', label: 'ทั้งหมด' },
                    { id: 'BANK', label: 'ธนาคารไทย' },
                    { id: 'DIGITAL_LOAN', label: 'สินเชื่อดิจิทัล' },
                    { id: 'CREDIT_CARD', label: 'บัตรกดเงินสด' },
                    { id: 'AUTO_TITLE', label: 'จำนำทะเบียน' },
                    { id: 'OTHER', label: 'อื่นๆ/บุคคล' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setLenderCategoryFilter(cat.id)}
                      className={`px-3 py-1 rounded-xl shrink-0 transition-colors ${
                        lenderCategoryFilter === cat.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Lenders */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                {filteredLenders.map(lender => {
                  const isSelected = selectedLenderId === lender.id;
                  return (
                    <button
                      key={lender.id}
                      type="button"
                      onClick={() => {
                        setSelectedLenderId(lender.id);
                        if (!title) setTitle(lender.id === 'custom' ? '' : lender.nameTh);
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 shadow-sm ring-1 ring-amber-600 font-bold'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50/50 dark:hover:bg-stone-800/50'
                      }`}
                    >
                      <LenderIcon lender={lender} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">{lender.nameTh}</div>
                        <div className="text-[10px] text-stone-400 truncate">{lender.badgeText}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedLenderId === 'custom' && (
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">ระบุชื่อผู้ให้บริการ / เจ้าหนี้กำหนดเอง:</label>
                  <input
                    type="text"
                    value={customLenderName}
                    onChange={e => {
                      setCustomLenderName(e.target.value);
                      if (!title) setTitle(e.target.value);
                    }}
                    placeholder="เช่น สหกรณ์ออมทรัพย์, สินเชื่อร้านทอง, ยืมบุคคล"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                  />
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Loan Amounts & Sub-Installments */
            <form id="loanForm" onSubmit={handleSubmit} className="space-y-4">
              
              {/* 1. Primary Loan Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">ชื่อรายการสินเชื่อ *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="เช่น สินเชื่อกสิกรไทย, ผ่อนโทรศัพท์ SPayLater"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 placeholder-stone-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">ประเภทสินเชื่อ</label>
                  <select
                    value={loanType}
                    onChange={e => setLoanType(e.target.value as LoanType)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white dark:bg-stone-800/80 text-stone-900 dark:text-stone-100"
                  >
                    <option value="FLAT_RATE">ดอกเบี้ยคงที่ / ผ่อนรายเดือนคงที่</option>
                    <option value="EFFECTIVE_RATE">ลดต้นลดดอก (Effective Rate)</option>
                    <option value="MULTI_DAY_SPLIT">แบ่งจ่ายหลายรอบในเดือนเดียว</option>
                    <option value="INSTALLMENT_PLAN">ผ่อนสินค้า / บิลย่อย (BNPL)</option>
                    <option value="REVOLVING_MIN">วงเงินหมุนเวียน / จ่ายขั้นต่ำ</option>
                    <option value="PERSONAL_LOAN">สินเชื่อส่วนบุคคล / ทั่วไป</option>
                  </select>
                </div>
              </div>

              {/* 2. Principal, Remaining Balance, Interest & Installments */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-800 dark:text-stone-200">
                    กำหนดยอดวงเงินสินเชื่อและภาระหนี้ (กรอกตามจริงได้อย่างอิสระ)
                  </span>
                  {totalPrincipal && totalPrincipal !== remainingPrincipal && (
                    <button
                      type="button"
                      onClick={() => setRemainingPrincipal(totalPrincipal)}
                      className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Copy size={11} />
                      <span>ใช้ยอดเดียวกับวงเงินตั้งต้น</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      วงเงินสินเชื่อตั้งต้น (บาท)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-stone-400">฿</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={totalPrincipal}
                        onChange={e => {
                          setTotalPrincipal(e.target.value);
                          if (!remainingPrincipal) {
                            setRemainingPrincipal(e.target.value);
                          }
                        }}
                        placeholder="เช่น 50000 (เว้นว่างได้)"
                        className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono-numbers font-bold bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      ยอดหนี้คงเหลือปัจจุบัน (บาท)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-stone-400">฿</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={remainingPrincipal}
                        onChange={e => setRemainingPrincipal(e.target.value)}
                        placeholder="เช่น 35000"
                        className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono-numbers font-bold bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                      อัตราดอกเบี้ยต่อปี (%)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={interestRate}
                      onChange={e => setInterestRate(e.target.value)}
                      placeholder="เช่น 15 หรือ 0"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono-numbers bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                      จำนวนงวดทั้งหมด (งวด)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={totalInstallments}
                      onChange={e => setTotalInstallments(e.target.value)}
                      placeholder="เช่น 12, 24, 36"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono-numbers bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                      เลขที่สัญญา / อ้างอิง
                    </label>
                    <input
                      type="text"
                      value={contractNumber}
                      onChange={e => setContractNumber(e.target.value)}
                      placeholder="ระบุหรือไม่ก็ได้"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Direct Monthly Payment Input + Sub-Schedule Builder */}
              <div className="p-4 rounded-2xl bg-stone-50/90 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-3.5">
                
                {/* Direct Monthly Payment Total Field */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border-2 border-amber-500/40 dark:border-amber-500/30 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-extrabold text-stone-900 dark:text-stone-100 block">
                        💰 ยอดผ่อนชำระรวมต่อเดือน (บาท) *
                      </label>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">
                        พิมพ์ยอดที่ต้องจ่ายต่อเดือน ระบบจะกระจายลงงวดชำระด้านล่างให้อัตโนมัติ
                      </span>
                    </div>

                    <div className="relative sm:w-52">
                      <span className="absolute left-3 top-2 text-sm font-extrabold text-amber-600">฿</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={monthlyInput}
                        onChange={e => distributeMonthlyAmount(e.target.value)}
                        placeholder="ระบุยอดผ่อน/เดือน"
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-amber-400 dark:border-amber-600 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono-numbers font-extrabold bg-amber-50/40 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>

                  {/* Quick Amount Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-stone-400 font-semibold mr-1">เลือกยอดด่วน:</span>
                    {[500, 1000, 1500, 2500, 3500, 5000, 10000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => distributeMonthlyAmount(amt.toString())}
                        className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-700 dark:text-stone-300 text-[10px] font-bold font-mono-numbers border border-stone-200 dark:border-stone-700 transition-colors"
                      >
                        ฿{formatCurrency(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule Split Mode Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div>
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <Layers size={14} className="text-amber-600 dark:text-amber-400" />
                      <span>รูปแบบงวดการจ่ายในแต่ละเดือน ({subItems.length} งวด/เดือน)</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      เลือกจ่ายครั้งเดียวต่อเดือน หรือแบ่งจ่ายหลายวันตามต้องการ
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPresetSchedule('SINGLE')}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                        subItems.length === 1
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      จ่ายครั้งเดียว/เดือน
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetSchedule('2_PARTS')}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                        subItems.length === 2
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      แบ่ง 2 รอบ (5, 20)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetSchedule('3_PARTS')}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                        subItems.length === 3
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      แบ่ง 3 รอบ (5, 15, 25)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetSchedule('WEEKLY')}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                        subItems.length === 4
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      4 สัปดาห์
                    </button>
                  </div>
                </div>

                {/* Sub-items List */}
                <div className="space-y-2">
                  {subItems.map((sub, index) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl bg-white dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                          {subItems.length === 1 ? 'รายละเอียดงวดชำระประจำเดือน' : `งวดย่อยที่ ${index + 1}`}
                        </span>
                        {subItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubItem(sub.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="ลบงวดย่อยนี้"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Title */}
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-stone-400 block mb-0.5">ชื่องวดชำระ</label>
                          <input
                            type="text"
                            value={sub.title}
                            onChange={e => handleUpdateSubItem(sub.id, 'title', e.target.value)}
                            placeholder="เช่น งวดประจำเดือน"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/60 text-stone-900 dark:text-stone-100"
                          />
                        </div>

                        {/* Due Day of Month */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-stone-400 block mb-0.5">ทุกวันที่ (1-31)</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={sub.dueDayOfMonth}
                            onChange={e => handleUpdateSubItem(sub.id, 'dueDayOfMonth', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/60 font-mono-numbers text-center font-bold text-stone-900 dark:text-stone-100"
                          />
                        </div>

                        {/* Due Time */}
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-stone-400 block mb-0.5">เวลาแจ้งเตือน</label>
                          <input
                            type="time"
                            value={sub.dueTime || '18:00'}
                            onChange={e => handleUpdateSubItem(sub.id, 'dueTime', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/60 font-mono-numbers text-stone-900 dark:text-stone-100"
                          />
                        </div>

                        {/* Amount */}
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-stone-400 block mb-0.5">ยอดชำระงวดนี้ (฿)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={sub.amount || ''}
                            onChange={e => handleUpdateSubItem(sub.id, 'amount', e.target.value)}
                            placeholder="ระบุยอดเงิน"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-stone-50/50 dark:bg-stone-900/60 font-mono-numbers font-extrabold text-amber-700 dark:text-amber-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Sub Item Button & Total Monthly Due for this loan */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleAddSubItem}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    <Plus size={14} /> เพิ่มงวดแบ่งจ่ายในเดือนอีก 1 รายการ
                  </button>

                  <div className="text-right">
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">ยอดรวมต่อเดือนของสัญญานี้: </span>
                    <span className="text-sm font-extrabold font-mono-numbers text-amber-600 dark:text-amber-400">
                      ฿{formatCurrency(totalSubAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="เช่น ตัดบัญชีอัตโนมัติ หรือ โปะเพิ่มได้ไม่เสียค่าธรรมเนียม"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 placeholder-stone-400"
                />
              </div>

            </form>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              ← เปลี่ยนผู้ให้บริการ
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              ยกเลิก
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-md shadow-amber-600/20"
              >
                ถัดไป: กำหนดยอดสินเชื่อ & ค่างวด →
              </button>
            ) : (
              <button
                type="submit"
                form="loanForm"
                className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-md shadow-amber-600/20"
              >
                {initialLoan ? 'บันทึกการแก้ไขสัญญา' : 'บันทึกสัญญาสินเชื่อ'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
