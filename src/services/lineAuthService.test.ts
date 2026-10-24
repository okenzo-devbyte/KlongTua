import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/share', () => ({
  Share: { share: vi.fn(async () => {}) },
}));

import { Share } from '@capacitor/share';
import { shareDebtFlowToLine } from './lineAuthService';

describe('lineAuthService', () => {
  it('shares the summary through the native share sheet', async () => {
    await expect(shareDebtFlowToLine('สรุปการเงิน')).resolves.toBe(true);
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'สรุปการเงิน' })
    );
  });
});
