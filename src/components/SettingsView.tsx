import React, { useEffect, useState } from 'react';
import { 
  ThaiPencilConfig, 
  ThaiVoiceConfig, 
  SecurityConfig, 
  NavTabItem,
  PoliteParticle,
  ChimeStyle,
  ThemeMode
} from '../types/loan';
import { ThaiMascot } from './ThaiMascot';
import { TabManagerModal } from './TabManagerModal';
import { speakMascotGreeting, playNotificationChime } from '../services/thaiVoiceService';
import { isNativeThaiTtsAvailable } from '../services/native/tts';
import { Capacitor } from '@capacitor/core';
import { hashPin, applyPinLengthChange, registerBiometricCredential } from '../services/securityService';
import { getBiometricAvailability, isNativeBiometricPlatform } from '../services/native/biometric';
import { removeDemoData, loadDemoData } from '../services/storageService';
import { shareDebtFlowToLine } from '../services/lineAuthService';
import { confirmAction } from '../services/native/dialog';
import { 
  Palette, 
  Volume2, 
  VolumeX,
  Bell,
  BellOff,
  Shield, 
  MessageSquare, 
  LayoutGrid, 
  Cloud, 
  RotateCcw, 
  Check, 
  Sun, 
  Moon, 
  Smartphone, 
  Lock, 
  KeyRound, 
  Fingerprint, 
  Share2,
  Sliders,
  Sparkles,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';

interface SettingsViewProps {
  pencilConfig: ThaiPencilConfig;
  voiceConfig: ThaiVoiceConfig;
  securityConfig: SecurityConfig;
  navTabs: NavTabItem[];
  onUpdatePencilConfig: (cfg: ThaiPencilConfig) => void;
  onUpdateVoiceConfig: (cfg: ThaiVoiceConfig) => void;
  onUpdateSecurityConfig: (cfg: SecurityConfig) => void;
  onUpdateNavTabs: (tabs: NavTabItem[]) => void;
  onClearAllData: () => void;
  isDarkTheme: boolean;
  onOpenExcelModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  pencilConfig,
  voiceConfig,
  securityConfig,
  navTabs,
  onUpdatePencilConfig,
  onUpdateVoiceConfig,
  onUpdateSecurityConfig,
  onUpdateNavTabs,
  onClearAllData,
  isDarkTheme,
  onOpenExcelModal,
}) => {
  const [activeTabManager, setActiveTabManager] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinResetNotice, setPinResetNotice] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [nativeTtsAvailable, setNativeTtsAvailable] = useState<boolean | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('THEME');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void isNativeThaiTtsAvailable().then(setNativeTtsAvailable);
  }, []);

  // Voice Test handler
  const handleTestVoice = async () => {
    await speakMascotGreeting('WAVING', voiceConfig, true);
  };

  // PIN Setup handler
  const handleSavePin = async () => {
    if (newPinInput.length !== securityConfig.pinLength) return;
    const hash = await hashPin(newPinInput);
    onUpdateSecurityConfig({
      ...securityConfig,
      pinEnabled: true,
      pinHash: hash,
    });
    setNewPinInput('');
    setPinResetNotice(false);
    setPinChangeSuccess(true);
    setTimeout(() => setPinChangeSuccess(false), 3000);
  };

  const handlePinLengthChange = (pinLength: 4 | 6) => {
    if (pinLength === securityConfig.pinLength) return;
    onUpdateSecurityConfig(applyPinLengthChange(securityConfig, pinLength));
    setNewPinInput('');
    setPinChangeSuccess(false);
    setPinResetNotice(true);
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    setBiometricError(null);

    if (!enabled) {
      onUpdateSecurityConfig({
        ...securityConfig,
        biometricEnabled: false,
        biometricCredentialId: undefined,
      });
      return;
    }

    if (!securityConfig.pinHash) {
      setBiometricError('กรุณากำหนดรหัส PIN ก่อนเปิดใช้งาน Biometric');
      return;
    }

    if (isNativeBiometricPlatform()) {
      setBiometricBusy(true);
      const availability = await getBiometricAvailability();
      setBiometricBusy(false);

      if (!availability.available) {
        setBiometricError(
          availability.reason === 'NONE_ENROLLED'
            ? 'ยังไม่ได้ลงทะเบียนลายนิ้วมือ/ใบหน้าในเครื่อง กรุณาตั้งค่าที่ระบบ Android ก่อน'
            : 'อุปกรณ์นี้ไม่รองรับ Biometric ที่ปลอดภัย จึงยังไม่เปิดใช้งาน'
        );
        return;
      }

      setBiometricError(null);
      onUpdateSecurityConfig({
        ...securityConfig,
        biometricEnabled: true,
        biometricCredentialId: undefined,
      });
      return;
    }

    setBiometricBusy(true);
    const credentialId = securityConfig.biometricCredentialId
      || await registerBiometricCredential('คล่องตัว (KlongTua)');
    setBiometricBusy(false);

    if (!credentialId) {
      setBiometricError('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับ Biometric ที่ปลอดภัย จึงยังไม่เปิดใช้งาน');
      return;
    }

    onUpdateSecurityConfig({
      ...securityConfig,
      biometricEnabled: true,
      biometricCredentialId: credentialId,
    });
  };

  const handleTogglePinEnabled = (enabled: boolean) => {
    if (!enabled) {
      onUpdateSecurityConfig({ ...securityConfig, pinEnabled: false });
      return;
    }

    if (!securityConfig.pinHash) {
      setPinResetNotice(true);
      return;
    }

    onUpdateSecurityConfig({ ...securityConfig, pinEnabled: true });
  };

  // LINE share handler
  const handleShareLine = () => {
    const summary = `📊 สรุปแผนการเงินจากแอป "คล่องตัว"\n✨ ระบบบริหารหนี้สินและสภาพคล่องอัจฉริยะ\n💡 ตรวจสอบวันครบกำหนดและวางแผนเงินสำรองได้ลื่นไหลทุกวัน`;
    shareDebtFlowToLine(summary);
  };

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl border transition-all duration-300 bg-white/95 dark:bg-stone-900/90 border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ThaiMascot type="WAVING" size={64} voiceConfig={voiceConfig} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
                ศูนย์การตั้งค่าระบบ (คล่องตัว)
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              ปรับแต่งโทนสีหน้าจอ ระบบเสียงแจ้งเตือน เสียงน้องต้นหอม ความปลอดภัย และการจัดการข้อมูล
            </p>
          </div>
        </div>

        <button
          onClick={handleTestVoice}
          className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center gap-2 active:scale-95 transition-transform"
        >
          <Volume2 className="w-4 h-4" />
          <span>ทดสอบเสียงน้องต้นหอม</span>
        </button>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'THEME', label: 'โทนสี & พื้นหลัง', icon: Palette },
          { id: 'VOICE', label: 'เสียงแจ้งเตือน & น้องต้นหอม', icon: Volume2 },
          { id: 'SECURITY', label: 'ความปลอดภัย & PIN', icon: Shield },
          { id: 'LINE', label: 'เชื่อมต่อ LINE', icon: MessageSquare },
          { id: 'TABS', label: 'จัดการแท็บเมนู', icon: LayoutGrid },
          { id: 'RESET', label: 'ข้อมูลระบบ & ตัวอย่าง', icon: RotateCcw },
        ].map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                isActive
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-amber-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= CATEGORY 1: THEME & PENCIL ================= */}
      {activeCategory === 'THEME' && (
        <div className="p-6 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <Palette className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
              โทนสีหน้าจอและลวดลายพื้นหลัง
            </h3>
          </div>

          {/* Theme Mode Selector: Pure Light vs Pure Dark */}
          <div>
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block mb-2">
              โทนสีหลัก (ความสว่าง/มืดบริสุทธิ์)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
              <button
                onClick={() => onUpdatePencilConfig({ ...pencilConfig, themeMode: 'LIGHT' })}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  pencilConfig.themeMode === 'LIGHT'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600">
                  <Sun className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-xs block">โหมดสว่าง (Pure Light)</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">พื้นงาช้าง ลายเส้นดินสอสีทอง</span>
                </div>
              </button>

              <button
                onClick={() => onUpdatePencilConfig({ ...pencilConfig, themeMode: 'DARK' })}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  pencilConfig.themeMode === 'DARK'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="p-2 rounded-xl bg-stone-700 text-amber-400">
                  <Moon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-xs block">โหมดมืด (Pure Dark)</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">ดำหินออบซิเดียน ชอล์กสีทอง</span>
                </div>
              </button>

              <button
                onClick={() => onUpdatePencilConfig({ ...pencilConfig, themeMode: 'SYSTEM' })}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  pencilConfig.themeMode === 'SYSTEM'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-xs block">ตามระบบ (System)</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">สลับอัตโนมัติตามการตั้งค่าอุปกรณ์</span>
                </div>
              </button>
            </div>
          </div>

          {/* Pencil Intensity Slider */}
          <div className="max-w-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 dark:text-stone-200">
                ความเข้มลายเส้นดินสอพื้นหลัง:
              </span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 font-num">
                {pencilConfig.pencilIntensity}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={pencilConfig.pencilIntensity}
              onChange={e => onUpdatePencilConfig({ ...pencilConfig, pencilIntensity: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>บางเบา (10%)</span>
              <span>มาตรฐาน (35%)</span>
              <span>คมชัด (60%)</span>
            </div>
          </div>

          {/* Low-Spec Performance Mode */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between max-w-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-stone-900 dark:text-stone-100 block">
                  โหมดมือถือสเปกประหยัด (Low-Spec Mode)
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  ลดแอนิเมชันและเอฟเฟกต์เบลอ เพื่อความลื่นไหล 60 FPS บนมือถือทุกรุ่น
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pencilConfig.lowSpecMode}
              onChange={e => onUpdatePencilConfig({ ...pencilConfig, lowSpecMode: e.target.checked })}
              className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* ================= CATEGORY 2: THAI VOICE & MASCOT ================= */}
      {activeCategory === 'VOICE' && (
        <div className="p-6 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <Volume2 className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
              การตั้งค่าเสียงแจ้งเตือนระบบ & เสียงพูดน้องต้นหอม
            </h3>
          </div>

          {Capacitor.isNativePlatform() && nativeTtsAvailable === false && (
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 max-w-md">
              เครื่องนี้ยังไม่มีเสียงภาษาไทยสำหรับ TTS กรุณาติดตั้งเสียงภาษาไทยใน Settings → Text-to-speech ของ Android
            </p>
          )}

          {/* Dual Master Switch Cards: Notification Sound vs Nong Tonhom Voice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Notification Sound Master Toggle */}
            <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
              voiceConfig.enabled
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    voiceConfig.enabled ? 'bg-amber-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                  }`}>
                    {voiceConfig.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100 block">
                      เปิด-ปิดเสียงแจ้งเตือนระบบ
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      เสียงกระดิ่งและเสียงเตือนกำหนดชำระ
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

              {voiceConfig.enabled && (
                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/50 space-y-2 text-[11px]">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-stone-700 dark:text-stone-300 font-medium">พูดเตือนเมื่อถึงกำหนดชำระ</span>
                    <input
                      type="checkbox"
                      checked={voiceConfig.speakOnDueReminder}
                      onChange={e => onUpdateVoiceConfig({ ...voiceConfig, speakOnDueReminder: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-stone-700 dark:text-stone-300 font-medium">พูดยืนยันเมื่อกดติ๊กชำระเงิน</span>
                    <input
                      type="checkbox"
                      checked={voiceConfig.speakOnMarkPaid}
                      onChange={e => onUpdateVoiceConfig({ ...voiceConfig, speakOnMarkPaid: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-stone-700 dark:text-stone-300 font-medium">พูดเตือนเมื่อเงินสำรองไม่พอจ่าย</span>
                    <input
                      type="checkbox"
                      checked={voiceConfig.speakOnShortfallAlert}
                      onChange={e => onUpdateVoiceConfig({ ...voiceConfig, speakOnShortfallAlert: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Card 2: Nong Tonhom Mascot Voice Master Toggle */}
            <div className={`p-4 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
              voiceConfig.mascotGreetingEnabled
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    voiceConfig.mascotGreetingEnabled ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                  }`}>
                    {voiceConfig.mascotGreetingEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100 block">
                      เปิด-ปิดเสียงน้องต้นหอม
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      เสียงทักทายเมื่อแตะการ์ด KPI หรือแตะตัวน้องต้นหอม
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

              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-between text-[11px]">
                <span className="text-stone-600 dark:text-stone-400">
                  สถานะ: <strong>{voiceConfig.mascotGreetingEnabled ? 'เปิดเสียงน้องต้นหอม' : 'ปิดเสียงน้องต้นหอม'}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleTestVoice}
                  className="text-emerald-700 dark:text-emerald-300 font-bold hover:underline"
                >
                  🔊 ทดลองฟังเสียง
                </button>
              </div>
            </div>
          </div>

          {/* Polite Particle: ค่ะ / ครับ */}
          <div className="max-w-md">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block mb-2">
              คำลงท้ายสุภาพของน้องต้นหอม
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateVoiceConfig({ ...voiceConfig, politeParticle: 'KA' })}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                  voiceConfig.politeParticle === 'KA'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                }`}
              >
                ค่ะ / นะคะ (สุภาพหญิง)
              </button>
              <button
                onClick={() => onUpdateVoiceConfig({ ...voiceConfig, politeParticle: 'KRUB' })}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                  voiceConfig.politeParticle === 'KRUB'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                }`}
              >
                ครับ / นะครับ (สุภาพชาย)
              </button>
            </div>
          </div>

          {/* Privacy Mode */}
          <div className="flex items-center justify-between max-w-md pt-2">
            <div>
              <span className="font-bold text-xs text-stone-900 dark:text-stone-100 block">
                โหมดความเป็นส่วนตัว (Privacy Mode)
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                ไม่พูดชื่อเจ้าหนี้หรือตัวเลขยอดหนี้สินเมื่ออยู่ในที่สาธารณะ
              </span>
            </div>
            <input
              type="checkbox"
              checked={voiceConfig.privacyMode}
              onChange={e => onUpdateVoiceConfig({ ...voiceConfig, privacyMode: e.target.checked })}
              className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          {/* Chime Style */}
          <div className="max-w-md">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block mb-1.5">
              สไตล์เสียงกระดิ่งแจ้งเตือน
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['ENTERPRISE', 'GENTLE', 'URGENT', 'NONE'] as ChimeStyle[]).map(style => (
                <button
                  key={style}
                  onClick={() => {
                    onUpdateVoiceConfig({ ...voiceConfig, chimeStyle: style });
                    playNotificationChime(style, voiceConfig.volume);
                  }}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold capitalize transition-all ${
                    voiceConfig.chimeStyle === style
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {style === 'NONE' ? 'ปิดกระดิ่ง' : style.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Phrases Section */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h4 className="font-extrabold text-xs text-stone-900 dark:text-stone-100">
                    ปรับแต่งประโยคพูดของน้องต้นหอม (Custom Mascot Phrases)
                  </h4>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  กำหนดคำพูดที่ต้องการให้น้องต้นหอมเปล่งเสียงได้อย่างอิสระตามแต่ละอารมณ์และท่าทาง
                </p>
              </div>

              {voiceConfig.customPhrases && Object.values(voiceConfig.customPhrases).some(Boolean) && (
                <button
                  type="button"
                  onClick={() => onUpdateVoiceConfig({ ...voiceConfig, customPhrases: {} })}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>รีเซ็ตทุกคำพูดเป็นค่าเริ่มต้น</span>
                </button>
              )}
            </div>

            {/* Token Instruction Note */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-stone-700 dark:text-stone-300 flex items-start gap-2.5">
              <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0 text-xs">💡 คำแนะนำ:</span>
              <span className="leading-relaxed">
                ใส่แท็ก <code className="px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 font-mono font-bold text-amber-900 dark:text-amber-200">{"{polite}"}</code> ในตำแหน่งที่ต้องการให้ระบบแทนที่ด้วยคำลงท้ายสุภาพอัตโนมัติ (เช่น <em>"สวัสดี{"{polite}"}"</em> จะอ่านออกเสียงเป็น <em>"สวัสดีค่ะ"</em> หรือ <em>"สวัสดีครับ"</em> ตามคำลงท้ายที่ท่านเลือกไว้ด้านบน)
              </span>
            </div>

            {/* 5 Posture Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                {
                  key: 'waving' as const,
                  type: 'WAVING' as const,
                  label: 'ท่าโบกมือทักทาย (Waving)',
                  icon: '👋',
                  desc: 'พูดเมื่อแตะตัวการ์ตูน หรือแตะการ์ดเงินสำรองในหน้าแดชบอร์ด',
                  defaultPhrase: 'สวัสดี{polite} หนูน้องต้นหอมเองนะ ขอให้วันนี้การเงินสดใส มีเงินสำรองพร้อมใช้นะ{polite}~'
                },
                {
                  key: 'planning' as const,
                  type: 'PLANNING' as const,
                  label: 'ท่าวางแผนงบประมาณยอดชำระรวม (Planning)',
                  icon: '🧮',
                  desc: 'พูดเมื่อแตะการ์ดยอดชำระรวมประจำเดือน',
                  defaultPhrase: 'ยอดชำระรวมเดือนนี้ วางแผนจัดการให้พร้อมแล้วนะ{polite} สู้ๆ ไปด้วยกันนะ!'
                },
                {
                  key: 'success' as const,
                  type: 'SUCCESS' as const,
                  label: 'ท่าชำระสำเร็จ / ดีใจ (Success)',
                  icon: '🎉',
                  desc: 'พูดเมื่อแตะการ์ดยอดชำระแล้ว หรือเคลียร์ยอดครบถ้วน',
                  defaultPhrase: 'เย้! ชำระเรียบร้อยแล้ว เก่งที่สุดเลย{polite} ปรบมือให้รัวๆ เลยนะ!'
                },
                {
                  key: 'checking' as const,
                  type: 'CHECKING' as const,
                  label: 'ท่าตรวจเช็กยอดคงค้าง (Checking)',
                  icon: '🔍',
                  desc: 'พูดเมื่อแตะดูยอดค้างชำระคงเหลือของเดือน',
                  defaultPhrase: 'ยอดยังค้างชำระอยู่อีกนิดหน่อยนะ น้องต้นหอมช่วยเช็กวันครบกำหนดให้อยู่ ทยอยจ่ายได้เลย{polite}!'
                },
                {
                  key: 'alert' as const,
                  type: 'ALERT' as const,
                  label: 'ท่าแจ้งเตือนด่วน (Alert)',
                  icon: '⚠️',
                  desc: 'พูดเมื่อมียอดเกินกำหนด หรือเงินสำรองไม่เพียงพอ',
                  defaultPhrase: 'อุ๊ย! แจ้งเตือนด่วนนะ{polite} ยอดนี้สำคัญมากๆ รีบจัดการเพื่อความสบายใจนะ น้องต้นหอมเป็นห่วง{polite}!'
                }
              ].map(item => {
                const currentVal = voiceConfig.customPhrases?.[item.key] ?? '';
                const hasCustom = Boolean(currentVal.trim());

                return (
                  <div 
                    key={item.key} 
                    className="p-3.5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{item.icon}</span>
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                            {item.label}
                          </span>
                        </div>
                        {hasCustom && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                            กำหนดเอง
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mb-2">
                        {item.desc}
                      </p>

                      <textarea
                        rows={2}
                        value={currentVal}
                        onChange={e => {
                          const val = e.target.value;
                          onUpdateVoiceConfig({
                            ...voiceConfig,
                            customPhrases: {
                              ...(voiceConfig.customPhrases || {}),
                              [item.key]: val
                            }
                          });
                        }}
                        placeholder={item.defaultPhrase}
                        className="w-full p-2.5 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        type="button"
                        onClick={() => speakMascotGreeting(item.type, voiceConfig, true)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>ทดลองฟังเสียง</span>
                      </button>

                      {hasCustom && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...(voiceConfig.customPhrases || {}) };
                            delete next[item.key];
                            onUpdateVoiceConfig({ ...voiceConfig, customPhrases: next });
                          }}
                          className="px-2.5 py-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>คืนค่าเดิม</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= CATEGORY 3: SECURITY & PIN ================= */}
      {activeCategory === 'SECURITY' && (
        <div className="p-6 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <Shield className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
              ความปลอดภัยและการล็อกแอปพลิเคชัน (Security & PIN)
            </h3>
          </div>

          {/* PIN Lock Master Toggle */}
          <div className="flex items-center justify-between max-w-md">
            <div>
              <span className="font-bold text-xs text-stone-900 dark:text-stone-100 block">
                เปิดระบบล็อกด้วยรหัส PIN
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                ต้องกรอกรหัสผ่านก่อนเข้าดูข้อมูลหนี้สิน
              </span>
            </div>
            <input
              type="checkbox"
              checked={securityConfig.pinEnabled}
              onChange={e => handleTogglePinEnabled(e.target.checked)}
              className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          {/* PIN Length: 4 vs 6 Digits */}
          <div className="max-w-md">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block mb-2">
              จำนวนหลักของรหัส PIN
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePinLengthChange(4)}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                  securityConfig.pinLength === 4
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                }`}
              >
                4 หลัก (รวดเร็ว)
              </button>
              <button
                onClick={() => handlePinLengthChange(6)}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                  securityConfig.pinLength === 6
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                }`}
              >
                6 หลัก (ปลอดภัยสูงสุด)
              </button>
            </div>
            {pinResetNotice && (
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
                เปลี่ยนจำนวนหลักแล้ว ระบบปิดการล็อกชั่วคราว กรุณากำหนดรหัส PIN ใหม่ด้านล่างเพื่อเปิดใช้งานอีกครั้ง
              </p>
            )}
          </div>

          {/* Set / Change PIN */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 max-w-md space-y-3">
            <span className="font-bold text-xs text-stone-800 dark:text-stone-200 block flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>กำหนดรหัส PIN ใหม่ ({securityConfig.pinLength} หลัก)</span>
            </span>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={securityConfig.pinLength}
                placeholder={`กรอกตัวเลข ${securityConfig.pinLength} หลัก`}
                value={newPinInput}
                onChange={e => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-num tracking-widest"
              />
              <button
                onClick={handleSavePin}
                disabled={newPinInput.length !== securityConfig.pinLength}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
              >
                บันทึก PIN
              </button>
            </div>
            {pinChangeSuccess && (
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกรหัส PIN ใหม่เรียบร้อยแล้ว!</span>
              </p>
            )}
          </div>

          {/* Biometrics & Scrambled Keypad */}
          <div className="space-y-3 max-w-md pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                  ปลดล็อกด้วย Biometric (ลายนิ้วมือ / Face ID)
                </span>
              </div>
              <input
                type="checkbox"
                checked={securityConfig.biometricEnabled}
                disabled={biometricBusy}
                onChange={e => handleToggleBiometric(e.target.checked)}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer disabled:opacity-50"
              />
            </div>
            {biometricBusy && (
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                กำลังลงทะเบียน Biometric กับอุปกรณ์...
              </p>
            )}
            {biometricError && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {biometricError}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                  สุ่มตำแหน่งปุ่มตัวเลข (Scrambled Keypad)
                </span>
              </div>
              <input
                type="checkbox"
                checked={securityConfig.scrambledKeypad}
                onChange={e => onUpdateSecurityConfig({ ...securityConfig, scrambledKeypad: e.target.checked })}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= CATEGORY 4: LINE LOGIN & SHARING ================= */}
      {activeCategory === 'LINE' && (
        <div className="p-6 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <MessageSquare className="w-5 h-5 text-[#06C755]" />
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
              การเชื่อมต่อ LINE Application
            </h3>
          </div>

          <div className="p-5 rounded-2xl bg-[#06C755]/10 border border-[#06C755]/30 max-w-md space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#06C755] text-white flex items-center justify-center font-black text-sm">
                LINE
              </div>
              <div>
                <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100 block">
                  แชร์สรุปไปยัง LINE
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  เปิดแอป LINE พร้อมข้อความสรุปให้เลือกส่งต่อ ไม่ต้องเข้าสู่ระบบ
                </span>
              </div>
            </div>

            <button
              onClick={handleShareLine}
              className="w-full py-3 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Share2 className="w-4 h-4" />
              <span>แชร์สรุปแผนการเงิน คล่องตัว ไปยัง LINE แชท</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= CATEGORY 5: TAB MANAGEMENT ================= */}
      {activeCategory === 'TABS' && (
        <div className="p-6 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 max-w-md">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <LayoutGrid className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
              การจัดการแท็บเมนูหลัก (Dynamic Navigation Tabs)
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            เลือกซ่อนหรือแสดงแท็บต่างๆ ในแถบนำทางด้านล่าง เช่น ซ่อนแท็บสำรองข้อมูล หรือเพิ่มแท็บคัดกรองหนี้เฉพาะทาง
          </p>
          <button
            onClick={() => setActiveTabManager(true)}
            className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
          >
            <Sliders className="w-4 h-4" />
            <span>เปิดหน้าต่างปรับแต่งแท็บเมนู</span>
          </button>
        </div>
      )}

      {/* ================= CATEGORY 6: SYSTEM RESET & SAMPLE DATA ================= */}
      {activeCategory === 'RESET' && (
        <div className="p-6 rounded-3xl bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 max-w-md">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
              ข้อมูลตัวอย่าง, นำเข้า/ส่งออก Excel และรีเซ็ตระบบ
            </h3>
          </div>

          {onOpenExcelModal && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-2">
              <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100 block">
                📊 จัดการไฟล์ Excel (.xlsx / .csv)
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                ดาวน์โหลดเทมเพลตมาตรฐาน นำเข้าสินเชื่อจาก Excel หรือส่งออกรายงาน 3 ชีต
              </p>
              <button
                onClick={onOpenExcelModal}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>เปิดศูนย์ข้อมูล Excel (Import / Export)</span>
              </button>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-2">
            <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100 block">
              ✨ เมนูข้อมูลตัวอย่าง (Sample Data)
            </span>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
              จัดการสัญญาตัวอย่าง 4 รายการ (SPayLater, KBank, LINE BK, เงินติดล้อ) เพื่อทดลองใช้งานโดยไม่กระทบข้อมูลที่คุณสร้างเอง
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => loadDemoData()}
                className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>โหลดข้อมูลตัวอย่าง</span>
              </button>
              <button
                onClick={() => removeDemoData()}
                className="py-2.5 px-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ล้างข้อมูลตัวอย่าง</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              ลบข้อมูลที่บันทึกไว้ในเครื่องนี้ทั้งหมด (สัญญา ประวัติการชำระ เงินสด การตั้งค่า) และเริ่มต้นใหม่ด้วยข้อมูลว่าง
            </p>
            <button
              onClick={async () => {
                if (await confirmAction('คุณต้องการลบข้อมูลทั้งหมดออกจากเครื่องใช่หรือไม่?')) {
                  onClearAllData();
                }
              }}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ลบข้อมูลทั้งหมดออกจากเครื่อง</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Tab Manager Modal */}
      <TabManagerModal
        isOpen={activeTabManager}
        tabs={navTabs}
        onClose={() => setActiveTabManager(false)}
        onSaveTabs={onUpdateNavTabs}
      />
    </div>
  );
};
