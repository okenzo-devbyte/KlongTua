import React, { useCallback, useState, useEffect } from 'react';
import { SecurityConfig, ThaiVoiceConfig } from '../types/loan';
import { verifyPin, generateScrambledKeypad, authenticateBiometric } from '../services/securityService';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { ThaiMascot } from './ThaiMascot';
import { ShieldCheck, Delete, Fingerprint, Lock } from 'lucide-react';

interface SecurityLockScreenProps {
  config: SecurityConfig;
  voiceConfig?: ThaiVoiceConfig;
  onUnlocked: () => void;
}

export const SecurityLockScreen: React.FC<SecurityLockScreenProps> = ({
  config,
  voiceConfig,
  onUnlocked,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isBiometricBusy, setIsBiometricBusy] = useState(false);
  const [keypadOrder, setKeypadOrder] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);

  const targetLength = config.pinLength || 4;

  const handleBack = useCallback(() => true, []);
  useAndroidBack(handleBack);

  useEffect(() => {
    if (config.scrambledKeypad) {
      setKeypadOrder(generateScrambledKeypad());
    } else {
      setKeypadOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    }
  }, [config.scrambledKeypad]);

  const handleDigit = async (digit: number) => {
    if (pin.length >= targetLength) return;
    const nextPin = pin + digit.toString();
    setPin(nextPin);
    setErrorMessage(null);

    if (nextPin.length === targetLength) {
      const isValid = await verifyPin(nextPin, config.pinHash);
      if (isValid) {
        onUnlocked();
      } else {
        setIsShaking(true);
        setErrorMessage('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        setTimeout(() => {
          setPin('');
          setIsShaking(false);
        }, 600);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleBiometric = async () => {
    setIsBiometricBusy(true);
    const success = await authenticateBiometric(config.biometricCredentialId);
    setIsBiometricBusy(false);

    if (success) {
      onUnlocked();
    } else {
      setErrorMessage('ไม่สามารถยืนยัน Biometric ได้ กรุณาใช้รหัส PIN');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FBF9F4] dark:bg-[#121212] flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* Mascot / Security Header */}
        <div className="relative">
          <ThaiMascot type="CHECKING" size={64} voiceConfig={voiceConfig} />
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-500 text-white shadow-md">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
            คล่องตัว Security
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            กรุณากรอกรหัส PIN {targetLength} หลักเพื่อเข้าใช้งาน
          </p>
        </div>

        {/* PIN Dots */}
        <div className={`flex items-center justify-center gap-4 my-2 ${isShaking ? 'animate-bounce' : ''}`}>
          {Array.from({ length: targetLength }).map((_, i) => {
            const isFilled = i < pin.length;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'bg-amber-600 border-amber-600 scale-110 shadow-sm'
                    : 'bg-transparent border-stone-400 dark:border-stone-600'
                }`}
              />
            );
          })}
        </div>

        {errorMessage && (
          <p className="text-xs font-semibold text-rose-500 dark:text-rose-400">
            {errorMessage}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-64 pt-2">
          {keypadOrder.slice(0, 9).map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-16 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-2xl font-bold font-num shadow-sm active:scale-95 transition-transform hover:bg-stone-50 dark:hover:bg-stone-700/80 flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          {/* Biometric Button or Empty */}
          {config.biometricEnabled ? (
            <button
              onClick={handleBiometric}
              disabled={isBiometricBusy}
              className="h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold active:scale-95 transition-transform flex flex-col items-center justify-center gap-1 disabled:opacity-50"
              title="ปลดล็อกด้วยสแกนนิ้ว / ใบหน้า"
            >
              <Fingerprint className="w-6 h-6" />
              <span>Biometric</span>
            </button>
          ) : (
            <div className="h-16" />
          )}

          {/* 10th Digit */}
          <button
            onClick={() => handleDigit(keypadOrder[9])}
            className="h-16 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-2xl font-bold font-num shadow-sm active:scale-95 transition-transform hover:bg-stone-50 dark:hover:bg-stone-700/80 flex items-center justify-center"
          >
            {keypadOrder[9]}
          </button>

          {/* Backspace Button */}
          <button
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold active:scale-95 transition-transform flex items-center justify-center"
            title="ลบตัวเลข"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {config.scrambledKeypad && (
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            🔒 คีย์บอร์ดสุ่มตำแหน่งตัวเลขเพื่อป้องกันการแอบมอง
          </p>
        )}
      </div>
    </div>
  );
};
