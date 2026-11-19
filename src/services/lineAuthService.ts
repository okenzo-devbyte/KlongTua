import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/**
 * Share the KlongTua summary through the Android share sheet (LINE appears there) or LINE web share.
 */
export async function shareDebtFlowToLine(textSummary: string): Promise<boolean> {
  try {
    await Share.share({
      text: textSummary,
      dialogTitle: 'แชร์สรุปยอดไปยัง LINE หรือแอปอื่น',
    });
    return true;
  } catch {
    // บน Native Android หากผู้ใช้กดยกเลิก Share Sheet ไม่ควรเด้งเปิดเบราว์เซอร์
    if (!Capacitor.isNativePlatform() && typeof window !== 'undefined') {
      const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(textSummary)}`;
      window.open(lineUrl, '_blank', 'noopener,noreferrer');
      return true;
    }
    return false;
  }
}
