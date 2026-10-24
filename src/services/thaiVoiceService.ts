import { 
  MonthlyInstallmentTask, 
  CashflowSummary, 
  ThaiVoiceConfig, 
  ChimeStyle 
} from '../types/loan';
import { formatCurrency, formatThaiDateLong, getThaiMonthYear } from '../utils/cashflowCalculator';
import { loadAppState } from './storageService';
import { Capacitor } from '@capacitor/core';
import { speakNativeThai, stopNativeThai } from './native/tts';

// Keep reference to active HTML5 audio element for cancellation
let activeAudioElement: HTMLAudioElement | null = null;

/**
 * แปลงคำย่อธนาคาร/แอปสินเชื่อเป็นคำอ่านภาษาไทยเพื่อให้ระบบ TTS ออกเสียงได้เป็นธรรมชาติที่สุด
 */
export function normalizeForThaiPronunciation(text: string): string {
  return text
    .replace(/KBank/gi, 'เคแบงก์')
    .replace(/SCB/gi, 'ไทยพาณิชย์')
    .replace(/BBL/gi, 'ธนาคารกรุงเทพ')
    .replace(/KTB/gi, 'กรุงไทย')
    .replace(/ttb/gi, 'ทีทีบี')
    .replace(/GSB/gi, 'ออมสิน')
    .replace(/UOB/gi, 'ยูโอบี')
    .replace(/KKP/gi, 'เกียรตินาคินภัทร')
    .replace(/CIMB/gi, 'ซีไอเอ็มบี')
    .replace(/TISCO/gi, 'ทิสโก้')
    .replace(/LINE BK/gi, 'ไลน์บีเค')
    .replace(/FINNIX/gi, 'ฟินนิกซ์')
    .replace(/SPayLater/gi, 'เอสเพย์เลเทอร์')
    .replace(/SEasyCash/gi, 'เอสอีซี่แคช')
    .replace(/Shopee/gi, 'ช้อปปี้')
    .replace(/LazPayLater/gi, 'ลาซเพย์เลเทอร์')
    .replace(/Lazada/gi, 'ลาซาด้า')
    .replace(/TrueMoney/gi, 'ทรูมันนี่')
    .replace(/Pay Next Extra/gi, 'เพย์เน็กซ์เอ็กซ์ตร้า')
    .replace(/Pay Next/gi, 'เพย์เน็กซ์')
    .replace(/KTC PROUD/gi, 'เคทีซีพราวด์')
    .replace(/KTC/gi, 'เคทีซี')
    .replace(/CardX/gi, 'คาร์ดเอกซ์')
    .replace(/First Choice/gi, 'เฟิร์สช้อยส์')
    .replace(/AEON/gi, 'อิออน')
    .replace(/Umay\+/gi, 'ยูเมะพลัส')
    .replace(/Promise/gi, 'พรอมิส')
    .replace(/A-Money/gi, 'เอมันนี่')
    .replace(/MTC/gi, 'เมืองไทยแคปปิตอล')
    .replace(/กยศ\./g, 'กอ ยอ สอ')
    .replace(/ธ\.ก\.ส\./g, 'ธอ กอ สอ')
    .replace(/ธอส\./g, 'ธอ ออ สอ')
    .replace(/•/g, ' ')
    .replace(/\(([^)]+)\)/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getPoliteWord(config: ThaiVoiceConfig): string {
  return config.politeParticle === 'KRUB' ? 'ครับ' : 'ค่ะ';
}

export function formatTimeForThaiSpeech(timeStr: string): string {
  const [hStr, mStr] = (timeStr || '18:00').split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h)) return timeStr;
  if (m === 0) return `${h} นาฬิกา`;
  return `${h} นาฬิกา ${m} นาที`;
}

/**
 * สร้างประโยคพูดภาษาไทยสำหรับการแจ้งเตือนกำหนดชำระรายงวด
 */
export function buildTaskReminderSpeech(
  task: MonthlyInstallmentTask,
  config: ThaiVoiceConfig
): string {
  const polite = getPoliteWord(config);
  const dateLong = formatThaiDateLong(task.dueDate);
  const timeSpoken = formatTimeForThaiSpeech(task.dueTime);

  if (config.privacyMode) {
    return `แจ้งเตือนจาก เดบท์โฟลว์ ${polite} คุณมีรายการสำคัญที่ครบกำหนดดำเนินการในวันที่ ${dateLong} เวลา ${timeSpoken} กรุณาตรวจสอบในแอปพลิเคชัน${polite}`;
  }

  const lenderSpoken = normalizeForThaiPronunciation(task.lender.nameTh);
  const titleSpoken = normalizeForThaiPronunciation(task.loanTitle);
  const subSpoken = normalizeForThaiPronunciation(task.subTitle);
  const amountSpoken = formatCurrency(task.amount);

  // หากชื่อรายการมีชื่อเจ้าหนี้ซ้ำอยู่แล้ว ใช้เฉพาะชื่อรายการ
  const mainName = titleSpoken.includes(lenderSpoken) ? titleSpoken : `${lenderSpoken} ${titleSpoken}`;

  if (task.status === 'OVERDUE') {
    return `แจ้งเตือนด่วน${polite} รายการ ${mainName} ${subSpoken} ยอดชำระ ${amountSpoken} บาท เลยกำหนดชำระของวันที่ ${dateLong} แล้ว กรุณาตรวจสอบและชำระ${polite}`;
  }

  return `แจ้งเตือนกำหนดชำระ${polite} รายการ ${mainName} ${subSpoken} ยอดชำระ ${amountSpoken} บาท ครบกำหนดวันที่ ${dateLong} เวลา ${timeSpoken}${polite}`;
}

/**
 * สร้างประโยคพูดภาษาไทยเมื่อกดติ๊กชำระเงินสำเร็จ หรือยกเลิกการชำระ
 */
export function buildPaymentToggleSpeech(
  task: MonthlyInstallmentTask,
  newStatus: 'PAID' | 'PENDING' | 'OVERDUE',
  remainingMonthlyDue: number,
  config: ThaiVoiceConfig
): string {
  const polite = getPoliteWord(config);

  if (config.privacyMode) {
    return newStatus === 'PAID'
      ? `บันทึกรายการชำระเรียบร้อยแล้ว${polite}`
      : `ยกเลิกสถานะการชำระเรียบร้อยแล้ว${polite}`;
  }

  const titleSpoken = normalizeForThaiPronunciation(task.loanTitle);
  const subSpoken = normalizeForThaiPronunciation(task.subTitle);
  const amountSpoken = formatCurrency(task.amount);

  if (newStatus === 'PAID') {
    if (remainingMonthlyDue <= 0) {
      return `บันทึกการชำระเรียบร้อยแล้ว${polite} รายการ ${titleSpoken} ${subSpoken} จำนวน ${amountSpoken} บาท ยินดีด้วย${polite} คุณชำระหนี้ประจำเดือนนี้ครบทุกรายการแล้ว${polite}`;
    }
    return `บันทึกการชำระเรียบร้อยแล้ว${polite} รายการ ${titleSpoken} ${subSpoken} จำนวน ${amountSpoken} บาท เหลือยอดค้างชำระเดือนนี้อีก ${formatCurrency(remainingMonthlyDue)} บาท${polite}`;
  }

  return `ยกเลิกการชำระ รายการ ${titleSpoken} ${subSpoken} จำนวน ${amountSpoken} บาท กลับมาเป็นสถานะรอชำระแล้ว${polite}`;
}

/**
 * สร้างประโยคพูดภาษาไทยสำหรับสรุปภาพรวมรายเดือนและสถานะเงินต้น
 */
export function buildMonthlySummarySpeech(
  summary: CashflowSummary,
  config: ThaiVoiceConfig
): string {
  const polite = getPoliteWord(config);
  const monthTh = getThaiMonthYear(summary.yearMonth);

  if (config.privacyMode) {
    return `สรุปภาพรวมประจำเดือน ${monthTh} ${polite} คุณดำเนินการชำระไปแล้ว ${summary.completionRate} เปอร์เซ็นต์ เหลือรายการที่ต้องดำเนินการอีก ${summary.pendingCount + summary.overdueCount} รายการ กรุณาดูรายละเอียดในแอปพลิเคชัน${polite}`;
  }

  if (summary.totalRemaining <= 0 && summary.totalDue > 0) {
    return `สรุปภาพรวมเดือน ${monthTh} ${polite} ยอดต้องชำระทั้งเดือน ${formatCurrency(summary.totalDue)} บาท คุณได้ชำระครบถ้วนทั้งหมดแล้ว และมีเงินต้นสำรองคงเหลือ ${formatCurrency(summary.availableFunds)} บาท${polite}`;
  }

  const baseIntro = `สรุปภาพรวมเดือน ${monthTh} ${polite} ยอดต้องชำระรวมทั้งเดือน ${formatCurrency(summary.totalDue)} บาท ชำระแล้ว ${formatCurrency(summary.totalPaid)} บาท คงเหลือค้างชำระอีก ${formatCurrency(summary.totalRemaining)} บาท`;

  if (summary.isSufficient) {
    return `${baseIntro} ขณะนี้คุณมีเงินต้นสำรอง ${formatCurrency(summary.availableFunds)} บาท ซึ่งเพียงพอต่อการชำระทั้งหมด และจะเหลือเงินสดสุทธิ ${formatCurrency(summary.surplusAmount)} บาท${polite}`;
  }

  return `${baseIntro} ขณะนี้คุณมีเงินต้นสำรอง ${formatCurrency(summary.availableFunds)} บาท ซึ่งยังไม่เพียงพอ ต้องหาเงินเพิ่มอีก ${formatCurrency(summary.shortfallAmount)} บาท จึงจะครบตามยอดเดือนนี้${polite}`;
}

/**
 * สร้างเสียงกระดิ่งนำ (Synthesized Web Audio Chime) ก่อนพูดภาษาไทย
 */
export async function playNotificationChime(
  style: ChimeStyle | 'SUCCESS',
  volume: number = 1.0
): Promise<void> {
  if (style === 'NONE' || typeof window === 'undefined') return;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine', gainPeak: number = 0.2) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);

      const scaledGain = Math.min(1, Math.max(0.01, gainPeak * volume));
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(scaledGain, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    if (style === 'ENTERPRISE') {
      // Three-note executive chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
      playTone(523.25, 0.0, 0.14, 'triangle', 0.22);
      playTone(659.25, 0.11, 0.14, 'triangle', 0.22);
      playTone(783.99, 0.22, 0.16, 'triangle', 0.24);
      playTone(1046.50, 0.34, 0.38, 'sine', 0.28);
      await new Promise(r => setTimeout(r, 550));
    } else if (style === 'SUCCESS') {
      // Crisp payment confirmation chime: E5 -> B5 -> E6
      playTone(659.25, 0.0, 0.12, 'sine', 0.25);
      playTone(987.77, 0.10, 0.14, 'sine', 0.25);
      playTone(1318.51, 0.20, 0.35, 'triangle', 0.30);
      await new Promise(r => setTimeout(r, 450));
    } else if (style === 'URGENT') {
      // Urgent alert pulse: A5 -> E5 -> A5 -> E5
      playTone(880.0, 0.0, 0.12, 'sawtooth', 0.18);
      playTone(659.25, 0.13, 0.12, 'sawtooth', 0.18);
      playTone(880.0, 0.26, 0.12, 'sawtooth', 0.18);
      playTone(659.25, 0.39, 0.22, 'sawtooth', 0.20);
      await new Promise(r => setTimeout(r, 550));
    } else if (style === 'GENTLE') {
      // Soft two-note bell: F5 -> C6
      playTone(698.46, 0.0, 0.22, 'sine', 0.20);
      playTone(1046.50, 0.18, 0.45, 'sine', 0.22);
      await new Promise(r => setTimeout(r, 500));
    }
  } catch {
    // Ignore audio context restrictions
  }
}

/**
 * ตรวจสอบว่าเบราว์เซอร์/อุปกรณ์มีชุดเสียงพูดภาษาไทย (th-TH) ติดตั้งอยู่ในเครื่องหรือไม่
 */
export function findLocalThaiVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const thaiVoice = voices.find(
    v => v.lang.toLowerCase().startsWith('th') || v.name.toLowerCase().includes('thai') || v.name.includes('ไทย')
  );
  return thaiVoice || null;
}

/**
 * หยุดการพูดภาษาไทยที่กำลังเล่นอยู่ทั้งหมด
 */
export function stopThaiSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {}
    activeAudioElement = null;
  }
  void stopNativeThai();
}

/**
 * แบ่งข้อความภาษาไทยเป็นส่วนย่อย (ไม่เกิน 160 ตัวอักษร) สำหรับ Cloud TTS Audio Stream Fallback
 */
function splitThaiTextIntoChunks(text: string, maxLen: number = 160): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxLen) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

/**
 * พูดข้อความภาษาไทย พร้อมเสียงกระดิ่งนำ และระบบสำรองอัตโนมัติหากเครื่องไม่มีเสียงไทย
 */
export async function speakThaiText(
  text: string,
  options?: {
    configOverride?: Partial<ThaiVoiceConfig>;
    chimeOverride?: ChimeStyle | 'SUCCESS';
    forceSpeak?: boolean;
    pitch?: number;
    rate?: number;
  }
): Promise<boolean> {
  if (typeof window === 'undefined' && !Capacitor.isNativePlatform()) return false;

  const baseConfig = loadAppState().voiceConfig;
  const config: ThaiVoiceConfig = {
    ...baseConfig,
    ...(options?.configOverride || {}),
  };

  if (!config.enabled && !options?.forceSpeak) {
    return false;
  }

  // หยุดเสียงพูดเดิมก่อนเริ่มประโยคใหม่
  stopThaiSpeech();

  // เล่นเสียงกระดิ่งนำ (เคารพการตั้งค่าปิดเสียงแจ้งเตือน หรือตั้งกระดิ่งเป็น NONE)
  const chimeToPlay: ChimeStyle | 'SUCCESS' =
    !config.enabled || config.chimeStyle === 'NONE'
      ? 'NONE'
      : (options?.chimeOverride ?? config.chimeStyle);

  if (Capacitor.isNativePlatform()) {
    return speakNativeThai(text, {
      rate: Math.min(1.5, Math.max(0.6, options?.rate ?? config.speechRate)),
      pitch: Math.min(2.0, Math.max(0.5, options?.pitch ?? 1.0)),
      volume: Math.min(1.0, Math.max(0.1, config.volume)),
      chime: chimeToPlay,
    });
  }

  await playNotificationChime(chimeToPlay, config.volume);

  // ลำดับที่ 1: ใช้ Local Thai SpeechSynthesis Voice หากมีในเครื่อง
  if ('speechSynthesis' in window) {
    const localThaiVoice = findLocalThaiVoice();
    if (localThaiVoice) {
      return new Promise<boolean>((resolve) => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = localThaiVoice;
          utterance.lang = 'th-TH';
          utterance.rate = Math.min(1.5, Math.max(0.6, options?.rate ?? config.speechRate));
          utterance.pitch = Math.min(2.0, Math.max(0.5, options?.pitch ?? 1.0));
          utterance.volume = Math.min(1.0, Math.max(0.1, config.volume));

          utterance.onend = () => resolve(true);
          utterance.onerror = () => resolve(false);

          window.speechSynthesis.speak(utterance);
        } catch {
          resolve(false);
        }
      });
    }
  }

  // ลำดับที่ 2: หากเครื่องไม่มีเสียงภาษาไทยติดตั้งใน OS ให้ใช้ Cloud Thai TTS Audio Stream Fallback
  // พร้อมสำรองด้วย SpeechSynthesisUtterance(lang='th-TH') กรณีออฟไลน์
  try {
    const chunks = splitThaiTextIntoChunks(text, 160);
    for (const chunk of chunks) {
      const encoded = encodeURIComponent(chunk);
      const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encoded}&tl=th&client=tw-ob`;

      const played = await new Promise<boolean>((resolve) => {
        const audio = new Audio(ttsUrl);
        activeAudioElement = audio;
        audio.volume = Math.min(1.0, Math.max(0.1, config.volume));
        audio.playbackRate = Math.min(1.5, Math.max(0.6, options?.rate ?? config.speechRate));

        audio.onended = () => {
          activeAudioElement = null;
          resolve(true);
        };
        audio.onerror = () => {
          activeAudioElement = null;
          resolve(false);
        };

        audio.play().catch(() => {
          activeAudioElement = null;
          resolve(false);
        });
      });

      // หากออฟไลน์หรือเล่นสตรีมไม่ได้ ให้ใช้ SpeechSynthesisUtterance มาตรฐาน
      if (!played && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = 'th-TH';
        utterance.rate = Math.min(1.5, Math.max(0.6, options?.rate ?? config.speechRate));
        utterance.pitch = Math.min(2.0, Math.max(0.5, options?.pitch ?? 1.0));
        utterance.volume = config.volume;
        window.speechSynthesis.speak(utterance);
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * ฟังก์ชันระดับสูงสำหรับเรียกพูดในแต่ละเหตุการณ์ของแอป
 */
export async function announceTaskReminder(task: MonthlyInstallmentTask, forceSpeak: boolean = false): Promise<string> {
  const config = loadAppState().voiceConfig;
  const script = buildTaskReminderSpeech(task, config);
  if (config.enabled && (config.speakOnDueReminder || forceSpeak)) {
    const chime = task.status === 'OVERDUE' ? 'URGENT' : config.chimeStyle;
    await speakThaiText(script, { chimeOverride: chime, forceSpeak });
  }
  return script;
}

export async function announcePaymentToggle(
  task: MonthlyInstallmentTask,
  newStatus: 'PAID' | 'PENDING' | 'OVERDUE',
  remainingMonthlyDue: number
): Promise<string> {
  const config = loadAppState().voiceConfig;
  const script = buildPaymentToggleSpeech(task, newStatus, remainingMonthlyDue, config);
  if (config.enabled && config.speakOnMarkPaid) {
    const chime = newStatus === 'PAID' ? 'SUCCESS' : 'GENTLE';
    await speakThaiText(script, { chimeOverride: chime });
  }
  return script;
}

export async function announceMonthlySummary(summary: CashflowSummary, forceSpeak: boolean = true): Promise<string> {
  const config = loadAppState().voiceConfig;
  const script = buildMonthlySummarySpeech(summary, config);
  const chime = !summary.isSufficient ? 'URGENT' : config.chimeStyle;
  await speakThaiText(script, { chimeOverride: chime, forceSpeak });
  return script;
}

export type MascotGreetingType = 'WAVING' | 'PLANNING' | 'SUCCESS' | 'CHECKING' | 'ALERT';

export function buildMascotGreetingSpeech(
  type: MascotGreetingType,
  config: ThaiVoiceConfig
): string {
  const isKrub = config.politeParticle === 'KRUB';
  const politeWord = isKrub ? 'ครับ' : 'ค่ะ';

  // Check user-defined custom phrases first
  const customKey = type.toLowerCase() as keyof NonNullable<ThaiVoiceConfig['customPhrases']>;
  const userCustom = config.customPhrases?.[customKey]?.trim();
  if (userCustom) {
    return userCustom
      .replace(/\{polite\}/gi, politeWord)
      .replace(/น้องกนก/g, 'น้องต้นหอม');
  }

  if (config.privacyMode) {
    switch (type) {
      case 'WAVING':
        return isKrub 
          ? `สวัสดีครับผม! หนูน้องต้นหอมพร้อมช่วยดูแลการเงินให้แล้วนะครับ~` 
          : `สวัสดีค่า! หนูน้องต้นหอมพร้อมช่วยดูแลการเงินให้แล้วนะคะ~`;
      case 'PLANNING':
        return isKrub
          ? `สรุปภาพรวมงบประมาณเดือนนี้ น้องต้นหอมเตรียมไว้ให้พร้อมแล้วนะครับ!`
          : `สรุปภาพรวมงบประมาณเดือนนี้ น้องต้นหอมเตรียมไว้ให้พร้อมแล้วนะคะ!`;
      case 'SUCCESS':
        return isKrub 
          ? `เย้! ดำเนินการสำเร็จเรียบร้อยแล้ว เก่งที่สุดเลยครับ!` 
          : `เย้! ดำเนินการสำเร็จเรียบร้อยแล้ว เก่งที่สุดเลยค่ะ!`;
      case 'CHECKING':
        return isKrub 
          ? `น้องต้นหอมกำลังช่วยดูแลข้อมูลให้อยู่นะครับ สู้ๆ นะ!` 
          : `น้องต้นหอมกำลังช่วยดูแลข้อมูลให้อยู่นะคะ สู้ๆ น้า!`;
      case 'ALERT':
        return isKrub 
          ? `อุ๊ย! มีรายการสำคัญที่ต้องตรวจสอบด่วนนะครับ น้องต้นหอมเป็นห่วงครับ!` 
          : `อุ๊ย! มีรายการสำคัญที่ต้องตรวจสอบด่วนนะคะ น้องต้นหอมเป็นห่วงค่ะ!`;
    }
  }

  switch (type) {
    case 'WAVING':
      return isKrub 
        ? `สวัสดีครับผม! หนูน้องต้นหอมเองนะ ขอให้วันนี้การเงินสดใส มีเงินสำรองพร้อมใช้นะครับ~` 
        : `สวัสดีค่า! หนูน้องต้นหอมเองน้า ขอให้วันนี้การเงินสดใส มีเงินสำรองพร้อมใช้นะคะ~`;
    case 'PLANNING':
      return isKrub
        ? `ยอดชำระรวมเดือนนี้ วางแผนจัดการให้พร้อมแล้วนะครับ สู้ๆ ไปด้วยกันนะ!`
        : `ยอดชำระรวมเดือนนี้ วางแผนจัดการให้พร้อมแล้วนะคะ สู้ๆ ไปด้วยกันน้า!`;
    case 'SUCCESS':
      return isKrub 
        ? `เย้! ชำระเรียบร้อยแล้ว เก่งที่สุดเลยครับ ปรบมือให้รัวๆ เลยนะ!` 
        : `เย้! ชำระเรียบร้อยแล้ว เก่งที่สุดเลยค่ะ ปรบมือให้รัวๆ เลยน้า!`;
    case 'CHECKING':
      return isKrub 
        ? `ยอดยังค้างชำระอยู่อีกนิดหน่อยนะ น้องต้นหอมช่วยเช็กวันครบกำหนดให้อยู่ ทยอยจ่ายได้เลยครับ!` 
        : `ยอดยังค้างชำระอยู่อีกนิดหน่อยน้า น้องต้นหอมช่วยเช็กวันครบกำหนดให้อยู่ ทยอยจ่ายได้เลยค่ะ!`;
    case 'ALERT':
      return isKrub 
        ? `อุ๊ย! แจ้งเตือนด่วนนะครับ ยอดนี้สำคัญมากๆ รีบจัดการเพื่อความสบายใจนะ น้องต้นหอมเป็นห่วงครับ!` 
        : `อุ๊ย! แจ้งเตือนด่วนนะคะ ยอดนี้สำคัญมากๆ รีบจัดการเพื่อความสบายใจน้า น้องต้นหอมเป็นห่วงค่ะ!`;
  }
}

export async function speakMascotGreeting(
  type: MascotGreetingType,
  customConfig?: Partial<ThaiVoiceConfig>,
  forceSpeak: boolean = false
): Promise<string> {
  const baseConfig = loadAppState().voiceConfig;
  const config = { ...baseConfig, ...(customConfig || {}) };
  const script = buildMascotGreetingSpeech(type, config);

  if (forceSpeak || config.mascotGreetingEnabled) {
    const chime = (!config.enabled || config.chimeStyle === 'NONE')
      ? 'NONE'
      : (type === 'ALERT' ? 'URGENT' : type === 'SUCCESS' ? 'SUCCESS' : 'GENTLE');
    await speakThaiText(script, { configOverride: config, chimeOverride: chime, forceSpeak: true, pitch: 1.4, rate: 1.08 });
  }
  return script;
}
