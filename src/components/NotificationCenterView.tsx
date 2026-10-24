import React, { useState } from 'react';
import { 
  NotificationRule, 
  MonthlyInstallmentTask, 
  NotificationUnit,
  ThaiVoiceConfig
} from '../types/loan';
import { 
  computeNotificationTriggerTimes, 
  requestNotificationPermission, 
  ensureExactAlarmPermission,
  sendTestNotification,
  syncScheduledNotifications,
  ScheduledAlert 
} from '../services/notificationService';
import { playNotificationChime } from '../services/thaiVoiceService';
import { saveNotificationRules } from '../services/storageService';
import { 
  Bell, 
  BellOff,
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Volume2, 
  VolumeX
} from 'lucide-react';

interface NotificationCenterViewProps {
  rules: NotificationRule[];
  tasks: MonthlyInstallmentTask[];
  voiceConfig?: ThaiVoiceConfig;
  onUpdateRules: (newRules: NotificationRule[]) => void;
  onUpdateVoiceConfig?: (cfg: ThaiVoiceConfig) => void;
}

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  rules,
  tasks,
  voiceConfig,
  onUpdateRules,
  onUpdateVoiceConfig,
}) => {
  const [testSentToast, setTestSentToast] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // New Rule Form state
  const [newUnit, setNewUnit] = useState<NotificationUnit>('DAYS');
  const [newAmount, setNewAmount] = useState<number>(2);
  const [newTimeOfDay, setNewTimeOfDay] = useState<string>('09:00');

  // Compute live upcoming alert triggers
  const upcomingAlerts: ScheduledAlert[] = [];
  for (const t of tasks) {
    const alerts = computeNotificationTriggerTimes(t, rules);
    upcomingAlerts.push(...alerts);
  }
  // Sort by trigger time ascending
  upcomingAlerts.sort((a, b) => a.triggerTime.getTime() - b.triggerTime.getTime());

  // Toggle Rule Enable/Disable
  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    saveNotificationRules(updated);
    onUpdateRules(updated);
  };

  // Delete Rule
  const handleDeleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    saveNotificationRules(updated);
    onUpdateRules(updated);
  };

  // Add Custom Rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const unitNameTh = newUnit === 'HOURS' ? 'ชั่วโมง' : (newUnit === 'DAYS' ? 'วัน' : 'สัปดาห์');
    const labelTh = newUnit === 'HOURS'
      ? `ล่วงหน้า ${newAmount} ชั่วโมงก่อนครบกำหนด`
      : `ล่วงหน้า ${newAmount} ${unitNameTh} (เวลา ${newTimeOfDay} น.)`;

    const newRule: NotificationRule = {
      id: `rule-${Date.now()}`,
      enabled: true,
      unit: newUnit,
      amount: newAmount,
      timeOfDay: newTimeOfDay,
      labelTh,
    };

    const updated = [...rules, newRule];
    saveNotificationRules(updated);
    onUpdateRules(updated);
    setIsAddingCustom(false);
  };

  // Send Test Notification
  const handleTestNotification = async () => {
    if (voiceConfig?.enabled) {
      void playNotificationChime(voiceConfig.chimeStyle, voiceConfig.volume);
    }
    const granted = await requestNotificationPermission();
    if (granted) {
      await ensureExactAlarmPermission();
      await syncScheduledNotifications(tasks, rules);
    }
    await sendTestNotification();
    setTestSentToast(true);
    setTimeout(() => setTestSentToast(false), 3000);
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Bell size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">ระบบแจ้งเตือนอัจฉริยะ (Notifications)</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                ตั้งค่าเปิด-ปิดเสียงแจ้งเตือน เสียงน้องต้นหอม และกำหนดเวลาเตือนล่วงหน้า
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleTestNotification}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-md active:scale-95"
        >
          <Volume2 size={16} />
          <span>ทดสอบส่ง Notification ทันที</span>
        </button>
      </div>

      {testSentToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span>ส่งสัญญาณแจ้งเตือนสำเร็จ! ตรวจสอบเสียงและแถบ Notification ของอุปกรณ์คุณได้เลย</span>
        </div>
      )}

      {/* Sound & Voice Master Controls Card */}
      {voiceConfig && onUpdateVoiceConfig && (
        <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Volume2 size={16} className="text-amber-600 dark:text-amber-400" />
              <span>ควบคุมการเปิด-ปิดเสียงแจ้งเตือน & เสียงน้องต้นหอม</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              แยกการทำงานอิสระระหว่างเสียงเตือนระบบและเสียงพูดของตัวการ์ตูนน้องต้นหอม
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Switch 1: Notification Sound */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              voiceConfig.enabled
                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-75'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  voiceConfig.enabled ? 'bg-amber-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                }`}>
                  {voiceConfig.enabled ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div>
                  <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100 block">
                    เสียงแจ้งเตือนระบบ
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {voiceConfig.enabled ? 'เปิดอยู่ (เสียงกระดิ่ง & เตือนครบกำหนด)' : 'ปิดเสียงแจ้งเตือนอยู่'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={voiceConfig.enabled}
                onChange={e => onUpdateVoiceConfig({ ...voiceConfig, enabled: e.target.checked })}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Switch 2: Nong Tonhom Mascot Voice */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              voiceConfig.mascotGreetingEnabled
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-75'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  voiceConfig.mascotGreetingEnabled ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                }`}>
                  {voiceConfig.mascotGreetingEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </div>
                <div>
                  <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100 block">
                    เสียงพูดน้องต้นหอม
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {voiceConfig.mascotGreetingEnabled ? 'เปิดอยู่ (พูดเมื่อแตะการ์ด/ตัวการ์ตูน)' : 'ปิดเสียงน้องต้นหอมอยู่'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={voiceConfig.mascotGreetingEnabled}
                onChange={e => onUpdateVoiceConfig({ ...voiceConfig, mascotGreetingEnabled: e.target.checked })}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer shrink-0"
              />
            </div>
          </div>

          {voiceConfig.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700/70 cursor-pointer">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  พูดเตือนเมื่อถึงวันครบกำหนดชำระ
                </span>
                <input
                  type="checkbox"
                  checked={voiceConfig.speakOnDueReminder}
                  onChange={e => onUpdateVoiceConfig({ ...voiceConfig, speakOnDueReminder: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700/70 cursor-pointer">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  เสียงยืนยันเมื่อกดติ๊กชำระเงิน
                </span>
                <input
                  type="checkbox"
                  checked={voiceConfig.speakOnMarkPaid}
                  onChange={e => onUpdateVoiceConfig({ ...voiceConfig, speakOnMarkPaid: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Flexible Rules Management */}
      <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Clock size={16} className="text-brand-600 dark:text-brand-400" />
              <span>กติกาการแจ้งเตือนล่วงหน้า (Active Notification Rules)</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              เปิดหรือปิดกติกาการแจ้งเตือน หรือเพิ่มระยะเวลาแจ้งเตือนที่เหมาะกับคุณ
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Plus size={14} /> เพิ่มกฎใหม่
          </button>
        </div>

        {/* Custom Rule Creation Form */}
        {isAddingCustom && (
          <form onSubmit={handleAddRule} className="p-4 rounded-3xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-3 animate-in fade-in">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">สร้างเงื่อนไขการแจ้งเตือนใหม่:</span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">หน่วยเวลา:</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value as NotificationUnit)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 text-stone-900 dark:text-stone-100"
                >
                  <option value="HOURS">เป็นชั่วโมง (Hours)</option>
                  <option value="DAYS">เป็นวัน (Days)</option>
                  <option value="WEEKS">เป็นสัปดาห์ (Weeks)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">ล่วงหน้าเท่าไหร่:</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newAmount}
                  onChange={(e) => setNewAmount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 font-mono-numbers text-center font-bold"
                />
              </div>

              {newUnit !== 'HOURS' && (
                <div>
                  <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">เวลาที่จะแจ้งเตือนในวันนั้น:</label>
                  <input
                    type="time"
                    value={newTimeOfDay}
                    onChange={(e) => setNewTimeOfDay(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 text-stone-900 dark:text-stone-100"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors"
              >
                บันทึกกฎนี้
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}

        {/* Rules List */}
        <div className="space-y-2">
          {rules.map(rule => (
            <div 
              key={rule.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                rule.enabled 
                  ? 'bg-white dark:bg-stone-800/80 border-stone-200/90 dark:border-stone-700/80 shadow-xs' 
                  : 'bg-stone-50/70 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule.id)}
                  className="w-4 h-4 text-brand-600 rounded border-stone-300 focus:ring-brand-500 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-200">{rule.labelTh}</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">
                    เตือนล่วงหน้า {rule.amount} {rule.unit === 'HOURS' ? 'ชั่วโมง' : (rule.unit === 'DAYS' ? 'วัน' : 'สัปดาห์')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  rule.enabled 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400'
                }`}>
                  {rule.enabled ? 'เปิดใช้งาน' : 'ปิด'}
                </span>
                {rules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 text-stone-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Upcoming Notification Queue */}
      <div className="bg-white/95 dark:bg-stone-900/90 p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <Calendar size={16} className="text-brand-600 dark:text-brand-400" />
          <span>คิวแจ้งเตือนที่กำลังจะมาถึงจริง (Upcoming Notification Queue)</span>
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          ระบบคำนวณวันและเวลาแจ้งเตือนจริงสำหรับงวดซับแยกที่ยังไม่ได้ชำระเงิน
        </p>

        {upcomingAlerts.length === 0 ? (
          <div className="text-center py-6 text-stone-400 dark:text-stone-500 text-xs">
            ไม่มีการแจ้งเตือนที่รอส่ง (รายการหนี้สินทั้งหมดได้รับการชำระแล้ว หรือไม่มีกติกาที่ตรงเงื่อนไข)
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-60 overflow-y-auto">
            {upcomingAlerts.slice(0, 10).map((alert, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-stone-800 dark:text-stone-200 truncate">
                    {alert.loanTitle} • {alert.subTitle}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{alert.message}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono-numbers font-bold text-brand-600 dark:text-brand-400 block">
                    {alert.triggerTimeFormatted}
                  </span>
                  <span className="text-[9px] text-stone-400 dark:text-stone-500">{alert.ruleLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
