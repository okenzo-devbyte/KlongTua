import { describe, it, expect } from 'vitest';
import { buildMascotGreetingSpeech } from './thaiVoiceService';
import { ThaiVoiceConfig } from '../types/loan';

describe('thaiVoiceService - Mascot Greetings', () => {
  const baseConfigKa: ThaiVoiceConfig = {
    enabled: true,
    privacyMode: false,
    politeParticle: 'KA',
    chimeStyle: 'ENTERPRISE',
    speechRate: 1.0,
    volume: 1.0,
    speakOnDueReminder: true,
    speakOnMarkPaid: true,
    speakOnShortfallAlert: true,
    mascotGreetingEnabled: true,
  };

  const baseConfigKrub: ThaiVoiceConfig = {
    ...baseConfigKa,
    politeParticle: 'KRUB',
  };

  it('generates polite greeting with ค่ะ for female particle', () => {
    const wave = buildMascotGreetingSpeech('WAVING', baseConfigKa);
    expect(wave).toContain('สวัสดีค่า');
    expect(wave).toContain('นะคะ');

    const planning = buildMascotGreetingSpeech('PLANNING', baseConfigKa);
    expect(planning).toContain('ยอดชำระรวมเดือนนี้');
    expect(planning).toContain('นะคะ');

    const success = buildMascotGreetingSpeech('SUCCESS', baseConfigKa);
    expect(success).toContain('ชำระเรียบร้อยแล้ว');
    expect(success).toContain('ค่ะ');

    const alert = buildMascotGreetingSpeech('ALERT', baseConfigKa);
    expect(alert).toContain('แจ้งเตือนด่วนนะคะ');
  });

  it('generates polite greeting with ครับ for male particle', () => {
    const wave = buildMascotGreetingSpeech('WAVING', baseConfigKrub);
    expect(wave).toContain('สวัสดีครับ');
    expect(wave).toContain('นะครับ');

    const checking = buildMascotGreetingSpeech('CHECKING', baseConfigKrub);
    expect(checking).toContain('น้องต้นหอมช่วยเช็กวันครบกำหนดให้อยู่');
    expect(checking).toContain('ครับ');
  });

  it('respects privacy mode by not mentioning loan/debt specifics', () => {
    const privacyConfig: ThaiVoiceConfig = {
      ...baseConfigKa,
      privacyMode: true,
    };
    const alert = buildMascotGreetingSpeech('ALERT', privacyConfig);
    expect(alert).not.toContain('ยอดนี้');
    expect(alert).toContain('มีรายการสำคัญที่ต้องตรวจสอบ');
  });

  it('uses user custom phrases and replaces {polite} token', () => {
    const customConfig: ThaiVoiceConfig = {
      ...baseConfigKa,
      customPhrases: {
        waving: 'ยินดีต้อนรับกลับมานะคะเจ้านาย {polite}',
        success: 'ยอดเยี่ยมมาก ปิดหนี้ได้อีกหนึ่งยอดแล้ว {polite}!',
      },
    };

    const wave = buildMascotGreetingSpeech('WAVING', customConfig);
    expect(wave).toBe('ยินดีต้อนรับกลับมานะคะเจ้านาย ค่ะ');

    const maleCustom: ThaiVoiceConfig = {
      ...customConfig,
      politeParticle: 'KRUB',
    };
    const waveMale = buildMascotGreetingSpeech('WAVING', maleCustom);
    expect(waveMale).toBe('ยินดีต้อนรับกลับมานะคะเจ้านาย ครับ');

    // Untouched phrase falls back to default
    const check = buildMascotGreetingSpeech('CHECKING', customConfig);
    expect(check).toContain('น้องต้นหอมช่วยเช็กวันครบกำหนดให้อยู่');
  });
});
