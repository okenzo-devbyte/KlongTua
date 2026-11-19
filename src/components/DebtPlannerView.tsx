import React, { useMemo, useState } from 'react';
import {
  TrendingDown,
  Flame,
  Snowflake,
  Sliders,
  Calculator,
  CheckCircle2,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { LoanAccount } from '../types/loan';
import { comparePayoffStrategies, simulateRefinance } from '../utils/payoffSimulator';
import { formatCurrency } from '../utils/cashflowCalculator';

interface DebtPlannerViewProps {
  loans: LoanAccount[];
  onAddNewLoan?: () => void;
}

export const DebtPlannerView: React.FC<DebtPlannerViewProps> = ({ loans, onAddNewLoan }) => {
  const [extraMonthly, setExtraMonthly] = useState<number>(2000);
  const [activeStrategy, setActiveStrategy] = useState<'AVALANCHE' | 'SNOWBALL'>('AVALANCHE');
  const [selectedRefiIds, setSelectedRefiIds] = useState<string[]>(() =>
    loans.filter(l => l.isActive && l.remainingPrincipal > 0).map(l => l.id)
  );
  const [refiRate, setRefiRate] = useState<number>(9.5);
  const [refiMonths, setRefiMonths] = useState<number>(36);

  const activeLoans = useMemo(
    () => loans.filter(l => l.isActive && l.remainingPrincipal > 0),
    [loans]
  );

  const comparison = useMemo(
    () => comparePayoffStrategies(activeLoans, extraMonthly),
    [activeLoans, extraMonthly]
  );

  const selectedPlan = activeStrategy === 'AVALANCHE' ? comparison.avalanche : comparison.snowball;

  const refiResult = useMemo(
    () =>
      simulateRefinance(activeLoans, {
        selectedLoanIds: selectedRefiIds,
        newInterestRateAnnual: refiRate,
        newTenureMonths: refiMonths,
      }),
    [activeLoans, selectedRefiIds, refiRate, refiMonths]
  );

  const toggleRefiLoan = (id: string) => {
    setSelectedRefiIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  if (activeLoans.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
          <TrendingDown className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-white">
          ยังไม่มีสัญญาหนี้ที่ใช้งานอยู่สำหรับวางแผนปลดหนี้
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          เพิ่มสัญญาหนี้สินอย่างน้อย 1 รายการ เพื่อคำนวณวันปลดหนี้ เปรียบเทียบ Snowball / Avalanche และจำลองการรวมหนี้
        </p>
        {onAddNewLoan && (
          <button
            type="button"
            onClick={onAddNewLoan}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold"
          >
            เพิ่มสัญญาหนี้แรก
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-amber-600" />
            วางแผนปลดหนี้ & จำลองรวมหนี้
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            เปรียบเทียบกลยุทธ์ปิดหนี้ Avalanche (ดอกเบี้ยสูงก่อน) vs Snowball (ยอดเล็กก่อน) และคำนวณวันเป็นไทจากหนี้
          </p>
        </div>
      </div>

      {/* Extra Payment Slider Card */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-extrabold text-stone-800 dark:text-stone-100">
              จำลองเพิ่มเงินโปะต่อเดือน
            </span>
          </div>
          <span className="text-lg font-extrabold font-mono-numbers text-amber-600 dark:text-amber-400">
            +฿{formatCurrency(extraMonthly)} / เดือน
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={25000}
          step={500}
          value={extraMonthly}
          onChange={e => setExtraMonthly(Number(e.target.value))}
          className="w-full accent-amber-600 cursor-pointer"
        />
        <div className="flex justify-between text-[11px] font-mono-numbers text-stone-400">
          <span>฿0 (จ่ายขั้นต่ำ)</span>
          <span>+฿5,000</span>
          <span>+฿15,000</span>
          <span>+฿25,000</span>
        </div>

        {/* Impact Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40">
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> วันปลดหนี้โดยประมาณ
            </p>
            <p className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200 mt-1">
              {selectedPlan.debtFreeLabelTh}
            </p>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
              ใช้เวลา {selectedPlan.totalMonths} เดือน
              {comparison.monthsSavedVsBaseline > 0 && ` (เร็วขึ้น ${comparison.monthsSavedVsBaseline} เดือน)`}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40">
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> ดอกเบี้ยที่ประหยัดได้
            </p>
            <p className="text-xl font-extrabold font-mono-numbers text-amber-800 dark:text-amber-200 mt-1">
              ฿{formatCurrency(comparison.interestSavedVsBaseline)}
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
              เทียบกับการจ่ายเฉพาะขั้นต่ำ
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <p className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
              ดอกเบี้ยรวมตลอดแผน
            </p>
            <p className="text-xl font-extrabold font-mono-numbers text-stone-900 dark:text-white mt-1">
              ฿{formatCurrency(selectedPlan.totalInterestPaid)}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              ยอดจ่ายรวม ฿{formatCurrency(selectedPlan.totalAmountPaid)}
            </p>
          </div>
        </div>
      </div>

      {/* Strategy Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveStrategy('AVALANCHE')}
          className={`text-left p-5 rounded-3xl border-2 transition-all ${
            activeStrategy === 'AVALANCHE'
              ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-md'
              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-stone-900 dark:text-white">
              <Flame className="w-4 h-4 text-rose-500" />
              Avalanche (ปิดดอกเบี้ยสูงก่อน)
            </span>
            {comparison.recommendedStrategy === 'AVALANCHE' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                ประหยัดสุด
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            ทุ่มเงินโปะไปที่สัญญาที่อัตราดอกเบี้ยต่อปีสูงสุดก่อน ช่วยลดต้นทุนดอกเบี้ยรวมได้มากที่สุด
          </p>
          <div className="mt-3 flex items-baseline justify-between text-xs">
            <span className="text-stone-500">หมดหนี้ใน {comparison.avalanche.totalMonths} เดือน ({comparison.avalanche.debtFreeLabelTh})</span>
            <span className="font-mono-numbers font-extrabold text-stone-900 dark:text-white">
              ดอกเบี้ย ฿{formatCurrency(comparison.avalanche.totalInterestPaid)}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveStrategy('SNOWBALL')}
          className={`text-left p-5 rounded-3xl border-2 transition-all ${
            activeStrategy === 'SNOWBALL'
              ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-md'
              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-stone-900 dark:text-white">
              <Snowflake className="w-4 h-4 text-sky-500" />
              Snowball (ปิดยอดหนี้เล็กก่อน)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
              ได้กำลังใจไว
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            ปิดสัญญายอดคงเหลือน้อยที่สุดก่อน เพื่อลดจำนวนบิลต่อเดือนให้เห็นผลเร็วและมีกำลังใจต่อเนื่อง
          </p>
          <div className="mt-3 flex items-baseline justify-between text-xs">
            <span className="text-stone-500">หมดหนี้ใน {comparison.snowball.totalMonths} เดือน ({comparison.snowball.debtFreeLabelTh})</span>
            <span className="font-mono-numbers font-extrabold text-stone-900 dark:text-white">
              ดอกเบี้ย ฿{formatCurrency(comparison.snowball.totalInterestPaid)}
            </span>
          </div>
        </button>
      </div>

      {/* Per-Loan Payoff Order */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
          ลำดับการปลดหนี้รายสัญญา ({activeStrategy === 'AVALANCHE' ? 'Avalanche' : 'Snowball'})
        </h3>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {selectedPlan.loanResults
            .slice()
            .sort((a, b) => a.monthsToPayoff - b.monthsToPayoff)
            .map((item, idx) => (
              <div key={item.loanId} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-900 dark:text-white truncate">
                    {idx + 1}. {item.loanTitle}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    คงเหลือ ฿{formatCurrency(item.startingBalance)} · ดอกเบี้ย {item.interestRateAnnual}%/ปี
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    ปิดจบ {item.payoffLabelTh}
                  </p>
                  <p className="text-[11px] font-mono-numbers text-stone-500">
                    {item.monthsToPayoff} เดือน · ดอก ฿{formatCurrency(item.totalInterestPaid)}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Refinance / Consolidation Simulator */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
            จำลองรวมหนี้ / รีไฟแนนซ์ (Debt Consolidation)
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeLoans.map(loan => {
            const checked = selectedRefiIds.includes(loan.id);
            return (
              <button
                key={loan.id}
                type="button"
                onClick={() => toggleRefiLoan(loan.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  checked
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
              >
                {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                {loan.title} (฿{formatCurrency(loan.remainingPrincipal)})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              อัตราดอกเบี้ยใหม่ (% ต่อปี)
            </span>
            <input
              type="number"
              min={0}
              max={36}
              step={0.5}
              value={refiRate}
              onChange={e => setRefiRate(Math.max(0, Number(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm font-mono-numbers font-bold"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              ระยะเวลาผ่อนใหม่ (เดือน)
            </span>
            <input
              type="number"
              min={3}
              max={120}
              step={6}
              value={refiMonths}
              onChange={e => setRefiMonths(Math.max(1, Number(e.target.value) || 12))}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm font-mono-numbers font-bold"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <p className="text-[11px] text-stone-500">ยอดรวมหนี้ที่เลือก</p>
            <p className="text-base font-extrabold font-mono-numbers text-stone-900 dark:text-white">
              ฿{formatCurrency(refiResult.totalConsolidatedPrincipal)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <p className="text-[11px] text-stone-500">ค่างวดใหม่เทียบเดิม</p>
            <p className="text-base font-extrabold font-mono-numbers text-stone-900 dark:text-white">
              ฿{formatCurrency(refiResult.newMonthlyPayment)}/ด.
            </p>
            <p className={`text-[11px] font-bold ${refiResult.monthlySavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {refiResult.monthlySavings >= 0
                ? `เบาลง ฿${formatCurrency(refiResult.monthlySavings)}/ด.`
                : `เพิ่มขึ้น ฿${formatCurrency(Math.abs(refiResult.monthlySavings))}/ด.`}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
            <p className="text-[11px] text-stone-500">ผลต่างดอกเบี้ยรวม</p>
            <p className={`text-base font-extrabold font-mono-numbers ${refiResult.interestSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {refiResult.interestSavings >= 0 ? 'ประหยัด ' : 'เพิ่ม '}฿{formatCurrency(Math.abs(refiResult.interestSavings))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
