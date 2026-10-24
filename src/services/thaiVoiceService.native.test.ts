import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock('./native/tts', () => ({
  speakNativeThai: vi.fn(async () => true),
  stopNativeThai: vi.fn(async () => {}),
}));

import { speakThaiText } from './thaiVoiceService';
import { speakNativeThai } from './native/tts';

describe('thaiVoiceService native TTS', () => {
  it('routes speech through native TTS on Android', async () => {
    const ok = await speakThaiText('สวัสดีค่ะ', { forceSpeak: true });
    expect(ok).toBe(true);
    expect(speakNativeThai).toHaveBeenCalledWith(
      'สวัสดีค่ะ',
      expect.objectContaining({ chime: 'ENTERPRISE' })
    );
  });

  it('returns false when native TTS is unavailable', async () => {
    vi.mocked(speakNativeThai).mockResolvedValueOnce(false);
    expect(await speakThaiText('ทดสอบ', { forceSpeak: true })).toBe(false);
  });
});
