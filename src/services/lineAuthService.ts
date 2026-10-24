import { Share } from '@capacitor/share';

/**
 * Share the DebtFlow summary through the Android share sheet (LINE appears there).
 */
export async function shareDebtFlowToLine(textSummary: string): Promise<boolean> {
  try {
    await Share.share({
      text: textSummary,
      dialogTitle: 'แชร์สรุปไปยัง LINE',
    });
    return true;
  } catch {
    if (typeof window !== 'undefined') {
      const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(textSummary)}`;
      window.open(lineUrl, '_blank');
      return true;
    }
    return false;
  }
}
