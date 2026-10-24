import { describe, expect, it, vi } from 'vitest';

vi.mock('./native/biometric', () => ({
  isNativeBiometricPlatform: () => true,
  authenticateWithBiometric: vi.fn(async () => true),
  getBiometricAvailability: vi.fn(async () => ({ available: true, reason: 'SUCCESS' })),
}));

import { authenticateBiometric } from './securityService';

describe('securityService native biometric', () => {
  it('uses the native biometric prompt on Android', async () => {
    expect(await authenticateBiometric()).toBe(true);
  });
});
